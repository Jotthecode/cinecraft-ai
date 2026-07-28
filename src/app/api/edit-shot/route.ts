import { NextRequest, NextResponse } from 'next/server';
import { editShotPromptWithLLM } from '@/lib/openai';
import { generateStoryboardImage } from '@/lib/imageEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      originalPrompt,
      editInstruction,
      visualAnchor,
      gender,
      location,
      cameraAngle,
      shotType,
      action,
      originalImageUrl,
      characterReferenceImage,
      seed,
      modelChoice,
      geminiApiKey,
      openaiApiKey,
      falApiKey,
      replicateApiKey,
    } = body;

    if (!originalPrompt || !editInstruction) {
      return NextResponse.json(
        { success: false, error: 'Original prompt and edit instruction are required.' },
        { status: 400 }
      );
    }

    // 1. Dynamic LLM Prompt Rewriting while keeping visualAnchor & gender lock intact
    const updatedPrompt = await editShotPromptWithLLM({
      originalPrompt,
      editInstruction,
      visualAnchor,
      gender,
      action,
      geminiKey: geminiApiKey || process.env.GEMINI_API_KEY,
      openaiKey: openaiApiKey || process.env.OPENAI_API_KEY,
    });

    // 2. Image Generation with Dynamic Prompt Engine & Img2Img conditioning
    const result = await generateStoryboardImage({
      prompt: updatedPrompt,
      visualAnchor,
      gender,
      location,
      cameraAngle,
      shotType,
      action,
      characterReferenceImage,
      originalShotImage: originalImageUrl,
      seed,
      denoisingStrength: 0.5,
      modelChoice,
      falApiKey,
      replicateApiKey,
    });

    return NextResponse.json({
      success: true,
      updatedPrompt: result.promptUsed || updatedPrompt,
      newImageUrl: result.imageUrl,
      engineUsed: result.engine,
    });
  } catch (error: any) {
    console.error("API /api/edit-shot error:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to edit shot.' },
      { status: 500 }
    );
  }
}
