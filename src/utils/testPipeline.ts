import fs from 'fs';
import path from 'path';
import { generateImageConditionedShot, classifyEditInstruction } from '@/lib/imageEdit';

function loadEnvLocal() {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envConfig = fs.readFileSync(envLocalPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const val = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (key && val && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    });
  }
}

loadEnvLocal();

export interface TestChecklistItem {
  step: string;
  passed: boolean;
  details: string;
}

/**
 * Manual QA Checklist Script for AI Storyboard Image Pipeline
 * Strictly validates Requirements 1, 2, and 3:
 * - Requirement 1: Character Face Card & Image-Conditioned Shot Renders (MUST use a real provider and reference image conditioning)
 * - Requirement 2: In-Place Local Detail Edit ('Add a table lamp in background')
 * - Requirement 3: Isolated Camera Angle Re-Framing ('Change to low-angle close-up')
 */
export async function runImagePipelineManualTest(): Promise<{ results: TestChecklistItem[]; overallPassed: boolean }> {
  console.log("=== STARTING QA CHECKLIST MANUAL TEST SUITE ===");
  console.log("Loaded GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 10)}...` : "NOT FOUND");
  const checklistResults: TestChecklistItem[] = [];

  // Step 1: Character Face Card Generation & Storage
  console.log("\n--- Step 1: Generating Character Face Card (Jackie Shroff) ---");
  const faceCardResult = await generateImageConditionedShot({
    instruction: "Face Card: Jackie Shroff, iconic 60s Bollywood superstar with dark aviator sunglasses, brown vintage leather jacket, silk neck bandana, highly detailed photorealistic portrait.",
  });

  const referenceImageUrl = faceCardResult.imageUrl;
  const isMock1 = faceCardResult.engine.includes("SVG Canvas Storyboard Mock Renderer");
  const step1Passed = Boolean(referenceImageUrl) && !isMock1;

  checklistResults.push({
    step: "Requirement 1: Face Card Generation & Canonical Identity Store",
    passed: step1Passed,
    details: isMock1
      ? "FAILED: Fell through to SVG Canvas Storyboard Mock Renderer (No real image provider succeeded)"
      : `Engine: ${faceCardResult.engine}, Reference Image Stored: YES`,
  });

  // Step 2: Generate 3 Shots using Image Conditioning with Character Reference
  const shotPrompts = [
    "Shot 1 (Establishing Shot): Jackie Shroff sitting on a director's folding chair at a Mumbai film set under golden sunset light.",
    "Shot 2 (Medium Close-Up): Same person, Jackie Shroff dunking a rectangular golden biscuit into hot cutting chai on a wooden table.",
    "Shot 3 (Close-Up Reaction): Same person, Jackie Shroff taking off his aviator sunglasses and winking with a warm smile.",
  ];

  const generatedShots: string[] = [];

  for (let i = 0; i < shotPrompts.length; i++) {
    console.log(`\n--- Step 2.${i + 1}: Rendering Shot ${i + 1} with image conditioning ---`);
    const shotResult = await generateImageConditionedShot({
      instruction: shotPrompts[i],
      referenceImages: [referenceImageUrl],
    });
    generatedShots.push(shotResult.imageUrl);

    const isMockShot = shotResult.engine.includes("SVG Canvas Storyboard Mock Renderer");
    const isConditioned = shotResult.hasReferenceImage === true;
    const shotPassed = Boolean(shotResult.imageUrl) && isConditioned && !isMockShot;

    let failureDetail = "";
    if (isMockShot) {
      failureDetail = "FAILED: Fell through to SVG Canvas Storyboard Mock Renderer";
    } else if (!isConditioned) {
      failureDetail = "FAILED: Shot render was NOT conditioned on Face Card Reference Image";
    }

    checklistResults.push({
      step: `Requirement 1: Image-Conditioned Shot ${i + 1} Render`,
      passed: shotPassed,
      details: shotPassed
        ? `Engine: ${shotResult.engine}, Conditioned on Face Card Reference: YES`
        : failureDetail,
    });
  }

  // Step 3: Requirement 2 Edit (Add a table lamp in background)
  console.log("\n--- Step 3: Requirement 2 In-Place Edit ('Add a table lamp in background') ---");
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

  const isMockEdit2 = editReq2Result.engine.includes("SVG Canvas Storyboard Mock Renderer");
  const req2Passed = Boolean(editReq2Result.imageUrl) && req2Classification.editType === 'local_detail' && !isMockEdit2;

  checklistResults.push({
    step: "Requirement 2: In-Place Local Detail Edit ('Add a table lamp in background')",
    passed: req2Passed,
    details: isMockEdit2
      ? "FAILED: Fell through to SVG Canvas Storyboard Mock Renderer"
      : `Engine: ${editReq2Result.engine}, Classified Type: ${req2Classification.editType}`,
  });

  // Step 4: Requirement 3 Edit (Change to low-angle close-up)
  console.log("\n--- Step 4: Requirement 3 Camera Angle Re-Framing ('Change to low-angle close-up') ---");
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

  const isMockEdit3 = editReq3Result.engine.includes("SVG Canvas Storyboard Mock Renderer");
  const req3Passed = Boolean(editReq3Result.imageUrl) && req3Classification.editType === 'camera_angle' && Boolean(req3Classification.disclaimer) && !isMockEdit3;

  checklistResults.push({
    step: "Requirement 3: Isolated Camera Angle Re-Framing ('Change to low-angle close-up')",
    passed: req3Passed,
    details: isMockEdit3
      ? "FAILED: Fell through to SVG Canvas Storyboard Mock Renderer"
      : `Engine: ${editReq3Result.engine}, Classified Type: ${req3Classification.editType}, Disclaimer: "${req3Classification.disclaimer}"`,
  });

  const overallPassed = checklistResults.every((r) => r.passed);

  console.log("\n=== MANUAL QA CHECKLIST SUMMARY ===");
  checklistResults.forEach((res) => {
    console.log(`[${res.passed ? 'PASS' : 'FAIL'}] ${res.step} - ${res.details}`);
  });

  console.log(`\nOVERALL SUITE RESULT: ${overallPassed ? 'PASS' : 'FAIL'}`);

  return { results: checklistResults, overallPassed };
}
