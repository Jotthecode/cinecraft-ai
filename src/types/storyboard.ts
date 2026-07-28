export interface CharacterAnchor {
  id: string;
  name: string;
  role: string;
  gender: string; // e.g. "Male", "Female", "Non-Binary", "Child", etc.
  age: string; // e.g. "Late 50s", "30s", "10 years old"
  visual_anchor: string; // Comprehensive description of facial features, skin tone, hair, costume, and signature colors
  seed: number; // Fixed random integer seed for multi-shot visual consistency
  reference_prompt?: string;
  reference_image_url?: string;
  referenceImageUrls?: string[]; // Array of canonical face-card reference images
  lockedTraits?: string; // Explicit demographic & facial traits locked for identity continuity
}

export type ShotType = 
  | 'Wide Shot' 
  | 'Medium Shot' 
  | 'Close-up' 
  | 'Extreme Close-up' 
  | 'Establishing Shot' 
  | 'Over the Shoulder' 
  | 'Low Angle' 
  | 'Aerial / Bird Eye';

export type CameraAngle =
  | 'Eye-Level'
  | 'Low Angle'
  | 'High Angle'
  | 'Over-The-Shoulder'
  | 'Close-Up'
  | 'Wide Shot';

export interface ShotEditRecord {
  timestamp: string;
  edit_instruction: string;
  previous_prompt: string;
  new_prompt: string;
  previous_image_url: string;
  new_image_url: string;
}

export interface Shot {
  shot_id: string;
  shot_number: number;
  shot_type: ShotType | string;
  camera_angle: CameraAngle | string;
  action: string;
  dialogue?: string;
  image_prompt: string;
  character_ids: string[];
  status: 'idle' | 'generating' | 'editing' | 'completed' | 'error';
  image_url?: string;
  original_image_url?: string;
  sourceImageUrl?: string; // Current rendered image conditioned on for edits
  hasReferenceImage?: boolean; // Indicates if character reference image was available
  consistencyWarning?: string; // Visible warning if text-to-image fallback was used
  lastEditInstruction?: string;
  editType?: 'local_detail' | 'camera_angle' | 'new_character';
  disclaimer?: string; // Edit-specific UI disclaimer (e.g. for camera angle changes)
  preflightBlocked?: boolean; // Indicates generation blocked due to missing face card reference
  original_prompt?: string;
  edit_history?: ShotEditRecord[];
  error_message?: string;
}

export interface Scene {
  scene_id: string | number;
  scene_number: number;
  title: string;
  location: string;
  setting?: 'EXT.' | 'INT.' | string;
  time_of_day?: 'DAY' | 'NIGHT' | 'SUNSET' | 'DAWN' | string;
  shots: Shot[];
}

export interface StoryboardData {
  title: string;
  genre: string;
  characters: CharacterAnchor[];
  scenes: Scene[];
  created_at: string;
  engine_info?: {
    llmMode: string;
    imageMode: string;
  };
}

export interface ApiKeys {
  geminiApiKey?: string;
  openaiApiKey?: string;
  falApiKey?: string;
  replicateApiKey?: string;
  preferredModel?: 'gemini-2.5-flash-image' | 'fal-flux-schnell' | 'fal-flux-dev' | 'replicate-flux-schnell' | 'replicate-flux-dev';
}
