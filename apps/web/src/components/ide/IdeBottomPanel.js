/**
 * CircuitSage AI — IDE Bottom Panel Component
 *
 * Implements:
 * - Problems View (structured compiler errors, warnings, click-to-jump)
 * - Build Output (terminal stream, memory usage gauges, duration)
 * - Serial Monitor (baud rate selector, autoscroll, text transmission)
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
  serialLogs = [],
  onSendSerial,
  onClearSerial,
  selectedPort,
  baudRate = 115200,
  onChangeBaudRate,
  taskLogs = [],
  onClosePanel
}) {
  const [serialInput, setSerialInput] = useState('');
  const [autoscroll, setAutoscroll] = useState(true);

  const serialEndRef = useRef(null);
  const outputEndRef = useRef(null);

  // Auto-scroll serial monitor to bottom
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
      onSendSerial(trimmed);
      setSerialInput('');
    }
  }

  const errorCount = problems.filter((p) => p.severity === 'error').length;
  const warningCount = problems.filter((p) => p.severity === 'warning').length;

  return (
    <section
      className="h-full bg-slate-950 border-t border-slate-800 flex flex-col text-xs select-none"
      aria-label="Bottom Output and Serial Panel"
    >
      {/* Panel Tab Navigation Strip */}
      <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          {/* Problems Tab */}
          <button
            type="button"
            onClick={() => onSelectTab('problems')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
              activeTab === 'problems'
                ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Problems</span>
            {problems.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  errorCount > 0 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300'
                }`}
              >
                {problems.length}
              </span>
            )}
          </button>

          {/* Build Output Tab */}
          <button
            type="button"
            onClick={() => onSelectTab('output')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
              activeTab === 'output'
                ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Build Output</span>
            {isBuilding && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            )}
          </button>

          {/* Serial Monitor Tab */}
          <button
            type="button"
            onClick={() => onSelectTab('serial')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
              activeTab === 'serial'
                ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Serial Monitor</span>
            {selectedPort ? (
              <span className="text-[10px] text-emerald-400">({selectedPort})</span>
            ) : (
              <span className="text-[10px] text-slate-500">(Offline)</span>
            )}
          </button>

          {/* Task Logs Tab */}
          <button
            type="button"
            onClick={() => onSelectTab('logs')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              activeTab === 'logs'
                ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Task Logs
          </button>
        </div>

        {/* Panel Action Controls */}
        <div className="flex items-center gap-2">
          {activeTab === 'serial' && (
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <label className="flex items-center gap-1 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoscroll}
                  onChange={(e) => setAutoscroll(e.target.checked)}
                  className="rounded text-blue-500"
                />
                <span>Autoscroll</span>
              </label>

              <select
                value={baudRate}
                onChange={(e) => onChangeBaudRate && onChangeBaudRate(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 text-[11px]"
              >
                <option value={9600}>9600 baud</option>
                <option value={57600}>57600 baud</option>
                <option value={74880}>74880 baud (ESP boot)</option>
                <option value={115200}>115200 baud</option>
                <option value={460800}>460800 baud</option>
                <option value={921600}>921600 baud</option>
              </select>

              <button
                type="button"
                onClick={onClearSerial}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                title="Clear Serial Monitor"
              >
                Clear
              </button>
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

      {/* Tab 2: Build Output */}
      {activeTab === 'output' && (
        <div className="flex-1 overflow-y-auto bg-slate-950 p-3 font-mono text-xs space-y-3">
          {/* Build Memory & Telemetry Summary */}
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
                  {buildResult.success ? 'BUILD SUCCESSFUL' : 'BUILD FAILED'}
                </span>
                <span className="text-slate-400 text-[11px]">
                  Duration: {buildResult.durationMs ? `${(buildResult.durationMs / 1000).toFixed(2)}s` : '0s'}
                </span>
              </div>

              {/* Memory Consumption Gauges */}
              {buildResult.memoryUsage?.programStorage && (
                <div className="flex items-center gap-4 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Flash:</span>
                    <span className="text-blue-400 font-semibold">
                      {buildResult.memoryUsage.programStorage.percentage}%
                    </span>
                    <span className="text-slate-500">
                      ({Math.round(buildResult.memoryUsage.programStorage.usedBytes / 1024)} KB /{' '}
                      {Math.round(buildResult.memoryUsage.programStorage.maxBytes / 1024)} KB)
                    </span>
                  </div>

                  {buildResult.memoryUsage?.dynamicMemory && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">RAM:</span>
                      <span className="text-emerald-400 font-semibold">
                        {buildResult.memoryUsage.dynamicMemory.percentage}%
                      </span>
                      <span className="text-slate-500">
                        ({Math.round(buildResult.memoryUsage.dynamicMemory.usedBytes / 1024)} KB)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Raw Terminal Stream */}
          <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed select-text font-mono">
            {buildOutput || 'Build output console ready. Click "Build" (Ctrl+B) to compile sketch.'}
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
                {selectedPort
                  ? `Serial monitor listening on ${selectedPort} at ${baudRate} baud...`
                  : 'No hardware serial port connected. Connect microcontroller to begin streaming telemetry.'}
              </p>
            ) : (
              serialLogs.map((log, idx) => (
                <div key={idx} className="leading-snug">
                  <span className="text-slate-600 mr-2">[{log.time || '00:00:00'}]</span>
                  <span className={log.isError ? 'text-rose-400' : 'text-slate-200'}>{log.text}</span>
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
              placeholder="Send data to board (e.g. AT, STATUS, 1)..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
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
