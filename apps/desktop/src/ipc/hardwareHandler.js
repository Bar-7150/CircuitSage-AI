/**
 * CircuitSage AI — Hardware Serial Port & Communication IPC Handler
 */

const fs = require('fs');
const path = require('path');
const { serialService, redactSensitiveData } = require('../services/serialService');
const { _getActiveWorkspaceForTesting } = require('./workspaceHandler');

async function handleListPorts() {
  const ports = await serialService.listPorts();
  return { success: true, ports };
}

async function handleConnectSerial(_event, payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('INVALID_PAYLOAD: Serial connect payload must be an object with port and baudRate.');
  }
  return await serialService.connect(payload);
}

async function handleDisconnectSerial() {
  return await serialService.disconnect();
}

async function handleSendSerial(_event, payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('INVALID_PAYLOAD: Serial send payload must be an object with text and lineEnding.');
  }
  return await serialService.write(payload);
}

function handleGetSerialState() {
  return { success: true, state: serialService.getState() };
}

function handleClearSerialLogs() {
  return serialService.clearLogs();
}

function handleGetSerialLogs(_event, options = {}) {
  const { forAi = false } = options;
  if (forAi) {
    return serialService.getLogsForAi(true);
  }
  return serialService.getLogs();
}

function handleSetAiAuthorization(_event, payload = {}) {
  return serialService.setAiAuthorization(payload.authorized);
}

async function handleSaveSerialLog(_event, payload = {}) {
  const { fileName = 'serial_session.log', content = '' } = payload;
  const workspaceRoot = _getActiveWorkspaceForTesting ? _getActiveWorkspaceForTesting() : null;

  if (!workspaceRoot) {
    throw new Error('NO_WORKSPACE: Cannot save serial log without an active workspace.');
  }

  // Prevent directory traversal
  const safeName = path.basename(fileName);
  const targetPath = path.join(workspaceRoot, safeName);

  // Redact secrets before saving to file
  const sanitizedContent = redactSensitiveData(content);

  await fs.promises.writeFile(targetPath, sanitizedContent, 'utf8');
  return {
    success: true,
    savedPath: targetPath,
    bytesWritten: Buffer.byteLength(sanitizedContent, 'utf8')
  };
}

module.exports = {
  handleListPorts,
  handleConnectSerial,
  handleDisconnectSerial,
  handleSendSerial,
  handleGetSerialState,
  handleClearSerialLogs,
  handleGetSerialLogs,
  handleSetAiAuthorization,
  handleSaveSerialLog
};
