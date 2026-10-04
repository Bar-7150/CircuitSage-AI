/**
 * CircuitSage AI — Client-Side Validation Rules
 * Provides instant UX feedback without superseding server-side security checks.
 */

import { SUPPORTED_BOARDS } from './constants.js';

const VALID_BOARD_IDS = SUPPORTED_BOARDS.map((b) => b.id);
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates the problem description text.
 * Spec requirement: 10 to 2000 characters.
 */
export function validateProblemDescription(text) {
  if (!text || typeof text !== 'string') {
    return { isValid: false, error: 'Problem description is required.' };
  }
  const trimmed = text.trim();
  if (trimmed.length < 10) {
    return {
      isValid: false,
      error: `Description is too short (${trimmed.length}/10 chars minimum). Describe observed symptoms, pin numbers, or behavior.`
    };
  }
  if (trimmed.length > 2000) {
    return {
      isValid: false,
      error: `Description exceeds the 2000 character limit (${trimmed.length}/2000 chars).`
    };
  }
  return { isValid: true, error: null };
}

/**
 * Validates the selected microcontroller or dev board.
 */
export function validateBoard(boardId) {
  if (!boardId) {
    return { isValid: false, error: 'Please select a microcontroller or development board.' };
  }
  if (!VALID_BOARD_IDS.includes(boardId)) {
    return { isValid: false, error: 'Selected board is not currently supported by CircuitSage AI.' };
  }
  return { isValid: true, error: null };
}

/**
 * Validates optional circuit photograph upload.
 */
export function validateCircuitImage(file) {
  if (!file) {
    return { isValid: true, error: null }; // Image is optional
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported image format (${file.type || 'unknown'}). Please upload a JPEG, PNG, or WebP photo.`
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `Image size (${sizeMb} MB) exceeds maximum allowed size of 10 MB.`
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validates physical multimeter measurement input.
 */
export function validateMeasurement({ measurement_type, numeric_value, unit, probe_positive, probe_negative }) {
  const errors = {};

  if (!measurement_type) {
    errors.measurement_type = 'Measurement mode is required (e.g. DC Volts, Resistance).';
  }

  if (numeric_value === '' || numeric_value === null || numeric_value === undefined || isNaN(Number(numeric_value))) {
    errors.numeric_value = 'A valid numeric reading is required.';
  }

  if (!unit || typeof unit !== 'string' || unit.trim() === '') {
    errors.unit = 'Unit is required.';
  }

  if (!probe_positive || probe_positive.trim() === '') {
    errors.probe_positive = 'Specify where the RED positive (+) probe is placed.';
  }

  if (!probe_negative || probe_negative.trim() === '') {
    errors.probe_negative = 'Specify where the BLACK negative (-) probe is placed.';
  }

  const isValid = Object.keys(errors).length === 0;
  return { isValid, errors };
}
