/**
 * CircuitSage AI — Desktop Preload API Security Smoke Tests
 *
 * Verifies that the preload layer exposes strictly whitelisted APIs via contextBridge
 * and does NOT leak raw Node.js modules or unrestricted shell execution to the renderer.
 */

describe('Desktop Preload API Security Verification', () => {
  let exposedApiKey = null;
  let exposedApiValue = null;

  beforeAll(() => {
    // Mock Electron contextBridge
    const mockContextBridge = {
      exposeInMainWorld: jest.fn((key, value) => {
        exposedApiKey = key;
        exposedApiValue = value;
      })
    };

    const mockIpcRenderer = {
      invoke: jest.fn()
    };

    jest.mock('electron', () => ({
      contextBridge: mockContextBridge,
      ipcRenderer: mockIpcRenderer
    }), { virtual: true });

    // Load the preload script
    require('../src/preload');
  });

  afterAll(() => {
    jest.resetModules();
  });

  it('should expose API exclusively under window.electronAPI namespace', () => {
    expect(exposedApiKey).toBe('electronAPI');
    expect(exposedApiValue).toBeDefined();
    expect(typeof exposedApiValue).toBe('object');
  });

  it('should expose ONLY approved functional namespaces (app, workspace, hardware, toolchain)', () => {
    const exposedNamespaces = Object.keys(exposedApiValue);
    expect(exposedNamespaces.sort()).toEqual(['app', 'hardware', 'toolchain', 'workspace']);
  });

  it('should verify workspace operations are restricted to approved methods', () => {
    const workspaceMethods = Object.keys(exposedApiValue.workspace);
    expect(workspaceMethods.sort()).toEqual([
      'createBackup',
      'createFile',
      'createProject',
      'deleteFile',
      'getActiveWorkspace',
      'getProjectMetadata',
      'listFiles',
      'readFile',
      'renameFile',
      'revertFile',
      'saveFileSafe',
      'saveProjectMetadata',
      'selectFolder',
      'writeFile'
    ]);
  });

  it('should verify toolchain operations are restricted to approved methods', () => {
    const toolchainMethods = Object.keys(exposedApiValue.toolchain);
    expect(toolchainMethods.sort()).toEqual([
      'cancelCompile',
      'checkStatus',
      'compile',
      'getPresets',
      'getSetupInstructions',
      'listBoards',
      'listCores',
      'verifyPlatform'
    ]);
  });

  it('should NOT leak unrestricted Node.js primitives or shell execution', () => {
    expect(exposedApiValue).not.toHaveProperty('require');
    expect(exposedApiValue).not.toHaveProperty('process');
    expect(exposedApiValue).not.toHaveProperty('child_process');
    expect(exposedApiValue).not.toHaveProperty('fs');
    expect(exposedApiValue).not.toHaveProperty('exec');
    expect(exposedApiValue).not.toHaveProperty('spawn');
  });
});
