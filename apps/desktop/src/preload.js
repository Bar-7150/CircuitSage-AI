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
    writeFile: (filePath, content) => ipcRenderer.invoke('workspace:writeFile', { filePath, content })
  },

  // Local Hardware Discovery
  hardware: {
    listPorts: () => ipcRenderer.invoke('hardware:listPorts')
  },

  // Toolchain Status (Arduino CLI check)
  toolchain: {
    checkStatus: () => ipcRenderer.invoke('toolchain:checkStatus')
  }
};

// Expose safe, whitelisted API under window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
