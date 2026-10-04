/**
 * CircuitSage AI — Product Landing Page (Screen 1)
 * Explains product purpose, architecture, epistemic triage, and hardware support for beginners and makers.
 */

'use client';

import Link from 'next/link';
import EpistemicBadge from '../components/EpistemicBadge';
import { EPISTEMIC_STATUS, SUPPORTED_BOARDS } from '../lib/constants';
import { DEMO_SCENARIOS } from '../lib/mockData';

export default function LandingPage() {
  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/80 border border-blue-700/60 text-blue-300 text-xs font-mono shadow-sm">
          <span>⚡</span>
          <span>Designed for Students, Makers, Arduino Users & ESP32 Beginners</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Systematic Electronics Debugging <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400">
            Powered by Offline AI & Physics Rules
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          When software fails, it throws a stack trace. When circuits fail, they fail silently. CircuitSage AI pairs local open-weight <strong>Gemma 4 reasoning</strong> with a <strong>deterministic engineering rules engine</strong> and step-by-step multimeter probing guidance.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/workspace"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 font-mono"
          >
            <span>🔬 Launch Diagnostic Workspace</span>
          </Link>
          <Link
            href="/status"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-sm transition-colors border border-slate-800 flex items-center justify-center gap-2 font-mono"
          >
            <span>⚙️ System Status & Hardware Specs</span>
          </Link>
        </div>

        {/* Key Tenet Pills */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> 100% Offline-First Capable
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Mathematical Ohm’s Law Engine
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Zero AI Hallucinations via 3-State Honesty
          </span>
        </div>
      </section>

      {/* Why Electronics Debugging Fails Beginners */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Why Electronics Troubleshooting Stalls Beginners
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Traditional software tools don’t apply to physical breadboards where voltages, currents, and component polarities cannot be seen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 text-lg">
              🔇
            </div>
            <h3 className="text-sm font-bold text-white">Silent Failure Modes</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              An unlit LED, an unresponsive I2C OLED, or an ESP32 caught in a brownout reboot loop offers no error log. Finding the fault requires structured electrical elimination.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-amber-400 text-lg">
              ⚡
            </div>
            <h3 className="text-sm font-bold text-white">Destructive Voltage Mismatches</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Feeding 5V sensor outputs (such as HC-SR04 Echo) directly into 3.3V ESP32 or Raspberry Pi Pico GPIOs silently degrades or destroys microcontroller silicon without warning.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-950/60 border border-blue-800/80 flex items-center justify-center text-blue-400 text-lg">
              🛡️
            </div>
            <h3 className="text-sm font-bold text-white">Generic AI Hallucinations</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generic cloud chatbots routinely invent non-existent pin numbers, miscalculate resistor power ratings, and blur guesses with facts. CircuitSage enforces epistemic honesty.
            </p>
          </div>
        </div>
      </section>

      {/* The 4-Step Engineering Diagnostic Loop */}
      <section className="p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono text-blue-400 uppercase tracking-wider font-semibold">
            Systematic Methodology
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            The Interactive Engineering Troubleshooting Loop
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            CircuitSage AI combines AI reasoning with deterministic validation and hands-on multimeter probing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <span className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-700 text-blue-300 font-mono text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide">
              Circuit Intake
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Submit your target board, connected components, wiring descriptions, and optional overhead breadboard photos.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide">
              Deterministic Rules
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The engine automatically calculates Ohm’s law, series forward currents, voltage divider ratios, and 5V-to-3.3V logic limits.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <span className="w-7 h-7 rounded-lg bg-amber-950 border border-amber-700 text-amber-300 font-mono text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide">
              Ranked Hypotheses
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Local Gemma 4 analyzes observed symptoms to formulate ranked hypotheses with explicit confidence scores and uncertainty warnings.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <span className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-700 text-purple-300 font-mono text-xs font-bold flex items-center justify-center">
              4
            </span>
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide">
              Multimeter Probing
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Follow safe probe placement instructions. Enter measured voltages or resistance readings to eliminate false hypotheses dynamically.
            </p>
          </div>
        </div>
      </section>

      {/* Epistemic Three-State Honesty Deep Dive */}
      <section className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
              Grounding & Safety Standard
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Three-State Epistemic Honesty
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-md">
            Every conclusion presented by CircuitSage is tagged with an epistemic category. We refuse to present AI speculation as established truth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-slate-950 border border-emerald-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <EpistemicBadge status={EPISTEMIC_STATUS.VERIFIED_FACT} />
              <span className="text-[10px] font-mono text-emerald-400">Strict Fact</span>
            </div>
            <h3 className="text-sm font-bold text-white">Verified Ground Truth</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Data verified directly through manufacturer electrical specifications, deterministic formulas, or multimeter probe measurements entered by the user.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-950 border border-amber-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <EpistemicBadge status={EPISTEMIC_STATUS.AI_INFERENCE} />
              <span className="text-[10px] font-mono text-amber-400">Probabilistic</span>
            </div>
            <h3 className="text-sm font-bold text-white">AI Inference (Hypothesis)</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              A candidate explanation synthesized by Gemma 4 based on observed symptoms. Clearly marked as an inference that requires physical testing to confirm.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-950 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <EpistemicBadge status={EPISTEMIC_STATUS.UNKNOWN} />
              <span className="text-[10px] font-mono text-slate-400">Refusal to Guess</span>
            </div>
            <h3 className="text-sm font-bold text-white">Unknown Parameter</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              An unmeasured electrical attribute (such as an unspecified resistor value or unregulated rail voltage). The system refuses to hallucinate safe default values.
            </p>
          </div>
        </div>
      </section>

      {/* Supported Hardware Microcontrollers */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Supported Hardware & Microcontroller Platforms
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Calibrated with exact electrical boundaries, logic level thresholds, and pin capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SUPPORTED_BOARDS.map((board) => (
            <div
              key={board.id}
              className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-mono">{board.name}</h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300">
                    {board.logicVoltage}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">{board.architecture}</p>
                <div className="text-xs text-slate-300 space-y-1 pt-2 font-mono">
                  <p>• Max Pin Current: <span className="text-slate-100">{board.maxGpioCurrent}</span></p>
                  <p className="text-[11px] text-slate-400 italic pt-1">{board.notes}</p>
                </div>
              </div>

              <Link
                href={`/workspace?board=${encodeURIComponent(board.id)}`}
                className="mt-4 block text-center py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors border border-slate-700"
              >
                Diagnose {board.name} Circuit →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Realistic Demo Scenarios for Quick Evaluation */}
      <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Try Realistic Troubleshooting Scenarios</h2>
            <p className="text-xs text-slate-400 mt-1">
              Test CircuitSage AI immediately with realistic, physics-grounded electrical failure cases.
            </p>
          </div>
          <span className="text-xs font-mono text-amber-400 self-start sm:self-auto px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800">
            Instant Demo Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEMO_SCENARIOS.map((demo) => (
            <div
              key={demo.id}
              className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-300">
                  {demo.board}
                </span>
                <h3 className="text-xs font-bold text-white">{demo.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {demo.description}
                </p>
              </div>

              <Link
                href={`/workspace?scenario=${demo.id}`}
                className="block text-center py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 text-xs font-mono font-medium transition-colors"
              >
                Load This Scenario →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="p-8 sm:p-12 rounded-2xl bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-900/40 border border-blue-800/50 text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Ready to Troubleshoot Your Circuit?
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
          Open the Diagnostic Workspace to configure your hardware, describe observed behaviors, inspect deterministic rules, and receive step-by-step multimeter probing procedures.
        </p>
        <div className="pt-2">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/25 font-mono"
          >
            <span>⚡ Open Diagnostic Workspace</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
