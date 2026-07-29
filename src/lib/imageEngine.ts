import { fal } from '@fal-ai/client';
import Replicate from 'replicate';
import { generateImageConditionedShot } from './imageEdit';

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

export interface ShotEditOptions {
  userInstruction: string;    // e.g., "Add a steaming brass cup of coffee"
  characterName: string;       // e.g., "Detective Sam"
  seed?: string | number;      // e.g., "489201"
  preserveAttributes?: string[]; // e.g., ["face", "hair", "clothing", "lighting"]
  negativeConstraints?: string[]; // e.g., ["unrequested hats", "female features", "distorted hands"]
}

export function buildShotEditPrompt(options: ShotEditOptions): string {
  const {
    userInstruction,
    characterName,
    seed,
    preserveAttributes = ["facial identity", "headwear", "clothing", "lighting", "camera angle"],
    negativeConstraints = [
      "unrequested hats or headwear",
      "opposite gender or female features when subject is male",
      "distorted hands or malformed fingers",
      "extra limbs or anatomical deformities",
      "blurry low quality artifacts"
    ]
  } = options;

  return `
[STRICT IDENTITY LOCK & PRESERVATION]
- Target Subject: ${characterName} ${seed ? `(Seed / Reference State: ${seed})` : ""}
- DO NOT ALTER: ${preserveAttributes.join(", ")}.
- DO NOT ADD / NEGATIVE CONSTRAINTS: ${negativeConstraints.join(", ")}.
- STYLE CONSISTENCY: Maintain exact photorealism, color palette, and art style of the original shot.

[MODIFICATION INSTRUCTION]
${userInstruction}

[SPATIAL & LOGICAL RULES]
- Integrate added objects seamlessly into the environment.
- Respect lighting, shadows, and physical contact points (e.g., objects rest on surfaces, no floating artifacts).
`.trim();
}

import { buildGeminiShotPrompt, buildStylisticIdentityPrompt } from '@/utils/buildShotPrompt';
export { buildGeminiShotPrompt, buildStylisticIdentityPrompt };
export type { ShotConfig, StylisticIdentityPromptOptions } from '@/utils/buildShotPrompt';

/**
 * Universal Dynamic Shot Prompt Engine
 * Constructs image prompts dynamically for ANY arbitrary character, enforcing framing, location, and action
 */
export function buildDynamicShotPrompt(params: DynamicShotPromptParams): string {
  if (params.basePrompt && (params.basePrompt.includes('FRAME COMPOSITION:') || params.basePrompt.includes('CHARACTER IDENTITY LOCK') || params.basePrompt.includes('[STRICT IDENTITY LOCK & PRESERVATION]') || params.basePrompt.includes('[CANONICAL STYLE]:') || params.basePrompt.includes('[SYSTEM DIRECTIVE:'))) {
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
import { generateImageConditionedShot } from './imageEdit';

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
  <text x="52" y="51" fill="#a5b4fc" font-family="sans-serif" font-size="12" font-weight="bold">CINECRAFT FRAME</text>

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
  const refImages: string[] = [];
  if (params.characterReferenceImage) {
    refImages.push(params.characterReferenceImage);
  }

  const result = await generateImageConditionedShot({
    instruction: params.prompt,
    sourceImage: params.originalShotImage,
    referenceImages: refImages,
    denoisingStrength: params.denoisingStrength,
    seed: params.seed,
    openaiApiKey: process.env.OPENAI_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    modelChoice: params.modelChoice,
  });

  return {
    imageUrl: result.imageUrl,
    engine: result.engine,
    promptUsed: result.promptUsed,
  };
}
