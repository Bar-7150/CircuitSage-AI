# CircuitSage AI — System Architecture Specification

**Document Version:** 2.0.0  
**Status:** Proposed / In Review  
**Architecture Lead:** Software Architecture & Systems Engineering Team  
**Target Release:** MVP (Kenshi $\rightarrow$ Samurai $\rightarrow$ Shogun Milestones)  
**Last Updated:** 2026-10-04  

---

## 1. System Overview

**CircuitSage AI** is an AI-powered electronics troubleshooting assistant that combines local open-weight language and vision capabilities (**Gemma 4**) with a **deterministic engineering rules engine** and a **curated electronics knowledge retrieval service**.

The system utilizes a modular service architecture:
* A modern **Next.js** frontend (React with JavaScript, styled with **Tailwind CSS**) provides an intuitive, epistemic-aware user experience.
* A **Node.js / Express.js REST API** orchestrates diagnostic sessions, validates inputs, executes deterministic electrical calculations, and manages data persistence.
* **Supabase (Postgres, Auth, RLS, Storage)** provides managed authentication and relational persistence when operating in connected mode.
* An isolated **Local Gemma 4 Inference Service** processes unstructured descriptions and hypotheses locally on the user's host machine.
* An embedded **Local Fallback Storage Engine** ensures core troubleshooting capabilities remain functional even when disconnected from the internet or cloud-hosted services.

---

## 2. System Architecture Diagram

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENT WORKSTATION                                │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                              Next.js Frontend                               │  │
│  │                     React (JavaScript) + Tailwind CSS                       │  │
│  │  - Single-Page Responsive UI (Intake, Probing Modal, Diagnostic Cards)       │  │
│  │  - Epistemic Badging: Verified (Green), Inferred (Yellow), Unknown (Gray)   │  │
│  │  - Supabase Auth Client (Browser Token Management)                          │  │
│  └──────────────────────────────────────┬──────────────────────────────────────┘  │
│                                         │ HTTPS / JSON REST API                   │
│                                         │ (Bearer Token in Authorization Header)   │
│                                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                              Express.js API                                 │  │
│  │  - Modular Service Architecture                                             │  │
│  │  - Request Validation Middleware (Zod/Joi)                                  │  │
│  │  - Supabase Token Verification & Authentication Middleware                  │  │
│  │  - Resource Authorization & User Context Injection                          │  │
│  └──────────────────────────────────────┬──────────────────────────────────────┘  │
│                                         │                                         │
│                                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                           Diagnostic Orchestrator                           │  │
│  │  - Manages session lifecycle, measurement ingestion, & hypothesis re-ranking│  │
│  └───────────────┬──────────────────────┬──────────────────────┬───────────────┘  │
│                  │                      │                      │                  │
│                  ▼                      ▼                      ▼                  │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │ Local Gemma 4 Service │  │ Knowledge Retrieval   │  │ Deterministic Rules   │  │
│  │ - Dedicated Adapter   │  │ Service               │  │ Engine                │  │
│  │ - Local HTTP/RPC Pipe │  │ - Curated Datasheets  │  │ - Ohm's Law & Limits  │  │
│  │ - Quantized Inference │  │ - Pinout Constraints  │  │ - Logic Level Check   │  │
│  │ - Constrained JSON    │  │ - Local DB / Cache    │  │ - Bus Pull-Up Check   │  │
│  └───────────────────────┘  └───────────────────────┘  └───────────────────────┘  │
│                  │                      │                      │                  │
│                  └──────────────────────┼──────────────────────┘                  │
│                                         │                                         │
│                                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                         Data Persistence Coordinator                        │  │
│  │                                                                             │  │
│  │  [Online Mode: Cloud or Local Docker]       [Offline Air-Gap Mode: Fallback]│  │
│  │  ┌─────────────────────────────────┐        ┌─────────────────────────────┐ │  │
│  │  │ Supabase Postgres (via Client)  │        │ Local SQLite / File Store   │ │  │
│  │  │ - Row Level Security (RLS)      │        │ - Ephemeral / Local Guest   │ │  │
│  │  │ - Profiles, Cases, Hypotheses   │        │ - Zero Network Dependency   │ │  │
│  │  │ - Supabase Storage (Images)     │        │ - Local Image Cache         │ │  │
│  │  └─────────────────────────────────┘        └─────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────┘

Security & Access Boundaries:
- Authentication: Supabase Auth (JWT bearer verification in Express).
- Authorization: Express middleware checks + Supabase Row Level Security (RLS).
- AI Privacy: 100% Local Gemma 4 inference; zero telemetry transmitted to third-party clouds.
```

---

## 3. Component Responsibilities

| Component | Technology | Primary Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | Next.js (React / JS / Tailwind) | • Render responsive diagnostic views and step-by-step multimeter instructions.<br>• Provide color-coded epistemic states (Verified, Inferred, Unknown).<br>• Acquire and manage Supabase Auth user sessions and JWT access tokens. |
| **API Server** | Express.js / Node.js | • Serve REST endpoints under `/api/v1`.<br>• Enforce input validation and sanitize multipart/form uploads.<br>• Validate Supabase JWTs and enforce user-resource ownership.<br>• Coordinate retrieval, rules validation, and AI inference. |
| **Auth Middleware** | Express Middleware | • Intercept HTTP `Authorization: Bearer <token>` headers.<br>• Verify signatures via Supabase Auth public key or client verification.<br>• Attach `req.user = { id, email }` to request context; reject unauthenticated calls on protected routes. |
| **Diagnostic Orchestrator** | Node.js Service Module | • Coordinate the multi-step diagnostic lifecycle: intake $\rightarrow$ pre-check $\rightarrow$ inference $\rightarrow$ measurement $\rightarrow$ elimination.<br>• Update hypothesis confidence scores when new multimeter readings are submitted. |
| **Rules Engine** | Pure JavaScript Module | • Deterministically compute electrical equations (Ohm's Law, LED forward current, voltage dividers).<br>• Verify logic levels ($5\text{V} \rightarrow 3.3\text{V}$ violations) and I2C pull-up termination.<br>• Enforce three-state output: `VERIFIED_PASS`, `VERIFIED_FAIL`, or `UNKNOWN`. |
| **Retrieval Service** | Node.js Service Module | • Query curated component specifications (pinouts, voltage limits, maximum ratings, default I2C addresses).<br>• Supply structured datasheet snippets to the orchestrator and prompt builder. |
| **AI Inference Service** | Node.js Adapter Service | • Communicate with local Gemma 4 runtime via a dedicated interface (HTTP/IPC).<br>• Enforce strict JSON schema responses; catch timeouts and handle memory limits gracefully. |
| **Persistence Layer** | Supabase Postgres / Local Fallback | • Store profiles, diagnostic cases, messages, hypotheses, and measurements.<br>• Enforce database-level Row Level Security (RLS) on all user-owned tables. |

---

## 4. Technology Choices and Justifications

* **Next.js (React with JavaScript & Tailwind CSS):** Enables rapid development of modern, responsive interfaces without the overhead of heavy full-stack frameworks. JavaScript is chosen to match team proficiency while Tailwind CSS allows precise utility-first styling for epistemic status badges.
* **Node.js & Express.js:** Lightweight, well-understood asynchronous runtime with rich middleware support for streaming, file handling, and validation. Allows clean separation of concerns across dedicated service modules.
* **Supabase Postgres:** Enterprise-grade relational database providing robust ACID transactions, JSONB document querying, and relational integrity across cases, hypotheses, and measurements.
* **Supabase Auth & RLS:** Managed user authentication eliminating the need to write custom password hashing, token rotation, and identity storage. Row Level Security guarantees that users can only query and mutate their own diagnostic records.
* **Local Gemma 4 Inference:** Open-weight architecture that respects hardware privacy by running locally on the user's host machine, avoiding recurring token costs and external API latency.
* **Deterministic Rules Engine:** Probabilistic LLMs cannot be trusted with circuit math. A deterministic JavaScript rules engine ensures that electrical violations are caught with 100% mathematical certainty.

---

## 5. End-to-End Data Flow

```
[Next.js Client]            [Express API]         [Retrieval & Rules]       [Local Gemma 4]       [Supabase DB]
       |                          |                        |                       |                    |
       | 1. POST /diagnoses       |                        |                       |                    |
       |    (Bearer Token)        |                        |                       |                    |
       |------------------------->|                        |                       |                    |
       |                          | 2. Verify Auth Token   |                       |                    |
       |                          |    & Authorize User    |                       |                    |
       |                          |-------------------------------------------------------------------->|
       |                          | 3. Query Specs         |                       |                    |
       |                          |----------------------->|                       |                    |
       |                          |<-----------------------|                       |                    |
       |                          | 4. Deterministic Check |                       |                    |
       |                          |----------------------->|                       |                    |
       |                          |<-----------------------|                       |                    |
       |                          |    (Pass/Fail/Unknown) |                       |                    |
       |                          |                        |                       |                    |
       |                          | 5. Synthesize Prompt & Request JSON Hypotheses |                    |
       |                          |----------------------------------------------->|                    |
       |                          |<-----------------------------------------------|                    |
       |                          | 6. Persist Case & Hypotheses (RLS-enforced)                         |
       |                          |-------------------------------------------------------------------->|
       | 7. Return Diagnostic     |                        |                       |                    |
       |    Session Payload       |                        |                       |                    |
       |<-------------------------|                        |                       |                    |
       |                          |                        |                       |                    |
       | 8. POST /measurements    |                        |                       |                    |
       |    (e.g., "3.28V")       |                        |                       |                    |
       |------------------------->|                        |                       |                    |
       |                          | 9. Re-evaluate Rules & Eliminate Contradictions|                    |
       |                          |----------------------->|                       |                    |
       |                          |<-----------------------|                       |                    |
       |                          | 10. Update DB State    |                       |                    |
       |                          |-------------------------------------------------------------------->|
       | 11. Return Updated       |                        |                       |                    |
       |     Hypotheses           |                        |                       |                    |
       |<-------------------------|                        |                       |                    |
```

---

## 6. Core Entities and Relationships

```text
┌──────────────────────┐       1:1       ┌──────────────────────┐
│       profiles       │─────────────────│    auth.users (FK)   │
└──────────┬───────────┘                 └──────────────────────┘
           │
           │ 1:N
           ▼
┌──────────────────────┐       1:N       ┌──────────────────────┐
│   diagnostic_cases   │────────────────<│    case_messages     │
└──────────┬───────────┘                 └──────────────────────┘
           │
           │ 1:N
           ├─────────────────────────────┐
           ▼                             ▼
┌──────────────────────┐       1:N       ┌──────────────────────┐
│diagnostic_hypotheses │────────────────<│     measurements     │
└──────────┬───────────┘                 └──────────────────────┘
           │
           │ N:M (References)
           ▼
┌──────────────────────┐
│  knowledge_sources   │
└──────────────────────┘
           ▲
           │ 1:N
┌──────────┴───────────┐
│ diagnostic_feedback  │
└──────────────────────┘
```

### 6.1 Entity Specifications

#### 1. `profiles`
* **Purpose:** Stores user application settings and profile metadata, extending Supabase `auth.users`.
* **Fields:**
  * `id` (UUID, Primary Key, References `auth.users.id` ON DELETE CASCADE).
  * `display_name` (TEXT).
  * `experience_level` (TEXT: `'BEGINNER'`, `'INTERMEDIATE'`, `'ADVANCED'`).
  * `created_at` (TIMESTAMPTZ, default `NOW()`).
  * `updated_at` (TIMESTAMPTZ, default `NOW()`).
* **Ownership & RLS:** Users can read and update only their own profile (`auth.uid() = id`).

#### 2. `diagnostic_cases`
* **Purpose:** Represents an individual troubleshooting investigation.
* **Fields:**
  * `id` (UUID, Primary Key, default `gen_random_uuid()`).
  * `user_id` (UUID, Foreign Key $\rightarrow$ `profiles.id`, nullable for guest sessions).
  * `title` (TEXT, e.g., "ESP32 OLED Display Failure").
  * `target_board` (TEXT, e.g., "ESP32 DevKit v1").
  * `symptom_description` (TEXT).
  * `status` (TEXT: `'INTAKE'`, `'ACTIVE'`, `'RESOLVED'`, `'ABORTED'`).
  * `image_path` (TEXT, nullable, Supabase Storage or local path).
  * `created_at` (TIMESTAMPTZ, default `NOW()`).
  * `updated_at` (TIMESTAMPTZ, default `NOW()`).
* **Indexes:** `idx_diagnostic_cases_user_id` ON (`user_id`), `idx_diagnostic_cases_status` ON (`status`).
* **Ownership & RLS:** Enforce `auth.uid() = user_id`.

#### 3. `case_messages`
* **Purpose:** Stores the conversation and reasoning trail for a diagnostic case.
* **Fields:**
  * `id` (UUID, Primary Key, default `gen_random_uuid()`).
  * `case_id` (UUID, Foreign Key $\rightarrow$ `diagnostic_cases.id` ON DELETE CASCADE).
  * `sender` (TEXT: `'USER'`, `'ASSISTANT'`, `'SYSTEM'`).
  * `message_text` (TEXT).
  * `created_at` (TIMESTAMPTZ, default `NOW()`).
* **Indexes:** `idx_case_messages_case_id` ON (`case_id`).

#### 4. `diagnostic_hypotheses`
* **Purpose:** Stores ranked potential fault causes generated by Gemma 4 or deterministic rules.
* **Fields:**
  * `id` (UUID, Primary Key, default `gen_random_uuid()`).
  * `case_id` (UUID, Foreign Key $\rightarrow$ `diagnostic_cases.id` ON DELETE CASCADE).
  * `title` (TEXT).
  * `category` (TEXT: `'WIRING_POLARITY'`, `'OVERCURRENT'`, `'VOLTAGE_MISMATCH'`, `'PULLUP_MISSING'`).
  * `epistemic_status` (TEXT: `'VERIFIED_FACT'`, `'AI_INFERENCE'`, `'UNKNOWN'`).
  * `confidence_score` (NUMERIC(3,2), range 0.00 to 1.00).
  * `explanation` (TEXT).
  * `eliminated` (BOOLEAN, default `FALSE`).
  * `elimination_reason` (TEXT, nullable).
  * `created_at` (TIMESTAMPTZ, default `NOW()`).
* **Indexes:** `idx_hypotheses_case_id` ON (`case_id`).

#### 5. `measurements`
* **Purpose:** Stores physical values entered by the user (multimeter readings, continuity checks).
* **Fields:**
  * `id` (UUID, Primary Key, default `gen_random_uuid()`).
  * `case_id` (UUID, Foreign Key $\rightarrow$ `diagnostic_cases.id` ON DELETE CASCADE).
  * `test_id` (TEXT, e.g., "test_gpio18_voltage").
  * `measurement_type` (TEXT: `'VOLTAGE_DC'`, `'RESISTANCE_OHMS'`, `'CONTINUITY'`).
  * `numeric_value` (NUMERIC(8,3), nullable).
  * `unit` (TEXT, e.g., "V", "ohms").
  * `probe_positive` (TEXT, e.g., "GPIO 18").
  * `probe_negative` (TEXT, e.g., "GND Rail").
  * `created_at` (TIMESTAMPTZ, default `NOW()`).
* **Indexes:** `idx_measurements_case_id` ON (`case_id`).

#### 6. `knowledge_sources`
* **Purpose:** Curated electronics reference catalog containing verified component boundaries and pinouts.
* **Fields:**
  * `id` (TEXT, Primary Key, e.g., `'comp_esp32_devkit_v1'`).
  * `component_name` (TEXT).
  * `category` (TEXT: `'MICROCONTROLLER'`, `'SENSOR'`, `'PASSIVE'`, `'SEMICONDUCTOR'`).
  * `operating_voltage_min` (NUMERIC(4,2)).
  * `operating_voltage_max` (NUMERIC(4,2)).
  * `max_pin_current_ma` (NUMERIC(5,2)).
  * `pinout_data` (JSONB).
  * `known_pitfalls` (JSONB).
  * `source_document` (TEXT).
* **Retention:** Read-only reference table; updated via version-controlled seed migrations.

#### 7. `diagnostic_feedback`
* **Purpose:** Collects user feedback for Shogun milestone validation and system tuning.
* **Fields:**
  * `id` (UUID, Primary Key, default `gen_random_uuid()`).
  * `case_id` (UUID, Foreign Key $\rightarrow$ `diagnostic_cases.id`).
  * `user_id` (UUID, Foreign Key $\rightarrow$ `profiles.id`, nullable).
  * `usefulness_rating` (INTEGER, range 1 to 5).
  * `fault_resolved` (BOOLEAN).
  * `comments` (TEXT, nullable).
  * `created_at` (TIMESTAMPTZ, default `NOW()`).

---

## 7. Authentication and Authorization Architecture

### 7.1 Supabase Auth & JWT Verification Flow
1. **Frontend Sign-In:** The user signs in via Supabase Auth on the Next.js client (`supabase.auth.signInWithPassword` or OAuth).
2. **Token Issuance:** Supabase Auth issues a JWT access token containing the user's `sub` (`user_id`) and expiration timestamp.
3. **API Request:** Next.js attaches the token to outbound HTTP requests:
   `Authorization: Bearer <access_token>`
4. **Backend Token Verification:** Express authentication middleware intercepts the header and verifies the token using the Supabase JWT secret or `@supabase/supabase-js` `auth.getUser(token)`:
   ```javascript
   const { data: { user }, error } = await supabaseClient.auth.getUser(token);
   if (error || !user) {
     return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
   }
   req.user = user; // Securely attach verified user context
   ```
5. **Enforcement:** The authenticated identity is strictly derived from `req.user.id`. The API rejects any attempt to override ownership via request body parameters.

### 7.2 Service-Role Key vs. User-Scoped Client
* **Service-Role Key Security:** The Express backend possesses the privileged `SUPABASE_SERVICE_ROLE_KEY` solely for maintenance, seed ingestion, and administrative operations. **This key is NEVER transmitted to the frontend or exposed in client bundles.**
* **User-Scoped Queries:** For application queries, Express constructs a user-scoped Supabase client initialized with the user's Bearer token (`auth.setSession`), allowing Supabase Row Level Security (RLS) to enforce data boundaries directly at the database engine level.

---

## 8. Error Handling and Observability

### 8.1 Standardized Error Envelope
All error responses adhere to a consistent contract without exposing internal stack traces, system paths, or credentials:

```json
{
  "error": {
    "code": "DETERMINISTIC_CHECK_FAILED",
    "message": "Calculated LED forward current exceeds maximum safe limit.",
    "details": [
      {
        "field": "resistor_ohms",
        "issue": "Value of 10 ohms results in 130mA, exceeding 25mA maximum diode rating."
      }
    ],
    "requestId": "req_01j9a3b4c5"
  }
}
```

### 8.2 Standard Error Codes
* `VALIDATION_ERROR` (422): Input validation failed on incoming request.
* `UNAUTHORIZED` (401): Missing, expired, or invalid Supabase Bearer token.
* `FORBIDDEN` (403): User does not own the requested diagnostic case.
* `RESOURCE_NOT_FOUND` (404): Specified case, component, or measurement ID does not exist.
* `MODEL_UNAVAILABLE` (503): Local Gemma 4 inference runtime is offline or unreachable.
* `MODEL_OUT_OF_MEMORY` (507): Local host exhausted GPU VRAM / system RAM during inference.
* `DATABASE_ERROR` (500): Supabase Postgres connection or query execution failure.

---

## 9. AI Inference Architecture

* **Dedicated Service Adapter:** The Express backend communicates with local Gemma 4 through an isolated `AiInferenceService` interface (`services/aiInferenceService.js`).
* **Runtime Decoupling:** The adapter connects to a local inference provider (such as an Ollama instance, llama.cpp server, or Python model microservice) over `http://127.0.0.1:<port>` using strict timeouts (default: 30 seconds).
* **Constrained Output Decoding:** Prompts explicitly mandate RFC 8259 JSON output. Responses are parsed and validated against a Pydantic/Zod schema before being returned to the orchestrator.
* **Multimodal Stance:** Multimodal circuit-photo processing is treated as an optional enhancement. If the local runtime lacks vision capabilities, the service transparently falls back to structured textual inputs without crashing.

---

## 10. Knowledge Retrieval Architecture

* **Curated Repository:** Knowledge is maintained as structured JSON/SQL seeds containing verified specifications extracted from official manufacturer datasheets (Espressif, Microchip, Raspberry Pi Foundation).
* **Retrieval Service:** The `KnowledgeRetrievalService` provides rapid query methods:
  * `getComponentById(componentId)`: Retrieves pinouts, operating voltage, and maximum current ratings.
  * `searchComponents(query, category)`: Performs fast keyword lookup across component names and aliases.
* **Deterministic Grounding:** Retrieval results are directly injected into the prompt context for Gemma 4 and passed into the rules engine for physical verification.

---

## 11. Deterministic Diagnostic Engine

The deterministic rules engine (`services/rulesEngine.js`) executes independently of the AI model. It enforces basic laws of physics and verified component limitations:

```javascript
// Example: LED Series Resistor Verification Check
function checkLedSeriesResistor(supplyVoltage, ledForwardVoltage, resistorOhms, maxCurrentMa) {
  if (resistorOhms === null || resistorOhms === undefined) {
    return {
      status: 'UNKNOWN',
      message: 'Resistor value is unknown. Cannot verify safe current without resistance measurement.'
    };
  }
  const currentAmps = (supplyVoltage - ledForwardVoltage) / resistorOhms;
  const currentMa = currentAmps * 1000;

  if (currentMa > maxCurrentMa) {
    return {
      status: 'VERIFIED_FAIL',
      message: `Overcurrent hazard: Calculated current (${currentMa.toFixed(1)}mA) exceeds component limit (${maxCurrentMa}mA). Burnout risk!`
    };
  }
  return { status: 'VERIFIED_PASS', message: `Safe current: ${currentMa.toFixed(1)}mA.` };
}
```

---

## 12. Offline vs. Online Operating Modes

> [!WARNING]
> **Explicit Network Dependency Boundary:** Cloud-hosted Supabase services (Postgres, Auth, Storage) **CANNOT** function without an active internet connection. Merely including Supabase in the architecture does NOT make the database offline.

```text
+----------------------------------------------------------------------------------------------------+
|                                    OPERATING MODE CAPABILITY MATRIX                                |
+------------------------------------+-----------------------------+---------------------------------+
| Functional Capability              | Online Mode (Cloud Supabase)| Offline Mode (Local Air-Gap)    |
+------------------------------------+-----------------------------+---------------------------------+
| Local Gemma 4 AI Inference         | ✅ FULL (Localhost)         | ✅ FULL (Localhost)             |
| Deterministic Rules Engine         | ✅ FULL (Node.js Local)     | ✅ FULL (Node.js Local)         |
| Curated Knowledge Retrieval        | ✅ FULL (Local Cache/DB)    | ✅ FULL (Local JSON/SQLite DB)  |
| Interactive Multimeter Probing     | ✅ FULL                     | ✅ FULL                         |
| Diagnostic Report Export           | ✅ FULL                     | ✅ FULL (Markdown/JSON Export)  |
| User Account Sign-In (Cloud Auth)  | ✅ Active                   | ❌ Disabled (Guest Mode Only)   |
| Multi-Device Cloud Sync            | ✅ Active                   | ❌ Disabled                     |
| Cloud Image Persistence (Storage)  | ✅ Supabase Storage Bucket  | ⚠️ Local Temp Directory Only    |
+------------------------------------+-----------------------------+---------------------------------+
```

### Offline Fallback Architecture
When the host workstation is offline:
1. The frontend switches to **Guest Mode**, bypassing Supabase Auth login screens.
2. The Express API persists session states to an embedded **Local Fallback Storage** (SQLite file or in-memory JSON session manager at `data/local_sessions.json`).
3. Knowledge retrieval queries an embedded JSON/SQLite copy of the curated knowledge base.
4. AI inference continues uninterrupted via the local Gemma 4 runtime on `127.0.0.1`.

---

## 13. Security and Privacy

1. **Air-Gap Privacy:** Circuit photographs, diagnostic symptoms, and multimeter readings are processed exclusively on the local machine by default. No diagnostic data is sent to external cloud AI APIs (Google, OpenAI, Anthropic).
2. **Localhost Binding:** Express binds exclusively to `127.0.0.1` by default to prevent external access on shared or university Wi-Fi networks.
3. **Secret Hygiene:** Database passwords, service-role keys, and JWT secrets are stored in `.env` files and excluded from git via `.gitignore`.
4. **Input Sanitization:** All user inputs and uploaded files are sanitized; EXIF metadata is stripped from images to protect location privacy.

---

## 14. Testing and Deployment Approach

* **Backend Testing:** Tested using **Jest** for unit tests (rules engine, retrieval logic) and **Supertest** for REST API integration tests.
* **Frontend Testing:** React Testing Library for verifying epistemic badge rendering and form submission.
* **Offline CI Verification:** A dedicated automated test suite runs with simulated network disconnection to guarantee offline diagnostic execution.
* **Local Development Workflow:**
  * Backend: `node server.js` or `npm run dev` (running Express on port 8000).
  * Frontend: `npm run dev` (running Next.js on port 3000).

---

## 15. Architectural Limitations and Trade-offs

1. **Local Compute Resource Contention:** Running Gemma 4 alongside Next.js and Express on a machine with $< 16\text{ GB}$ RAM may cause memory pressure. *Mitigation:* Support 4-bit model quantization and CPU thread throttling.
2. **Dual-Persistence Complexity:** Supporting cloud Supabase when online and local storage when offline introduces synchronization boundaries. *Mitigation:* Treat offline sessions as local exports; cloud syncing of offline sessions is deferred to post-MVP.
3. **Multimodal Model Dependency:** High-fidelity vision models are resource intensive. *Mitigation:* Decouple image upload from diagnosis so the system operates completely on text and pin selections when vision inference is unfeasible.
