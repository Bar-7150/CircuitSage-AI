/**
 * Unit Tests for Frontend Client-Side Validation
 * Tested using Node.js built-in test runner
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Import validation functions
const {
  validateProblemDescription,
  validateBoard,
  validateCircuitImage,
  validateMeasurement
} = require('../src/lib/validation');

describe('Problem Description Validation', () => {
  test('rejects empty or missing description', () => {
    const res1 = validateProblemDescription('');
    assert.strictEqual(res1.isValid, false);
    assert.match(res1.error, /required/i);

    const res2 = validateProblemDescription(null);
    assert.strictEqual(res2.isValid, false);

    const res3 = validateProblemDescription('   ');
    assert.strictEqual(res3.isValid, false);
  });

  test('rejects description under 10 characters', () => {
    const res = validateProblemDescription('LED dead');
    assert.strictEqual(res.isValid, false);
    assert.match(res.error, /too short/i);
  });

  test('accepts valid problem description between 10 and 2000 characters', () => {
    const res = validateProblemDescription('Blue LED on GPIO 18 never turns on when sketch runs.');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.error, null);
  });

  test('rejects description over 2000 characters', () => {
    const longText = 'A'.repeat(2005);
    const res = validateProblemDescription(longText);
    assert.strictEqual(res.isValid, false);
    assert.match(res.error, /exceeds/i);
  });
});

describe('Board Selection Validation', () => {
  test('accepts supported microcontroller boards', () => {
    assert.strictEqual(validateBoard('ESP32 DevKit v1').isValid, true);
    assert.strictEqual(validateBoard('Arduino Uno R3').isValid, true);
    assert.strictEqual(validateBoard('Raspberry Pi Pico').isValid, true);
  });

  test('rejects missing or unsupported boards', () => {
    const res1 = validateBoard('');
    assert.strictEqual(res1.isValid, false);
    assert.match(res1.error, /select/i);

    const res2 = validateBoard('Unsupported SuperBoard 9000');
    assert.strictEqual(res2.isValid, false);
    assert.match(res2.error, /not currently supported/i);
  });
});

describe('Circuit Image Validation', () => {
  test('allows optional null/undefined file', () => {
    assert.strictEqual(validateCircuitImage(null).isValid, true);
    assert.strictEqual(validateCircuitImage(undefined).isValid, true);
  });

  test('accepts valid JPEG, PNG, and WebP images under 10MB', () => {
    const validJpg = { type: 'image/jpeg', size: 2 * 1024 * 1024 };
    const validPng = { type: 'image/png', size: 5 * 1024 * 1024 };
    const validWebp = { type: 'image/webp', size: 1 * 1024 * 1024 };

    assert.strictEqual(validateCircuitImage(validJpg).isValid, true);
    assert.strictEqual(validateCircuitImage(validPng).isValid, true);
    assert.strictEqual(validateCircuitImage(validWebp).isValid, true);
  });

  test('rejects invalid mime types (e.g. PDF, GIF, text)', () => {
    const pdfFile = { type: 'application/pdf', size: 1024 };
    const res = validateCircuitImage(pdfFile);
    assert.strictEqual(res.isValid, false);
    assert.match(res.error, /unsupported image format/i);
  });

  test('rejects oversized images greater than 10MB', () => {
    const oversized = { type: 'image/jpeg', size: 11 * 1024 * 1024 };
    const res = validateCircuitImage(oversized);
    assert.strictEqual(res.isValid, false);
    assert.match(res.error, /maximum allowed size/i);
  });
});

describe('Multimeter Measurement Validation', () => {
  test('validates valid DC voltage measurement', () => {
    const payload = {
      measurement_type: 'VOLTAGE_DC',
      numeric_value: 3.28,
      unit: 'V',
      probe_positive: 'ESP32 GPIO 18',
      probe_negative: 'GND'
    };
    const res = validateMeasurement(payload);
    assert.strictEqual(res.isValid, true);
    assert.deepStrictEqual(res.errors, {});
  });

  test('flags missing numeric value, unit, and probe contacts', () => {
    const invalidPayload = {
      measurement_type: '',
      numeric_value: '',
      unit: '',
      probe_positive: '',
      probe_negative: ''
    };
    const res = validateMeasurement(invalidPayload);
    assert.strictEqual(res.isValid, false);
    assert.ok(res.errors.measurement_type);
    assert.ok(res.errors.numeric_value);
    assert.ok(res.errors.unit);
    assert.ok(res.errors.probe_positive);
    assert.ok(res.errors.probe_negative);
  });

  test('flags non-numeric value string', () => {
    const payload = {
      measurement_type: 'VOLTAGE_DC',
      numeric_value: 'not-a-number',
      unit: 'V',
      probe_positive: 'Pin 1',
      probe_negative: 'GND'
    };
    const res = validateMeasurement(payload);
    assert.strictEqual(res.isValid, false);
    assert.ok(res.errors.numeric_value);
  });
});
