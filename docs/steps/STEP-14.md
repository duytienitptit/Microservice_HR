# STEP 14 — 🔒 Security + Performance + Monitoring

## Trạng thái: ✅ DONE

## Mục tiêu
Hardening cho production: bổ sung rate limiting, HTTPS/TLS, security headers, monitoring stack (Prometheus + Grafana), centralized logging (Loki), và quản lý environment configuration đầy đủ.

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| System Design — §3.5 | API Gateway: JWT validation, rate limiting | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 3.5 |
| System Design — §6 | Error handling, circuit breaker, retry policy | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 6 |
| System Design — §7 | Observability: logging, correlation ID, health checks, monitoring | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 7 |
| PRD — Non-Functional | 60s startup, 2s response, graceful reconnect | [PRD.md](../PRD.md) § Non-Functional Requirements |
| Architecture | Immutable constraints | [architecture.md](../../.agents/rules/architecture.md) |
| Docker Infra | Compose, health checks | [docker-infra.md](../../.agents/rules/docker-infra.md) |
| STEP-13 | Phase 2 hoàn thành | [STEP-13.md](STEP-13.md) |

## Prerequisite
- ✅ STEP-13 (LLM Scoring) phải hoàn thành trước
- ✅ Toàn bộ Phase 1 + Phase 1.5 + Phase 2 hoạt động

## Tasks

### 14.1 — API Gateway: Rate Limiting
- [x] Cập nhật `api-gateway/nginx.conf`
  - Rate limiting: 100 requests/min per IP
  - `limit_req_zone` directive
  - Custom error response cho 429 Too Many Requests
  - Exclude health check endpoints từ rate limiting

### 14.2 — HTTPS/TLS Setup
- [x] Tạo self-signed certificate cho development
  - `openssl` script trong `api-gateway/certs/`
- [x] Cập nhật nginx.conf: listen 443 ssl
- [x] Redirect HTTP → HTTPS
- [x] Document: hướng dẫn setup real cert cho production (Let's Encrypt)

### 14.3 — Security Headers
- [x] Core Service + Assessment Service (Node.js):
  - Verify `helmet` middleware đang active
  - Tighten CORS: chỉ cho phép origin cụ thể thay vì `*`
  - Content-Security-Policy header
- [x] AI Service + RAG Service (Python):
  - Add security headers middleware
  - CORS configuration tương tự
- [x] API Gateway (Nginx):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security` (khi HTTPS enabled)

### 14.4 — Input Sanitization Audit
- [x] Review tất cả API endpoints cho XSS vulnerability
- [x] Review SQL injection protection (Prisma/SQLAlchemy/Mongoose đã handle)
- [x] Validate file upload: re-verify MIME type, not just extension
- [x] Sanitize user-generated content trước khi store

### 14.5 — Auth Security Hardening
- [x] Refresh token rotation: mỗi lần refresh → cấp token mới, invalidate cũ
- [x] `POST /api/auth/logout` — invalidate refresh token (nếu chưa implement)
- [x] Rate limit login attempts: 5 failures in 15 min → temporary lockout
- [x] Magic link token cleanup: cron job hoặc TTL-based cleanup cho stale tokens

### 14.6 — File Storage Management
- [x] CV file cleanup strategy:
  - Archived applications → move CV to archive storage
  - Failed uploads → delete after 24h
- [x] Storage usage monitoring
- [x] Max total storage limit configuration

### 14.7 — Monitoring: Prometheus + Grafana
- [x] Thêm `prometheus` và `grafana` services vào `docker-compose.yml`
- [x] Core Service + Assessment Service (Node.js):
  - Install `prom-client`
  - Expose `/metrics` endpoint
  - Metrics: request_count, request_duration, error_rate
- [x] AI Service + RAG Service (Python):
  - Install `prometheus-fastapi-instrumentator`
  - Expose `/metrics` endpoint
  - Metrics: request_count, request_duration, active_sessions
- [x] Tạo Grafana dashboard:
  - Service health overview
  - Request rate per service
  - Error rate trends
  - Response time percentiles (p50, p95, p99)
  - RabbitMQ queue depth

### 14.8 — Centralized Logging: Loki
- [x] Thêm `loki` và `promtail` services vào `docker-compose.yml`
- [x] Configure promtail to collect logs từ tất cả 4 services
- [x] Grafana datasource: add Loki
- [x] Create log dashboard:
  - Filter by service, level, correlation_id
  - Error log alerts

### 14.9 — Environment Management
- [x] Tạo `.env.example` đầy đủ với tất cả variables cho mọi service
- [x] Document biến nào bắt buộc vs optional
- [x] Tạo `.env.development` và `.env.production` templates
- [x] Verify: không có secrets hardcoded trong source code

### 14.10 — Verify
- [x] Rate limiting hoạt động (test > 100 req/min → 429)
- [x] HTTPS hoạt động với self-signed cert
- [x] Security headers present trong responses
- [x] Prometheus metrics accessible
- [x] Grafana dashboards hiển thị data
- [x] Loki logs searchable qua Grafana
- [x] `docker compose up` vẫn khởi động < 60s
- [x] No secrets trong source code

---

## Khi hoàn thành bước này
1. Đánh dấu tất cả tasks ở trên thành `[x]`
2. Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
3. Cập nhật [TASK.md](../TASK.md): STEP-14 → `✅ DONE`, STEP-15 → `🔄 NEXT`
