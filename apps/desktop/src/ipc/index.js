/**
 * CircuitSage AI — IPC Handler Registration Module
 */

const { ipcMain } = require('electron');
const appHandler = require('./appHandler');
const workspaceHandler = require('./workspaceHandler');
const hardwareHandler = require('./hardwareHandler');
const toolchainHandler = require('./toolchainHandler');

/**
 * Helper to safely wrap async IPC handlers with standard error envelope
 */
function wrapHandler(handlerFn, defaultErrorCode = 'IPC_ERROR') {
  return async (event, ...args) => {
    try {
      return await handlerFn(event, ...args);
    } catch (err) {
      console.error('[IPC Error]:', err.message);
      return {
        error: {
          code: err.code || defaultErrorCode,
          message: err.message || 'An error occurred during desktop IPC execution.',
          details: []
        }
      };
    }
  };
}

/**
 * Registers all whitelisted IPC handlers
 *
 * @param {import('electron').BrowserWindow} getMainWindow - Getter returning the active browser window
 */
function registerIpcHandlers(getMainWindow) {
  // Application Info
  ipcMain.handle('app:getStatus', wrapHandler(appHandler.handleGetStatus));
  ipcMain.handle('app:getVersion', wrapHandler(appHandler.handleGetVersion));

  // Workspace Operations
  ipcMain.handle('workspace:selectFolder', wrapHandler(async () => {
    const win = getMainWindow ? getMainWindow() : null;
    return await workspaceHandler.handleSelectFolder(win);
  }));
  ipcMain.handle('workspace:getActiveWorkspace', wrapHandler(workspaceHandler.handleGetActiveWorkspace));
  ipcMain.handle('workspace:listFiles', wrapHandler(workspaceHandler.handleListFiles, 'WORKSPACE_ERROR'));
  ipcMain.handle('workspace:readFile', wrapHandler(workspaceHandler.handleReadFile, 'FILE_READ_ERROR'));
  ipcMain.handle('workspace:writeFile', wrapHandler(workspaceHandler.handleWriteFile, 'FILE_WRITE_ERROR'));

  // Hardware Discovery
  ipcMain.handle('hardware:listPorts', wrapHandler(hardwareHandler.handleListPorts, 'HARDWARE_ERROR'));

  // Toolchain Status
  ipcMain.handle('toolchain:checkStatus', wrapHandler(toolchainHandler.handleCheckStatus, 'TOOLCHAIN_ERROR'));
}

module.exports = {
  registerIpcHandlers
};
