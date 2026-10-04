/**
 * CircuitSage AI — Real ESP32 & ESP32-CAM Compilation Test Suite
 *
 * Distinct from mocked tests:
 * Invokes the actual host Arduino CLI binary, performs genuine compilation
 * of ESP32 and ESP32-CAM firmware, captures real compiler stdout/stderr,
 * verifies memory usage diagnostics, and tests real compile-failure parsing.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  resolveArduinoCliPath,
  verifyPlatformInstalled,
  compileProject
} = require('../src/services/embeddedBuildService');

describe('REAL ESP32 & ESP32-CAM Hardware Toolchain Verification', () => {
  let cliPath = null;
  let esp32PlatformReady = false;
  let tempWorkspaceDir;

  beforeAll(async () => {
    // 1. Resolve host executable
    cliPath = await resolveArduinoCliPath();

    if (cliPath) {
      // 2. Check if real esp32:esp32 core is installed
      try {
        const platformCheck = await verifyPlatformInstalled('esp32:esp32:esp32cam', cliPath);
        esp32PlatformReady = platformCheck.installed;
      } catch {
        esp32PlatformReady = false;
      }
    }

    // 3. Create temp workspace for real sketch files
    tempWorkspaceDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cs-real-esp32-'));
  }, 15000);

  afterAll(async () => {
    try {
      await fs.promises.rm(tempWorkspaceDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('detects real host Arduino CLI and reports status accurately', () => {
    if (!cliPath) {
      console.warn('Real toolchain note: Arduino CLI binary was not found on host.');
    } else {
      expect(typeof cliPath).toBe('string');
      expect(fs.existsSync(cliPath)).toBe(true);
    }
  });

  it('performs a REAL compilation for AI Thinker ESP32-CAM (esp32:esp32:esp32cam) when platform is installed', async () => {
    if (!cliPath || !esp32PlatformReady) {
      console.log('Skipping real compile: Arduino CLI or ESP32 platform core is missing on this machine.');
      return;
    }

    // Create a real ESP32-CAM sketch (blinks onboard flash LED on GPIO 4)
    const sketchDir = path.join(tempWorkspaceDir, 'esp32_cam_blink');
    await fs.promises.mkdir(sketchDir, { recursive: true });
    const sketchFile = path.join(sketchDir, 'esp32_cam_blink.ino');

    const sketchContent = [
      '#define FLASH_LED_PIN 4',
      'void setup() {',
      '  pinMode(FLASH_LED_PIN, OUTPUT);',
      '}',
      'void loop() {',
      '  digitalWrite(FLASH_LED_PIN, HIGH);',
      '  delay(500);',
      '  digitalWrite(FLASH_LED_PIN, LOW);',
      '  delay(500);',
      '}'
    ].join('\n');

    await fs.promises.writeFile(sketchFile, sketchContent, 'utf8');

    // Run real compilation
    const result = await compileProject({
      sketchPath: sketchFile,
      fqbn: 'esp32:esp32:esp32cam',
      customCliPath: cliPath,
      timeoutMs: 60000
    });

    // Verify real compiler results
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeGreaterThan(50);
    expect(result.stdout).toContain('Sketch uses');
    expect(result.memoryUsage.programStorage).toBeDefined();
    expect(result.memoryUsage.programStorage.usedBytes).toBeGreaterThan(10000);
    expect(result.problems).toHaveLength(0);
  }, 75000);

  it('correctly catches and parses a REAL compiler error on ESP32 without fabricating success', async () => {
    if (!cliPath || !esp32PlatformReady) {
      console.log('Skipping real error test: Arduino CLI or ESP32 platform core is missing.');
      return;
    }

    // Create a sketch with an intentional compiler error (syntax & undeclared pin)
    const sketchDir = path.join(tempWorkspaceDir, 'esp32_cam_error');
    await fs.promises.mkdir(sketchDir, { recursive: true });
    const sketchFile = path.join(sketchDir, 'esp32_cam_error.ino');

    const invalidContent = [
      'void setup() {',
      '  unresolved_hardware_identifier = 42;',
      '}',
      'void loop() {}'
    ].join('\n');

    await fs.promises.writeFile(sketchFile, invalidContent, 'utf8');

    const result = await compileProject({
      sketchPath: sketchFile,
      fqbn: 'esp32:esp32:esp32cam',
      customCliPath: cliPath,
      timeoutMs: 45000
    });

    // Requirement: Never fabricate output or return success after a failed compiler process
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('error:');
    expect(result.stderr).toContain('unresolved_hardware_identifier');

    // Verify error was parsed into structured Problems entry
    expect(result.problems.length).toBeGreaterThanOrEqual(1);
    const problem = result.problems.find((p) => p.message.includes('unresolved_hardware_identifier'));
    expect(problem).toBeDefined();
    expect(problem.line).toBe(2);
    expect(problem.severity).toBe('error');
  }, 60000);
});
