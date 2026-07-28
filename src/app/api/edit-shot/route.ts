import { NextRequest, NextResponse } from 'next/server';
import { editShotPromptWithLLM } from '@/lib/openai';
import { generateStoryboardImage, buildShotEditPrompt } from '@/lib/imageEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      originalImageUrl,
      editInstruction,
      characterAnchor,
      visualAnchor,
      shotMetadata,
      originalPrompt,
      gender,
      location,
      cameraAngle,
      shotType,
      action,
      characterReferenceImage,
      seed,
      modelChoice,
      geminiApiKey,
      openaiApiKey,
      falApiKey,
      replicateApiKey,
    } = body;

    if (!editInstruction || (!originalPrompt && !action && !shotMetadata)) {
      return NextResponse.json(
        { success: false, error: 'Edit instruction and original prompt or shot action/metadata are required.' },
        { status: 400 }
      );
    }

    const effectiveVisualAnchor = characterAnchor || visualAnchor || 'Protagonist visual identity';
    const effectiveCameraAngle = shotMetadata?.cameraAngle || cameraAngle;
    const effectiveShotType = shotMetadata?.shotType || shotType;
    const effectiveAction = shotMetadata?.action || action;
    const effectiveSeed = seed || 489201;

    // 1. Build Dynamic Structured Edit Prompt Template with Negative Constraints
    const structuredEditPrompt = buildShotEditPrompt({
      userInstruction: editInstruction,
      characterName: effectiveVisualAnchor,
      seed: effectiveSeed,
      preserveAttributes: ["facial identity", "headwear", "clothing", "lighting", "camera angle", "background setting"],
      negativeConstraints: [
        "unrequested hats or headwear",
        gender === 'Male' ? "female features" : gender === 'Female' ? "male features" : "opposite gender features",
        "distorted hands",
        "malformed fingers or extra fingers",
        "extra limbs or anatomical deformities",
        "blurry low quality artifacts"
      ]
    });

    // 2. Strict Character Continuity & Base Reference Prompt Locks
    const charLockHeader = `[CHARACTER IDENTITY LOCK - Seed: ${effectiveSeed}]: ${effectiveVisualAnchor}${gender ? `, ${gender}` : ''}.`;
    const baseImageLock = `[BASE IMAGE REFERENCE LOCK]: Maintain existing scene composition, background elements, actor identity, and lighting.`;
    const instructionUpdate = `[INSTRUCTION UPDATE]: ${editInstruction}. Do NOT change character face, clothing, or overall scene environment.`;

    // 3. Dynamic LLM Prompt Rewriting while keeping visual anchor & character lock intact
    let basePromptContext = originalPrompt || effectiveAction || 'Cinematic storyboard frame';
    let rewrittenPrompt = basePromptContext;

    try {
      rewrittenPrompt = await editShotPromptWithLLM({
        originalPrompt: basePromptContext,
        editInstruction,
        visualAnchor: effectiveVisualAnchor,
        gender,
        action: effectiveAction,
        geminiKey: geminiApiKey || process.env.GEMINI_API_KEY,
        openaiKey: openaiApiKey || process.env.OPENAI_API_KEY,
      });
    } catch (err) {
      console.warn("LLM prompt rewrite fallback:", err);
    }

    // Synthesize composite delta prompt with strict locks prepended
    const finalPrompt = `${charLockHeader}\n\n${structuredEditPrompt}\n\n${baseImageLock}\n${instructionUpdate}\n\nORIGINAL FRAME CONTEXT: ${rewrittenPrompt}`;

    // 3. Img2Img Engine Call with low noise strength (0.35) for non-destructive delta modification
    const result = await generateStoryboardImage({
      prompt: finalPrompt,
      visualAnchor: effectiveVisualAnchor,
      gender,
      location,
      cameraAngle: effectiveCameraAngle,
      shotType: effectiveShotType,
      action: effectiveAction,
      characterReferenceImage,
      originalShotImage: originalImageUrl,
      denoisingStrength: 0.35, // Low noise strength to modify ONLY requested elements while preserving existing frame layout
      seed: effectiveSeed,
      modelChoice,
      falApiKey,
      replicateApiKey,
    });

    return NextResponse.json({
      success: true,
      updatedPrompt: result.promptUsed || finalPrompt,
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

