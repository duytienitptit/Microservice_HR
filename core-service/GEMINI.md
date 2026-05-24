# Core Service

## Tech Stack

| | |
|---|---|
| **Runtime** | Node.js 20+ / TypeScript (strict mode) |
| **Framework** | Express.js |
| **ORM** | Prisma |
| **Database** | PostgreSQL (`core_db`) |
| **Test** | Jest + Supertest |
| **Logging** | Winston |
| **Port** | 3001 |

## Responsibilities

- User authentication & authorization (JWT access + refresh tokens)
- Job CRUD — HR creates/updates/deletes job postings, anyone browses
- Application lifecycle — candidate submits CV (PDF upload), system manages status transitions
- **Publishes:** `CV_UPLOADED_EVENT` after file upload
- **Consumes:** `CV_READY_EVENT` → updates application status to `READY_FOR_INTERVIEW`

## Database Tables

- `users` — email, password_hash, role (HR | CANDIDATE), full_name
- `jobs` — title, description, requirements, status (OPEN | CLOSED | DRAFT), hr_id
- `applications` — candidate_id, job_id, cv_file_path, status (state machine)

Schema source of truth: `prisma/schema.prisma`

## API Routes

All routes are prefixed with `/api` and routed through Nginx.

| Prefix | Module |
|---|---|
| `/api/auth/*` | Registration, login, token refresh |
| `/api/users/*` | Profile management |
| `/api/jobs/*` | Job CRUD |
| `/api/applications/*` | CV submission, status tracking |

## Key Rules

- Passwords MUST be hashed with bcrypt (min 10 rounds)
- JWT secret loaded from environment variable, never hardcoded
- accessToken expires in 15 minutes, refreshToken in 7 days
- Only PDF files accepted for CV upload, max 5MB
- Application status transitions follow the state machine — no skipping states
