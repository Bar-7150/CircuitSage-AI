/**
 * CircuitSage AI — Settings & System Status Panel (Screen 10)
 * Displays backend connectivity, local Gemma 4 runtime status, database mode,
 * and developer configuration for API endpoints and demo simulation.
 */

'use client';

import { useState, useEffect } from 'react';
import { checkServerHealth, getEffectiveApiBaseUrl } from '../../lib/api';
import {
  isDemoMode,
  setDemoMode,
  getApiBaseUrlOverride,
  setApiBaseUrlOverride
} from '../../lib/storage';
import { SUPPORTED_BOARDS } from '../../lib/constants';

export default function StatusPage() {
  const [healthData, setHealthData] = useState(null);
  const [errorData, setErrorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [pingLatency, setPingLatency] = useState(null);

  // Settings State
  const [demoActive, setDemoActive] = useState(false);
  const [apiOverrideInput, setApiOverrideInput] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(null);

  async function fetchHealth() {
    setLoading(true);
    setErrorData(null);
    const start = performance.now();

    const res = await checkServerHealth();
    const duration = Math.round(performance.now() - start);

    if (res.success) {
      setHealthData(res.data);
      setPingLatency(duration);
      setLastChecked(new Date().toLocaleTimeString());
    } else {
      setErrorData(res.error?.message || 'Failed to connect to backend server');
      setHealthData(null);
      setPingLatency(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    setDemoActive(isDemoMode());
    setApiOverrideInput(getApiBaseUrlOverride());
    fetchHealth();
  }, []);

  function handleToggleDemo() {
    const nextVal = !demoActive;
    setDemoMode(nextVal);
    setDemoActive(nextVal);
  }

  function handleSaveApiUrl(e) {
    e.preventDefault();
    setApiBaseUrlOverride(apiOverrideInput.trim());
    setSaveSuccessMessage('API Base URL updated.');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
    fetchHealth();
  }

  function handleResetApiUrl() {
    setApiBaseUrlOverride('');
    setApiOverrideInput('');
    setSaveSuccessMessage('Reset API URL to default.');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
    fetchHealth();
  }

  const currentApiUrl = getEffectiveApiBaseUrl();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <span>⚙️</span> System Status & AI Runtime Panel
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time diagnostics for Express API, local Gemma 4 AI reasoning engine, and database persistence.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchHealth}
          disabled={loading}
          className="px-4 py-2 text-xs font-mono font-medium rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          {loading ? 'Pinging API...' : '🔄 Refresh Status'}
        </button>
      </div>

      {/* 3 Main Status Cards: Backend, AI Runtime, Database */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Express REST API */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Backend REST API
            </span>
            <div className="pt-2">
              {loading ? (
                <span className="inline-flex items-center gap-2 text-amber-400 font-semibold text-base">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Checking...
                </span>
              ) : healthData ? (
                <span className="inline-flex items-center gap-2 text-emerald-400 font-semibold text-base font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  Online (HTTP 200)
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-rose-400 font-semibold text-base font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                  Unreachable
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2 font-mono truncate">
              {currentApiUrl}
            </p>
          </div>

          <div className="text-[11px] font-mono text-slate-500 border-t border-slate-800/80 pt-3 flex items-center justify-between">
            <span>Ping: {pingLatency !== null ? `${pingLatency} ms` : '--'}</span>
            <span>{lastChecked ? `Last: ${lastChecked}` : ''}</span>
          </div>
        </div>

        {/* Card 2: Local Gemma 4 AI Inference */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              AI Inference Runtime
            </span>
            <div className="pt-2">
              {healthData?.services?.local_ai_inference?.status === 'configured' ||
              healthData?.services?.local_ai_inference?.status === 'ready' ? (
                <span className="inline-flex items-center gap-2 text-emerald-400 font-semibold text-base font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  Gemma 4 Adapter Ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-slate-300 font-medium text-base font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                  Standby / Local Fallback
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-2 font-mono space-y-0.5">
              <p>Host: {healthData?.services?.local_ai_inference?.runtime_url || 'http://127.0.0.1:11434'}</p>
              <p>Model: {healthData?.services?.local_ai_inference?.model_name || 'gemma4:latest'}</p>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-500 border-t border-slate-800/80 pt-3">
            Air-Gapped & Offline Capable
          </div>
        </div>

        {/* Card 3: Database & Persistence Layer */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Persistence Engine
            </span>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 text-slate-200 font-medium text-base font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                {healthData?.services?.database?.status === 'connected'
                  ? 'Supabase Postgres (Cloud Sync)'
                  : 'Local Browser & Fallback'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Provider: {healthData?.services?.database?.provider || 'supabase_postgres / localStorage'}
            </p>
          </div>

          <div className="text-[11px] font-mono text-slate-500 border-t border-slate-800/80 pt-3">
            Offline Mode: {healthData?.offline_mode_ready ? '✓ Ready' : 'Enabled'}
          </div>
        </div>
      </div>

      {/* Error Banner if API Unreachable */}
      {errorData && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 text-xs space-y-1">
          <div className="font-semibold text-rose-400 flex items-center gap-2">
            <span>⚠️</span> Express API is Currently Unreachable
          </div>
          <p className="text-rose-300">
            To start the local backend server, execute <code className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-rose-200">npm run dev:api</code> in your terminal.
          </p>
          <p className="font-mono text-[11px] text-rose-400/80 mt-1">Error message: {errorData}</p>
        </div>
      )}

      {/* Developer Settings Section */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Workbench & Development Configuration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Toggle between offline simulation and live backend execution or customize endpoint routes.
          </p>
        </div>

        {saveSuccessMessage && (
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-xs font-mono">
            {saveSuccessMessage}
          </div>
        )}

        <div className="space-y-6">
          {/* Demo Mode Toggle Setting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-200 font-mono">
                Development / Demo Simulation Mode
              </span>
              <p className="text-xs text-slate-400 max-w-xl">
                When enabled, diagnostic requests use authentic pre-computed electrical scenarios locally. No local Gemma 4 runtime or Express server required.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleDemo}
              className={`px-4 py-2 text-xs font-mono rounded-lg border transition-colors self-start sm:self-auto ${
                demoActive
                  ? 'bg-amber-950 border-amber-600 text-amber-300 font-semibold'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {demoActive ? '✓ Demo Mode Active' : 'Switch to Demo Mode'}
            </button>
          </div>

          {/* API Endpoint Configuration Form */}
          <form onSubmit={handleSaveApiUrl} className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <label htmlFor="api-url-input" className="block text-xs font-semibold text-slate-200 font-mono">
              Custom Express API Base URL
            </label>
            <p className="text-xs text-slate-400">
              Useful when testing against different ports or containerized development environments.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="api-url-input"
                type="url"
                value={apiOverrideInput}
                onChange={(e) => setApiOverrideInput(e.target.value)}
                placeholder="http://localhost:8000/api/v1"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium transition-colors"
              >
                Save URL
              </button>
              <button
                type="button"
                onClick={handleResetApiUrl}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors border border-slate-700"
              >
                Reset Default
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Hardware Voltage Reference & Safety Table */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
          Hardware Electrical Limits & Voltage Reference
        </h2>
        <p className="text-xs text-slate-400">
          Hardware specifications used by CircuitSage AI deterministic rules engine to prevent component damage.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">Board Model</th>
                <th className="py-2.5 px-3">Logic Rail</th>
                <th className="py-2.5 px-3">Max GPIO Current</th>
                <th className="py-2.5 px-3">5V Tolerance</th>
                <th className="py-2.5 px-3">Safety Risk Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {SUPPORTED_BOARDS.map((b) => (
                <tr key={b.id} className="hover:bg-slate-950/40">
                  <td className="py-2.5 px-3 font-semibold text-white">{b.name}</td>
                  <td className="py-2.5 px-3 text-amber-300">{b.logicVoltage}</td>
                  <td className="py-2.5 px-3">{b.maxGpioCurrent}</td>
                  <td className="py-2.5 px-3">
                    <span className={b.id.includes('Arduino') ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                      {b.id.includes('Arduino') ? 'Yes (5V Native)' : 'No (Strict 3.3V Max)'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">{b.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
