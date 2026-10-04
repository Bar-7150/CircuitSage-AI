/**
 * CircuitSage AI — Dynamic Application Shell
 *
 * Checks current pathname:
 * - If on `/workspace` (IDE Desktop Workspace): renders full-viewport canvas without extra padding or footer.
 * - For all other pages (`/`, `/status`, `/diagnoses`, etc.): renders standard responsive Navbar, container, and Footer.
 */

'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isIdeWorkspace = pathname === '/workspace';

  if (isIdeWorkspace) {
    return (
      <main className="w-full h-screen overflow-hidden bg-slate-950">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
