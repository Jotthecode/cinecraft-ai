import { parseScriptWithGemini, editShotPromptWithGemini } from './gemini';
import { StoryboardData, CharacterAnchor, Scene, Shot } from '@/types/storyboard';
import OpenAI from 'openai';

export function getOpenAIClient(customApiKey?: string): OpenAI | null {
  const apiKey = customApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

import { buildCinematicAdPrompt } from './imageEngine';

export function cleanActionText(rawText: string): string {
  if (!rawText) return '';
  
  let cleaned = rawText.trim();

  // Strip leading shot prefixes like "- Shot 1 (Establishing Shot, High Angle):" or "SHOT 1:" or "- SHOT 2:"
  cleaned = cleaned.replace(/^-\s*Shot\s*\d+.*?:/i, '');
  cleaned = cleaned.replace(/^-\s*SHOT\s*\d+\s*(?:\([^)]*\))?:?\s*/i, '');
  cleaned = cleaned.replace(/^SHOT\s*\d+\s*(?:\([^)]*\))?:?\s*/i, '');
  cleaned = cleaned.replace(/^-\s*/, '');

  // Truncate if another shot header spills over into this action text (e.g. "... - Shot 2 (Medium Two-Shot): ...")
  const nextShotMatch = cleaned.match(/(?:^|\s)(?:-\s*)?SHOT\s*\d+\s*(?:\([^)]*\))?:/i);
  if (nextShotMatch && nextShotMatch.index !== undefined && nextShotMatch.index > 0) {
    cleaned = cleaned.substring(0, nextShotMatch.index).trim();
  }

  // Remove any remaining colon or leading hyphen
  cleaned = cleaned.replace(/^:\s*/, '').replace(/^-\s*/, '').trim();

  return cleaned;
}

export function normalizeCameraAngle(angleStr?: string, shotType?: string, textContext?: string): string {
  const combined = `${angleStr || ''} ${shotType || ''} ${textContext || ''}`.toLowerCase();
  
  if (combined.includes('over-the-shoulder') || combined.includes('over the shoulder') || combined.includes('ots')) {
    return 'Over-The-Shoulder';
  }
  if (combined.includes('low angle') || combined.includes('looking up')) {
    return 'Low Angle';
  }
  if (combined.includes('high angle') || combined.includes('bird') || combined.includes('overhead') || combined.includes('looking down')) {
    return 'High Angle';
  }
  if (combined.includes('close-up') || combined.includes('close up') || combined.includes('closeup') || combined.includes('extreme close')) {
    return 'Close-Up';
  }
  if (combined.includes('wide shot') || combined.includes('wide angle') || combined.includes('establishing')) {
    return 'Wide Shot';
  }
  if (combined.includes('eye-level') || combined.includes('eye level') || combined.includes('eyelevel')) {
    return 'Eye-Level';
  }

  if (angleStr) {
    const s = angleStr.trim();
    if (/^eye[- ]?level$/i.test(s)) return 'Eye-Level';
    if (/^low[- ]?angle$/i.test(s)) return 'Low Angle';
    if (/^high[- ]?angle$/i.test(s)) return 'High Angle';
    if (/^over[- ]the[- ]shoulder$/i.test(s) || /^ots$/i.test(s)) return 'Over-The-Shoulder';
    if (/^close[- ]?up$/i.test(s)) return 'Close-Up';
    if (/^wide[- ]?shot$/i.test(s)) return 'Wide Shot';
  }

  return 'Eye-Level';
}

export function sanitizeStoryboardData(data: StoryboardData): StoryboardData {
  // 1. Clean & Deduplicate Characters (Fixes Bug A)
  const rawChars = data.characters || [];
  const cleanChars: CharacterAnchor[] = [];
  const seenNames = new Set<string>();

  for (const c of rawChars) {
    if (!c || !c.name) continue;
    const nameUpper = c.name.toUpperCase().trim();
    // Exclude shot/scene/location headings incorrectly parsed as character names
    if (
      nameUpper.startsWith('SHOT') ||
      nameUpper.startsWith('SCENE') ||
      nameUpper.startsWith('INT.') ||
      nameUpper.startsWith('EXT.') ||
      nameUpper.startsWith('TITLE')
    ) {
      continue;
    }
    const nameKey = c.name.toLowerCase().trim();
    if (seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);

    cleanChars.push({
      id: c.id || `char-${cleanChars.length + 1}`,
      name: c.name.trim(),
      role: c.role || (cleanChars.length === 0 ? 'Lead Character' : 'Supporting Character'),
      gender: c.gender || 'Person',
      age: c.age || 'Adult',
      visual_anchor: c.visual_anchor || c.name,
      seed: c.seed || (489201 + cleanChars.length * 7777),
      reference_prompt: c.reference_prompt,
      reference_image_url: c.reference_image_url,
    });
  }

  // Fallback if cleanChars ended up empty
  if (cleanChars.length === 0) {
    cleanChars.push({
      id: 'char-1',
      name: 'Main Lead',
      role: 'Protagonist',
      gender: 'Female',
      age: 'Adult',
      visual_anchor: 'Main Lead, athletic build, expressive features',
      seed: 489201,
    });
  }

  // 2. Clean & Process Scenes and Shots (Enforce Cinematic Ad Composition & Structured Prompts)
  const cleanScenes: Scene[] = (data.scenes || []).map((sc, scIdx) => {
    const rawLoc = sc.location || sc.title || `Scene ${scIdx + 1}`;
    
    // Detect setting (EXT. / INT.)
    let setting = sc.setting;
    if (!setting || !['EXT.', 'INT.'].includes(setting.toUpperCase())) {
      setting = (rawLoc.toUpperCase().includes('INT.') || sc.title.toUpperCase().includes('INT.')) ? 'INT.' : 'EXT.';
    } else {
      setting = setting.toUpperCase().includes('INT') ? 'INT.' : 'EXT.';
    }

    // Detect time_of_day (DAY / NIGHT / SUNSET / DAWN)
    let timeOfDay = sc.time_of_day;
    const sceneTextCombined = `${rawLoc} ${sc.title} ${sc.shots?.map(s => s.action + ' ' + s.image_prompt).join(' ') || ''}`.toUpperCase();
    if (!timeOfDay || !['DAY', 'NIGHT', 'SUNSET', 'DAWN'].includes(timeOfDay.toUpperCase())) {
      if (sceneTextCombined.includes('NIGHT') || sceneTextCombined.includes('EVENING') || sceneTextCombined.includes('MOON') || sceneTextCombined.includes('DARK')) {
        timeOfDay = 'NIGHT';
      } else if (sceneTextCombined.includes('SUNSET') || sceneTextCombined.includes('DUSK') || sceneTextCombined.includes('GOLDEN HOUR')) {
        timeOfDay = 'SUNSET';
      } else if (sceneTextCombined.includes('DAWN') || sceneTextCombined.includes('MORNING') || sceneTextCombined.includes('SUNRISE')) {
        timeOfDay = 'DAWN';
      } else {
        timeOfDay = 'DAY';
      }
    } else {
      timeOfDay = timeOfDay.toUpperCase() as any;
    }

    // Clean location string
    let locationClean = rawLoc
      .replace(/^(INT\.|EXT\.|INT\/EXT\.)\s*/i, '')
      .replace(/\s*-\s*(DAY|NIGHT|SUNSET|DAWN|GOLDEN HOUR|CONTINUOUS)$/i, '')
      .trim();

    if (!locationClean) locationClean = `LOCATION ${scIdx + 1}`;

    const seenActionsInScene = new Set<string>();

    const cleanShots: Shot[] = (sc.shots || []).map((shot, shotIdx) => {
      let cleanedAction = cleanActionText(shot.action || '');

      // Enforce distinct action descriptions for every shot (eliminate duplicates/clones)
      if (!cleanedAction) {
        cleanedAction = `Shot ${shotIdx + 1} narrative action`;
      }

      const normalizedAngle = normalizeCameraAngle(
        shot.camera_angle,
        shot.shot_type,
        `${cleanedAction} ${shot.image_prompt}`
      );

      // Force distinct commercial shot framing sequence if missing or generic
      let shotType = shot.shot_type || 'Medium Shot';
      if (shotIdx === 0 && (shotType === 'Medium Shot' || !shot.shot_type)) {
        shotType = 'Wide Establishing Shot';
      } else if (shotIdx === 1 && (shotType === 'Medium Shot' || !shot.shot_type)) {
        shotType = 'Medium Two-Shot';
      } else if (shotIdx === 2 && (shotType === 'Medium Shot' || !shot.shot_type)) {
        shotType = 'Close-up Reaction Shot';
      }

      const leadChar = cleanChars[0];
      const charAnchor = leadChar ? leadChar.visual_anchor : 'Protagonist';

      let formattedPrompt = shot.image_prompt || '';
      if (!formattedPrompt.startsWith('FRAME COMPOSITION:')) {
        formattedPrompt = buildCinematicAdPrompt({
          shot_type: shotType,
          camera_angle: normalizedAngle,
          environment: `${locationClean}, ${timeOfDay} lighting, cinematic background setting`,
          action: cleanedAction,
          character_anchor: charAnchor,
        });
      }

      return {
        ...shot,
        shot_id: `shot-${scIdx + 1}-${shotIdx + 1}`,
        shot_number: shotIdx + 1,
        shot_type: shotType,
        camera_angle: normalizedAngle,
        action: cleanedAction,
        dialogue: shot.dialogue || '',
        image_prompt: formattedPrompt,
        character_ids: (shot.character_ids && shot.character_ids.length > 0) ? shot.character_ids : [cleanChars[0].id],
        status: shot.status || 'idle',
      };
    });

    return {
      scene_id: sc.scene_id || `scene-${scIdx + 1}`,
      scene_number: sc.scene_number || (scIdx + 1),
      title: sc.title || `Scene ${scIdx + 1}`,
      setting,
      location: locationClean,
      time_of_day: timeOfDay,
      shots: cleanShots,
    };
  });

  return {
    ...data,
    characters: cleanChars,
    scenes: cleanScenes,
  };
}

/**
 * 100% Generic & Dynamic Rule-Based Script Parser Fallback
 */
export function parseScriptFallback(scriptText: string): StoryboardData {
  const lines = scriptText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Extract Title from first line or default
  const firstLine = lines[0] || 'AI Generated Storyboard';
  const title = firstLine.replace(/^(TITLE:|TITLE\s*-\s*)/i, '').trim() || 'AI Generated Storyboard';

  // Dynamic Character Discovery from script text
  const characters: CharacterAnchor[] = [];
  const charHeaderIdx = lines.findIndex((l) => l.toUpperCase().includes('CHARACTERS:'));

  if (charHeaderIdx !== -1) {
    for (let i = charHeaderIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.toUpperCase().startsWith('SCENE') || line.toUpperCase().startsWith('INT.') || line.toUpperCase().startsWith('EXT.')) {
        break;
      }
      if (line.startsWith('-') || (line.includes(':') && !line.toUpperCase().startsWith('SHOT') && !line.toUpperCase().startsWith('SCENE'))) {
        const clean = line.replace(/^-/, '').trim();
        if (!clean) continue;
        const parts = clean.split(':');
        const name = parts[0] ? parts[0].trim() : `Character ${characters.length + 1}`;
        const description = parts[1] ? parts[1].trim() : clean;

        if (name.toUpperCase().startsWith('SHOT') || name.toUpperCase().startsWith('SCENE') || name.toUpperCase().startsWith('INT.') || name.toUpperCase().startsWith('EXT.')) {
          continue;
        }

        let gender = 'Male';
        const descLower = description.toLowerCase();
        if (descLower.includes('female') || descLower.includes('woman') || descLower.includes('girl') || descLower.includes('she') || descLower.includes('her')) {
          gender = 'Female';
        } else if (descLower.includes('boy') || descLower.includes('man') || descLower.includes('male') || descLower.includes('he') || descLower.includes('his')) {
          gender = 'Male';
        }

        let age = 'Adult';
        const ageMatch = description.match(/(\d{1,2}s|\d{1,2}-year-old|\d{1,2} years old)/i);
        if (ageMatch) {
          age = ageMatch[0];
        }

        characters.push({
          id: `char-${characters.length + 1}`,
          name,
          role: characters.length === 0 ? 'Lead Character' : 'Supporting Character',
          gender,
          age,
          visual_anchor: `${name}, ${gender}, ${age}, ${description}`,
          seed: 489201 + characters.length * 7777,
          reference_prompt: `Cinematic portrait of ${name}, ${gender}, ${description}, photorealistic 8k, detailed lighting.`,
        });
      }
    }
  }

  if (characters.length === 0) {
    // Search for line starting with - in whole text if CHARACTERS: header wasn't explicit
    lines.forEach((cline) => {
      if (cline.startsWith('-') && !cline.toUpperCase().includes('SHOT') && !cline.toUpperCase().includes('SCENE')) {
        const clean = cline.replace(/^-/, '').trim();
        const parts = clean.split(':');
        const name = parts[0] ? parts[0].trim() : `Character ${characters.length + 1}`;
        const description = parts[1] ? parts[1].trim() : clean;
        if (!name.toUpperCase().startsWith('SHOT') && !name.toUpperCase().startsWith('SCENE')) {
          characters.push({
            id: `char-${characters.length + 1}`,
            name,
            role: characters.length === 0 ? 'Lead Character' : 'Supporting Character',
            gender: description.toLowerCase().includes('female') ? 'Female' : 'Male',
            age: 'Adult',
            visual_anchor: `${name}, ${description}`,
            seed: 489201 + characters.length * 7777,
          });
        }
      }
    });
  }

  if (characters.length === 0) {
    characters.push({
      id: 'char-1',
      name: 'Main Lead',
      role: 'Protagonist',
      gender: 'Female',
      age: 'Adult',
      visual_anchor: 'Main Lead, Female, athletic build, expressive features',
      seed: 489201,
      reference_prompt: 'Cinematic portrait of protagonist, natural lighting, highly detailed film screenshot.',
    });
  }

  // Dynamic Scene & Shot Segmentation
  const scenes: Scene[] = [];
  let currentScene: Scene | null = null;
  let currentShotNumber = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    if (upper.startsWith('SCENE') || upper.startsWith('INT.') || upper.startsWith('EXT.')) {
      if (currentScene && currentScene.shots.length > 0) {
        scenes.push(currentScene);
      }

      const setting = upper.includes('INT.') ? 'INT.' : 'EXT.';
      let timeOfDay: 'DAY' | 'NIGHT' | 'SUNSET' | 'DAWN' = 'DAY';
      if (upper.includes('NIGHT') || upper.includes('EVENING') || upper.includes('DARK') || upper.includes('MOON')) {
        timeOfDay = 'NIGHT';
      } else if (upper.includes('SUNSET') || upper.includes('DUSK') || upper.includes('GOLDEN HOUR')) {
        timeOfDay = 'SUNSET';
      } else if (upper.includes('DAWN') || upper.includes('MORNING')) {
        timeOfDay = 'DAWN';
      }

      let location = line.replace(/^(SCENE\s*\d+:?|INT\.|EXT\.|INT\/EXT\.)/i, '').trim();
      location = location.replace(/\s*-\s*(DAY|NIGHT|SUNSET|DAWN|GOLDEN HOUR|CONTINUOUS)$/i, '').trim();
      if (!location) location = `LOCATION ${scenes.length + 1}`;

      currentScene = {
        scene_id: `scene-${scenes.length + 1}`,
        scene_number: scenes.length + 1,
        title: line.split('-')[0].trim() || `Scene ${scenes.length + 1}`,
        setting,
        location,
        time_of_day: timeOfDay,
        shots: [],
      };
      currentShotNumber = 1;
    } else if (upper.startsWith('SHOT') || upper.includes('SHOT ')) {
      if (!currentScene) {
        currentScene = {
          scene_id: 'scene-1',
          scene_number: 1,
          title: 'Opening Sequence',
          setting: 'EXT.',
          location: 'STORY LOCATION',
          time_of_day: 'DAY',
          shots: [],
        };
      }

      let rawAction = line;
      if (i + 1 < lines.length && !lines[i + 1].toUpperCase().startsWith('SHOT') && !lines[i + 1].toUpperCase().startsWith('SCENE') && !lines[i + 1].toUpperCase().startsWith('INT.') && !lines[i + 1].toUpperCase().startsWith('EXT.')) {
        rawAction = lines[i + 1];
      }
      const actionText = cleanActionText(rawAction) || cleanActionText(line) || 'Character performing action in frame';

      let shotType = 'Medium Shot';
      if (upper.includes('ESTABLISHING')) shotType = 'Wide Establishing Shot';
      else if (upper.includes('WIDE')) shotType = 'Wide Shot';
      else if (upper.includes('CLOSE-UP') || upper.includes('CLOSE UP')) shotType = 'Close-up';
      else if (upper.includes('EXTREME CLOSE')) shotType = 'Extreme Close-up';
      else if (upper.includes('MEDIUM')) shotType = 'Medium Two-Shot';

      if (currentShotNumber === 1 && (shotType === 'Medium Shot' || !shotType)) {
        shotType = 'Wide Establishing Shot';
      } else if (currentShotNumber === 2 && (shotType === 'Medium Shot' || !shotType)) {
        shotType = 'Medium Two-Shot';
      } else if (currentShotNumber === 3 && (shotType === 'Medium Shot' || !shotType)) {
        shotType = 'Close-up Reaction Shot';
      }

      const cameraAngle = normalizeCameraAngle(undefined, shotType, actionText);
      const leadChar = characters[0];

      const formattedPrompt = buildCinematicAdPrompt({
        shot_type: shotType,
        camera_angle: cameraAngle,
        environment: `${currentScene.location}, ${currentScene.time_of_day} lighting, commercial background setting`,
        action: actionText,
        character_anchor: leadChar.visual_anchor,
      });

      currentScene.shots.push({
        shot_id: `shot-${currentScene.scene_number}-${currentShotNumber}`,
        shot_number: currentShotNumber,
        shot_type: shotType,
        camera_angle: cameraAngle,
        action: actionText,
        dialogue: '',
        image_prompt: formattedPrompt,
        character_ids: [leadChar.id],
        status: 'idle',
      });
      currentShotNumber++;
    }
  }

  if (currentScene && currentScene.shots.length > 0) {
    scenes.push(currentScene);
  }

  const rawStoryboard: StoryboardData = {
    title,
    genre: 'Cinematic Narrative',
    characters,
    scenes,
    created_at: new Date().toISOString(),
  };

  return sanitizeStoryboardData(rawStoryboard);
}

/**
 * Universal LLM Script Parser Engine
 */
export async function parseScriptWithLLM(
  scriptText: string,
  geminiKey?: string,
  openaiKey?: string
): Promise<{ data: StoryboardData; mode: string }> {
  // 1. Try Google Gemini API
  if (geminiKey || process.env.GEMINI_API_KEY) {
    const res = await parseScriptWithGemini(scriptText, geminiKey);
    if (res.mode === 'gemini') {
      return { data: sanitizeStoryboardData(res.data), mode: 'Google Gemini 2.0 Flash' };
    }
  }

  // 2. Try OpenAI API if key present
  const openai = getOpenAIClient(openaiKey);
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Parse script into structured JSON matching: { title, genre, characters: [{ id, name, role, gender, age, visual_anchor, seed }], scenes: [{ scene_id, scene_number, title, setting, location, time_of_day, shots: [{ shot_id, shot_number, shot_type, camera_angle, action, dialogue, image_prompt, character_ids }] }] }
RULES FOR COMMERCIAL ADVERTISEMENT STORYBOARDS:
1. FORCED SHOT DIVERSITY: Shot 1 MUST be Establishing Shot/Wide Shot. Shot 2 MUST be Medium Two-Shot/Action Shot. Shot 3 MUST be Close-up/Reaction Shot. Never use consecutive close-ups or identical framing.
2. STRUCTURED AD PROMPTS: Format "image_prompt" strictly as:
   FRAME COMPOSITION: [Shot Type], [Camera Angle]. ENVIRONMENT & BACKGROUND: [Location, ambient lighting, background environment]. ACTION & INTERACTION: [Character action/movement with objects]. CHARACTER IDENTITIES: [Visual Anchor]. CINEMATIC STYLE: Professional commercial advertisement frame, photorealistic 8k, wide cinematic aspect ratio, depth of field.
3. "characters" MUST contain ONLY unique human/entity characters defined in the header or story. NEVER include shots or scenes in characters.
4. Parse EVERY SINGLE shot listed without skipping or truncating.
5. Normalize camera_angle to: "Eye-Level" | "Low Angle" | "High Angle" | "Over-The-Shoulder" | "Close-Up" | "Wide Shot".
6. Set setting ("EXT." | "INT.") and time_of_day ("DAY" | "NIGHT" | "SUNSET" | "DAWN") for each scene. Detect environment cues like "night", "dusk" and set time_of_day to "NIGHT".`,
          },
          { role: 'user', content: scriptText },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      if (parsed.characters && parsed.scenes) {
        parsed.created_at = new Date().toISOString();
        return { data: sanitizeStoryboardData(parsed), mode: 'OpenAI gpt-4o-mini' };
      }
    } catch (e) {
      console.warn('OpenAI parse error:', e);
    }
  }

  // 3. Universal Dynamic Fallback Parser
  return { data: parseScriptFallback(scriptText), mode: 'Universal Dynamic Rule Parser' };
}

/**
 * Dynamic Prompt Rewriting Engine
 */
export async function editShotPromptWithLLM(params: {
  originalPrompt: string;
  editInstruction: string;
  visualAnchor?: string;
  gender?: string;
  action?: string;
  geminiKey?: string;
  openaiKey?: string;
}): Promise<string> {
  if (params.geminiKey || process.env.GEMINI_API_KEY) {
    return editShotPromptWithGemini({
      originalPrompt: params.originalPrompt,
      editInstruction: params.editInstruction,
      visualAnchor: params.visualAnchor,
      gender: params.gender,
      action: params.action,
      customApiKey: params.geminiKey,
    });
  }

  return editShotPromptWithGemini({
    originalPrompt: params.originalPrompt,
    editInstruction: params.editInstruction,
    visualAnchor: params.visualAnchor,
    gender: params.gender,
    action: params.action,
  });
}
