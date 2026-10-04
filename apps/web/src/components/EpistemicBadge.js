/**
 * CircuitSage AI — Epistemic Status Badge
 * Renders the three-state epistemic classification:
 * 🟢 VERIFIED_FACT (Empirical measurement or datasheet fact)
 * 🟡 AI_INFERENCE (Probabilistic Gemma 4 reasoning, requires validation)
 * ⚪ UNKNOWN (Missing electrical parameter; refuses to guess)
 */

import { EPISTEMIC_STATUS } from '../lib/constants';

export default function EpistemicBadge({ status, size = 'md', className = '' }) {
  const normalizedStatus = status || EPISTEMIC_STATUS.UNKNOWN;

  const configs = {
    [EPISTEMIC_STATUS.VERIFIED_FACT]: {
      label: 'Verified Fact',
      shortLabel: 'Verified',
      description: 'Datasheet fact or confirmed by physical measurement',
      bgClass: 'bg-emerald-950/70 border-emerald-500/70 text-emerald-300',
      dotClass: 'bg-emerald-400',
      icon: '✓'
    },
    [EPISTEMIC_STATUS.AI_INFERENCE]: {
      label: 'AI Inference',
      shortLabel: 'Inference',
      description: 'Probabilistic hypothesis. Requires physical validation.',
      bgClass: 'bg-amber-950/70 border-amber-500/70 text-amber-300',
      dotClass: 'bg-amber-400 animate-pulse',
      icon: '⚡'
    },
    [EPISTEMIC_STATUS.UNKNOWN]: {
      label: 'Unknown Assumption',
      shortLabel: 'Unknown',
      description: 'Unmeasured parameter. Engine refuses to assume default values.',
      bgClass: 'bg-slate-900 border-slate-600 border-dashed text-slate-300',
      dotClass: 'bg-slate-400',
      icon: '?'
    }
  };

  const config = configs[normalizedStatus] || configs[EPISTEMIC_STATUS.UNKNOWN];
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bgClass} ${sizeClasses} ${className}`}
      title={config.description}
      role="status"
      aria-label={`Epistemic state: ${config.label}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dotClass}`} aria-hidden="true" />
      <span className="font-semibold tracking-wide uppercase font-mono text-[10px]">
        {config.label}
      </span>
    </span>
  );
}
