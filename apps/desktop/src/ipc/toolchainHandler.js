/**
 * CircuitSage AI — Toolchain Status IPC Handler
 *
 * Verifies if Arduino CLI is installed on host system.
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function handleCheckStatus() {
  const isWin = process.platform === 'win32';
  const findCmd = isWin ? 'where arduino-cli' : 'which arduino-cli';

  try {
    const { stdout: binPath } = await execAsync(findCmd, { timeout: 2000 });
    const trimmedPath = binPath.trim().split('\n')[0].trim();

    if (!trimmedPath) {
      return { installed: false, version: null, path: null };
    }

    try {
      const { stdout: versionOut } = await execAsync(`"${trimmedPath}" version --format json`, {
        timeout: 2500
      });
      const parsed = JSON.parse(versionOut);
      return {
        installed: true,
        version: parsed.VersionString || 'installed',
        path: trimmedPath
      };
    } catch {
      return {
        installed: true,
        version: 'installed',
        path: trimmedPath
      };
    }
  } catch {
    return { installed: false, version: null, path: null };
  }
}

module.exports = {
  handleCheckStatus
};
