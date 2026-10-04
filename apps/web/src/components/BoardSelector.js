/**
 * CircuitSage AI — Board and Component Selector
 * Enables engineers to configure target microcontroller hardware and attached discrete components.
 */

'use client';

import { useState } from 'react';
import { SUPPORTED_BOARDS, COMMON_COMPONENTS } from '../lib/constants';

export default function BoardSelector({
  selectedBoard,
  onBoardChange,
  components = [],
  onComponentsChange,
  pinConnections = '',
  onPinConnectionsChange,
  error
}) {
  const [customCompInput, setCustomCompInput] = useState('');

  const currentBoardObj = SUPPORTED_BOARDS.find((b) => b.id === selectedBoard);

  function handleAddPreset(preset) {
    const val = `${preset.label} (${preset.defaultVal})`;
    if (!components.includes(val)) {
      onComponentsChange([...components, val]);
    }
  }

  function handleAddCustom() {
    const trimmed = customCompInput.trim();
    if (trimmed && !components.includes(trimmed)) {
      onComponentsChange([...components, trimmed]);
      setCustomCompInput('');
    }
  }

  function handleRemoveComponent(index) {
    const updated = components.filter((_, i) => i !== index);
    onComponentsChange(updated);
  }

  return (
    <div className="space-y-4">
      {/* Target Microcontroller Board Selection */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="board-select" className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Target Microcontroller Board <span className="text-rose-400">*</span>
          </label>
          <span className="text-xs text-slate-500 font-mono">
            {currentBoardObj?.logicVoltage ? `Logic: ${currentBoardObj.logicVoltage}` : ''}
          </span>
        </div>

        <select
          id="board-select"
          value={selectedBoard}
          onChange={(e) => onBoardChange(e.target.value)}
          className={`w-full px-3 py-2.5 rounded-lg bg-slate-900 border text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
            error ? 'border-rose-500' : 'border-slate-800 hover:border-slate-700'
          }`}
          aria-describedby={error ? 'board-error' : undefined}
        >
          <option value="" disabled>-- Select Microcontroller --</option>
          {SUPPORTED_BOARDS.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name} ({board.logicVoltage} Logic, Max {board.maxGpioCurrent})
            </option>
          ))}
        </select>

        {error && (
          <p id="board-error" className="text-xs text-rose-400 flex items-center gap-1 mt-1">
            <span>⚠️</span> {error}
          </p>
        )}

        {/* Board Hardware Context Info */}
        {currentBoardObj && (
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-1 font-mono">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-blue-400">{currentBoardObj.name}</span>
              <span>{currentBoardObj.architecture}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              ⚡ Safe Logic Level: <span className="text-amber-300 font-semibold">{currentBoardObj.logicVoltage}</span> • Recommended Current Limit: <span className="text-slate-200">{currentBoardObj.maxGpioCurrent}</span>
            </p>
            <p className="text-[10px] text-slate-500 italic">
              {currentBoardObj.notes}
            </p>
          </div>
        )}
      </div>

      {/* Connected Components Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Connected Circuit Components
          </label>
          <span className="text-xs text-slate-500">Click presets to add</span>
        </div>

        {/* Quick Add Preset Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {COMMON_COMPONENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleAddPreset(item)}
              className="text-[11px] px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors font-mono"
            >
              + {item.label}
            </button>
          ))}
        </div>

        {/* Custom Component Entry Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customCompInput}
            onChange={(e) => setCustomCompInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            placeholder="Add custom component (e.g. 4.7kΩ Resistor, 100nF Cap)"
            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 font-mono transition-colors"
          >
            Add
          </button>
        </div>

        {/* Active Component Chips */}
        {components.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {components.map((comp, idx) => (
              <span
                key={`${comp}-${idx}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/40 border border-blue-800/60 text-blue-200 text-xs font-mono"
              >
                <span>{comp}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveComponent(idx)}
                  className="text-blue-400 hover:text-rose-400 font-bold ml-0.5 focus:outline-none"
                  aria-label={`Remove ${comp}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pin Connections Specification */}
      <div className="space-y-1.5">
        <label htmlFor="pin-connections" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
          Known Pin Connections (Optional)
        </label>
        <input
          id="pin-connections"
          type="text"
          value={pinConnections}
          onChange={(e) => onPinConnectionsChange(e.target.value)}
          placeholder="e.g. GPIO 18 -> 220Ω Resistor -> LED Anode, GND -> LED Cathode"
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600 font-mono"
        />
      </div>
    </div>
  );
}
