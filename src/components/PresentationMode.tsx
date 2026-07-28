'use client';

import React, { useState, useEffect } from 'react';
import { StoryboardData, Shot } from '@/types/storyboard';
import { X, ChevronLeft, ChevronRight, Play, Pause, Camera, MessageSquareQuote } from 'lucide-react';

interface PresentationModeProps {
  isOpen: boolean;
  storyboard: StoryboardData | null;
  onClose: () => void;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  isOpen,
  storyboard,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Flatten all shots across scenes with scene metadata attached
  const allShotsWithScene: Array<{ shot: Shot; sceneTitle: string; location: string; sceneNumber: number }> = [];

  if (storyboard) {
    storyboard.scenes.forEach((scene) => {
      scene.shots.forEach((shot) => {
        allShotsWithScene.push({
          shot,
          sceneTitle: scene.title,
          location: scene.location,
          sceneNumber: scene.scene_number,
        });
      });
    });
  }

  const currentItem = allShotsWithScene[currentIndex];

  useEffect(() => {
    let timer: any;
    if (isPlaying && allShotsWithScene.length > 0) {
      timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % allShotsWithScene.length);
      }, 5000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, allShotsWithScene.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        setCurrentIndex((prev) => (prev + 1) % allShotsWithScene.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => (prev - 1 + allShotsWithScene.length) % allShotsWithScene.length);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allShotsWithScene.length, onClose]);

  if (!isOpen || !storyboard || allShotsWithScene.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-fadeIn select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur-md">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-white">{storyboard.title}</h2>
          <p className="text-xs text-amber-400 font-medium">
            Scene {currentItem.sceneNumber}: {currentItem.sceneTitle} — {currentItem.location}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isPlaying ? 'Pause Auto Pitch' : 'Auto Pitch'}</span>
          </button>

          <span className="text-xs text-slate-400">
            Shot {currentIndex + 1} of {allShotsWithScene.length}
          </span>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Pitch Viewport */}
      <div className="relative flex-1 flex items-center justify-center p-6 overflow-hidden">
        {/* Navigation Buttons */}
        <button
          onClick={() =>
            setCurrentIndex((prev) => (prev - 1 + allShotsWithScene.length) % allShotsWithScene.length)
          }
          className="absolute left-6 z-10 rounded-full bg-slate-900/80 p-3 text-slate-300 hover:bg-indigo-600 hover:text-white backdrop-blur-md border border-slate-700 transition-all"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % allShotsWithScene.length)}
          className="absolute right-6 z-10 rounded-full bg-slate-900/80 p-3 text-slate-300 hover:bg-indigo-600 hover:text-white backdrop-blur-md border border-slate-700 transition-all"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Display Panel */}
        <div className="w-full max-w-5xl space-y-4 text-center">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            {currentItem.shot.image_url ? (
              <img
                src={currentItem.shot.image_url}
                alt={`Shot #${currentItem.shot.shot_number}`}
                className="h-full w-full object-cover transition-opacity duration-500"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-500 text-sm">
                Image Not Rendered Yet
              </div>
            )}

            {/* Shot Overlay Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="rounded-lg bg-slate-950/80 px-3 py-1 text-xs font-bold text-indigo-400 border border-slate-700">
                Shot #{currentItem.shot.shot_number} — {currentItem.shot.shot_type}
              </span>
              <span className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
                {currentItem.shot.camera_angle}
              </span>
            </div>
          </div>

          {/* Subtitles & Action Description */}
          <div className="max-w-3xl mx-auto space-y-2">
            <p className="text-sm text-slate-300 leading-relaxed font-sans">{currentItem.shot.action}</p>

            {currentItem.shot.dialogue && (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/10 px-5 py-2.5 border border-amber-500/30">
                <MessageSquareQuote className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-sm font-semibold italic text-amber-200">
                  &quot;{currentItem.shot.dialogue}&quot;
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Timeline Bar */}
      <div className="border-t border-slate-800 bg-slate-900/60 p-4">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 overflow-x-auto">
          {allShotsWithScene.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-12 w-20 shrink-0 overflow-hidden rounded-lg border transition-all ${
                currentIndex === idx
                  ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-105'
                  : 'border-slate-800 opacity-50 hover:opacity-100'
              }`}
            >
              {item.shot.image_url ? (
                <img src={item.shot.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-950 text-[10px]">
                  #{item.shot.shot_number}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
