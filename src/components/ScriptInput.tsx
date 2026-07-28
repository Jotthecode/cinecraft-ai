'use client';

import React, { useState } from 'react';
import { SAMPLE_SCRIPTS, SampleScript } from '@/data/sampleScripts';
import { Sparkles, FileText, Wand2, Loader2, Play } from 'lucide-react';

interface ScriptInputProps {
  onParseScript: (scriptText: string) => Promise<void>;
  isLoading: boolean;
}

export const ScriptInput: React.FC<ScriptInputProps> = ({
  onParseScript,
  isLoading,
}) => {
  const [scriptText, setScriptText] = useState(SAMPLE_SCRIPTS[0].scriptText);
  const [activeSampleId, setActiveSampleId] = useState<string>(SAMPLE_SCRIPTS[0].id);

  const handleSelectSample = (sample: SampleScript) => {
    setActiveSampleId(sample.id);
    setScriptText(sample.scriptText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptText.trim() || isLoading) return;
    onParseScript(scriptText);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Intro Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>AI Screenplay Parsing & Character Consistency</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Transform Your Script into a <span className="bg-gradient-to-r from-amber-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Consistent Storyboard</span>
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Paste your script or pick a preset script. Our LLM extracts character visual identity anchors and camera shots, generating unified FLUX.1 storyboard panels with natural language editing.
        </p>
      </div>

      {/* Preset Script Selection Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1">
          <FileText className="h-3.5 w-3.5 text-amber-400" /> Presets:
        </span>
        {SAMPLE_SCRIPTS.map((sample) => (
          <button
            key={sample.id}
            onClick={() => handleSelectSample(sample)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              activeSampleId === sample.id
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400 shadow-md shadow-indigo-600/20 ring-2 ring-indigo-500/30'
                : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            {sample.title}
          </button>
        ))}
      </div>

      {/* Script Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-2 shadow-2xl backdrop-blur-xl focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
          <textarea
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            rows={12}
            placeholder="Paste your screenplay script here (Title, Characters, Scenes, Shots)..."
            className="w-full resize-y bg-transparent p-4 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none leading-relaxed"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 px-4 py-3 bg-slate-950/40 rounded-b-xl">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{scriptText.split('\n').filter(Boolean).length} lines ready for parsing</span>
            </div>

            <button
              type="submit"
              disabled={isLoading || !scriptText.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Parsing Script & Characters...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 text-amber-300" />
                  <span>Generate Storyboard</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
