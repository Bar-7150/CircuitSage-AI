# CircuitSage AI — Development Roadmap & Milestone Plan

**Document Version:** 2.0.0  
**Status:** Proposed Product Plan (Pending Confirmation against Official Program Rubric)  
**Program Milestones:** Kenshi $\rightarrow$ Samurai $\rightarrow$ Shogun  
**Author:** Engineering Management & Product Lead  
**Last Updated:** 2026-10-04  

---

> [!IMPORTANT]
> **Program Alignment Notice:** The milestone definitions below represent our engineering team's **provisional working interpretation** of the three program levels (**Kenshi**, **Samurai**, and **Shogun**). Specific official competition requirements, grading weights, and formal deadlines have not yet been provided by program organizers. All schedules use relative timelines (e.g., Week 1, Week 2) and will be mapped to calendar dates once official deadlines are confirmed.

---

## 1. Executive Milestone Overview

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                               DEVELOPMENT MILESTONE TIMELINE                      │
├──────────────────────────┬──────────────────────────┬─────────────────────────────┤
│ Level 1: Kenshi          │ Level 2: Samurai         │ Level 3: Shogun             │
│ Weeks 1 – 3 (Days 1–21)  │ Weeks 4 – 7 (Days 22–49) │ Weeks 8 – 10 (Days 50–70)   │
│ "Foundation & Feasibility"│ "Functional Core & Sync" │ "User Validation & Release" │
├──────────────────────────┼──────────────────────────┼─────────────────────────────┤
│ • Scaffolding & Arch     │ • Supabase Auth & RLS    │ • 25-User Usability Study   │
│ • Express API Skeleton   │ • Full Diagnostic Loop   │ • Performance Optimization  │
│ • Deterministic Rules    │ • Knowledge Retrieval    │ • Air-Gap Disconnect Test   │
│ • Local AI Inference PoC │ • Interactive Probing    │ • Final Demo & Public Repo  │
└──────────────────────────┴──────────────────────────┴─────────────────────────────┘
```

---

## 2. Level 1: Kenshi — Foundation & Core Feasibility

### 2.1 Objective
Establish the foundational system architecture, validate the core engineering concepts, scaffold the Express.js API and Next.js frontend, and demonstrate an end-to-end mock diagnostic loop connecting deterministic rules and local AI inference.

### 2.2 Relative Timeline
* **Estimated Duration:** 3 Weeks (Days 1 through 21).

### 2.3 Features to Deliver
* Basic Next.js problem intake screen (text symptom input and board selector).
* Express.js REST API skeleton (`/api/v1/health`, `/api/v1/diagnoses`).
* Deterministic rules engine (Ohm's Law, LED series resistance calculation, logic level mismatch check).
* Local Gemma 4 inference adapter connecting Express to a local inference runtime.
* Static seed of initial 10-component knowledge catalog (ESP32, Uno, Pico, LEDs, standard resistors).

### 2.4 Technical Tasks
1. Initialize Node.js repository with Express.js, CORS, and request ID middleware.
2. Initialize Next.js project with Tailwind CSS and epistemic color tokens (`#2b8a3e`, `#e67700`, `#868e96`).
3. Implement `services/rulesEngine.js` with pure mathematical functions for LED current and voltage divider checks.
4. Implement `services/aiInferenceService.js` adapter connecting to local Gemma 4 runtime via HTTP.
5. Create mock integration test verifying end-to-end flow from API intake to structured hypothesis output.

### 2.5 Documentation Deliverables
* Complete `PRD.md`, `ARCHITECTURE.md`, `API_SPEC.md`, `REQUIREMENTS.md`, and `ROADMAP.md`.
* `SKETCH_PLAN.md` detailing the Excalidraw UI wireframe blueprint.

### 2.6 Testing and Validation
* Jest unit tests covering rules engine boundary conditions ($R=0\ \Omega$, overcurrent, negative values).
* Supertest API test for `GET /api/v1/health`.
* Verified execution of local Gemma 4 inference on host workstation.

### 2.7 Dependencies & Risks
* *Dependency:* Workstation with Node.js 18+ and a compatible local AI runtime.
* *Risk:* Local Gemma 4 runtime installation or VRAM constraints on developer hardware.
* *Mitigation:* Implement a local mock AI service module (`services/mockAiService.js`) to unblock frontend and rules engine development while model weights download.

### 2.8 Definition of Done (Kenshi)
* A developer can boot the Express backend and Next.js frontend locally.
* Submitting a circuit symptom generates at least one deterministic check result and one local AI hypothesis.
* Test suite passes with $\ge 80\%$ code coverage on the rules engine.

---

## 3. Level 2: Samurai — Functional Core & Persistence

### 3.1 Objective
Deliver a complete, stateful troubleshooting product. Implement Supabase user authentication, Row Level Security (RLS), persistent diagnostic cases, knowledge retrieval, and the interactive multimeter probing and hypothesis elimination loop.

### 3.2 Relative Timeline
* **Estimated Duration:** 4 Weeks (Days 22 through 49).

### 3.3 Features to Deliver
* Supabase Auth integration (sign-up, login, JWT token management on client).
* Express authentication middleware validating Supabase JWTs and attaching user identity.
* Persistent database schema (`profiles`, `diagnostic_cases`, `diagnostic_hypotheses`, `measurements`).
* Interactive multimeter probing modal in Next.js: step-by-step probe placement and measurement input.
* Hypothesis elimination engine: user-submitted measurements dynamically rule out invalid hypotheses.
* Knowledge base search endpoint (`GET /api/v1/knowledge/search`).
* Markdown diagnostic report generator.

### 3.4 Technical Tasks
1. Configure Supabase project, execute SQL migrations, and configure Row Level Security (RLS) policies.
2. Implement Express `authMiddleware.js` verifying Bearer tokens via Supabase client.
3. Build Next.js interactive diagnostic workspace with real-time hypothesis cards.
4. Implement `POST /api/v1/diagnoses/:id/measurements` updating case state and hypothesis probabilities.
5. Implement local persistence fallback module for offline operation when cloud Supabase is unreachable.

### 3.5 Documentation Deliverables
* Updated `API_SPEC.md` reflecting implemented request/response schemas.
* Database migration scripts documented in `docs/DATABASE_SCHEMA.md`.

### 3.6 Testing and Validation
* Supertest integration tests for authenticated endpoints (`POST /diagnoses`, `POST /measurements`).
* Verification of Supabase RLS: verify that User B cannot query or update User A's diagnostic cases.
* 10 reproducible golden diagnostic cases evaluated to verify hypothesis ranking accuracy.

### 3.7 Dependencies & Risks
* *Dependency:* Active Supabase project credentials for online development.
* *Risk:* Inability to use cloud Supabase in offline environments.
* *Mitigation:* Explicitly implement and test the local fallback storage adapter for air-gapped sessions.

### 3.8 Definition of Done (Samurai)
* Authenticated users can create, view, probe, and resolve diagnostic cases with data persisted in Supabase Postgres.
* Submitting a multimeter voltage reading successfully updates the active hypothesis list.
* Epistemic state indicators correctly distinguish Verified, Inferred, and Unknown elements.

---

## 4. Level 3: Shogun — User Validation & Public Release

### 4.1 Objective
Validate the product with **at least 25 target users**, resolve usability and diagnostic defects, verify strict offline air-gap capabilities, and publish an open-source repository with documentation, demo video, and reproducible setup guides.

### 4.2 Relative Timeline
* **Estimated Duration:** 3 Weeks (Days 50 through 70).

### 4.3 25-User Validation Protocol & Plan
```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                             25-USER SHOGUN VALIDATION PLAN                        │
├────────────────────┬─────────────────────────┬────────────────────────────────────┤
│ Participant Group  │ Target Count            │ Recruitment Channel                │
├────────────────────┼─────────────────────────┼────────────────────────────────────┤
│ Engineering Students│ 15 Participants         │ University MakerSpace & Lab Courses│
│ Maker Hobbyists    │ 7 Participants          │ Local Maker Community / Meetups    │
│ Lab Teaching Assts │ 3 Participants          │ Academic Department Faculty Outreach│
└────────────────────┴─────────────────────────┴────────────────────────────────────┘
```

* **User Qualification:** Participants must be active hardware learners or makers with basic familiarity with breadboards and multimeters.
* **Consent & Ethics:** All participants sign an informed consent form. No biometric, academic, or personal data is collected.
* **Evaluation Tasks:** Each user is assigned one pre-staged faulty circuit (e.g., ESP32 with unpulled I2C bus, or floating button input) and asked to resolve it using CircuitSage AI and a digital multimeter within 20 minutes.
* **Feedback Mechanism:** In-app rating via `POST /api/v1/feedback` and post-session qualitative interview.
* **Pass/Fail Criterion:** Milestone passes if $\ge 76\%$ ($19/25$) of participants successfully identify and resolve the circuit fault with an average usefulness score $\ge 4.0/5.0$ and zero safety incidents.

### 4.4 Technical Tasks
1. Hardening & bug fixing based on usability feedback.
2. Execution of the **Air-Gap Verification Test**: physically disconnect network adapters and execute a full diagnostic session end-to-end.
3. Clean repository code, remove dead code, and format code with ESLint and Prettier.
4. Record 3-minute project demonstration video.
5. Create live Excalidraw board and export `/docs/sketch.png`.

### 4.5 Documentation Deliverables
* Complete 25-User Usability Study Dossier with anonymized metrics and survey results.
* Final `README.md` with environment configuration, setup steps, and offline boundaries.
* Public GitHub release with open-source MIT license.

### 4.6 Definition of Done (Shogun)
* 25 target users tested with logged consent and documented results.
* Application passes offline air-gap verification test.
* Public GitHub repository is live, cloneable, and documented.
* Demonstration video and Excalidraw architecture sketch published.
