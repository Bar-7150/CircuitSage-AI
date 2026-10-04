/**
 * CircuitSage AI — Workbench Footer Component
 * Highlights epistemic honesty principles, safety protocols, and monorepo navigation.
 */

import Link from 'next/link';
import EpistemicBadge from './EpistemicBadge';
import { EPISTEMIC_STATUS } from '../lib/constants';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 mt-20 pt-12 pb-10 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Epistemic Honesty Reference Bar */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 uppercase tracking-wider font-mono text-[11px]">
              Epistemic Classification Standard
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Zero AI Hallucinations</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-2">
              <EpistemicBadge status={EPISTEMIC_STATUS.VERIFIED_FACT} size="sm" />
              <p className="text-[11px] text-slate-400 leading-snug">
                Backed strictly by manufacturer datasheets, deterministic math, or user multimeter measurements.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <EpistemicBadge status={EPISTEMIC_STATUS.AI_INFERENCE} size="sm" />
              <p className="text-[11px] text-slate-400 leading-snug">
                Probabilistic fault hypothesis from Gemma 4. Never treated as verified fact until physically measured.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <EpistemicBadge status={EPISTEMIC_STATUS.UNKNOWN} size="sm" />
              <p className="text-[11px] text-slate-400 leading-snug">
                Missing electrical parameter. The engine strictly refuses to fabricate default safe values.
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-2">
          <div className="space-y-1 max-w-md">
            <div className="flex items-center gap-2">
              <span className="text-base text-blue-400">⚡</span>
              <span className="font-bold text-slate-200">CircuitSage AI</span>
              <span className="text-[10px] font-mono text-slate-500">• Offline-First Engineering</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Designed for students, makers, Arduino hobbyists, and ESP32 beginners troubleshooting physical hardware without cloud dependencies.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-4 font-mono text-xs">
            <Link href="/" className="hover:text-blue-400 transition-colors">Overview</Link>
            <Link href="/workspace" className="hover:text-blue-400 transition-colors">Workspace</Link>
            <Link href="/history" className="hover:text-blue-400 transition-colors">Case History</Link>
            <Link href="/status" className="hover:text-blue-400 transition-colors">System Status</Link>
          </div>
        </div>

        {/* Safety Disclaimer */}
        <div className="border-t border-slate-900 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500">
          <p>
            ⚠️ <strong>Lab Safety:</strong> Always de-energize and disconnect power supplies before modifying breadboard connections or changing IC orientations.
          </p>
          <p className="font-mono">
            MIT License • CircuitSage AI v0.1.0
          </p>
        </div>
      </div>
    </footer>
  );
}
