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
