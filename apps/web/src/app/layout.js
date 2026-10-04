import './globals.css';

export const metadata = {
  title: 'CircuitSage AI — System Health & Diagnostics',
  description: 'Offline-first, open-weight AI electronics debugging assistant',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h1 className="font-bold text-lg text-slate-100 leading-tight">CircuitSage AI</h1>
                <p className="text-xs text-slate-400">Offline-First Electronics Debugging Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                v0.1.0 (Kenshi)
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-slate-800 mt-16 py-6 text-center text-xs text-slate-500">
          CircuitSage AI • Developed for offline hardware debugging with local Gemma 4
        </footer>
      </body>
    </html>
  );
}
