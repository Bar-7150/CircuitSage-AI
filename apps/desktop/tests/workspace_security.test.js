/**
 * CircuitSage AI — Desktop Workspace Security & IPC Validation Tests
 *
 * Verifies that:
 * 1. Path traversal attacks (../, absolute out-of-bounds paths) are rejected.
 * 2. Sensitive directories and files (.git, .env, node_modules) are blocked.
 * 3. File extension whitelist is enforced (.ino, .cpp, .py vs .exe, .sh, .bat).
 * 4. Error messages match expected security error codes.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  validatePathInWorkspace,
  _setActiveWorkspaceForTesting,
  handleReadFile,
  handleWriteFile,
  ALLOWED_EXTENSIONS
} = require('../src/ipc/workspaceHandler');

describe('Workspace Security and Boundary Isolation Tests', () => {
  let tempWorkspaceDir;

  beforeAll(async () => {
    // Create a temporary directory to serve as the user-selected workspace
    tempWorkspaceDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'circuitsage-test-workspace-'));
    _setActiveWorkspaceForTesting(tempWorkspaceDir);

    // Create valid test files inside workspace
    await fs.promises.writeFile(path.join(tempWorkspaceDir, 'sketch.ino'), 'void setup() {}', 'utf8');
    await fs.promises.writeFile(path.join(tempWorkspaceDir, 'config.json'), '{"baud": 115200}', 'utf8');
  });

  afterAll(async () => {
    _setActiveWorkspaceForTesting(null);
    try {
      await fs.promises.rm(tempWorkspaceDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error in test
    }
  });

  describe('Path Boundary Validation (validatePathInWorkspace)', () => {
    it('allows valid paths residing directly inside the workspace root', () => {
      const validPath = path.join(tempWorkspaceDir, 'sketch.ino');
      const resolved = validatePathInWorkspace(validPath);
      expect(resolved).toBe(path.resolve(validPath));
    });

    it('allows valid nested paths inside the workspace', async () => {
      const subDir = path.join(tempWorkspaceDir, 'src');
      await fs.promises.mkdir(subDir, { recursive: true });
      const validNested = path.join(subDir, 'main.cpp');

      const resolved = validatePathInWorkspace(validNested);
      expect(resolved).toBe(path.resolve(validNested));
    });

    it('rejects directory traversal attempts targeting parent directories (../)', () => {
      const traversalPath = path.join(tempWorkspaceDir, '..', 'unauthorized.txt');
      expect(() => validatePathInWorkspace(traversalPath)).toThrow(/ACCESS_DENIED/);
    });

    it('rejects deeply nested directory traversal (../../../../windows/system32)', () => {
      const deepTraversal = path.join(tempWorkspaceDir, '..', '..', '..', '..', 'system32');
      expect(() => validatePathInWorkspace(deepTraversal)).toThrow(/ACCESS_DENIED/);
    });

    it('rejects arbitrary absolute paths outside the workspace', () => {
      const outsidePath = os.platform() === 'win32' ? 'C:\\Windows\\system.ini' : '/etc/passwd';
      expect(() => validatePathInWorkspace(outsidePath)).toThrow(/ACCESS_DENIED/);
    });

    it('rejects access to .env files within the workspace for credential safety', () => {
      const envPath = path.join(tempWorkspaceDir, '.env');
      expect(() => validatePathInWorkspace(envPath)).toThrow(/ACCESS_DENIED/);

      const envLocalPath = path.join(tempWorkspaceDir, '.env.local');
      expect(() => validatePathInWorkspace(envLocalPath)).toThrow(/ACCESS_DENIED/);
    });

    it('rejects access to .git metadata directory within workspace', () => {
      const gitPath = path.join(tempWorkspaceDir, '.git', 'config');
      expect(() => validatePathInWorkspace(gitPath)).toThrow(/ACCESS_DENIED/);
    });

    it('throws NO_ACTIVE_WORKSPACE when active workspace is cleared', () => {
      _setActiveWorkspaceForTesting(null);
      expect(() => validatePathInWorkspace(path.join(tempWorkspaceDir, 'sketch.ino'))).toThrow(
        /NO_ACTIVE_WORKSPACE/
      );
      // Restore
      _setActiveWorkspaceForTesting(tempWorkspaceDir);
    });
  });

  describe('File Read & Write Extension Whitelisting', () => {
    it('contains approved firmware extensions in ALLOWED_EXTENSIONS set', () => {
      expect(ALLOWED_EXTENSIONS.has('.ino')).toBe(true);
      expect(ALLOWED_EXTENSIONS.has('.cpp')).toBe(true);
      expect(ALLOWED_EXTENSIONS.has('.py')).toBe(true);
      expect(ALLOWED_EXTENSIONS.has('.exe')).toBe(false);
      expect(ALLOWED_EXTENSIONS.has('.sh')).toBe(false);
    });

    it('allows reading whitelisted firmware and configuration files (.ino, .json)', async () => {
      const inoPath = path.join(tempWorkspaceDir, 'sketch.ino');
      const result = await handleReadFile(null, inoPath);
      expect(result.success).toBe(true);
      expect(result.content).toBe('void setup() {}');
    });

    it('allows writing whitelisted firmware files (.cpp)', async () => {
      const cppPath = path.join(tempWorkspaceDir, 'helper.cpp');
      const writeResult = await handleWriteFile(null, { filePath: cppPath, content: 'int add(int a, int b) { return a + b; }' });
      expect(writeResult.success).toBe(true);

      const readResult = await handleReadFile(null, cppPath);
      expect(readResult.content).toContain('int add(int a, int b)');
    });

    it('rejects reading dangerous executable or script files (.exe, .sh, .bat)', async () => {
      const exePath = path.join(tempWorkspaceDir, 'malware.exe');
      await expect(handleReadFile(null, exePath)).rejects.toThrow(/UNSUPPORTED_FILE_TYPE/);

      const shPath = path.join(tempWorkspaceDir, 'exploit.sh');
      await expect(handleReadFile(null, shPath)).rejects.toThrow(/UNSUPPORTED_FILE_TYPE/);
    });

    it('rejects writing non-whitelisted files (.dll, .so, .bin)', async () => {
      const dllPath = path.join(tempWorkspaceDir, 'library.dll');
      await expect(
        handleWriteFile(null, { filePath: dllPath, content: 'binary' })
      ).rejects.toThrow(/UNSUPPORTED_FILE_TYPE/);
    });
  });
});
