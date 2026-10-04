/**
 * Unit Tests for Frontend API Client & Probing Evaluation
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  createDiagnosis,
  submitMultimeterMeasurement,
  getEffectiveApiBaseUrl
} = require('../src/lib/api.js');
const { DEMO_SCENARIOS } = require('../src/lib/mockData.js');

describe('API Client & Probing Evaluation', () => {
  test('returns effective base URL by default', () => {
    const url = getEffectiveApiBaseUrl();
    assert.ok(url.includes('/api/v1'));
  });

  test('createDiagnosis in demo mode returns structured diagnosis case without network call', async () => {
    const payload = {
      target_board: 'ESP32 DevKit v1',
      symptom_description: 'Blue LED on GPIO 18 never turns on when code runs.'
    };

    const res = await createDiagnosis(payload, { isDemo: true });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.isDemo, true);
    assert.ok(res.data.case.id.startsWith('demo-'));
    assert.strictEqual(res.data.case.target_board, 'ESP32 DevKit v1');
    assert.ok(Array.isArray(res.data.hypotheses));
    assert.ok(res.data.hypotheses.length > 0);
  });

  test('submitMultimeterMeasurement in demo mode validates 3.3V logic high and eliminates firmware hypothesis', async () => {
    const demoScenario = JSON.parse(JSON.stringify(DEMO_SCENARIOS[0].diagnosis));
    const caseId = 'demo-test-case-001';

    // Submit a 3.28V reading on GPIO 18
    const measurement = {
      test_id: 'test_gpio18_voltage',
      measurement_type: 'VOLTAGE_DC',
      numeric_value: 3.28,
      unit: 'V',
      probe_positive: 'ESP32 GPIO 18',
      probe_negative: 'GND',
      notes: 'Testing output pin voltage'
    };

    const res = await submitMultimeterMeasurement(caseId, measurement, {
      isDemo: true,
      currentCase: demoScenario
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.isDemo, true);
    assert.strictEqual(res.data.measurement.numeric_value, 3.28);
    assert.strictEqual(res.data.deterministic_evaluation.status, 'VERIFIED_PASS');
    assert.match(res.data.deterministic_evaluation.message, /3\.3V/);

    // Verify FIRMWARE_PIN hypothesis was eliminated
    assert.ok(Array.isArray(res.data.eliminated_hypotheses));
    const eliminatedFw = res.data.eliminated_hypotheses.find((e) => e.title.includes('Firmware'));
    assert.ok(eliminatedFw, 'Firmware failure hypothesis should be eliminated by 3.28V reading');

    // Remaining hypotheses promoted to VERIFIED_FACT
    const remaining = res.data.updated_hypotheses;
    assert.ok(remaining.length > 0);
    assert.strictEqual(remaining[0].epistemic_status, 'VERIFIED_FACT');
  });
});
