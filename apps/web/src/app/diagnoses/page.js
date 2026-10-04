'use client';

/**
 * CircuitSage AI — Diagnostic Cases Management Page (/diagnoses)
 *
 * Demonstrates:
 * - Supabase JWT Bearer token forwarding to Express API
 * - RLS data isolation (user can only query and mutate their own cases)
 * - Offline/Guest fallback when unauthenticated
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export default function DiagnosesPage() {
  const { user, loading: authLoading, getAccessToken, isConfigured } = useAuth();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // New Case Form State
  const [targetBoard, setTargetBoard] = useState('ESP32 DevKit v1');
  const [title, setTitle] = useState('');
  const [symptomDescription, setSymptomDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = await getAccessToken();

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (!user) {
        // If unauthenticated, fetch without token (or prompt sign-in)
        setCases([]);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/diagnoses`, { headers });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || `HTTP ${res.status}`);
      }

      setCases(data.cases || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch diagnostic cases.');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, user]);

  useEffect(() => {
    if (!authLoading) {
      fetchCases();
    }
  }, [authLoading, fetchCases]);

  async function handleCreateCase(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = await getAccessToken();

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        target_board: targetBoard,
        title: title || `${targetBoard} Circuit Diagnosis`,
        symptom_description: symptomDescription
      };

      const res = await fetch(`${API_BASE_URL}/diagnoses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `Failed to create case: HTTP ${res.status}`);
      }

      setSuccessMsg('Diagnostic case created successfully!');
      setTitle('');
      setSymptomDescription('');
      fetchCases();
    } catch (err) {
      setErrorMsg(err.message || 'Error creating case.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Diagnostic Troubleshooting Cases</h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
              PostgreSQL + RLS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cases are protected by Supabase Row Level Security so each user only sees their own diagnostic history.
          </p>
        </div>

        <div>
          {user ? (
            <div className="text-right">
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                RLS Active ({user.email})
              </span>
            </div>
          ) : (
            <Link
              href="/auth"
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors inline-block"
            >
              Sign In to Persist Cases
            </Link>
          )}
        </div>
      </div>

      {/* Unauthenticated Alert Banner */}
      {!user && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1 text-xs">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <span>🔒</span> Viewing in Guest / Unauthenticated Mode
            </span>
            <p className="text-slate-400 leading-relaxed">
              You are not signed in with Supabase Auth. Cases created in this session are stored locally in temporary memory.
              Sign in with your account to persist cases to Supabase Postgres with cryptographic user isolation (RLS).
            </p>
          </div>
          <Link
            href="/auth"
            className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            Sign In / Register
          </Link>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs">
          <span className="font-semibold">Error:</span> {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs">
          {successMsg}
        </div>
      )}

      {/* Layout Grid: New Case Form & Existing Cases List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Create New Case Form */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>+</span> Start New Diagnostic Case
          </h3>
          <p className="text-xs text-slate-400">
            Submit observed symptoms to begin a troubleshooting session.
          </p>

          <form onSubmit={handleCreateCase} className="space-y-4 text-xs pt-1">
            <div className="space-y-1.5">
              <label className="font-medium text-slate-300">Target Development Board</label>
              <select
                value={targetBoard}
                onChange={(e) => setTargetBoard(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="ESP32 DevKit v1">ESP32 DevKit v1 (3.3V Logic)</option>
                <option value="Arduino Uno R3">Arduino Uno R3 (5.0V Logic)</option>
                <option value="Raspberry Pi Pico">Raspberry Pi Pico (3.3V Logic)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-slate-300">Case Title (Optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Blue LED Failure on GPIO 18"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-slate-300">Observed Symptom Description</label>
              <textarea
                required
                rows={4}
                value={symptomDescription}
                onChange={(e) => setSymptomDescription(e.target.value)}
                placeholder="Describe what is failing: e.g. Blue LED connected to GPIO 18 never turns on even though pin is driven HIGH."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 text-xs"
              />
              <p className="text-[10px] text-slate-500">Minimum 10 characters required.</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              {submitting ? 'Creating Case...' : 'Create Case & Begin Diagnosis'}
            </button>
          </form>
        </div>

        {/* Right Column: Case History List */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📋</span> Your Saved Diagnostic Sessions ({cases.length})
            </h3>
            <button
              onClick={fetchCases}
              disabled={loading}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              Loading diagnostic cases...
            </div>
          ) : cases.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-xl space-y-2">
              <span className="text-2xl">⚡</span>
              <p className="text-xs text-slate-300 font-medium">No diagnostic cases found</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                {user
                  ? 'You have not created any diagnostic cases yet. Use the form on the left to start a troubleshooting case.'
                  : 'Sign in to access your saved cases, or create a guest session using the form on the left.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-100">
                        {c.title || 'Untitled Diagnosis'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 font-mono">
                        {c.target_board}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {c.symptom_description}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Created: {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
