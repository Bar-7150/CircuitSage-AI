/**
 * CircuitSage AI — Agent Execution Routes (/api/v1/agent)
 */

const express = require('express');
const {
  EmbeddedAgentEngine,
  createToolContext,
  GemmaModelProvider
} = require('@circuitsage/shared');

const router = express.Router();

/**
 * GET /api/v1/agent/capabilities
 * Check local Gemma runtime and agent capability detection
 */
router.get('/agent/capabilities', async (req, res, next) => {
  try {
    const provider = new GemmaModelProvider({
      runtimeUrl: process.env.GEMMA_RUNTIME_URL || 'http://127.0.0.1:11434',
      modelName: process.env.GEMMA_MODEL_NAME || 'gemma4:latest'
    });
    const caps = await provider.checkCapabilities();
    res.json({
      success: true,
      data: caps
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/agent/run
 * Run controlled embedded development task
 */
router.post('/agent/run', async (req, res, next) => {
  try {
    const { prompt, context = {} } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Task prompt is required and must be a non-empty string.'
        }
      });
    }

    // Server-side tool context with safe in-memory/mock fallback for cloud mode
    const toolContext = createToolContext({
      workspace: {
        listFiles: async () => context.files || [{ name: 'sketch.ino' }],
        readFile: async () => context.activeFileContent || '',
        writeFile: async () => ({ success: true }),
        createBackup: async () => ({ backupId: `bak-${Date.now()}` }),
        revertFile: async () => ({ success: true }),
        getProjectMetadata: async () => null
      },
      hardware: {
        selectedBoard: context.selectedBoard || { name: 'ESP32 DevKit v1', fqbn: 'esp32:esp32:esp32' }
      },
      toolchain: {
        compile: async () => ({ success: true, exitCode: 0, problems: [] }),
        checkStatus: async () => ({ installed: true })
      }
    });

    const modelProvider = new GemmaModelProvider({
      runtimeUrl: process.env.GEMMA_RUNTIME_URL || 'http://127.0.0.1:11434',
      modelName: process.env.GEMMA_MODEL_NAME || 'gemma4:latest'
    });

    const agent = new EmbeddedAgentEngine({
      toolContext,
      modelProvider,
      maxIterations: 5,
      timeoutMs: 30000
    });

    const report = await agent.runTask(prompt, {
      ...context,
      autoApprovePatches: Boolean(context.autoApprovePatches)
    });

    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
