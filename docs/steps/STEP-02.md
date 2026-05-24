# STEP 02 — Core Service: Application Module + RabbitMQ

## Trạng thái: ✅ DONE

## Mục tiêu
Triển khai module Application: HR upload CV cho ứng viên, hệ thống publish event tới RabbitMQ. Implement consumer để nhận kết quả từ RAG Service. Implement interview invitation flow với magic link.

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| PRD — Application & CV Upload | Acceptance criteria | [PRD.md](../PRD.md) § Feature: Application & CV Upload |
| PRD — Interview Invitation | Magic link flow | [PRD.md](../PRD.md) § Feature: Interview Invitation |
| PRD — US-5, US-6, US-7 | User stories chi tiết | [PRD.md](../PRD.md) § US-5, US-6, US-7 |
| System Design — §4.4 | API spec: /api/applications | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 4.4 |
| System Design — §5 Luồng 1 | CV Upload → Processing flow | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 5 Luồng 1 |
| System Design — §5 Luồng 4 | Interview Invitation flow | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 5 Luồng 4 |
| Event Contracts | CV_UPLOADED, CV_READY, SEND_EMAIL payloads | [event-contracts.md](../../.agents/rules/event-contracts.md) |
| Workflow — State Machine | Application status transitions | [workflow.md](../../.agents/rules/workflow.md) § Application Status |
| RabbitMQ Skill | Publisher/consumer patterns | [SKILL.md](../../.agents/skills/rabbitmq-integration/SKILL.md) |
| Prisma Schema | Application model | [schema.prisma](../../core-service/prisma/schema.prisma) |
| Code Standards | Response envelope, logging | [code-standards.md](../../.agents/rules/code-standards.md) |

## Prerequisite
- ✅ STEP-01 (Job CRUD) phải hoàn thành trước

## Tasks

### 2.1 — RabbitMQ Connection Manager
- [x] Tạo `src/events/connection.ts` — kết nối RabbitMQ với retry logic
- [x] Tạo exchange `cv.events` và `notification.events`
- [x] Setup graceful shutdown (close connection on SIGTERM)

### 2.2 — CV Upload + Publisher
- [x] Tạo `src/repositories/applicationRepository.ts`
  - `create(data)` — tạo application record
  - `findAll(filters, pagination)` — danh sách applications, filter theo jobId
  - `findById(id)` — tìm application
  - `updateStatus(id, status)` — chuyển trạng thái
  - `updateCandidateInfo(id, email, name)` — cập nhật từ CV extraction
  - `setMagicLinkToken(id, token)` — tạo magic link
- [x] Tạo `src/services/applicationService.ts`
  - `uploadCV(hrId, jobId, file, candidateName, candidateEmail)` — save file + create record + publish CV_UPLOADED
  - `getApplications(query)` — paginated list
  - `getApplicationById(id)` — detail
  - `updateStatus(id, status)` — manual status update
  - `sendInvite(hrId, applicationId)` — generate magic link + publish SEND_EMAIL (type: INVITE)
- [x] Tạo `src/events/publishers/cvPublisher.ts` — publish CV_UPLOADED_EVENT
- [x] Tạo `src/events/publishers/emailPublisher.ts` — publish SEND_EMAIL_EVENT (type: INVITE)

### 2.3 — CV_READY Consumer
- [x] Tạo `src/events/consumers/cvReadyConsumer.ts`
  - Consume từ queue `cv.ready`
  - Cập nhật application status: `READY_FOR_INTERVIEW` hoặc `CV_PARSE_FAILED`
  - Cập nhật candidate_email và candidate_name từ extracted data
  - Error handling + logging

### 2.4 — Controller + Routes
- [x] Tạo `src/controllers/applicationController.ts`
  - `POST /api/applications` — multipart/form-data (job_id + PDF + candidate_name + candidate_email)
  - `GET /api/applications` — HR only, paginated, filter by job
  - `GET /api/applications/:id` — HR only
  - `PATCH /api/applications/:id/status` — HR only
  - `POST /api/applications/:id/invite` — HR only, generate magic link
- [x] Tạo `src/routes/applications.ts`
- [x] Đăng ký route trong `src/app.ts`
- [x] Cài đặt `multer` cho file upload

### 2.5 — File Storage
- [x] Setup thư mục `/storage/cv/` cho file upload
- [x] Validate: chỉ PDF, max 5MB

### 2.6 — Unit Tests
- [x] Tạo `tests/unit/applicationService.test.ts`
  - Test upload CV flow (mock RabbitMQ publisher)
  - Test status transitions (valid + invalid)
  - Test send invite (check magic link generation)
  - Test CV_READY consumer handler

### 2.7 — Integration Tests
- [x] Tạo `tests/integration/applications.test.ts`
  - Test upload CV endpoint
  - Test list/detail endpoints
  - Test status update
  - Test invite endpoint

### 2.8 — Verify
- [x] Chạy toàn bộ test suite — tất cả pass (bao gồm auth + job tests)
- [x] Kiểm tra RabbitMQ publisher hoạt động (log output)

---

## Khi hoàn thành bước này
1. Đánh dấu tất cả tasks ở trên thành `[x]`
2. Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
3. Cập nhật [TASK.md](../TASK.md): STEP-02 → `✅ DONE`, STEP-03 → `🔄 NEXT`
