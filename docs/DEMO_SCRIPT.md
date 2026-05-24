# AI HR Recruiter — Live Demonstration Script

This demo script provides a step-by-step guide for presenting the end-to-end recruitment flow of the **AI HR Recruiter** platform. It covers HR operations, automated candidate communication, the AI interview process, LLM-based assessment scoring, and infrastructure monitoring.

---

## 🛠 Preparation & Setup

Ensure all services are running and healthy:
```bash
# Verify all docker containers are healthy
docker compose ps
```

To run a clean demo, you can reset the databases:
```bash
# Optional: restart services with clean databases
docker compose down -v
docker compose up -d --build
```

---

## 🎬 Demo Scene 1: HR Job Creation & Candidate Upload

**Objective**: Show how HR creates a job description and uploads a candidate's resume, triggering the asynchronous document extraction process.

1. **HR Registration**:
   - Register a new HR account with email `hr_demo@example.com` and password `Password123!`.
   - Endpoint: `POST /api/auth/register` (or do this via the Web Client UI at `http://localhost`).

2. **HR Login**:
   - Log in using the registered credentials to receive the JWT Bearer token.
   - Endpoint: `POST /api/auth/login`.

3. **Create Job Posting**:
   - Create a new job posting for a **"Senior Backend Engineer"** with the following requirement keywords: `Python`, `FastAPI`, `RabbitMQ`, `PostgreSQL`, `Docker`.
   - Endpoint: `POST /api/jobs`.

4. **Upload Resume (CV)**:
   - Upload a PDF resume (e.g., `alice_smith_resume.pdf`).
   - Endpoint: `POST /api/applications` (multipart upload).
   - **Explain Asynchronous Pipeline**:
     - *Core Service* saves the PDF to storage and publishes `CV_UPLOADED` to RabbitMQ.
     - *RAG Service* consumes `CV_UPLOADED`, extracts the PDF text via `pdfplumber`, extracts metadata (Name: *Alice Smith*, Email: *alice.smith@example.com*), stores embeddings in *Qdrant*, and publishes `CV_READY`.
     - *Core Service* consumes `CV_READY` and transitions the application status to `READY_FOR_INTERVIEW`.

---

## 🎬 Demo Scene 2: Candidate Invitation

**Objective**: Demonstrate automated invite generation and dispatch.

1. **Check Application Status**:
   - Query the application list: `GET /api/applications?job_id={job_id}`.
   - Verify the status is now `READY_FOR_INTERVIEW` and the candidate's name/email have been automatically extracted from the CV.

2. **Send Interview Invite**:
   - Send the invite: `POST /api/applications/{application_id}/invite`.
   - **Explain Asynchronous Flow**:
     - Core Service transitions the status to `INVITED`, generates a UUID-based magic token, and publishes `SEND_EMAIL`.
     - *Assessment Service* consumes `SEND_EMAIL` and sends a mock SMTP invitation email containing the candidate magic link: `http://localhost/interview/{magic_token}`.

---

## 🎬 Demo Scene 3: AI Candidate Interview

**Objective**: Walk through the candidate interview conducted by the AI agent, illustrating conversational state transitions.

1. **Access Magic Link**:
   - Access the magic link endpoint: `GET /interview/{magic_token}`.
   - Behind the scenes: The candidate session is registered, the status advances to `INTERVIEWING`, and the AI greets the candidate.

2. **Conduct the Chat Session**:
   - Submit messages to `POST /api/interviews/{session_id}/chat` representing different interview stages:
     - **Greeting / Intro**: Confirm readiness.
     - **Experience Review**: Share experience (e.g., *"I have 5 years experience scaling microservices with FastAPI and RabbitMQ"*).
     - **Technical QA**: Discuss databases or systems.
     - **Situational QA**: Answer behavioral scenarios.
     - **Outro**: Close the interview.
   - **Explain LangGraph Agent**:
     - The AI Service utilizes a *LangGraph* state machine to orchestrate the interview state.
     - It queries the *RAG Service* to inject CV details and job requirements dynamically, tailoring questions to the candidate's actual background.

3. **End the Interview**:
   - Complete the outro or manually call `POST /api/interviews/{session_id}/end`.
   - AI Service transitions the session to `COMPLETED` and publishes `INTERVIEW_COMPLETED`.

---

## 🎬 Demo Scene 4: Assessment, Scoring, & HR Report

**Objective**: Show how the system scores the interview, generates reports, and displays the details to HR.

1. **Explain LLM Evaluation**:
   - The *Assessment Service* consumes `INTERVIEW_COMPLETED`.
   - It sends the full transcript, resume, and JD to the Gemini model to grade the candidate on:
     - *Technical capability* (weight: 40%)
     - *Communication skills* (weight: 30%)
     - *Role relevance* (weight: 30%)
   - Gemini returns structured JSON containing scores, reasoning, strengths, weaknesses, overall recommendation, and precise citations (quotes matched to dimensions/stages).

2. **Retrieve Report (HR Portal)**:
   - HR logs back in and calls: `GET /api/reports/{application_id}`.
   - Display the detailed score card (e.g., Overall Score: *83/100*), summary of findings, recommendation (e.g., *ADVANCE_TO_NEXT_ROUND*), and citations proving why the score was given.

---

## 🎬 Demo Scene 5: Reliability & Infrastructure Monitoring

**Objective**: Verify the system's observability and resilience.

1. **Prometheus Metrics**:
   - Access Prometheus at `http://localhost:9090`.
   - Query metrics like `http_requests_total` or service-specific performance counters.

2. **Loki Logs (via Grafana)**:
   - Access Grafana at `http://localhost:3000` (default login: `admin` / `admin`).
   - Navigate to the **Explore** tab, select the **Loki** data source, and query `{service="core-service"}` or `{level="error"}` to see structured, centralized JSON logs.

3. **Dead Letter Queue (DLQ) & Circuit Breaker**:
   - Show that if the RAG service goes offline, the AI service circuit breaker trips (logs show `pybreaker.CircuitOpenError`) and falls back to static question flows without crashing the chat.
