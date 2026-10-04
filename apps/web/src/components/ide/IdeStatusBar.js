/**
 * CircuitSage AI — IDE Status Bar Component
 *
 * Displays:
 * - Selected Target Board & FQBN
 * - Selected Serial Port & Baud Rate
 * - Editor State (Line, Column, Encoding, Language)
 * - Build State (Idle, Building, Success, Failed)
 * - AI Engine State (Gemma 4 Local)
 * - Epistemic Status (VERIFIED_FACT / AI_INFERENCE)
 */

'use client';

export default function IdeStatusBar({
  selectedBoard,
  selectedPort,
  baudRate = 115200,
  cursorPosition = { lineNumber: 1, column: 1 },
  buildState = 'idle', // 'idle' | 'building' | 'success' | 'failed'
  aiState = 'ready', // 'ready' | 'thinking' | 'offline'
  epistemicStatus = 'VERIFIED_FACT'
}) {
  return (
    <footer
      className="h-6 bg-blue-950/90 border-t border-slate-800 flex items-center justify-between px-3 text-[11px] font-mono text-slate-300 select-none flex-shrink-0 z-20"
      role="contentinfo"
      aria-label="IDE Status Bar"
    >
      {/* Left: Hardware Configuration Status */}
      <div className="flex items-center gap-3">
        {/* Board */}
        <div className="flex items-center gap-1 hover:text-white cursor-pointer" title="Target Hardware Board">
          <span className="text-slate-400">Board:</span>
          <span className="text-blue-300 font-semibold">{selectedBoard?.name || 'ESP32'}</span>
          <span className="text-slate-500 text-[10px]">({selectedBoard?.fqbn || 'esp32:esp32:esp32cam'})</span>
        </div>

        <span className="text-slate-700">|</span>

        {/* Port & Baud */}
        <div className="flex items-center gap-1 hover:text-white cursor-pointer" title="Active Serial Communication Port">
          <span className="text-slate-400">Port:</span>
          {selectedPort ? (
            <span className="text-emerald-400 font-semibold">{selectedPort}</span>
          ) : (
            <span className="text-slate-500 italic">Disconnected</span>
          )}
          <span className="text-slate-500 text-[10px]">@{baudRate}</span>
        </div>
      </div>

      {/* Center: Editor Cursor State */}
      <div className="hidden md:flex items-center gap-3 text-slate-400">
        <span>
          Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
        </span>
        <span>Spaces: 2</span>
        <span>UTF-8</span>
        <span className="text-blue-400 font-medium">C++ (Arduino)</span>
      </div>

      {/* Right: Build & AI Engine Status */}
      <div className="flex items-center gap-3">
        {/* Build State */}
        <div className="flex items-center gap-1.5" title="Toolchain Compilation State">
          <span
            className={`w-2 h-2 rounded-full ${
              buildState === 'building'
                ? 'bg-amber-400 animate-spin'
                : buildState === 'success'
                ? 'bg-emerald-400'
                : buildState === 'failed'
                ? 'bg-rose-500'
                : 'bg-slate-500'
            }`}
          />
          <span className="text-slate-400">Build:</span>
          <span
            className={`font-semibold ${
              buildState === 'building'
                ? 'text-amber-300'
                : buildState === 'success'
                ? 'text-emerald-400'
                : buildState === 'failed'
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {buildState === 'building'
              ? 'Compiling...'
              : buildState === 'success'
              ? 'Ready'
              : buildState === 'failed'
              ? 'Error'
              : 'Idle'}
          </span>
        </div>

        <span className="text-slate-700">|</span>

        {/* AI Engine Status */}
        <div className="flex items-center gap-1.5" title="Offline Gemma 4 Local Reasoning Model">
          <span
            className={`w-2 h-2 rounded-full ${
              aiState === 'thinking' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
            }`}
          />
          <span className="text-slate-400 hidden sm:inline">AI:</span>
          <span className="text-emerald-300 font-medium">
            {aiState === 'thinking' ? 'Reasoning' : 'Gemma 4 Online'}
          </span>
        </div>

        {/* Epistemic Honesty Tag */}
        <span
          className={`hidden lg:inline text-[9px] px-1 rounded font-bold ${
            epistemicStatus === 'VERIFIED_FACT'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : 'bg-blue-950 text-blue-300 border border-blue-800'
          }`}
          title="Epistemic validation status based on physical laws and toolchain facts"
        >
          {epistemicStatus === 'VERIFIED_FACT' ? 'PROVEN' : 'AI_INFERENCE'}
        </span>
      </div>
    </footer>
  );
}
