'use client';

import React from 'react';
import {
  Film,
  Sparkles,
  CheckCircle2,
  Loader2,
  Clapperboard,
  Layers,
  Wand2,
} from 'lucide-react';

export type PipelineStatus = 'idle' | 'parsing' | 'generating_images' | 'precaching' | 'ready';

export interface PipelineProgress {
  status: PipelineStatus;
  currentStep: number; // 1: Parsing, 2: Extracting anchors, 3: Rendering frames, 4: Assembling
  completedShots: number;
  totalShots: number;
  currentAction?: string;
}

interface CinematicPipelineOverlayProps {
  progress: PipelineProgress;
}

export const CinematicPipelineOverlay: React.FC<CinematicPipelineOverlayProps> = ({ progress }) => {
  if (progress.status === 'idle' || progress.status === 'ready') {
    return null;
  }

  const { currentStep, completedShots, totalShots, currentAction } = progress;

  // Calculate percentage
  let percent = 10;
  if (currentStep === 1) {
    percent = 20;
  } else if (currentStep === 2) {
    percent = 35;
  } else if (currentStep === 3) {
    const shotRatio = totalShots > 0 ? completedShots / totalShots : 0;
    percent = Math.round(35 + shotRatio * 55); // 35% to 90%
  } else if (currentStep === 4) {
    percent = 95;
  }

  const steps = [
    {
      id: 1,
      label: 'Parsing script into scenes & shots',
      desc: 'Structuring narrative hierarchy & camera cues',
    },
    {
      id: 2,
      label: 'Extracting character anchors & seed locks',
      desc: 'Locking facial features, costume, and gender identity',
    },
    {
      id: 3,
      label: totalShots > 0 
        ? `Rendering storyboard frames (${completedShots}/${totalShots} panels)`
        : 'Rendering storyboard frames',
      desc: 'FLUX.1 multi-shot commercial image generation',
    },
    {
      id: 4,
      label: 'Pre-caching high-res images & assembling board',
      desc: 'Optimizing texture buffers for instant reveal',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 text-slate-100 transition-all duration-500">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Card Container */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl backdrop-blur-xl space-y-6">
        
        {/* Animated Header / Icon */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xl shadow-indigo-500/25">
            <Film className="h-8 w-8 text-white animate-pulse" />
            <Sparkles className="absolute -top-1.5 -right-1.5 h-5 w-5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center justify-center gap-2">
              <span>Directing your storyboard...</span>
            </h2>
            <p className="text-xs font-medium text-slate-400 mt-1">
              AI Commercial Director pipeline active
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-indigo-400 font-mono">STEP {currentStep} OF 4</span>
            <span className="text-slate-300 font-mono">{percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Step Checklist */}
        <div className="space-y-3 pt-2">
          {steps.map((step) => {
            const isDone = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 rounded-2xl p-3 transition-all duration-300 ${
                  isCurrent
                    ? 'bg-indigo-950/40 border border-indigo-500/30'
                    : isDone
                    ? 'bg-slate-950/40 opacity-80'
                    : 'opacity-40'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-slate-700 bg-slate-800" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p
                    className={`text-xs font-bold ${
                      isCurrent
                        ? 'text-indigo-200'
                        : isDone
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Panel Rendering Preview / Action Teaser */}
        {currentAction && (
          <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800/80 text-left">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Live Frame Rendering
            </p>
            <p className="text-xs text-indigo-200 font-sans italic line-clamp-2 mt-0.5">
              &quot;{currentAction}&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
