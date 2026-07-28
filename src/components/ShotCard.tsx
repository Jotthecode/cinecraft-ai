'use client';

import React, { useState, useEffect } from 'react';
import { Shot } from '@/types/storyboard';
import { generateSvgMockDataUrl } from '@/lib/imageEngine';
import {
  Wand2,
  Edit3,
  Maximize2,
  Download,
  Copy,
  Check,
  Camera,
  MessageSquareQuote,
  Loader2,
  AlertCircle,
  History,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface ShotCardProps {
  shot: Shot;
  onGenerateShot: (shotId: string) => void;
  onEditShot: (shot: Shot) => void;
  onZoomShot: (shot: Shot, title: string) => void;
}

export const ShotCard: React.FC<ShotCardProps> = ({
  shot,
  onGenerateShot,
  onEditShot,
  onZoomShot,
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [shot.image_url, shot.status]);

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shot.image_prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1500);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!shot.image_url) return;
    const a = document.createElement('a');
    a.href = shot.image_url;
    a.download = `Shot-${shot.shot_number}-${shot.shot_type.replace(/\s+/g, '_')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-slate-700 hover:shadow-2xl">
      {/* Top Shot Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600/20 text-xs font-bold text-indigo-400 ring-1 ring-indigo-500/30">
            #{shot.shot_number}
          </span>
          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">
            {shot.shot_type}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-amber-300">
            <Camera className="h-3 w-3 text-amber-400" />
            {shot.camera_angle}
          </span>
          {shot.consistencyWarning && (
            <span
              className="flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/20"
              title={shot.consistencyWarning}
            >
              <AlertCircle className="h-2.5 w-2.5 text-amber-400" />
              Fallback Text-Mode
            </span>
          )}
          {shot.edit_history && shot.edit_history.length > 0 && (
            <span className="flex items-center gap-1 rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300 ring-1 ring-purple-500/20">
              <History className="h-2.5 w-2.5" />
              Edited ({shot.edit_history.length})
            </span>
          )}
        </div>
      </div>

      {/* Image Container with Loading Skeleton */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        {shot.status === 'editing' ? (
          <div className="relative flex h-full w-full flex-col items-center justify-center space-y-3 bg-slate-900 p-4 text-center overflow-hidden">
            {/* Shimmer pulse backdrop */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 animate-pulse" />
            
            <div className="relative z-10 flex flex-col items-center space-y-2">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/10">
                <Wand2 className="h-5 w-5 animate-spin text-amber-400" />
                <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-purple-400 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100 tracking-wide">
                  Applying Delta Edit to Shot #{shot.shot_number}
                </p>
                <p className="text-[10px] font-mono text-amber-300 animate-pulse mt-0.5">
                  Img2Img Non-Destructive Synthesis...
                </p>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] text-slate-400 font-medium">Preserving character face lock & background</span>
              </div>
            </div>
          </div>
        ) : shot.status === 'generating' ? (
          <div className="relative flex h-full w-full flex-col items-center justify-center space-y-3 bg-slate-900 p-4 text-center overflow-hidden">
            {/* Shimmer pulse backdrop */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 animate-pulse" />
            
            <div className="relative z-10 flex flex-col items-center space-y-2">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100 tracking-wide">
                  Rendering Shot #{shot.shot_number}
                </p>
                <p className="text-[10px] font-mono text-indigo-300 animate-pulse mt-0.5">
                  FLUX.1 Commercial Engine...
                </p>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] text-slate-400 font-medium">Applying visual anchor & framing</span>
              </div>
            </div>
          </div>
        ) : shot.status === 'error' || imageError || !shot.image_url ? (
          /* Failed or dropped image inline overlay */
          <div className="flex h-full w-full flex-col items-center justify-center space-y-2.5 p-4 text-center bg-slate-950/90 backdrop-blur-xs">
            <AlertCircle className="h-7 w-7 text-amber-400 animate-pulse" />
            <p className="text-xs font-medium text-slate-300">
              {shot.error_message || 'Image dropped or failed to load'}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageError(false);
                onGenerateShot(shot.shot_id);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg transition-all hover:bg-indigo-500 hover:scale-105 active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry Render</span>
            </button>
          </div>
        ) : (
          <>
            <img
              src={shot.image_url}
              alt={`Shot ${shot.shot_number}`}
              onError={() => setImageError(true)}
              onClick={() => onZoomShot(shot, `Shot #${shot.shot_number} - ${shot.shot_type}`)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
            />
            {/* Hover Action Overlay */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/60 opacity-0 backdrop-blur-xs transition-opacity duration-300 group-hover:opacity-100">
              <button
                onClick={() => onZoomShot(shot, `Shot #${shot.shot_number} - ${shot.shot_type}`)}
                className="flex items-center gap-1 rounded-xl bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-slate-700"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Zoom</span>
              </button>
              <button
                onClick={() => onEditShot(shot)}
                className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500"
              >
                <Edit3 className="h-3.5 w-3.5 text-amber-300" />
                <span>Edit Shot</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageError(false);
                  onGenerateShot(shot.shot_id);
                }}
                className="flex items-center gap-1 rounded-xl bg-indigo-600/90 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500"
                title="Retry Render this panel"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retry Render</span>
              </button>
              <button
                onClick={handleDownload}
                className="rounded-xl bg-slate-800/90 p-2 text-slate-200 shadow-md hover:bg-slate-700"
                title="Download High-Res Image"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Action Description & Dialogue Section */}
      <div className="flex-1 space-y-3 p-4">
        <p className="text-xs text-slate-200 leading-relaxed font-sans">
          <strong className="text-slate-400 font-semibold">Action: </strong>
          {String(shot.action || '')
            .replace(/^-\s*Shot\s*\d+.*?:/i, '')
            .replace(/^-\s*SHOT\s*\d+\s*(?:\([^)]*\))?:?\s*/i, '')
            .replace(/^SHOT\s*\d+\s*(?:\([^)]*\))?:?\s*/i, '')
            .replace(/^-\s*/, '')
            .trim()}
        </p>

        {shot.dialogue && (
          <div className="flex items-start gap-2 rounded-xl bg-slate-950/60 p-2.5 ring-1 ring-slate-800">
            <MessageSquareQuote className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs font-medium italic text-amber-200/90 leading-snug">
              &quot;{shot.dialogue}&quot;
            </p>
          </div>
        )}

        {/* Collapsible Prompt Toggle */}
        <div className="pt-1">
          <button
            onClick={() => setShowPromptDetails(!showPromptDetails)}
            className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-400 hover:text-slate-200"
          >
            <span>{showPromptDetails ? 'Hide Prompt' : 'View Synthesized FLUX Prompt'}</span>
            <span className="text-[10px]">{showPromptDetails ? '▲' : '▼'}</span>
          </button>

          {showPromptDetails && (
            <div className="mt-2 relative rounded-xl bg-slate-950 p-2.5 text-[11px] font-mono text-slate-300 border border-slate-800 leading-relaxed">
              {shot.image_prompt}
              <button
                onClick={handleCopyPrompt}
                className="absolute top-2 right-2 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                title="Copy Prompt"
              >
                {copiedPrompt ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      {shot.image_url && (
        <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/40 px-4 py-2">
          <button
            onClick={() => onEditShot(shot)}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            <Edit3 className="h-3 w-3" />
            <span>Edit Shot with Natural Language</span>
          </button>
          <button
            onClick={() => {
              setImageError(false);
              onGenerateShot(shot.shot_id);
            }}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Retry Render</span>
          </button>
        </div>
      )}
    </div>
  );
};
