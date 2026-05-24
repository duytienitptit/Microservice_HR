# STEP 07 — 🧪 Integration: API Gateway + End-to-End Test

## Trạng thái: ✅ DONE

## Mục tiêu
Hoàn thiện API Gateway routing (bao gồm magic link route), cấu hình error handling & resilience (retry, DLQ, circuit breaker), chạy full end-to-end test, tạo Postman collection, và đảm bảo `docker compose up` chạy toàn bộ hệ thống từ scratch.

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| System Design — §3.5 | API Gateway routing table | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 3.5 |
| System Design — §6 | Error handling, circuit breaker, retry policy | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 6 |
| System Design — §5 Luồng 3 | Retry + Dead Letter flow | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 5 Luồng 3 |
| Architecture | Gateway routing, RAG = internal only | [architecture.md](../../.agents/rules/architecture.md) |
| Docker Infra | Compose, health checks, startup ordering | [docker-infra.md](../../.agents/rules/docker-infra.md) |
| Docker Debugging Skill | Troubleshooting | [SKILL.md](../../.agents/skills/docker-debugging/SKILL.md) |
| Event Contracts | All event payloads (verify consistency) | [event-contracts.md](../../.agents/rules/event-contracts.md) |
| PRD — Non-Functional | 60s startup, 2s response, graceful reconnect | [PRD.md](../PRD.md) § Non-Functional Requirements |
| PRD — Infrastructure | Docker compose, health, logging, DLQ | [PRD.md](../PRD.md) § Feature: Infrastructure |
| Nginx Config | Current nginx.conf | [nginx.conf](../../api-gateway/nginx.conf) |
| docker-compose.yml | Current compose config | [docker-compose.yml](../../docker-compose.yml) |

## Prerequisite
- ✅ STEP-01 through STEP-06 tất cả hoàn thành

## Tasks

### 7.1 — API Gateway: Complete Routing
- [x] Cập nhật `api-gateway/nginx.conf`:
  - Thêm `/interview/:token/*` route → AI Service (public, no JWT)
  - Verify CORS headers
  - Verify rate limiting config
- [x] Test routing cho tất cả service paths

### 7.2 — Error Handling & Resilience
- [x] Implement retry with exponential backoff cho tất cả MQ consumers:
  - Core Service: CV_READY consumer
  - RAG Service: CV_UPLOADED consumer
  - Assessment Service: INTERVIEW_COMPLETED consumer
  - Assessment Service: SEND_EMAIL consumer
- [x] Configure Dead Letter Queues (DLQ) cho tất cả queues:
  - Exchange: `dlx.events`
  - Queues: `dlq.cv.uploaded`, `dlq.interview.completed`, `dlq.send.email`
- [x] Implement Circuit Breaker (AI Service → RAG Service HTTP calls)
  - 3 failures in 60s → open
  - 30s timeout → half-open
  - Fallback: generic questions without RAG context

### 7.3 — Docker Compose Polish
- [x] Verify `docker compose up` chạy toàn bộ hệ thống từ scratch
- [x] Verify tất cả services khởi động < 60s
- [x] Verify health checks hoạt động cho tất cả services
- [x] Verify `depends_on` với `condition: service_healthy`
- [x] Test shutdown graceful (`docker compose down`)

### 7.4 — End-to-End Test: Full User Flow
- [x] Test full flow từ đầu đến cuối:
  1. **HR Register** → POST `/api/auth/register`
  2. **HR Login** → POST `/api/auth/login` → JWT
  3. **Create Job** → POST `/api/jobs`
  4. **Upload CV** → POST `/api/applications` (PDF file)
  5. **Wait for CV Processing** → CV_UPLOADED → RAG → CV_READY
  6. **Check Status** → GET `/api/applications/:id` → `READY_FOR_INTERVIEW`
  7. **Send Invite** → POST `/api/applications/:id/invite` → magic link generated
  8. **Candidate clicks Magic Link** → GET `/interview/:token`
  9. **Start Interview** → chat messages back and forth
  10. **End Interview** → POST `/api/interviews/:sessionId/end`
  11. **Assessment Generated** → INTERVIEW_COMPLETED → scoring → report saved
  12. **HR Views Report** → GET `/api/reports/:applicationId` → scores + recommendation
  13. **Verify Emails** → check SMTP/log output

### 7.5 — Error Scenario Tests
- [x] Test service recovery: restart individual service → auto-reconnect
- [x] Test MQ failure: message goes to DLQ after max retries
- [x] Test invalid magic link: expired/used token → 403
- [x] Test duplicate application: same email + same job → 409

### 7.6 — Postman Collection
- [x] Tạo `docs/api.postman_collection.json`
  - Tất cả endpoints grouped by service
  - Environment variables (base_url, jwt_token, magic_link_token)
  - Pre-request scripts cho auth
  - Example requests và expected responses

### 7.7 — Documentation Update
- [x] Cập nhật README.md (Thay bằng việc tạo README.md ở root chứa tất cả resilience, E2E và testing guides)
- [x] Cập nhật `docs/USER_GUIDE.md` nếu cần

### 7.8 — Final Verification
- [x] Chạy toàn bộ unit tests cho 4 services — tất cả pass
- [x] `docker compose down && docker compose up` — clean start hoạt động
- [x] Full E2E flow hoạt động end-to-end
- [x] Structured logging nhất quan (JSON, correlation_id)
- [x] Health checks tất cả services trả về `healthy`

---

## E2E Test Results (ghi sau khi test)

| Step | Test Case | Kết quả | Ghi chú |
|------|-----------|---------|---------|
| 1 | HR Register | ✅ PASS | Đăng ký thành công HR user qua Gateway |
| 2 | HR Login | ✅ PASS | Trả về JWT Access Token chính xác |
| 3 | Create Job | ✅ PASS | Tạo Job posting thành công (POST `/api/jobs/`) |
| 4 | Upload CV | ✅ PASS | Upload PDF CV dạng Multipart Form data (field `cv`) |
| 5 | CV Processing | ✅ PASS | RAG Service nhận event, parse PDF & trích xuất thông tin |
| 6 | Status = READY_FOR_INTERVIEW | ✅ PASS | Core Service cập nhật trạng thái khi nhận event CV_READY |
| 7 | Send Invite | ✅ PASS | Sinh magic link token và chuyển trạng thái sang `INVITED` |
| 8 | Magic Link Access | ✅ PASS | Đăng nhập candidate không dùng JWT, sinh session thành công |
| 9 | Interview Chat | ✅ PASS | Tương tác chat 3 lượt thành công, chuyển đổi stage câu hỏi |
| 10 | End Interview | ✅ PASS | Kết thúc session (POST `/api/interviews/:sessionId/end`) |
| 11 | Assessment Generated | ✅ PASS | Trực tiếp chấm điểm (MongoDB) qua event INTERVIEW_COMPLETED |
| 12 | View Report | ✅ PASS | HR truy xuất kết quả qua Gateway (Overall Score: 87) |
| 13 | Email Sent | ✅ PASS | Ghi nhận mock mail invite & report thành công trong logs |

---

## Khi hoàn thành bước này
1. Đánh dấu tất cả tasks ở trên thành `[x]`
2. Điền kết quả vào bảng E2E Test Results
3. Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
4. Cập nhật [TASK.md](../TASK.md): STEP-07 → `✅ DONE`
5. 🎉 **Phase 1 HOÀN THÀNH!**
