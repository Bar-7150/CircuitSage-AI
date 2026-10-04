/**
 * CircuitSage AI — Embedded Build Service Mocked Process Tests
 *
 * Verifies toolchain service behavior using mocked child processes:
 * 1. Successful compilation (exit 0, stdout capture, memory usage calculation)
 * 2. Compilation error handling (exit 1, stderr capture, structured Problems parsing)
 * 3. Missing toolchain executable error handling
 * 4. Process timeout enforcement & process killing
 * 5. Safe compilation cancellation via buildId
 * 6. Shell injection and invalid argument rejection (strict FQBN & path validation)
 * 7. Platform verification without silent installation
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Module under test
const {
  parseCompilerProblems,
  parseMemoryUsage
} = require('../src/services/compilerErrorParser');
const {
  compileProject,
  cancelCompilation,
  verifyPlatformInstalled,
  getSetupInstructions,
  ESP32_BOARD_PRESETS
} = require('../src/services/embeddedBuildService');

describe('Compiler Error and Diagnostic Parsing', () => {
  it('parses single and multiple GCC errors with line and column', () => {
    const stderr = [
      'C:\\Users\\dev\\sketch\\sketch.ino:14:5: error: \'digitalWrite\' was not declared in this scope',
      'C:\\Users\\dev\\sketch\\sketch.ino:19:12: error: expected \';\' before \'}\' token'
    ].join('\n');

    const problems = parseCompilerProblems(stderr);
    expect(problems).toHaveLength(2);

    expect(problems[0]).toEqual({
      file: path.normalize('C:\\Users\\dev\\sketch\\sketch.ino'),
      line: 14,
      column: 5,
      severity: 'error',
      message: '\'digitalWrite\' was not declared in this scope',
      raw: 'C:\\Users\\dev\\sketch\\sketch.ino:14:5: error: \'digitalWrite\' was not declared in this scope'
    });

    expect(problems[1].line).toBe(19);
    expect(problems[1].column).toBe(12);
    expect(problems[1].severity).toBe('error');
  });

  it('parses compiler warnings and informational notes', () => {
    const stderr = [
      '/home/user/project/main.cpp:42:10: warning: unused variable \'tempSensor\' [-Wunused-variable]',
      '/home/user/project/main.cpp:50:3: note: declared here'
    ].join('\n');

    const problems = parseCompilerProblems(stderr);
    expect(problems).toHaveLength(2);
    expect(problems[0].severity).toBe('warning');
    expect(problems[0].message).toContain('unused variable');
    expect(problems[1].severity).toBe('info');
  });

  it('parses memory utilization from standard Arduino CLI output', () => {
    const stdout = [
      'Sketch uses 267488 bytes (8%) of program storage space. Maximum is 3145728 bytes.',
      'Global variables use 22172 bytes (6%) of dynamic memory, leaving 305508 bytes for local variables. Maximum is 327680 bytes.'
    ].join('\n');

    const mem = parseMemoryUsage(stdout);
    expect(mem.programStorage).toEqual({
      usedBytes: 267488,
      percentage: 8,
      maxBytes: 3145728
    });
    expect(mem.dynamicMemory).toEqual({
      usedBytes: 22172,
      percentage: 6,
      freeBytes: 305508,
      maxBytes: 327680
    });
  });
});

describe('Embedded Build Service — Mocked Process Execution', () => {
  let tempSketchDir;
  let tempSketchFile;

  beforeAll(async () => {
    tempSketchDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cs-mock-sketch-'));
    tempSketchFile = path.join(tempSketchDir, 'test.ino');
    await fs.promises.writeFile(tempSketchFile, 'void setup() {}\nvoid loop() {}', 'utf8');
  });

  afterAll(async () => {
    try {
      await fs.promises.rm(tempSketchDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('provides actionable setup instructions when toolchain is missing', () => {
    const instructions = getSetupInstructions();
    expect(instructions.cliInstallInstructions).toContain('Arduino CLI');
    expect(instructions.esp32CoreInstructions).toContain('arduino-cli core install esp32:esp32');
  });

  it('curates ESP32 and ESP32-CAM board presets', () => {
    const camPreset = ESP32_BOARD_PRESETS.find((p) => p.id === 'esp32cam');
    expect(camPreset).toBeDefined();
    expect(camPreset.fqbn).toBe('esp32:esp32:esp32cam');
    expect(camPreset.core).toBe('esp32:esp32');
  });

  it('rejects invalid or potentially malicious FQBN strings (shell injection protection)', async () => {
    await expect(
      compileProject({
        sketchPath: tempSketchFile,
        fqbn: 'esp32:esp32:esp32; rm -rf /',
        customCliPath: 'fake-arduino-cli'
      })
    ).rejects.toThrow(/INVALID_FQBN/);

    await expect(
      compileProject({
        sketchPath: tempSketchFile,
        fqbn: 'esp32:esp32:esp32 & calc.exe',
        customCliPath: 'fake-arduino-cli'
      })
    ).rejects.toThrow(/INVALID_FQBN/);
  });

  it('rejects invalid FQBN during platform verification', async () => {
    await expect(verifyPlatformInstalled('malicious;command')).rejects.toThrow(/INVALID_FQBN/);
  });

  it('rejects non-existent sketch paths', async () => {
    await expect(
      compileProject({
        sketchPath: path.join(tempSketchDir, 'non_existent_sketch.ino'),
        fqbn: 'esp32:esp32:esp32cam',
        customCliPath: 'fake-arduino-cli'
      })
    ).rejects.toThrow(/SKETCH_NOT_FOUND/);
  });

  describe('Mocked Child Process Compile Scenarios', () => {
    let originalSpawn;
    const childProcess = require('child_process');

    beforeEach(() => {
      originalSpawn = childProcess.spawn;
    });

    afterEach(() => {
      childProcess.spawn = originalSpawn;
    });

    it('handles successful compilation (exit code 0, real stdout capture, success true)', async () => {
      childProcess.spawn = jest.fn(() => {
        const mockChild = new EventEmitter();
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = jest.fn();

        process.nextTick(() => {
          mockChild.stdout.emit(
            'data',
            Buffer.from('Sketch uses 267488 bytes (8%) of program storage space. Maximum is 3145728 bytes.\n')
          );
          mockChild.emit('close', 0, null);
        });

        return mockChild;
      });

      const result = await compileProject({
        sketchPath: tempSketchFile,
        fqbn: 'esp32:esp32:esp32cam',
        customCliPath: 'mocked-arduino-cli'
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Sketch uses 267488 bytes');
      expect(result.problems).toHaveLength(0);
      expect(result.memoryUsage.programStorage).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('handles compiler error (exit code 1, stderr capture, structured Problems, success false)', async () => {
      const errorStderr = `${tempSketchFile}:2:3: error: 'undeclared_var' was not declared in this scope\nError during build: exit status 1`;

      childProcess.spawn = jest.fn(() => {
        const mockChild = new EventEmitter();
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = jest.fn();

        process.nextTick(() => {
          mockChild.stderr.emit('data', Buffer.from(errorStderr));
          mockChild.emit('close', 1, null);
        });

        return mockChild;
      });

      const result = await compileProject({
        sketchPath: tempSketchFile,
        fqbn: 'esp32:esp32:esp32cam',
        customCliPath: 'mocked-arduino-cli'
      });

      // Strict requirement: Never fabricate success on compiler failure
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.problems).toHaveLength(1);
      expect(result.problems[0].line).toBe(2);
      expect(result.problems[0].column).toBe(3);
      expect(result.problems[0].message).toContain('undeclared_var');
      expect(result.problems[0].severity).toBe('error');
    });

    it('enforces compilation timeout and terminates the child process', async () => {
      let killedWithSignal = null;

      childProcess.spawn = jest.fn(() => {
        const mockChild = new EventEmitter();
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = jest.fn((sig) => {
          killedWithSignal = sig;
          mockChild.emit('close', null, sig);
        });

        // Do not close immediately; let timeout fire
        return mockChild;
      });

      const result = await compileProject({
        sketchPath: tempSketchFile,
        fqbn: 'esp32:esp32:esp32cam',
        customCliPath: 'mocked-arduino-cli',
        timeoutMs: 50 // Short timeout for test
      });

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(killedWithSignal).toBe('SIGTERM');
    });

    it('supports cancellation via cancelCompilation(buildId)', async () => {
      const buildId = 'test_cancel_build_123';
      let killedSignal = null;

      childProcess.spawn = jest.fn(() => {
        const mockChild = new EventEmitter();
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = jest.fn((sig) => {
          killedSignal = sig;
          mockChild.emit('close', null, sig);
        });

        return mockChild;
      });

      const compilePromise = compileProject({
        sketchPath: tempSketchFile,
        fqbn: 'esp32:esp32:esp32cam',
        customCliPath: 'mocked-arduino-cli',
        buildId
      });

      // Trigger safe cancellation
      const cancelSuccess = cancelCompilation(buildId);
      expect(cancelSuccess).toBe(true);

      const result = await compilePromise;
      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
      expect(killedSignal).toBe('SIGINT');
    });
  });
});
