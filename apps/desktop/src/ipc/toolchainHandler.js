/**
 * CircuitSage AI — Toolchain & Embedded Build IPC Handler
 *
 * Exposes explicit, validated toolchain endpoints:
 * - Status, version, executable resolution, setup instructions
 * - Installed core & supported board discovery
 * - Platform core verification
 * - Sketch project compilation & cancellation
 */

const {
  detectToolchainStatus,
  getSetupInstructions,
  queryInstalledCores,
  querySupportedBoards,
  verifyPlatformInstalled,
  compileProject,
  cancelCompilation,
  ESP32_BOARD_PRESETS
} = require('../services/embeddedBuildService');
const { uploadFirmware, cancelUpload } = require('../services/uploadService');

async function handleCheckStatus() {
  return await detectToolchainStatus();
}

async function handleGetSetupInstructions() {
  return getSetupInstructions();
}

async function handleListCores() {
  const cores = await queryInstalledCores();
  return { success: true, cores };
}

async function handleListBoards(_event, searchFilter) {
  const boards = await querySupportedBoards(searchFilter);
  return { success: true, boards };
}

async function handleVerifyPlatform(_event, fqbn) {
  return await verifyPlatformInstalled(fqbn);
}

async function handleCompile(_event, compilePayload) {
  if (!compilePayload || typeof compilePayload !== 'object') {
    throw new Error('INVALID_PAYLOAD: Compilation payload must be an object.');
  }
  return await compileProject(compilePayload);
}

async function handleCancelCompile(_event, buildId) {
  const cancelled = cancelCompilation(buildId);
  return { success: cancelled };
}

async function handleUpload(_event, uploadPayload) {
  if (!uploadPayload || typeof uploadPayload !== 'object') {
    throw new Error('INVALID_PAYLOAD: Upload payload must be an object.');
  }
  return await uploadFirmware(uploadPayload);
}

async function handleCancelUpload(_event, uploadId) {
  const cancelled = cancelUpload(uploadId);
  return { success: cancelled };
}

function handleGetPresets() {
  return { success: true, presets: ESP32_BOARD_PRESETS };
}

module.exports = {
  handleCheckStatus,
  handleGetSetupInstructions,
  handleListCores,
  handleListBoards,
  handleVerifyPlatform,
  handleCompile,
  handleCancelCompile,
  handleUpload,
  handleCancelUpload,
  handleGetPresets
};

