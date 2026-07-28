export interface ShotConfig {
  characterName: string;
  gender: 'male' | 'female' | string;
  ageGroup: string;
  visualAnchor: string;
  actionText: string;
  style?: string;
  seed?: number;
}

/**
 * Builds deterministic prompts for Gemini Imagen & FLUX storyboard generation
 */
export function buildGeminiShotPrompt(config: ShotConfig): string {
  const { characterName, gender, ageGroup, visualAnchor, actionText, style = 'Cinematic Realistic film frame', seed } = config;
  const genderUpper = (gender || 'male').toUpperCase();

  return `
[CANONICAL STYLE]: High-budget cinematic ${style}
[PRIMARY SUBJECT LOCK]:
- Name: ${characterName}
- Gender: STRICTLY ${genderUpper} (DO NOT ALTER GENDER)
- Age: ${ageGroup || 'Adult'}
- Key Attributes: ${visualAnchor}
${seed ? `- Latent Anchor Seed: ${seed}` : ''}

[SHOT ACTION & ENVIRONMENT]:
${actionText}

[COMPOSITION & NEGATIVE CONSTRAINTS]:
- Keep subject facial geometry identical to previous shots.
- DO NOT ADD: Unrequested hats, fedoras, female features, floating objects, or distorted hands.
- Ensure natural placement on surfaces and accurate contact shadows.
`.trim();
}

export interface StylisticIdentityPromptOptions {
  characterName: string;
  gender: string;
  age: string;
  facialDescription: string;
  clothingDescription: string;
  actionDescription: string;
  cameraAngle: string;
  environmentLighting: string;
  seedOrId?: string | number;
  explicitChangesOnly?: string;
  userEditInstruction?: string;
}

/**
 * System Directive: Stylistic & Identity Consistency Engine Prompt Builder
 */
export function buildStylisticIdentityPrompt(options: StylisticIdentityPromptOptions): string {
  const {
    characterName,
    gender,
    age,
    facialDescription,
    clothingDescription,
    actionDescription,
    cameraAngle,
    environmentLighting,
    seedOrId,
    explicitChangesOnly,
    userEditInstruction,
  } = options;

  const genderUpper = (gender || 'MALE').toUpperCase();

  const editBlock = userEditInstruction ? `
3. EDIT & MODIFICATION RULE (IF EDITING EXISTING SHOT):
   - BASE REFERENCE SEED / ID: ${seedOrId || 'DEFAULT'}
   - PRESERVE EVERYTHING from the base shot EXCEPT: ${explicitChangesOnly || 'Requested modification instruction'}.
   - MODIFICATION: ${userEditInstruction}
   - PLACEMENT: Integrate added objects seamlessly onto physical surfaces with natural contact shadows. Hands must not clip, distort, or float.
` : (seedOrId ? `
3. BASE SEED IDENTITY LOCK:
   - BASE REFERENCE SEED / ID: ${seedOrId}
` : '');

  return `
[SYSTEM DIRECTIVE: STYLISTIC & IDENTITY CONSISTENCY ENGINE]

INSTRUCTIONS: You are generating a keyframe for a film storyboard. You MUST adhere to strict character consistency, spatial physics, and photorealism rules.

1. SUBJECT IDENTITY LOCK (CRITICAL):
   - SUBJECT: ${characterName}
   - DEMOGRAPHICS: STRICTLY ${genderUpper}, ${age} years old.
   - FACIAL ANCHORS: ${facialDescription}
   - CLOTHING & ACCESSORIES: ${clothingDescription}
   - RULE: DO NOT alter the character's gender, face geometry, ethnicity, or core clothing unless explicitly commanded in the action text. DO NOT add unrequested hats, fedoras, or accessories.

2. SHOT ACTION & COMPOSITION:
   - ACTION: ${actionDescription}
   - CAMERA ANGLE: ${cameraAngle}
   - ENVIRONMENT & LIGHTING: ${environmentLighting}
${editBlock}
4. NEGATIVE DIRECTIVES & QUALITY CONTROL:
   - PHOTOREALISM: Shot on 35mm film lens, cinematic color grading, 8k resolution, highly detailed skin textures.
   - DO NOT INCLUDE: Female features on male characters, extra fingers, distorted hands, floating coffee cups, unrequested headwear, 3D render artifacts, anime/cartoon blend.
`.trim();
}
