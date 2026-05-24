# STEP 09 — Web Client: HR Dashboard — Jobs + Applications + Interview Invite

## Trạng thái: ✅ DONE

## Mục tiêu
Xây toàn bộ giao diện HR Dashboard: quản lý Jobs (CRUD), quản lý Applications (upload CV, xem danh sách, theo dõi trạng thái), và gửi interview invitation — tất cả kết nối API thật.

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| PRD — Job Management | Acceptance criteria Job CRUD | [PRD.md](../PRD.md) § Feature: Job Management |
| PRD — Application & CV Upload | Upload flow, status transitions | [PRD.md](../PRD.md) § Feature: Application & CV Upload |
| PRD — Interview Invitation | Magic link flow | [PRD.md](../PRD.md) § Feature: Interview Invitation |
| PRD — US-3, US-4, US-5, US-7 | User stories chi tiết | [PRD.md](../PRD.md) § US-3, US-4, US-5, US-7 |
| System Design — §4.3 | API spec: /api/jobs | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 4.3 |
| System Design — §4.4 | API spec: /api/applications | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 4.4 |
| STEP-08 | Design system + auth đã setup | [STEP-08.md](STEP-08.md) |

## Prerequisite
- ✅ STEP-08 (Web Client Setup + Auth) phải hoàn thành trước

## Tasks

### 9.1 — API Service Layer
- [x] Tạo `src/services/jobService.ts`
  - `getJobs(page, limit, status)` → paginated list
  - `getJobById(id)` → job detail
  - `createJob(data)` → create
  - `updateJob(id, data)` → update
  - `deleteJob(id)` → soft delete
- [x] Tạo `src/services/applicationService.ts`
  - `getApplications(page, limit, jobId)` → paginated list
  - `getApplicationById(id)` → detail
  - `uploadCV(jobId, file, candidateName, candidateEmail)` → multipart upload
  - `sendInvite(id)` → trigger interview invite

### 9.2 — Dashboard Home Page
- [x] Tạo `src/pages/DashboardPage.tsx`
  - Overview cards: tổng số Jobs, Applications, Interviews, Reports
  - Recent applications list (5 gần nhất)
  - Quick actions: "Create Job", "Upload CV"
  - Stats hoặc mini charts (nếu có data)

### 9.3 — Jobs Management Pages
- [x] Tạo `src/pages/jobs/JobListPage.tsx`
  - Bảng danh sách jobs với pagination
  - Filter: status (OPEN/CLOSED/DRAFT)
  - Search by title
  - Actions: Edit, Delete, View
- [x] Tạo `src/pages/jobs/JobCreatePage.tsx`
  - Form: title, description (rich text hoặc textarea), requirements
  - Validation
  - Submit → redirect to job list
- [x] Tạo `src/pages/jobs/JobEditPage.tsx`
  - Pre-fill form với data hiện tại
  - Update → redirect to job detail
- [x] Tạo `src/pages/jobs/JobDetailPage.tsx`
  - Chi tiết job + danh sách applications cho job đó
  - Actions: Edit, Delete, "Upload CV for this job"

### 9.4 — Applications Management Pages
- [x] Tạo `src/pages/applications/ApplicationListPage.tsx`
  - Bảng danh sách applications với pagination
  - Filter: status, job
  - Status badge với màu theo trạng thái
  - Actions: View Detail, Send Invite (nếu status = READY_FOR_INTERVIEW)
- [x] Tạo `src/pages/applications/ApplicationDetailPage.tsx`
  - Thông tin ứng viên: name, email, CV download link
  - Status timeline/progress (SUBMITTED → CV_PROCESSING → READY → INVITED → ...)
  - Action buttons theo trạng thái hiện tại
- [x] Tạo `src/pages/applications/UploadCVPage.tsx`
  - Chọn Job (dropdown)
  - Nhập candidate name + email
  - Drag-and-drop hoặc click-to-upload PDF
  - File validation: chỉ PDF, max 5MB
  - Upload progress indicator

### 9.5 — Application Status Pipeline View
- [x] Tạo `src/components/StatusPipeline.tsx`
  - Hiển thị visual pipeline: SUBMITTED → CV_PROCESSING → READY_FOR_INTERVIEW → INVITED → IN_INTERVIEW → COMPLETED
  - Highlight stage hiện tại
  - Optional: Kanban board view cho tất cả applications

### 9.6 — Interview Invite Flow
- [x] Tạo `src/components/InviteModal.tsx`
  - Confirmation modal trước khi gửi invite
  - Hiển thị: candidate name, email, job title
  - Gọi `POST /api/applications/:id/invite`
  - Success → update status badge
  - Error handling (wrong status, server error)

### 9.7 — Shared Components
- [x] Tạo `src/components/Pagination.tsx` — reusable pagination
- [x] Tạo `src/components/StatusBadge.tsx` — color-coded status badges
- [x] Tạo `src/components/LoadingSpinner.tsx` — loading states
- [x] Tạo `src/components/EmptyState.tsx` — "no data" placeholder
- [x] Tạo `src/components/ConfirmDialog.tsx` — generic confirmation modal
- [x] Tạo `src/components/Toast.tsx` — success/error notifications

### 9.8 — Responsive + Polish
- [x] Verify responsive layout trên mobile (≤768px)
- [x] Hover effects + micro-animations trên buttons, cards, badges
- [x] Loading skeletons cho data fetching

### 9.9 — Verify
- [x] Job CRUD flow hoạt động end-to-end qua UI
- [x] CV upload + status tracking hoạt động
- [x] Interview invite gửi thành công, status chuyển đúng
- [x] Pagination + filters hoạt động
- [x] UI responsive trên mobile

---

## Khi hoàn thành bước này
1. Đánh dấu tất cả tasks ở trên thành `[x]`
2. Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
3. Cập nhật [TASK.md](../TASK.md): STEP-09 → `✅ DONE`, STEP-10 → `🔄 NEXT`
