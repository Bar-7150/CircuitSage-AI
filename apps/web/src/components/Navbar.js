'use client';

/**
 * CircuitSage AI — Top Navigation Bar with Authentication Status
 */

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, loading, signOut, isConfigured } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <span className="text-2xl transition-transform group-hover:scale-110">⚡</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-100 leading-tight">CircuitSage AI</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/80 font-mono">
                  v0.1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Offline-First Electronics Debugging Assistant</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-4 text-xs font-medium text-slate-300">
            <Link href="/" className="hover:text-white transition-colors">
              System Health
            </Link>
            <Link href="/diagnoses" className="hover:text-white transition-colors flex items-center gap-1.5">
              <span>Diagnostic Cases</span>
              {user && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              )}
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          {/* Supabase status badge */}
          <span className={`px-2 py-1 rounded-full text-[11px] border font-mono hidden sm:inline-block ${
            isConfigured
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
              : 'bg-slate-800/80 text-slate-400 border-slate-700'
          }`}>
            {isConfigured ? '● Supabase Active' : '○ Supabase Unconfigured (Guest Mode)'}
          </span>

          {loading ? (
            <span className="text-slate-500 font-mono text-xs">Loading auth...</span>
          ) : user ? (
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="text-slate-200 font-medium truncate max-w-[140px] text-xs">
                  {user.user_metadata?.display_name || user.email}
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                  {user.email}
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/auth"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
              >
                Sign In / Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
