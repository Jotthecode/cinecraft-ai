import OpenAI, { toFile } from 'openai';
import { GoogleGenAI } from '@google/genai';
import { generateSvgMockDataUrl } from './imageEngine';

/**
 * Documented Gemini Image-Capable Alternative Models for configuration reference
 */
export const GEMINI_ALTERNATIVE_MODELS = [
  "gemini-3-pro-image",
  "gemini-3.1-flash-image",
  "gemini-3.1-flash-lite-image",
  "imagen-4.0-fast-generate-001"
];

export type EditType = 'local_detail' | 'camera_angle' | 'new_character';

/**
 * Requirement 2 & 3 Edit Instruction Classifier
 */
export function classifyEditInstruction(instruction: string): { editType: EditType; disclaimer?: string } {
  const text = instruction.toLowerCase().trim();

  // Check camera angle edit keywords (Requirement 3)
  const cameraKeywords = [
    'camera', 'angle', 'eye-level', 'low angle', 'high angle', 'close-up', 'close up',
    'wide shot', 'establishing', 'over-the-shoulder', 'ots', 'top-down', 'top down',
    'bird\'s eye', 'birds eye', 'zoom', 'framing', 'perspective', 'view', 'tilt', 'pan'
  ];
  const isCamera = cameraKeywords.some((kw) => text.includes(kw));

  if (isCamera) {
    return {
      editType: 'camera_angle',
      disclaimer: 'Camera angle changes may cause minor background variation — review before applying.',
    };
  }

  // Check new character keywords
  const newCharKeywords = ['add a new character', 'add character', 'introduce', 'new person', 'add a boy', 'add a girl', 'add a man', 'add a woman'];
  if (newCharKeywords.some((kw) => text.includes(kw))) {
    return {
      editType: 'new_character',
    };
  }

  return {
    editType: 'local_detail',
  };
}

export interface ImageEditParams {
  instruction: string;
  sourceImage?: string;             // Shot's current rendered image for edits
  referenceImages?: string[];       // Character canonical face-card reference images
  systemInstruction?: string;
  editType?: EditType;
  denoisingStrength?: number;
  seed?: number;
  openaiApiKey?: string;
  geminiApiKey?: string;
  modelChoice?: string;
}

export interface ImageEditResult {
  imageUrl: string;
  engine: string;
  promptUsed: string;
  hasReferenceImage: boolean;
  editType?: EditType;
  disclaimer?: string;
  isPaid?: boolean;
  paidWarning?: string;
  isFallbackTextOnly?: boolean;
  consistencyWarning?: string;
}

/**
 * Convert URL or Base64 Data URI into inlineData object for Gemini SDK multimodal generateContent
 */
async function prepareGeminiImagePart(imageUrl: string): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  try {
    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        return { inlineData: { mimeType: match[1], data: match[2] } };
      }
    } else if (imageUrl.startsWith('http')) {
      const res = await fetch(imageUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = res.headers.get('content-type') || 'image/jpeg';
        return { inlineData: { mimeType, data: base64 } };
      }
    }
  } catch (e) {
    console.warn("Could not prepare Gemini image part:", e);
  }
  return null;
}

/**
 * Convert URL or Base64 Data URI into OpenAI Uploadable File object for openai.images.edit()
 */
async function prepareOpenAIImageFile(imageUrl: string): Promise<any> {
  let buffer: Buffer;
  let mimeType = 'image/png';

  if (imageUrl.startsWith('data:')) {
    const match = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      buffer = Buffer.from(match[2], 'base64');
    } else {
      buffer = Buffer.from(imageUrl.split(',')[1], 'base64');
    }
  } else if (imageUrl.startsWith('http')) {
    const res = await fetch(imageUrl);
    const arrayBuf = await res.arrayBuffer();
    buffer = Buffer.from(arrayBuf);
    mimeType = res.headers.get('content-type') || 'image/png';
  } else {
    throw new Error('Unsupported image URL format for OpenAI edit');
  }

  console.log(`[OPENAI EDIT] Source Image Prepared for images.edit(): size=${buffer.length} bytes, mimeType=${mimeType}`);

  return await toFile(buffer, 'source_image.png', { type: 'image/png' });
}

/**
 * Universal Image-Conditioned Generation & Editing Engine
 * Primary Provider: Gemini 2.5 Flash Image (gemini-2.5-flash-image) via generateContent multimodal API
 * Fallback Priority:
 * 1. Gemini 2.5 Flash Image (gemini-2.5-flash-image, multimodal image-conditioned)
 * 2. OpenAI (gpt-image-1-mini via images.edit for edits or images.generate for first-gen)
 * 3. Cloudflare Workers AI (@cf/black-forest-labs/flux-1-schnell, free first-gen fallback)
 * 4. Imagen 4 (imagen-4.0-fast-generate-001, text-to-image last resort for first-time creation only)
 * 5. SVG Canvas Storyboard Mock Renderer (offline dev fallback)
 */
export async function generateImageConditionedShot(params: ImageEditParams): Promise<ImageEditResult> {
  const geminiKey = params.geminiApiKey || process.env.GEMINI_API_KEY;
  const openaiKey = params.openaiApiKey || process.env.OPENAI_API_KEY;
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;

  // Determine available reference / source images
  const inputImages: string[] = [];
  if (params.sourceImage && params.sourceImage.trim() !== '') {
    inputImages.push(params.sourceImage);
  }
  if (params.referenceImages && params.referenceImages.length > 0) {
    params.referenceImages.forEach((img) => {
      if (img && img.trim() !== '' && !inputImages.includes(img)) {
        inputImages.push(img);
      }
    });
  }

  const hasReferenceImage = inputImages.length > 0;
  const primaryImage = inputImages[0];

  // Construct composite prompt with system instruction if provided
  const fullInstruction = params.systemInstruction
    ? `${params.systemInstruction}\n\nINSTRUCTION: ${params.instruction}`
    : params.instruction;

  // 1. PROVIDER 1: Gemini 2.5 Flash Image (gemini-2.5-flash-image) via generateContent
  if (geminiKey && geminiKey.trim() !== '') {
    try {
      console.log(`[PIPELINE] Provider 1: Attempting Gemini 2.5 Flash Image (gemini-2.5-flash-image) generateContent... (Has Ref Image: ${hasReferenceImage})`);
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
      const contentsParts: any[] = [];

      // Prepare multimodal inlineData image parts for reference / source images
      if (hasReferenceImage) {
        for (const imgUrl of inputImages) {
          const part = await prepareGeminiImagePart(imgUrl);
          if (part) {
            contentsParts.push(part);
          }
        }
      }

      // Append text instruction part
      contentsParts.push({ text: fullInstruction });

      // Primary Multimodal Call to gemini-2.5-flash-image via generateContent
      const response: any = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: contentsParts,
      });

      const parts = response?.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((p: any) => p.inlineData && p.inlineData.data);

      if (imagePart) {
        const mime = imagePart.inlineData.mimeType || 'image/jpeg';
        const b64 = imagePart.inlineData.data;
        console.log("✅ Provider 1 [Gemini 2.5 Flash Image] SUCCESS!");
        return {
          imageUrl: `data:${mime};base64,${b64}`,
          engine: "Gemini 2.5 Flash Image (Multimodal Image-Conditioned)",
          promptUsed: fullInstruction,
          hasReferenceImage: Boolean(hasReferenceImage),
        };
      } else {
        console.warn("⚠️ Provider 1 [Gemini 2.5 Flash Image] returned candidates but no inline image data part found.");
      }
    } catch (geminiError: any) {
      console.error("❌ Provider 1 [Gemini 2.5 Flash Image] FAILED:");
      console.error("   Error Message:", geminiError?.message || geminiError);
      if (geminiError?.status || geminiError?.code || geminiError?.details) {
        console.error("   Status / Code / Details:", JSON.stringify({ status: geminiError?.status, code: geminiError?.code, details: geminiError?.details }, null, 2));
      }
      if (geminiError?.stack) {
        console.error("   Stack Trace:", geminiError.stack);
      }
    }
  } else {
    console.log("[PIPELINE] Provider 1 [Gemini] Skipped: GEMINI_API_KEY not configured.");
  }

  // 2. PROVIDER 2: OpenAI gpt-image-1-mini (Paid API, using images.edit for edits vs images.generate for first-gen)
  if (openaiKey && openaiKey.trim() !== '') {
    try {
      console.log(`[PIPELINE] Provider 2: Attempting OpenAI gpt-image-1-mini... (hasReferenceImage: ${hasReferenceImage})`);
      const openai = new OpenAI({ apiKey: openaiKey.trim() });
      let response: any;

      if (hasReferenceImage && primaryImage) {
        console.log(`[PIPELINE] Provider 2: Calling openai.images.edit() with source image input...`);
        const imageFile = await prepareOpenAIImageFile(primaryImage);

        response = await openai.images.edit({
          model: "gpt-image-1-mini",
          image: imageFile,
          prompt: fullInstruction,
        });
      } else {
        console.log(`[PIPELINE] Provider 2: Calling openai.images.generate() for first-time text-to-image...`);
        response = await openai.images.generate({
          model: "gpt-image-1-mini",
          prompt: fullInstruction,
        });
      }

      const b64 = response.data?.[0]?.b64_json;
      const url = response.data?.[0]?.url;
      const imgUrl = b64 ? `data:image/png;base64,${b64}` : url;

      if (imgUrl) {
        const engineLabel = hasReferenceImage
          ? "OpenAI gpt-image-1-mini (Image-Conditioned Edit)"
          : "OpenAI gpt-image-1-mini (First-Time Text-to-Image)";
        console.log(`✅ Provider 2 [${engineLabel}] SUCCESS!`);
        return {
          imageUrl: imgUrl,
          engine: engineLabel,
          promptUsed: fullInstruction,
          hasReferenceImage: Boolean(hasReferenceImage),
          isPaid: true,
          paidWarning: "Generated using OpenAI gpt-image-1-mini (Paid API)",
        };
      }
    } catch (openaiErr: any) {
      console.error("❌ Provider 2 [OpenAI gpt-image-1-mini] FAILED:");
      console.error("   Error Message:", openaiErr?.message || openaiErr);
      if (openaiErr?.stack) {
        console.error("   Stack Trace:", openaiErr.stack);
      }
    }
  } else {
    console.log("[PIPELINE] Provider 2 [OpenAI] Skipped: OPENAI_API_KEY not configured.");
  }

  // 3. PROVIDER 3: Cloudflare Workers AI (@cf/black-forest-labs/flux-1-schnell, free first-gen fallback)
  if (cfAccountId && cfApiToken && !hasReferenceImage) {
    try {
      console.log(`[PIPELINE] Provider 3: Attempting Cloudflare Workers AI...`);
      const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
      const res = await fetch(cfUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: fullInstruction }),
      });

      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        console.log("✅ Provider 3 [Cloudflare Workers AI] SUCCESS!");
        return {
          imageUrl: `data:image/jpeg;base64,${base64}`,
          engine: "Cloudflare Workers AI (FLUX.1 schnell)",
          promptUsed: fullInstruction,
          hasReferenceImage: false,
          isFallbackTextOnly: true,
          consistencyWarning: "no reference image available, consistency not guaranteed.",
        };
      } else {
        const cfErrText = await res.text();
        console.error("❌ Provider 3 [Cloudflare Workers AI] FAILED with status", res.status, cfErrText);
      }
    } catch (cfErr: any) {
      console.error("❌ Provider 3 [Cloudflare Workers AI] FAILED:", cfErr?.message || cfErr);
    }
  } else {
    console.log("[PIPELINE] Provider 3 [Cloudflare Workers AI] Skipped (no credentials or has reference image).");
  }

  // 4. PROVIDER 4: Imagen 4 (imagen-4.0-fast-generate-001, text-to-image last resort for first-time creation only)
  if (geminiKey && geminiKey.trim() !== '' && !hasReferenceImage) {
    try {
      console.log(`[PIPELINE] Provider 4: Attempting Imagen 4 Fast (imagen-4.0-fast-generate-001)...`);
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
      const response: any = await ai.models.generateImages({
        model: "imagen-4.0-fast-generate-001",
        prompt: fullInstruction,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "16:9",
          personGeneration: "ALLOW_ADULT" as any,
        },
      });

      if (response?.generatedImages?.[0]?.image?.imageBytes) {
        const base64 = response.generatedImages[0].image.imageBytes;
        console.log("✅ Provider 4 [Imagen 4 Fast] SUCCESS!");
        return {
          imageUrl: `data:image/jpeg;base64,${base64}`,
          engine: "Imagen 4 Fast (First-Time Text-to-Image Fallback)",
          promptUsed: fullInstruction,
          hasReferenceImage: false,
          isFallbackTextOnly: true,
          consistencyWarning: "no reference image available, consistency not guaranteed.",
        };
      }
    } catch (imagenErr: any) {
      console.error("❌ Provider 4 [Imagen 4 Fast] FAILED:", imagenErr?.message || imagenErr);
    }
  }

  // 5. PROVIDER 5: MOCK FALLBACK: SVG Canvas Storyboard Mock Renderer
  console.warn("⚠️ All real image providers failed or were unconfigured. Falling back to SVG Canvas Storyboard Mock Renderer.");
  const fallbackSvgUrl = generateSvgMockDataUrl(params.instruction, undefined, undefined, 'Eye-Level');
  return {
    imageUrl: fallbackSvgUrl,
    engine: "SVG Canvas Storyboard Mock Renderer",
    promptUsed: fullInstruction,
    hasReferenceImage: false,
    isFallbackTextOnly: true,
    consistencyWarning: "no reference image available, consistency not guaranteed.",
  };
}
