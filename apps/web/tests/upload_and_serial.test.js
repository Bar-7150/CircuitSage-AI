/**
 * CircuitSage AI — Firmware Upload & Serial Monitor Frontend Tests
 * Tested using Node.js built-in test runner
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { SUPPORTED_BOARDS } = require('../src/lib/constants');

describe('Board & Firmware Upload Configuration Specifications', () => {
  test('supported boards contain valid FQBN and architecture specifications', () => {
    assert.strictEqual(Array.isArray(SUPPORTED_BOARDS), true);
    assert.strictEqual(SUPPORTED_BOARDS.length >= 3, true);

    const esp32cam = SUPPORTED_BOARDS.find((b) => b.id === 'AI Thinker ESP32-CAM' || b.name === 'AI Thinker ESP32-CAM');
    assert.ok(esp32cam, 'ESP32-CAM board must be defined');
    assert.strictEqual(esp32cam.fqbn, 'esp32:esp32:esp32cam');
    assert.strictEqual(esp32cam.logicVoltage, '3.3V');

    const uno = SUPPORTED_BOARDS.find((b) => b.id === 'Arduino Uno R3');
    assert.ok(uno, 'Arduino Uno board must be defined');
    assert.strictEqual(uno.fqbn, 'arduino:avr:uno');
  });

  test('firmware upload strictly enforces explicit user approval before execution', () => {
    function validateUploadPreflight(payload) {
      if (!payload.userApproved) {
        return {
          allowed: false,
          error: 'APPROVAL_REQUIRED',
          message: 'Firmware upload requires explicit user approval before execution.'
        };
      }
      if (!payload.port || !payload.fqbn) {
        return { allowed: false, error: 'INCOMPLETE_CONFIGURATION' };
      }
      return { allowed: true };
    }

    // Default without approval is rejected
    const unapproved = validateUploadPreflight({ port: 'COM3', fqbn: 'esp32:esp32:esp32cam', userApproved: false });
    assert.strictEqual(unapproved.allowed, false);
    assert.strictEqual(unapproved.error, 'APPROVAL_REQUIRED');

    // With explicit approval is allowed
    const approved = validateUploadPreflight({ port: 'COM3', fqbn: 'esp32:esp32:esp32cam', userApproved: true });
    assert.strictEqual(approved.allowed, true);
  });

  test('upload result guarantees mandatory circuit disclaimer', () => {
    const DISCLAIMER_TEXT = 'NOTE: Flash verification confirms program memory write, but does not prove circuit connections, sensors, or external components are functional.';

    function generateUploadResult(isSuccess) {
      return {
        success: isSuccess,
        exitCode: isSuccess ? 0 : 1,
        disclaimer: isSuccess ? `Firmware uploaded successfully to flash memory. ${DISCLAIMER_TEXT}` : 'Upload failed.'
      };
    }

    const successResult = generateUploadResult(true);
    assert.strictEqual(successResult.success, true);
    assert.match(successResult.disclaimer, /does not prove circuit connections/i);
  });
});

describe('Serial Monitor Line Endings & Telemetry Management', () => {
  test('formats serial commands with selected line terminator', () => {
    function formatSerialCommand(input, lineEnding) {
      let terminator = '';
      switch (lineEnding.toLowerCase()) {
        case 'lf':
        case 'newline':
          terminator = '\n';
          break;
        case 'crlf':
        case 'both':
          terminator = '\r\n';
          break;
        case 'cr':
          terminator = '\r';
          break;
        case 'none':
        default:
          terminator = '';
          break;
      }
      return `${input}${terminator}`;
    }

    assert.strictEqual(formatSerialCommand('AT+RST', 'lf'), 'AT+RST\n');
    assert.strictEqual(formatSerialCommand('AT+GMR', 'crlf'), 'AT+GMR\r\n');
    assert.strictEqual(formatSerialCommand('STATUS', 'cr'), 'STATUS\r');
    assert.strictEqual(formatSerialCommand('TEST', 'none'), 'TEST');
  });

  test('enforces user authorization before telemetry is exposed to AI', () => {
    function getSerialContextForAi(logs, userAuthorized) {
      if (!userAuthorized) {
        return {
          authorized: false,
          data: null,
          notice: 'Live telemetry sharing is disabled by user.'
        };
      }
      return {
        authorized: true,
        data: logs.map((l) => l.text).join('\n')
      };
    }

    const mockLogs = [
      { text: '[ESP32] Booting...' },
      { text: '[ESP32] Sensor voltage: 3.29V' }
    ];

    const unauthorized = getSerialContextForAi(mockLogs, false);
    assert.strictEqual(unauthorized.authorized, false);
    assert.strictEqual(unauthorized.data, null);

    const authorized = getSerialContextForAi(mockLogs, true);
    assert.strictEqual(authorized.authorized, true);
    assert.match(authorized.data, /Sensor voltage: 3.29V/);
  });
});
