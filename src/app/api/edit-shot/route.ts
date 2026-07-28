import { NextRequest, NextResponse } from 'next/server';
import { generateImageConditionedShot } from '@/lib/imageEdit';

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
      refImagesList.push(...referenceImages);
    } else if (characterReferenceImage) {
      refImagesList.push(characterReferenceImage);
    }

    const systemInstruction = `This is an edit, not a new image. Preserve composition, character identity, pose, lighting, and background exactly as shown, except for this change: ${editInstruction}.`;

    const result = await generateImageConditionedShot({
      instruction: editInstruction,
      sourceImage: currentShotImage,
      referenceImages: refImagesList,
      systemInstruction,
      denoisingStrength: 0.35,
      seed: seed || 489201,
      geminiApiKey: geminiApiKey || process.env.GEMINI_API_KEY,
      falApiKey: falApiKey || process.env.FAL_KEY,
      replicateApiKey: replicateApiKey || process.env.REPLICATE_API_TOKEN,
      modelChoice,
    });

    return NextResponse.json({
      success: true,
      updatedPrompt: `${systemInstruction}\nINSTRUCTION: ${editInstruction}`,
      newImageUrl: result.imageUrl,
      engineUsed: result.engine,
      hasReferenceImage: result.hasReferenceImage,
      consistencyWarning: result.consistencyWarning,
    });
  } catch (error: any) {
    console.error("API /api/edit-shot error:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to edit shot.' },
      { status: 500 }
    );
  }
}
