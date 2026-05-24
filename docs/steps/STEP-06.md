# STEP 06 — Assessment Service: Scoring + Email

## Trạng thái: ✅ DONE

## Mục tiêu
Xây dựng Assessment Service từ stub: nhận event INTERVIEW_COMPLETED, chấm điểm rule-based, lưu report vào MongoDB, gửi email thông báo cho HR. Đồng thời implement consumer cho SEND_EMAIL event (cả INVITE và REPORT types).

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| PRD — Assessment & Notification | Acceptance criteria | [PRD.md](../PRD.md) § Feature: Assessment & Notification |
| PRD — US-10, US-11 | User stories: End Interview, View Report | [PRD.md](../PRD.md) § US-10, US-11 |
| System Design — §3.4 | Assessment Service responsibilities + MongoDB schema | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 3.4 |
| System Design — §4.6 | Report API endpoints | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 4.6 |
| System Design — §5 Luồng 2 | Interview → Assessment → Notification flow | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 5 Luồng 2 |
| System Design — §6 | Error handling, retry policy | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 6 |
| Event Contracts | INTERVIEW_COMPLETED (consume) + SEND_EMAIL (consume + publish) | [event-contracts.md](../../.agents/rules/event-contracts.md) |
| Architecture | Assessment = Node.js :3004, MongoDB | [architecture.md](../../.agents/rules/architecture.md) |
| Code Standards | Node.js file structure, Winston, response envelope | [code-standards.md](../../.agents/rules/code-standards.md) |
| Assessment Service GEMINI | Service-specific context | [GEMINI.md](../../assessment-service/GEMINI.md) |
| RabbitMQ Skill | Consumer/publisher patterns (Node.js) | [SKILL.md](../../.agents/skills/rabbitmq-integration/SKILL.md) |

## Prerequisite
- ✅ STEP-05 (AI Service) phải hoàn thành — cần INTERVIEW_COMPLETED publisher hoạt động

## Tasks

### 6.1 — Project Setup
- [x] Cập nhật `package.json` — thêm: `mongoose`, `amqplib`, `nodemailer`, `jsonwebtoken`, `winston`, `helmet`, `uuid`, `dotenv`, `cors`
- [x] Cập nhật `tsconfig.json` — strict mode
- [x] Tạo cấu trúc thư mục:
  ```
  src/
  ├── index.ts           (cập nhật)
  ├── app.ts             (Express setup)
  ├── config/            (env vars)
  ├── models/            (Mongoose schemas)
  ├── controllers/       (HTTP handlers)
  ├── services/          (business logic)
  ├── events/            (RabbitMQ consumers + publishers)
  ├── scoring/           (rule-based scoring engine)
  ├── email/             (email templates + sender)
  ├── middlewares/       (auth, error handling, correlationId)
  ├── routes/            (route definitions)
  └── utils/             (logger, AppError)
  ```

### 6.2 — MongoDB Models (Mongoose)
- [x] Tạo `src/models/assessmentReport.ts`
  - Schema: application_id, session_id, scores {technical, communication, relevance, overall}, summary, strengths, weaknesses, recommendation, generated_at
- [x] Tạo `src/models/emailLog.ts`
  - Schema: type (INVITE/REPORT), recipient, subject, status (SENT/FAILED), sent_at, error

### 6.3 — Rule-Based Scoring Engine
- [x] Tạo `src/scoring/scorer.ts`
  - `scoreTechnical(chatHistory)` — keyword matching cho technical terms
  - `scoreCommunication(chatHistory)` — response length + clarity metrics
  - `scoreRelevance(chatHistory)` — relevance to questions asked
  - `calculateOverall(scores)` — weighted average
  - `generateSummary(scores, chatHistory)` — text summary
  - `identifyStrengths(scores)` — top scoring areas
  - `identifyWeaknesses(scores)` — bottom scoring areas
  - `makeRecommendation(overall)` — ADVANCE / CONSIDER / REJECT

### 6.4 — RabbitMQ Consumers
- [x] Tạo `src/events/connection.ts` — RabbitMQ connection manager
- [x] Tạo `src/events/consumers/interviewCompletedConsumer.ts`
  - Consume INTERVIEW_COMPLETED_EVENT
  - Trigger scoring → save report → update application status → publish SEND_EMAIL (type: REPORT)
- [x] Tạo `src/events/consumers/sendEmailConsumer.ts`
  - Consume SEND_EMAIL_EVENT
  - Phân biệt type: INVITE → gửi email mời / REPORT → gửi email kết quả
  - Log kết quả vào EmailLog collection

### 6.5 — RabbitMQ Publisher
- [x] Tạo `src/events/publishers/emailPublisher.ts`
  - Publish SEND_EMAIL_EVENT (type: REPORT)

### 6.6 — Email Service
- [x] Tạo `src/email/emailService.ts`
  - `sendInviteEmail(to, candidateName, jobTitle, magicLinkUrl)` — email template mời phỏng vấn
  - `sendReportEmail(to, candidateName, jobTitle, overallScore, reportUrl)` — email template báo cáo
  - Sử dụng Nodemailer (SMTP config từ env vars)

### 6.7 — Assessment Service Layer
- [x] Tạo `src/services/assessmentService.ts`
  - `processInterview(event)` — orchestrate: score → save → notify
  - `getReports(query)` — paginated list
  - `getReportByApplicationId(applicationId)` — single report

### 6.8 — HTTP Endpoints
- [x] Tạo `src/controllers/reportController.ts`
  - `GET /api/reports` — HR only, paginated
  - `GET /api/reports/:applicationId` — HR only, single report
- [x] Tạo `src/routes/reports.ts`
- [x] Tạo `src/middlewares/` — auth (JWT verification), error handler, correlationId
- [x] Cập nhật `src/app.ts` — Express setup (helmet, cors, routes, error handler)

### 6.9 — Unit Tests
- [x] Tạo `tests/unit/scorer.test.ts`
  - Test scoring engine với various chat histories
  - Test recommendation thresholds
- [x] Tạo `tests/unit/assessmentService.test.ts`
  - Test processInterview flow (mock MQ + DB)
  - Test getReports pagination

### 6.10 — Verify
- [x] Chạy test suite (`npm test`) — tất cả pass
- [x] Update Dockerfile nếu cần

---

## Khi hoàn thành bước này
1. Đánh dấu tất cả tasks ở trên thành `[x]`
2. Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
3. Cập nhật [TASK.md](../TASK.md): STEP-06 → `✅ DONE`, STEP-07 → `🔄 NEXT`
