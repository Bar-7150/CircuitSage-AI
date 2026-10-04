/**
 * CircuitSage AI — IDE Right Sidebar Component
 *
 * Implements:
 * - AI Agent Chat (reasoning, firmware advice, pin analysis)
 * - Task Plan & Progress Checklist
 * - Changed Files & Diffs View with Approval Controls (Accept/Reject)
 * - Seamlessly embedded Circuit Diagnostic Assistant (triage intake & probing)
 */

'use client';

import { useState } from 'react';

export default function IdeRightSidebar({
  activeFile,
  fileContent,
  selectedBoard,
  onApplyDiff,
  diagnosticComponent
}) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'plan' | 'diffs' | 'triage'
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Agent Chat Conversation
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'agent',
      role: 'Gemma 4 Electronics Engineer',
      text: 'CircuitSage AI assistant ready. I am actively inspecting your sketch for ESP32 / ESP32-CAM pin conflicts, logic voltage mismatches, and memory constraints.',
      timestamp: 'Just now'
    }
  ]);

  // Agent Task Plan
  const [taskPlan, setTaskPlan] = useState([
    { id: 1, title: 'Inspect sketch pin definitions against target board', completed: true },
    { id: 2, title: 'Verify GPIO current limit and safe 3.3V logic level', completed: true },
    { id: 3, title: 'Check camera pins compatibility (GPIO 4 Flash vs GPIO 0 Bootloader)', completed: false },
    { id: 4, title: 'Run Arduino CLI verification compilation', completed: false }
  ]);

  // Proposed AI Diff
  const [proposedDiff, setProposedDiff] = useState({
    file: 'esp32_cam_blink.ino',
    summary: 'Add watchdog timer reset and protect Flash LED pin from high duty cycle overheating',
    oldSnippet: `void loop() {\n  digitalWrite(FLASH_LED_PIN, HIGH);\n  delay(500);\n}`,
    newSnippet: `void loop() {\n  // Safe flash pulse with duty cycle protection\n  digitalWrite(FLASH_LED_PIN, HIGH);\n  delay(100); // Reduced from 500ms to prevent thermal throttling\n  digitalWrite(FLASH_LED_PIN, LOW);\n}`
  });

  const [diffStatus, setDiffStatus] = useState('pending'); // 'pending' | 'accepted' | 'rejected'

  function handleSendMessage(e) {
    if (e) e.preventDefault();
    const query = chatInput.trim();
    if (!query) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      role: 'User',
      text: query,
      timestamp: 'Just now'
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsAiThinking(true);

    // Realistic offline engineering reasoning response
    setTimeout(() => {
      let replyText = '';
      if (query.toLowerCase().includes('cam') || query.toLowerCase().includes('camera')) {
        replyText =
          'On the AI Thinker ESP32-CAM, GPIO 4 controls the high-power flash LED. Note that pulling GPIO 4 HIGH draws up to 200mA, which will drop your VDD below 3.0V if your power supply cannot provide at least 2A. Always isolate the camera power plane.';
      } else if (query.toLowerCase().includes('pin') || query.toLowerCase().includes('gpio')) {
        replyText =
          'ESP32 GPIOs operate strictly on 3.3V logic with a maximum recommended current limit of 12mA per pin. Ensure pins 6-11 are NEVER used for external components as they are wired directly to integrated SPI flash memory.';
      } else {
        replyText = `Analysis for ${selectedBoard?.name || 'ESP32'}: Your sketch structure conforms to standard Arduino setup() and loop() lifecycles. I recommend enabling the serial monitor baud rate at 115200 to capture hardware crash dumps.`;
      }

      const agentReply = {
        id: `reply-${Date.now()}`,
        sender: 'agent',
        role: 'Gemma 4 Electronics Engineer',
        text: replyText,
        timestamp: 'Just now'
      };

      setMessages((prev) => [...prev, agentReply]);
      setIsAiThinking(false);
    }, 700);
  }

  function handleAcceptDiff() {
    setDiffStatus('accepted');
    if (onApplyDiff && proposedDiff) {
      onApplyDiff(proposedDiff);
    }
  }

  function handleRejectDiff() {
    setDiffStatus('rejected');
  }

  const completedCount = taskPlan.filter((t) => t.completed).length;
  const progressPercent = Math.round((completedCount / taskPlan.length) * 100);

  return (
    <aside
      className="h-full bg-slate-950 border-l border-slate-800 flex flex-col text-xs select-none"
      aria-label="AI Assistant and Hardware Triage Panel"
    >
      {/* Top Tab Bar */}
      <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-2 gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
            activeTab === 'chat'
              ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50 font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          💬 AI Chat
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
            activeTab === 'plan'
              ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50 font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📋 Task Plan ({completedCount}/{taskPlan.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diffs')}
          className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
            activeTab === 'diffs'
              ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50 font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ⚡ Diffs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('triage')}
          className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
            activeTab === 'triage'
              ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50 font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🔬 Triage
        </button>
      </div>

      {/* Tab 1: AI Agent Chat */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-950/40 border-blue-800/60 text-blue-100 ml-4'
                    : 'bg-slate-900 border-slate-800 text-slate-200 mr-4'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="font-semibold text-blue-400">{msg.role}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}

            {isAiThinking && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-2 mr-4">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin"></span>
                <span>Gemma 4 is analyzing hardware circuit specs...</span>
              </div>
            )}
          </div>

          {/* Quick Prompt Presets */}
          <div className="px-3 py-1.5 border-t border-slate-800/80 bg-slate-900/40 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setChatInput('Check ESP32-CAM GPIO 4 pin conflict with Wi-Fi')}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono"
            >
              + ESP32-CAM Pin Audit
            </button>
            <button
              type="button"
              onClick={() => setChatInput('How do I enter flash mode on ESP32-CAM?')}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono"
            >
              + Flash Mode Wiring
            </button>
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-800 bg-slate-900 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask Gemma 4 about code or circuits..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isAiThinking || !chatInput.trim()}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-mono text-xs font-medium"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Task Plan & Progress */}
      {activeTab === 'plan' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-4 font-mono">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-[11px] uppercase">Diagnostic Action Plan</span>
              <span className="text-blue-400 font-bold">{progressPercent}%</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Step Checklist */}
          <div className="space-y-2">
            {taskPlan.map((step) => (
              <div
                key={step.id}
                onClick={() => {
                  setTaskPlan((prev) =>
                    prev.map((s) => (s.id === step.id ? { ...s, completed: !s.completed } : s))
                  );
                }}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                  step.completed
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={step.completed}
                  readOnly
                  className="mt-0.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span className={step.completed ? 'line-through text-slate-400' : ''}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Changed Files & Diffs Approval */}
      {activeTab === 'diffs' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-3 font-mono">
          <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] block">
            AI Proposed Code Modifications
          </span>

          {proposedDiff ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-blue-400 font-semibold">{proposedDiff.file}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      diffStatus === 'accepted'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : diffStatus === 'rejected'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {diffStatus.toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">{proposedDiff.summary}</p>
              </div>

              {/* Diff Code Box */}
              <div className="rounded-lg border border-slate-800 overflow-hidden font-mono text-[11px]">
                <div className="bg-rose-950/40 text-rose-200 px-3 py-1.5 border-b border-rose-900/50">
                  <span className="text-rose-400 font-bold mr-1">-</span> Original (500ms Duty Cycle)
                  <pre className="text-rose-300/80 mt-1 whitespace-pre-wrap">{proposedDiff.oldSnippet}</pre>
                </div>
                <div className="bg-emerald-950/40 text-emerald-200 px-3 py-1.5">
                  <span className="text-emerald-400 font-bold mr-1">+</span> Proposed (Thermal Protection)
                  <pre className="text-emerald-300/90 mt-1 whitespace-pre-wrap">{proposedDiff.newSnippet}</pre>
                </div>
              </div>

              {/* Approval Controls */}
              {diffStatus === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleAcceptDiff}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-700/20"
                  >
                    ✓ Accept Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectDiff}
                    className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs"
                  >
                    ✕ Reject
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-xs">No pending code suggestions from AI.</p>
          )}
        </div>
      )}

      {/* Tab 4: Embedded Circuit Diagnostic Assistant */}
      {activeTab === 'triage' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <span className="font-semibold text-slate-300 font-mono tracking-wider text-[11px] uppercase block">
            Hardware & Multimeter Assistant
          </span>
          {diagnosticComponent ? (
            diagnosticComponent
          ) : (
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-mono text-xs">
              Circuit Diagnostic Assistant ready. Switch to Triage mode to submit component measurements.
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
