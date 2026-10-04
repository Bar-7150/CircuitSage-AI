# CircuitSage AI — Supabase Database, Auth & RLS Guide

**Document Version:** 1.0.0  
**Status:** Implementation Ready  
**Target Stack:** Supabase Postgres, Supabase Auth, Row Level Security (RLS)  
**Author:** Backend Architecture & Security Engineering Team  
**Last Updated:** 2026-10-04  

---

## 1. Overview & Architectural Boundaries

CircuitSage AI integrates **Supabase** for user authentication and relational data persistence (diagnostic cases, hypotheses, measurements, and feedback).

### 1.1 Critical Security & Offline Principles
1. **Zero Service-Role Browser Exposure:** The privileged `SUPABASE_SERVICE_ROLE_KEY` is restricted strictly to backend server administration and migrations. **It is NEVER exposed in the frontend bundle or client-side code.**
2. **Strict Identity Derivation:** Express backend endpoints derive user identity exclusively from cryptographically verified Supabase JWT access tokens (`req.user.id`). User IDs provided in request bodies are ignored.
3. **Database-Level Protection (RLS):** Every table containing user data has Row Level Security enabled. Queries execute under the caller's JWT, guaranteeing that Postgres enforces data isolation even if an API route handler were compromised.
4. **Offline Boundary Transparency:** Cloud-hosted Supabase **requires an active internet connection**. When offline or air-gapped, the application gracefully operates in **Guest Mode** with local in-memory/file storage, ensuring local AI inference and deterministic calculations continue without network access.

---

## 2. Supabase Project Setup & Configuration

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and log in.
2. Click **New Project**, select your organization, name your project `circuitsage-ai`, and set a strong database password.
3. Choose a region close to your primary development environment.

### Step 2: Configure Authentication & Redirect URLs
In the Supabase Dashboard:
1. Navigate to **Authentication** $\rightarrow$ **URL Configuration**.
2. Set **Site URL** to:
   ```text
   http://localhost:3000
   ```
3. Under **Redirect URLs**, add:
   ```text
   http://localhost:3000
   http://localhost:3000/auth
   http://localhost:3000/diagnoses
   ```
4. Navigate to **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Email**:
   * Enable **Email** provider.
   * For local development convenience, you can optionally disable **Confirm email** to allow instant user logins during testing.

### Step 3: Retrieve Project API Credentials
In **Project Settings** $\rightarrow$ **API**:
1. Copy **Project URL** $\rightarrow$ `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`.
2. Copy **Project API keys** $\rightarrow$ `anon` / `public` key $\rightarrow$ `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Copy **Project API keys** $\rightarrow$ `service_role` secret $\rightarrow `SUPABASE_SERVICE_ROLE_KEY` (**BACKEND ONLY**).

---

## 3. Applying Database Migrations

The canonical migration file is located in the repository at:  
[`supabase/migrations/20261004000001_initial_schema.sql`](file:///c:/Users/sunet/Documents/CircuitSage_AI/supabase/migrations/20261004000001_initial_schema.sql)

### Option A: Using the Supabase Dashboard (Web Interface)
1. Open your project in the Supabase Dashboard.
2. Navigate to the **SQL Editor** tab on the left sidebar.
3. Click **New query**.
4. Open [`supabase/migrations/20261004000001_initial_schema.sql`](file:///c:/Users/sunet/Documents/CircuitSage_AI/supabase/migrations/20261004000001_initial_schema.sql), copy its entire contents, paste it into the SQL Editor, and click **Run**.
5. *(Optional Seed)* Open [`supabase/seed.sql`](file:///c:/Users/sunet/Documents/CircuitSage_AI/supabase/seed.sql), copy its contents, paste into SQL Editor, and click **Run** to seed curated hardware specifications (ESP32, Uno, Pico, LEDs, SSD1306).

### Option B: Using the Supabase CLI (Local Development)
```bash
# Link to your remote Supabase project
npx supabase link --project-ref your-project-ref

# Apply pending migrations
npx supabase db push

# Apply seed data
npx supabase db reset --linked
```

---

## 4. Database Schema Specification

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

| Table Name | Primary Key | Foreign Keys | RLS Policy Summary |
| :--- | :--- | :--- | :--- |
| `profiles` | `id` (UUID) | `auth.users(id)` | Users can only SELECT and UPDATE their own profile (`auth.uid() = id`). |
| `diagnostic_cases` | `id` (UUID) | `profiles(id)` | Strict isolation: Users can only SELECT, INSERT, UPDATE, DELETE cases where `user_id = auth.uid()`. |
| `case_messages` | `id` (UUID) | `diagnostic_cases(id)` | Read/write restricted to cases owned by the authenticated user (`diagnostic_cases.user_id = auth.uid()`). |
| `diagnostic_hypotheses` | `id` (UUID) | `diagnostic_cases(id)` | Read/write restricted to hypotheses linked to user-owned cases. |
| `measurements` | `id` (UUID) | `diagnostic_cases(id)` | Read/write restricted to measurements linked to user-owned cases. |
| `knowledge_sources` | `id` (TEXT) | None | Public read-only reference for all users (`SELECT true`). Writes restricted to service-role. |
| `diagnostic_feedback` | `id` (UUID) | `diagnostic_cases(id)`, `profiles(id)` | Users can submit and view feedback for their own diagnostic sessions. |

---

## 5. Row Level Security (RLS) Verification

RLS guarantees that User A cannot read or modify User B's diagnostic cases, even if User A knows the UUID of User B's case.

### Verifying RLS via SQL Query Test
In the Supabase SQL Editor, you can simulate user contexts using `auth.uid()`:

```sql
-- 1. Create two test cases for different users
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'user1@circuitsage.local'),
  ('22222222-2222-2222-2222-222222222222', 'user2@circuitsage.local')
ON CONFLICT (id) DO NOTHING;

-- 2. Simulate User 1 query:
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

-- User 1 should only see cases where user_id = '11111111-1111-1111-1111-111111111111'
SELECT * FROM public.diagnostic_cases;

-- Attempting to query User 2's case directly returns 0 rows (denied by RLS):
SELECT * FROM public.diagnostic_cases WHERE user_id = '22222222-2222-2222-2222-222222222222';
```

---

## 6. Environment Variable Configuration

Separate frontend-safe and backend-private variables carefully:

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

### Backend (`apps/api/.env`)
```env
PORT=8000
NODE_ENV=development
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:3000

# Backend Supabase Config
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key

# Local Gemma 4 AI Runtime
GEMMA_RUNTIME_URL=http://127.0.0.1:11434
GEMMA_MODEL_NAME=gemma4:latest
INFERENCE_TIMEOUT_MS=30000

LOCAL_DATA_DIR=./data
```

> [!CAUTION]
> **Security Rule:** Never prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_`. Committing secrets to git or exposing them to the browser compromises database security.

---

## 7. Offline Operating Mode & Graceful Degradation

If the application is launched without an active internet connection or with unconfigured Supabase credentials:
* **Automatic Fallback:** The backend flags `isConfigured = false` and stores sessions in a local fallback store.
* **Frontend Guest Mode:** The UI displays `○ Supabase Unconfigured (Guest Mode)` and allows troubleshooting cases to be created and diagnosed locally.
* **Zero Crashes:** All API routes return clean JSON responses instead of crashing or hanging on network timeouts.
