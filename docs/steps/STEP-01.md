# STEP 01 — Core Service: Job CRUD

## Trạng thái: ✅ DONE

## Mục tiêu
Chi tiết thông tin công việc, tạo, đọc, sửa, xóa (soft delete) job postings. Chỉ HR đã đăng nhập mới được tạo/sửa/xóa. Đọc danh sách jobs là public.

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| PRD — Job Management | Acceptance criteria cho Job CRUD | [PRD.md](../PRD.md) § Feature: Job Management |
| PRD — US-3, US-4 | User stories: Post Job, Browse Jobs | [PRD.md](../PRD.md) § US-3, US-4 |
| System Design — §4.3 | API spec: POST/GET/PUT/DELETE /api/jobs | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 4.3 |
| System Design — §3.1 | Core Service DB schema (jobs table) | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 3.1 |
| Prisma Schema | Existing Job model definition | [schema.prisma](../../core-service/prisma/schema.prisma) |
| Code Standards | Response envelope, file structure | [code-standards.md](../../.agents/rules/code-standards.md) |
| Architecture | Immutable constraints | [architecture.md](../../.agents/rules/architecture.md) |
| Core Service GEMINI | Service-specific context | [GEMINI.md](../../core-service/GEMINI.md) |
| Existing Auth code | Pattern reference (controller/service/repo/route) | [authController.ts](../../core-service/src/controllers/authController.ts) |

## Tasks

### 1.1 — Repository Layer
- [x] Tạo `src/repositories/jobRepository.ts`
  - `create(data)` — tạo job mới
  - `findAll(filters, pagination)` — danh sách jobs có phân trang, filter theo status
  - `findById(id)` — tìm job theo ID
  - `update(id, data)` — cập nhật job
  - `softDelete(id)` — soft delete (chuyển status → CLOSED)

### 1.2 — Service Layer
- [x] Tạo `src/services/jobService.ts`
  - `createJob(hrId, data)` — validate + gọi repo
  - `getJobs(query)` — chỉ trả về OPEN jobs cho public, phân trang
  - `getJobById(id)` — trả về job detail
  - `updateJob(hrId, jobId, data)` — check ownership trước khi sửa
  - `deleteJob(hrId, jobId)` — check ownership trước khi soft delete

### 1.3 — Controller Layer
- [x] Tạo `src/controllers/jobController.ts`
  - `POST /api/jobs` — requireRole('HR'), validate input
  - `GET /api/jobs` — public, accept `?page=&limit=&status=`
  - `GET /api/jobs/:id` — public
  - `PUT /api/jobs/:id` — requireRole('HR'), check owner
  - `DELETE /api/jobs/:id` — requireRole('HR'), check owner

### 1.4 — Route Registration
- [x] Tạo `src/routes/jobs.ts`
- [x] Đăng ký route trong `src/app.ts`

### 1.5 — Unit Tests
- [x] Tạo `tests/unit/jobService.test.ts`
  - Test tạo job thành công
  - Test lấy danh sách jobs (phân trang)
  - Test lấy job theo ID (tồn tại + không tồn tại)
  - Test cập nhật job (owner + non-owner)
  - Test soft delete (owner + non-owner)

### 1.6 — Integration Tests
- [x] Tạo `tests/integration/jobs.test.ts`
  - Test full CRUD flow qua HTTP
  - Test authorization (non-HR bị từ chối)
  - Test ownership check

### 1.7 — Verify
- [x] Chạy toàn bộ test suite (`npm test`) — tất cả pass
- [x] Kiểm tra auth tests cũ vẫn pass (regression)

---

## Khi hoàn thành bước này
1. Đánh dấu tất cả tasks ở trên thành `[x]`
2. Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
3. Cập nhật [TASK.md](../TASK.md): STEP-01 → `✅ DONE`, STEP-02 → `🔄 NEXT`
