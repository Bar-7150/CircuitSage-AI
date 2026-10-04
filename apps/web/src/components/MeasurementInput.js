/**
 * CircuitSage AI — Multimeter Measurement Input Form
 * Enables physical probing data entry to validate or eliminate fault hypotheses.
 */

'use client';

import { useState, useEffect } from 'react';
import { MEASUREMENT_TYPES } from '../lib/constants';
import { validateMeasurement } from '../lib/validation';

export default function MeasurementInput({
  initialTest,
  onSubmit,
  onCancel,
  isSubmitting
}) {
  const [measurementType, setMeasurementType] = useState(
    initialTest?.tool?.includes('Resistance') ? 'RESISTANCE' : 'VOLTAGE_DC'
  );
  const [numericValue, setNumericValue] = useState('');
  const [unit, setUnit] = useState('V');
  const [probePositive, setProbePositive] = useState(initialTest?.probe_positive || '');
  const [probeNegative, setProbeNegative] = useState(initialTest?.probe_negative || 'GND');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  // Sync when initialTest changes
  useEffect(() => {
    if (initialTest) {
      if (initialTest.probe_positive) setProbePositive(initialTest.probe_positive);
      if (initialTest.probe_negative) setProbeNegative(initialTest.probe_negative);
    }
  }, [initialTest]);

  const currentTypeConfig =
    MEASUREMENT_TYPES.find((m) => m.id === measurementType) || MEASUREMENT_TYPES[0];

  function handleTypeChange(newType) {
    setMeasurementType(newType);
    const conf = MEASUREMENT_TYPES.find((m) => m.id === newType);
    if (conf) {
      setUnit(conf.defaultUnit);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      test_id: initialTest?.test_id || 'manual_probing',
      measurement_type: measurementType,
      numeric_value: numericValue,
      unit,
      probe_positive: probePositive,
      probe_negative: probeNegative,
      notes
    };

    const validation = validateMeasurement(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    onSubmit(payload);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 rounded-xl bg-slate-900 border border-blue-500/50 space-y-4 shadow-xl text-slate-100"
      aria-label="Multimeter measurement entry form"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🔬</span>
          <div>
            <h4 className="text-sm font-semibold text-white">
              Log Physical Multimeter Measurement
            </h4>
            <p className="text-xs text-slate-400">
              Submit empirical readings to eliminate false hypotheses.
            </p>
          </div>
        </div>

        {initialTest?.title && (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-700/60 text-blue-300">
            For: {initialTest.title}
          </span>
        )}
      </div>

      {initialTest?.instructions && (
        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
          <span className="text-blue-400 font-semibold font-mono">Suggested Procedure:</span> {initialTest.instructions}
        </div>
      )}

      {/* Measurement Mode Tabs */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
          Multimeter Mode
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MEASUREMENT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTypeChange(t.id)}
              className={`p-2 text-xs rounded-lg border font-mono transition-colors text-center ${
                measurementType === t.id
                  ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-semibold'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {errors.measurement_type && (
          <p className="text-xs text-rose-400">{errors.measurement_type}</p>
        )}
      </div>

      {/* Numeric Reading & Unit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="meas-value" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Observed Reading <span className="text-rose-400">*</span>
          </label>
          <input
            id="meas-value"
            type="number"
            step="any"
            value={numericValue}
            onChange={(e) => setNumericValue(e.target.value)}
            placeholder="e.g. 3.28"
            className={`w-full px-3 py-2 rounded-lg bg-slate-950 border text-slate-100 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              errors.numeric_value ? 'border-rose-500' : 'border-slate-800'
            }`}
          />
          {errors.numeric_value && (
            <p className="text-xs text-rose-400">{errors.numeric_value}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="meas-unit" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Unit
          </label>
          <select
            id="meas-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {currentTypeConfig.units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          {errors.unit && <p className="text-xs text-rose-400">{errors.unit}</p>}
        </div>
      </div>

      {/* Probe Placement Points */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="probe-pos" className="block text-xs font-semibold text-rose-400 uppercase tracking-wider font-mono">
            🔴 Red Probe (+) Placed At <span className="text-rose-400">*</span>
          </label>
          <input
            id="probe-pos"
            type="text"
            value={probePositive}
            onChange={(e) => setProbePositive(e.target.value)}
            placeholder="e.g. ESP32 GPIO 18"
            className={`w-full px-3 py-2 rounded-lg bg-slate-950 border text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              errors.probe_positive ? 'border-rose-500' : 'border-slate-800'
            }`}
          />
          {errors.probe_positive && (
            <p className="text-xs text-rose-400">{errors.probe_positive}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="probe-neg" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            ⚫ Black Probe (-) Placed At <span className="text-rose-400">*</span>
          </label>
          <input
            id="probe-neg"
            type="text"
            value={probeNegative}
            onChange={(e) => setProbeNegative(e.target.value)}
            placeholder="e.g. Common GND Rail"
            className={`w-full px-3 py-2 rounded-lg bg-slate-950 border text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              errors.probe_negative ? 'border-rose-500' : 'border-slate-800'
            }`}
          />
          {errors.probe_negative && (
            <p className="text-xs text-rose-400">{errors.probe_negative}</p>
          )}
        </div>
      </div>

      {/* Probing Notes */}
      <div className="space-y-1">
        <label htmlFor="meas-notes" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
          Probing Notes / Behavior (Optional)
        </label>
        <input
          id="meas-notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Reading was steady at 3.28V while sketch flashed"
          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors font-mono"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors flex items-center gap-2 font-mono shadow-md"
        >
          {isSubmitting ? 'Evaluating...' : '✓ Submit Measurement & Re-evaluate'}
        </button>
      </div>
    </form>
  );
}
