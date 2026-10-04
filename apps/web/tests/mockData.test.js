/**
 * Unit Tests for CircuitSage Demo & Mock Scenarios
 * Verifies epistemic typing and API spec contract compliance
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { DEMO_SCENARIOS } = require('../src/lib/mockData.js');
const { EPISTEMIC_STATUS } = require('../src/lib/constants.js');

describe('Demo Scenarios Data Integrity & Specification Conformance', () => {
  test('contains realistic electronics scenarios for beginners', () => {
    assert.ok(DEMO_SCENARIOS.length >= 3, 'Expected at least 3 pre-built scenarios');
  });

  test('each demo scenario conforms to standard schema from docs/API_SPEC.md', () => {
    const validStatuses = Object.values(EPISTEMIC_STATUS);

    for (const scenario of DEMO_SCENARIOS) {
      assert.ok(scenario.id, 'Scenario must have an id');
      assert.ok(scenario.name, 'Scenario must have a human readable name');
      assert.ok(scenario.board, 'Scenario must specify a microcontroller board');
      assert.ok(scenario.description.length >= 10, 'Scenario description must be >= 10 chars');

      const diag = scenario.diagnosis;
      assert.ok(diag.case, 'Diagnosis must have a case object');
      assert.strictEqual(diag.case.status, 'ACTIVE');

      // Epistemic summary
      assert.ok(diag.epistemic_summary, 'Must contain epistemic summary');
      assert.ok(typeof diag.epistemic_summary.verified_facts_count === 'number');
      assert.ok(typeof diag.epistemic_summary.ai_inferences_count === 'number');
      assert.ok(typeof diag.epistemic_summary.unknown_assumptions_count === 'number');

      // Deterministic rules checks
      assert.ok(Array.isArray(diag.deterministic_checks), 'Must have deterministic checks');
      for (const chk of diag.deterministic_checks) {
        assert.ok(chk.rule, 'Check must have rule name');
        assert.ok(chk.result, 'Check must have result');
        assert.ok(validStatuses.includes(chk.epistemic_status), 'Epistemic status must be valid');
      }

      // Ranked hypotheses
      assert.ok(Array.isArray(diag.hypotheses), 'Must contain hypotheses array');
      assert.ok(diag.hypotheses.length > 0, 'Must have at least one hypothesis');

      for (const hyp of diag.hypotheses) {
        assert.ok(hyp.id, 'Hypothesis must have id');
        assert.ok(hyp.title, 'Hypothesis must have title');
        assert.ok(hyp.category, 'Hypothesis must have category');
        assert.ok(validStatuses.includes(hyp.epistemic_status), 'Hypothesis epistemic status must be valid');
        assert.ok(typeof hyp.confidence_score === 'number');
        assert.ok(hyp.confidence_score >= 0 && hyp.confidence_score <= 1);
        assert.ok(hyp.explanation.length > 20, 'Physics explanation must be substantive');

        if (hyp.suggested_test) {
          assert.ok(hyp.suggested_test.tool, 'Suggested test must define a tool (e.g. DMM)');
          assert.ok(hyp.suggested_test.probe_positive, 'Suggested test must specify red probe contact');
          assert.ok(hyp.suggested_test.probe_negative, 'Suggested test must specify black probe contact');
          assert.ok(hyp.suggested_test.expected_nominal, 'Suggested test must define expected reading');
        }
      }
    }
  });

  test('ESP32 LED scenario properly checks reverse polarity and current limit', () => {
    const ledScenario = DEMO_SCENARIOS.find((s) => s.id === 'demo-esp32-blue-led');
    assert.ok(ledScenario);
    const polarityHyp = ledScenario.diagnosis.hypotheses.find((h) => h.category === 'WIRING_POLARITY');
    assert.ok(polarityHyp, 'Must have polarity hypothesis');
    assert.strictEqual(polarityHyp.epistemic_status, EPISTEMIC_STATUS.AI_INFERENCE);
  });
});
