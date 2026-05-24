# PRD — AI HR Recruiter

## Project Goal
Build an AI-powered, HR-centric internal recruitment tool that automates first-round candidate interviews using microservice architecture. HR users upload candidate CVs, trigger interview invitations via magic links, and receive scored assessment reports — candidates never create accounts.

## Technical Requirements
- [ ] 4 microservices communicating via RESTful API
- [ ] Async event-driven processing via RabbitMQ
- [ ] Docker Compose to orchestrate the entire system
- [ ] Unit tests for each service
- [ ] Structured logging across all services
- [ ] Error handling with retry mechanism and dead letter queue

---

## Scope Definition

### Phase 1 — MUST HAVE (submission deadline)

#### Feature: HR Authentication
- Only HR users can register with email/password
- Login returns JWT access token + refresh token
- Protected routes require valid JWT
- Candidates do NOT have accounts
- **Acceptance:** POST `/api/auth/register` → 201 (HR only), POST `/api/auth/login` → 200 with tokens

#### Feature: Job Management (HR only)
- HR creates job postings with title, description, requirements
- Anyone can browse open jobs (paginated)
- HR can update/delete their own jobs
- **Acceptance:** Full CRUD on `/api/jobs`, only owner can modify

#### Feature: Application & CV Upload (HR uploads on behalf of candidate)
- HR uploads a candidate's PDF CV for a specific job, providing candidate name and email
- System stores file and publishes `CV_UPLOADED_EVENT` to RabbitMQ
- RAG Service consumes event, extracts raw text from PDF, and extracts candidate email from CV content
- RAG Service publishes `CV_READY_EVENT` with extracted data, Core Service updates status
- **Acceptance:** Upload PDF → status transitions from `SUBMITTED` → `CV_PROCESSING` → `READY_FOR_INTERVIEW`

#### Feature: Interview Invitation (HR triggers)
- HR reviews parsed CVs and clicks 'Send Interview Invite' for applications in `READY_FOR_INTERVIEW` status
- System generates a unique magic link token tied to one Application
- System sends email to candidate with the magic link
- Application status transitions to `INVITED`
- **Acceptance:** POST `/api/applications/:id/invite` → 200, email sent, status becomes `INVITED`

#### Feature: Interview Session (Candidate via Magic Link)
- Candidate accesses interview via magic link — no login or account required
- Magic link contains a unique token that authenticates the candidate for that specific application
- AI Service creates session and returns stage-based questions (STATIC/TEMPLATE)
- Candidate sends messages, AI responds with next template question
- Session progresses through: `GREETING → EXPERIENCE_REVIEW → TECHNICAL_QUESTIONS → SCENARIO_QUESTIONS → CLOSING`
- When session ends, AI Service publishes `INTERVIEW_COMPLETED_EVENT` and the magic link becomes invalid
- If the candidate drops off mid-interview, the same magic link can be re-used to resume the session
- **Acceptance:** Full chat flow via `/api/interviews` endpoints. Auth via magic link token. Chat history is persisted.

#### Feature: Assessment & Notification
- Assessment Service consumes `INTERVIEW_COMPLETED_EVENT`
- Scores candidate using RULE-BASED logic (keyword matching, response length)
- Generates assessment report stored in MongoDB
- Sends email notification to HR
- **Acceptance:** Report appears in `/api/reports/:applicationId` with scores and recommendation

#### Feature: Infrastructure
- Docker Compose runs all services + databases + RabbitMQ
- API Gateway (Nginx) routes to correct service
- Health checks on every service
- Structured JSON logging with correlation ID
- Error handling: retry with exponential backoff, dead letter queues
- **Acceptance:** `docker compose up` starts entire system. All services healthy.

### Phase 1 — NOT NEEDED (do NOT build in Phase 1)
- LLM/AI integration (no OpenAI, no LangChain, no Gemini)
- Vector embeddings or semantic search
- Real-time WebSocket chat
- Social login (Google, GitHub)
- Payment or billing
- File storage service (use local filesystem)
- CI/CD pipeline
- Kubernetes deployment
- Rate limiting on API Gateway (nice-to-have, not required)

---

### Phase 1.5 — Frontend UI (after Phase 1 backend is functional)

#### Feature: Web Client Setup + Auth UI
- Vite + React (TypeScript) project at `web-client/`
- Design system with shared components, theme, and typography
- Login/Register pages for HR users
- Protected routes with JWT token management
- **Acceptance:** HR can register, login, and see a dashboard shell

#### Feature: HR Dashboard
- Job listing page with create/edit/delete functionality
- Application management: view uploaded CVs, statuses, trigger interview invitations
- Paginated tables with search and filter
- **Acceptance:** HR can manage jobs and applications entirely through the web UI

#### Feature: Candidate Interview UI + Reports
- Magic link landing page for candidates
- Chat-based interview interface
- Assessment report viewer for HR
- **Acceptance:** Full interview flow works through the browser; HR can view scored reports

---

### Phase 2 — AI Integration (replace mock logic with real AI)

#### Feature: Embedding Pipeline + Vector Search
- RAG Service generates embeddings from extracted CV text
- Store vectors in Qdrant for semantic search
- Provide context-relevant CV chunks to AI Service during interviews
- **Acceptance:** Embedding pipeline runs on `CV_READY_EVENT`; vector search returns relevant chunks

#### Feature: LangGraph State Machine + LLM Questions
- AI Service uses LangGraph to manage interview conversation flow
- LLM generates dynamic, context-aware interview questions based on CV and JD
- Replaces static template questions from Phase 1
- **Acceptance:** Interview questions are dynamically generated and contextually relevant

#### Feature: LLM-Based Scoring
- Assessment Service uses LLM to evaluate candidate responses
- Generates detailed reasoning for scores across multiple dimensions
- Replaces rule-based keyword matching from Phase 1
- **Acceptance:** Assessment reports include LLM-generated analysis and reasoning

---

### Phase 3 — Production Polish

#### Feature: Security + Performance
- API rate limiting on Nginx gateway
- Input validation hardening across all services
- Database query optimization and indexing
- **Acceptance:** No critical security vulnerabilities; API response times under 500ms at load

#### Feature: Monitoring + Observability
- Prometheus metrics collection from all services
- Grafana dashboards for system health and business metrics
- Loki for centralized log aggregation
- Added to docker-compose as infrastructure services
- **Acceptance:** `docker compose up` includes monitoring stack; dashboards show live data

#### Feature: Full E2E Regression + Documentation
- End-to-end test suite covering the complete candidate journey
- API documentation (OpenAPI/Swagger) for all services
- Demo script and video walkthrough
- **Acceptance:** All E2E tests pass; documentation is complete and accurate

---

## User Stories

### US-1: HR Registration
**As** an HR manager
**I want to** create an account with my email
**So that** I can post job descriptions, upload candidate CVs, and receive assessment reports

**Acceptance Criteria:**
- POST `/api/auth/register` with `{ email, password, full_name }` → 201
- Role is always `HR` (no role selection needed)
- Duplicate email → 409 Conflict
- Password is hashed (bcrypt)
- Candidate registration is not supported

### US-2: HR Login
**As** an HR manager
**I want to** log in with my credentials
**So that** I can manage jobs, upload CVs, and send interview invitations

**Acceptance Criteria:**
- POST `/api/auth/login` with `{ email, password }` → 200 with `{ accessToken, refreshToken }`
- Only HR users can log in
- Wrong password → 401 Unauthorized
- accessToken expires in 15 minutes, refreshToken in 7 days

### US-3: Post Job Description
**As** HR
**I want to** create a job posting
**So that** I can receive candidate applications for this position

**Acceptance Criteria:**
- POST `/api/jobs` with `{ title, description, requirements }` → 201
- Job `status` defaults to `OPEN`
- Only authenticated HR users can create jobs

### US-4: Browse Jobs
**As** an HR manager
**I want to** see available job openings
**So that** I can select the right job when uploading a candidate's CV

**Acceptance Criteria:**
- GET `/api/jobs?page=1&limit=10` → 200 with paginated list
- Only `OPEN` jobs are returned
- No authentication required

### US-5: Upload CV on Behalf of Candidate
**As** HR
**I want to** upload a candidate's CV (PDF) for a specific job
**So that** the candidate can be considered for the position

**Acceptance Criteria:**
- POST `/api/applications` with multipart form (`job_id` + `candidate_name` + `candidate_email` + PDF file) → 201
- Only authenticated HR users can upload
- Application status: `SUBMITTED` → `CV_PROCESSING` (immediately)
- `CV_UPLOADED_EVENT` published to RabbitMQ
- Only PDF files accepted, max 5MB
- Same candidate email applying to different jobs creates separate, independent applications

### US-6: CV Processing
**As** the system
**I want to** extract text from uploaded CVs automatically
**So that** the interview can reference CV content

**Acceptance Criteria:**
- RAG Service receives `CV_UPLOADED_EVENT`
- Extracts text from PDF (Phase 1: raw text only)
- Extracts candidate email from CV content and returns it in the event payload
- Publishes `CV_READY_EVENT` with status `success` or `failed` and extracted data
- Core Service updates application status to `READY_FOR_INTERVIEW` or `CV_PARSE_FAILED`

### US-7: Send Interview Invitation
**As** HR
**I want to** send an interview invitation to a candidate
**So that** the candidate can access the AI interview without creating an account

**Acceptance Criteria:**
- POST `/api/applications/:id/invite` → 200
- Application must be in `READY_FOR_INTERVIEW` status
- System generates a unique magic link token tied to this application
- System sends email to candidate's email with the magic link URL
- Application status transitions to `INVITED`
- Only authenticated HR users can trigger invitations
- Magic link token is stored securely and has no expiration until interview is completed

### US-8: Start Interview via Magic Link
**As** a candidate
**I want to** begin an AI interview session using the magic link I received
**So that** I can be evaluated for the position without creating an account

**Acceptance Criteria:**
- GET `/api/interviews/magic/:token` validates the token and returns application context
- POST `/api/interviews/start` with `{ token }` → 201
- Application must be in `INVITED` status (or `IN_INTERVIEW` for session resume)
- No JWT or login required — magic link token is the sole authentication
- Returns first greeting message from AI
- Session status: `PENDING` → `IN_PROGRESS`
- If candidate already has an in-progress session, the existing session is resumed

### US-9: Chat During Interview
**As** a candidate
**I want to** answer interview questions
**So that** I can demonstrate my qualifications

**Acceptance Criteria:**
- POST `/api/interviews/:sessionId/chat` with `{ message, token }` → 200 with AI response
- Auth via magic link token — no JWT required
- AI returns stage-appropriate template questions (Phase 1)
- Chat history is persisted in database
- Session progresses through 5 stages automatically

### US-10: End Interview & Receive Assessment
**As** a candidate
**I want to** finish my interview
**So that** I receive an evaluation

**Acceptance Criteria:**
- POST `/api/interviews/:sessionId/end` with `{ token }` → 200
- Auth via magic link token — no JWT required
- Magic link token becomes invalid immediately after interview completion
- `INTERVIEW_COMPLETED_EVENT` published with full chat history
- Assessment Service creates scored report
- HR receives email notification with report link
- Attempting to use the magic link after completion returns 410 Gone

### US-11: View Assessment Report
**As** HR
**I want to** view the AI-generated assessment report
**So that** I can decide whether to advance the candidate

**Acceptance Criteria:**
- GET `/api/reports/:applicationId` → 200 with scores, summary, strengths, weaknesses, recommendation
- Only authenticated HR users can access reports

---

## Application Status State Machine

```
SUBMITTED → CV_PROCESSING → READY_FOR_INTERVIEW → INVITED → IN_INTERVIEW → COMPLETED → ARCHIVED
                          ↘ CV_PARSE_FAILED
```

Each transition is triggered by a specific event or API call. Do NOT allow skipping states.

---

## Non-Functional Requirements
- All services must start within 60 seconds via `docker compose up`
- Each API endpoint must respond within 2 seconds under normal load
- All services must gracefully handle RabbitMQ connection loss (reconnect with backoff)
- Passwords must be hashed with bcrypt (min 10 rounds)
- JWT secret must be loaded from environment variable, never hardcoded
