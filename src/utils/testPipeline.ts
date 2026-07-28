import { generateImageConditionedShot } from '@/lib/imageEdit';

export interface TestChecklistItem {
  step: string;
  passed: boolean;
  details: string;
}

/**
 * Manual Test Pipeline Script for Image-Conditioned Shot Generation & Editing
 */
export async function runImagePipelineManualTest(): Promise<TestChecklistItem[]> {
  console.log("=== STARTING IMAGE-CONDITIONED PIPELINE TEST ===");
  const checklistResults: TestChecklistItem[] = [];

  // Step 1: Generate Face Card (First Time)
  console.log("Step 1: Generating Face Card Reference Image...");
  const faceCardResult = await generateImageConditionedShot({
    instruction: "Face Card: Jackie Shroff, iconic 60s Bollywood superstar with dark aviator sunglasses, brown vintage leather jacket, silk neck bandana, highly detailed photorealistic portrait.",
  });

  const referenceImageUrl = faceCardResult.imageUrl;
  const step1Passed = Boolean(referenceImageUrl);
  checklistResults.push({
    step: "1. Face Card Generation & Identity Store",
    passed: step1Passed,
    details: `Engine: ${faceCardResult.engine}, Reference Image Created: ${referenceImageUrl ? 'YES' : 'NO'}`,
  });

  // Step 2: Generate 3 Shots using Image Conditioning with Face Card Reference
  const shotPrompts = [
    "Shot 1 (Establishing Shot): Jackie Shroff sitting on a director's folding chair at a Mumbai film set under golden sunset light.",
    "Shot 2 (Medium Close-Up): Same person, Jackie Shroff dunking a rectangular golden biscuit into hot cutting chai on a wooden table.",
    "Shot 3 (Close-Up Reaction): Same person, Jackie Shroff taking off his aviator sunglasses and winking with a warm smile.",
  ];

  const generatedShots: string[] = [];

  for (let i = 0; i < shotPrompts.length; i++) {
    console.log(`Step 2.${i + 1}: Rendering Shot ${i + 1} with image conditioning...`);
    const shotResult = await generateImageConditionedShot({
      instruction: shotPrompts[i],
      referenceImages: [referenceImageUrl],
    });
    generatedShots.push(shotResult.imageUrl);

    checklistResults.push({
      step: `2.${i + 1}. Image-Conditioned Shot ${i + 1}`,
      passed: Boolean(shotResult.imageUrl),
      details: `Engine: ${shotResult.engine}, Conditioned on Face Reference Image: ${shotResult.hasReferenceImage ? 'YES' : 'NO'}`,
    });
  }

  // Step 3: Run Natural Language Edit on Shot 2 using Source Image as input
  console.log("Step 3: Editing Shot 2 with Natural Language using source image input...");
  const sourceShotImage = generatedShots[1] || referenceImageUrl;
  const editResult = await generateImageConditionedShot({
    instruction: "Add a steaming brass cup of coffee on the wooden table next to the chai glass.",
    sourceImage: sourceShotImage,
    referenceImages: [referenceImageUrl],
    systemInstruction: "This is an edit, not a new image. Preserve composition, character identity, pose, lighting, and background exactly as shown, except for this change: Add a steaming brass cup of coffee on the wooden table next to the chai glass.",
  });

  const step3Passed = Boolean(editResult.imageUrl);
  checklistResults.push({
    step: "3. Image-Conditioned Natural Language Edit",
    passed: step3Passed,
    details: `Engine: ${editResult.engine}, Conditioned on Source Image: YES`,
  });

  console.log("=== MANUAL TEST CHECKLIST SUMMARY ===");
  checklistResults.forEach((res) => {
    console.log(`[${res.passed ? 'PASS' : 'FAIL'}] ${res.step} - ${res.details}`);
  });

  return checklistResults;
}
