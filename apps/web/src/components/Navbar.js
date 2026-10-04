/**
 * CircuitSage AI — Top Workbench Navigation Bar
 * Integrates comprehensive product navigation, live backend health status,
 * demo mode toggle, and Supabase authentication status.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { checkServerHealth } from '../lib/api';
import { isDemoMode, setDemoMode } from '../lib/storage';

export default function Navbar() {
  const pathname = usePathname();
  const { user, loading: authLoading, signOut, isConfigured: isSupabaseConfigured } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(null);
  const [demoActive, setDemoActive] = useState(false);

  useEffect(() => {
    setDemoActive(isDemoMode());

    async function pingHealth() {
      const res = await checkServerHealth();
      setBackendOnline(res.success);
      if (!res.success && typeof window !== 'undefined' && localStorage.getItem('circuitsage_demo_mode_v1') === null) {
        setDemoMode(true);
        setDemoActive(true);
      }
    }

    pingHealth();
    const interval = setInterval(pingHealth, 30000);

    function handleDemoChange() {
      setDemoActive(isDemoMode());
    }
    window.addEventListener('circuitsage_demo_mode_changed', handleDemoChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('circuitsage_demo_mode_changed', handleDemoChange);
    };
  }, []);

  const navLinks = [
    { href: '/', label: 'Overview' },
    { href: '/workspace', label: 'Diagnostic Workspace' },
    { href: '/history', label: 'Case History' },
    { href: '/status', label: 'System & AI Status' }
  ];

  function toggleDemo() {
    const nextVal = !demoActive;
    setDemoMode(nextVal);
    setDemoActive(nextVal);
  }

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3 group focus:outline-none">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <span className="text-xl" aria-hidden="true">⚡</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-tight">CircuitSage AI</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                  v0.1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Offline-First Electronics Debugging Assistant
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Side Status Indicators & Auth Controls */}
        <div className="hidden sm:flex items-center space-x-3 text-xs">
          {/* Demo Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleDemo}
            className={`text-xs px-2.5 py-1 rounded-full border font-mono transition-colors flex items-center gap-1.5 ${
              demoActive
                ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle between local simulation (Demo Mode) and live Express API"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${demoActive ? 'bg-amber-400' : 'bg-slate-500'}`} />
            <span>{demoActive ? 'Demo Mode' : 'Live API'}</span>
          </button>

          {/* Backend Connection Indicator */}
          <div
            className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800"
            title={backendOnline === true ? 'Backend Express API is online' : 'Backend is unreachable or in offline mode'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline === true
                  ? 'bg-emerald-400'
                  : backendOnline === false
                  ? 'bg-rose-400'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-slate-400">
              {backendOnline === true ? 'API Up' : 'API Offline'}
            </span>
          </div>

          {/* Supabase Auth State */}
          {authLoading ? (
            <span className="text-slate-500 font-mono text-xs">Loading auth...</span>
          ) : user ? (
            <div className="flex items-center space-x-2 pl-1 border-l border-slate-800">
              <div className="text-right hidden md:block">
                <div className="text-slate-200 font-medium truncate max-w-[120px] text-xs">
                  {user.user_metadata?.display_name || user.email}
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {user.email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 pl-1 border-l border-slate-800">
              <Link
                href="/auth"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium transition-colors shadow-sm"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Controls */}
        <div className="flex lg:hidden items-center space-x-2">
          <button
            type="button"
            onClick={toggleDemo}
            className={`text-[10px] px-2 py-1 rounded border font-mono ${
              demoActive ? 'bg-amber-950 border-amber-600 text-amber-300' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {demoActive ? 'DEMO' : 'LIVE'}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white focus:outline-none"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-mono ${
                pathname === link.href ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            {user ? (
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="truncate max-w-[200px]">{user.email}</span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2 rounded-lg bg-blue-600 text-white text-xs font-mono font-medium"
              >
                Sign In / Sign Up
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
