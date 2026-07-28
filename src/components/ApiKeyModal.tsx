'use client';

import React, { useState } from 'react';
import { X, Key, Check, Cpu, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';
import { ApiKeys } from '@/types/storyboard';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: ApiKeys;
  onSaveApiKeys: (keys: ApiKeys) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKeys,
  onSaveApiKeys,
}) => {
  const [geminiKey, setGeminiKey] = useState(apiKeys.geminiApiKey || '');
  const [openaiKey, setOpenaiKey] = useState(apiKeys.openaiApiKey || '');
  const [falKey, setFalKey] = useState(apiKeys.falApiKey || '');
  const [replicateKey, setReplicateKey] = useState(apiKeys.replicateApiKey || '');
  const [preferredModel, setPreferredModel] = useState<ApiKeys['preferredModel']>(
    apiKeys.preferredModel || 'pollinations-flux'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKeys({
      geminiApiKey: geminiKey.trim(),
      openaiApiKey: openaiKey.trim(),
      falApiKey: falKey.trim(),
      replicateApiKey: replicateKey.trim(),
      preferredModel,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">API Credentials & Image Engines</h2>
              <p className="text-xs text-slate-400">Configure LLM parsing & FLUX rendering choices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-4 p-6 text-sm">
          {/* Google Gemini API Key */}
          <div className="space-y-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3.5 ring-1 ring-indigo-500/20">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Google Gemini API Key (100% Free Tier)</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 hover:underline"
              >
                Get Free Key <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400 leading-tight">
              Recommended: Powers Gemini 2.0 Flash for multi-scene parsing and shot prompt editing.
            </p>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>OpenAI API Key (gpt-4o-mini)</span>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] text-indigo-400 hover:underline"
              >
                Get key <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-proj-..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Model Engine Choice */}
          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Cpu className="h-3.5 w-3.5 text-amber-400" />
              <span>Image Engine Routing</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'pollinations-flux', name: 'Pollinations FLUX', badge: '100% Free / Fixed Seed' },
                { id: 'fal-flux-schnell', name: 'Fal.ai FLUX.1 [schnell]', badge: 'Fal.ai Key' },
                { id: 'fal-flux-dev', name: 'Fal.ai FLUX.1 [dev]', badge: 'Fal.ai Key' },
                { id: 'replicate-flux-schnell', name: 'Replicate FLUX', badge: 'Replicate Token' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPreferredModel(m.id as any)}
                  className={`flex flex-col items-start rounded-xl p-3 text-left transition-all border ${
                    preferredModel === m.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white ring-1 ring-indigo-500/30'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-semibold">{m.name}</span>
                  <span className="mt-1 rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {m.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-2 rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Zero-Key Execution: </strong>
              No keys required! The app operates on built-in Pollinations FLUX image generation and rule-based screenplay parsing out of the box.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" /> Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
