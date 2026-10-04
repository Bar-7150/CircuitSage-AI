/**
 * CircuitSage AI — IDE Top Bar Component
 *
 * Provides:
 * - Branding & Project title
 * - Board selector & Port selector
 * - Build (Verify) & Upload actions with loading/progress states
 * - AI agent status badge
 * - Navigation links to Web Portal / Diagnostics
 */

'use client';

import Link from 'next/link';

export default function IdeTopBar({
  projectName,
  boards,
  selectedBoard,
  onSelectBoard,
  ports,
  selectedPort,
  onSelectPort,
  onBuild,
  isBuilding,
  onUpload,
  isUploading,
  aiStatus = 'ready',
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onToggleBottomPanel,
  activeView,
  onToggleDiagnosticView
}) {
  return (
    <header
      className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 select-none flex-shrink-0 z-20 text-xs"
      role="banner"
      aria-label="IDE Main Toolbar"
    >
      {/* Left: Branding & Project Identity */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-100 hover:text-blue-400 transition-colors font-bold tracking-tight"
          title="CircuitSage AI Home"
        >
          <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white text-xs shadow-md shadow-blue-500/20 font-mono">
            ⚡
          </span>
          <span className="hidden sm:inline font-mono font-semibold">CircuitSage</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/80 font-mono">
            IDE
          </span>
        </Link>

        <span className="text-slate-700 hidden md:inline">|</span>

        {/* Project Title */}
        <div className="flex items-center gap-1.5 text-slate-300 font-mono" title="Active Project">
          <span className="text-slate-500">📁</span>
          <span className="font-medium text-slate-200 truncate max-w-[140px] md:max-w-[200px]">
            {projectName || 'esp32_cam_project'}
          </span>
        </div>
      </div>

      {/* Center: Hardware Selection & Action Controls */}
      <div className="flex items-center gap-2">
        {/* Board Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
          <label htmlFor="top-board-select" className="text-slate-500 text-[11px] font-mono">
            Board:
          </label>
          <select
            id="top-board-select"
            value={selectedBoard?.id || selectedBoard?.name || selectedBoard || ''}
            onChange={(e) => onSelectBoard(e.target.value)}
            className="bg-transparent text-slate-200 text-xs font-mono focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[190px] truncate"
            aria-label="Select Target Hardware Board"
          >
            {boards.map((b) => (
              <option key={b.id || b.name} value={b.id || b.name} className="bg-slate-900 text-slate-200">
                {b.name || b.id}
              </option>
            ))}
          </select>
        </div>

        {/* Port Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
          <label htmlFor="top-port-select" className="text-slate-500 text-[11px] font-mono">
            Port:
          </label>
          <select
            id="top-port-select"
            value={selectedPort || ''}
            onChange={(e) => onSelectPort(e.target.value)}
            className="bg-transparent text-slate-200 text-xs font-mono focus:outline-none cursor-pointer max-w-[90px] sm:max-w-[120px]"
            aria-label="Select Serial Communication Port"
          >
            {ports.length === 0 ? (
              <option value="" className="bg-slate-900 text-slate-400">
                No Port
              </option>
            ) : (
              ports.map((p) => (
                <option key={p.path || p} value={p.path || p} className="bg-slate-900 text-slate-200">
                  {p.name || p.path || p}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Build / Verify Button */}
        <button
          type="button"
          onClick={onBuild}
          disabled={isBuilding}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
            isBuilding
              ? 'bg-amber-600/30 text-amber-200 border border-amber-500/50 cursor-wait'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 border border-emerald-500'
          }`}
          title="Compile sketch using Arduino CLI (Ctrl+B)"
          aria-label="Build Project"
        >
          {isBuilding ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-amber-300/30 border-t-amber-300 animate-spin"></span>
              <span>Compiling...</span>
            </>
          ) : (
            <>
              <span>✓</span>
              <span>Build</span>
            </>
          )}
        </button>

        {/* Upload Button */}
        <button
          type="button"
          onClick={onUpload}
          disabled={isUploading || isBuilding}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
            isUploading
              ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50 cursor-wait'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title="Flash compiled firmware binary to selected target board"
          aria-label="Upload Firmware"
        >
          {isUploading ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-blue-300/30 border-t-blue-300 animate-spin"></span>
              <span>Flashing...</span>
            </>
          ) : (
            <>
              <span>➜</span>
              <span>Upload</span>
            </>
          )}
        </button>
      </div>

      {/* Right: AI Agent Status & View Controls */}
      <div className="flex items-center gap-2.5">
        {/* Circuit Diagnostic Assistant Toggle */}
        <button
          type="button"
          onClick={onToggleDiagnosticView}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 border ${
            activeView === 'diagnostics'
              ? 'bg-blue-600/30 text-blue-200 border-blue-500'
              : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800'
          }`}
          title="Open Integrated Circuit Diagnostics & Multimeter Assistant"
        >
          <span>🔬</span>
          <span className="hidden md:inline">Circuit Triage</span>
        </button>

        {/* AI Engine Status Pill */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono"
          title="Offline-first Gemma 4 local reasoning engine"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              aiStatus === 'thinking'
                ? 'bg-amber-400 animate-ping'
                : aiStatus === 'ready'
                ? 'bg-emerald-400'
                : 'bg-slate-500'
            }`}
          />
          <span className="text-slate-300 hidden xl:inline">Gemma 4:</span>
          <span className="text-emerald-400 font-medium">
            {aiStatus === 'thinking' ? 'Thinking...' : 'Local Active'}
          </span>
        </div>

        {/* Panel Visibility Quick Toggles */}
        <div className="hidden lg:flex items-center border-l border-slate-800 pl-2 gap-1 text-slate-400">
          <button
            type="button"
            onClick={onToggleLeftSidebar}
            className="p-1 rounded hover:bg-slate-800 hover:text-slate-200 text-xs"
            title="Toggle Left Explorer"
            aria-label="Toggle Explorer"
          >
            ⊞
          </button>
          <button
            type="button"
            onClick={onToggleBottomPanel}
            className="p-1 rounded hover:bg-slate-800 hover:text-slate-200 text-xs"
            title="Toggle Bottom Terminal/Output"
            aria-label="Toggle Terminal"
          >
            ⊟
          </button>
          <button
            type="button"
            onClick={onToggleRightSidebar}
            className="p-1 rounded hover:bg-slate-800 hover:text-slate-200 text-xs"
            title="Toggle Right AI Sidebar"
            aria-label="Toggle AI Panel"
          >
            ⊞
          </button>
        </div>
      </div>
    </header>
  );
}
