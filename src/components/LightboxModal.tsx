'use client';

import React, { useEffect } from 'react';
import { X, Download, Camera } from 'lucide-react';
import { Shot } from '@/types/storyboard';

interface LightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title: string;
  shot?: Shot | null;
  sceneNumber?: number;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  imageUrl,
  title,
  shot,
  sceneNumber,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `${title.replace(/\s+/g, '_')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[95vh] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 px-5 py-3 gap-2 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100 text-sm sm:text-base">{title}</span>
            {sceneNumber && (
              <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                Scene {sceneNumber}
              </span>
            )}
            {shot && (
              <>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">
                  {shot.shot_type}
                </span>
                <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                  <Camera className="h-3 w-3" />
                  {shot.camera_angle}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white border border-slate-700/50"
              title="Download High-Res Image"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-800/60 p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              title="Close (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* High Resolution Image Container */}
        <div className="flex flex-1 items-center justify-center overflow-auto p-4 bg-slate-950/80">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[68vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
          />
        </div>

        {/* Shot Details & Synthesized Prompt */}
        {shot && (
          <div className="border-t border-slate-800/80 bg-slate-900/60 p-4 space-y-2 max-h-[22vh] overflow-y-auto">
            {shot.action && (
              <p className="text-xs text-slate-200 leading-relaxed">
                <strong className="text-slate-400 font-semibold">Action: </strong>
                {shot.action}
              </p>
            )}
            {shot.image_prompt && (
              <div className="rounded-lg bg-slate-950 p-2.5 text-[11px] font-mono text-slate-400 border border-slate-800/80 leading-relaxed">
                <strong className="text-slate-500 font-semibold block mb-0.5">FLUX Prompt:</strong>
                <p>{shot.image_prompt}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
