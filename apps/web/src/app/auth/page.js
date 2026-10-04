'use client';

/**
 * CircuitSage AI — Supabase Authentication Page (/auth)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function AuthPage() {
  const router = useRouter();
  const { user, signIn, signUp, signOut, isConfigured } = useAuth();

  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        await signIn({ email, password });
        router.push('/diagnoses');
      } else {
        await signUp({ email, password, displayName });
        setSuccessMsg('Account created successfully! Check your email if email confirmation is enabled, or sign in now.');
        setMode('signin');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  if (user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-950/80 border border-emerald-700/80 flex items-center justify-center text-2xl">
          ✓
        </div>
        <h2 className="text-xl font-bold text-white">Already Authenticated</h2>
        <p className="text-sm text-slate-300">
          Signed in as <span className="font-mono text-emerald-400">{user.email}</span>
        </p>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/diagnoses"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
          >
            View Diagnostic Cases
          </Link>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-6 space-y-6">
      {/* Notice if Supabase credentials are not yet configured */}
      {!isConfigured && (
        <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-800 text-amber-200 text-xs space-y-2">
          <div className="font-semibold flex items-center gap-1.5 text-amber-400">
            <span>ℹ️</span> Supabase Credentials Unconfigured
          </div>
          <p className="text-amber-300/90 leading-relaxed">
            The application is currently running in local offline/guest mode. To enable persistent cloud accounts and RLS, set <code className="bg-slate-950 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-slate-950 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code className="bg-slate-950 px-1 py-0.5 rounded">apps/web/.env.local</code>.
          </p>
          <p className="text-[11px] text-amber-400/80">
            See <code className="bg-slate-950 px-1 py-0.5 rounded">docs/SUPABASE_SETUP.md</code> for setup instructions.
          </p>
        </div>
      )}

      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'signin' ? 'Sign In to CircuitSage AI' : 'Create an Account'}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'signin'
              ? 'Access your saved diagnostic cases and protected history.'
              : 'Register to synchronize troubleshooting cases across lab sessions.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMsg(null); }}
            className={`py-2 rounded-md transition-colors ${
              mode === 'signin'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(null); }}
            className={`py-2 rounded-md transition-colors ${
              mode === 'signup'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs">
            <span className="font-semibold">Error:</span> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="font-medium text-slate-300">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-medium text-slate-300">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@university.edu"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-slate-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              minLength={6}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
            {mode === 'signup' && (
              <p className="text-[10px] text-slate-500">Minimum 6 characters.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition-colors shadow-sm"
          >
            {submitting
              ? 'Processing...'
              : mode === 'signin'
              ? 'Sign In with Supabase'
              : 'Create Account'}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-800/80">
          <Link href="/diagnoses" className="hover:text-slate-300 transition-colors">
            ← Continue as Guest (Offline Mode)
          </Link>
        </div>
      </div>
    </div>
  );
}
