import { NextRequest, NextResponse } from 'next/server';
import { parseScriptWithLLM, sanitizeStoryboardData } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scriptText, geminiApiKey, customApiKey } = body;

    if (!scriptText || typeof scriptText !== 'string' || scriptText.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Script text is required.' },
        { status: 400 }
      );
    }

    const { data: storyboard, mode } = await parseScriptWithLLM(
      scriptText,
      geminiApiKey || process.env.GEMINI_API_KEY,
      customApiKey || process.env.OPENAI_API_KEY
    );

    const sanitized = sanitizeStoryboardData(storyboard);

    const scenes = sanitized.scenes.map((scene, sIdx) => ({
      ...scene,
      shots: scene.shots.map((shot, shotIdx) => ({
        ...shot,
        shot_id: `S${sIdx + 1}_Shot${shotIdx + 1}`,
        shot_type: shot.shot_type || "Medium Shot",
        camera_angle: shot.camera_angle || "Eye-Level",
        // Clean and strictly assign the unique action prose
        action: String(shot.action || '')
          .replace(/^-\s*Shot\s*\d+.*?:/i, '')
          .trim(),
        prompt: (shot as any).prompt || shot.image_prompt,
        image_prompt: shot.image_prompt || (shot as any).prompt,
      }))
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...sanitized,
        scenes,
      },
      modeUsed: mode,
    });
  } catch (error: any) {
    console.error("API /api/parse-script error:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to parse script.' },
      { status: 500 }
    );
  }
}
