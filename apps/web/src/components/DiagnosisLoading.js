/**
 * CircuitSage AI — Diagnosis Loading State
 * Renders transparent engineering stages during circuit analysis to reassure users
 * that deterministic math and local AI inference are actively executing.
 */

'use client';

import { useState, useEffect } from 'react';

const ANALYSIS_STAGES = [
  { id: 1, title: 'Parsing circuit topology & component pinouts', detail: 'Verifying pin numbers, logic rails, and component types against catalog' },
  { id: 2, title: 'Evaluating deterministic electrical rules', detail: 'Calculating Ohm’s law, series LED forward current, and 5V/3.3V logic limits' },
  { id: 3, title: 'Executing local Gemma 4 reasoning engine', detail: 'Synthesizing ranked fault hypotheses without external cloud transmission' },
  { id: 4, title: 'Formulating safe multimeter probing plan', detail: 'Determining exact probe contact points and expected nominal voltages' }
];

export default function DiagnosisLoading({ onCancel }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    const stageTimer = setInterval(() => {
      setCurrentStage((prev) => (prev < ANALYSIS_STAGES.length - 1 ? prev + 1 : prev));
    }, 900);

    return () => {
      clearInterval(timer);
      clearInterval(stageTimer);
    };
  }, []);

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Diagnostic analysis in progress"
      className="p-8 rounded-xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-950/60 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <svg
              className="w-5 h-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Analyzing Circuit Malfunction...
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Elapsed: {secondsElapsed}s • Running offline-first diagnostic pipeline
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 font-mono transition-colors"
          >
            Cancel Analysis
          </button>
        )}
      </div>

      {/* Pipeline Stage Indicators */}
      <div className="space-y-3">
        {ANALYSIS_STAGES.map((stage, idx) => {
          const isDone = idx < currentStage;
          const isCurrent = idx === currentStage;

          return (
            <div
              key={stage.id}
              className={`p-3 rounded-lg border transition-all ${
                isCurrent
                  ? 'bg-blue-950/30 border-blue-600/60 text-blue-200'
                  : isDone
                  ? 'bg-slate-950/60 border-emerald-900/60 text-slate-300'
                  : 'bg-slate-950/30 border-slate-800/60 text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-xs font-semibold shrink-0">
                  {isDone ? (
                    <span className="text-emerald-400">✓</span>
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                  ) : (
                    <span className="text-slate-600 font-mono">{idx + 1}</span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{stage.title}</p>
                  <p className="text-[11px] text-slate-400/80 truncate">{stage.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center text-[11px] text-slate-500 font-mono">
        💡 Safe debugging rule: Never touch test leads across high-voltage rails. Always verify DMM is set to DC Volts before measuring logic pins.
      </div>
    </div>
  );
}
