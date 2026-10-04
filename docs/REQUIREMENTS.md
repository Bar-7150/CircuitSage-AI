# CircuitSage AI — Engineering Requirements Specification

**Document Version:** 2.0.0  
**Status:** Proposed / In Review  
**Author:** Systems Engineering & Software Architecture Team  
**Target Release:** MVP (Kenshi $\rightarrow$ Samurai $\rightarrow$ Shogun Milestones)  
**Last Updated:** 2026-10-04  

---

## 1. Functional Requirements (FR)

| ID | Statement | Priority | Verification Method | Acceptance Criteria | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-001** | The system shall provide a structured intake form capturing symptom text, target board, and connected components. | **Must** | Test | Form accepts valid text ($\ge 10$ chars), validates inputs, and constructs a new diagnostic case. | None |
| **FR-002** | The system shall support optional circuit photo upload in JPEG, PNG, or WebP formats up to 10 MB. | **Should** | Test | Uploads $< 10\text{ MB}$ succeed; unsupported formats or files $> 10\text{ MB}$ return `422/413` errors. | None |
| **FR-003** | The system shall query a local curated knowledge base for component voltage limits, max pin currents, and pinouts. | **Must** | Test | Querying "ESP32 DevKit v1" returns 3.3V logic and 40mA max pin limits in $< 50\text{ ms}$. | Database Seed |
| **FR-004** | The system shall deterministically calculate LED series resistance and flag destructive overcurrent ($I > I_{\max}$). | **Must** | Test | Calculating with $V_{cc}=5\text{V}, V_f=2\text{V}, R=10\ \Omega$ outputs `VERIFIED_FAIL` with burnout warning. | None |
| **FR-005** | The system shall detect voltage level incompatibilities when a 5V output drives a 3.3V microcontroller GPIO. | **Must** | Test | Flagged as `VERIFIED_FAIL` with level shifter requirement explanation. | FR-003 |
| **FR-006** | The system shall identify missing pull-up resistors on I2C bus lines (SDA/SCL) for supported devices. | **Must** | Test | SSD1306 without bus pull-ups is flagged with a pull-up missing hypothesis. | FR-003 |
| **FR-007** | The system shall classify every piece of evidence into `VERIFIED_FACT`, `AI_INFERENCE`, or `UNKNOWN`. | **Must** | Inspection | UI renders color-coded badges (Green, Amber, Gray) with zero unmeasured values labeled as facts. | None |
| **FR-008** | The system shall output `UNKNOWN` and refuse to assume default values when critical parameters are omitted. | **Must** | Test | Missing resistor value results in `UNKNOWN` status, not an assumed safe value. | None |
| **FR-009** | The system shall execute local Gemma 4 inference to generate ranked fault hypotheses and clarifying questions. | **Must** | Test | Returns at least 2 ranked hypotheses conforming to the diagnostic JSON schema. | Gemma 4 Runtime |
| **FR-010** | The system shall fall back to text-only reasoning if circuit image parsing fails or vision runtime is unverified. | **Must** | Test | Image failure returns informative warning while completing diagnosis using text inputs. | FR-001 |
| **FR-011** | The system shall generate step-by-step multimeter probing instructions (mode, red probe, black probe, expected range). | **Must** | Inspection | Test card specifies DMM dial mode (e.g., DC 20V) and exact component probe locations. | FR-009 |
| **FR-012** | The system shall accept physical measurement inputs (voltage, resistance) and update active hypotheses. | **Must** | Test | Entering "3.28V" on GPIO 18 eliminates firmware failure hypothesis and re-ranks root cause. | FR-004 |
| **FR-013** | The system shall allow users to export the diagnostic case summary as a Markdown or JSON report. | **Should** | Test | Export generates structured document containing symptoms, measurements, and resolution. | FR-012 |
| **FR-014** | The system shall record user feedback (1–5 rating, resolution status) via `POST /api/v1/feedback`. | **Must** | Test | Endpoint records feedback payload in database for Shogun milestone evaluation. | Database |

---

## 2. Non-Functional Requirements (NFR)

| ID | Statement | Priority | Verification Method | Acceptance Criteria | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NFR-001** | Express.js API response time (excluding AI inference) shall not exceed 200 ms under local testing. | **Must** | Test | `GET /api/v1/health` and `GET /api/v1/knowledge/search` respond in $< 200\text{ ms}$ on reference PC. | Reference Hardware |
| **NFR-002** | Local Gemma 4 inference latency shall be measured separately and target $< 15\text{s}$ on GPU ($< 45\text{s}$ on CPU). | **Should** | Benchmark | Inference time logged independently in API response headers or debug payloads. | Gemma 4 Runtime |
| **NFR-003** | Frontend shall render interactive updates at $\ge 60\text{ fps}$ with input latency $< 100\text{ ms}$. | **Must** | Inspection | Smooth form inputs and modal transitions verified via Chrome DevTools Performance tab. | None |
| **NFR-004** | The system shall maintain $\ge 99\%$ crash-free session reliability across 50 consecutive local diagnostic runs. | **Must** | Test | Zero unhandled process crashes during automated 50-session test runner. | None |
| **NFR-005** | Component datasheets and rules engine citations shall reference official manufacturer documents. | **Must** | Inspection | Every verified component specification links to document title and section number. | Curated Catalog |

---

## 3. Security Requirements (SEC)

| ID | Statement | Priority | Verification Method | Acceptance Criteria | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-001** | The Express API shall validate Supabase Auth JWT tokens on all protected routes via Bearer authorization. | **Must** | Test | Missing or forged tokens return `401 Unauthorized`. | Supabase Auth |
| **SEC-002** | Authenticated user identity shall be derived strictly from the validated token, never from request body. | **Must** | Test | Passing a spoofed `user_id` in request body is ignored; token identity is enforced. | SEC-001 |
| **SEC-003** | Supabase Row Level Security (RLS) shall restrict case data access to the owning user. | **Must** | Test | User B querying `/api/v1/diagnoses/:id` belonging to User A receives `404 Not Found` or `403 Forbidden`. | Supabase RLS |
| **SEC-004** | The Supabase service-role key shall never be exposed to the client or committed to source control. | **Must** | Inspection | Grep audit confirms `SUPABASE_SERVICE_ROLE_KEY` appears only in backend `.env`. | None |
| **SEC-005** | Production API error responses shall never expose internal stack traces, system paths, or credentials. | **Must** | Test | Triggered server exceptions return standard error envelope with generic message. | None |
| **SEC-006** | Image uploads shall be sanitized of EXIF metadata (GPS, camera serials) upon ingestion. | **Should** | Test | Extracted image EXIF tags are stripped prior to storage. | Pillow/Sharp |

---

## 4. Accessibility and Usability Requirements (A11Y)

| ID | Statement | Priority | Verification Method | Acceptance Criteria | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A11Y-001** | All UI elements and epistemic badges shall meet WCAG 2.1 AA contrast ratios ($\ge 4.5:1$ for text). | **Must** | Test | Lighthouse accessibility audit score $\ge 90$ on Next.js frontend. | Tailwind Theme |
| **A11Y-002** | Epistemic states (Verified, Inferred, Unknown) shall not rely solely on color to convey meaning. | **Must** | Inspection | Badges include distinct text labels ("Verified Fact", "AI Inference", "Unknown") and icons. | None |
| **A11Y-003** | All interactive modals and form controls shall be fully operable via keyboard navigation. | **Must** | Inspection | Tab order traverses intake form, probe modal, and submit buttons without trapping focus. | None |
| **A11Y-004** | Loading, error, and uncertainty states shall provide clear, non-technical feedback to the user. | **Must** | Inspection | Displays animated spinner with status text during inference; clear retry button on error. | None |

---

## 5. Offline Operation Requirements (OFF)

| ID | Statement | Priority | Verification Method | Acceptance Criteria | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OFF-001** | Core diagnostic workflow (rules, knowledge retrieval, local AI inference) shall operate without internet. | **Must** | Test | Full diagnostic session succeeds with workstation Wi-Fi and Ethernet adapters disabled. | Local AI Runtime |
| **OFF-002** | The application shall provide an explicit Guest Mode when Supabase Auth is unreachable offline. | **Must** | Test | App allows starting a diagnostic session without blocking on Supabase cloud sign-in. | None |
| **OFF-003** | The system shall persist offline session data to a local fallback store (`data/local_sessions.json`). | **Must** | Test | In offline mode, session state is preserved across browser refreshes via local store. | None |
| **OFF-004** | The system shall display a persistent status indicator showing whether it is Online or in Local Offline Mode. | **Must** | Inspection | UI header displays green `● Local Offline Mode` badge when network is disconnected. | None |

---

## 6. Testing and Evaluation Requirements (TEST)

| ID | Statement | Priority | Verification Method | Acceptance Criteria | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TEST-001** | Unit test suite (Jest) shall achieve $\ge 80\%$ statement coverage on deterministic rules engine modules. | **Must** | Test | Running `npm test` outputs $\ge 80\%$ coverage report for `services/rulesEngine.js`. | Jest |
| **TEST-002** | Integration test suite (Supertest) shall validate all 8 REST endpoints under happy and error paths. | **Must** | Test | Supertest suite executes against local Express server with 100% passing tests. | Express API |
| **TEST-003** | The project shall include a reproducible setup script and documented instructions in README. | **Must** | Test | Clean clone on a fresh workstation sets up and boots using documented commands. | README.md |
| **TEST-004** | A golden benchmark suite of 10 reference diagnostic cases shall achieve $\ge 80\%$ fault isolation accuracy. | **Should** | Benchmark | Automated runner evaluates 10 test scenarios, correctly isolating root cause in $\ge 8$ cases. | FR-012 |

---

## 7. Assumptions, Constraints, and Team Planning

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   KNOWLEDGE, ASSUMPTIONS & CONSTRAINTS                                 │
├───────────────────┬──────────────────────────────────┬─────────────────────────────────────────────────┤
│ Category          │ Description / Item               │ Status / Detail                                 │
├───────────────────┼──────────────────────────────────┼─────────────────────────────────────────────────┤
│ Known Technology  │ Next.js, React (JavaScript)      │ High familiarity; rapid UI development.         │
│ Known Technology  │ Express.js, REST, Node.js        │ High familiarity; standard middleware stack.    │
│ Technology to Learn│ Supabase RLS & Auth Integration │ Medium learning curve; requires careful policy  │
│                   │                                  │ testing to avoid authorization bypasses.        │
│ Technology to Learn│ Local Gemma 4 Runtime Adapter    │ Medium learning curve; requires testing local   │
│                   │ (Ollama / llama.cpp / HTTP pipe) │ HTTP endpoint and constrained JSON prompts.     │
├───────────────────┼──────────────────────────────────┼─────────────────────────────────────────────────┤
│ Working Assumption│ GPU Availability                 │ Assume developer has 8GB+ VRAM or multi-core    │
│                   │                                  │ CPU for quantized 4-bit Gemma 4 execution.      │
│ Working Assumption│ Multimodal Image Capability      │ Unconfirmed. Image upload is optional in MVP;   │
│                   │                                  │ text input is the guaranteed primary path.      │
│ Working Assumption│ Supabase Cloud Dependency        │ Acknowledged. Cloud Supabase does not work      │
│                   │                                  │ offline; local fallback persistence is required.│
├───────────────────┼──────────────────────────────────┼─────────────────────────────────────────────────┤
│ Time Constraint   │ Limited Development Schedule     │ Prioritizes MVP core (P0/Must) over advanced    │
│                   │ (Kenshi, Samurai, Shogun)        │ features (PCB design, cloud sync, complex ICs). │
│ External Blocker  │ Official Program Calendar        │ Exact competition dates unconfirmed; relative   │
│                   │                                  │ timelines (Weeks 1–10) utilized.                │
└───────────────────┴──────────────────────────────────┴─────────────────────────────────────────────────┘
```
