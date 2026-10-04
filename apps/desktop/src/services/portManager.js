/**
 * CircuitSage AI — Port Ownership & Mutual Exclusion Manager
 *
 * Prevents simultaneous access conflicts between the Serial Monitor
 * and the firmware upload service on the same serial communication port.
 *
 * Guarantees:
 * - Single port owner at any point in time ('NONE', 'MONITOR', 'UPLOAD')
 * - Automatic pause/resume hooks for active monitor sessions during upload
 * - Strict error signaling when a port is locked
 */

class PortManager {
  constructor() {
    // Map of normalized port path -> ownership state
    // { port: string, owner: 'NONE' | 'MONITOR' | 'UPLOAD', pausedMonitorConfig: object | null }
    this.ports = new Map();
    this.pauseCallbacks = new Map();
    this.resumeCallbacks = new Map();
  }

  normalizePort(port) {
    if (!port || typeof port !== 'string') return '';
    return port.trim().toUpperCase();
  }

  getPortState(port) {
    const key = this.normalizePort(port);
    if (!this.ports.has(key)) {
      this.ports.set(key, {
        port: key,
        owner: 'NONE',
        pausedMonitorConfig: null
      });
    }
    return this.ports.get(key);
  }

  /**
   * Registers callback functions from serialService to handle pause/resume
   */
  registerMonitorHooks(onPause, onResume) {
    this.monitorPauseHook = onPause;
    this.monitorResumeHook = onResume;
  }

  /**
   * Attempts to acquire exclusive ownership of a port
   */
  acquirePort(port, newOwner) {
    const key = this.normalizePort(port);
    if (!key) {
      throw new Error('INVALID_PORT: Port path cannot be empty.');
    }

    const state = this.getPortState(key);

    if (state.owner === newOwner) {
      return { success: true, port: key, owner: newOwner };
    }

    if (state.owner === 'UPLOAD' && newOwner === 'MONITOR') {
      return {
        success: false,
        error: 'PORT_LOCKED_BY_UPLOAD',
        message: `Port '${key}' is currently locked by an active firmware upload.`
      };
    }

    state.owner = newOwner;
    return { success: true, port: key, owner: newOwner };
  }

  /**
   * Releases ownership of a port
   */
  releasePort(port, owner) {
    const key = this.normalizePort(port);
    if (!key || !this.ports.has(key)) return;

    const state = this.ports.get(key);
    if (state.owner === owner || !owner) {
      state.owner = 'NONE';
    }
  }

  /**
   * Pauses an active serial monitor session prior to starting an upload
   */
  async preparePortForUpload(port) {
    const key = this.normalizePort(port);
    const state = this.getPortState(key);

    if (state.owner === 'MONITOR' && this.monitorPauseHook) {
      const config = await this.monitorPauseHook(key);
      state.pausedMonitorConfig = config;
    }

    state.owner = 'UPLOAD';
    return { success: true, port: key };
  }

  /**
   * Resumes a previously paused serial monitor session after upload completes
   */
  async restorePortAfterUpload(port) {
    const key = this.normalizePort(port);
    const state = this.getPortState(key);

    state.owner = 'NONE';

    if (state.pausedMonitorConfig && this.monitorResumeHook) {
      const config = state.pausedMonitorConfig;
      state.pausedMonitorConfig = null;
      await this.monitorResumeHook(key, config);
      state.owner = 'MONITOR';
    }
  }

  isPortLockedByUpload(port) {
    const key = this.normalizePort(port);
    const state = this.getPortState(key);
    return state.owner === 'UPLOAD';
  }

  resetAll() {
    this.ports.clear();
  }
}

// Global singleton instance
const portManager = new PortManager();

module.exports = {
  PortManager,
  portManager
};
