'use client';

import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export default function HealthPage() {
  const [healthData, setHealthData] = useState(null);
  const [errorData, setErrorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [test404Response, setTest404Response] = useState(null);

  async function checkHealth() {
    setLoading(true);
    setErrorData(null);
    setTest404Response(null);
    try {
      const res = await fetch(`${API_BASE_URL}/health`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `HTTP ${res.status}`);
      }
      setHealthData(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setErrorData(err.message || 'Failed to connect to backend server');
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  }

  async function trigger404Test() {
    try {
      const res = await fetch(`${API_BASE_URL}/test-unknown-route-demo`);
      const data = await res.json();
      setTest404Response(data);
    } catch (err) {
      setTest404Response({ error: { message: err.message } });
    }
  }

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white">System Status & Connectivity</h2>
          <p className="text-sm text-slate-400 mt-1">
            Testing local communications between Next.js client and Express.js REST API.
          </p>
          <div className="flex items-center gap-2 mt-3 font-mono text-xs text-slate-400">
            <span>API Target:</span>
            <code className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-blue-400">
              {API_BASE_URL}/health
            </code>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={checkHealth}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors flex items-center gap-2"
          >
            {loading ? 'Checking...' : '🔄 Refresh Health'}
          </button>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Backend Connection
          </div>
          <div className="my-4">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-amber-400 font-semibold text-lg">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
                Connecting...
              </span>
            ) : healthData ? (
              <span className="inline-flex items-center gap-2 text-emerald-400 font-semibold text-lg">
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                Connected (Online)
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-rose-400 font-semibold text-lg">
                <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                Unreachable
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {lastChecked ? `Last ping: ${lastChecked}` : 'Waiting for initial ping...'}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            AI Inference Runtime
          </div>
          <div className="my-4">
            <span className="text-slate-200 font-medium text-base">
              {healthData?.services?.local_ai_inference?.status === 'configured'
                ? 'Gemma 4 (Local Adapter)'
                : 'Standby / Localhost'}
            </span>
            <p className="text-xs text-slate-400 mt-1 font-mono truncate">
              {healthData?.services?.local_ai_inference?.runtime_url || 'http://127.0.0.1:11434'}
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Offline-first local inference
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Data Persistence Layer
          </div>
          <div className="my-4">
            <span className="text-slate-200 font-medium text-base">
              Supabase Postgres
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Mode: {healthData?.services?.database?.status || 'Offline Fallback Active'}
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Row Level Security (RLS) configured
          </div>
        </div>
      </div>

      {/* Error state alert if unreachable */}
      {errorData && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 text-sm">
          <div className="font-semibold flex items-center gap-2 text-rose-400">
            <span>⚠️</span> Backend API Unreachable
          </div>
          <p className="mt-1 text-xs text-rose-300">
            Ensure the Express backend is running on <code className="bg-slate-950 px-1 py-0.5 rounded">http://localhost:8000</code> by executing <code className="bg-slate-950 px-1 py-0.5 rounded">npm run dev:api</code>.
          </p>
          <p className="mt-1 text-xs text-rose-400 font-mono">Error details: {errorData}</p>
        </div>
      )}

      {/* Raw Payload Inspection & 404 Error Test */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Live API Payload (/api/v1/health)</h3>
            <span className="text-xs text-slate-500 font-mono">HTTP 200 OK</span>
          </div>
          <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-64">
            {healthData ? JSON.stringify(healthData, null, 2) : '// No data received yet'}
          </pre>
        </div>

        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Central Error Handler Verification</h3>
            <button
              onClick={trigger404Test}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono"
            >
              Trigger 404 Route
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Click to send a request to an unregistered endpoint to verify that Express returns our standardized JSON error envelope:
          </p>
          <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-amber-400 overflow-x-auto max-h-64">
            {test404Response ? JSON.stringify(test404Response, null, 2) : '// Click "Trigger 404 Route" to test standard error schema'}
          </pre>
        </div>
      </div>

      {/* Epistemic Badges Preview */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold text-white">Epistemic Status Design System</h3>
        <p className="text-xs text-slate-400">
          The CircuitSage UI categorizes all diagnostic evidence into three strict epistemic states to prevent ungrounded AI hallucinations:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-slate-950 border-2 border-emerald-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-xs text-emerald-400 uppercase tracking-wide">
                Verified Fact
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              Directly grounded in manufacturer datasheets or user physical multimeter measurements.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border-2 border-amber-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="font-semibold text-xs text-amber-400 uppercase tracking-wide">
                AI Inference
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              Probabilistic hypothesis generated by Gemma 4. Requires physical multimeter validation.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border-2 border-dashed border-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              <span className="font-semibold text-xs text-slate-400 uppercase tracking-wide">
                Unknown Assumption
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              Unmeasured critical parameter. The engine refuses to guess or invent default safe values.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
