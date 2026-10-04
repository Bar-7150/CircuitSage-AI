/**
 * CircuitSage AI — Shared Constants and Types
 */

const EPISTEMIC_STATUS = {
  VERIFIED_FACT: 'VERIFIED_FACT',
  AI_INFERENCE: 'AI_INFERENCE',
  UNKNOWN: 'UNKNOWN'
};

const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  MODEL_UNAVAILABLE: 'MODEL_UNAVAILABLE',
  RETRIEVAL_FAILURE: 'RETRIEVAL_FAILURE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  HARDWARE_ERROR: 'HARDWARE_ERROR',
  COMPILATION_ERROR: 'COMPILATION_ERROR'
};

const SUPPORTED_BOARDS = [
  'ESP32 DevKit v1',
  'AI Thinker ESP32-CAM',
  'ESP32 Wrover Module',
  'ESP32-S3 Dev Module',
  'Arduino Uno R3',
  'Raspberry Pi Pico'
];

const BOARD_FQBNS = {
  'ESP32 DevKit v1': 'esp32:esp32:esp32',
  'AI Thinker ESP32-CAM': 'esp32:esp32:esp32cam',
  'ESP32 Wrover Module': 'esp32:esp32:esp32wrover',
  'ESP32-S3 Dev Module': 'esp32:esp32:esp32s3',
  'Arduino Uno R3': 'arduino:avr:uno',
  'Raspberry Pi Pico': 'rp2040:rp2040:rpipico'
};

const SERIAL_BAUD_RATES = [
  9600,
  19200,
  38400,
  57600,
  74880,
  115200,
  230400,
  460800,
  921600
];

const { EmbeddedAgentEngine, AGENT_STATES } = require('./agent/agentEngine');
const { TOOL_DEFINITIONS, validateToolCall, createToolContext } = require('./agent/agentTools');
const { ModelProvider, GemmaModelProvider } = require('./agent/modelProvider');

module.exports = {
  EPISTEMIC_STATUS,
  ERROR_CODES,
  SUPPORTED_BOARDS,
  BOARD_FQBNS,
  SERIAL_BAUD_RATES,
  EmbeddedAgentEngine,
  AGENT_STATES,
  TOOL_DEFINITIONS,
  validateToolCall,
  createToolContext,
  ModelProvider,
  GemmaModelProvider
};

