# TASK — Lộ trình Vibe Coding

## Trạng thái Tổng quan

### Phase 1 — Foundation

| Bước | Tên | Trạng thái | File |
|------|-----|------------|------|
| 0 | Infrastructure + Auth (đã hoàn thành) | ✅ DONE | — |
| 1 | Core Service — Job CRUD | ✅ DONE | [STEP-01.md](steps/STEP-01.md) |
| 2 | Core Service — Application Module + RabbitMQ | ✅ DONE | [STEP-02.md](steps/STEP-02.md) |
| 3 | RAG Service — Document Processing | ✅ DONE | [STEP-03.md](steps/STEP-03.md) |
| 4 | 🧪 Checkpoint — Test Core ↔ RAG Integration | ✅ DONE | [STEP-04.md](steps/STEP-04.md) |
| 5 | AI Service — Interview Session | ✅ DONE | [STEP-05.md](steps/STEP-05.md) |
| 6 | Assessment Service — Scoring + Email | ✅ DONE | [STEP-06.md](steps/STEP-06.md) |
| 7 | 🧪 Integration — API Gateway + E2E Test | ✅ DONE | [STEP-07.md](steps/STEP-07.md) |

### Phase 1.5 — Frontend UI

| Bước | Tên | Trạng thái | File |
|------|-----|------------|------|
| 8 | Web Client — Project Setup + Design System + Auth | ✅ DONE | [STEP-08.md](steps/STEP-08.md) |
| 9 | Web Client — HR Dashboard (Jobs + Applications) | ✅ DONE | [STEP-09.md](steps/STEP-09.md) |
| 10 | Web Client — Candidate Interview UI + Reports | ✅ DONE | [STEP-10.md](steps/STEP-10.md) |

### Phase 2 — AI Integration

| Bước | Tên | Trạng thái | File |
|------|-----|------------|------|
| 11 | RAG Service — Embedding Pipeline + Qdrant Vector Search | ✅ DONE | [STEP-11.md](steps/STEP-11.md) |
| 12 | AI Service — LangGraph State Machine + LLM Questions | ✅ DONE | [STEP-12.md](steps/STEP-12.md) |
| 13 | Assessment Service — LLM-Based Scoring | ✅ DONE | [STEP-13.md](steps/STEP-13.md) |

### Phase 3 — Production Polish

| Bước | Tên | Trạng thái | File |
|------|-----|------------|------|
| 14 | 🔒 Security + Performance + Monitoring | ✅ DONE | [STEP-14.md](steps/STEP-14.md) |
| 15 | 🧪 Full E2E Regression + Documentation + Demo | ✅ DONE | [STEP-15.md](steps/STEP-15.md) |

---

## Cách sử dụng

1. **Yêu cầu triển khai từng bước:** `Triển khai STEP-01` hoặc `Triển khai bước 1`
2. AI sẽ đọc file step tương ứng, thực hiện từng task nhỏ, và auto-update trạng thái
3. Sau mỗi bước hoàn thành, bảng trên sẽ được cập nhật tự động

## Cơ chế Auto-update

Khi hoàn thành một bước:
1. Tất cả task con trong file `STEP-XX.md` được đánh dấu `[x]`
2. Bảng trạng thái ở file `TASK.md` này chuyển `⬜ TODO` → `✅ DONE`
3. Bước tiếp theo chuyển `⬜ TODO` → `🔄 NEXT`

---

## Đã hoàn thành ✅

### Bước 15 — Full E2E Regression + Documentation + Demo (2026-05-20)
- **E2E Automation Script**: Cập nhật `scratch/run_e2e.py` để sử dụng trực tiếp HTTPS API Gateway, xử lý bypass self-signed SSL certificate, và tăng polling timeout lên 45 attempts (90s) nhằm hỗ trợ download SentenceTransformer model nguội (cold start). Chạy E2E regression test thành công 100%.
- **OpenAPI specs**: Tạo OpenAPI documentation chính thức cho Core Service (`docs/openapi_core_service.json`), AI Service (`docs/openapi_ai_service.json`), và Assessment Service (`docs/openapi_assessment_service.json`).
- **Postman updates**: Cập nhật collection `docs/api.postman_collection.json` với đầy đủ endpoints Auth (refresh, logout, me).
- **Demo Script**: Tạo tài liệu chi tiết `docs/DEMO_SCRIPT.md` hướng dẫn từng bước demo live hệ thống.
- **Root README**: Cập nhật toàn diện `README.md` với đầy đủ thiết kế hệ thống, sơ đồ Mermaid, danh sách port, biến môi trường, và hướng dẫn chạy test suite.
- **Cleanup**: Dọn dẹp codebase, kiểm tra TODOs và logs, xác nhận môi trường khởi động và hoạt động sạch sẽ.

### Bước 14 — Security + Performance + Monitoring (2026-05-20)
- **Gateway Rate Limiting**: Cấu hình rate-limiting 100r/m trên API Gateway (Nginx) cùng custom JSON response cho lỗi 429.
- **HTTPS/TLS**: Sinh self-signed certificate, cấu hình HTTPS trên cổng 443 và tự động redirect HTTP -> HTTPS.
- **Security Headers**: Áp dụng helmet headers, hạn chế CORS origin, và cấu hình security headers (nosniff, DENY, XSS protection, HSTS) trên Nginx.
- **Input Sanitization**: Tích hợp Express XSS-sanitizer và kiểm tra kiểu file MIME (Magic Number `%PDF`) khi upload.
- **Auth Hardening**: Tích hợp refresh token rotation, brute-force protection (lockout 15 phút sau 5 lần sai mật khẩu), và API logout thu hồi token.
- **Monitoring & Logging**: Tích hợp Prometheus (thu thập metrics `/metrics`), Grafana (dashboard trực quan), Loki & Promtail (quản lý centralized logs tập trung) vào Docker Compose. Fix conflict cổng Loki với container openshorts-renderer bằng cách đổi mapping cổng host sang `3101:3100`.

### Bước 13 — Assessment Service — LLM-Based Scoring (2026-05-20)
- **Gemini LLM Integration**: Tích hợp Google Gemini Model vào Assessment Service để chấm điểm toàn diện cuộc phỏng vấn dựa trên transcript, CV và Job Description.
- **Scoring Dimensions**: Đánh giá theo 3 chiều: kỹ thuật (40%), kỹ năng giao tiếp (30%), và mức độ phù hợp (30%).
- **Citations & Insights**: Trích xuất dẫn chứng cụ thể từ cuộc hội thoại để minh họa cho điểm số của từng chiều, đi kèm điểm mạnh, điểm yếu và đánh giá tổng quan.
- **Integration & Email**: Cập nhật trigger tự động sinh report và gửi email kết quả (PDF report đính kèm) cho HR sau khi buổi phỏng vấn kết thúc.

### Bước 12 — AI Service — LangGraph State Machine + LLM Questions (2026-05-20)
- **LangGraph State Machine**: Xây dựng máy trạng thái phỏng vấn: GREETING -> EXPERIENCE_REVIEW -> TECHNICAL_QA -> SITUATIONAL_QA -> OUTRO.
- **RAG Context Injection**: Truy vấn động dữ liệu CV ứng viên và mô tả công việc (JD) từ RAG Service để đưa vào prompt phỏng vấn.
- **State Transition Guard**: Kiểm soát quá trình chuyển stage dựa trên sự tiến bộ của hội thoại để đảm bảo tính logic và liền mạch.

### Bước 11 — RAG Service — Embedding Pipeline + Qdrant Vector Search (2026-05-20)
- **Qdrant Vector Database**: Tích hợp vector DB Qdrant để lưu trữ các phân đoạn văn bản (chunks) từ CV và Job Descriptions.
- **Embedding Pipeline**: Sử dụng SentenceTransformers (`all-MiniLM-L6-v2`) để sinh embeddings 384 chiều và lưu trữ dạng vector phục vụ tìm kiếm ngữ nghĩa.

### Bước 10 — Web Client — Candidate Interview UI + Reports (2026-05-20)
- **Live Chat Interface**: Giao diện chat trực quan cho ứng viên, kết nối trực tiếp với LangGraph Agent thông qua API Gateway.
- **Assessment Report Dashboard**: Thiết kế bảng đánh giá kết quả trực quan (Score Card) dành cho HR, hiển thị điểm chi tiết, điểm mạnh, điểm yếu, trích dẫn hội thoại và file PDF báo cáo tải xuống.

### Bước 9 — Web Client — HR Dashboard (Jobs + Applications) (2026-05-20)
- **Job Management Board**: Giao diện quản lý job postings (thêm mới, hiển thị chi tiết, danh sách ứng viên).
- **Candidate Processing List**: Theo dõi trạng thái ứng viên (PROCESSING, READY_FOR_INTERVIEW, INVITED, INTERVIEWING, COMPLETED), cho phép tải CV và kích hoạt gửi thư mời phỏng vấn.

### Bước 8 — Web Client — Project Setup + Design System + Auth (2026-05-20)
- **Vite React Project Setup**: Khởi tạo project React + Vite + TypeScript.
- **Design System & CSS**: Thiết kế giao diện sang trọng, hiện đại với CSS Variables cho dark mode/vibrant accent, responsive layout và các micro-animations tinh tế.
- **User Authentication**: Xây dựng form login, đăng ký HR, tự động quản lý JWT token (refresh rotation) và phân quyền bảo mật.

### Bước 7 — API Gateway, Resilience & E2E Testing (2026-05-20)
- **API Gateway (Nginx)**: Cập nhật route public cho Candidate Magic Link (`/interview/:token`) và HR Assessment Report (`/api/reports/:id`).
- **Resilience & Fault Tolerance**: Tích hợp Exponential Backoff Retry (3 attempts) và Dead Letter Queues (DLQ) cho toàn bộ consumer (Core, RAG, Assessment).
- **Circuit Breaker**: Cấu hình `pybreaker` trong AI Service để bảo vệ kết nối tới RAG Service với fallback kịch bản tĩnh khi xảy ra downtime.
- **E2E Automation**: Viết script test tự động (`scratch/run_e2e.py`) mô phỏng 100% vòng đời của ứng viên và HR, xác thực thành công qua Gateway.
- **Postman API Docs**: Xuất bản `docs/api.postman_collection.json` với script tự động lưu JWT token và session ID của candidate.
- **Unit Testing**: Chạy thành công 100% (100+ tests) unit & integration test suites của tất cả 4 services.

### Bước 0 — Infrastructure + Auth (2026-05-16)
- Docker Compose: 9 services (postgres, mongodb, qdrant, rabbitmq, nginx, 4 app services)
- Core Service Auth: register, login, refresh, me (16 tests passing)
- Prisma schema: users, jobs, applications, refresh_tokens
- Tất cả services có `/health` endpoint
- Basic API Gateway routing.

---

## Ghi chú & Quyết định
- Phase 1 dùng MOCK interview questions (template tĩnh), không LLM
- Phase 1 RAG Service chỉ trích xuất text thô, không embeddings
- Assessment scoring là rule-based (keyword matching + response length)
- Không có frontend — API-only, test qua Postman
- Phase 1.5 dùng Vite + React (TypeScript), đặt tại `web-client/`
- Phase 2 dùng Google Gemini model cho cả hội thoại và scoring.
- Phase 3 tích hợp Prometheus, Grafana, Loki phục vụ giám sát và tracking.
