/**
 * CircuitSage AI — App IPC Handler
 */

const { app } = require('electron');

function handleGetStatus() {
  return {
    status: 'running',
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node
  };
}

function handleGetVersion() {
  return {
    version: app.getVersion() || '0.1.0'
  };
}

module.exports = {
  handleGetStatus,
  handleGetVersion
};
