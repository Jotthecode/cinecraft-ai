import { fal } from '@fal-ai/client';
import Replicate from 'replicate';

export interface CinematicAdPromptParams {
  shot_type?: string;
  camera_angle?: string;
  environment?: string;
  action?: string;
  character_anchor?: string;
}

/**
 * Structured Cinematic Advertisement Image Prompt Composer
 * Places FRAME COMPOSITION, ENVIRONMENT & BACKGROUND, and ACTION & INTERACTION
 * ahead of CHARACTER IDENTITIES to prevent static character headshots.
 */
export function buildCinematicAdPrompt(shot: {
  shot_type?: string;        // e.g., "Wide Establishing Shot", "Medium Two-Shot"
  camera_angle?: string;     // e.g., "Low Angle", "Eye-Level", "Over-The-Shoulder"
  environment?: string;      // e.g., "Mumbai roadside tea stall, morning sunlight, background crowd"
  action?: string;           // e.g., "Raj hands a packet of Parle-G biscuits to a young boy"
  character_anchor?: string; // e.g., "Raj, middle-aged Indian man, grey mustache, blue shirt"
}): string {
  const shotType = shot.shot_type || 'Wide Establishing Shot';
  const cameraAngle = shot.camera_angle || 'Eye-Level';
  const environment = shot.environment || 'Detailed commercial environment, ambient lighting, background setting';
  const action = shot.action || 'Characters in motion interacting with objects/environment';
  const characterAnchor = shot.character_anchor || 'Protagonist';

  return [
    `FRAME COMPOSITION: ${shotType}, ${cameraAngle}.`,
    `ENVIRONMENT & BACKGROUND: ${environment}. Include full environmental details, ambient lighting, and background setting.`,
    `ACTION & INTERACTION: ${action}. Show characters in motion interacting with objects/environment.`,
    `CHARACTER IDENTITIES: ${characterAnchor}.`,
    `CINEMATIC STYLE: Professional commercial advertisement frame, photorealistic 8k, wide cinematic aspect ratio, depth of field.`
  ].join(' ');
}

export interface DynamicShotPromptParams {
  visualAnchor: string;
  gender?: string;
  location?: string;
  cameraAngle?: string;
  shotType?: string;
  action?: string;
  basePrompt?: string;
}

/**
 * Universal Dynamic Shot Prompt Engine
 * Constructs image prompts dynamically for ANY arbitrary character, enforcing framing, location, and action
 */
export function buildDynamicShotPrompt(params: DynamicShotPromptParams): string {
  if (params.basePrompt && params.basePrompt.includes('FRAME COMPOSITION:')) {
    let prompt = params.basePrompt.trim();
    if (params.gender && !prompt.toLowerCase().includes(params.gender.toLowerCase())) {
      prompt += ` GENDER STRICT LOCK: Subject MUST strictly be ${params.gender}.`;
    }
    return prompt;
  }

  let charAnchor = params.visualAnchor || 'Protagonist';
  if (params.gender && !charAnchor.toLowerCase().includes(params.gender.toLowerCase())) {
    charAnchor = `${charAnchor}, ${params.gender}`;
  }

  return buildCinematicAdPrompt({
    shot_type: params.shotType || 'Wide Environmental Shot',
    camera_angle: params.cameraAngle || 'Eye-Level',
    environment: params.location || params.basePrompt || 'Detailed commercial environment with ambient lighting',
    action: params.action || params.basePrompt || 'Character interacting naturally within scene',
    character_anchor: charAnchor,
  });
}

export interface ImageGenerationParams {
  prompt: string;
  visualAnchor?: string;
  gender?: string;
  location?: string;
  cameraAngle?: string;
  shotType?: string;
  action?: string;
  characterReferenceImage?: string;
  originalShotImage?: string;
  denoisingStrength?: number;
  seed?: number;
  modelChoice?: string;
  falApiKey?: string;
  replicateApiKey?: string;
}

export interface ImageGenResult {
  imageUrl: string;
  engine: string;
  promptUsed: string;
}

/**
 * Pollinations FLUX Generator with Fixed Seed Lock for Multi-Shot Character Consistency
 */
export function generatePollinationsFluxUrl(
  prompt: string,
  visualAnchor?: string,
  gender?: string,
  seed?: number
): string {
  const fullPrompt = buildDynamicShotPrompt({
    visualAnchor: visualAnchor || '',
    gender,
    basePrompt: prompt,
  });

  const cleanPrompt = encodeURIComponent(fullPrompt);

  let numericSeed = seed || 489201;
  if (!seed && visualAnchor) {
    let hash = 0;
    for (let i = 0; i < visualAnchor.length; i++) {
      hash = (hash << 5) - hash + visualAnchor.charCodeAt(i);
      hash |= 0;
    }
    numericSeed = Math.abs(hash) % 999999;
  }

  return `https://image.pollinations.ai/prompt/${cleanPrompt}?model=flux&seed=${numericSeed}&width=1024&height=576&nologo=true`;
}

/**
 * SVG / Canvas-based Storyboard Mock Renderer Fallback
 */
export function generateSvgMockDataUrl(
  prompt: string,
  visualAnchor?: string,
  gender?: string,
  cameraAngle?: string
): string {
  const anchorText = visualAnchor ? visualAnchor.substring(0, 50) + '...' : 'Character identity frame';
  const titleText = prompt.substring(0, 50) + '...';
  const genderText = gender ? `GENDER: ${gender.toUpperCase()}` : 'SUBJECT LOCKED';

  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576" viewBox="0 0 1024 576">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
    <linearGradient id="overlayGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="rgba(0,0,0,0.85)" />
      <stop offset="50%" stop-color="rgba(0,0,0,0.2)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.4)" />
    </linearGradient>
  </defs>

  <rect width="1024" height="576" fill="url(#bgGrad)" />

  <!-- Camera framing guides -->
  <path d="M40 80 L40 40 L80 40" fill="none" stroke="#6366f1" stroke-width="3" opacity="0.6"/>
  <path d="M984 80 L984 40 L944 40" fill="none" stroke="#6366f1" stroke-width="3" opacity="0.6"/>
  <path d="M40 496 L40 536 L80 536" fill="none" stroke="#6366f1" stroke-width="3" opacity="0.6"/>
  <path d="M984 496 L984 536 L944 536" fill="none" stroke="#6366f1" stroke-width="3" opacity="0.6"/>

  <!-- Rule of thirds crosshairs -->
  <line x1="341" y1="0" x2="341" y2="576" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="8 8"/>
  <line x1="682" y1="0" x2="682" y2="576" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="8 8"/>
  <line x1="0" y1="192" x2="1024" y2="192" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="8 8"/>
  <line x1="0" y1="384" x2="1024" y2="384" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="8 8"/>

  <!-- Center camera focus target -->
  <circle cx="512" cy="288" r="40" stroke="#f59e0b" stroke-width="1.5" fill="none" opacity="0.4"/>
  <circle cx="512" cy="288" r="4" fill="#f59e0b" opacity="0.6"/>

  <rect width="1024" height="576" fill="url(#overlayGrad)" />

  <!-- Badge header -->
  <rect x="40" y="30" width="220" height="32" rx="8" fill="rgba(99, 102, 241, 0.25)" stroke="#6366f1" stroke-width="1"/>
  <text x="52" y="51" fill="#a5b4fc" font-family="sans-serif" font-size="12" font-weight="bold">FLUX.1 STORYBOARD FRAME</text>

  <!-- Camera angle badge -->
  <rect x="270" y="30" width="160" height="32" rx="8" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" stroke-width="1"/>
  <text x="282" y="51" fill="#fcd34d" font-family="sans-serif" font-size="12" font-weight="bold">${cameraAngle || 'Eye Level'}</text>

  <!-- Gender Lock Badge -->
  <rect x="440" y="30" width="170" height="32" rx="8" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" stroke-width="1"/>
  <text x="452" y="51" fill="#6ee7b7" font-family="sans-serif" font-size="11" font-weight="bold">${genderText}</text>

  <!-- Character Identity Banner -->
  <rect x="40" y="440" width="944" height="100" rx="12" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1"/>
  <text x="60" y="470" fill="#38bdf8" font-family="sans-serif" font-size="13" font-weight="bold">DYNAMIC CHARACTER FACE CARD LOCKED</text>
  <text x="60" y="495" fill="#e2e8f0" font-family="sans-serif" font-size="14" font-weight="600">${anchorText}</text>
  <text x="60" y="522" fill="#94a3b8" font-family="sans-serif" font-size="12" italic="true">${titleText}</text>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
}

/**
 * Universal Image Generation Router
 */
export async function generateStoryboardImage(params: ImageGenerationParams): Promise<ImageGenResult> {
  const modelChoice = params.modelChoice || 'pollinations-flux';
  const falKey = params.falApiKey || process.env.FAL_KEY;
  const replicateToken = params.replicateApiKey || process.env.REPLICATE_API_TOKEN;

  const fullPrompt = buildDynamicShotPrompt({
    visualAnchor: params.visualAnchor || '',
    gender: params.gender,
    location: params.location,
    cameraAngle: params.cameraAngle,
    shotType: params.shotType,
    action: params.action,
    basePrompt: params.prompt,
  });

  // 1. Fal.ai Engine
  if (modelChoice.startsWith('fal') && falKey) {
    try {
      fal.config({ credentials: falKey });
      const isDev = modelChoice === 'fal-flux-dev';
      const modelId = isDev ? 'fal-ai/flux-1/dev' : 'fal-ai/flux-1/schnell';

      const refImage = params.originalShotImage || params.characterReferenceImage;
      let res: any;

      if (refImage && refImage.startsWith('http')) {
        try {
          const inputObj: any = {
            prompt: fullPrompt,
            image_url: refImage,
            strength: params.denoisingStrength || 0.5,
            image_size: 'landscape_16_9',
          };
          res = await fal.subscribe('fal-ai/flux/dev/image-to-image', { input: inputObj });
        } catch (e) {
          const inputObj: any = { prompt: fullPrompt, image_size: 'landscape_16_9' };
          res = await fal.subscribe(modelId, { input: inputObj });
        }
      } else {
        const inputObj: any = { prompt: fullPrompt, image_size: 'landscape_16_9' };
        res = await fal.subscribe(modelId, { input: inputObj });
      }

      const imageUrl = res.data?.images?.[0]?.url || res.data?.image?.url;
      if (imageUrl) {
        return { imageUrl, engine: `Fal.ai (${modelId})`, promptUsed: fullPrompt };
      }
    } catch (err) {
      console.warn('Fal.ai error:', err);
    }
  }

  // 2. Replicate Engine
  if (modelChoice.startsWith('replicate') && replicateToken) {
    try {
      const replicate = new Replicate({ auth: replicateToken });
      const model = modelChoice === 'replicate-flux-dev' ? 'black-forest-labs/flux-dev' : 'black-forest-labs/flux-schnell';
      const inputObj: any = { prompt: fullPrompt, aspect_ratio: '16:9' };

      const refImage = params.originalShotImage || params.characterReferenceImage;
      if (refImage && refImage.startsWith('http')) {
        inputObj.image = refImage;
        inputObj.prompt_strength = 1 - (params.denoisingStrength || 0.5);
      }

      const output: any = await replicate.run(model, { input: inputObj });
      const imageUrl = Array.isArray(output) ? output[0] : output;
      if (imageUrl) {
        return { imageUrl: String(imageUrl), engine: `Replicate (${model})`, promptUsed: fullPrompt };
      }
    } catch (err) {
      console.warn('Replicate error:', err);
    }
  }

  // 3. Pollinations FLUX Engine with Fixed Seed Lock
  try {
    const imageUrl = generatePollinationsFluxUrl(params.prompt, params.visualAnchor, params.gender, params.seed);
    return {
      imageUrl,
      engine: 'Pollinations FLUX.1 Engine (Fixed Seed Locked)',
      promptUsed: fullPrompt,
    };
  } catch (err) {
    console.warn('Pollinations FLUX error, falling back to SVG Mock:', err);
  }

  // 4. SVG Canvas Mock Fallback
  const fallbackSvgUrl = generateSvgMockDataUrl(params.prompt, params.visualAnchor, params.gender, params.cameraAngle);
  return {
    imageUrl: fallbackSvgUrl,
    engine: 'SVG Canvas Storyboard Mock Renderer',
    promptUsed: fullPrompt,
  };
}
