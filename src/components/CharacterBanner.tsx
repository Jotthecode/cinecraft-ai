'use client';

import React from 'react';
import { CharacterAnchor } from '@/types/storyboard';
import { UserCheck, Sparkles, RefreshCw, Image as ImageIcon, CheckCircle2, Shield, Hash } from 'lucide-react';

interface CharacterBannerProps {
  characters: CharacterAnchor[];
  onGenerateCharacterReference?: (characterId: string) => void;
  generatingCharId?: string | null;
}

export const CharacterBanner: React.FC<CharacterBannerProps> = ({
  characters,
  onGenerateCharacterReference,
  generatingCharId,
}) => {
  const uniqueCharacters = React.useMemo(() => {
    if (!characters || !Array.isArray(characters)) return [];
    const seen = new Set<string>();
    return characters.filter((char) => {
      if (!char || !char.name) return false;
      const lower = char.name.toLowerCase().trim();
      if (
        lower.startsWith('shot') ||
        lower.startsWith('scene') ||
        lower.startsWith('int.') ||
        lower.startsWith('ext.') ||
        lower.startsWith('title')
      ) {
        return false;
      }
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }, [characters]);

  if (uniqueCharacters.length === 0) return null;

  return (
    <div className="w-full space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
            <UserCheck className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Dynamic Character Face Cards</h3>
            <p className="text-[11px] text-slate-400">
              Universal gender, facial identity & seed locking across all storyboard panels
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/20">
          <Shield className="h-3 w-3 text-emerald-400" />
          <span>Gender & Face Locked</span>
        </div>
      </div>

      {/* Character Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-1">
        {uniqueCharacters.map((char) => {
          const isGenerating = generatingCharId === char.id;

          return (
            <div
              key={char.id}
              className="relative flex flex-col justify-between space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 transition-all hover:border-slate-700"
            >
              <div className="flex items-start gap-3">
                {/* Reference Avatar Preview */}
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-md group">
                  {char.reference_image_url ? (
                    <>
                      <img
                        src={char.reference_image_url}
                        alt={char.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-1 right-1 rounded-full bg-emerald-500 p-0.5 text-slate-950 shadow">
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-1 text-center bg-gradient-to-br from-indigo-950/40 to-slate-900">
                      <ImageIcon className="h-5 w-5 text-slate-600 mb-0.5" />
                      <span className="text-[9px] text-slate-500 font-medium leading-tight">Face Card Anchor</span>
                    </div>
                  )}

                  {/* Regenerate Avatar Button */}
                  {onGenerateCharacterReference && (
                    <button
                      onClick={() => onGenerateCharacterReference(char.id)}
                      disabled={isGenerating}
                      title="Generate/Refresh Character Face Card Avatar"
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <RefreshCw className={`h-4 w-4 text-white ${isGenerating ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Profile Header */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-sm font-bold text-slate-100 truncate">{char.name}</h4>
                    <span className="shrink-0 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400 ring-1 ring-indigo-500/20">
                      {char.role}
                    </span>
                  </div>

                  {/* Badges: Gender, Age, Seed Lock */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {char.gender && (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/20">
                        {char.gender}
                      </span>
                    )}
                    {char.age && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 ring-1 ring-amber-500/20">
                        {char.age}
                      </span>
                    )}
                    {char.seed && (
                      <span className="flex items-center gap-0.5 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                        <Hash className="h-2.5 w-2.5" />
                        {char.seed}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual Anchor Detailed Description */}
              <div className="rounded-lg bg-slate-900/60 p-2.5 text-[11px] text-slate-300 leading-snug border border-slate-800/80">
                <strong className="text-slate-400 font-semibold block mb-0.5">Visual Identity Anchor:</strong>
                <p className="line-clamp-3">{char.visual_anchor}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
