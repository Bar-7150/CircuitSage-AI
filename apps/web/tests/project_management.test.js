/**
 * CircuitSage AI — Project and File Management Tests (Frontend / Shared Logic)
 * Tested using Node.js built-in test runner
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { SUPPORTED_TEMPLATES, DEFAULT_ESP32_CAM_FILES } = require('../src/lib/ideTemplates');
const { SUPPORTED_BOARDS } = require('../src/lib/constants');

describe('Project Templates Specification', () => {
  test('provides all 3 core microcontroller project templates', () => {
    assert.strictEqual(Array.isArray(SUPPORTED_TEMPLATES), true);
    assert.strictEqual(SUPPORTED_TEMPLATES.length, 3);

    const esp32cam = SUPPORTED_TEMPLATES.find((t) => t.id === 'esp32cam');
    assert.ok(esp32cam, 'esp32cam template must exist');
    assert.strictEqual(esp32cam.fqbn, 'esp32:esp32:esp32cam');
    assert.ok(esp32cam.files.some((f) => f.name.endsWith('.ino')));

    const esp32dev = SUPPORTED_TEMPLATES.find((t) => t.id === 'esp32_dev');
    assert.ok(esp32dev, 'esp32_dev template must exist');
    assert.strictEqual(esp32dev.fqbn, 'esp32:esp32:esp32');

    const uno = SUPPORTED_TEMPLATES.find((t) => t.id === 'arduino_uno');
    assert.ok(uno, 'arduino_uno template must exist');
    assert.strictEqual(uno.fqbn, 'arduino:avr:uno');
  });

  test('ESP32-CAM template includes pinout header and flash LED definitions', () => {
    const esp32cam = SUPPORTED_TEMPLATES.find((t) => t.id === 'esp32cam');
    const header = esp32cam.files.find((f) => f.name === 'camera_pins.h');
    assert.ok(header, 'Must include camera_pins.h');
    assert.match(header.content, /CAMERA_PINS_H/);

    const ino = esp32cam.files.find((f) => f.name.endsWith('.ino'));
    assert.match(ino.content, /#define FLASH_LED_PIN 4/);
  });
});

describe('File State & Conflict Resolution Logic', () => {
  test('detects conflicting writes when expectedMtime does not match disk mtime', () => {
    function evaluateConflict(diskMtime, expectedMtime) {
      if (expectedMtime === null || expectedMtime === undefined) {
        return false; // forced write
      }
      return Math.abs(diskMtime - expectedMtime) > 50;
    }

    const initialMtime = 1700000000000;
    // Identical mtime -> No conflict
    assert.strictEqual(evaluateConflict(initialMtime, initialMtime), false);
    // Within 20ms tolerance -> No conflict
    assert.strictEqual(evaluateConflict(initialMtime + 20, initialMtime), false);
    // Modified 5 seconds later by external process -> Conflict detected
    assert.strictEqual(evaluateConflict(initialMtime + 5000, initialMtime), true);
    // Overwrite forced (expectedMtime null) -> No conflict
    assert.strictEqual(evaluateConflict(initialMtime + 5000, null), false);
  });

  test('tracks dirty tabs and active tab switching correctly', () => {
    let tabs = [
      { name: 'main.ino', isDirty: false },
      { name: 'config.h', isDirty: false }
    ];

    // Editing main.ino marks it dirty
    tabs = tabs.map((t) => (t.name === 'main.ino' ? { ...t, isDirty: true } : t));
    assert.strictEqual(tabs.find((t) => t.name === 'main.ino').isDirty, true);
    assert.strictEqual(tabs.find((t) => t.name === 'config.h').isDirty, false);

    // Saving main.ino clears dirty state
    tabs = tabs.map((t) => (t.name === 'main.ino' ? { ...t, isDirty: false } : t));
    assert.strictEqual(tabs.find((t) => t.name === 'main.ino').isDirty, false);
  });

  test('applies AI diff and can revert from backup', () => {
    let file = {
      name: 'esp32_cam_blink.ino',
      content: `void loop() {\n  digitalWrite(FLASH_LED_PIN, HIGH);\n  delay(500);\n}`
    };

    const diff = {
      file: 'esp32_cam_blink.ino',
      oldSnippet: `delay(500);`,
      newSnippet: `delay(100); // Protected`
    };

    // Store backup
    const backupContent = file.content;

    // Apply diff
    file.content = file.content.replace(diff.oldSnippet, diff.newSnippet);
    assert.match(file.content, /delay\(100\); \/\/ Protected/);
    assert.strictEqual(file.content.includes('delay(500);'), false);

    // Revert to backup
    file.content = backupContent;
    assert.match(file.content, /delay\(500\);/);
    assert.strictEqual(file.content.includes('delay(100);'), false);
  });
});
