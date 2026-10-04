# CircuitSage AI — Desktop IoT IDE Implementation Roadmap

**Document Version:** 1.0.0  
**Status:** Approved Implementation Plan  
**Target Milestone Progression:** Kenshi $\rightarrow$ Samurai $\rightarrow$ Shogun  
**Author:** Lead Software Architect & Systems Engineering Team  
**Last Updated:** 2026-10-04  

---

## 1. Roadmap Overview & Ten-Step Progression

This roadmap outlines the systematic evolution of **CircuitSage AI** into a full-featured, AI-powered IoT Desktop IDE. Each step builds incrementally on the existing Next.js frontend and Express.js backend, preserving all working diagnostic routes, schemas, and tests without disruptive refactoring.

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           TEN-STEP IMPLEMENTATION ROADMAP                         │
├─────────┬─────────────────────────────────────────────────┬───────────────────────┤
│ Step 01 │ Electron Desktop Shell & Process Supervisor     │ Foundation            │
│ Step 02 │ Monaco Code Editor Integration                  │ Editor Core           │
│ Step 03 │ Workspace File System & IPC Bridge              │ File Management       │
│ Step 04 │ USB Serial Auto-Discovery & Monitor             │ Hardware Telemetry    │
│ Step 05 │ Arduino CLI Compilation & GCC Markers           │ Build Toolchain       │
│ Step 06 │ Firmware Flashing & Bootloader Supervisor       │ Hardware Flashing     │
│ Step 07 │ Real-Time Serial Plotter                        │ Visual Telemetry      │
│ Step 08 │ AI Agent Code Healing & Crash Analysis (Gemma 4)│ Agentic Pair Engineer │
│ Step 09 │ Unified Physical + Firmware Troubleshooting     │ Hardware Bridge       │
│ Step 10 │ Packaging, Final Polish & 25-User Validation    │ Release & Shogun      │
└─────────┴─────────────────────────────────────────────────┴───────────────────────┘
```

---

## 2. Detailed Implementation Steps & Dependencies

### Step 1: Electron Desktop Shell & Process Supervisor
* **Objective:** Wrap the existing Next.js frontend and Express API in a native Electron desktop window with secure process management.
* **Key Tasks:**
  * Scaffold `apps/desktop/` with `main.js` and `preload.js`.
  * Implement child process supervisor to boot `apps/api/src/server.js` on app launch and terminate it on window close.
  * Configure `contextIsolation: true` and `nodeIntegration: false`.
* **Dependencies:** Existing Next.js frontend (`apps/web`) and Express API (`apps/api`).
* **Acceptance Criteria:** Launching `npm run dev:desktop` opens a native desktop window loading the Next.js UI, with Express API responding on `http://127.0.0.1:8000/api/v1/health`.

---

### Step 2: Monaco Code Editor Integration
* **Objective:** Embed the Monaco code editor into the Next.js desktop interface with multi-tab support and C/C++/Arduino syntax highlighting.
* **Key Tasks:**
  * Install and configure `@monaco-editor/react` in `apps/web`.
  * Implement editor layout with tab bar, line numbers, dark theme styling matching Tailwind slate colors, and mini-map.
  * Support `.ino`, `.cpp`, `.h`, `.c`, and `.py` file syntax highlighting.
* **Dependencies:** Step 1.
* **Acceptance Criteria:** Users can create, open, edit, and switch between multiple sketch tabs with instantaneous typing response ($< 50\text{ ms}$).

---

### Step 3: Workspace File System & Preload IPC Bridge
* **Objective:** Enable opening, browsing, and saving project sketch folders on the local workstation disk via native dialogs.
* **Key Tasks:**
  * Expose `window.electronAPI.workspace` in `preload.js` (`selectFolder`, `listFiles`, `readFile`, `writeFile`).
  * Implement an expandable File Tree sidebar in `apps/web/src/components/workspace/FileTree.js`.
  * Implement sketch auto-save and dirty-tab indicator (`●` for unsaved changes).
* **Dependencies:** Step 2.
* **Acceptance Criteria:** Users can open any local folder containing an Arduino sketch, browse the directory tree, edit files, and save them back to disk.

---

### Step 4: USB Serial Auto-Discovery & Terminal Monitor
* **Objective:** Auto-detect plugged-in microcontroller boards and stream bi-directional serial communications.
* **Key Tasks:**
  * Implement serial port scanning in the local hardware service, matching USB VID/PID against known boards (ESP32, Arduino Uno, RP2040).
  * Expose serial stream channels via Electron IPC or Web Serial API.
  * Build the bottom dock **Serial Monitor** component with baud rate dropdown (9600, 115200), auto-scroll, clear log, and command input box.
* **Dependencies:** Step 1, Step 3.
* **Acceptance Criteria:** Plugging in an ESP32 or Arduino board updates the detected board badge; serial prints from the microcontroller appear in real time in the Serial Monitor.

---

### Step 5: Arduino CLI Compilation & GCC Error Markers
* **Objective:** Provide local one-click firmware compilation with inline code diagnostics.
* **Key Tasks:**
  * Implement `services/hardware/arduinoCliService.js` to execute `arduino-cli compile --fqbn <fqbn> <path>`.
  * Parse standard GCC compiler output (file, line number, column, severity, error message).
  * Map parsed errors to Monaco editor markers, displaying squiggly red error underlines and hover tooltips.
* **Dependencies:** Step 2, Step 4.
* **Acceptance Criteria:** Clicking "Verify / Compile" compiles the sketch and renders compiler syntax errors directly on the corresponding line in the Monaco editor.

---

### Step 6: Firmware Flashing & Bootloader Supervisor
* **Objective:** Flash compiled binary firmware directly to the target board over USB serial.
* **Key Tasks:**
  * Implement `arduino-cli upload -p <port> --fqbn <fqbn> <sketch_path>`.
  * Temporarily pause Serial Monitor reading during upload to avoid port contention.
  * Automatically resume the Serial Monitor once flashing completes.
* **Dependencies:** Step 4, Step 5.
* **Acceptance Criteria:** Clicking "Upload" compiles, flashes the binary to the connected board, and re-opens the Serial Monitor displaying the newly booted firmware output.

---

### Step 7: Real-Time Serial Plotter
* **Objective:** Graph multi-channel numerical sensor telemetry directly inside the IDE.
* **Key Tasks:**
  * Build a lightweight Canvas/SVG Serial Plotter dock in `apps/web`.
  * Parse standard comma-separated or space-separated serial output (e.g., `23.5, 45.2, 1024`).
  * Support auto-scaling Y-axis, channel toggling, and pause/resume charting.
* **Dependencies:** Step 4.
* **Acceptance Criteria:** Sensor telemetry printed to serial is plotted as smooth, multi-line waveforms at 30+ frames per second.

---

### Step 8: AI Agent Code Healing & Crash Analysis (Gemma 4)
* **Objective:** Enable autonomous code correction and serial crash diagnosis using local Gemma 4 weights.
* **Key Tasks:**
  * Connect Express `agentService` to local Gemma 4 runtime.
  * When compilation fails, agent inspects code + compiler error and generates side-by-side diff in Monaco.
  * When Serial Monitor detects microcontroller panics (`Guru Meditation Error: Core 1 panic` or `Brownout detector`), agent diagnoses root cause and recommends fixes.
* **Dependencies:** Step 2, Step 5, Step 6.
* **Acceptance Criteria:** Clicking "Ask Agent to Fix" on a compiler error generates an inline diff preview that can be accepted with one click to resolve the build failure.

---

### Step 9: Unified Physical Diagnosis + Firmware Troubleshooting
* **Objective:** Bridge CircuitSage physical electrical diagnostics with active sketch firmware code.
* **Key Tasks:**
  * Parse firmware pin assignments (`pinMode(18, OUTPUT)`, `Wire.begin(21, 22)`) and cross-reference with breadboard wiring.
  * If user reports an unlit LED, check if the sketch drives the correct GPIO pin, combining code analysis with physical multimeter probe guidance.
  * Preserve all existing epistemic badges (`VERIFIED_FACT`, `AI_INFERENCE`, `UNKNOWN`).
* **Dependencies:** Step 8, existing `diagnosisService.js` and `rulesEngine.js`.
* **Acceptance Criteria:** Diagnostic engine flags a mismatch between firmware pin code and hardware pinout as a verified root cause.

---

### Step 10: Packaging, Polish & 25-User Shogun Validation
* **Objective:** Package the desktop application into cross-platform installers and execute the 25-user evaluation cohort.
* **Key Tasks:**
  * Configure `electron-builder` for Windows (`.exe`), macOS (`.dmg`), and Linux (`.AppImage`).
  * Verify 100% offline air-gapped functionality with network cables unplugged.
  * Conduct the 25-user usability protocol defined in `PRD.md` with consenting students, makers, and educators.
  * Publish open-source repository release, demo video, and Shogun dossier.
* **Dependencies:** Steps 1 through 9.
* **Acceptance Criteria:** Standalone desktop installer installs and runs without prerequisites; 25 target users evaluate the IDE with $\ge 75\%$ task completion and zero safety incidents.

---

## 3. Dependency Graph & Milestone Alignment

```text
[Step 1: Electron Shell]
        |
        +-----------------------------------+
        |                                   |
        v                                   v
[Step 2: Monaco Editor]             [Step 4: Serial Monitor] <--- KENSHI MILESTONE
        |                                   |
        v                                   v
[Step 3: Workspace FS]              [Step 5: Arduino CLI Compile]
        |                                   |
        +-----------------+                 v
                          |         [Step 6: Flashing]
                          v                 |
                  [Step 8: AI Agent]        v
                          |         [Step 7: Serial Plotter] <--- SAMURAI MILESTONE
                          v                 |
                  [Step 9: Unified Bridge]--+
                          |
                          v
                  [Step 10: Desktop Packaging & 25-User Study] <-- SHOGUN MILESTONE
```
