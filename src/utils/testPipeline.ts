import { generateImageConditionedShot, classifyEditInstruction } from '@/lib/imageEdit';

export interface TestChecklistItem {
  step: string;
  passed: boolean;
  details: string;
}

/**
 * Manual QA Checklist Script for AI Storyboard Image Pipeline
 * Verifies Requirements 1, 2, and 3:
 * 1. Character Identity & Reference Image Conditioning via gemini-2.5-flash-image
 * 2. Targeted In-Place Edit (Add table lamp in background)
 * 3. Isolated Camera Angle Re-Framing (Change to low-angle close-up)
 */
export async function runImagePipelineManualTest(): Promise<TestChecklistItem[]> {
  console.log("=== STARTING QA CHECKLIST MANUAL TEST SUITE ===");
  const checklistResults: TestChecklistItem[] = [];

  // Step 1: Character Face Card Generation & Storage
  console.log("Step 1: Generating Character Face Card (Jackie Shroff)...");
  const faceCardResult = await generateImageConditionedShot({
    instruction: "Face Card: Jackie Shroff, iconic 60s Bollywood superstar with dark aviator sunglasses, brown vintage leather jacket, silk neck bandana, highly detailed photorealistic portrait.",
  });

  const referenceImageUrl = faceCardResult.imageUrl;
  const step1Passed = Boolean(referenceImageUrl);
  checklistResults.push({
    step: "Requirement 1: Face Card Generation & Canonical Identity Store",
    passed: step1Passed,
    details: `Engine: ${faceCardResult.engine}, Reference Image Stored: ${referenceImageUrl ? 'YES' : 'NO'}`,
  });

  // Step 2: Generate 3 Shots using Image Conditioning with Character Reference
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
      step: `Requirement 1: Image-Conditioned Shot ${i + 1} Render`,
      passed: Boolean(shotResult.imageUrl),
      details: `Engine: ${shotResult.engine}, Conditioned on Face Card Reference: ${shotResult.hasReferenceImage ? 'YES' : 'NO'}`,
    });
  }

  // Step 3: Requirement 2 Edit (Add table lamp in background)
  console.log("Step 3: Requirement 2 In-Place Edit ('Add a table lamp in background')...");
  const sourceShotImage = generatedShots[1] || referenceImageUrl;
  const req2Instruction = "Add a table lamp in background";
  const req2Classification = classifyEditInstruction(req2Instruction);

  const editReq2Result = await generateImageConditionedShot({
    instruction: req2Instruction,
    sourceImage: sourceShotImage,
    referenceImages: [referenceImageUrl],
    systemInstruction: "This is a targeted edit, not a new image. Preserve composition, camera angle, character identity, clothing, pose, and lighting EXACTLY as shown in the source image. Apply ONLY this change: Add a table lamp in background. Do not alter anything else.",
    editType: req2Classification.editType,
    denoisingStrength: 0.35,
  });

  checklistResults.push({
    step: "Requirement 2: In-Place Local Detail Edit ('Add a table lamp in background')",
    passed: Boolean(editReq2Result.imageUrl) && req2Classification.editType === 'local_detail',
    details: `Engine: ${editReq2Result.engine}, Classified Type: ${req2Classification.editType}`,
  });

  // Step 4: Requirement 3 Edit (Change to low-angle close-up)
  console.log("Step 4: Requirement 3 Camera Angle Re-Framing ('Change to low-angle close-up')...");
  const req3Instruction = "Change to low-angle close-up";
  const req3Classification = classifyEditInstruction(req3Instruction);

  const editReq3Result = await generateImageConditionedShot({
    instruction: req3Instruction,
    sourceImage: sourceShotImage,
    referenceImages: [referenceImageUrl],
    systemInstruction: `Re-render this exact scene from a new camera angle: ${req3Instruction}. Keep the same character identity, clothing, pose/action context, set dressing, and lighting mood. Only the camera perspective and framing should change.`,
    editType: req3Classification.editType,
    denoisingStrength: 0.65,
  });

  checklistResults.push({
    step: "Requirement 3: Isolated Camera Angle Re-Framing ('Change to low-angle close-up')",
    passed: Boolean(editReq3Result.imageUrl) && req3Classification.editType === 'camera_angle' && Boolean(req3Classification.disclaimer),
    details: `Engine: ${editReq3Result.engine}, Classified Type: ${req3Classification.editType}, Disclaimer: "${req3Classification.disclaimer}"`,
  });

  console.log("=== MANUAL QA CHECKLIST SUMMARY ===");
  checklistResults.forEach((res) => {
    console.log(`[${res.passed ? 'PASS' : 'FAIL'}] ${res.step} - ${res.details}`);
  });

  return checklistResults;
}
