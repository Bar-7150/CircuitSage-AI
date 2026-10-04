/**
 * CircuitSage AI — Problem Description Form Component
 * Captures user observed failure symptoms with character accounting and beginner quick-start templates.
 */

'use client';

const QUICK_SYMPTOMS = [
  {
    label: 'LED Not Lighting Up',
    text: 'Blue 5mm LED connected to GPIO 18 never illuminates when running the blink sketch. Pin should pulse HIGH every second.'
  },
  {
    label: 'ESP32 Brownout Reset',
    text: 'ESP32 serial monitor repeatedly prints "Brownout detector was triggered" the instant WiFi connection is initialized.'
  },
  {
    label: 'I2C OLED Blank Screen',
    text: '0.96 inch I2C SSD1306 OLED display remains completely dark. I2C scanner sketch hangs or reports no devices found on SDA/SCL.'
  },
  {
    label: '5V Sensor on 3.3V Pin',
    text: 'Connected a 5V ultrasonic sensor (HC-SR04) Echo pin directly to ESP32 GPIO. Board became warm and readings are erratic.'
  }
];

export default function ProblemForm({
  description,
  onDescriptionChange,
  error
}) {
  const charCount = description ? description.trim().length : 0;
  const isNearLimit = charCount > 1800;
  const isTooShort = charCount > 0 && charCount < 10;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="problem-description"
          className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5"
        >
          <span>Observed Symptoms & Problem Description</span>
          <span className="text-rose-400">*</span>
        </label>
        <span
          className={`text-xs font-mono ${
            isNearLimit
              ? 'text-rose-400'
              : isTooShort
              ? 'text-amber-400'
              : 'text-slate-500'
          }`}
          aria-live="polite"
        >
          {charCount} / 2000 chars {charCount < 10 && '(min 10)'}
        </span>
      </div>

      <textarea
        id="problem-description"
        rows={4}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Describe what is failing in detail (e.g. which LED remains unlit, error messages from Serial Monitor, voltage behaviors, or temperature changes)..."
        className={`w-full p-3 rounded-lg bg-slate-900 border text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-slate-600 ${
          error ? 'border-rose-500' : 'border-slate-800 hover:border-slate-700'
        }`}
        aria-describedby={error ? 'problem-description-error' : undefined}
      />

      {error && (
        <p id="problem-description-error" className="text-xs text-rose-400 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}

      {/* Beginner Quick Templates */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] text-slate-500 font-mono">Quick-fill common failure scenarios:</span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_SYMPTOMS.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => onDescriptionChange(q.text)}
              className="text-[11px] px-2.5 py-1 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 transition-colors font-mono"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
