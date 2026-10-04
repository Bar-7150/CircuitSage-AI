/**
 * CircuitSage AI — IDE Left Sidebar Component
 *
 * Implements:
 * - Activity bar icon tabs (Explorer, Search, Board Config, Project Actions)
 * - Project file tree with active file selection & create file
 * - Search across project files
 * - Board hardware configuration (FQBN, Flash mode, Frequency, Partitions)
 * - Project build & folder actions
 */

'use client';

import { useState } from 'react';

export default function IdeLeftSidebar({
  files = [],
  activeFile,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  selectedBoard,
  onOpenWorkspaceFolder,
  onNewProject,
  projectMetadata,
  onTriggerCleanBuild,
  isBuilding
}) {
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'search' | 'board' | 'actions'
  const [searchTerm, setSearchTerm] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [editingFileName, setEditingFileName] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  // Filter files by search term
  const filteredFiles = searchTerm.trim()
    ? files.filter(
        (f) =>
          f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (f.content && f.content.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : files;

  function handleCreateFileSubmit(e) {
    e.preventDefault();
    const trimmed = newFileName.trim();
    if (trimmed) {
      onCreateFile(trimmed);
      setNewFileName('');
      setShowNewFileInput(false);
    }
  }

  function getFileIcon(fileName) {
    if (fileName.endsWith('.ino')) return '⚡';
    if (fileName.endsWith('.cpp') || fileName.endsWith('.c')) return '⚙️';
    if (fileName.endsWith('.h') || fileName.endsWith('.hpp')) return '📦';
    if (fileName.endsWith('.json')) return '🔧';
    if (fileName.endsWith('.md')) return '📝';
    return '📄';
  }

  return (
    <aside
      className="h-full bg-slate-950 border-r border-slate-800 flex select-none text-xs"
      aria-label="Left Project Explorer and Hardware Sidebar"
    >
      {/* Activity Bar Icons Strip (48px) */}
      <nav
        className="w-12 bg-slate-900/90 border-r border-slate-800/80 flex flex-col items-center py-3 gap-3 flex-shrink-0"
        aria-label="Sidebar Views"
      >
        <button
          type="button"
          onClick={() => setActiveTab('files')}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-colors ${
            activeTab === 'files'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Project Explorer (Files)"
          aria-label="Project Explorer"
        >
          📁
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-colors ${
            activeTab === 'search'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Search in Project"
          aria-label="Search"
        >
          🔍
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('board')}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-colors ${
            activeTab === 'board'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Target Board Configuration"
          aria-label="Board Configuration"
        >
          🎛️
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('actions')}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-colors ${
            activeTab === 'actions'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Project Actions & Toolchain"
          aria-label="Project Actions"
        >
          ⚡
        </button>
      </nav>

      {/* Primary Sub-panel Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        {/* 1. Files / Project Explorer View */}
        {activeTab === 'files' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
              <span className="font-semibold text-slate-300 font-mono tracking-wider text-[11px] uppercase">
                Explorer: Sketch
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowNewFileInput(!showNewFileInput)}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono text-[11px]"
                  title="New File"
                >
                  + File
                </button>
                <button
                  type="button"
                  onClick={onOpenWorkspaceFolder}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 font-mono text-[11px]"
                  title="Open Project Folder"
                >
                  📂
                </button>
              </div>
            </div>

            {/* Inline New File Input Form */}
            {showNewFileInput && (
              <form onSubmit={handleCreateFileSubmit} className="p-2 border-b border-slate-800 bg-slate-900/60">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="filename.h or test.ino"
                    className="flex-1 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewFileInput(false)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </form>
            )}

            {/* File List Tree */}
            <div className="flex-1 overflow-y-auto py-1">
              {files.map((file) => {
                const isSelected = activeFile === file.name;
                const isEditing = editingFileName === file.name;

                if (isEditing) {
                  return (
                    <form
                      key={file.name}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const trimmed = renameInput.trim();
                        if (trimmed && trimmed !== file.name && onRenameFile) {
                          onRenameFile(file.name, trimmed);
                        }
                        setEditingFileName(null);
                      }}
                      className="px-2 py-1 bg-slate-900 border-b border-slate-800 flex gap-1"
                    >
                      <input
                        type="text"
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        className="flex-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none"
                        autoFocus
                      />
                      <button type="submit" className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-mono">
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFileName(null)}
                        className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]"
                      >
                        ✕
                      </button>
                    </form>
                  );
                }

                return (
                  <div
                    key={file.name}
                    className={`group flex items-center justify-between px-3 py-1.5 cursor-pointer font-mono text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-950/60 text-blue-300 border-l-2 border-blue-500 font-medium'
                        : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                    }`}
                    onClick={() => onSelectFile(file.name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSelectFile(file.name);
                    }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{getFileIcon(file.name)}</span>
                      <span className="truncate">{file.name}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      {/* Rename button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFileName(file.name);
                          setRenameInput(file.name);
                        }}
                        className="text-slate-500 hover:text-blue-300 text-xs p-0.5 rounded"
                        title="Rename file"
                      >
                        ✎
                      </button>

                      {/* Delete button (except main sketch) */}
                      {!file.name.endsWith('.ino') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete '${file.name}'?`)) {
                              onDeleteFile(file.name);
                            }
                          }}
                          className="text-slate-500 hover:text-rose-400 text-xs p-0.5 rounded"
                          title="Delete file"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Search in Project */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col p-3 overflow-hidden space-y-3">
            <span className="font-semibold text-slate-300 font-mono tracking-wider text-[11px] uppercase">
              Search in Project
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Find symbols, pins, variables..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <div className="flex-1 overflow-y-auto space-y-2">
              <span className="text-[11px] text-slate-500 font-mono">
                {searchTerm ? `Matches (${filteredFiles.length}):` : 'All project files:'}
              </span>
              {filteredFiles.map((file) => (
                <div
                  key={file.name}
                  onClick={() => onSelectFile(file.name)}
                  className="p-2 rounded-lg bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 cursor-pointer text-xs font-mono"
                >
                  <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                    <span>{getFileIcon(file.name)}</span>
                    <span>{file.name}</span>
                  </div>
                  {file.content && searchTerm && file.content.toLowerCase().includes(searchTerm.toLowerCase()) && (
                    <p className="text-[11px] text-slate-400 truncate mt-1 italic">
                      Match found in file content
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Target Board Hardware Configuration */}
        {activeTab === 'board' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-4">
            <span className="font-semibold text-slate-300 font-mono tracking-wider text-[11px] uppercase block">
              Board Specifications
            </span>

            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Board Model</span>
                <span className="text-blue-400 font-semibold">{selectedBoard?.name || 'ESP32'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">FQBN</span>
                <span className="text-slate-300">{selectedBoard?.fqbn || 'esp32:esp32:esp32cam'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Logic Voltage</span>
                <span className="text-emerald-400">{selectedBoard?.logicVoltage || '3.3V'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Max GPIO Current</span>
                <span className="text-slate-300">{selectedBoard?.maxGpioCurrent || '40mA (12mA max safe)'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono block">
                Compiler Hardware Flags
              </span>

              <div className="space-y-1.5 text-xs font-mono">
                <label className="text-slate-500 text-[11px] block">CPU Frequency</label>
                <select className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200">
                  <option>240 MHz (WiFi / BT default)</option>
                  <option>160 MHz</option>
                  <option>80 MHz (Low Power)</option>
                </select>

                <label className="text-slate-500 text-[11px] block pt-1">Flash Frequency</label>
                <select className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200">
                  <option>80 MHz (High Speed)</option>
                  <option>40 MHz (Safe)</option>
                </select>

                <label className="text-slate-500 text-[11px] block pt-1">Partition Scheme</label>
                <select className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200">
                  <option>Huge APP (3MB No OTA / 1MB SPIFFS)</option>
                  <option>Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)</option>
                  <option>Minimal SPIFFS (1.9MB APP with OTA/190KB SPIFFS)</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/50 text-[11px] text-amber-300 font-mono space-y-1">
              <div className="font-semibold">⚠️ ESP32-CAM Notice</div>
              <p className="text-amber-400/80">
                Ensure GPIO 0 is tied to GND when flashing firmware. Disconnect GPIO 0 and reset board to execute application code.
              </p>
            </div>
          </div>
        )}

        {/* 4. Project Actions */}
        {activeTab === 'actions' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            <span className="font-semibold text-slate-300 font-mono tracking-wider text-[11px] uppercase block">
              Toolchain & Project Operations
            </span>

            <div className="space-y-2">
              <button
                type="button"
                onClick={onNewProject}
                className="w-full py-2 px-3 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-800 text-xs font-mono transition-colors text-left flex items-center justify-between"
              >
                <span>✨ New Project from Template</span>
                <span className="text-[10px] text-blue-400">ESP32 / Uno</span>
              </button>

              <button
                type="button"
                onClick={onTriggerCleanBuild}
                disabled={isBuilding}
                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-mono transition-colors text-left flex items-center justify-between"
              >
                <span>🧹 Clean Rebuild</span>
                <span className="text-[10px] text-slate-500">Purge cache</span>
              </button>

              <button
                type="button"
                onClick={onOpenWorkspaceFolder}
                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-mono transition-colors text-left flex items-center justify-between"
              >
                <span>📂 Open in OS Explorer</span>
                <span className="text-[10px] text-slate-500">Host disk</span>
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
              <span className="text-slate-300 font-medium">Build Strategy:</span>
              <p>Arduino CLI 1.5.1 via trusted local IPC execution.</p>
              <p className="text-slate-500 text-[10px]">Command: arduino-cli compile --fqbn {selectedBoard?.fqbn || 'esp32:esp32:esp32cam'}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
