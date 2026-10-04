# CircuitSage AI — REST API Specification

**Document Version:** 2.0.0  
**Status:** Proposed / In Review  
**API Prefix:** `/api/v1`  
**Base URL (Local Development):** `http://127.0.0.1:8000/api/v1`  
**Author:** Software Architecture & Backend Engineering Team  
**Last Updated:** 2026-10-04  

---

## 1. Overview and Architecture Principles

The CircuitSage AI REST API is built on **Node.js and Express.js**. It provides a structured communication interface between the Next.js frontend, the local Gemma 4 inference engine, the deterministic rules engine, and Supabase Postgres persistence.

### Core API Principles
1. **Predictable Epistemic Typing:** Responses strictly classify data into `VERIFIED_FACT`, `AI_INFERENCE`, or `UNKNOWN`.
2. **Strict Identity Derivation:** User identities are extracted exclusively from validated Supabase JWT access tokens. User IDs provided in request bodies are ignored or validated against the authenticated token.
3. **Safe Error Envelopes:** Error responses use a standardized JSON structure that never leaks internal stack traces, system file paths, or database credentials.
4. **Localhost Boundary:** The server binds to `127.0.0.1` by default, safeguarding local development and testing from unauthenticated local network traffic.

---

## 2. Authentication & Authorization Strategy

### 2.1 Supabase Auth Bearer Token Flow
1. The frontend authenticates through Supabase Auth (e.g., email/password or magic link).
2. Supabase issues a cryptographically signed JWT access token.
3. The frontend includes this token in the `Authorization` header for all protected API requests:
   ```http
   Authorization: Bearer <supabase_access_token>
   ```
4. Express middleware (`middleware/auth.js`) intercepts the token and validates it via the Supabase client:
   ```javascript
   const token = req.headers.authorization?.split(' ')[1];
   const { data: { user }, error } = await supabase.auth.getUser(token);
   if (error || !user) {
     return res.status(401).json({
       error: { code: 'UNAUTHORIZED', message: 'Valid Supabase access token required.', details: [], requestId: req.id }
     });
   }
   req.user = user; // Attach authenticated user identity
   ```

### 2.2 Resource Ownership & Guest Access
* **Protected Routes:** Endpoints accessing user-owned resources verify that `diagnostic_cases.user_id === req.user.id`. Supabase Row Level Security (RLS) acts as a secondary database-level enforcement layer.
* **Offline / Guest Mode:** For local offline usage where Supabase Auth is unreachable, the API supports a `Guest Mode` flagged via local application configuration. In Guest Mode, requests are assigned an ephemeral local session identifier.

---

## 3. Standardized Error Response Format

All 4xx and 5xx responses conform to a uniform JSON error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid input.",
    "details": [
      {
        "field": "symptom_description",
        "issue": "Description must be at least 10 characters long."
      }
    ],
    "requestId": "req_01j9a3b4c5"
  }
}
```

### 3.1 Standard Error Codes Table

| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | 422 Unprocessable Entity | Request body, query parameters, or file uploads failed schema validation. |
| `UNAUTHORIZED` | 401 Unauthorized | Missing, expired, or cryptographically invalid Supabase access token. |
| `FORBIDDEN` | 403 Forbidden | Authenticated user lacks permission to access or mutate the requested resource. |
| `RESOURCE_NOT_FOUND` | 404 Not Found | Requested case, measurement, or component ID does not exist in the database. |
| `RATE_LIMITED` | 429 Too Many Requests | Client exceeded local request or inference concurrency limits. |
| `MODEL_UNAVAILABLE` | 503 Service Unavailable | Local Gemma 4 inference runtime is offline, busy, or unreachable. |
| `RETRIEVAL_FAILURE` | 500 Internal Server Error | Knowledge retrieval service failed to query component specifications. |
| `DATABASE_ERROR` | 500 Internal Server Error | Supabase Postgres query failed or connection timed out. |
| `INTERNAL_SERVER_ERROR` | 500 Internal Server Error | Unexpected internal server exception. |

---

## 4. Endpoints Summary Table

| Method | Route | Authentication | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | None | Returns server health, local Gemma 4 runtime status, and database connectivity. |
| `POST` | `/api/v1/diagnoses` | Optional / Bearer Token | Creates a new diagnostic case with symptoms, board model, and optional circuit photo. |
| `GET` | `/api/v1/diagnoses` | Required (Bearer Token) | Lists past diagnostic cases belonging to the authenticated user. |
| `GET` | `/api/v1/diagnoses/:id` | Optional / Bearer Token | Retrieves full diagnostic state, hypotheses, measurements, and messages for a case. |
| `POST` | `/api/v1/diagnoses/:id/messages` | Optional / Bearer Token | Appends a follow-up symptom, clarification, or observation to an active case. |
| `POST` | `/api/v1/diagnoses/:id/measurements` | Optional / Bearer Token | Submits a physical multimeter measurement (voltage, resistance) to update hypotheses. |
| `GET` | `/api/v1/knowledge/search` | None | Queries the curated electronics knowledge base for component specs and pinouts. |
| `POST` | `/api/v1/feedback` | Optional / Bearer Token | Submits usability ratings and validation outcome for the Shogun 25-user evaluation. |

---

## 5. Detailed Endpoint Specifications

### 5.1 `GET /api/v1/health`
Checks server vitality, local Gemma 4 inference adapter readiness, and database connectivity.

* **Method:** `GET`
* **Route:** `/api/v1/health`
* **Authentication:** None
* **Success Response (200 OK):**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "environment": "development",
  "services": {
    "express": "up",
    "local_ai_inference": {
      "status": "ready",
      "runtime": "local_gemma4_adapter",
      "model_loaded": true
    },
    "database": {
      "status": "connected",
      "provider": "supabase_postgres"
    }
  },
  "offline_mode_ready": true
}
```
* **Error Response (503 Service Unavailable):**
```json
{
  "error": {
    "code": "MODEL_UNAVAILABLE",
    "message": "Local Gemma 4 inference runtime is not reachable at 127.0.0.1:11434.",
    "details": [],
    "requestId": "req_01h8x901"
  }
}
```

---

### 5.2 `POST /api/v1/diagnoses`
Creates a new diagnostic case. Handles multipart/form-data to support text inputs and an optional circuit photograph.

* **Method:** `POST`
* **Route:** `/api/v1/diagnoses`
* **Authentication:** Optional (authenticated if Bearer token present, otherwise guest session).
* **Content-Type:** `multipart/form-data`
* **Validation Rules:**
  * `target_board` (string, required): Supported board (`"ESP32 DevKit v1"`, `"Arduino Uno R3"`, `"Raspberry Pi Pico"`).
  * `symptom_description` (string, required): Minimum 10 characters, maximum 2000 characters.
  * `connected_components` (JSON array of strings, optional): e.g., `["LED", "Resistor", "SSD1306"]`.
  * `pin_connections` (JSON array of objects, optional): Specific pin designations.
  * `image` (binary file, optional): JPEG, PNG, or WebP; maximum 10 MB.
* **Success Response (201 Created):**
```json
{
  "case": {
    "id": "c7a8b9d0-1234-5678-90ab-cdef12345678",
    "status": "ACTIVE",
    "target_board": "ESP32 DevKit v1",
    "symptom_description": "Blue LED connected to GPIO 18 never turns on.",
    "image_url": "/uploads/c7a8b9d0.jpg",
    "created_at": "2026-10-04T11:15:00.000Z"
  },
  "epistemic_summary": {
    "verified_facts_count": 2,
    "ai_inferences_count": 2,
    "unknown_assumptions_count": 1
  },
  "deterministic_checks": [
    {
      "check_id": "chk_led_resistor",
      "rule": "LED Series Resistor Protection Check",
      "result": "UNKNOWN",
      "message": "Resistor value is unknown. If resistor < 68 ohms, ESP32 GPIO 18 will exceed 40mA max rating.",
      "critical": true
    }
  ],
  "hypotheses": [
    {
      "id": "hyp_01",
      "title": "Reverse Polarity on Blue LED",
      "category": "WIRING_POLARITY",
      "epistemic_status": "AI_INFERENCE",
      "confidence_score": 0.70,
      "explanation": "Blue LED cathode (flat edge) appears connected to GPIO 18 instead of ground.",
      "recommended_test": {
        "test_id": "test_gpio18_voltage",
        "tool": "DIGITAL_MULTIMETER",
        "mode": "DC_VOLTS_20V",
        "instructions": "Place RED probe on ESP32 GPIO 18 and BLACK probe on GND rail while program runs.",
        "expected_value_description": "Should read ~3.3V if GPIO 18 is driven HIGH in firmware."
      }
    }
  ]
}
```

---

### 5.3 `GET /api/v1/diagnoses`
Retrieves a paginated list of past diagnostic cases for the authenticated user.

* **Method:** `GET`
* **Route:** `/api/v1/diagnoses`
* **Authentication:** Required (`Authorization: Bearer <token>`)
* **Query Parameters:**
  * `limit` (integer, optional, default: 10, max: 50).
  * `offset` (integer, optional, default: 0).
  * `status` (string, optional: `'ACTIVE'`, `'RESOLVED'`, `'ABORTED'`).
* **Success Response (200 OK):**
```json
{
  "total": 3,
  "cases": [
    {
      "id": "c7a8b9d0-1234-5678-90ab-cdef12345678",
      "title": "ESP32 Blue LED Failure",
      "target_board": "ESP32 DevKit v1",
      "status": "ACTIVE",
      "created_at": "2026-10-04T11:15:00.000Z"
    }
  ]
}
```

---

### 5.4 `GET /api/v1/diagnoses/:id`
Retrieves the full diagnostic state for a specific case.

* **Method:** `GET`
* **Route:** `/api/v1/diagnoses/:id`
* **Authentication:** Optional (enforces ownership if case belongs to an authenticated user).
* **Path Parameters:**
  * `id` (UUID, required): The diagnostic case ID.
* **Success Response (200 OK):** Returns complete case object, message thread, active hypotheses, and measurement log.
* **Error Response (404 Not Found):**
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Diagnostic case c7a8b9d0-0000-0000-0000-cdef12345678 not found.",
    "details": [],
    "requestId": "req_01j9a3b4c7"
  }
}
```

---

### 5.5 `POST /api/v1/diagnoses/:id/messages`
Appends a user message or observation to the ongoing diagnostic session.

* **Method:** `POST`
* **Route:** `/api/v1/diagnoses/:id/messages`
* **Authentication:** Optional / User-matched.
* **Request Body:**
```json
{
  "message_text": "I noticed the ESP32 chip gets slightly warm after 30 seconds."
}
```
* **Success Response (201 Created):**
```json
{
  "message_id": "msg_01j9a3b4c9",
  "case_id": "c7a8b9d0-1234-5678-90ab-cdef12345678",
  "sender": "USER",
  "message_text": "I noticed the ESP32 chip gets slightly warm after 30 seconds.",
  "created_at": "2026-10-04T11:20:00.000Z"
}
```

---

### 5.6 `POST /api/v1/diagnoses/:id/measurements`
Submits a physical multimeter measurement to test hypotheses and trigger deterministic re-evaluation.

* **Method:** `POST`
* **Route:** `/api/v1/diagnoses/:id/measurements`
* **Authentication:** Optional / User-matched.
* **Request Body Schema:**
```json
{
  "test_id": "test_gpio18_voltage",
  "measurement_type": "VOLTAGE_DC",
  "numeric_value": 3.28,
  "unit": "V",
  "probe_positive": "ESP32_GPIO18",
  "probe_negative": "BREADBOARD_GND",
  "notes": "Multimeter set to 20V DC range."
}
```
* **Success Response (200 OK):**
```json
{
  "measurement": {
    "id": "meas_01j9a3b4d1",
    "case_id": "c7a8b9d0-1234-5678-90ab-cdef12345678",
    "numeric_value": 3.28,
    "unit": "V"
  },
  "deterministic_evaluation": {
    "rule": "GPIO Pin High Output Drive Verification",
    "status": "VERIFIED_PASS",
    "message": "Measured 3.28V is within valid 3.0V - 3.3V logic high range."
  },
  "eliminated_hypotheses": [
    {
      "id": "hyp_03",
      "title": "Firmware Pin Drive Failure",
      "elimination_reason": "Verified measurement of 3.28V confirms pin is actively driven HIGH."
    }
  ],
  "updated_hypotheses": [
    {
      "id": "hyp_01",
      "title": "Reverse Polarity on Blue LED",
      "epistemic_status": "AI_INFERENCE",
      "confidence_score": 0.92,
      "recommended_next_action": "Measure voltage directly across LED legs to confirm polarity."
    }
  ]
}
```

---

### 5.7 `GET /api/v1/knowledge/search`
Queries curated component specifications, pinout constraints, and operating limits.

* **Method:** `GET`
* **Route:** `/api/v1/knowledge/search`
* **Authentication:** None
* **Query Parameters:**
  * `query` (string, required): Component keyword (e.g., `"ESP32"`, `"SSD1306"`, `"2N2222"`).
  * `category` (string, optional: `'MICROCONTROLLER'`, `'SENSOR'`, `'PASSIVE'`, `'SEMICONDUCTOR'`).
* **Success Response (200 OK):**
```json
{
  "count": 1,
  "results": [
    {
      "id": "comp_esp32_devkit_v1",
      "name": "ESP32 DevKit v1",
      "category": "MICROCONTROLLER",
      "operating_voltage_min": 3.0,
      "operating_voltage_max": 3.6,
      "max_pin_current_ma": 40.0,
      "known_pitfalls": [
        "GPIOs are NOT 5V tolerant.",
        "Strapping pins (GPIO 0, 2, 12, 15) must have specific logic levels at boot."
      ],
      "source_document": "Espressif ESP32 Series Datasheet v4.3"
    }
  ]
}
```

---

### 5.8 `POST /api/v1/feedback`
Submits user evaluation feedback for Shogun milestone testing.

* **Method:** `POST`
* **Route:** `/api/v1/feedback`
* **Authentication:** Optional
* **Request Body:**
```json
{
  "case_id": "c7a8b9d0-1234-5678-90ab-cdef12345678",
  "usefulness_rating": 5,
  "fault_resolved": true,
  "comments": "The multimeter probing step caught my reversed LED immediately."
}
```
* **Success Response (201 Created):**
```json
{
  "feedback_id": "fb_01j9a3b4e5",
  "status": "recorded"
}
```
