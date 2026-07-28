import { NextRequest, NextResponse } from 'next/server';
import { generateImageConditionedShot } from '@/lib/imageEdit';
import { buildDynamicShotPrompt } from '@/lib/imageEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      visualAnchor,
      gender,
      location,
      cameraAngle,
      shotType,
      action,
      characterReferenceImage,
      referenceImageUrls,
      seed,
      modelChoice,
      falApiKey,
      replicateApiKey,
      geminiApiKey,
    } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Image prompt is required.' },
        { status: 400 }
      );
    }

    const refImagesList: string[] = [];
    if (Array.isArray(referenceImageUrls)) {
      refImagesList.push(...referenceImageUrls.filter(Boolean));
    }
    if (characterReferenceImage && !refImagesList.includes(characterReferenceImage)) {
      refImagesList.push(characterReferenceImage);
    }

    // Build structured cinematic prompt
    const fullPrompt = buildDynamicShotPrompt({
      visualAnchor: visualAnchor || '',
      gender,
      location,
      cameraAngle,
      shotType,
      action,
      basePrompt: prompt,
    });

    // Execute Image-Conditioned Generation Engine
    const result = await generateImageConditionedShot({
      instruction: fullPrompt,
      referenceImages: refImagesList,
      seed: seed || 489201,
      geminiApiKey: geminiApiKey || process.env.GEMINI_API_KEY,
      falApiKey: falApiKey || process.env.FAL_KEY,
      replicateApiKey: replicateApiKey || process.env.REPLICATE_API_TOKEN,
      modelChoice,
    });

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      engineUsed: result.engine,
      promptUsed: result.promptUsed,
      hasReferenceImage: result.hasReferenceImage,
      consistencyWarning: result.consistencyWarning,
    });
  } catch (error: any) {
    console.error("API /api/generate-image error:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate image.' },
      { status: 500 }
    );
  }
}
