/**
 * CircuitSage AI — Controlled Embedded Agent Engine Tests
 *
 * Verifies:
 * - Planning & uncertainty parsing
 * - Strict tool input validation & security boundary enforcement
 * - Permission gates (denied patch application, denied build, unauthorized telemetry)
 * - Patch approval & multi-file staging
 * - Compiler error feedback loops & corrective iteration
 * - Cancellation handling
 * - Iteration limits & loop detection
 */

const {
  EmbeddedAgentEngine,
  AGENT_STATES,
  validateToolCall,
  createToolContext,
  GemmaModelProvider
} = require('@circuitsage/shared');

describe('Agent Tool Validation & Security Boundaries', () => {
  it('validates tool existence and rejects unknown tools', () => {
    const res = validateToolCall('unauthorized_shell_exec', { cmd: 'rm -rf /' });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('UNKNOWN_TOOL');
  });

  it('validates required arguments and rejects missing fields', () => {
    const res = validateToolCall('read_workspace_file', {});
    expect(res.valid).toBe(false);
    expect(res.error).toContain('MISSING_ARGUMENT');
  });

  it('strictly rejects path traversal attempts (../)', () => {
    const res = validateToolCall('read_workspace_file', { filePath: '../passwords.txt' });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('INVALID_PATH');
  });

  it('strictly prevents reading sensitive environment and git files', () => {
    const res = validateToolCall('read_workspace_file', { filePath: '.env.local' });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('RESTRICTED_ACCESS');
  });
});

describe('Permission Gates & Approval Enforcement', () => {
  let toolContext;

  beforeEach(() => {
    toolContext = createToolContext({
      workspace: {
        listFiles: async () => [{ name: 'sketch.ino' }],
        readFile: async () => 'void setup() {}',
        writeFile: async () => ({ success: true }),
        createBackup: async () => ({ backupId: 'bak-101' })
      },
      hardware: {
        selectedBoard: { name: 'AI Thinker ESP32-CAM', fqbn: 'esp32:esp32:esp32cam', logicVoltage: '3.3V' },
        aiAuthorized: false
      },
      toolchain: {
        compile: async () => ({ success: true, problems: [] })
      }
    });
  });

  it('rejects patch application without explicit user approval', async () => {
    // Propose patch
    const patchRes = await toolContext.executeTool('propose_patch', {
      file: 'sketch.ino',
      summary: 'Add LED blink',
      oldSnippet: 'void setup() {}',
      newSnippet: 'void setup() { pinMode(4, OUTPUT); }'
    });
    expect(patchRes.success).toBe(true);

    // Attempt to apply without approval
    const applyRes = await toolContext.executeTool('apply_patch', {
      patchId: patchRes.patchId,
      approved: false
    });

    expect(applyRes.success).toBe(false);
    expect(applyRes.error).toBe('PERMISSION_DENIED');
  });

  it('rejects toolchain compilation when user approval is explicitly denied', async () => {
    const res = await toolContext.executeTool('compile_project', {
      sketchPath: 'sketch.ino',
      userApproved: false
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('COMPILATION_APPROVAL_REQUIRED');
  });

  it('rejects reading serial logs when live telemetry sharing is unauthorized', async () => {
    const res = await toolContext.executeTool('read_serial_logs', {});
    expect(res.success).toBe(false);
    expect(res.error).toBe('TELEMETRY_UNAUTHORIZED');
  });
});

describe('Agent Planning & Task Execution Workflow', () => {
  let mockWorkspace;
  let mockToolchain;
  let agent;

  beforeEach(() => {
    mockWorkspace = {
      files: new Map([
        ['sketch.ino', 'void setup() {}\nvoid loop() {}']
      ]),
      listFiles: async () => Array.from(mockWorkspace.files.keys()).map((k) => ({ name: k })),
      readFile: async (file) => mockWorkspace.files.get(file) || '',
      writeFile: async (file, content) => { mockWorkspace.files.set(file, content); return { success: true }; },
      createBackup: async () => ({ backupId: 'bak-1' }),
      getProjectMetadata: async () => null
    };

    mockToolchain = {
      compileAttempts: 0,
      compile: async () => {
        mockToolchain.compileAttempts++;
        return { success: true, durationMs: 950, problems: [] };
      },
      checkStatus: async () => ({ installed: true })
    };

    const toolCtx = createToolContext({
      workspace: mockWorkspace,
      hardware: {
        selectedBoard: {
          id: 'esp32cam',
          name: 'AI Thinker ESP32-CAM',
          fqbn: 'esp32:esp32:esp32cam',
          logicVoltage: '3.3V'
        },
        aiAuthorized: true,
        getSerialLogs: async () => ({ logs: [{ time: '12:00:00', text: '[WiFi] Connected IP: 192.168.1.50' }] })
      },
      toolchain: mockToolchain
    });

    agent = new EmbeddedAgentEngine({
      toolContext: toolCtx,
      modelProvider: new GemmaModelProvider()
    });
  });

  it('plans a complex task, identifies uncertainties, and proposes a firmware patch', async () => {
    const report = await agent.runTask(
      'Create ESP32 firmware to read a DHT22 on GPIO 4, connect to Wi-Fi, and publish readings to an MQTT broker.',
      { autoApprovePatches: false }
    );

    // 1. Verifies planning
    expect(report.plan.length).toBeGreaterThanOrEqual(3);
    expect(report.plan.some((s) => s.tool === 'inspect_board_config')).toBe(true);
    expect(report.plan.some((s) => s.tool === 'propose_patch')).toBe(true);

    // 2. Verifies identified uncertainties
    expect(report.uncertainties.length).toBeGreaterThan(0);
    expect(report.uncertainties.some((u) => u.toLowerCase().includes('wifi') || u.toLowerCase().includes('pull-up'))).toBe(true);

    // 3. Verifies patch staging awaiting approval
    expect(report.status).toBe(AGENT_STATES.AWAITING_APPROVAL);
    expect(report.proposedPatches.length).toBeGreaterThan(0);
    const stagedPatch = report.proposedPatches[0];
    expect(stagedPatch.newSnippet).toContain('DHT22');
    expect(stagedPatch.newSnippet).toContain('PubSubClient');

    // 4. Verifies ESP32-CAM pin conflict resolution (relocated to safe pin)
    expect(stagedPatch.summary).toContain('GPIO 13');
  });

  it('applies approved patch and completes build verification', async () => {
    const report = await agent.runTask(
      'Create ESP32 firmware to read a DHT22 on GPIO 4, connect to Wi-Fi, and publish readings to an MQTT broker.',
      { autoApprovePatches: true }
    );

    expect(report.status).toBe(AGENT_STATES.COMPLETED);
    expect(report.completedActions.length).toBeGreaterThanOrEqual(2);
    expect(report.completedActions.some((a) => a.includes('Applied patch'))).toBe(true);
    expect(report.completedActions.some((a) => a.includes('verified sketch compilation'))).toBe(true);

    // Verify file content was actually updated in workspace
    const updatedSketch = await mockWorkspace.readFile('sketch.ino');
    expect(updatedSketch).toContain('#include <DHT.h>');
    expect(updatedSketch).toContain('#include <PubSubClient.h>');
  });

  it('safely handles user cancellation during execution', async () => {
    agent.onStateChange((event) => {
      if (event === 'plan_generated') {
        agent.cancel();
      }
    });

    const report = await agent.runTask('Create ESP32 firmware to read a DHT22');
    expect(report.status).toBe(AGENT_STATES.CANCELLED);
    expect(agent.isCancelled).toBe(true);
  });
});

describe('Compiler Error Feedback Loop & Iteration Limits', () => {
  it('analyzes actual compiler diagnostics and proposes corrective patches', async () => {
    let compilationCount = 0;
    const mockWorkspace = {
      files: new Map([['sketch.ino', '#include <WiFi.h>\nvoid setup() {}\nvoid loop() {}']]),
      listFiles: async () => [{ name: 'sketch.ino' }],
      readFile: async (f) => mockWorkspace.files.get(f) || '',
      writeFile: async (f, c) => { mockWorkspace.files.set(f, c); return { success: true }; },
      createBackup: async () => ({ backupId: 'bak-1' }),
      getProjectMetadata: async () => null
    };

    const mockToolchain = {
      compile: async () => {
        compilationCount++;
        if (compilationCount === 1) {
          // First attempt fails with missing DHT library
          return {
            success: false,
            exitCode: 1,
            problems: [
              {
                file: 'sketch.ino',
                line: 5,
                column: 1,
                severity: 'error',
                message: "'DHT' does not name a type"
              }
            ]
          };
        }
        // Second attempt succeeds after fix
        return { success: true, exitCode: 0, problems: [] };
      },
      checkStatus: async () => ({ installed: true })
    };

    const toolCtx = createToolContext({
      workspace: mockWorkspace,
      hardware: {
        selectedBoard: { name: 'ESP32 Dev Module', fqbn: 'esp32:esp32:esp32' }
      },
      toolchain: mockToolchain
    });

    const agent = new EmbeddedAgentEngine({
      toolContext: toolCtx,
      maxIterations: 3
    });

    const report = await agent.runTask('Build sketch and correct any compile errors', { autoApprovePatches: true });

    expect(compilationCount).toBeGreaterThanOrEqual(1);
    expect(report.proposedPatches.some((p) => p.summary.includes('DHT'))).toBe(true);
  });

  it('triggers loop detector when the same compiler error repeats across iterations', async () => {
    const mockToolchain = {
      compile: async () => ({
        success: false,
        exitCode: 1,
        problems: [
          {
            file: 'sketch.ino',
            line: 12,
            severity: 'error',
            message: 'fatal error: NonExistentHeader.h: No such file or directory'
          }
        ]
      }),
      checkStatus: async () => ({ installed: true })
    };

    const toolCtx = createToolContext({
      workspace: {
        listFiles: async () => [{ name: 'sketch.ino' }],
        readFile: async () => 'test',
        writeFile: async () => ({ success: true }),
        createBackup: async () => ({ backupId: 'bak-1' }),
        getProjectMetadata: async () => null
      },
      hardware: { selectedBoard: { name: 'ESP32' } },
      toolchain: mockToolchain
    });

    const agent = new EmbeddedAgentEngine({
      toolContext: toolCtx,
      maxIterations: 5
    });

    const report = await agent.runTask('Fix compilation', { autoApprovePatches: true });

    // Verifies loop detection prevented reaching iteration 5
    expect(report.hardwareRecommendations.some((r) => r.includes('Loop detected'))).toBe(true);
  });
});
