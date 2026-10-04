/**
 * CircuitSage AI — Secure Workspace File System IPC Handler
 *
 * Enforces strict boundary isolation:
 * - Restricts read/write operations exclusively to user-authorized workspace directories
 * - Rejects directory traversal attempts (../)
 * - Restricts allowed file extensions to firmware and project source files
 * - Prevents reading/writing of sensitive files (.git, .env*, system paths)
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

  return { success: true, entries: result };
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
  return { success: true, content, filePath: safePath };
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
  return { success: true, filePath: safePath };
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
  validatePathInWorkspace,
  _setActiveWorkspaceForTesting,
  ALLOWED_EXTENSIONS
};
