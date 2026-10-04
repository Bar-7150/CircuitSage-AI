/**
 * CircuitSage AI — IDE Bottom Panel Component
 *
 * Implements:
 * - Problems View (structured compiler errors, warnings, click-to-jump)
 * - Build Output (terminal stream, memory usage gauges, duration)
 * - Serial Monitor (connect/disconnect, baud rates, line endings, autoscroll/pause, copy, save log, AI telemetry authorization)
 * - Task Logs (process execution logs, toolchain status)
 */

'use client';

import { useState, useRef, useEffect } from 'react';

export default function IdeBottomPanel({
  activeTab = 'output',
  onSelectTab,
  problems = [],
  onSelectProblem,
  buildOutput = '',
  buildResult = null,
  isBuilding = false,
  isUploading = false,
  serialLogs = [],
  onSendSerial,
  onClearSerial,
  selectedPort,
  baudRate = 115200,
  onChangeBaudRate,
  taskLogs = [],
  onClosePanel,
  isSerialConnected = false,
  onToggleConnectSerial,
  lineEnding = 'lf',
  onChangeLineEnding,
  onSaveSerialLog,
  aiAuthorized = false,
  onToggleAiAuthorization
}) {
  const [serialInput, setSerialInput] = useState('');
  const [autoscroll, setAutoscroll] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const serialEndRef = useRef(null);
  const outputEndRef = useRef(null);

  // Auto-scroll serial monitor to bottom if enabled
  useEffect(() => {
    if (autoscroll && serialEndRef.current) {
      serialEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serialLogs, autoscroll]);

  // Auto-scroll build output
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [buildOutput]);

  function handleSendSerialSubmit(e) {
    e.preventDefault();
    const trimmed = serialInput.trim();
    if (trimmed && onSendSerial) {
      onSendSerial(trimmed, lineEnding);
      setSerialInput('');
    }
  }

  function handleCopyLogs() {
    if (serialLogs.length === 0) return;
    const text = serialLogs.map((l) => `[${l.time || '00:00:00'}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }

  const errorCount = problems.filter((p) => p.severity === 'error').length;
  const warningCount = problems.filter((p) => p.severity === 'warning').length;

  return (
    <section
      className="h-full flex flex-col bg-slate-950 border-t border-slate-800 text-xs select-none"
      aria-label="IDE Terminal and Problems Console"
    >
      {/* Tab Header Bar */}
      <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          {/* Tab 1: Problems */}
          <button
            type="button"
            onClick={() => onSelectTab('problems')}
            className={`px-3 py-1.5 rounded-t text-xs font-mono transition-colors flex items-center gap-1.5 ${
              activeTab === 'problems'
                ? 'bg-slate-950 text-slate-100 border-t-2 border-t-blue-500 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Problems</span>
            {errorCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-900/60 text-rose-300 text-[10px] font-bold">
                {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-900/60 text-amber-300 text-[10px] font-bold">
                {warningCount}
              </span>
            )}
          </button>

          {/* Tab 2: Build Output */}
          <button
            type="button"
            onClick={() => onSelectTab('output')}
            className={`px-3 py-1.5 rounded-t text-xs font-mono transition-colors flex items-center gap-1.5 ${
              activeTab === 'output'
                ? 'bg-slate-950 text-slate-100 border-t-2 border-t-blue-500 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Build & Flash Output</span>
            {isBuilding && (
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" title="Compiling"></span>
            )}
            {isUploading && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="Uploading"></span>
            )}
          </button>

          {/* Tab 3: Serial Monitor */}
          <button
            type="button"
            onClick={() => onSelectTab('serial')}
            className={`px-3 py-1.5 rounded-t text-xs font-mono transition-colors flex items-center gap-1.5 ${
              activeTab === 'serial'
                ? 'bg-slate-950 text-slate-100 border-t-2 border-t-blue-500 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Serial Monitor</span>
            {isSerialConnected ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Connected"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-600" title="Disconnected"></span>
            )}
          </button>

          {/* Tab 4: Task Logs */}
          <button
            type="button"
            onClick={() => onSelectTab('logs')}
            className={`px-3 py-1.5 rounded-t text-xs font-mono transition-colors ${
              activeTab === 'logs'
                ? 'bg-slate-950 text-slate-100 border-t-2 border-t-blue-500 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Process Logs
          </button>
        </div>

        {/* Tab Right Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {activeTab === 'serial' && (
            <div className="flex items-center gap-2">
              {/* Upload Pause Warning Indicator */}
              {isUploading && (
                <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800 animate-pulse">
                  Paused for Upload
                </span>
              )}

              {/* Connect / Disconnect Toggle Button */}
              <button
                type="button"
                onClick={onToggleConnectSerial}
                className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  isSerialConnected
                    ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                }`}
                title={isSerialConnected ? 'Disconnect Serial Port' : 'Connect Serial Port'}
              >
                <span>{isSerialConnected ? '🔌 Disconnect' : '⚡ Connect'}</span>
              </button>

              {/* Baud Rate Selector */}
              <select
                value={baudRate}
                onChange={(e) => onChangeBaudRate && onChangeBaudRate(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 text-[11px] focus:outline-none"
                title="Select Baud Rate"
              >
                <option value={1200}>1200 baud</option>
                <option value={9600}>9600 baud</option>
                <option value={19200}>19200 baud</option>
                <option value={38400}>38400 baud</option>
                <option value={57600}>57600 baud</option>
                <option value={74880}>74880 baud (ESP boot)</option>
                <option value={115200}>115200 baud</option>
                <option value={230400}>230400 baud</option>
                <option value={460800}>460800 baud</option>
                <option value={921600}>921600 baud</option>
              </select>

              {/* Line Ending Selector */}
              <select
                value={lineEnding}
                onChange={(e) => onChangeLineEnding && onChangeLineEnding(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 text-[11px] focus:outline-none"
                title="Line Ending Transmission Terminator"
              >
                <option value="lf">Newline (LF)</option>
                <option value="crlf">Both (CRLF)</option>
                <option value="cr">Carriage Return (CR)</option>
                <option value="none">No line ending</option>
              </select>

              {/* Autoscroll Toggle */}
              <button
                type="button"
                onClick={() => setAutoscroll(!autoscroll)}
                className={`px-2 py-0.5 rounded border text-[11px] ${
                  autoscroll
                    ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
                title={autoscroll ? 'Click to Pause Display' : 'Click to Resume Autoscroll'}
              >
                {autoscroll ? 'Scroll: ON' : 'Scroll: PAUSED'}
              </button>

              {/* Copy Logs */}
              <button
                type="button"
                onClick={handleCopyLogs}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                title="Copy all serial logs"
              >
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>

              {/* Save Log to File */}
              {onSaveSerialLog && (
                <button
                  type="button"
                  onClick={onSaveSerialLog}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                  title="Save serial log to file in workspace"
                >
                  Save Log
                </button>
              )}

              {/* Clear Output */}
              <button
                type="button"
                onClick={onClearSerial}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                title="Clear Serial Monitor"
              >
                Clear
              </button>

              {/* AI Authorization Toggle */}
              {onToggleAiAuthorization && (
                <label className="flex items-center gap-1 cursor-pointer text-[10px] text-slate-400 pl-1 border-l border-slate-800">
                  <input
                    type="checkbox"
                    checked={aiAuthorized}
                    onChange={(e) => onToggleAiAuthorization(e.target.checked)}
                    className="rounded text-blue-500"
                  />
                  <span>AI Telemetry</span>
                </label>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onClosePanel}
            className="text-slate-500 hover:text-slate-200 text-xs px-1"
            title="Collapse bottom panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tab 1: Problems View */}
      {activeTab === 'problems' && (
        <div className="flex-1 overflow-y-auto bg-slate-950 p-2 font-mono">
          {problems.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs gap-2">
              <span className="text-emerald-400">✓</span>
              <span>No syntax or compiler problems detected in workspace.</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[11px] text-slate-400 pb-1 flex gap-3">
                <span className="text-rose-400">{errorCount} Errors</span>
                <span className="text-amber-400">{warningCount} Warnings</span>
              </div>
              {problems.map((prob, idx) => (
                <div
                  key={`${prob.file}-${prob.line}-${idx}`}
                  onClick={() => onSelectProblem && onSelectProblem(prob)}
                  className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer text-xs"
                >
                  <span className={prob.severity === 'error' ? 'text-rose-400' : 'text-amber-400'}>
                    {prob.severity === 'error' ? '❌' : '⚠️'}
                  </span>
                  <span className="text-slate-200 flex-1 truncate">{prob.message}</span>
                  <span className="text-blue-400 font-semibold">{prob.file.split(/[\\/]/).pop()}</span>
                  <span className="text-slate-500">
                    [{prob.line}:{prob.column || 0}]
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Build & Flash Output */}
      {activeTab === 'output' && (
        <div className="flex-1 overflow-y-auto bg-slate-950 p-3 font-mono text-xs space-y-3">
          {/* Build / Upload Telemetry Summary */}
          {buildResult && (
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    buildResult.success
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {buildResult.isUpload
                    ? buildResult.success ? 'FLASH UPLOAD SUCCESSFUL' : 'FLASH UPLOAD FAILED'
                    : buildResult.success ? 'BUILD SUCCESSFUL' : 'BUILD FAILED'}
                </span>
                <span className="text-slate-400 text-[11px]">
                  Duration: {buildResult.durationMs ? `${(buildResult.durationMs / 1000).toFixed(2)}s` : '0s'}
                </span>
              </div>

              {/* Memory Consumption Gauges */}
              {buildResult.memoryUsage?.programStorage && (
                <div className="flex items-center gap-4 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Flash:</span>
                    <span className="font-semibold">{buildResult.memoryUsage.programStorage.percentage}%</span>
                    <span className="text-slate-500">
                      ({(buildResult.memoryUsage.programStorage.usedBytes / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">RAM:</span>
                    <span className="font-semibold">{buildResult.memoryUsage.dynamicMemory.percentage}%</span>
                    <span className="text-slate-500">
                      ({(buildResult.memoryUsage.dynamicMemory.usedBytes / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mandatory Hardware Circuit Disclaimer */}
          {buildResult?.disclaimer && (
            <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/60 text-blue-200 text-[11px] flex items-start gap-2">
              <span className="text-blue-400 font-bold">ℹ️</span>
              <span>{buildResult.disclaimer}</span>
            </div>
          )}

          {/* Upload Diagnostics Troubleshooting Cards */}
          {Array.isArray(buildResult?.diagnostics) && buildResult.diagnostics.length > 0 && (
            <div className="space-y-2">
              {buildResult.diagnostics.map((diag, i) => (
                <div key={i} className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-200 space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{diag.title}</span>
                  </div>
                  <p className="text-slate-300">{diag.message}</p>
                  {diag.remedy && (
                    <div className="pt-1.5 text-amber-300 whitespace-pre-wrap font-sans text-xs">
                      <strong>Recommended Fix:</strong>
                      <div className="mt-0.5">{diag.remedy}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Raw Terminal Stream */}
          <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed select-text font-mono">
            {buildOutput || 'Build output console ready. Click "Build" (Ctrl+B) or "Upload" to begin.'}
          </pre>
          <div ref={outputEndRef} />
        </div>
      )}

      {/* Tab 3: Serial Monitor */}
      {activeTab === 'serial' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 text-slate-300 select-text">
            {serialLogs.length === 0 ? (
              <p className="text-slate-600 italic">
                {isSerialConnected
                  ? `Serial monitor connected to ${selectedPort} at ${baudRate} baud. Awaiting telemetry...`
                  : `Serial port disconnected. Click "Connect" above to stream telemetry from ${selectedPort || 'board'}.`}
              </p>
            ) : (
              serialLogs.map((log, idx) => (
                <div key={idx} className="leading-snug">
                  <span className="text-slate-600 mr-2">[{log.time || '00:00:00'}]</span>
                  <span className={log.isError ? 'text-rose-400' : log.isSend ? 'text-sky-400' : 'text-slate-200'}>
                    {log.text}
                  </span>
                </div>
              ))
            )}
            <div ref={serialEndRef} />
          </div>

          {/* Serial Transmission Input Box */}
          <form onSubmit={handleSendSerialSubmit} className="p-2 border-t border-slate-800 bg-slate-900 flex gap-2">
            <input
              type="text"
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              placeholder={isSerialConnected ? 'Send text to microcontroller...' : 'Connect serial port to transmit data...'}
              disabled={!isSerialConnected && !serialLogs.length}
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!serialInput.trim()}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-mono text-xs font-medium"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Task Logs */}
      {activeTab === 'logs' && (
        <div className="flex-1 overflow-y-auto p-3 bg-slate-950 font-mono text-xs space-y-1.5 text-slate-400 select-text">
          <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
            ⚡ CircuitSage Desktop Shell IPC & Toolchain Process Monitor
          </div>
          {taskLogs.map((log, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="text-slate-600">[{log.time}]</span>
              <span className="text-blue-400 font-semibold">{log.source}:</span>
              <span className="text-slate-300">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
