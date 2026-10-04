/**
 * CircuitSage AI — Diagnosis Request Validators
 */

const { SUPPORTED_BOARDS } = require('@circuitsage/shared');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES = ['INTAKE', 'ACTIVE', 'RESOLVED', 'ABORTED'];
const VALID_MEASUREMENT_TYPES = ['VOLTAGE_DC', 'RESISTANCE', 'CONTINUITY', 'CURRENT_DC'];

/**
 * Validates POST /api/v1/diagnoses
 */
function validateCreateDiagnosis(req) {
  const errors = [];
  const { target_board, symptom_description, connected_components, pin_connections } = req.body;

  if (!target_board || !SUPPORTED_BOARDS.includes(target_board)) {
    errors.push({
      field: 'target_board',
      issue: `target_board is required and must be one of: ${SUPPORTED_BOARDS.join(', ')}`
    });
  }

  if (!symptom_description || typeof symptom_description !== 'string') {
    errors.push({
      field: 'symptom_description',
      issue: 'symptom_description is required.'
    });
  } else {
    const trimmed = symptom_description.trim();
    if (trimmed.length < 10) {
      errors.push({
        field: 'symptom_description',
        issue: 'symptom_description must be at least 10 characters long.'
      });
    } else if (trimmed.length > 2000) {
      errors.push({
        field: 'symptom_description',
        issue: 'symptom_description exceeds maximum limit of 2000 characters.'
      });
    }
  }

  // Parse connected_components if passed as stringified JSON from multipart/form-data
  if (typeof connected_components === 'string') {
    try {
      req.body.connected_components = JSON.parse(connected_components);
    } catch {
      req.body.connected_components = [connected_components];
    }
  }

  if (pin_connections && typeof pin_connections === 'string' && pin_connections.length > 500) {
    errors.push({
      field: 'pin_connections',
      issue: 'pin_connections exceeds 500 character limit.'
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates GET /api/v1/diagnoses query parameters
 */
function validateListDiagnoses(req) {
  const errors = [];
  const { limit, offset, status } = req.query;

  if (limit !== undefined) {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      errors.push({
        field: 'limit',
        issue: 'limit must be an integer between 1 and 50.'
      });
    } else {
      req.query.limit = parsedLimit;
    }
  } else {
    req.query.limit = 10;
  }

  if (offset !== undefined) {
    const parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      errors.push({
        field: 'offset',
        issue: 'offset must be a non-negative integer.'
      });
    } else {
      req.query.offset = parsedOffset;
    }
  } else {
    req.query.offset = 0;
  }

  if (status && !VALID_STATUSES.includes(status)) {
    errors.push({
      field: 'status',
      issue: `status must be one of: ${VALID_STATUSES.join(', ')}`
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates UUID in path parameters (:id)
 */
function validateCaseIdParam(req) {
  const errors = [];
  const { id } = req.params;

  if (!id || (!UUID_REGEX.test(id) && !id.startsWith('demo-') && !id.startsWith('case-'))) {
    errors.push({
      field: 'id',
      issue: 'Case ID must be a valid UUID format.'
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates POST /api/v1/diagnoses/:id/messages
 */
function validateCreateMessage(req) {
  const errors = [];
  const { message_text } = req.body;

  if (!message_text || typeof message_text !== 'string' || message_text.trim().length === 0) {
    errors.push({
      field: 'message_text',
      issue: 'message_text is required and cannot be empty.'
    });
  } else if (message_text.trim().length > 2000) {
    errors.push({
      field: 'message_text',
      issue: 'message_text exceeds the 2000 character limit.'
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates POST /api/v1/diagnoses/:id/measurements
 */
function validateSubmitMeasurement(req) {
  const errors = [];
  const { measurement_type, numeric_value, unit, probe_positive, probe_negative, notes } = req.body;

  if (!measurement_type || !VALID_MEASUREMENT_TYPES.includes(measurement_type)) {
    errors.push({
      field: 'measurement_type',
      issue: `measurement_type must be one of: ${VALID_MEASUREMENT_TYPES.join(', ')}`
    });
  }

  if (numeric_value === undefined || numeric_value === null || numeric_value === '' || isNaN(Number(numeric_value))) {
    errors.push({
      field: 'numeric_value',
      issue: 'numeric_value must be a valid numeric measurement.'
    });
  }

  if (!unit || typeof unit !== 'string' || unit.trim().length === 0) {
    errors.push({
      field: 'unit',
      issue: 'unit is required (e.g. V, mV, Ω, kΩ, mA).'
    });
  }

  if (!probe_positive || typeof probe_positive !== 'string' || probe_positive.trim().length === 0) {
    errors.push({
      field: 'probe_positive',
      issue: 'probe_positive is required indicating where the positive red probe is placed.'
    });
  }

  if (!probe_negative || typeof probe_negative !== 'string' || probe_negative.trim().length === 0) {
    errors.push({
      field: 'probe_negative',
      issue: 'probe_negative is required indicating where the negative black probe is placed.'
    });
  }

  if (notes && typeof notes === 'string' && notes.length > 500) {
    errors.push({
      field: 'notes',
      issue: 'notes exceeds maximum limit of 500 characters.'
    });
  }

  return { isValid: errors.length === 0, errors };
}

module.exports = {
  validateCreateDiagnosis,
  validateListDiagnoses,
  validateCaseIdParam,
  validateCreateMessage,
  validateSubmitMeasurement
};
