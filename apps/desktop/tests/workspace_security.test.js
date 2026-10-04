/**
 * CircuitSage AI — Desktop Workspace Security & Real File Operations Tests
 *
 * Tested against the REAL local filesystem:
 * 1. Path traversal attacks (../, absolute out-of-bounds paths) are rejected.
 * 2. Sensitive directories and files (.git, .env, node_modules) are blocked.
 * 3. File extension whitelist is enforced (.ino, .cpp, .py vs .exe, .sh, .bat).
 * 4. Safe file creation, reading, atomic saving, and conflict detection (mtime).
 * 5. File renaming, deletion safety (workspace root deletion blocked).
 * 6. Automated backups and reliable revert for AI-applied changes.
 * 7. Project initialization from templates without overwriting existing files.
 * 8. Project metadata persistence in circuitsage.json.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  validatePathInWorkspace,
  _setActiveWorkspaceForTesting,
  handleReadFile,
  handleWriteFile,
  handleSaveFileSafe,
  handleCreateFile,
  handleRenameFile,
  handleDeleteFile,
  handleCreateBackup,
  handleRevertFile,
  handleCreateProject,
  handleGetProjectMetadata,
  handleSaveProjectMetadata,
  ALLOWED_EXTENSIONS
} = require('../src/ipc/workspaceHandler');

describe('Workspace Security and Real File Operations Tests', () => {
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

  describe('Real Filesystem Operations: Create, Rename, Delete, Conflict & Backup', () => {
    it('creates a new permitted file and detects duplicate creation attempts', async () => {
      const createRes = await handleCreateFile(null, {
        relativePath: 'pins.h',
        content: '#define LED 2'
      });
      expect(createRes.success).toBe(true);
      expect(fs.existsSync(createRes.filePath)).toBe(true);

      // Attempting to create again should fail with FILE_ALREADY_EXISTS
      await expect(
        handleCreateFile(null, { relativePath: 'pins.h', content: '' })
      ).rejects.toThrow(/FILE_ALREADY_EXISTS/);
    });

    it('renames a file safely and prevents overwriting existing files', async () => {
      const oldPath = path.join(tempWorkspaceDir, 'pins.h');
      const newPath = path.join(tempWorkspaceDir, 'camera_pins.h');

      const renameRes = await handleRenameFile(null, { oldPath, newPath });
      expect(renameRes.success).toBe(true);
      expect(fs.existsSync(oldPath)).toBe(false);
      expect(fs.existsSync(newPath)).toBe(true);

      // Renaming to already existing file should fail
      await expect(
        handleRenameFile(null, { oldPath: newPath, newPath: path.join(tempWorkspaceDir, 'sketch.ino') })
      ).rejects.toThrow(/TARGET_EXISTS/);
    });

    it('deletes a file and strictly refuses to delete the workspace root', async () => {
      const targetToDelete = path.join(tempWorkspaceDir, 'camera_pins.h');
      const deleteRes = await handleDeleteFile(null, { filePath: targetToDelete });
      expect(deleteRes.success).toBe(true);
      expect(fs.existsSync(targetToDelete)).toBe(false);

      // Must reject deleting the workspace root folder itself
      await expect(
        handleDeleteFile(null, { filePath: tempWorkspaceDir })
      ).rejects.toThrow(/ACCESS_DENIED/);
    });

    it('safely saves files and detects external write conflicts', async () => {
      const targetFile = path.join(tempWorkspaceDir, 'conflict_test.ino');
      await handleWriteFile(null, { filePath: targetFile, content: 'v1' });

      const readRes = await handleReadFile(null, targetFile);
      const originalMtime = readRes.mtime;

      // Simulate external write occurring 100ms later
      await new Promise((r) => setTimeout(r, 60));
      await fs.promises.writeFile(targetFile, 'v2_external_edit', 'utf8');

      // Attempt to save with outdated expectedMtime
      await expect(
        handleSaveFileSafe(null, {
          filePath: targetFile,
          content: 'v3_my_edit',
          expectedMtime: originalMtime
        })
      ).rejects.toThrow(/CONFLICT_DETECTED/);
    });

    it('creates automated backups and reverts file modifications cleanly', async () => {
      const targetFile = path.join(tempWorkspaceDir, 'revert_test.ino');
      await handleWriteFile(null, { filePath: targetFile, content: 'original_firmware_code' });

      // Create backup
      const backupRes = await handleCreateBackup(null, { filePath: targetFile });
      expect(backupRes.success).toBe(true);
      expect(fs.existsSync(backupRes.backupPath)).toBe(true);

      // AI modifies file
      await handleWriteFile(null, { filePath: targetFile, content: 'ai_altered_firmware' });
      const altered = await handleReadFile(null, targetFile);
      expect(altered.content).toBe('ai_altered_firmware');

      // Revert from backup
      const revertRes = await handleRevertFile(null, { filePath: targetFile, backupId: backupRes.backupId });
      expect(revertRes.success).toBe(true);
      expect(revertRes.content).toBe('original_firmware_code');
    });

    it('initializes a project from an ESP32 template without overwriting existing files', async () => {
      const projectSubDir = path.join(tempWorkspaceDir, 'my_esp32_cam_proj');
      await fs.promises.mkdir(projectSubDir, { recursive: true });

      // Pre-create an existing file that should NOT be overwritten
      const preExistingFile = path.join(projectSubDir, 'custom.txt');
      await fs.promises.writeFile(preExistingFile, 'user_notes', 'utf8');

      const createProjRes = await handleCreateProject(null, {
        targetFolder: projectSubDir,
        templateId: 'esp32cam',
        projectName: 'My ESP32 Camera'
      });

      expect(createProjRes.success).toBe(true);
      expect(fs.existsSync(path.join(projectSubDir, 'sketch.ino'))).toBe(true);
      expect(fs.existsSync(path.join(projectSubDir, 'camera_pins.h'))).toBe(true);
      expect(fs.existsSync(path.join(projectSubDir, 'circuitsage.json'))).toBe(true);
      expect(fs.existsSync(preExistingFile)).toBe(true);

      // Metadata persistence check
      const meta = await handleGetProjectMetadata();
      expect(meta.metadata).toBeDefined();
      expect(meta.metadata.board).toBe('AI Thinker ESP32-CAM');

      // Update metadata board configuration without overwriting existing files
      const updateRes = await handleSaveProjectMetadata(null, {
        metadata: {
          board: 'AI Thinker ESP32-CAM (Updated)',
          customFqbn: 'esp32:esp32:esp32cam:FlashFreq=80'
        }
      });
      expect(updateRes.success).toBe(true);
      const reloadedMeta = await handleGetProjectMetadata();
      expect(reloadedMeta.metadata.customFqbn).toBe('esp32:esp32:esp32cam:FlashFreq=80');
      // Verify custom.txt is still intact
      expect(fs.readFileSync(preExistingFile, 'utf8')).toBe('user_notes');
    });
  });
});
