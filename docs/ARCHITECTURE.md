# CircuitSage AI — Desktop IoT IDE Target Architecture Specification

**Document Version:** 3.0.0  
**Status:** Architectural Blueprint & Target Specification  
**Design Paradigm:** AI-Powered IoT Desktop IDE (inspired by Arduino IDE 2.0, VS Code, and Google Antigravity)  
**Author:** Lead Software Architect & Systems Engineering Team  
**Last Updated:** 2026-10-04  

---

## 1. Executive Summary & Vision

**CircuitSage AI** is evolving from a standalone web-based diagnostic assistant into a **unified, offline-first IoT Desktop Integrated Development Environment (IDE)**. 

Traditional embedded development is deeply fragmented:
1. Developers write firmware in text editors or IDEs (Arduino IDE, VS Code with PlatformIO).
2. When firmware crashes, fails to upload, or hardware malfunctions, developers must leave their IDE to inspect pinout datasheets, calculate Ohm's law formulas, or consult external tools.
3. Physical breadboard faults (reversed LEDs, floating inputs, missing I2C pull-ups, power rail brownouts) manifest as cryptic microcontroller panics, compiler errors, or complete silence.

CircuitSage AI bridges code and physical reality by unifying:
* A **Monaco-powered code editor** for Arduino (`.ino`), C/C++ (`.cpp`, `.h`), and MicroPython (`.py`).
* A **Local Hardware Service** integrating native USB serial discovery, bi-directional serial terminal monitoring, and the **Arduino CLI** toolchain for compiling and flashing.
* The established **CircuitSage Diagnostic Engine** providing deterministic electrical calculations (Ohm's Law, logic level compatibility, bus pull-ups), epistemic triage, and multimeter probing guidance.
* An **Agentic AI Engine** powered by local **Gemma 4** open weights that reasons across firmware source code, compiler diagnostics, serial crash logs, and physical breadboard photos.
* An **Electron desktop shell** that wraps the responsive **Next.js** frontend and **Express.js API**, operating completely offline while supporting optional cloud synchronization via **Supabase**.

---

## 2. Target System Topology

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ELECTRON DESKTOP SHELL (Native Main Process)                    │
│  - Window Management & System Tray                                                     │
│  - Native File System Dialogs (Open Folder, Save Sketch)                               │
│  - Child Process Supervisor: Express.js API (Port 8000), Local Hardware Daemon         │
│  - Secure IPC Context Bridge (`window.electronAPI`)                                    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ ContextBridge IPC Channels
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS FRONTEND (Renderer Process / Chromium UI)                 │
│  - Workbench Layout: Activity Bar, File Tree Sidebar, Editor Tabs, Terminal / Console   │
│  - Monaco Editor: C/C++/Arduino syntax highlighting, intellisense, diff view           │
│  - Serial Monitor & Plotter: Real-time USB telemetry, baud rates, auto-scroll          │
│  - Diagnostic Panel: Preserves existing epistemic badge system (Verified, Inferred)    │
│  - Supabase Auth & Cloud Sync (Optional online tier)                                   │
└───────────────────────┬────────────────────────────────────────┬───────────────────────┘
                        │ HTTP / JSON REST                       │ ContextBridge IPC
                        │ (localhost:8000)                       │
                        ▼                                        ▼
┌────────────────────────────────────────────────┐  ┌────────────────────────────────────┐
│              EXPRESS.JS REST API               │  │       LOCAL HARDWARE SERVICE       │
│  - Existing /api/v1/diagnoses                  │  │  - USB Serial Port Auto-Detection  │
│  - Existing /api/v1/knowledge                  │  │  - Real-time Serial Read / Write   │
│  - Existing /api/v1/feedback                   │  │  - Arduino CLI Toolchain:          │
│  - Deterministic Electrical Rules Engine       │  │    • compile (verify sketch)       │
│  - Curated Datasheet Knowledge Base            │  │    • upload (flash microcontroller)│
│  - AI Diagnostic Orchestrator                  │  │    • lib & core manager            │
│  - AI Agent Service (Gemma 4 Adapter)          │  │  - Workspace File System Manager   │
└───────────────────────┬────────────────────────┘  └────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────┐
│           LOCAL GEMMA 4 AI RUNTIME             │
│  - 100% Local Execution (Ollama / llama.cpp)   │
│  - Constrained JSON Reasoning & Code Diffs     │
│  - Multi-modal Circuit Image Inspection        │
└────────────────────────────────────────────────┘
```

---

## 3. Core Subsystems & Responsibilities

### 3.1 Electron Desktop Shell (`apps/desktop` or `electron/`)
* **Process Lifecycle:** Boots Express backend on application launch; gracefully terminates background daemons on exit.
* **Security Isolation:** Enforces `contextIsolation: true`, `nodeIntegration: false`, and a secure `preload.js` bridge exposing explicit whitelisted APIs.
* **File Access:** Bridges local disk operations (`workspace:open`, `fs:readFile`, `fs:writeFile`) without exposing arbitrary Node.js APIs to renderer scripts.

### 3.2 Monaco Code Editor (`apps/web/src/components/editor/`)
* **Core Technology:** `@monaco-editor/react` integrated into Next.js.
* **Capabilities:** Multi-tab editing of `.ino`, `.cpp`, `.h`, `.c`, and `.py` files.
* **Visual Diffing:** Displays side-by-side AI code modifications before applying agent suggestions.
* **Inline Diagnostics:** Renders compiler syntax errors and warnings directly within Monaco editor margins (markers).

### 3.3 Local Hardware Service & Toolchain (`apps/api/src/services/hardware/`)
* **USB Serial Discovery:** Scans USB VID/PID identifiers to automatically detect connected boards (e.g., `CP2102`, `CH340`, `FT232`, `Raspberry Pi Debug Probe`).
* **Serial Monitor & Plotter:** Bi-directional asynchronous serial communication supporting standard baud rates (9600 to 115200 baud), line endings (`LF`, `CRLF`), and numerical stream plotting.
* **Arduino CLI Adapter:**
  * Compiles sketches: `arduino-cli compile --fqbn <board_fqbn> <sketch_path>`.
  * Flashes firmware: `arduino-cli upload -p <port> --fqbn <board_fqbn> <sketch_path>`.
  * Manages cores: `arduino-cli core install esp32:esp32`.
* **PlatformIO Extensibility:** Architecture uses an abstract `IToolchainService` interface so PlatformIO can be enabled in future releases.

### 3.4 Express.js API & Agentic AI Engine (`apps/api/`)
* **Preservation of Existing Work:** Retains all existing endpoints (`/api/v1/health`, `/api/v1/diagnoses`, `/api/v1/knowledge`, `/api/v1/feedback`) and repository layers (`caseRepository`, `rulesEngine`, `knowledgeService`).
* **AI Agent Service:** Reuses the local Gemma 4 runtime adapter to perform:
  * **Compiler Error Healing:** Interprets compilation error output and proposes verified code fixes.
  * **Serial Crash Analysis:** Parses ESP32 stack dumps (`Guru Meditation Error`, `Brownout detector was triggered`) and cross-references hardware rules.
  * **Multimodal Wiring Diagnosis:** Merges breadboard image analysis with active firmware pin assignments.

### 3.5 Supabase Cloud Persistence (Optional Tier)
* Retains current Supabase Postgres schema (`profiles`, `diagnostic_cases`, `diagnostic_hypotheses`, `measurements`).
* Serves as an optional cloud backup and sync service for users working across multiple lab workstations.
* Local offline storage remains the default operational mode.

---

## 4. Technology Stack Justifications

| Component | Selected Technology | Architecture Justification |
| :--- | :--- | :--- |
| **Desktop Shell** | **Electron** | Proven cross-platform desktop framework (VS Code, Arduino IDE 2.0); provides direct USB serial and process control. |
| **Frontend UI** | **Next.js (React / JS / Tailwind)** | Preserves existing responsive UI components; lightweight JavaScript implementation without TypeScript compilation overhead. |
| **Code Editor** | **Monaco Editor** | The industry standard web code editor powering VS Code; first-class C/C++ syntax support, markers, and diffing. |
| **Backend API** | **Node.js & Express.js** | Modular REST service; handles validation, logging, database repositories, and rules calculations asynchronously. |
| **Hardware Toolchain** | **Arduino CLI** | Official, headless, standalone toolchain executable for compiling and uploading across 1000+ maker development boards. |
| **Hardware Port Access** | **Node Serialport / Web Serial API** | High-performance native serial stream communication for live telemetry and debugging. |
| **AI Inference** | **Local Gemma 4 (Ollama / GGUF)** | Zero cloud cost; total privacy; operates without internet connectivity on consumer laptops. |
| **Database & Auth** | **Supabase Postgres + RLS** | Managed relational persistence and user isolation for optional cloud synchronization. |

---

## 5. Integration Contracts & Preload Interface Definitions

To guarantee security, the Electron renderer process communicates with native host resources exclusively via `window.electronAPI`:

```javascript
// Preload ContextBridge Contract (window.electronAPI)
window.electronAPI = {
  // --- Workspace & File Operations ---
  workspace: {
    selectFolder: () => Promise<{ canceled: boolean, path: string }>,
    listFiles: (dirPath) => Promise<Array<{ name: string, isDirectory: boolean, path: string }>>,
    readFile: (filePath) => Promise<string>,
    writeFile: (filePath, content) => Promise<{ success: boolean }>
  },

  // --- Hardware & Serial Port Operations ---
  hardware: {
    listPorts: () => Promise<Array<{ path: string, manufacturer: string, vendorId: string, productId: string }>>,
    openSerial: (portPath, baudRate) => Promise<{ success: boolean }>,
    closeSerial: (portPath) => Promise<{ success: boolean }>,
    sendSerialData: (portPath, data) => Promise<{ success: boolean }>,
    onSerialData: (callback) => void, // (data: string) => void
    onPortChange: (callback) => void  // (ports: Array) => void
  },

  // --- Toolchain Compilation & Flashing ---
  toolchain: {
    checkInstalled: () => Promise<{ installed: boolean, version: string }>,
    listBoards: () => Promise<Array<{ name: string, fqbn: string }>>,
    compile: (sketchPath, fqbn) => Promise<{ success: boolean, stdout: string, stderr: string }>,
    upload: (sketchPath, fqbn, port) => Promise<{ success: boolean, stdout: string, stderr: string }>
  }
};
```

---

## 6. File Ownership Boundaries for Parallel Engineering

To prevent merge conflicts and enable parallel feature development across engineers, repository modules are strictly partitioned:

```text
CircuitSage_AI/
├── apps/
│   ├── desktop/               # [OWNER: Desktop / Electron Engineer]
│   │   ├── src/main.js        # Electron main process & child process supervisor
│   │   └── src/preload.js     # Whitelisted IPC contextBridge security boundary
│   │
│   ├── web/                   # [OWNER: Frontend / UX Engineer]
│   │   ├── src/app/           # Next.js App Router pages (/, /workspace, /status)
│   │   ├── src/components/
│   │   │   ├── editor/        # Monaco code editor, tabs, and diff view
│   │   │   ├── terminal/      # Serial monitor, serial plotter, and build output
│   │   │   └── diagnostics/   # CircuitSage epistemic cards & probe guidance
│   │   └── src/lib/           # Client API clients and IPC hooks
│   │
│   └── api/                   # [OWNER: Backend & Hardware Engineer]
│       ├── src/routes/        # Express REST routes (/diagnoses, /knowledge, /hardware)
│       ├── src/controllers/   # Request orchestration and response formatting
│       ├── src/services/
│       │   ├── hardware/      # Arduino CLI execution & serial port management
│       │   ├── agent/         # Gemma 4 code healing & diagnostic loop
│       │   ├── rulesEngine.js # Deterministic electrical equations
│       │   └── knowledgeService.js # Curated component datasheets
│       └── src/db/            # Repositories and Supabase Postgres RLS adapters
│
├── packages/
│   └── shared/                # [OWNER: Systems Architect]
│       └── src/index.js       # Shared constants, FQBN mappings, error codes
│
└── docs/                      # [OWNER: Lead Architect & Technical Writer]
    ├── architecture.md        # Target system architecture (this document)
    ├── implementation-roadmap.md # 10-step staged execution plan
    └── SUPABASE_SETUP.md      # Database setup & RLS validation
```

---

## 7. Known Architectural Limitations & Mitigations

1. **Native Serial Compilation on Windows/Mac/Linux:**
   * *Limitation:* Node `serialport` requires native C++ binary bindings that must be compiled for Electron's target ABI.
   * *Mitigation:* Support standard Web Serial API in the Chromium renderer as an immediate, zero-build alternative, backed by Node serialport when bundled via Electron-rebuild.
2. **Arduino CLI Host Installation:**
   * *Limitation:* The Arduino CLI binary must be installed on the host machine or bundled inside the desktop installer.
   * *Mitigation:* The system detects system-installed `arduino-cli` first; if absent, it provides an automated one-click downloader script or operates in advisory mode.
3. **Local Compute Resource Competition:**
   * *Limitation:* Compiling C++ firmware while running local Gemma 4 inference and Monaco editor can stress systems with $< 16\text{ GB}$ RAM.
   * *Mitigation:* The Express API coordinates an internal task queue, pausing heavy LLM token generation during active Arduino CLI compilation.
