/**
 * CircuitSage AI — Secure Electron Preload Script
 *
 * Enforces strict security:
 * - contextIsolation: true
 * - nodeIntegration: false
 * - Whitelists only explicit, validated operations via contextBridge
 * - NEVER exposes Node.js require, process, child_process, or fs directly
 */

const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  // Application Lifecycle & Status
  app: {
    getStatus: () => ipcRenderer.invoke('app:getStatus'),
    getVersion: () => ipcRenderer.invoke('app:getVersion')
  },

  // Secure Workspace & File Operations (Restricted to user-authorized folder)
  workspace: {
    selectFolder: () => ipcRenderer.invoke('workspace:selectFolder'),
    getActiveWorkspace: () => ipcRenderer.invoke('workspace:getActiveWorkspace'),
    listFiles: (dirPath) => ipcRenderer.invoke('workspace:listFiles', dirPath),
    readFile: (filePath) => ipcRenderer.invoke('workspace:readFile', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('workspace:writeFile', { filePath, content }),
    saveFileSafe: (filePath, content, expectedMtime) => ipcRenderer.invoke('workspace:saveFileSafe', { filePath, content, expectedMtime }),
    createFile: (relativePath, content) => ipcRenderer.invoke('workspace:createFile', { relativePath, content }),
    renameFile: (oldPath, newPath) => ipcRenderer.invoke('workspace:renameFile', { oldPath, newPath }),
    deleteFile: (filePath) => ipcRenderer.invoke('workspace:deleteFile', { filePath }),
    createBackup: (filePath) => ipcRenderer.invoke('workspace:createBackup', { filePath }),
    revertFile: (filePath, backupId) => ipcRenderer.invoke('workspace:revertFile', { filePath, backupId }),
    createProject: (payload) => ipcRenderer.invoke('workspace:createProject', payload),
    getProjectMetadata: () => ipcRenderer.invoke('workspace:getProjectMetadata'),
    saveProjectMetadata: (metadata) => ipcRenderer.invoke('workspace:saveProjectMetadata', metadata)
  },

  // Local Hardware Discovery & Real Serial Monitor Communication
  hardware: {
    listPorts: () => ipcRenderer.invoke('hardware:listPorts'),
    connectSerial: (payload) => ipcRenderer.invoke('hardware:connectSerial', payload),
    disconnectSerial: () => ipcRenderer.invoke('hardware:disconnectSerial'),
    sendSerial: (payload) => ipcRenderer.invoke('hardware:sendSerial', payload),
    getSerialState: () => ipcRenderer.invoke('hardware:getSerialState'),
    clearSerialLogs: () => ipcRenderer.invoke('hardware:clearSerialLogs'),
    getSerialLogs: (options) => ipcRenderer.invoke('hardware:getSerialLogs', options),
    setAiAuthorization: (payload) => ipcRenderer.invoke('hardware:setAiAuthorization', payload),
    saveSerialLog: (payload) => ipcRenderer.invoke('hardware:saveSerialLog', payload),
    onSerialData: (callback) => {
      const listener = (_e, val) => callback(val);
      ipcRenderer.on('hardware:serialData', listener);
      return () => ipcRenderer.removeListener('hardware:serialData', listener);
    },
    onSerialStateChanged: (callback) => {
      const listener = (_e, val) => callback(val);
      ipcRenderer.on('hardware:serialStateChanged', listener);
      return () => ipcRenderer.removeListener('hardware:serialStateChanged', listener);
    },
    onSerialError: (callback) => {
      const listener = (_e, val) => callback(val);
      ipcRenderer.on('hardware:serialError', listener);
      return () => ipcRenderer.removeListener('hardware:serialError', listener);
    }
  },

  // Toolchain, Embedded Build & Firmware Flashing
  toolchain: {
    checkStatus: () => ipcRenderer.invoke('toolchain:checkStatus'),
    getSetupInstructions: () => ipcRenderer.invoke('toolchain:getSetupInstructions'),
    listCores: () => ipcRenderer.invoke('toolchain:listCores'),
    listBoards: (searchFilter) => ipcRenderer.invoke('toolchain:listBoards', searchFilter),
    verifyPlatform: (fqbn) => ipcRenderer.invoke('toolchain:verifyPlatform', fqbn),
    compile: (payload) => ipcRenderer.invoke('toolchain:compile', payload),
    cancelCompile: (buildId) => ipcRenderer.invoke('toolchain:cancelCompile', buildId),
    upload: (payload) => ipcRenderer.invoke('toolchain:upload', payload),
    cancelUpload: (uploadId) => ipcRenderer.invoke('toolchain:cancelUpload', uploadId),
    getPresets: () => ipcRenderer.invoke('toolchain:getPresets')
  },

  // Controlled Embedded Development Agent Operations
  agent: {
    runTask: (payload) => ipcRenderer.invoke('agent:runTask', payload),
    cancelTask: () => ipcRenderer.invoke('agent:cancelTask'),
    approvePatch: (patchId) => ipcRenderer.invoke('agent:approvePatch', { patchId }),
    rejectPatch: (patchId) => ipcRenderer.invoke('agent:rejectPatch', { patchId }),
    getCapabilities: () => ipcRenderer.invoke('agent:getCapabilities'),
    onEvent: (callback) => {
      const listener = (_e, val) => callback(val);
      ipcRenderer.on('agent:event', listener);
      return () => ipcRenderer.removeListener('agent:event', listener);
    }
  }
};

// Expose safe, whitelisted API under window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
