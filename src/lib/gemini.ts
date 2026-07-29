import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { StoryboardData } from '@/types/storyboard';
import { parseScriptFallback } from './openai';

export function getGeminiClient(customApiKey?: string): GoogleGenerativeAI | null {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;
  return new GoogleGenerativeAI(apiKey.trim());
}

/**
 * Gemini 2.5 Flash Image (gemini-2.5-flash-image) Multimodal Image Generation Integration
 */
export async function generateStoryboardShot(promptText: string, aspectRatio = "16:9", customApiKey?: string) {
  try {
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      throw new Error("GEMINI_API_KEY is required.");
    }
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response: any = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ text: promptText }],
    });

    const parts = response?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData && p.inlineData.data);
    if (imagePart) {
      const mime = imagePart.inlineData.mimeType || 'image/jpeg';
      const b64 = imagePart.inlineData.data;
      return `data:${mime};base64,${b64}`;
    }
    throw new Error("No image data returned from gemini-2.5-flash-image");
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
}

const SCRIPT_PARSER_SYSTEM_PROMPT = `
You are a world-class film director, commercial ad director, cinematographer, and AI storyboard architect.
Your task is to convert ANY user-provided script or screenplay concept into a structured JSON storyboard schema.

CRITICAL INSTRUCTIONS FOR COMMERCIAL ADVERTISEMENT STORYBOARDS:
1. FORCED SHOT COMPOSITION DIVERSITY (PREVENT STATIC PORTRAIT BUG):
   Every scene MUST form a dynamic commercial sequence with varied camera compositions to avoid static headshots:
   - Shot 1 of a scene MUST be an ESTABLISHING / WIDE SHOT (Focus on environment, location, full body, background setting, multiple people or objects).
   - Shot 2 MUST be an ACTION / MEDIUM TWO-SHOT (Focus on characters interacting with objects/products like tea, biscuits, items, or another person).
   - Shot 3 MUST be a REACTION / PRODUCT CLOSE-UP SHOT (Focus on emotional reactions, hands with product, or product detail).
   - NEVER generate identical close-up portrait prompts for sequential shots. Ensure consecutive shots have distinct camera framings.

2. STRUCTURED CINEMATIC AD PROMPT SYNTHESIS:
   For every shot, the "image_prompt" string MUST strictly be formatted in the following structure (placing framing and environment BEFORE character identity):
   FRAME COMPOSITION: [Shot Type, e.g. Wide Establishing Shot], [Camera Angle, e.g. Low Angle]. ENVIRONMENT & BACKGROUND: [Location details, ambient lighting, background environment]. ACTION & INTERACTION: [Character action and physical movement interacting with objects]. CHARACTER IDENTITIES: [Character visual anchor description]. CINEMATIC STYLE: Professional commercial advertisement frame, photorealistic 8k, wide cinematic aspect ratio, depth of field.

3. STRICT CHARACTER ENTITY DEDUPLICATION & 1-TO-MANY RELATIONSHIP:
   - The "characters" array MUST contain ONLY unique human/entity characters explicitly defined in the script header or story (e.g. Elena, Raj, Jackie Shroff, Rohan).
   - DO NOT create character entries for shots (e.g. DO NOT include "Shot 1", "Shot 2", "Shot 3", etc. in the characters array).
   - Every character entry MUST represent a distinct named person/entity with a unique "id" (e.g., "char-1").
   - Extract "gender" ("Male", "Female", "Non-Binary", "Child", etc.), "age", "visual_anchor" (detailed face, hair, clothing description), and a fixed integer "seed" (e.g. 489201).

4. COMPLETE SHOT PARSING (NO TRUNCATION):
   - Parse EVERY SINGLE shot listed in the input script without skipping or truncating any scene or shot.

5. STANDARDIZED CAMERA ANGLES:
   - "camera_angle" MUST strictly be normalized to one of these exact values:
     "Eye-Level" | "Low Angle" | "High Angle" | "Over-The-Shoulder" | "Close-Up" | "Wide Shot"

6. SCENE ENVIRONMENT & TIME OF DAY:
   - Each scene MUST contain:
     * "setting": "EXT." | "INT."
     * "location": Clean location name without INT/EXT prefixes or time of day suffixes (e.g. "SKYSCRAPER ROOFTOP", "MUMBAI TEA STALL")
     * "time_of_day": "DAY" | "NIGHT" | "SUNSET" | "DAWN"
   - Detect environment cues like "night", "dusk", "rain-slicked at night", "dark", "moonlit" and set "time_of_day": "NIGHT".

JSON Schema Output:
{
  "title": "Title of the script",
  "genre": "Genre",
  "characters": [
    {
      "id": "char-1",
      "name": "Character Name",
      "role": "Lead Character",
      "gender": "Male",
      "age": "45 years old",
      "visual_anchor": "Highly detailed visual anchor description of appearance, face, hair, clothing, signature accessories",
      "seed": 489201,
      "reference_prompt": "Cinematic portrait seed of character with detailed visual features"
    }
  ],
  "scenes": [
    {
      "scene_id": "scene-1",
      "scene_number": 1,
      "title": "Scene Title",
      "setting": "EXT.",
      "location": "MUMBAI TEA STALL",
      "time_of_day": "DAY",
      "shots": [
        {
          "shot_id": "shot-1-1",
          "shot_number": 1,
          "shot_type": "Wide Establishing Shot",
          "camera_angle": "Wide Shot",
          "action": "Description of action in shot",
          "dialogue": "Character dialogue if present",
          "image_prompt": "FRAME COMPOSITION: Wide Establishing Shot, Wide Shot. ENVIRONMENT & BACKGROUND: Mumbai roadside tea stall, morning sunlight, background crowd. ACTION & INTERACTION: Raj walks into corner store holding tea. CHARACTER IDENTITIES: Raj, middle-aged Indian man, grey mustache, blue shirt. CINEMATIC STYLE: Professional commercial advertisement frame, photorealistic 8k, wide cinematic aspect ratio, depth of field.",
          "character_ids": ["char-1"]
        }
      ]
    }
  ]
}

Return ONLY valid JSON. No markdown backticks, no explanatory commentary.
`;

/**
 * Universal Dynamic Script Parsing via Google Gemini API
 */
export async function parseScriptWithGemini(
  scriptText: string,
  customApiKey?: string
): Promise<{ data: StoryboardData; mode: 'gemini' | 'rule-fallback' }> {
  const genAI = getGeminiClient(customApiKey);

  if (!genAI) {
    console.log('No Gemini API key provided. Using universal dynamic rule-based script parser fallback.');
    const fallbackData = parseScriptFallback(scriptText);
    return { data: fallbackData, mode: 'rule-fallback' };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const prompt = `${SCRIPT_PARSER_SYSTEM_PROMPT}\n\nParse this user script:\n${scriptText}`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const parsed = JSON.parse(responseText) as StoryboardData;
    parsed.created_at = new Date().toISOString();

    // Assign fixed character seeds & default status to shots if omitted
    parsed.characters = (parsed.characters || []).map((c, idx) => ({
      ...c,
      gender: c.gender || 'Person',
      age: c.age || 'Adult',
      seed: c.seed || 100000 + idx * 4321,
    }));

    parsed.scenes = (parsed.scenes || []).map((sc) => ({
      ...sc,
      shots: (sc.shots || []).map((shot) => ({
        ...shot,
        status: shot.status || 'idle',
      })),
    }));

    return { data: parsed, mode: 'gemini' };
  } catch (err) {
    console.error('Gemini script parsing error:', err);
    const fallbackData = parseScriptFallback(scriptText);
    return { data: fallbackData, mode: 'rule-fallback' };
  }
}

/**
 * Dynamic Prompt Rewriting via Gemini API
 */
export async function editShotPromptWithGemini(params: {
  originalPrompt: string;
  editInstruction: string;
  visualAnchor?: string;
  gender?: string;
  action?: string;
  customApiKey?: string;
}): Promise<string> {
  const { originalPrompt, editInstruction, visualAnchor, gender, action, customApiKey } = params;
  const genAI = getGeminiClient(customApiKey);

  if (!genAI) {
    // Dynamic rule-based prompt modifier
    let updated = originalPrompt;
    if (editInstruction.toLowerCase().includes('bird') || editInstruction.toLowerCase().includes('top')) {
      updated = updated.replace(/low angle|eye level|medium shot/gi, "bird's-eye view, dramatic overhead top shot");
    } else if (editInstruction.toLowerCase().includes('low angle')) {
      updated = updated.replace(/eye level|high angle|establishing/gi, 'dramatic low angle looking up');
    }
    if (editInstruction.toLowerCase().includes('night')) {
      updated = updated.replace(/golden hour|sunlight|day/gi, 'dark atmospheric night, moonlight, neon reflections');
    }
    if (editInstruction.toLowerCase().includes('rain')) {
      updated += ', heavy torrential rain, wet pavement reflections';
    }
    if (visualAnchor && !updated.includes(visualAnchor.slice(0, 15))) {
      updated = `CRITICAL SUBJECT IDENTIFIER: ${visualAnchor}. GENDER STRICT LOCK: Subject MUST strictly be ${gender || 'the same person'}. ${updated}`;
    }
    return updated;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `You are an expert AI storyboard prompt engineer for FLUX.1 image generation.
Original Prompt: "${originalPrompt}"
Character Visual Anchor: "${visualAnchor || 'None'}"
Gender Identity: "${gender || 'None'}"
Action Context: "${action || 'None'}"
User Edit Instruction: "${editInstruction}"

Task: Rewrite the image generation prompt to apply the user's edit instruction (camera framing, lighting, weather, or style) while STRICTLY keeping the character visual anchor, facial features, ethnicity, gender, and costume lock intact. Output ONLY the final revised prompt string.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error('Gemini prompt edit error:', err);
    return `${originalPrompt}, modified: ${editInstruction}`;
  }
}



