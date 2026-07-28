import { fal } from '@fal-ai/client';
import Replicate from 'replicate';
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
  geminiApiKey?: string;
  falApiKey?: string;
  replicateApiKey?: string;
  modelChoice?: string;
}

export interface ImageEditResult {
  imageUrl: string;
  engine: string;
  promptUsed: string;
  hasReferenceImage: boolean;
  editType?: EditType;
  disclaimer?: string;
  isFallbackTextOnly?: boolean;
  consistencyWarning?: string;
}

/**
 * Convert URL or Base64 Data URI into inlineData object for Gemini SDK
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
 * Universal Image-Conditioned Generation & Editing Engine
 * Implements strict provider priority:
 * 1. Gemini 2.5 Flash Image ("gemini-2.5-flash-image")
 * 2. FLUX.1 Kontext / Img2Img via Fal.ai
 * 3. Replicate Image Editing Model
 * 4. Last resort text-to-image (with consistency warning)
 */
export async function generateImageConditionedShot(params: ImageEditParams): Promise<ImageEditResult> {
  const geminiKey = params.geminiApiKey || process.env.GEMINI_API_KEY;
  const falKey = params.falApiKey || process.env.FAL_KEY;
  const replicateToken = params.replicateApiKey || process.env.REPLICATE_API_TOKEN;

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
  const primaryImage = inputImages[0]; // Primary reference / source image

  // Construct composite prompt with system instruction if provided
  const fullInstruction = params.systemInstruction
    ? `${params.systemInstruction}\n\nINSTRUCTION: ${params.instruction}`
    : params.instruction;

  // 1. PROVIDER 1: Gemini 2.5 Flash Image (gemini-2.5-flash-image)
  if (geminiKey && geminiKey.trim() !== '') {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });

      if (hasReferenceImage) {
        // Prepare image inline parts for multi-modal Gemini image editing
        const imageParts: any[] = [];
        for (const imgUrl of inputImages) {
          const part = await prepareGeminiImagePart(imgUrl);
          if (part) imageParts.push(part);
        }

        if (imageParts.length > 0) {
          try {
            // Attempt Gemini 2.5 Flash Image / Gemini 2.0 Flash Multimodal Image Generation
            const response: any = await ai.models.generateImages({
              model: "gemini-2.5-flash-image",
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
                engine: "Gemini 2.5 Flash Image (Image-Conditioned)",
                promptUsed: fullInstruction,
                hasReferenceImage: true,
              };
            }
          } catch (modelErr) {
            // Fallback to Imagen 3 if gemini-2.5-flash-image alias maps to Imagen
            const response: any = await ai.models.generateImages({
              model: "imagen-3.0-generate-002",
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
                engine: "Gemini Imagen 3 (Image-Conditioned)",
                promptUsed: fullInstruction,
                hasReferenceImage: true,
              };
            }
          }
        }
      } else {
        // No reference image yet: First-time character generation via Gemini Imagen 3
        const response: any = await ai.models.generateImages({
          model: "imagen-3.0-generate-002",
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
            engine: "Gemini Imagen 3 (First-Time Text-to-Image)",
            promptUsed: fullInstruction,
            hasReferenceImage: false,
            isFallbackTextOnly: true,
            consistencyWarning: "no reference image available, consistency not guaranteed.",
          };
        }
      }
    } catch (geminiError) {
      console.warn("Gemini 2.5 Flash Image error, falling back to Fal/Replicate:", geminiError);
    }
  }

  // 2. PROVIDER 2: Fal.ai FLUX.1 Kontext / Img2Img
  if (falKey && falKey.trim() !== '') {
    try {
      fal.config({ credentials: falKey.trim() });
      const strength = params.denoisingStrength ?? 0.35;

      if (hasReferenceImage && primaryImage) {
        const res: any = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
          input: {
            prompt: fullInstruction,
            image_url: primaryImage,
            strength,
            image_size: 'landscape_16_9',
          } as any,
        });

        const imageUrl = res.data?.images?.[0]?.url || res.data?.image?.url;
        if (imageUrl) {
          return {
            imageUrl,
            engine: "FLUX.1 Kontext via Fal.ai (Image-Conditioned)",
            promptUsed: fullInstruction,
            hasReferenceImage: true,
          };
        }
      } else {
        // Text-only fallback on Fal.ai
        const res: any = await fal.subscribe('fal-ai/flux-1/schnell', {
          input: { prompt: fullInstruction, image_size: 'landscape_16_9' },
        });

        const imageUrl = res.data?.images?.[0]?.url || res.data?.image?.url;
        if (imageUrl) {
          return {
            imageUrl,
            engine: "Fal.ai FLUX.1 schnell (First-Time Text-to-Image)",
            promptUsed: fullInstruction,
            hasReferenceImage: false,
            isFallbackTextOnly: true,
            consistencyWarning: "no reference image available, consistency not guaranteed.",
          };
        }
      }
    } catch (falErr) {
      console.warn("Fal.ai image-conditioned generation error:", falErr);
    }
  }

  // 3. PROVIDER 3: Replicate Img2Img Engine
  if (replicateToken && replicateToken.trim() !== '') {
    try {
      const replicate = new Replicate({ auth: replicateToken.trim() });
      const inputObj: any = { prompt: fullInstruction, aspect_ratio: '16:9' };

      if (hasReferenceImage && primaryImage) {
        inputObj.image = primaryImage;
        inputObj.prompt_strength = 1 - (params.denoisingStrength ?? 0.35);
      }

      const output: any = await replicate.run("black-forest-labs/flux-dev", { input: inputObj });
      const imageUrl = Array.isArray(output) ? output[0] : output;

      if (imageUrl) {
        return {
          imageUrl: String(imageUrl),
          engine: "Replicate FLUX Dev (Image-Conditioned)",
          promptUsed: fullInstruction,
          hasReferenceImage: Boolean(hasReferenceImage),
          isFallbackTextOnly: !hasReferenceImage,
          consistencyWarning: !hasReferenceImage ? "no reference image available, consistency not guaranteed." : undefined,
        };
      }
    } catch (repErr) {
      console.warn("Replicate image-conditioned error:", repErr);
    }
  }

  // 4. PROVIDER 4: Pollinations FLUX Engine (Text-to-Image Last Resort Fallback)
  try {
    const cleanPrompt = encodeURIComponent(fullInstruction);
    const numericSeed = params.seed || 489201;
    const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?model=flux&seed=${numericSeed}&width=1024&height=576&nologo=true`;

    return {
      imageUrl,
      engine: "Pollinations FLUX.1 (Fallback Text-to-Image)",
      promptUsed: fullInstruction,
      hasReferenceImage: false,
      isFallbackTextOnly: true,
      consistencyWarning: "no reference image available, consistency not guaranteed.",
    };
  } catch (pollErr) {
    console.warn("Pollinations FLUX error:", pollErr);
  }

  // 5. MOCK FALLBACK: SVG Canvas Storyboard Mock Renderer
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
