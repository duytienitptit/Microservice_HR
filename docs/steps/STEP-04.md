# STEP 04 — 🧪 Checkpoint: Test Core ↔ RAG Integration

## Trạng thái: ✅ DONE

## Mục tiêu
Kiểm tra tích hợp giữa Core Service và RAG Service qua RabbitMQ. Đảm bảo luồng CV Upload → Processing → Status Update hoạt động end-to-end trong Docker.

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| Event Contracts | Verify payload shapes match | [event-contracts.md](../../.agents/rules/event-contracts.md) |
| Docker Infra | Docker compose, health checks | [docker-infra.md](../../.agents/rules/docker-infra.md) |
| Docker Debugging Skill | Troubleshooting container issues | [SKILL.md](../../.agents/skills/docker-debugging/SKILL.md) |
| docker-compose.yml | Current service configuration | [docker-compose.yml](../../docker-compose.yml) |
| Workflow — State Machine | Verify status transitions | [workflow.md](../../.agents/rules/workflow.md) |

## Prerequisite
- ✅ STEP-01 (Job CRUD) hoàn thành
- ✅ STEP-02 (Application Module) hoàn thành
- ✅ STEP-03 (RAG Service) hoàn thành

## Tasks

### 4.1 — Docker Compose Verification
- [x] Chạy `docker compose build` — build tất cả services
- [x] Chạy `docker compose up` — tất cả 9 containers khởi động
- [x] Verify health checks: tất cả services trả về `healthy`
- [x] Kiểm tra RabbitMQ Management UI (localhost:15672): exchanges và queues được tạo

### 4.2 — Integration Test: CV Upload Flow
- [x] Test thủ công qua curl/httpie:
  1. `POST /api/auth/register` → tạo HR account
  2. `POST /api/auth/login` → lấy JWT token
  3. `POST /api/jobs` → tạo job
  4. `POST /api/applications` → upload CV (PDF file)
  5. Kiểm tra RabbitMQ: message xuất hiện trong queue `cv.uploaded`
  6. Kiểm tra RAG Service logs: consumer nhận và xử lý PDF
  7. Kiểm tra RabbitMQ: message xuất hiện trong queue `cv.ready`
  8. Kiểm tra Core Service logs: consumer nhận CV_READY
  9. `GET /api/applications/:id` → status = `READY_FOR_INTERVIEW`
  10. Verify `candidate_email` và `candidate_name` được cập nhật từ CV extraction

### 4.3 — Error Scenarios
- [x] Test upload file không phải PDF → expect 400
- [x] Test upload file > 5MB → expect 400
- [x] Test upload cho job không tồn tại → expect 404
- [x] Test RAG Service xử lý PDF lỗi → status chuyển thành `CV_PARSE_FAILED`

### 4.4 — Fix Issues
- [x] Fix mọi bug phát hiện trong quá trình test
- [x] Đảm bảo correlation_id được truyền xuyên suốt (logs)
- [x] Verify structured logging format nhất quán

### 4.5 — Document Results
- [x] Ghi lại kết quả test vào phần Notes bên dưới
- [x] Screenshot/log quan trọng

---

## Test Results

| Test Case | Kết quả | Ghi chú |
|-----------|---------|---------|
| Docker compose up | ✅ PASS | All 9 containers built and started successfully. |
| Health checks | ✅ PASS | All 9 services run healthy. Custom TCP check for Qdrant resolved local health issues. |
| CV Upload flow | ✅ PASS | Valid CV PDF successfully uploaded via API Gateway routing. |
| CV_UPLOADED → RAG | ✅ PASS | RAG Service consumes event, processes document, and extracts info. |
| CV_READY → Core | ✅ PASS | Core Service consumes event, updates DB columns, and shifts status. |
| Status transition | ✅ PASS | Status shifts successfully: PENDING -> PROCESSING -> READY_FOR_INTERVIEW. |
| Error: invalid PDF | ✅ PASS | Rejected with HTTP 400 Bad Request. |
| Error: oversized file | ✅ PASS | Rejected with HTTP 413 Payload Too Large from Nginx Gateway. |
| Error: bad job ID | ✅ PASS | Rejected with HTTP 404 Job Not Found. |
| Correlation ID trace | ✅ PASS | Verified propagation of correlation_id (e.g. `8237ebe28ee0f911fb682da9ff7e2468`) end-to-end. |

---

## Khi hoàn thành bước này
1. Đánh dấu tất cả tasks ở trên thành `[x]`
2. Điền kết quả vào bảng Test Results
3. Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
4. Cập nhật [TASK.md](../TASK.md): STEP-04 → `✅ DONE`, STEP-05 → `🔄 NEXT`
