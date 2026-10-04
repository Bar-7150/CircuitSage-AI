import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'CircuitSage AI — System Health & Diagnostics',
  description: 'Offline-first, open-weight AI electronics debugging assistant',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen flex flex-col">
        <AuthProvider>
          <Navbar />

          <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
            {children}
          </main>

          <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
            CircuitSage AI • Offline-first hardware debugging with local Gemma 4 and Supabase Postgres RLS
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
