# CircuitSage AI — Architecture Sketch & Wireframe Blueprint

**Document Version:** 2.0.0  
**Status:** Pending Manual Board Creation  
**Tool Requirements:** Excalidraw (`https://excalidraw.com`) or Miro (`https://miro.com`) ONLY  
**Export Target:** `/docs/sketch.png`  
**Live Board Link Target:** README.md (Section 6)  
**Author:** Software Architecture Team  
**Last Updated:** 2026-10-04  

---

> [!IMPORTANT]
> **Program Compliance Notice:** The program submission rubric accepts **only Excalidraw or Miro** for the live interactive system architecture and user-flow sketch. Standalone SVGs, Mermaid markdown diagrams, or AI-generated PNG mockups are strictly disallowed as substitutes for the live editable board.
>
> This document specifies every box, label, boundary, arrow, and relationship needed to construct the diagram manually in **Excalidraw** or **Miro**, export the static image to `/docs/sketch.png`, and link the live board in `README.md`.

---

## 1. Canvas Organization & Boundaries

Title the board:  
**`CircuitSage AI — System Architecture & Diagnostic Flow (v2.0)`**

Arrange the canvas into three distinct structural zones with clear dashed boundary boxes:
1. **Client Tier (Top / Cyan Boundary):** Next.js Frontend (React / JS / Tailwind).
2. **Backend Services Tier (Middle / Purple Boundary):** Express.js API, Auth Middleware, Diagnostic Orchestrator, Deterministic Rules, Knowledge Retrieval, and Local Gemma 4 Inference.
3. **Data & Persistence Tier (Bottom / Orange Boundary):** Supabase (Postgres, Auth, Storage) and Local Fallback Store.
4. **Online vs. Offline Security Boundary (Dotted Red Line):** Separates cloud-hosted dependencies from the local-only execution sandbox.

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                CANVAS LAYOUT OVERVIEW                             │
│                                                                                   │
│  [ZONE 1: CLIENT TIER]                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ Next.js Frontend (React 18 + JavaScript + Tailwind CSS)                     │  │
│  │ Intake Screen • Multimeter Probe Modal • Epistemic Badges • Report Exporter │  │
│  └──────────────────────────────────────┬──────────────────────────────────────┘  │
│                                         │ HTTP REST / Bearer Token                │
│                                         ▼                                         │
│  [ZONE 2: BACKEND APPLICATION TIER]                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ Express.js REST API (/api/v1)                                               │  │
│  │ Auth Middleware (Supabase JWT) • Validation (Zod) • Request ID Logging      │  │
│  └──────────────────────────────────────┬──────────────────────────────────────┘  │
│                                         │                                         │
│                                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ Diagnostic Orchestration Service                                            │  │
│  │ Session Management • Dynamic Hypothesis Elimination • Probe Recommender     │  │
│  └───────────────┬──────────────────────┬──────────────────────┬───────────────┘  │
│                  │                      │                      │                  │
│                  ▼                      ▼                      ▼                  │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │ Local Gemma 4 Service │  │ Knowledge Retrieval   │  │ Deterministic Rules   │  │
│  │ - Dedicated Adapter   │  │ - Curated Datasheets  │  │ - Ohm's Law Engine    │  │
│  │ - 4-bit Quantization  │  │ - Pinout Catalog      │  │ - Logic Level Check   │  │
│  │ - Constrained JSON    │  │ - Known Failure Modes │  │ - I2C Bus Pull-Ups    │  │
│  └───────────────────────┘  └───────────────────────┘  └───────────────────────┘  │
│                  │                      │                      │                  │
│                  └──────────────────────┼──────────────────────┘                  │
│  .......................................│.......................................  │
│  : ONLINE / OFFLINE BOUNDARY            ▼                                      :  │
│  [ZONE 3: DATA PERSISTENCE TIER]                                                  │
│  ┌─────────────────────────────────────┐      ┌────────────────────────────────┐  │
│  │ Supabase Cloud Platform (Online)    │      │ Local Fallback Store (Offline) │  │
│  │ - Supabase Auth (Identity & JWT)    │      │ - Local JSON / SQLite Store    │  │
│  │ - Supabase Postgres + RLS Policies  │      │ - Air-Gapped Session Cache     │  │
│  │ - Supabase Storage (Images)         │      │ - Zero Network Dependency      │  │
│  └─────────────────────────────────────┘      └────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Component Box Specifications

### Box 1: Next.js Frontend
* **Shape:** Rectangle ($X: 100, Y: 100$, Size: $700 \times 200\text{ px}$).
* **Fill Color:** Light Blue / Cyan (`#e7f5ff`).
* **Border:** Solid Blue (`#1971c2`), 2px stroke.
* **Header Text:** `⚡ Next.js Frontend (Client Workstation)`
* **Content Items:**
  * `Technology: React 18, JavaScript, Tailwind CSS`
  * `UI Modules: Intake Form, Active Diagnostic Dashboard, Multimeter Guidance Modal`
  * `Epistemic System: Verified Fact (Green), AI Inference (Amber), Unknown (Gray)`
  * `Client Auth: Supabase Auth JS SDK (Bearer Token Handling)`

### Box 2: Express.js REST API & Auth Middleware
* **Shape:** Rectangle ($X: 100, Y: 360$, Size: $700 \times 160\text{ px}$).
* **Fill Color:** Light Violet (`#f3f0ff`).
* **Border:** Solid Purple (`#6741d9`), 2px stroke.
* **Header Text:** `🌐 Express.js API & Routing Engine`
* **Content Items:**
  * `Base Route: /api/v1 (RESTful JSON Endpoints)`
  * `Security Middleware: Supabase JWT Verification & Role Authorization`
  * `Validation Middleware: Schema Validation & Image Decompression Guard`
  * `Sanitization: EXIF Metadata Stripping & Request ID Injection`

### Box 3: Diagnostic Orchestrator
* **Shape:** Rectangle ($X: 100, Y: 580$, Size: $700 \times 150\text{ px}$).
* **Fill Color:** Light Gray (`#f8f9fa`).
* **Border:** Solid Dark Gray (`#495057`), 2px stroke.
* **Header Text:** `🎯 Diagnostic Orchestration Service`
* **Content Items:**
  * `Role: Manages multi-turn troubleshooting session state & workflow`
  * `Functions: Coordinate pre-check -> AI prompt assembly -> measurement feedback`
  * `Hypothesis Manager: Eliminates contradicted causes & updates confidence scores`

### Box 4: Local Gemma 4 Inference Service
* **Shape:** Rectangle ($X: 100, Y: 790$, Size: $220 \times 220\text{ px}$).
* **Fill Color:** Light Green (`#ebfbee`).
* **Border:** Solid Green (`#2f9e44`), 2px stroke.
* **Header Text:** `🧠 Local Gemma 4 Inference`
* **Content Items:**
  * `Model: Gemma 4 (4-bit Quantized)`
  * `Runtime: Local HTTP/IPC Adapter`
  * `Privacy: 100% Localhost (127.0.0.1)`
  * `Output: Constrained JSON Schema`
  * `Zero Telemetry to Cloud APIs`

### Box 5: Knowledge Retrieval Service
* **Shape:** Rectangle ($X: 340, Y: 790$, Size: $220 \times 220\text{ px}$).
* **Fill Color:** Light Yellow (`#fff9db`).
* **Border:** Solid Yellow/Gold (`#f59f00`), 2px stroke.
* **Header Text:** `📚 Knowledge Retrieval`
* **Content Items:**
  * `Curated Datasheets (ESP32, Uno, Pico)`
  * `Operating Voltage Limits & Pinouts`
  * `Maximum Current Ratings (mA)`
  * `Known Hardware Pitfalls & Strapping`
  * `Sub-50ms Local Lookup`

### Box 6: Deterministic Engineering Rules Engine
* **Shape:** Rectangle ($X: 580, Y: 790$, Size: $220 \times 220\text{ px连接}$).
* **Fill Color:** Light Orange (`#fff4e6`).
* **Border:** Solid Orange (`#d9480f`), 2px stroke.
* **Header Text:** `⚡ Deterministic Rules Engine`
* **Content Items:**
  * `Ohm's Law: I = (Vcc - Vf) / R`
  * `Overcurrent Violation Detection`
  * `Logic Level Mismatch (5V -> 3.3V)`
  * `I2C Bus Pull-Up Termination Check`
  * `Three-State: Pass / Fail / UNKNOWN`

### Box 7: Supabase Cloud Platform (Online Mode)
* **Shape:** Rectangle ($X: 100, Y: 1100$, Size: $340 \times 200\text{ px}$).
* **Fill Color:** Light Emerald (`#e6fcf5`).
* **Border:** Solid Emerald (`#0ca678`), 2px stroke.
* **Header Text:** `☁️ Supabase Platform (Online)`
* **Content Items:**
  * `Supabase Auth: User Sign-in & JWT Issuance`
  * `Supabase Postgres: Profiles, Cases, Hypotheses`
  * `Row Level Security (RLS): auth.uid() = user_id`
  * `Supabase Storage: Circuit Image Bucket`

### Box 8: Local Fallback Store (Offline Mode)
* **Shape:** Rectangle ($X: 460, Y: 1100$, Size: $340 \times 200\text{ px}$).
* **Fill Color:** Neutral Gray (`#e9ecef`).
* **Border:** Dashed Gray (`#868e96`), 2px stroke.
* **Header Text:** `💾 Local Fallback Store (Offline)`
* **Content Items:**
  * `Embedded SQLite / JSON Storage`
  * `Zero Internet Dependency`
  * `Guest Mode Session Persistence`
  * `Local Temporary Image Directory`

---

## 3. Connectors, Flow Arrows & Labels

1. **Arrow A (Frontend $\rightarrow$ Express API):**
   * Direction: Solid arrow pointing down.
   * Label: `HTTP POST /diagnoses (Authorization: Bearer <JWT>)`
2. **Arrow B (Express API $\rightarrow$ Diagnostic Orchestrator):**
   * Direction: Solid arrow pointing down.
   * Label: `Validated Request Context + Verified User ID`
3. **Arrow C (Orchestrator $\rightarrow$ Knowledge Retrieval):**
   * Direction: Bi-directional arrow.
   * Label: `Query Component Specs & Pinouts`
4. **Arrow D (Orchestrator $\rightarrow$ Deterministic Rules):**
   * Direction: Bi-directional arrow.
   * Label: `Verify Ohm's Law & Logic Levels`
5. **Arrow E (Orchestrator $\rightarrow$ Local Gemma 4):**
   * Direction: Bi-directional arrow.
   * Label: `Grounded Prompt -> Structured JSON Hypotheses`
6. **Arrow F (Express API $\rightarrow$ Supabase Postgres):**
   * Direction: Solid arrow pointing down.
   * Label: `RLS-Protected Persistence (Online Mode)`
7. **Arrow G (Express API $\rightarrow$ Local Fallback Store):**
   * Direction: Dashed arrow pointing down.
   * Label: `Air-Gap Persistence (Offline Mode)`

---

## 4. Manual Creation & PNG Export Instructions

Follow these exact steps to create the visual board:
1. Open **[Excalidraw](https://excalidraw.com)** or **[Miro](https://miro.com)**.
2. Follow the coordinates, color fills, headers, and bullet points listed in Section 2.
3. Draw the connecting arrows and label annotations specified in Section 3.
4. Draw the **Online / Offline Dotted Boundary Line** separating the local backend modules from the cloud Supabase platform.
5. In Excalidraw, click **Menu** (top-left) $\rightarrow$ **Export Image** $\rightarrow$ select **PNG**, scale **2x**.
6. Save the exported image to:
   `c:\Users\sunet\Documents\CircuitSage_AI\docs\sketch.png`
7. Click **Share** (top-right) $\rightarrow$ **Create a shareable link**, and copy the URL.
8. Paste your live URL into Section 6 of `README.md`.
