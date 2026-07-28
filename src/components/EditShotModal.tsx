'use client';

import React, { useState } from 'react';
import { Shot } from '@/types/storyboard';
import {
  X,
  Wand2,
  Check,
  Loader2,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

interface EditShotModalProps {
  isOpen: boolean;
  shot: Shot | null;
  visualAnchor?: string;
  gender?: string;
  characterReferenceImage?: string;
  seed?: number;
  onClose: () => void;
  onApplyEdit: (shotId: string, newImageUrl: string, newPrompt: string, editInstruction: string) => void;
  geminiApiKey?: string;
  openaiApiKey?: string;
  falApiKey?: string;
  replicateApiKey?: string;
  preferredModel?: string;
}

export const EditShotModal: React.FC<EditShotModalProps> = ({
  isOpen,
  shot,
  visualAnchor,
  gender,
  characterReferenceImage,
  seed,
  onClose,
  onApplyEdit,
  geminiApiKey,
  openaiApiKey,
  falApiKey,
  replicateApiKey,
  preferredModel,
}) => {
  const [editInstruction, setEditInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !shot) return null;

  const sampleInstructions = [
    "Change camera angle to dramatic low angle",
    "Make it torrential rain at night with glowing neon reflections",
    "Add warm sunset golden hour lighting",
    "Switch to a tight emotional close-up shot",
    "Add cinematic lens flare and film grain",
  ];

  const handleGenerateEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editInstruction.trim() || isEditing) return;

    setIsEditing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/edit-shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalImageUrl: shot.image_url,
          editInstruction,
          characterAnchor: visualAnchor,
          visualAnchor,
          shotMetadata: {
            cameraAngle: shot.camera_angle,
            shotType: shot.shot_type,
            action: shot.action,
          },
          originalPrompt: shot.image_prompt,
          gender,
          cameraAngle: shot.camera_angle,
          shotType: shot.shot_type,
          action: shot.action,
          characterReferenceImage,
          seed,
          modelChoice: preferredModel,
          geminiApiKey,
          openaiApiKey,
          falApiKey,
          replicateApiKey,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to edit shot image.');
      }

      setEditedImageUrl(data.newImageUrl);
      setEditedPrompt(data.updatedPrompt);
    } catch (err: any) {
      console.error("Edit shot error:", err);
      setErrorMsg(err.message || 'Error occurred while editing shot.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleAccept = () => {
    if (!editedImageUrl || !editedPrompt) return;
    onApplyEdit(shot.shot_id, editedImageUrl, editedPrompt, editInstruction);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
              <Wand2 className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Natural Language Shot Editing — Shot #{shot.shot_number}
              </h2>
              <p className="text-xs text-slate-400">
                Modify camera framing, weather & lighting while preserving character visual identity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-6 p-6">
          {/* Quick Preset Edit Chips */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Quick Edit Suggestions:</label>
            <div className="flex flex-wrap gap-2">
              {sampleInstructions.map((inst, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setEditInstruction(inst)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 hover:border-indigo-500/50 hover:text-white transition-all"
                >
                  {inst}
                </button>
              ))}
            </div>
          </div>

          {/* Edit Instruction Form */}
          <form onSubmit={handleGenerateEdit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                placeholder="Type natural language edit instruction (e.g. 'Make it night time with rain and neon lights')..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={isEditing || !editInstruction.trim()}
                className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-indigo-500 disabled:opacity-50"
              >
                {isEditing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Rendering...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3.5 w-3.5 text-amber-300" /> Apply Edit
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Character Identity Protection Indicator */}
          {visualAnchor && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-indigo-500/10 px-3.5 py-2 ring-1 ring-indigo-500/20 text-xs text-indigo-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-white">Character Identity Protected: </span>
                {gender && <span className="mr-1.5 font-bold text-emerald-300">[{gender}]</span>}
                <span className="truncate">{visualAnchor}</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl bg-rose-950/40 p-3 border border-rose-800/60 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Side-by-Side Comparison View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                Comparison View (Original vs Edited)
              </h3>
              {editedImageUrl && (
                <span className="text-[11px] font-semibold text-emerald-400">
                  Edit Preview Ready
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Shot Container */}
              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Original Shot</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px]">Current</span>
                </div>
                <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900 border border-slate-800">
                  {shot.image_url ? (
                    <img src={shot.image_url} alt="Original Shot" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">No Image</div>
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-400 line-clamp-2">{shot.image_prompt}</p>
              </div>

              {/* Edited Shot Container */}
              <div className="space-y-2 rounded-xl border border-indigo-500/30 bg-slate-950 p-3 ring-1 ring-indigo-500/20">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                  <span>Edited Shot</span>
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                    Natural Language Modified
                  </span>
                </div>
                <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900 border border-indigo-500/30">
                  {isEditing ? (
                    <div className="flex h-full w-full flex-col items-center justify-center space-y-2 bg-indigo-950/30 p-4 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                      <p className="text-xs text-indigo-300 font-medium animate-pulse">
                        Synthesizing Shot Edit...
                      </p>
                    </div>
                  ) : editedImageUrl ? (
                    <img src={editedImageUrl} alt="Edited Shot" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-4 text-center text-xs text-slate-500">
                      <Wand2 className="h-6 w-6 text-slate-600 mb-1" />
                      <span>Enter an edit instruction above to preview edited shot</span>
                    </div>
                  )}
                </div>
                {editedPrompt ? (
                  <p className="text-[11px] font-mono text-indigo-200 line-clamp-2">{editedPrompt}</p>
                ) : (
                  <p className="text-[11px] text-slate-600 italic">Prompt will update here after edit</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Cancel / Keep Original
          </button>

          <button
            type="button"
            onClick={handleAccept}
            disabled={!editedImageUrl || isEditing}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
          >
            <Check className="h-4 w-4" />
            <span>Apply Edited Shot to Storyboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
