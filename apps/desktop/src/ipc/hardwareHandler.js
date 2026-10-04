/**
 * CircuitSage AI — Hardware Serial Port Discovery IPC Handler
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * Discovers connected USB serial ports for microcontrollers.
 */
async function handleListPorts() {
  const ports = [];

  try {
    if (process.platform === 'win32') {
      // Use standard Windows PowerShell command to query serial devices
      const { stdout } = await execAsync(
        'powershell -NoProfile -Command "Get-CimInstance -Class Win32_SerialPort | Select-Object DeviceID, Description, PNPDeviceID | ConvertTo-Json"',
        { timeout: 3000 }
      );

      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of list) {
          if (item && item.DeviceID) {
            ports.push({
              path: item.DeviceID,
              name: item.Description || item.DeviceID,
              manufacturer: item.PNPDeviceID || 'Generic Serial'
            });
          }
        }
      }
    } else {
      // Linux/macOS standard /dev/tty pattern check
      const { stdout } = await execAsync('ls /dev/ttyACM* /dev/ttyUSB* /dev/tty.usb* 2>/dev/null || true', {
        timeout: 2000
      });

      const lines = stdout.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        ports.push({
          path: line.trim(),
          name: line.trim(),
          manufacturer: 'USB Serial Device'
        });
      }
    }
  } catch {
    // Non-fatal if no serial ports found or command times out
  }

  return { success: true, ports };
}

module.exports = {
  handleListPorts
};
