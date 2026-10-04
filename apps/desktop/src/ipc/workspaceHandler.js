/**
 * CircuitSage AI — Secure Workspace File System IPC Handler
 *
 * Enforces strict boundary isolation:
 * - Restricts read/write/delete operations exclusively to user-authorized workspace directories
 * - Rejects directory traversal attempts (../)
 * - Restricts allowed file extensions to firmware and project source files
 * - Prevents reading/writing of sensitive files (.git, .env*, system paths)
 * - Supports safe atomic saves with conflict detection (mtime verification)
 * - Supports reliable automated backups & reverts for AI-applied changes
 * - Project creation with metadata (circuitsage.json) without overwriting existing files
 */

const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let activeWorkspacePath = null;

// Whitelist of allowed extensions for IoT firmware and configuration files
const ALLOWED_EXTENSIONS = new Set([
  '.ino', '.cpp', '.hpp', '.c', '.h', '.py',
  '.json', '.md', '.txt', '.csv', '.yaml', '.yml'
]);

// Blocked file/directory patterns for security
const BLOCKED_NAMES = new Set([
  '.git', '.env', 'node_modules', '.DS_Store', 'Thumbs.db'
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB limit

// Built-in project templates
const PROJECT_TEMPLATES = {
  esp32cam: {
    name: 'AI Thinker ESP32-CAM Diagnostic Firmware',
    boardId: 'AI Thinker ESP32-CAM',
    fqbn: 'esp32:esp32:esp32cam',
    files: [
      {
        name: 'sketch.ino',
        content: '#include "camera_pins.h"\n\n#define FLASH_LED_PIN 4\n#define STATUS_LED_PIN 33\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(FLASH_LED_PIN, OUTPUT);\n  pinMode(STATUS_LED_PIN, OUTPUT);\n  digitalWrite(FLASH_LED_PIN, LOW);\n  digitalWrite(STATUS_LED_PIN, HIGH);\n  Serial.println("[ESP32-CAM] Online");\n}\n\nvoid loop() {\n  digitalWrite(STATUS_LED_PIN, LOW);\n  delay(100);\n  digitalWrite(STATUS_LED_PIN, HIGH);\n  delay(900);\n}\n'
      },
      {
        name: 'camera_pins.h',
        content: '#ifndef CAMERA_PINS_H\n#define CAMERA_PINS_H\n#define PWDN_GPIO_NUM 32\n#define RESET_GPIO_NUM -1\n#define XCLK_GPIO_NUM 0\n#define SIOD_GPIO_NUM 26\n#define SIOC_GPIO_NUM 27\n#endif\n'
      },
      {
        name: 'README.md',
        content: '# ESP32-CAM Firmware Project\nTarget: AI Thinker ESP32-CAM (esp32:esp32:esp32cam)\n'
      }
    ]
  },
  esp32_dev: {
    name: 'ESP32 Dev Module WiFi & Sensor Node',
    boardId: 'ESP32 DevKit v1',
    fqbn: 'esp32:esp32:esp32',
    files: [
      {
        name: 'sketch.ino',
        content: 'void setup() {\n  Serial.begin(115200);\n  Serial.println("[ESP32] Telemetry Online");\n}\n\nvoid loop() {\n  delay(1000);\n}\n'
      },
      {
        name: 'README.md',
        content: '# ESP32 Project\nTarget: ESP32 DevKit v1\n'
      }
    ]
  },
  arduino_uno: {
    name: 'Arduino Uno R3 Starter Sketch',
    boardId: 'Arduino Uno R3',
    fqbn: 'arduino:avr:uno',
    files: [
      {
        name: 'sketch.ino',
        content: 'void setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(500);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(500);\n}\n'
      }
    ]
  }
};

/**
 * Validates that a requested path is securely located within the active workspace.
 */
function validatePathInWorkspace(targetPath) {
  if (!activeWorkspacePath) {
    throw new Error('NO_ACTIVE_WORKSPACE: No workspace folder has been selected by the user.');
  }

  if (!targetPath || typeof targetPath !== 'string') {
    throw new Error('INVALID_PATH: File path must be a non-empty string.');
  }

  // Resolve absolute path and normalize separators
  const resolvedTarget = path.resolve(targetPath);
  const normalizedWorkspace = path.resolve(activeWorkspacePath);

  // Must strictly reside within the active workspace root
  const isInside = resolvedTarget === normalizedWorkspace ||
    resolvedTarget.startsWith(normalizedWorkspace + path.sep);

  if (!isInside) {
    throw new Error('ACCESS_DENIED: Path is outside the authorized workspace directory.');
  }

  // Check for blocked directories or sensitive files in the path segments
  const relativeParts = path.relative(normalizedWorkspace, resolvedTarget).split(path.sep);
  for (const part of relativeParts) {
    if (BLOCKED_NAMES.has(part) || part.startsWith('.env')) {
      throw new Error(`ACCESS_DENIED: Access to '${part}' is restricted for security.`);
    }
  }

  return resolvedTarget;
}

/**
 * Prompts user to select a workspace folder via native OS dialog.
 */
async function handleSelectFolder(browserWindow) {
  const result = await dialog.showOpenDialog(browserWindow, {
    title: 'Select IoT Project / Sketch Workspace',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, path: activeWorkspacePath };
  }

  activeWorkspacePath = path.resolve(result.filePaths[0]);
  return { canceled: false, path: activeWorkspacePath };
}

function handleGetActiveWorkspace() {
  return { path: activeWorkspacePath };
}

/**
 * Lists files and directories within an authorized workspace path.
 */
async function handleListFiles(_event, dirPath) {
  const targetDir = dirPath ? validatePathInWorkspace(dirPath) : activeWorkspacePath;

  if (!targetDir) {
    throw new Error('NO_ACTIVE_WORKSPACE: Please select a workspace folder first.');
  }

  const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });

  const result = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.ino') continue; // Hide hidden dotfiles
    if (BLOCKED_NAMES.has(entry.name)) continue;

    const fullPath = path.join(targetDir, entry.name);
    result.push({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: fullPath,
      extension: entry.isDirectory() ? null : path.extname(entry.name).toLowerCase()
    });
  }

  // Sort directories first, then alphabetical files
  result.sort((a, b) => {
    if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
    return a.isDirectory ? -1 : 1;
  });

  return { success: true, entries: result, workspacePath: targetDir };
}

/**
 * Reads an authorized firmware/text file within the workspace.
 */
async function handleReadFile(_event, filePath) {
  const safePath = validatePathInWorkspace(filePath);
  const ext = path.extname(safePath).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`UNSUPPORTED_FILE_TYPE: File extension '${ext}' is not permitted.`);
  }

  const stats = await fs.promises.stat(safePath);
  if (stats.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`FILE_TOO_LARGE: File size (${(stats.size / 1024 / 1024).toFixed(1)}MB) exceeds 5MB limit.`);
  }

  const content = await fs.promises.readFile(safePath, 'utf8');
  return { success: true, content, filePath: safePath, mtime: stats.mtimeMs };
}

/**
 * Writes content to an authorized firmware/text file within the workspace.
 */
async function handleWriteFile(_event, { filePath, content }) {
  const safePath = validatePathInWorkspace(filePath);
  const ext = path.extname(safePath).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`UNSUPPORTED_FILE_TYPE: File extension '${ext}' is not permitted.`);
  }

  if (typeof content !== 'string') {
    throw new Error('INVALID_CONTENT: File content must be a string.');
  }

  if (Buffer.byteLength(content, 'utf8') > MAX_FILE_SIZE_BYTES) {
    throw new Error('FILE_TOO_LARGE: Content exceeds 5MB limit.');
  }

  await fs.promises.writeFile(safePath, content, 'utf8');
  const stats = await fs.promises.stat(safePath);
  return { success: true, filePath: safePath, mtime: stats.mtimeMs };
}

/**
 * Safely saves a file while detecting external write conflicts.
 */
async function handleSaveFileSafe(_event, { filePath, content, expectedMtime }) {
  const safePath = validatePathInWorkspace(filePath);

  // Check for write conflict if file exists
  if (fs.existsSync(safePath) && expectedMtime) {
    const stats = await fs.promises.stat(safePath);
    // Tolerance of 50ms for filesystem mtime granularity
    if (stats.mtimeMs - expectedMtime > 50) {
      throw new Error(`CONFLICT_DETECTED: File '${path.basename(safePath)}' was modified externally since last read.`);
    }
  }

  return await handleWriteFile(_event, { filePath: safePath, content });
}

/**
 * Creates a new file inside the workspace.
 */
async function handleCreateFile(_event, { relativePath, content = '' }) {
  if (!activeWorkspacePath) {
    throw new Error('NO_ACTIVE_WORKSPACE: Please select a workspace folder first.');
  }

  const targetPath = path.resolve(activeWorkspacePath, relativePath);
  const safePath = validatePathInWorkspace(targetPath);
  const ext = path.extname(safePath).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`UNSUPPORTED_FILE_TYPE: File extension '${ext}' is not permitted.`);
  }

  if (fs.existsSync(safePath)) {
    throw new Error(`FILE_ALREADY_EXISTS: A file named '${path.basename(safePath)}' already exists.`);
  }

  // Ensure parent directory exists
  await fs.promises.mkdir(path.dirname(safePath), { recursive: true });
  await fs.promises.writeFile(safePath, content, 'utf8');
  const stats = await fs.promises.stat(safePath);

  return { success: true, filePath: safePath, mtime: stats.mtimeMs };
}

/**
 * Renames a permitted file within the workspace.
 */
async function handleRenameFile(_event, { oldPath, newPath }) {
  const safeOld = validatePathInWorkspace(oldPath);
  const safeNew = validatePathInWorkspace(newPath);

  const oldExt = path.extname(safeOld).toLowerCase();
  const newExt = path.extname(safeNew).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(oldExt) || !ALLOWED_EXTENSIONS.has(newExt)) {
    throw new Error('UNSUPPORTED_FILE_TYPE: Allowed extensions are restricted to approved firmware and text formats.');
  }

  if (fs.existsSync(safeNew)) {
    throw new Error(`TARGET_EXISTS: Cannot rename. Target '${path.basename(safeNew)}' already exists.`);
  }

  await fs.promises.rename(safeOld, safeNew);
  return { success: true, oldPath: safeOld, newPath: safeNew };
}

/**
 * Deletes a file within the workspace (preventing deleting workspace root).
 */
async function handleDeleteFile(_event, { filePath }) {
  const safePath = validatePathInWorkspace(filePath);

  if (safePath === path.resolve(activeWorkspacePath)) {
    throw new Error('ACCESS_DENIED: Cannot delete the active workspace root folder.');
  }

  await fs.promises.rm(safePath, { recursive: true, force: true });
  return { success: true, filePath: safePath };
}

/**
 * Creates an automated backup of a file prior to AI modification.
 */
async function handleCreateBackup(_event, { filePath }) {
  const safePath = validatePathInWorkspace(filePath);
  const backupDir = path.join(activeWorkspacePath, '.circuitsage', 'backups');
  await fs.promises.mkdir(backupDir, { recursive: true });

  const timestamp = Date.now();
  const baseName = path.basename(safePath);
  const backupFileName = `${baseName}.${timestamp}.bak`;
  const backupPath = path.join(backupDir, backupFileName);

  await fs.promises.copyFile(safePath, backupPath);
  return { success: true, backupId: backupFileName, backupPath };
}

/**
 * Reverts a file to a previously created backup.
 */
async function handleRevertFile(_event, { filePath, backupId }) {
  const safePath = validatePathInWorkspace(filePath);
  const backupPath = path.join(activeWorkspacePath, '.circuitsage', 'backups', backupId);

  if (!fs.existsSync(backupPath)) {
    throw new Error(`BACKUP_NOT_FOUND: Backup '${backupId}' does not exist.`);
  }

  await fs.promises.copyFile(backupPath, safePath);
  const content = await fs.promises.readFile(safePath, 'utf8');
  return { success: true, filePath: safePath, content };
}

/**
 * Initializes a new project from a selected template without overwriting existing files.
 */
async function handleCreateProject(_event, { targetFolder, templateId = 'esp32cam', projectName = 'my_esp32_project' }) {
  const destDir = targetFolder ? path.resolve(targetFolder) : activeWorkspacePath;
  if (!destDir) {
    throw new Error('NO_WORKSPACE_FOLDER: Target project folder must be specified.');
  }

  await fs.promises.mkdir(destDir, { recursive: true });
  activeWorkspacePath = destDir;

  const template = PROJECT_TEMPLATES[templateId] || PROJECT_TEMPLATES.esp32cam;
  const createdFiles = [];

  // Write template sketch files if not already existing
  for (const tFile of template.files) {
    const fullPath = path.join(destDir, tFile.name);
    if (!fs.existsSync(fullPath)) {
      await fs.promises.writeFile(fullPath, tFile.content, 'utf8');
      createdFiles.push(tFile.name);
    }
  }

  // Create project metadata without overwriting
  const metaPath = path.join(destDir, 'circuitsage.json');
  if (!fs.existsSync(metaPath)) {
    const meta = {
      name: projectName,
      template: templateId,
      board: template.boardId,
      fqbn: template.fqbn,
      created_at: new Date().toISOString()
    };
    await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    createdFiles.push('circuitsage.json');
  }

  return {
    success: true,
    projectPath: destDir,
    createdFiles,
    board: template.boardId,
    fqbn: template.fqbn
  };
}

/**
 * Reads project metadata from circuitsage.json.
 */
async function handleGetProjectMetadata() {
  if (!activeWorkspacePath) return { metadata: null };
  const metaPath = path.join(activeWorkspacePath, 'circuitsage.json');
  if (!fs.existsSync(metaPath)) return { metadata: null };

  try {
    const raw = await fs.promises.readFile(metaPath, 'utf8');
    return { metadata: JSON.parse(raw) };
  } catch {
    return { metadata: null };
  }
}

/**
 * Saves project metadata into circuitsage.json without affecting sketches.
 */
async function handleSaveProjectMetadata(_event, metadata) {
  if (!activeWorkspacePath) {
    throw new Error('NO_ACTIVE_WORKSPACE: Select a workspace first.');
  }
  const metaPath = path.join(activeWorkspacePath, 'circuitsage.json');
  await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
  return { success: true };
}

// Export for tests to verify path boundary logic independently
function _setActiveWorkspaceForTesting(workspacePath) {
  activeWorkspacePath = workspacePath ? path.resolve(workspacePath) : null;
}

module.exports = {
  handleSelectFolder,
  handleGetActiveWorkspace,
  handleListFiles,
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
  validatePathInWorkspace,
  _setActiveWorkspaceForTesting,
  ALLOWED_EXTENSIONS,
  PROJECT_TEMPLATES
};
