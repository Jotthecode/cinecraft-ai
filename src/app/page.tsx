'use client';

import React, { useState, useEffect } from 'react';
import { StoryboardData, Shot, ApiKeys } from '@/types/storyboard';
import { Header } from '@/components/Header';
import { ScriptInput } from '@/components/ScriptInput';
import { StoryboardGrid } from '@/components/StoryboardGrid';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { EditShotModal } from '@/components/EditShotModal';
import { PresentationMode } from '@/components/PresentationMode';
import { LightboxModal } from '@/components/LightboxModal';
import { CinematicPipelineOverlay, PipelineProgress } from '@/components/CinematicPipelineOverlay';
import { generateSvgMockDataUrl } from '@/lib/imageEngine';
import confetti from 'canvas-confetti';

// Helper function to force real image asset loading before revealing UI
async function prefetchAndValidateImages(imageUrls: string[]): Promise<void> {
  const imagePromises = imageUrls.map((url) => {
    return new Promise<void>((resolve) => {
      if (!url) {
        resolve();
        return;
      }
      const img = new Image();
      img.src = url;

      // Resolve ONLY when image is fully loaded into browser cache
      img.onload = () => resolve();

      // Handle network error / rate-limit gracefully
      img.onerror = () => {
        console.warn("Failed to load image asset:", url);
        resolve(); // Continue pipeline without blocking app indefinitely
      };
    });
  });

  await Promise.all(imagePromises);
}

export default function Home() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    geminiApiKey: '',
    openaiApiKey: '',
    falApiKey: '',
    replicateApiKey: '',
    preferredModel: 'pollinations-flux',
  });

  const [storyboardData, setStoryboardData] = useState<StoryboardData | null>(null);
  const [activeLlmMode, setActiveLlmMode] = useState<string | undefined>(undefined);
  const [isParsing, setIsParsing] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // Global Pipeline Overlay Progress State
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress>({
    status: 'idle',
    currentStep: 1,
    completedShots: 0,
    totalShots: 0,
  });

  // Modals state
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    url: string | null;
    title: string;
    shot?: Shot | null;
    sceneNumber?: number;
  }>({
    isOpen: false,
    url: null,
    title: '',
    shot: null,
  });

  // Load saved API keys & active storyboard from localStorage on mount
  useEffect(() => {
    try {
      const savedKeys = localStorage.getItem('cinecraft_api_keys');
      if (savedKeys) {
        setApiKeys(JSON.parse(savedKeys));
      }
      const savedStoryboard = localStorage.getItem('cinecraft_active_storyboard');
      if (savedStoryboard) {
        const parsed = JSON.parse(savedStoryboard);
        if (parsed && parsed.scenes && parsed.scenes.length > 0) {
          setStoryboardData(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not load saved data from localStorage:", e);
    }
  }, []);

  // Sync active storyboard state to localStorage on updates
  useEffect(() => {
    if (storyboardData) {
      try {
        localStorage.setItem('cinecraft_active_storyboard', JSON.stringify(storyboardData));
      } catch (e) {
        console.warn("Could not save active storyboard to localStorage:", e);
      }
    }
  }, [storyboardData]);

  // Reset / Clear active storyboard
  const handleResetStoryboard = () => {
    setStoryboardData(null);
    setPipelineProgress({
      status: 'idle',
      currentStep: 1,
      completedShots: 0,
      totalShots: 0,
    });
    try {
      localStorage.removeItem('cinecraft_active_storyboard');
    } catch (e) {
      console.warn("Could not clear active storyboard from localStorage:", e);
    }
  };

  const handleSaveApiKeys = (keys: ApiKeys) => {
    setApiKeys(keys);
    try {
      localStorage.setItem('cinecraft_api_keys', JSON.stringify(keys));
    } catch (e) {
      console.warn("Could not save API keys to localStorage:", e);
    }
  };

// Sequential queue helper in page.tsx
async function generateAllShotsSequentially(
  shotsList: { shot: Shot; sceneLocation: string }[],
  payloadConfig: {
    visualAnchor?: string;
    gender?: string;
    seed?: number;
    characterReferenceImage?: string;
    preferredModel?: string;
    falApiKey?: string;
    replicateApiKey?: string;
    mainChar?: any;
    onShotProgress?: (completedCount: number, currentAction?: string) => void;
  }
) {
  const results = [];
  const allGeneratedUrls: string[] = [];
  let completedCount = 0;

  for (const item of shotsList) {
    const shot = item.shot;
    const promptToUse = shot.image_prompt || (shot as any).prompt || shot.action;
    const seedToUse = (shot as any).seed || payloadConfig.seed || 489201;

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          visualAnchor: payloadConfig.visualAnchor,
          gender: payloadConfig.gender,
          location: item.sceneLocation,
          cameraAngle: shot.camera_angle,
          shotType: shot.shot_type,
          action: shot.action,
          characterReferenceImage: payloadConfig.characterReferenceImage,
          seed: seedToUse,
          modelChoice: payloadConfig.preferredModel,
          falApiKey: payloadConfig.falApiKey,
          replicateApiKey: payloadConfig.replicateApiKey,
        }),
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        shot.image_url = data.imageUrl;
        shot.original_image_url = shot.original_image_url || data.imageUrl;
        shot.status = 'completed';
        allGeneratedUrls.push(data.imageUrl);

        if (payloadConfig.mainChar && !payloadConfig.mainChar.reference_image_url) {
          payloadConfig.mainChar.reference_image_url = data.imageUrl;
        }

        results.push({ ...shot, imageUrl: data.imageUrl });
      } else {
        console.error(`Error rendering shot ${shot.shot_id}`, data.error);
        const fallbackUrl = generateSvgMockDataUrl(
          shot.action || promptToUse,
          payloadConfig.visualAnchor,
          payloadConfig.gender,
          shot.camera_angle
        );
        shot.image_url = fallbackUrl;
        shot.original_image_url = shot.original_image_url || fallbackUrl;
        shot.status = 'completed';
        allGeneratedUrls.push(fallbackUrl);

        results.push({ ...shot, imageUrl: null });
      }
    } catch (e) {
      console.error(`Error rendering shot ${shot.shot_id}`, e);
      const fallbackUrl = generateSvgMockDataUrl(
        shot.action || promptToUse,
        payloadConfig.visualAnchor,
        payloadConfig.gender,
        shot.camera_angle
      );
      shot.image_url = fallbackUrl;
      shot.original_image_url = shot.original_image_url || fallbackUrl;
      shot.status = 'completed';
      allGeneratedUrls.push(fallbackUrl);

      results.push({ ...shot, imageUrl: null });
    } finally {
      completedCount++;
      if (payloadConfig.onShotProgress) {
        payloadConfig.onShotProgress(completedCount, shot.action);
      }
    }

    // 400ms delay between image fetches
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return { results, allGeneratedUrls };
}

// Master Global Pipeline Execution Function
const runFullPipelineGeneration = async (targetStoryboard: StoryboardData) => {
  setIsGeneratingAll(true);

  const mainChar = targetStoryboard.characters[0];
  const visualAnchor = mainChar ? mainChar.visual_anchor : undefined;
  const gender = mainChar ? mainChar.gender : undefined;
  const characterReferenceImage = mainChar ? mainChar.reference_image_url : undefined;
  const seed = mainChar ? mainChar.seed : 489201;

  const allShots: { shot: Shot; sceneLocation: string }[] = [];
  targetStoryboard.scenes.forEach((sc) => {
    sc.shots.forEach((s) => {
      allShots.push({ shot: s, sceneLocation: sc.location });
    });
  });

  const totalShots = allShots.length;

  // Step 3: Rendering storyboard frames
  setPipelineProgress({
    status: 'generating_images',
    currentStep: 3,
    completedShots: 0,
    totalShots,
    currentAction: allShots[0]?.shot.action,
  });

  // Process image generation sequentially with a 400ms delay between requests
  const { allGeneratedUrls } = await generateAllShotsSequentially(allShots, {
    visualAnchor,
    gender,
    seed,
    characterReferenceImage,
    preferredModel: apiKeys.preferredModel,
    falApiKey: apiKeys.falApiKey,
    replicateApiKey: apiKeys.replicateApiKey,
    mainChar,
    onShotProgress: (completedCount, currentAction) => {
      setPipelineProgress((prev) => ({
        ...prev,
        status: 'generating_images',
        currentStep: 3,
        completedShots: completedCount,
        totalShots,
        currentAction,
      }));
    },
  });

  // Step 4: Pre-caching high-res images & assembling board (Zero Blinking Images)
  setPipelineProgress({
    status: 'precaching',
    currentStep: 4,
    completedShots: totalShots,
    totalShots,
  });

  // FORCE REAL IMAGE ASSET DOWNLOADING BEFORE DISMISSING OVERLAY
  await prefetchAndValidateImages(allGeneratedUrls);

  // Pre-caching complete! Set active storyboard state and reveal board at once
  setStoryboardData({ ...targetStoryboard });
  setPipelineProgress({
    status: 'ready',
    currentStep: 4,
    completedShots: totalShots,
    totalShots,
  });

  setIsGeneratingAll(false);
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
};

  // 1. Parse Script using LLM / Universal Fallback & Trigger Full Pipeline
  const handleParseScript = async (scriptText: string) => {
    setIsParsing(true);
    setPipelineProgress({
      status: 'parsing',
      currentStep: 1, // Step 1: Parsing script into scenes & shots
      completedShots: 0,
      totalShots: 0,
    });

    try {
      const res = await fetch('/api/parse-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptText,
          geminiApiKey: apiKeys.geminiApiKey,
          customApiKey: apiKeys.openaiApiKey,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to parse script.');
      }

      const parsedStoryboard = data.data as StoryboardData;

      // Step 2: Extracting character anchors & seed locks
      setPipelineProgress({
        status: 'parsing',
        currentStep: 2,
        completedShots: 0,
        totalShots: 0,
      });

      if (data.modeUsed) {
        setActiveLlmMode(data.modeUsed);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Run full image generation & pre-caching pipeline before revealing board
      await runFullPipelineGeneration(parsedStoryboard);
    } catch (err: any) {
      console.error("Parse script error:", err);
      alert(err.message || 'Error occurred while parsing script.');
      setPipelineProgress({
        status: 'idle',
        currentStep: 1,
        completedShots: 0,
        totalShots: 0,
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Helper to update shot status in state
  const updateShotInState = (shotId: string, updates: Partial<Shot>) => {
    setStoryboardData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        scenes: prev.scenes.map((scene) => ({
          ...scene,
          shots: scene.shots.map((shot) =>
            shot.shot_id === shotId ? { ...shot, ...updates } : shot
          ),
        })),
      };
    });
  };

  // Helper to update character reference image URL in state
  const updateCharacterReferenceImage = (charId: string, imageUrl: string) => {
    setStoryboardData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        characters: prev.characters.map((char) =>
          char.id === charId || char.name.toLowerCase() === charId.toLowerCase()
            ? { ...char, reference_image_url: imageUrl }
            : char
        ),
      };
    });
  };

  // 2. Generate Single Shot Image (for Manual Retry/Edit)
  const handleGenerateShot = async (targetShotId: string): Promise<string | null> => {
    if (!storyboardData) return null;

    let targetShot: Shot | undefined;
    let targetSceneLocation = '';

    for (const sc of storyboardData.scenes) {
      const found = sc.shots.find((s) => s.shot_id === targetShotId);
      if (found) {
        targetShot = found;
        targetSceneLocation = sc.location;
        break;
      }
    }

    if (!targetShot) return null;

    const mainChar = storyboardData.characters[0];
    const visualAnchor = mainChar ? mainChar.visual_anchor : undefined;
    const gender = mainChar ? mainChar.gender : undefined;
    const characterReferenceImage = mainChar ? mainChar.reference_image_url : undefined;
    const seed = mainChar ? mainChar.seed : 489201;

    updateShotInState(targetShotId, { status: 'generating', error_message: undefined });

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: targetShot.image_prompt,
          visualAnchor,
          gender,
          location: targetSceneLocation,
          cameraAngle: targetShot.camera_angle,
          shotType: targetShot.shot_type,
          action: targetShot.action,
          characterReferenceImage,
          seed,
          modelChoice: apiKeys.preferredModel,
          falApiKey: apiKeys.falApiKey,
          replicateApiKey: apiKeys.replicateApiKey,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.imageUrl) {
        throw new Error(data.error || 'Image generation failed.');
      }

      const imageUrl = data.imageUrl;
      updateShotInState(targetShotId, {
        status: 'completed',
        image_url: imageUrl,
        original_image_url: targetShot.original_image_url || imageUrl,
      });

      if (mainChar && !mainChar.reference_image_url) {
        updateCharacterReferenceImage(mainChar.id, imageUrl);
      }

      return imageUrl;
    } catch (err: any) {
      console.error(`Generate shot ${targetShotId} error:`, err);
      updateShotInState(targetShotId, {
        status: 'error',
        error_message: err.message || 'Generation failed',
      });
      return null;
    }
  };

  // 3. Batch Generate All Shots Concurrently with Full Overlay
  const handleGenerateAllShots = async (customStoryboard?: StoryboardData) => {
    const targetStoryboard = customStoryboard || storyboardData;
    if (!targetStoryboard || isGeneratingAll) return;
    await runFullPipelineGeneration(targetStoryboard);
  };

  // 4. Generate/Refresh Character Reference Avatar
  const handleGenerateCharacterReference = async (charId: string) => {
    if (!storyboardData) return;
    const char = storyboardData.characters.find((c) => c.id === charId);
    if (!char) return;

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: char.reference_prompt || char.visual_anchor,
          visualAnchor: char.visual_anchor,
          gender: char.gender,
          seed: char.seed,
          modelChoice: apiKeys.preferredModel,
          falApiKey: apiKeys.falApiKey,
          replicateApiKey: apiKeys.replicateApiKey,
        }),
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        updateCharacterReferenceImage(charId, data.imageUrl);
      }
    } catch (e) {
      console.error("Character reference generation error:", e);
    }
  };

  // 5. Apply Natural Language Edit to a Shot
  const handleApplyEdit = (
    shotId: string,
    newImageUrl: string,
    newPrompt: string,
    editInstruction: string
  ) => {
    setStoryboardData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        scenes: prev.scenes.map((sc) => ({
          ...sc,
          shots: sc.shots.map((s) => {
            if (s.shot_id === shotId) {
              const currentHistory = s.edit_history || [];
              return {
                ...s,
                image_url: newImageUrl,
                image_prompt: newPrompt,
                edit_history: [
                  ...currentHistory,
                  {
                    timestamp: new Date().toISOString(),
                    edit_instruction: editInstruction,
                    previous_prompt: s.image_prompt,
                    new_prompt: newPrompt,
                    previous_image_url: s.image_url || '',
                    new_image_url: newImageUrl,
                  },
                ],
              };
            }
            return s;
          }),
        })),
      };
    });
  };

  const mainChar = storyboardData?.characters[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Cinematic Full-Screen Pipeline Overlay */}
      <CinematicPipelineOverlay progress={pipelineProgress} />

      {/* Top Header */}
      <Header
        apiKeys={apiKeys}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onReset={handleResetStoryboard}
        onOpenPresentationMode={() => setIsPresentationOpen(true)}
        hasStoryboardData={Boolean(storyboardData)}
        activeLlmMode={activeLlmMode}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!storyboardData ? (
          <ScriptInput onParseScript={handleParseScript} isLoading={isParsing} />
        ) : (
          <StoryboardGrid
            storyboard={storyboardData}
            onGenerateShot={handleGenerateShot}
            onGenerateAllShots={handleGenerateAllShots}
            onEditShot={(shot) => setEditingShot(shot)}
            onZoomShot={(shot, title, sceneNumber) =>
              setLightboxData({
                isOpen: true,
                url: shot.image_url || null,
                title,
                shot,
                sceneNumber,
              })
            }
            onOpenPresentationMode={() => setIsPresentationOpen(true)}
            onGenerateCharacterReference={handleGenerateCharacterReference}
            isGeneratingAll={isGeneratingAll}
          />
        )}
      </main>

      {/* API Keys Settings Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKeys={apiKeys}
        onSaveApiKeys={handleSaveApiKeys}
      />

      {/* Edit Shot Modal */}
      <EditShotModal
        isOpen={Boolean(editingShot)}
        shot={editingShot}
        visualAnchor={mainChar?.visual_anchor}
        gender={mainChar?.gender}
        characterReferenceImage={mainChar?.reference_image_url}
        seed={mainChar?.seed}
        onClose={() => setEditingShot(null)}
        onApplyEdit={handleApplyEdit}
        geminiApiKey={apiKeys.geminiApiKey}
        openaiApiKey={apiKeys.openaiApiKey}
        falApiKey={apiKeys.falApiKey}
        replicateApiKey={apiKeys.replicateApiKey}
        preferredModel={apiKeys.preferredModel}
      />

      {/* Presentation Mode Modal */}
      <PresentationMode
        isOpen={isPresentationOpen}
        storyboard={storyboardData}
        onClose={() => setIsPresentationOpen(false)}
      />

      {/* Image Lightbox Modal */}
      <LightboxModal
        isOpen={lightboxData.isOpen}
        imageUrl={lightboxData.url}
        title={lightboxData.title}
        shot={lightboxData.shot}
        sceneNumber={lightboxData.sceneNumber}
        onClose={() => setLightboxData({ isOpen: false, url: null, title: '', shot: null })}
      />
    </div>
  );
}
