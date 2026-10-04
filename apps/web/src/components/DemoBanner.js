/**
 * CircuitSage AI — Demo Mode Notification Banner
 * Strictly warns the user whenever mock data / simulation is active.
 */

export default function DemoBanner({ isDemo, onToggleDemo }) {
  if (!isDemo) return null;

  return (
    <div
      role="alert"
      className="p-3 px-4 rounded-lg bg-amber-950/40 border border-amber-600/60 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-base" aria-hidden="true">🛠️</span>
        <div>
          <span className="font-semibold text-amber-300 uppercase tracking-wider font-mono">
            Demo & Development Mode Active
          </span>
          <p className="text-amber-200/80 text-[11px] mt-0.5">
            Diagnostic calculations and hypotheses are simulated locally using authentic electronics test scenarios. No live Gemma 4 runtime required.
          </p>
        </div>
      </div>

      {onToggleDemo && (
        <button
          type="button"
          onClick={() => onToggleDemo(false)}
          className="whitespace-nowrap px-3 py-1 rounded bg-amber-800/60 hover:bg-amber-700/80 text-amber-100 border border-amber-600/80 font-mono text-[11px] transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          Switch to Live API Mode
        </button>
      )}
    </div>
  );
}
