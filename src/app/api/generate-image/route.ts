import { NextRequest, NextResponse } from 'next/server';
import { generateStoryboardImage, buildDynamicShotPrompt } from '@/lib/imageEngine';

async function fetchHFImageWithRetry(prompt: string, seed: number, token: string, maxRetries = 5): Promise<ArrayBuffer> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: prompt,
          parameters: { seed: seed || 489201, width: 1024, height: 576 },
        }),
      }
    );

    if (response.ok) {
      return await response.arrayBuffer();
    }

    // Handle 503 Model Cold Start (Warming Up)
    if (response.status === 503) {
      const errData = await response.json().catch(() => ({}));
      const waitTime = Math.min((errData.estimated_time || 5) * 1000, 8000);
      console.log(`HF Model loading... Waiting ${waitTime / 1000}s (Attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, waitTime));
      attempt++;
      continue;
    }

    const errText = await response.text().catch(() => '');
    console.warn(`HF Error status ${response.status}:`, errText);
    throw new Error(`HF Error status ${response.status}`);
  }

  throw new Error("Max retries exceeded for Hugging Face Inference");
}

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
      seed,
      modelChoice,
      falApiKey,
      replicateApiKey,
    } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Image prompt is required.' },
        { status: 400 }
      );
    }

    const hfToken = process.env.HUGGINGFACE_TOKEN;

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

    // 1. Try Hugging Face FLUX.1 [schnell] Inference API if token is configured
    if (hfToken && hfToken.trim() !== '') {
      try {
        const buffer = await fetchHFImageWithRetry(fullPrompt, seed || 489201, hfToken.trim());
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = "image/jpeg";
        const imageUrl = `data:${mimeType};base64,${base64}`;

        return NextResponse.json({
          success: true,
          imageUrl,
          engineUsed: "Hugging Face FLUX.1 [schnell]",
          promptUsed: fullPrompt,
        });
      } catch (hfErr) {
        console.warn("Hugging Face API call failed, falling back to engine router:", hfErr);
      }
    }

    // 2. Fallback to Fal.ai / Replicate / Pollinations FLUX / SVG canvas router
    const result = await generateStoryboardImage({
      prompt,
      visualAnchor,
      gender,
      location,
      cameraAngle,
      shotType,
      action,
      characterReferenceImage,
      seed,
      modelChoice,
      falApiKey,
      replicateApiKey,
    });

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      engineUsed: result.engine,
      promptUsed: result.promptUsed,
    });
  } catch (error: any) {
    console.error("API /api/generate-image error:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate image.' },
      { status: 500 }
    );
  }
}
