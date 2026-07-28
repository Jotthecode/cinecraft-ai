'use client';

import React from 'react';
import { StoryboardData, Shot, CharacterAnchor } from '@/types/storyboard';
import { ShotCard } from './ShotCard';
import { CharacterBanner } from './CharacterBanner';
import {
  Wand2,
  Film,
  Clapperboard,
  Download,
  Loader2,
  Tv,
  FileJson,
  Sparkles,
} from 'lucide-react';

interface StoryboardGridProps {
  storyboard: StoryboardData;
  onGenerateShot: (shotId: string) => void;
  onGenerateAllShots: () => void;
  onEditShot: (shot: Shot) => void;
  onZoomShot: (shot: Shot, title: string, sceneNumber?: number) => void;
  onOpenPresentationMode: () => void;
  onGenerateCharacterReference?: (characterId: string) => void;
  isGeneratingAll: boolean;
  generatingCharId?: string | null;
}

export const StoryboardGrid: React.FC<StoryboardGridProps> = ({
  storyboard,
  onGenerateShot,
  onGenerateAllShots,
  onEditShot,
  onZoomShot,
  onOpenPresentationMode,
  onGenerateCharacterReference,
  isGeneratingAll,
  generatingCharId,
}) => {
  const totalShots = storyboard.scenes.reduce((acc, scene) => acc + scene.shots.length, 0);
  const completedShots = storyboard.scenes.reduce(
    (acc, scene) => acc + scene.shots.filter((s) => s.status === 'completed' && s.image_url).length,
    0
  );

  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(storyboard, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `${storyboard.title.replace(/\s+/g, '_')}_Storyboard.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Storyboard Metadata Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 ring-1 ring-indigo-500/20">
              {storyboard.genre}
            </span>
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">{storyboard.title}</h2>
          </div>
          <p className="text-xs text-slate-400">
            {storyboard.scenes.length} Scenes • {totalShots} Camera Shots • {completedShots}/{totalShots} Rendered
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={onGenerateAllShots}
            disabled={isGeneratingAll}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Batch Generating All Shots...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 text-amber-300" />
                <span>Generate All Storyboard Panels</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenPresentationMode}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700 hover:text-white border border-slate-700/60"
          >
            <Tv className="h-4 w-4 text-indigo-400" />
            <span>Pitch Mode</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 px-3.5 py-2.5 text-xs font-semibold text-slate-300 transition-all hover:bg-slate-700 hover:text-white border border-slate-700/60"
            title="Export Storyboard JSON"
          >
            <FileJson className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 px-3.5 py-2.5 text-xs font-semibold text-slate-300 transition-all hover:bg-slate-700 hover:text-white border border-slate-700/60"
            title="Print / Save PDF Storyboard"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Character Identity Banner */}
      <CharacterBanner
        characters={storyboard.characters}
        onGenerateCharacterReference={onGenerateCharacterReference}
        generatingCharId={generatingCharId}
      />

      {/* Scenes & Shots Breakdown */}
      <div className="space-y-10">
        {storyboard.scenes.map((scene) => (
          <div key={scene.scene_id} className="space-y-4">
            {/* Scene Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-xs font-extrabold text-white shadow-md">
                  S{scene.scene_number}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">{scene.title}</h3>
                  <p className="text-xs font-mono text-amber-400">
                    {(() => {
                      const setting = scene.setting || (scene.location.toUpperCase().includes('INT.') ? 'INT.' : 'EXT.');
                      const timeOfDay = scene.time_of_day || (scene.location.toUpperCase().includes('NIGHT') ? 'NIGHT' : 'DAY');
                      let locClean = scene.location
                        .replace(/^(INT\.|EXT\.|INT\/EXT\.)\s*/i, '')
                        .replace(/\s*-\s*(DAY|NIGHT|SUNSET|DAWN|GOLDEN HOUR|CONTINUOUS)$/i, '')
                        .trim();
                      if (!locClean) locClean = 'LOCATION';
                      return `${setting} ${locClean} - ${timeOfDay}`;
                    })()}
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {scene.shots.length} Shots
              </span>
            </div>

            {/* Shots Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {scene.shots.map((shot) => (
                <ShotCard
                  key={shot.shot_id}
                  shot={shot}
                  onGenerateShot={onGenerateShot}
                  onEditShot={onEditShot}
                  onZoomShot={(s, title) => onZoomShot(s, title, scene.scene_number)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
