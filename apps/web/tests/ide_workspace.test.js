/**
 * CircuitSage AI — IDE Workspace Data & Specifications Test
 * Tested using Node.js built-in test runner
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { DEFAULT_ESP32_CAM_FILES } = require('../src/lib/ideTemplates');
const { SUPPORTED_BOARDS } = require('../src/lib/constants');
const { getIdePreferences } = require('../src/lib/storage');

describe('IDE Workspace Template Integrity & Hardware Specification', () => {
  test('provides complete ESP32-CAM sketch files template', () => {
    assert.strictEqual(Array.isArray(DEFAULT_ESP32_CAM_FILES), true);
    assert.strictEqual(DEFAULT_ESP32_CAM_FILES.length >= 3, true);

    const mainSketch = DEFAULT_ESP32_CAM_FILES.find((f) => f.name === 'esp32_cam_blink.ino');
    assert.ok(mainSketch, 'esp32_cam_blink.ino should exist in templates');
    assert.match(mainSketch.content, /#define FLASH_LED_PIN 4/);
    assert.match(mainSketch.content, /#define STATUS_LED_PIN 33/);
    assert.match(mainSketch.content, /Serial\.begin\(115200\)/);

    const header = DEFAULT_ESP32_CAM_FILES.find((f) => f.name === 'camera_pins.h');
    assert.ok(header, 'camera_pins.h should exist');
    assert.match(header.content, /#define PWDN_GPIO_NUM/);
    assert.match(header.content, /#define SIOD_GPIO_NUM/);
  });

  test('validates AI Thinker ESP32-CAM in supported board specifications', () => {
    const camBoard = SUPPORTED_BOARDS.find((b) => b.id === 'AI Thinker ESP32-CAM' || b.name === 'AI Thinker ESP32-CAM');
    assert.ok(camBoard, 'AI Thinker ESP32-CAM should be supported');
    assert.strictEqual(camBoard.fqbn, 'esp32:esp32:esp32cam');
    assert.strictEqual(camBoard.logicVoltage, '3.3V');
    assert.match(camBoard.architecture, /Xtensa/i);
  });

  test('provides sensible defaults for IDE panel layout preferences', () => {
    const prefs = getIdePreferences();
    assert.strictEqual(typeof prefs, 'object');
    assert.strictEqual(typeof prefs.leftWidth, 'number');
    assert.strictEqual(typeof prefs.rightWidth, 'number');
    assert.strictEqual(typeof prefs.bottomHeight, 'number');
    assert.strictEqual(prefs.selectedBoard, 'AI Thinker ESP32-CAM');
    assert.strictEqual(prefs.baudRate, 115200);
  });
});
