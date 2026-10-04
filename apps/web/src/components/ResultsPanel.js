/**
 * CircuitSage AI — Results Panel Component
 * Displays ranked hypotheses, deterministic rules, uncertainty indicators,
 * suggested multimeter probing procedures, and eliminated hypotheses.
 */

'use client';

import EpistemicBadge from './EpistemicBadge';
import { EPISTEMIC_STATUS } from '../lib/constants';

export default function ResultsPanel({
  diagnosis,
  onSelectTestForProbing,
  measurementsLog = [],
  eliminatedHypotheses = []
}) {
  if (!diagnosis) {
    return (
      <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
        <span className="text-3xl" aria-hidden="true">⚡</span>
        <h4 className="text-sm font-semibold text-slate-300">Ready for Circuit Diagnosis</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Select your microcontroller board, describe the observed symptom, and run analysis to inspect ranked hypotheses and multimeter probing procedures.
        </p>
      </div>
    );
  }

  const { case: caseInfo, epistemic_summary, deterministic_checks, hypotheses } = diagnosis;

  return (
    <div className="space-y-6" role="region" aria-label="Diagnostic findings and hypotheses">
      {/* Top Epistemic Triage Summary Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Case ID:</span>
              <code className="text-xs font-mono text-blue-400 font-semibold truncate max-w-[200px]">
                {caseInfo?.id}
              </code>
              {caseInfo?.is_demo && (
                <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/70 text-amber-300 text-[10px] font-mono">
                  DEMO SCENARIO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Target Board: <span className="font-semibold text-white">{caseInfo?.target_board}</span>
            </p>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Status: <span className="text-emerald-400 font-semibold">{caseInfo?.status || 'ACTIVE'}</span>
          </div>
        </div>

        {/* Epistemic Counts */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/60 text-center">
            <span className="block text-lg font-bold text-emerald-400 font-mono">
              {epistemic_summary?.verified_facts_count ?? 0}
            </span>
            <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wide">
              Verified Facts
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/60 text-center">
            <span className="block text-lg font-bold text-amber-400 font-mono">
              {epistemic_summary?.ai_inferences_count ?? 0}
            </span>
            <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wide">
              AI Inferences
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
            <span className="block text-lg font-bold text-slate-400 font-mono">
              {epistemic_summary?.unknown_assumptions_count ?? 0}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Unknowns
            </span>
          </div>
        </div>
      </div>

      {/* Deterministic Engineering Rules Evaluation */}
      {deterministic_checks && deterministic_checks.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Deterministic Rules Engine
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">Ohm’s Law & Thresholds</span>
          </div>

          <div className="space-y-2">
            {deterministic_checks.map((chk) => {
              const isPass = chk.result === 'VERIFIED_PASS' || chk.result === 'PASS';
              const isWarn = chk.result === 'WARNING';
              const isCrit = chk.critical;

              return (
                <div
                  key={chk.check_id}
                  className={`p-3 rounded-lg border text-xs space-y-1 ${
                    isCrit && !isPass
                      ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                      : isWarn
                      ? 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-100 font-mono">
                      {chk.rule}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isPass
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isWarn
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {chk.result}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{chk.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ranked Hypotheses List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Ranked Fault Hypotheses
          </h4>
          <span className="text-xs text-slate-500 font-mono">Ordered by likelihood & physics</span>
        </div>

        {hypotheses && hypotheses.length > 0 ? (
          hypotheses.map((hyp, index) => (
            <article
              key={hyp.id || index}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-md hover:border-slate-700 transition-colors"
            >
              {/* Hypothesis Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-950 border border-blue-700 text-blue-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                    #{hyp.rank || index + 1}
                  </span>
                  <h5 className="text-sm font-bold text-white leading-tight">
                    {hyp.title}
                  </h5>
                </div>

                <div className="flex items-center gap-2">
                  <EpistemicBadge status={hyp.epistemic_status} size="sm" />
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {hyp.category}
                  </span>
                </div>
              </div>

              {/* Confidence & Epistemic Uncertainty Notice */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
                <span className="text-slate-300 font-medium">Confidence:</span>
                <span className="text-blue-400 font-semibold">{hyp.confidence_label || `${Math.round((hyp.confidence_score || 0) * 100)}%`}</span>
                <span className="text-slate-500 text-[11px]">
                  • Requires multimeter verification to confirm ground truth
                </span>
              </div>

              {/* Physics Explanation */}
              <div className="text-xs text-slate-300 leading-relaxed">
                <p>{hyp.explanation}</p>
              </div>

              {/* Suggested Multimeter Probing Procedure */}
              {hyp.suggested_test && (
                <div className="p-4 rounded-lg bg-slate-950 border border-blue-900/40 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide font-mono flex items-center gap-1.5">
                      <span>🔍</span> Suggested Multimeter Probing
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectTestForProbing(hyp.suggested_test)}
                      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium transition-colors shadow-sm self-start sm:self-auto"
                    >
                      + Log This Reading
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                    <div>
                      <span className="text-slate-500">Tool / Range: </span>
                      <span className="text-slate-200">{hyp.suggested_test.tool}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Expected: </span>
                      <span className="text-emerald-400">{hyp.suggested_test.expected_nominal}</span>
                    </div>
                    <div>
                      <span className="text-rose-400 font-bold">🔴 Red Probe (+): </span>
                      <span className="text-slate-200">{hyp.suggested_test.probe_positive}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold">⚫ Black Probe (-): </span>
                      <span className="text-slate-200">{hyp.suggested_test.probe_negative}</span>
                    </div>
                  </div>

                  {hyp.suggested_test.instructions && (
                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-900">
                      {hyp.suggested_test.instructions}
                    </p>
                  )}
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
            No active hypotheses remaining. The fault is fully resolved or all hypotheses were disproved by measurements.
          </div>
        )}
      </div>

      {/* Eliminated Hypotheses Section */}
      {eliminatedHypotheses && eliminatedHypotheses.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-mono text-sm">✓</span>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Eliminated Hypotheses ({eliminatedHypotheses.length})
            </h4>
          </div>

          <div className="space-y-2">
            {eliminatedHypotheses.map((elim, idx) => (
              <div
                key={elim.id || idx}
                className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs space-y-1 text-slate-400"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold line-through text-slate-500 font-mono">
                    {elim.title}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-900">
                    Disproved by Probing
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {elim.elimination_reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multimeter Probing Measurements History */}
      {measurementsLog && measurementsLog.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Probing Log ({measurementsLog.length} readings recorded)
          </h4>

          <div className="space-y-2">
            {measurementsLog.map((m, idx) => (
              <div
                key={m.id || idx}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1 font-mono"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-400">
                    {m.numeric_value} {m.unit} ({m.measurement_type})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {m.created_at ? new Date(m.created_at).toLocaleTimeString() : 'Recorded'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Probes: <span className="text-rose-400">(+) {m.probe_positive}</span> ↔ <span className="text-slate-300">(-) {m.probe_negative}</span>
                </div>
                {m.notes && <p className="text-[11px] text-slate-500 italic">{m.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
