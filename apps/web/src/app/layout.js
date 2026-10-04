import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import AppShell from '../components/AppShell';

export const metadata = {
  title: 'CircuitSage AI — IoT Desktop IDE & Diagnostic Assistant',
  description: 'AI-assisted, offline-first breadboard and microcontroller circuit diagnostics powered by Gemma 4 and deterministic engineering rules.'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        <AuthProvider>
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
