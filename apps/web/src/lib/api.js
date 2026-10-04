/**
 * CircuitSage AI — Frontend API Client
 * Separates HTTP transport and data transformation from UI components.
 * Adheres strictly to /api/v1 contracts defined in docs/API_SPEC.md.
 */

import { DEMO_SCENARIOS } from './mockData.js';
import { getApiBaseUrlOverride, saveLocalCase } from './storage.js';
import { EPISTEMIC_STATUS } from './constants.js';

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export function getEffectiveApiBaseUrl() {
  const override = getApiBaseUrlOverride();
  return override || DEFAULT_API_BASE_URL;
}

/**
 * Standardized API error parser
 */
function parseApiError(error, defaultMessage = 'An unexpected network error occurred.') {
  if (error && error.error) {
    return {
      code: error.error.code || 'API_ERROR',
      message: error.error.message || defaultMessage,
      details: error.error.details || [],
      requestId: error.error.requestId || null
    };
  }
  return {
    code: 'NETWORK_ERROR',
    message: error.message || defaultMessage,
    details: [],
    requestId: null
  };
}

/**
 * Checks server vitality, local Gemma 4 runtime, and database status.
 * GET /api/v1/health
 */
export async function checkServerHealth() {
  const baseUrl = getEffectiveApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    const data = await res.json();
    if (!res.ok) {
      throw data;
    }
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: parseApiError(err, 'Unable to connect to CircuitSage API backend.')
    };
  }
}

/**
 * Submits a new diagnostic case to the backend.
 * POST /api/v1/diagnoses
 *
 * @param {Object} payload
 * @param {string} payload.target_board
 * @param {string} payload.symptom_description
 * @param {Array<string>} [payload.connected_components]
 * @param {string} [payload.pin_connections]
 * @param {File} [payload.image]
 * @param {Object} options
 * @param {boolean} [options.isDemo=false]
 * @param {string} [options.authToken]
 */
export async function createDiagnosis(payload, options = {}) {
  const { isDemo = false, authToken } = options;

  // DEMO MODE: return authentic mock scenario without hitting external server
  if (isDemo) {
    // Artificial 1200ms delay to simulate engineering analysis phases in demo mode
    await new Promise((r) => setTimeout(r, 1200));

    // Match scenario or provide dynamic electrical engineering analysis
    const matched = DEMO_SCENARIOS.find((s) => s.board === payload.target_board) || DEMO_SCENARIOS[0];
    const demoCase = JSON.parse(JSON.stringify(matched.diagnosis));

    // Customize case attributes based on user input
    demoCase.case.id = `demo-${Date.now()}`;
    demoCase.case.target_board = payload.target_board;
    demoCase.case.symptom_description = payload.symptom_description;
    demoCase.case.is_demo = true;
    demoCase.case.created_at = new Date().toISOString();

    // Persist in local guest storage
    saveLocalCase(demoCase);
    return { success: true, data: demoCase, isDemo: true };
  }

  // LIVE API MODE
  const baseUrl = getEffectiveApiBaseUrl();
  const formData = new FormData();
  formData.append('target_board', payload.target_board);
  formData.append('symptom_description', payload.symptom_description);

  if (payload.connected_components && payload.connected_components.length > 0) {
    formData.append('connected_components', JSON.stringify(payload.connected_components));
  }

  if (payload.pin_connections) {
    formData.append('pin_connections', payload.pin_connections);
  }

  if (payload.image instanceof File) {
    formData.append('image', payload.image);
  }

  const headers = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(`${baseUrl}/diagnoses`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await res.json();
    if (!res.ok) {
      throw data;
    }

    // Persist locally for session continuity
    saveLocalCase(data);
    return { success: true, data, isDemo: false };
  } catch (err) {
    return {
      success: false,
      error: parseApiError(err, 'Failed to create diagnosis case on backend.')
    };
  }
}

/**
 * Submits a physical multimeter measurement for an active diagnostic case.
 * POST /api/v1/diagnoses/:id/measurements
 */
export async function submitMultimeterMeasurement(caseId, measurement, options = {}) {
  const { isDemo = false, authToken, currentCase } = options;

  if (isDemo || !caseId || caseId.startsWith('demo-')) {
    // Artificial 800ms delay to simulate deterministic re-evaluation
    await new Promise((r) => setTimeout(r, 800));

    const numericVal = parseFloat(measurement.numeric_value);
    const unit = measurement.unit;
    const isVoltage = measurement.measurement_type === 'VOLTAGE_DC';

    // Engineering logic for simulated evaluation
    let status = 'VERIFIED_PASS';
    let message = `Measurement of ${numericVal}${unit} logged and grounded in circuit state.`;
    const eliminated = [];
    const updatedHypotheses = currentCase?.hypotheses ? [...currentCase.hypotheses] : [];

    if (isVoltage) {
      if (numericVal >= 3.0 && numericVal <= 3.4) {
        status = 'VERIFIED_PASS';
        message = `Measured ${numericVal}V is within nominal 3.3V logic HIGH threshold. Firmware pin driving verified.`;
        // Eliminate firmware pin failure hypothesis
        const fwIdx = updatedHypotheses.findIndex((h) => h.category === 'FIRMWARE_PIN');
        if (fwIdx >= 0) {
          eliminated.push({
            id: updatedHypotheses[fwIdx].id,
            title: updatedHypotheses[fwIdx].title,
            elimination_reason: `Measured ${numericVal}V confirms pin is actively driven HIGH.`
          });
          updatedHypotheses.splice(fwIdx, 1);
        }
        // Promote polarity or Vf hypothesis
        if (updatedHypotheses.length > 0) {
          updatedHypotheses[0].epistemic_status = EPISTEMIC_STATUS.VERIFIED_FACT;
          updatedHypotheses[0].confidence_score = 0.95;
          updatedHypotheses[0].confidence_label = '95% (Verified Ground Truth)';
        }
      } else if (numericVal < 0.5) {
        status = 'WARNING';
        message = `Measured ${numericVal}V is near 0V. Pin is NOT being driven HIGH or is shorted directly to GND.`;
      }
    }

    const result = {
      measurement: {
        id: `meas-${Date.now()}`,
        case_id: caseId,
        numeric_value: numericVal,
        unit,
        measurement_type: measurement.measurement_type,
        probe_positive: measurement.probe_positive,
        probe_negative: measurement.probe_negative,
        created_at: new Date().toISOString()
      },
      deterministic_evaluation: {
        rule: 'Physical Multimeter Probing Verification',
        status,
        message
      },
      eliminated_hypotheses: eliminated,
      updated_hypotheses: updatedHypotheses
    };

    return { success: true, data: result, isDemo: true };
  }

  const baseUrl = getEffectiveApiBaseUrl();
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(`${baseUrl}/diagnoses/${caseId}/measurements`, {
      method: 'POST',
      headers,
      body: JSON.stringify(measurement)
    });

    const data = await res.json();
    if (!res.ok) {
      throw data;
    }
    return { success: true, data, isDemo: false };
  } catch (err) {
    return {
      success: false,
      error: parseApiError(err, 'Failed to submit measurement to backend.')
    };
  }
}
