import { NextRequest, NextResponse } from 'next/server';
import { generateImageConditionedShot, classifyEditInstruction } from '@/lib/imageEdit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      originalImageUrl,
      sourceImageUrl,
      editInstruction,
      characterAnchor,
      visualAnchor,
      characterReferenceImage,
      referenceImages,
      seed,
      modelChoice,
      geminiApiKey,
      falApiKey,
      replicateApiKey,
    } = body;

    const currentShotImage = sourceImageUrl || originalImageUrl;

    if (!editInstruction || !currentShotImage) {
      return NextResponse.json(
        { success: false, error: 'Edit instruction and current rendered shot image (sourceImageUrl / originalImageUrl) are required.' },
        { status: 400 }
      );
    }

    const refImagesList: string[] = [];
    if (Array.isArray(referenceImages)) {
      refImagesList.push(...referenceImages.filter(Boolean));
    } else if (characterReferenceImage) {
      refImagesList.push(characterReferenceImage);
    }

    // 1. Classify edit instruction into local_detail, camera_angle, or new_character
    const classification = classifyEditInstruction(editInstruction);
    const { editType, disclaimer } = classification;

    // 2. Select system instruction template based on classification
    let systemInstruction = "";
    if (editType === 'camera_angle') {
      systemInstruction = `Re-render this exact scene from a new camera angle: ${editInstruction}. Keep the same character identity, clothing, pose/action context, set dressing, and lighting mood. Only the camera perspective and framing should change.`;
    } else if (editType === 'new_character') {
      systemInstruction = `This is an image edit introducing a new subject/character into the existing scene frame. Preserve the existing scene composition, background, lighting, and current character identities exactly as shown in the source image. Add the new subject as specified: ${editInstruction}. Ensure natural physical surface contact and shadows.`;
    } else {
      systemInstruction = `This is a targeted edit, not a new image. Preserve composition, camera angle, character identity, clothing, pose, and lighting EXACTLY as shown in the source image. Apply ONLY this change: ${editInstruction}. Do not alter anything else.`;
    }

    const result = await generateImageConditionedShot({
      instruction: editInstruction,
      sourceImage: currentShotImage,
      referenceImages: refImagesList,
      systemInstruction,
      editType,
      denoisingStrength: editType === 'camera_angle' ? 0.65 : 0.35,
      seed: seed || 489201,
      openaiApiKey: body.openaiApiKey || process.env.OPENAI_API_KEY,
      geminiApiKey: geminiApiKey || process.env.GEMINI_API_KEY,
      modelChoice,
    });

    return NextResponse.json({
      success: true,
      updatedPrompt: `${systemInstruction}\nINSTRUCTION: ${editInstruction}`,
      newImageUrl: result.imageUrl,
      engineUsed: result.engine,
      editType,
      disclaimer: disclaimer || result.disclaimer,
      hasReferenceImage: result.hasReferenceImage,
      consistencyWarning: result.consistencyWarning,
      isPaid: result.isPaid,
      paidWarning: result.paidWarning,
    });
  } catch (error: any) {
    console.error("API /api/edit-shot error:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to edit shot.' },
      { status: 500 }
    );
  }
}
