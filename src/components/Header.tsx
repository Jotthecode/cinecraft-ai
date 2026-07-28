'use client';

import React, { useState, useEffect } from 'react';
import { Film, Key, Tv } from 'lucide-react';
import { ApiKeys } from '@/types/storyboard';

interface HeaderProps {
  apiKeys: ApiKeys;
  onOpenApiKeyModal: () => void;
  onReset: () => void;
  onOpenPresentationMode?: () => void;
  hasStoryboardData: boolean;
  activeLlmMode?: string;
}

export const Header: React.FC<HeaderProps> = ({
  apiKeys,
  onOpenApiKeyModal,
  onReset,
  onOpenPresentationMode,
  hasStoryboardData,
  activeLlmMode,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasGeminiKey = Boolean(apiKeys.geminiApiKey);
  const hasCustomKeys = Boolean(
    apiKeys.geminiApiKey || apiKeys.openaiApiKey || apiKeys.falApiKey || apiKeys.replicateApiKey
  );

  const engineLabel = !mounted
    ? 'Pollinations FLUX (Zero-Key Standalone)'
    : activeLlmMode || (hasGeminiKey ? 'Gemini 2.0 Connected' : 'Pollinations FLUX (Zero-Key Standalone)');

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Film className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-lg font-bold tracking-tight text-transparent sm:text-xl">
                CineCraft AI
              </h1>
              <span className="rounded-full bg-gradient-to-r from-amber-500/20 to-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30">
                Pollinations FLUX + Gemini
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              Multi-Shot Character Identity Consistency & Natural Language Editing
            </p>
          </div>
        </div>

        {/* Engine Status Badges & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Engine State Badge */}
          <div className="hidden md:flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs border border-slate-800">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium" suppressHydrationWarning>
              {engineLabel}
            </span>
          </div>

          {hasStoryboardData && onOpenPresentationMode && (
            <button
              onClick={onOpenPresentationMode}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition-all hover:bg-slate-700 hover:text-white ring-1 ring-slate-700/50"
            >
              <Tv className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Pitch Mode</span>
            </button>
          )}

          {/* API Config Button */}
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-1 ${
              mounted && hasCustomKeys
                ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/30 hover:bg-indigo-500/20'
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">API Config</span>
            {mounted && hasCustomKeys ? (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ) : (
              <span className="rounded bg-indigo-500/20 px-1 py-0.2 text-[9px] text-indigo-300">Free Mode</span>
            )}
          </button>

          {hasStoryboardData && (
            <button
              onClick={onReset}
              className="rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-200"
            >
              New Script
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
