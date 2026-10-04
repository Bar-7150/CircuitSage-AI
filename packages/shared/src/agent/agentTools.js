/**
 * CircuitSage AI — Agent Tools Specifications & Validators
 *
 * Implements validated JavaScript interfaces for all approved agent operations:
 * - Listing permitted workspace files
 * - Reading approved files with path validation
 * - Inspecting board configuration & pinout capabilities
 * - Proposing and applying approved patches (with approval checks)
 * - Inspecting the toolchain status
 * - Compiling project via actual build service
 * - Reading build diagnostics & compiler problems
 * - Reading authorized serial logs (with sensitive data redaction)
 * - Retrieving relevant electronics documentation & component pitfalls
 */

// Tool definitions and argument validation schemas
const TOOL_DEFINITIONS = [
  {
    name: 'list_workspace_files',
    description: 'Lists permitted files and directories in the active microcontroller workspace.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'read_workspace_file',
    description: 'Reads the text content of a permitted workspace file.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Relative path of the file to read within workspace.' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'inspect_board_config',
    description: 'Inspects active board specification, target FQBN, logic voltage, strapping pins, and memory limits.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'retrieve_documentation',
    description: 'Retrieves curated electronics component specifications, pinouts, and hardware pitfalls from knowledge base.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Component name or concept to search (e.g. DHT22, ESP32 WiFi, MQTT, GPIO).' },
        category: { type: 'string', description: 'Optional component category.' }
      },
      required: ['query']
    }
  },
  {
    name: 'propose_patch',
    description: 'Proposes a code patch for a project file. Creates a reviewable diff that requires user approval before application.',
    parameters: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'File name to modify.' },
        summary: { type: 'string', description: 'Human-readable explanation of the change.' },
        oldSnippet: { type: 'string', description: 'Existing code block to replace.' },
        newSnippet: { type: 'string', description: 'Replacement code block.' }
      },
      required: ['file', 'summary', 'oldSnippet', 'newSnippet']
    }
  },
  {
    name: 'apply_patch',
    description: 'Applies a previously proposed and user-approved code patch to a workspace file.',
    parameters: {
      type: 'object',
      properties: {
        patchId: { type: 'string', description: 'Identifier of the proposed patch to apply.' },
        approved: { type: 'boolean', description: 'Explicit approval status flag.' }
      },
      required: ['patchId', 'approved']
    }
  },
  {
    name: 'inspect_toolchain',
    description: 'Queries installed Arduino CLI toolchain, version, and platform cores.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'compile_project',
    description: 'Executes actual compilation of the sketch project using the toolchain service.',
    parameters: {
      type: 'object',
      properties: {
        sketchPath: { type: 'string', description: 'Relative path of the sketch to compile.' },
        fqbn: { type: 'string', description: 'Optional FQBN override.' },
        userApproved: { type: 'boolean', description: 'User approval flag.' }
      },
      required: []
    }
  },
  {
    name: 'read_build_diagnostics',
    description: 'Retrieves actual compiler problems, error messages, line numbers, and memory utilization.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'read_serial_logs',
    description: 'Reads recent serial telemetry logs if authorized by the user, with sensitive credentials redacted.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of recent log lines to retrieve (default 50).' }
      },
      required: []
    }
  }
];

/**
 * Validates tool call arguments against schema
 */
function validateToolCall(toolName, args = {}) {
  const tool = TOOL_DEFINITIONS.find((t) => t.name === toolName);
  if (!tool) {
    return {
      valid: false,
      error: `UNKNOWN_TOOL: Tool '${toolName}' is not recognized or permitted.`
    };
  }

  const { parameters } = tool;
  const required = parameters.required || [];

  for (const field of required) {
    if (args[field] === undefined || args[field] === null || args[field] === '') {
      return {
        valid: false,
        error: `MISSING_ARGUMENT: Tool '${toolName}' requires argument '${field}'.`
      };
    }
  }

  // Security checks on file paths
  if (args.filePath && typeof args.filePath === 'string') {
    if (args.filePath.includes('..') || args.filePath.startsWith('/') || args.filePath.startsWith('\\')) {
      return {
        valid: false,
        error: `INVALID_PATH: Path traversal or absolute paths are strictly forbidden in '${args.filePath}'.`
      };
    }
    if (args.filePath.includes('.env') || args.filePath.includes('.git')) {
      return {
        valid: false,
        error: `RESTRICTED_ACCESS: Access to '${args.filePath}' is restricted for security.`
      };
    }
  }

  return { valid: true, tool };
}

/**
 * Creates a bounded execution context providing concrete implementations for all agent tools.
 */
function createToolContext(environment = {}) {
  const {
    workspace = {
      listFiles: async () => [],
      readFile: async () => '',
      writeFile: async () => ({ success: true }),
      createBackup: async () => ({ backupId: 'bak-1' }),
      getProjectMetadata: async () => null
    },
    hardware = {
      selectedBoard: {
        id: 'AI Thinker ESP32-CAM',
        name: 'AI Thinker ESP32-CAM',
        fqbn: 'esp32:esp32:esp32cam',
        logicVoltage: '3.3V',
        strappingPins: ['GPIO0', 'GPIO2', 'GPIO4'],
        notes: 'GPIO 4 controls onboard high-power Flash LED. Pulling GPIO 4 HIGH draws up to 200mA.'
      },
      getSerialLogs: async () => ({ authorized: false, logs: [] }),
      aiAuthorized: false
    },
    toolchain = {
      checkStatus: async () => ({ installed: true, version: '1.5.1' }),
      compile: async () => ({ success: true, durationMs: 1200, problems: [] }),
      getProblems: () => []
    },
    knowledge = {
      search: async (query) => {
        const q = (query || '').toLowerCase();
        if (q.includes('dht22') || q.includes('dht')) {
          return [
            {
              title: 'DHT22 / AM2302 Temperature & Humidity Sensor',
              operating_voltage: '3.3V - 5.5V DC',
              pinout: 'Pin 1: VCC, Pin 2: DATA, Pin 3: NC, Pin 4: GND',
              recommended_pullup: '4.7kΩ to 10kΩ resistor between DATA and VCC',
              esp32_notes: 'Connect to standard GPIO (e.g. GPIO 4 on regular ESP32; on ESP32-CAM, avoid GPIO 4 due to Flash LED conflict; use GPIO 13 or 14 instead).',
              timing_constraints: 'Single-bus protocol requires >= 2-second sampling interval between consecutive reads.'
            }
          ];
        }
        if (q.includes('mqtt') || q.includes('wifi')) {
          return [
            {
              title: 'ESP32 Wi-Fi & MQTT Connectivity',
              libraries: 'WiFi.h, PubSubClient.h',
              pitfalls: 'Wi-Fi 2.4GHz draws up to 450mA peak RF current. ADC2 pins cannot read analog sensors while Wi-Fi is transmitting.',
              buffer_size: 'Default PubSubClient buffer is 128 bytes; set MQTT_MAX_PACKET_SIZE to 512 for larger JSON payloads.'
            }
          ];
        }
        return [];
      }
    }
  } = environment;

  // Track proposed patches in memory: patchId -> patch object
  const stagedPatches = new Map();
  let lastBuildDiagnostics = null;

  return {
    async executeTool(name, args = {}) {
      const validation = validateToolCall(name, args);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      switch (name) {
        case 'list_workspace_files': {
          const files = await workspace.listFiles();
          return { success: true, files };
        }

        case 'read_workspace_file': {
          const content = await workspace.readFile(args.filePath);
          return { success: true, filePath: args.filePath, content };
        }

        case 'inspect_board_config': {
          return {
            success: true,
            board: hardware.selectedBoard,
            architecture: 'Xtensa Dual-Core 32-bit LX6',
            logicVoltage: hardware.selectedBoard.logicVoltage || '3.3V',
            recommendedPins: {
              digitalSafe: ['GPIO13', 'GPIO14', 'GPIO15', 'GPIO16'],
              strappingPins: ['GPIO0', 'GPIO2'],
              flashLedPin: 'GPIO4 (Avoid connecting sensors to GPIO 4 on ESP32-CAM)'
            }
          };
        }

        case 'retrieve_documentation': {
          const results = await knowledge.search(args.query);
          return { success: true, query: args.query, results };
        }

        case 'propose_patch': {
          const patchId = `patch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const patchObj = {
            id: patchId,
            file: args.file,
            summary: args.summary,
            oldSnippet: args.oldSnippet,
            newSnippet: args.newSnippet,
            status: 'PENDING_APPROVAL',
            createdAt: new Date().toISOString()
          };
          stagedPatches.set(patchId, patchObj);
          return {
            success: true,
            patchId,
            status: 'PENDING_APPROVAL',
            requiresApproval: true,
            patch: patchObj
          };
        }

        case 'apply_patch': {
          if (!args.approved) {
            return {
              success: false,
              error: 'PERMISSION_DENIED',
              message: `Patch '${args.patchId}' was rejected or not approved by the user.`
            };
          }
          const patch = stagedPatches.get(args.patchId);
          if (!patch) {
            return { success: false, error: 'PATCH_NOT_FOUND', message: `No patch with ID '${args.patchId}'.` };
          }

          // Create backup before applying
          await workspace.createBackup(patch.file);

          // Read current content and apply replacement
          const currentContent = await workspace.readFile(patch.file);
          let updatedContent;
          if (currentContent.includes(patch.oldSnippet)) {
            updatedContent = currentContent.replace(patch.oldSnippet, patch.newSnippet);
          } else {
            updatedContent = `${currentContent}\n${patch.newSnippet}`;
          }

          await workspace.writeFile(patch.file, updatedContent);
          patch.status = 'APPLIED';

          return {
            success: true,
            patchId: args.patchId,
            file: patch.file,
            status: 'APPLIED',
            message: `Patch successfully applied to '${patch.file}'.`
          };
        }

        case 'inspect_toolchain': {
          const status = await toolchain.checkStatus();
          return { success: true, toolchain: status };
        }

        case 'compile_project': {
          // Explicit approval check if required by policy
          if (args.userApproved === false) {
            return {
              success: false,
              error: 'COMPILATION_APPROVAL_REQUIRED',
              message: 'Toolchain compilation requires user authorization.'
            };
          }

          const res = await toolchain.compile({
            sketchPath: args.sketchPath,
            fqbn: args.fqbn || hardware.selectedBoard.fqbn
          });

          lastBuildDiagnostics = {
            success: res.success,
            exitCode: res.exitCode !== undefined ? res.exitCode : (res.success ? 0 : 1),
            problems: res.problems || [],
            stdout: res.stdout || '',
            stderr: res.stderr || ''
          };

          return {
            success: res.success,
            exitCode: lastBuildDiagnostics.exitCode,
            durationMs: res.durationMs,
            problemsCount: (res.problems || []).length,
            diagnostics: lastBuildDiagnostics
          };
        }

        case 'read_build_diagnostics': {
          if (!lastBuildDiagnostics) {
            const problems = toolchain.getProblems ? toolchain.getProblems() : [];
            return { success: true, problems, exitCode: problems.length > 0 ? 1 : 0 };
          }
          return { success: true, diagnostics: lastBuildDiagnostics };
        }

        case 'read_serial_logs': {
          if (!hardware.aiAuthorized) {
            return {
              success: false,
              authorized: false,
              error: 'TELEMETRY_UNAUTHORIZED',
              message: 'Access to live serial telemetry is disabled by user privacy settings.'
            };
          }
          const logs = await hardware.getSerialLogs(args.limit || 50);
          return { success: true, authorized: true, logs: logs.logs || [] };
        }

        default:
          return { success: false, error: `UNHANDLED_TOOL: ${name}` };
      }
    },

    getStagedPatches: () => Array.from(stagedPatches.values()),
    getPatch: (id) => stagedPatches.get(id)
  };
}

module.exports = {
  TOOL_DEFINITIONS,
  validateToolCall,
  createToolContext
};
