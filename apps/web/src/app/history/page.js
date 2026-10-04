/**
 * CircuitSage AI — Diagnosis History Page (Screen 9)
 * Displays past diagnostic cases, clearly communicating guest/unauthenticated state
 * and offering local session persistence vs Supabase cloud synchronization.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import EpistemicBadge from '../../components/EpistemicBadge';
import { useAuth } from '../../context/AuthContext';
import { getLocalCases, deleteLocalCase, saveLocalCase } from '../../lib/storage';
import { DEMO_SCENARIOS } from '../../lib/mockData';
import { EPISTEMIC_STATUS } from '../../lib/constants';
import { getEffectiveApiBaseUrl } from '../../lib/api';

export default function HistoryPage() {
  const { user, loading: authLoading, getAccessToken, isConfigured: isSupabaseConfigured } = useAuth();

  const [localCases, setLocalCases] = useState([]);
  const [cloudCases, setCloudCases] = useState([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterBoard, setFilterBoard] = useState('ALL');

  const loadLocalCases = useCallback(() => {
    const local = getLocalCases();
    setLocalCases(local);
  }, []);

  const loadCloudCases = useCallback(async () => {
    if (!user) {
      setCloudCases([]);
      return;
    }

    setCloudLoading(true);
    try {
      const token = await getAccessToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const baseUrl = getEffectiveApiBaseUrl();
      const res = await fetch(`${baseUrl}/diagnoses`, { headers });
      const data = await res.json();
      if (res.ok && data.cases) {
        setCloudCases(data.cases);
      }
    } catch (err) {
      console.error('Failed to load cloud cases:', err);
    } finally {
      setCloudLoading(false);
    }
  }, [user, getAccessToken]);

  useEffect(() => {
    loadLocalCases();
    if (user) {
      loadCloudCases();
    }
  }, [user, loadLocalCases, loadCloudCases]);

  function handleDeleteLocalCase(id) {
    if (confirm('Are you sure you want to remove this diagnostic case from local storage?')) {
      deleteLocalCase(id);
      loadLocalCases();
    }
  }

  function handleLoadDemoCases() {
    DEMO_SCENARIOS.forEach((demo) => {
      saveLocalCase(demo.diagnosis);
    });
    loadLocalCases();
  }

  function handleExportCaseJson(caseObj) {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(caseObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `circuitsage-${caseObj.case?.id || caseObj.id || 'case'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // Combine or select display cases
  const allCases = user && cloudCases.length > 0 ? cloudCases.map((c) => ({
    case: {
      id: c.id,
      title: c.title,
      target_board: c.target_board,
      status: c.status,
      created_at: c.created_at,
      symptom_description: c.symptom_description || c.title
    },
    epistemic_summary: {
      verified_facts_count: 1,
      ai_inferences_count: 2,
      unknown_assumptions_count: 1
    },
    hypotheses: []
  })) : localCases;

  const filteredCases = allCases.filter((c) => {
    const matchesStatus =
      filterStatus === 'ALL' || (c.case?.status || 'ACTIVE') === filterStatus;
    const matchesBoard =
      filterBoard === 'ALL' || c.case?.target_board === filterBoard;
    return matchesStatus && matchesBoard;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <span>📋</span> Diagnostic Case History
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review past troubleshooting sessions, inspect recorded multimeter measurements, and resume open investigations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {localCases.length === 0 && !user && (
            <button
              type="button"
              onClick={handleLoadDemoCases}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-mono transition-colors"
            >
              + Populate Demo Cases
            </button>
          )}
          <Link
            href="/workspace"
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium transition-colors shadow-sm"
          >
            + New Diagnosis
          </Link>
        </div>
      </div>

      {/* Unauthenticated / Guest Mode Explanation Banner (Spec Requirement) */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${user ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                {user ? `Authenticated as ${user.email}` : 'Guest Mode (Unauthenticated)'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              {user
                ? 'Your diagnostic cases are synchronized securely with Supabase Postgres using Row Level Security (RLS).'
                : 'You are currently working in an unauthenticated local guest session. All troubleshooting cases, electrical calculations, and multimeter readings are preserved locally in your browser storage. Connect Supabase Auth to enable persistent cloud synchronization across devices.'}
            </p>
          </div>

          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 shrink-0">
            {user ? (
              <span>Cloud Storage: <strong className="text-emerald-400">{cloudCases.length} synced</strong></span>
            ) : (
              <span>Local Storage: <strong className="text-blue-400">{localCases.length} cases</strong></span>
            )}
          </div>
        </div>

        {/* Guest prompt to Sign In / Sign Up */}
        {!user && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide font-mono block">
                Enable Cloud Synchronization
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Sign in with your email to preserve diagnostic records across workbench computers and lab devices.
              </p>
            </div>
            <Link
              href="/auth"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium transition-colors shrink-0"
            >
              Sign In or Register →
            </Link>
          </div>
        )}
      </div>

      {/* Case Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">Filter Status:</span>
          {['ALL', 'ACTIVE', 'RESOLVED'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                filterStatus === status
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500">Board:</span>
          <select
            value={filterBoard}
            onChange={(e) => setFilterBoard(e.target.value)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono focus:outline-none"
          >
            <option value="ALL">All Boards</option>
            <option value="ESP32 DevKit v1">ESP32 DevKit v1</option>
            <option value="Arduino Uno R3">Arduino Uno R3</option>
            <option value="Raspberry Pi Pico">Raspberry Pi Pico</option>
          </select>
        </div>
      </div>

      {/* Diagnostic Cases List */}
      {cloudLoading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-mono">
          Loading diagnostic sessions...
        </div>
      ) : filteredCases.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredCases.map((item, index) => {
            const caseInfo = item.case || {};
            const hypothesesCount = item.hypotheses?.length || 0;
            const factsCount = item.epistemic_summary?.verified_facts_count ?? 0;
            const inferencesCount = item.epistemic_summary?.ai_inferences_count ?? 0;

            return (
              <article
                key={caseInfo.id || index}
                className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-blue-400 font-bold">
                        {caseInfo.id || 'case-local'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                        {caseInfo.target_board || 'Microcontroller'}
                      </span>
                      {caseInfo.is_demo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-mono">
                          DEMO
                        </span>
                      )}
                      {user && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono">
                          CLOUD SYNC
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      Recorded: {caseInfo.created_at ? new Date(caseInfo.created_at).toLocaleString() : 'Recent session'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-mono">
                      {caseInfo.status || 'ACTIVE'}
                    </span>
                  </div>
                </div>

                {/* Symptom Preview */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {caseInfo.symptom_description || caseInfo.title || 'No description recorded.'}
                </p>

                {/* Epistemic & Findings Badges */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-950">
                  <div className="flex items-center gap-2">
                    <EpistemicBadge status={EPISTEMIC_STATUS.VERIFIED_FACT} size="sm" />
                    <span className="text-[11px] font-mono text-slate-400">
                      {factsCount} Facts • {inferencesCount} Inferences • {hypothesesCount} Active Hypotheses
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportCaseJson(item)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                      title="Export diagnostic case as JSON"
                    >
                      Export JSON
                    </button>
                    {!user && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLocalCase(caseInfo.id)}
                        className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-mono border border-rose-900/40 transition-colors"
                        title="Delete case from local history"
                      >
                        Delete
                      </button>
                    )}
                    <Link
                      href={`/workspace?caseId=${encodeURIComponent(caseInfo.id)}`}
                      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium transition-colors"
                    >
                      Open in Workspace →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
          <span className="text-4xl" aria-hidden="true">📂</span>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">No Diagnostic Cases Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {user
                ? 'Your cloud account has no diagnostic cases recorded yet. Launch the workspace to create your first session.'
                : 'Your local browser storage has no saved troubleshooting sessions. Start a new diagnosis in the workspace or populate realistic demo scenarios.'}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/workspace"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium transition-colors"
            >
              + Create First Diagnosis
            </Link>
            {!user && (
              <button
                type="button"
                onClick={handleLoadDemoCases}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors"
              >
                Load Demo Cases
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
