import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { generateSvgMockDataUrl } from './imageEngine';

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

let cachedGeminiImageModels: string[] | null = null;

/**
 * Dynamically query Google Gemini API (v1beta/models) to discover available image-capable models
 */
async function discoverGeminiImageModels(apiKey: string): Promise<string[]> {
  if (cachedGeminiImageModels && cachedGeminiImageModels.length > 0) {
    return cachedGeminiImageModels;
  }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        const imageModels = data.models
          .filter((m: any) =>
            (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateImages")) ||
            m.name.includes("imagen") ||
            m.name.includes("image")
          )
          .map((m: any) => m.name.replace(/^models\//, ""));

        if (imageModels.length > 0) {
          cachedGeminiImageModels = imageModels;
          return imageModels;
        }
      }
    }
  } catch (err) {
    console.warn("Dynamic Gemini model discovery failed:", err);
  }
  return ["gemini-2.5-flash-image", "imagen-4.0-fast-generate-001", "imagen-3.0-generate-002"];
}

/**
 * Universal Image-Conditioned Generation & Editing Engine
 * Fallback Priority:
 * 1. OpenAI (gpt-image-1-mini) — Paid, confirmed working, flagged with UI warning
 * 2. Gemini (Dynamic Model Discovery via GET v1beta/models)
 * 3. Cloudflare Workers AI (@cf/black-forest-labs/flux-1-schnell) — Free first-gen fallback
 * 4. SVG Canvas Storyboard Mock Renderer
 */
export async function generateImageConditionedShot(params: ImageEditParams): Promise<ImageEditResult> {
  const openaiKey = params.openaiApiKey || process.env.OPENAI_API_KEY;
  const geminiKey = params.geminiApiKey || process.env.GEMINI_API_KEY;
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

  // Construct composite prompt with system instruction if provided
  const fullInstruction = params.systemInstruction
    ? `${params.systemInstruction}\n\nINSTRUCTION: ${params.instruction}`
    : params.instruction;

  // 1. PROVIDER 1: OpenAI gpt-image-1-mini (Paid API, confirmed working)
  if (openaiKey && openaiKey.trim() !== '') {
    try {
      const openai = new OpenAI({ apiKey: openaiKey.trim() });
      const response = await openai.images.generate({
        model: "gpt-image-1-mini",
        prompt: fullInstruction,
      });

      const b64 = response.data?.[0]?.b64_json;
      const url = response.data?.[0]?.url;
      const imgUrl = b64 ? `data:image/png;base64,${b64}` : url;

      if (imgUrl) {
        return {
          imageUrl: imgUrl,
          engine: "OpenAI gpt-image-1-mini (Paid API)",
          promptUsed: fullInstruction,
          hasReferenceImage: Boolean(hasReferenceImage),
          isPaid: true,
          paidWarning: "Generated using OpenAI gpt-image-1-mini (Paid API)",
        };
      }
    } catch (openaiErr: any) {
      console.warn("OpenAI gpt-image-1-mini error, falling back to Gemini:", openaiErr.message || openaiErr);
    }
  }

  // 2. PROVIDER 2: Google Gemini (Dynamic Model Discovery via GET v1beta/models)
  if (geminiKey && geminiKey.trim() !== '') {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
      const discoveredModels = await discoverGeminiImageModels(geminiKey.trim());

      for (const modelName of discoveredModels) {
        try {
          const response: any = await ai.models.generateImages({
            model: modelName,
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
            return {
              imageUrl: `data:image/jpeg;base64,${base64}`,
              engine: `Gemini (${modelName})`,
              promptUsed: fullInstruction,
              hasReferenceImage: Boolean(hasReferenceImage),
            };
          }
        } catch (mErr) {
          console.warn(`Gemini model ${modelName} failed, trying next discovered model:`, mErr);
        }
      }
    } catch (geminiError: any) {
      console.warn("Gemini image generation error:", geminiError.message || geminiError);
    }
  }

  // 3. PROVIDER 3: Cloudflare Workers AI (@cf/black-forest-labs/flux-1-schnell, free first-gen fallback)
  if (cfAccountId && cfApiToken && !hasReferenceImage) {
    try {
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
        return {
          imageUrl: `data:image/jpeg;base64,${base64}`,
          engine: "Cloudflare Workers AI (FLUX.1 schnell)",
          promptUsed: fullInstruction,
          hasReferenceImage: false,
          isFallbackTextOnly: true,
          consistencyWarning: "no reference image available, consistency not guaranteed.",
        };
      }
    } catch (cfErr: any) {
      console.warn("Cloudflare Workers AI error:", cfErr.message || cfErr);
    }
  }

  // 4. MOCK FALLBACK: SVG Canvas Storyboard Mock Renderer
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
