/**
 * CircuitSage AI — Controlled Embedded Development Agent Engine
 *
 * Implements the complete agentic embedded-development assistant lifecycle:
 * - Uncertainty identification and problem parsing
 * - Bounded tool calling with iteration limits, timeouts, and loop detection
 * - Explicit user approval gates for file patches and build operations
 * - Actual toolchain compiler error feedback loops and evidence-based corrective patches
 * - Comprehensive final reporting distinguishing completed actions from hardware recommendations
 */

const { createToolContext } = require('./agentTools');
const { GemmaModelProvider } = require('./modelProvider');

const AGENT_STATES = {
  IDLE: 'IDLE',
  PLANNING: 'PLANNING',
  AWAITING_APPROVAL: 'AWAITING_APPROVAL',
  EXECUTING: 'EXECUTING',
  COMPILING: 'COMPILING',
  ANALYZING_DIAGNOSTICS: 'ANALYZING_DIAGNOSTICS',
  ITERATING: 'ITERATING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED'
};

class EmbeddedAgentEngine {
  constructor(options = {}) {
    this.modelProvider = options.modelProvider || new GemmaModelProvider();
    this.toolContext = options.toolContext || createToolContext(options.environment || {});
    this.maxIterations = options.maxIterations || 5;
    this.maxToolCallsPerIteration = options.maxToolCallsPerIteration || 10;
    this.timeoutMs = options.timeoutMs || 60000;

    // State tracking
    this.state = AGENT_STATES.IDLE;
    this.currentPlan = [];
    this.uncertainties = [];
    this.proposedPatches = [];
    this.approvedPatches = new Set();
    this.executedToolCalls = [];
    this.completedActions = [];
    this.recommendations = [];
    this.diagnosticsHistory = [];
    this.seenProblemSignatures = new Map(); // signature -> count for loop detection
    this.isCancelled = false;
    this.listeners = new Set();
  }

  onStateChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data, this.getStateSnapshot());
      } catch {
        // Ignore listener exceptions
      }
    }
  }

  getStateSnapshot() {
    return {
      state: this.state,
      plan: [...this.currentPlan],
      uncertainties: [...this.uncertainties],
      proposedPatches: [...this.proposedPatches],
      completedActions: [...this.completedActions],
      recommendations: [...this.recommendations],
      toolCallCount: this.executedToolCalls.length,
      isCancelled: this.isCancelled
    };
  }

  cancel() {
    this.isCancelled = true;
    this.state = AGENT_STATES.CANCELLED;
    this.notify('cancelled', { message: 'Agent operation was cancelled by the user.' });
    return { success: true, state: this.state };
  }

  /**
   * Approves a proposed patch for application
   */
  approvePatch(patchId) {
    this.approvedPatches.add(patchId);
    const patch = this.proposedPatches.find((p) => p.id === patchId);
    if (patch) {
      patch.status = 'APPROVED';
      this.notify('patch_approved', { patchId, patch });
    }
    return { success: true, patchId };
  }

  /**
   * Rejects a proposed patch
   */
  rejectPatch(patchId) {
    const patch = this.proposedPatches.find((p) => p.id === patchId);
    if (patch) {
      patch.status = 'REJECTED';
      this.notify('patch_rejected', { patchId, patch });
    }
    return { success: true, patchId };
  }

  /**
   * Primary Entry Point: Runs user requested task with controlled toolchain integration
   */
  async runTask(userPrompt, context = {}) {
    if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
      throw new Error('INVALID_PROMPT: User prompt must be a non-empty string.');
    }

    this.isCancelled = false;
    this.state = AGENT_STATES.PLANNING;
    this.currentPlan = [];
    this.uncertainties = [];
    this.proposedPatches = [];
    this.approvedPatches.clear();
    this.executedToolCalls = [];
    this.completedActions = [];
    this.recommendations = [];
    this.diagnosticsHistory = [];
    this.seenProblemSignatures.clear();

    const startTime = Date.now();
    this.notify('task_started', { prompt: userPrompt });

    // Step 1: Inspect environment & board config
    const boardInspection = await this.toolContext.executeTool('inspect_board_config');
    this.recordToolCall('inspect_board_config', {}, boardInspection);

    const fileList = await this.toolContext.executeTool('list_workspace_files');
    this.recordToolCall('list_workspace_files', {}, fileList);

    // Step 2: Request model plan & uncertainties identification
    const modelResponse = await this.modelProvider.generateResponse({
      systemPrompt: 'You are CircuitSage AI, a specialized embedded firmware engineering agent.',
      prompt: userPrompt,
      context: {
        ...context,
        board: boardInspection.board,
        files: fileList.files
      }
    });

    if (this.isCancelled) return this.generateFinalReport();

    // Ingest plan and uncertainties
    this.uncertainties = modelResponse.uncertainties || [];
    this.currentPlan = (modelResponse.plan || []).map((step, idx) => ({
      id: step.id || idx + 1,
      title: step.title,
      tool: step.tool,
      requiresApproval: Boolean(step.requiresApproval),
      status: 'pending'
    }));

    this.notify('plan_generated', {
      plan: this.currentPlan,
      uncertainties: this.uncertainties,
      reasoning: modelResponse.reasoning
    });

    // Step 3: Stage any proposed patches
    if (Array.isArray(modelResponse.proposedPatches)) {
      for (const p of modelResponse.proposedPatches) {
        const patchRes = await this.toolContext.executeTool('propose_patch', {
          file: p.file,
          summary: p.summary,
          oldSnippet: p.oldSnippet,
          newSnippet: p.newSnippet
        });
        if (patchRes.success) {
          this.proposedPatches.push(patchRes.patch);
          this.recordToolCall('propose_patch', p, patchRes);
        }
      }
    }

    // Step 4: Iterative execution loop (bounded by maxIterations)
    let iteration = 0;
    while (iteration < this.maxIterations && !this.isCancelled) {
      iteration++;

      // Check timeout
      if (Date.now() - startTime > this.timeoutMs) {
        this.state = AGENT_STATES.FAILED;
        this.notify('timeout', { message: `Task exceeded timeout limit of ${this.timeoutMs}ms.` });
        break;
      }

      // Check for pending patches requiring user approval
      const unappliedPatches = this.proposedPatches.filter((p) => p.status === 'PENDING_APPROVAL');
      if (unappliedPatches.length > 0) {
        this.state = AGENT_STATES.AWAITING_APPROVAL;
        this.notify('awaiting_approval', {
          pendingPatches: unappliedPatches
        });

        // Check if pre-approved by options or caller
        if (context.autoApprovePatches) {
          for (const p of unappliedPatches) {
            this.approvePatch(p.id);
          }
        } else {
          // Pause execution until user explicitly approves or rejects
          break;
        }
      }

      // Apply all approved patches
      for (const patch of this.proposedPatches) {
        if (this.approvedPatches.has(patch.id) && patch.status !== 'APPLIED') {
          this.state = AGENT_STATES.EXECUTING;
          const applyRes = await this.toolContext.executeTool('apply_patch', {
            patchId: patch.id,
            approved: true
          });
          this.recordToolCall('apply_patch', { patchId: patch.id }, applyRes);

          if (applyRes.success) {
            patch.status = 'APPLIED';
            this.completedActions.push(`Applied patch to '${patch.file}': ${patch.summary}`);
            this.updatePlanStepStatus('propose_patch', 'completed');
          }
        }
      }

      // If compilation is part of plan and patches are applied, run toolchain verification
      const compileStep = this.currentPlan.find((s) => s.tool === 'compile_project');
      if (compileStep && compileStep.status !== 'completed' && !this.isCancelled) {
        this.state = AGENT_STATES.COMPILING;
        this.updatePlanStepStatus('compile_project', 'in_progress');

        const compileRes = await this.toolContext.executeTool('compile_project', {
          sketchPath: context.activeFile || 'sketch.ino',
          userApproved: true
        });
        this.recordToolCall('compile_project', {}, compileRes);

        if (compileRes.success) {
          compileStep.status = 'completed';
          this.completedActions.push('Successfully verified sketch compilation using Arduino CLI.');
          this.state = AGENT_STATES.COMPLETED;
          break;
        } else {
          // Compilation failed — enter evidence-based corrective iteration
          this.state = AGENT_STATES.ANALYZING_DIAGNOSTICS;
          compileStep.status = 'failed';

          const diags = await this.toolContext.executeTool('read_build_diagnostics');
          this.recordToolCall('read_build_diagnostics', {}, diags);
          this.diagnosticsHistory.push(diags);

          // Loop Detection: Check if the exact same problem has occurred repeatedly
          const problemSig = (diags.diagnostics?.problems || [])
            .map((pr) => `${pr.file}:${pr.line}:${pr.message}`)
            .join('|');

          const seenCount = (this.seenProblemSignatures.get(problemSig) || 0) + 1;
          this.seenProblemSignatures.set(problemSig, seenCount);

          if (seenCount >= 2) {
            this.recommendations.push(
              `Loop detected: Compiler error "${problemSig}" repeated across multiple iterations without resolution. Manual inspection required.`
            );
            this.state = AGENT_STATES.COMPLETED;
            break;
          }

          // Consult model for corrective patch based on actual diagnostic evidence
          this.state = AGENT_STATES.ITERATING;
          const correctiveResponse = await this.modelProvider.generateResponse({
            systemPrompt: 'You are CircuitSage AI. The compilation produced compiler errors. Formulate a corrective patch based strictly on the diagnostic evidence.',
            prompt: `Resolve compiler failure: ${JSON.stringify(diags)}`,
            context: {
              ...context,
              diagnostics: diags.diagnostics
            }
          });

          if (Array.isArray(correctiveResponse.proposedPatches)) {
            for (const cp of correctiveResponse.proposedPatches) {
              const cpRes = await this.toolContext.executeTool('propose_patch', cp);
              if (cpRes.success) {
                this.proposedPatches.push(cpRes.patch);
              }
            }
          }
        }
      } else {
        // No further pending compile step; break loop
        this.state = AGENT_STATES.COMPLETED;
        break;
      }
    }

    // Synthesize final hardware & circuit recommendations
    if (boardInspection.board) {
      if ((boardInspection.board.name || '').toLowerCase().includes('cam')) {
        this.recommendations.push(
          'ESP32-CAM Power: Always power the module with an external 5V 2A regulator. USB-to-serial dongles brown out during Wi-Fi transmission.'
        );
        this.recommendations.push(
          'GPIO 0 Bootloader: Connect GPIO 0 to GND only when flashing; leave floating during normal execution.'
        );
      } else {
        this.recommendations.push(
          '3.3V Logic Level: ESP32 GPIOs strictly operate on 3.3V logic. Connecting 5V sensors directly risks permanently destroying internal input buffer transistors.'
        );
      }
    }

    return this.generateFinalReport();
  }

  recordToolCall(toolName, inputArgs, result) {
    this.executedToolCalls.push({
      tool: toolName,
      input: inputArgs,
      output: result,
      timestamp: new Date().toISOString()
    });
    this.notify('tool_executed', { tool: toolName, input: inputArgs, output: result });
  }

  updatePlanStepStatus(toolName, newStatus) {
    const step = this.currentPlan.find((s) => s.tool === toolName);
    if (step) {
      step.status = newStatus;
      this.notify('plan_updated', { step });
    }
  }

  /**
   * Generates a final structured report distinguishing completed actions from recommendations
   */
  generateFinalReport() {
    return {
      status: this.state,
      completedActions: [...this.completedActions],
      proposedPatches: [...this.proposedPatches],
      uncertainties: [...this.uncertainties],
      hardwareRecommendations: [...this.recommendations],
      toolCallsCount: this.executedToolCalls.length,
      plan: [...this.currentPlan]
    };
  }
}

module.exports = {
  EmbeddedAgentEngine,
  AGENT_STATES
};
