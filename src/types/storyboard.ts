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
  status: 'idle' | 'generating' | 'completed' | 'error';
  image_url?: string;
  original_image_url?: string;
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
  preferredModel?: 'pollinations-flux' | 'fal-flux-schnell' | 'fal-flux-dev' | 'replicate-flux-schnell' | 'replicate-flux-dev';
}
