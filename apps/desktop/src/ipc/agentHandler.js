/**
 * CircuitSage AI — Desktop Agent IPC Handler
 *
 * Exposes the controlled agentic embedded-development assistant to Electron renderer.
 * Binds the EmbeddedAgentEngine with real workspace, toolchain, and hardware services.
 */

const {
  EmbeddedAgentEngine,
  createToolContext,
  GemmaModelProvider
} = require('@circuitsage/shared');

const workspaceHandler = require('./workspaceHandler');
const hardwareHandler = require('./hardwareHandler');
const toolchainHandler = require('./toolchainHandler');

let activeAgent = null;
let currentWindowGetter = null;

function setWindowGetter(getter) {
  currentWindowGetter = getter;
}

function broadcastAgentEvent(type, payload) {
  if (!currentWindowGetter) return;
  const win = currentWindowGetter();
  if (win && !win.isDestroyed()) {
    win.webContents.send('agent:event', { type, payload, timestamp: new Date().toISOString() });
  }
}

/**
 * Builds a verified ToolContext connected to desktop IPC services
 */
function buildDesktopToolContext() {
  const workspaceAdapter = {
    listFiles: async () => {
      try {
        const res = await workspaceHandler.handleListFiles();
        return res.files || [];
      } catch {
        return [];
      }
    },
    readFile: async (filePath) => {
      const res = await workspaceHandler.handleReadFile(filePath);
      return res.content;
    },
    writeFile: async (filePath, content) => {
      return await workspaceHandler.handleWriteFile({ filePath, content });
    },
    createBackup: async (filePath) => {
      return await workspaceHandler.handleCreateBackup(filePath);
    },
    revertFile: async (filePath, backupId) => {
      return await workspaceHandler.handleRevertFile({ filePath, backupId });
    },
    getProjectMetadata: async () => {
      try {
        const res = await workspaceHandler.handleGetProjectMetadata();
        return res.metadata || null;
      } catch {
        return null;
      }
    }
  };

  const hardwareAdapter = {
    selectedBoard: { name: 'ESP32 DevKit v1', fqbn: 'esp32:esp32:esp32' },
    listPorts: async () => {
      const res = await hardwareHandler.handleListPorts();
      return res.ports || [];
    },
    getSerialLogs: async (opts) => {
      return await hardwareHandler.handleGetSerialLogs(opts);
    }
  };

  const toolchainAdapter = {
    compile: async (options) => {
      return await toolchainHandler.handleCompile(options);
    },
    checkStatus: async () => {
      return await toolchainHandler.handleCheckStatus();
    }
  };

  return createToolContext({
    workspace: workspaceAdapter,
    hardware: hardwareAdapter,
    toolchain: toolchainAdapter
  });
}

/**
 * Runs an agent task
 */
async function handleRunTask(_event, payload = {}) {
  const { prompt, context = {} } = payload;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('INVALID_ARGUMENT: Task prompt is required.');
  }

  const toolContext = buildDesktopToolContext();
  const modelProvider = new GemmaModelProvider({
    runtimeUrl: process.env.GEMMA_RUNTIME_URL || 'http://127.0.0.1:11434',
    modelName: process.env.GEMMA_MODEL_NAME || 'gemma4:latest'
  });

  activeAgent = new EmbeddedAgentEngine({
    toolContext,
    modelProvider,
    maxIterations: 5,
    timeoutMs: 60000
  });

  activeAgent.onEvent((event, data) => {
    broadcastAgentEvent(event, data);
  });

  const report = await activeAgent.runTask(prompt, context);
  return { success: true, report };
}

/**
 * Cancels current task
 */
async function handleCancelTask() {
  if (!activeAgent) {
    return { success: false, message: 'No active agent task to cancel.' };
  }
  const res = activeAgent.cancel();
  return { success: true, status: res.state };
}

/**
 * Approves a proposed patch
 */
async function handleApprovePatch(_event, payload = {}) {
  if (!activeAgent) {
    throw new Error('NO_ACTIVE_AGENT: No active agent session.');
  }
  const patchId = typeof payload === 'string' ? payload : payload.patchId;
  return activeAgent.approvePatch(patchId);
}

/**
 * Rejects a proposed patch
 */
async function handleRejectPatch(_event, payload = {}) {
  if (!activeAgent) {
    throw new Error('NO_ACTIVE_AGENT: No active agent session.');
  }
  const patchId = typeof payload === 'string' ? payload : payload.patchId;
  return activeAgent.rejectPatch(patchId);
}

/**
 * Queries model and agent capabilities
 */
async function handleGetCapabilities() {
  const provider = new GemmaModelProvider();
  const caps = await provider.checkCapabilities();
  return {
    success: true,
    capabilities: caps
  };
}

module.exports = {
  handleRunTask,
  handleCancelTask,
  handleApprovePatch,
  handleRejectPatch,
  handleGetCapabilities,
  setWindowGetter,
  buildDesktopToolContext
};
