# AI HR Recruiter — Tài liệu Thiết kế Hệ thống

**Phiên bản:** 2.0  
**Cập nhật lần cuối:** 20-05-2026  
**Trạng thái:** Bản nháp

---

## 1. Tổng quan Sản phẩm

**AI HR Recruiter** là nền tảng tuyển dụng thông minh dành cho nội bộ HR, tự động hóa quy trình phỏng vấn vòng một. HR tải CV ứng viên lên hệ thống, hệ thống trích xuất thông tin ứng viên từ CV, và HR gửi thư mời phỏng vấn qua Magic Link. Ứng viên truy cập phỏng vấn AI qua Magic Link mà không cần tạo tài khoản. Sau khi hoàn thành, hệ thống tự động tạo báo cáo đánh giá được chấm điểm và thông báo cho đội ngũ HR.

### Luồng Người dùng Cốt lõi

| Đối tượng | Luồng |
|---|---|
| **HR** | Đăng JD → Tải CV ứng viên lên → Duyệt CV đã phân tích → Gửi thư mời phỏng vấn → Xem báo cáo do AI tạo |
| **Ứng viên** | Nhận email với link phỏng vấn → Click link → Phỏng vấn AI → Nhận kết quả qua email |

### Giá trị Cốt lõi

- **Sàng lọc tự động** — Giảm thời gian HR dành cho phỏng vấn vòng một
- **Đánh giá nhất quán** — Mọi ứng viên đều được đánh giá dựa trên cùng một tiêu chí
- **Khả năng mở rộng** — Xử lý hàng trăm phiên phỏng vấn đồng thời qua kiến trúc bất đồng bộ (async)
- **Khả năng mở rộng (Extensible)** — Lớp AI có thể thay thế dễ dàng; hệ thống hoạt động với các câu trả lời giả lập (mock) trước khi tích hợp LLM

---

## 2. Kiến trúc Hệ thống

### Sơ đồ Cấp cao

```
┌──────────────────────────────────────────────────────────────────┐
│                     CLIENT (Web / Mobile)                        │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Nginx)                          │
│          JWT Validation · Rate Limiting · Routing                │
└────┬───────────────┬───────────────┬──────────────┬─────────────┘
     │               │               │              │
     ▼               ▼               ▼              ▼
┌──────────┐  ┌───────────┐  ┌────────────┐  ┌────────────────┐
│   CORE   │  │    AI     │  │    RAG     │  │  ASSESSMENT    │
│ SERVICE  │  │ SERVICE   │  │  SERVICE   │  │  SERVICE       │
│          │  │           │  │            │  │                │
│ Node.js  │  │  FastAPI  │  │  FastAPI   │  │  Node.js /     │
│ Express  │  │  Python   │  │  Python    │  │  Python        │
│          │  │           │  │            │  │                │
│ Postgres │  │ Postgres  │  │  VectorDB  │  │  MongoDB       │
│          │  │           │  │  + Sqlite  │  │                │
└────┬─────┘  └─────┬─────┘  └─────┬──────┘  └──────┬─────────┘
     │               │              │                 │
     └───────────────┴──────────────┴─────────────────┘
                               │
                               ▼
          ┌────────────────────────────────────────┐
          │           MESSAGE QUEUE (RabbitMQ)      │
          │                                        │
          │  Exchanges:                            │
          │  ├─ cv.events                          │
          │  ├─ interview.events                   │
          │  └─ notification.events                │
          │                                        │
          │  Dead Letter Exchange (DLX):           │
          │  └─ *.dlq  (sau N lần thử lại)         │
          └────────────────────────────────────────┘
```

---

## 3. Các Dịch vụ (Services)

### 3.1. Core Service

**Vai trò:** Xương sống của nền tảng. Xử lý toàn bộ quản lý dữ liệu giao diện người dùng.

| | |
|---|---|
| **Runtime** | Node.js (Express) |
| **Cơ sở dữ liệu** | PostgreSQL |
| **Cổng (Port)** | 3001 |

**Trách nhiệm:**
- Xác thực & phân quyền người dùng HR (JWT) — chỉ HR đăng ký/đăng nhập, không có tài khoản ứng viên
- HR: tạo và quản lý Mô tả Công việc
- HR: tải CV ứng viên lên cho một công việc cụ thể (thay vì ứng viên tự nộp)
- Tạo Magic Link token cho phỏng vấn khi HR kích hoạt gửi thư mời
- Duy trì máy trạng thái vòng đời ứng tuyển:

```
SUBMITTED → CV_PROCESSING → READY_FOR_INTERVIEW → INVITED → IN_INTERVIEW → COMPLETED → ARCHIVED
                           ↘ CV_PARSE_FAILED
```

- Publish (Phát) `CV_UPLOADED_EVENT` tới RabbitMQ sau khi tải tệp lên thành công
- Consume (Tiêu thụ) `CV_READY_EVENT` để chuyển trạng thái ứng dụng sang `READY_FOR_INTERVIEW` và cập nhật thông tin ứng viên (email, tên) được trích xuất từ CV
- Publish (Phát) `SEND_INVITE_EMAIL_EVENT` khi HR kích hoạt gửi thư mời phỏng vấn

**Lược đồ Cơ sở dữ liệu (Database Schema):**

```sql
-- Người dùng (Users) — chỉ tài khoản HR, không có tài khoản ứng viên
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name   VARCHAR(255),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Công việc (Jobs)
CREATE TABLE jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_id       UUID REFERENCES users(id),
  title       VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  status      VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'DRAFT')),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- Đơn ứng tuyển (Applications) — mỗi đơn là độc lập, cùng email + khác job = khác application
CREATE TABLE applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID REFERENCES jobs(id),
  candidate_email VARCHAR(255),
  candidate_name  VARCHAR(255),
  cv_file_path    VARCHAR(512),
  magic_link_token UUID UNIQUE,
  is_link_used    BOOLEAN DEFAULT FALSE,
  status          VARCHAR(30) DEFAULT 'SUBMITTED',
  submitted_at    TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_candidate_job UNIQUE (candidate_email, job_id)
);
```

---

### 3.2. AI Interviewer Service

**Vai trò:** Quản lý các phiên phỏng vấn và điều phối cuộc trò chuyện với ứng viên.

| | |
|---|---|
| **Runtime** | Python (FastAPI) |
| **Cơ sở dữ liệu** | PostgreSQL (phiên & lịch sử trò chuyện) |
| **Cổng (Port)** | 3002 |

**Trách nhiệm:**
- Tạo và quản lý vòng đời `InterviewSession` (Phiên phỏng vấn)
- Cung cấp Chat API cho tương tác thời gian thực với ứng viên
- **Xác thực ứng viên qua Magic Link Token** (từ URL param hoặc header `X-Magic-Token`) thay vì Bearer JWT
- Gọi RAG Service (qua HTTP nội bộ) để lấy kiến thức ngữ cảnh từ CV/JD trước khi tạo câu hỏi
- Điều hướng luồng phỏng vấn qua các giai đoạn:

```
GREETING → EXPERIENCE_REVIEW → TECHNICAL_QUESTIONS → SCENARIO_QUESTIONS → CLOSING
```

- **Giai đoạn 1 (Phase 1):** Trả về các câu hỏi tĩnh/mẫu theo từng giai đoạn
- **Giai đoạn 2 (Phase 2):** Tích hợp máy trạng thái LangGraph; mỗi node gọi LLM với ngữ cảnh RAG
- Publish `INTERVIEW_COMPLETED_EVENT` với toàn bộ lịch sử trò chuyện khi phiên kết thúc

**Lược đồ Cơ sở dữ liệu (Database Schema):**

```sql
CREATE TABLE interview_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL,
  status          VARCHAR(20) DEFAULT 'PENDING',
  current_stage   VARCHAR(30) DEFAULT 'GREETING',
  started_at      TIMESTAMP,
  ended_at        TIMESTAMP
);

CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES interview_sessions(id),
  role        VARCHAR(10) NOT NULL CHECK (role IN ('AI', 'CANDIDATE')),
  content     TEXT NOT NULL,
  stage       VARCHAR(30),
  created_at  TIMESTAMP DEFAULT NOW()
);
```

---

### 3.3. RAG & Document Service

**Vai trò:** Xử lý các tài liệu (CV, JD) thành các vector embedding có thể tìm kiếm. Đóng vai trò là cơ sở tri thức cho AI interviewer.

| | |
|---|---|
| **Runtime** | Python (FastAPI + LangChain) |
| **Cơ sở dữ liệu** | VectorDB (Qdrant / ChromaDB) + SQLite (metadata tài liệu) |
| **Cổng (Port)** | 3003 |

**Trách nhiệm:**
- Consume `CV_UPLOADED_EVENT` → tải xuống PDF → trích xuất văn bản → chia nhỏ (chunk) → embed (tạo vector) → lưu trong VectorDB
- **Trích xuất email và tên ứng viên từ văn bản CV** bằng regex patterns trong quá trình phân tích PDF
- Publish `CV_READY_EVENT` khi hoàn tất quá trình xử lý (bao gồm `extracted_email` và `extracted_name`)
- Cung cấp HTTP API nội bộ cho AI Service để thực hiện tìm kiếm tương đồng (truy vấn RAG)
- **Giai đoạn 1 (Phase 1):** Chỉ trích xuất văn bản thô (không có embedding); trả về văn bản thuần túy cho AI Service
- **Giai đoạn 2 (Phase 2):** Pipeline embedding đầy đủ + tìm kiếm ngữ nghĩa

**Quy trình Xử lý Tài liệu (Giai đoạn 2):**

```
Tệp PDF
   │
   ▼
Trình Phân tích PDF (pdfplumber / pypdf)
   │  văn bản thô
   ▼
Bộ Chia Văn bản (RecursiveCharacterTextSplitter)
   │  các khối (512 token, 50 token trùng lặp)
   ▼
Mô hình Embedding (OpenAI / local: sentence-transformers)
   │  các vector
   ▼
VectorDB (Qdrant) — được lập chỉ mục bởi application_id
```

**Metadata SQLite:**

```sql
CREATE TABLE documents (
  id              TEXT PRIMARY KEY,
  application_id  TEXT NOT NULL,
  type            TEXT CHECK (type IN ('CV', 'JD')),
  raw_text        TEXT,
  status          TEXT DEFAULT 'PENDING',
  chunk_count     INTEGER,
  processed_at    DATETIME
);
```

---

### 3.4. Assessment & Notification Service

**Vai trò:** Đánh giá phiên phỏng vấn đã hoàn thành và thông báo cho HR.

| | |
|---|---|
| **Runtime** | Node.js hoặc Python |
| **Cơ sở dữ liệu** | MongoDB |
| **Cổng (Port)** | 3004 |

**Trách nhiệm:**
- Consume `INTERVIEW_COMPLETED_EVENT` cùng với toàn bộ lịch sử trò chuyện
- Chấm điểm ứng viên theo nhiều phương diện:

| Phương diện | Mô tả |
|---|---|
| `technical_score` | Độ chính xác và chuyên sâu của các câu trả lời kỹ thuật |
| `communication_score` | Sự rõ ràng và cấu trúc của các câu trả lời |
| `relevance_score` | Sự phù hợp của các câu trả lời với yêu cầu của JD |
| `overall_score` | Điểm tổng hợp có trọng số |

- Tạo báo cáo đánh giá có cấu trúc
- Gửi thông báo email cho HR với liên kết đến báo cáo đầy đủ
- **Giai đoạn 1 (Phase 1):** Chấm điểm dựa trên quy tắc (khớp từ khóa, độ dài câu trả lời, mức độ hoàn thành câu trả lời)
- **Giai đoạn 2 (Phase 2):** Chấm điểm dựa trên LLM với lập luận và trích dẫn từ cuộc phỏng vấn

**Lược đồ Tài liệu MongoDB (MongoDB Document Schema):**

```json
{
  "_id": "ObjectId",
  "application_id": "uuid",
  "session_id": "uuid",
  "scores": {
    "technical": 75,
    "communication": 82,
    "relevance": 68,
    "overall": 76
  },
  "summary": "Ứng viên đã thể hiện kiến thức vững chắc về REST APIs...",
  "strengths": ["Giao tiếp rõ ràng", "Giải quyết vấn đề có cấu trúc"],
  "weaknesses": ["Kiến thức hạn chế về hệ thống phân tán"],
  "recommendation": "ADVANCE_TO_NEXT_ROUND",
  "generated_at": "ISODate"
}
```

---

### 3.5. API Gateway

| | |
|---|---|
| **Runtime** | Nginx (reverse proxy) |
| **Cổng (Port)** | 80 / 443 |

**Trách nhiệm:**
- Điểm truy cập duy nhất cho tất cả các yêu cầu từ client
- Xác thực JWT token trước khi chuyển tiếp
- Định tuyến dựa trên tiền tố đường dẫn (path prefix)
- Giới hạn tốc độ (Rate limiting) (ví dụ: 100 yêu cầu/phút mỗi IP)
- Các header CORS

**Bảng Định tuyến (Routing Table):**

| Đường dẫn | Dịch vụ (Service) | Cổng | Xác thực |
|---|---|---|---|
| `/api/auth/*` | Core Service | 3001 | Công khai |
| `/api/users/*` | Core Service | 3001 | JWT (HR) |
| `/api/jobs/*` | Core Service | 3001 | JWT (HR) / Công khai (GET) |
| `/api/applications/*` | Core Service | 3001 | JWT (HR) |
| `/api/interviews/*` | AI Service | 3002 | JWT (HR) / Magic Link Token |
| `/api/chat/*` | AI Service | 3002 | Magic Link Token |
| `/interview/:token/*` | AI Service | 3002 | Magic Link Token (không cần JWT) |
| `/api/reports/*` | Assessment Service | 3004 | JWT (HR) |

> RAG Service (`3003`) **không được phơi bày (exposed)** thông qua gateway — nó chỉ nhận lưu lượng truy cập nội bộ từ AI Service và các sự kiện RabbitMQ.
>
> Route `/interview/:token/*` cho phép ứng viên truy cập phỏng vấn trực tiếp qua Magic Link mà không cần đăng nhập. Gateway chuyển tiếp token tới AI Service để xác thực.

---

## 4. Tham chiếu API (API Reference)

### 4.1. Xác thực (Auth)

| Phương thức | Endpoint | Mô tả | Phân quyền (Auth) |
|---|---|---|---|
| `POST` | `/api/auth/register` | Tạo tài khoản HR (chỉ HR, không có đăng ký ứng viên) | Công khai (Public) |
| `POST` | `/api/auth/login` | Trả về access + refresh tokens | Công khai |
| `POST` | `/api/auth/refresh` | Làm mới access token | Refresh Token |
| `POST` | `/api/auth/logout` | Vô hiệu hóa refresh token | Bearer |

### 4.2. Người dùng (User)

| Phương thức | Endpoint | Mô tả | Phân quyền |
|---|---|---|---|
| `GET` | `/api/users/me` | Lấy hồ sơ người dùng hiện tại | Bearer |
| `PUT` | `/api/users/me` | Cập nhật hồ sơ | Bearer |

### 4.3. Công việc (Jobs)

| Phương thức | Endpoint | Mô tả | Phân quyền |
|---|---|---|---|
| `POST` | `/api/jobs` | Tạo bài đăng công việc mới | HR |
| `GET` | `/api/jobs` | Liệt kê tất cả các công việc đang mở (có phân trang) | Công khai |
| `GET` | `/api/jobs/:id` | Lấy chi tiết công việc | Công khai |
| `PUT` | `/api/jobs/:id` | Cập nhật công việc | HR (chủ sở hữu) |
| `DELETE` | `/api/jobs/:id` | Xóa mềm công việc | HR (chủ sở hữu) |

### 4.4. Đơn ứng tuyển (Applications)

| Phương thức | Endpoint | Mô tả | Phân quyền |
|---|---|---|---|
| `POST` | `/api/applications` | HR tải CV ứng viên lên cho một công việc (`multipart/form-data` với `job_id` + PDF) | HR |
| `GET` | `/api/applications` | Liệt kê các đơn ứng tuyển (phân trang, lọc theo job) | HR |
| `GET` | `/api/applications/:id` | Chi tiết đơn ứng tuyển + trạng thái hiện tại | HR |
| `PATCH` | `/api/applications/:id/status` | HR cập nhật thủ công trạng thái | HR |
| `POST` | `/api/applications/:id/invite` | HR kích hoạt gửi thư mời phỏng vấn (tạo Magic Link + gửi email) | HR |

### 4.5. Phỏng vấn (Interviews)

| Phương thức | Endpoint | Mô tả | Phân quyền |
|---|---|---|---|
| `GET` | `/interview/:token` | Truy cập phỏng vấn qua Magic Link (tạo hoặc resume session) | Magic Link Token |
| `GET` | `/api/interviews/:sessionId` | Lấy thông tin phiên & giai đoạn hiện tại | Magic Link Token |
| `POST` | `/api/interviews/:sessionId/chat` | Gửi tin nhắn, nhận phản hồi AI | Magic Link Token |
| `GET` | `/api/interviews/:sessionId/history` | Toàn bộ bản ghi trò chuyện | Magic Link Token / HR |
| `POST` | `/api/interviews/:sessionId/end` | Chấm dứt phiên, kích hoạt đánh giá | Magic Link Token |

> **Lưu ý:** Ứng viên không cần đăng nhập. Magic Link token được gắn trong URL email mời phỏng vấn. Token chỉ hợp lệ cho một Application duy nhất. Nếu ứng viên thoát giữa chừng, có thể dùng lại link để resume session. Link sẽ không còn hợp lệ sau khi phỏng vấn hoàn tất.

### 4.6. Báo cáo (Reports)

| Phương thức | Endpoint | Mô tả | Phân quyền |
|---|---|---|---|
| `GET` | `/api/reports` | Liệt kê tất cả báo cáo (có phân trang) | HR |
| `GET` | `/api/reports/:applicationId` | Báo cáo đánh giá đầy đủ cho một đơn ứng tuyển | HR |

### 4.7. APIs Nội bộ (Chỉ Giao tiếp giữa các Dịch vụ, không qua Gateway)

| Phương thức | Endpoint | Dịch vụ | Mô tả |
|---|---|---|---|
| `POST` | `/internal/documents/parse` | RAG Service | Phân tích PDF, trả về văn bản thô |
| `POST` | `/internal/documents/query` | RAG Service | Tìm kiếm tương đồng với VectorDB |
| `GET` | `/internal/documents/:applicationId/status` | RAG Service | Kiểm tra trạng thái xử lý |

---

## 5. Thiết kế Hàng đợi Tin nhắn (Message Queue - RabbitMQ)

### Bố cục Exchange & Queue

```
Exchange: cv.events  (type: direct)
  ├── Queue: cv.uploaded   → Consumer: RAG Service
  └── Queue: cv.ready      → Consumer: Core Service

Exchange: interview.events  (type: direct)
  └── Queue: interview.completed → Consumer: Assessment Service

Exchange: notification.events  (type: direct)
  └── Queue: send.email → Consumer: Assessment Service (self)
      (Phân biệt loại email qua trường "type": "INVITE" | "REPORT")

Dead Letter Exchange: dlx.events
  ├── Queue: dlq.cv.uploaded
  ├── Queue: dlq.interview.completed
  └── Queue: dlq.send.email
```

---

### Luồng 1: HR Tải CV lên → Xử lý Tài liệu → Trích xuất Thông tin Ứng viên

```
[Core Service]
  POST /api/applications (HR upload CV)
  → Lưu tệp vào bộ nhớ
  → Tạo bản ghi Application (trạng thái: CV_PROCESSING, candidate_email/name: NULL)
  → Publish CV_UPLOADED_EVENT
       {
         application_id: "uuid",
         cv_file_path: "/storage/cv/abc.pdf",
         job_id: "uuid"
       }

[RAG Service] — consume CV_UPLOADED_EVENT
  → Tải xuống PDF
  → Trích xuất văn bản (Giai đoạn 1) / Tạo embeddings (Giai đoạn 2)
  → Trích xuất email và tên ứng viên từ văn bản CV bằng regex
  → Lưu vào VectorDB / Bảng Document
  → Publish CV_READY_EVENT
       {
         application_id: "uuid",
         status: "success" | "failed",
         chunk_count: 42,
         extracted_email: "candidate@email.com",
         extracted_name: "Nguyen Van A"
       }

[Core Service] — consume CV_READY_EVENT
  → Cập nhật trạng thái Application: READY_FOR_INTERVIEW | CV_PARSE_FAILED
  → Cập nhật candidate_email và candidate_name từ dữ liệu trích xuất
```

---

### Luồng 2: Phỏng vấn Hoàn tất → Đánh giá & Thông báo

```
[AI Service]
  POST /api/interviews/:sessionId/end
  → Cập nhật trạng thái session: COMPLETED
  → Đánh dấu magic_link_token đã sử dụng (is_link_used = TRUE qua HTTP tới Core Service)
  → Publish INTERVIEW_COMPLETED_EVENT
       {
         session_id: "uuid",
         application_id: "uuid",
         chat_history: [ {role, content, stage, timestamp}, ... ]
       }

[Assessment Service] — consume INTERVIEW_COMPLETED_EVENT
  → Chấm điểm ứng viên (dựa trên quy tắc hoặc LLM)
  → Tạo AssessmentReport trong MongoDB
  → Cập nhật trạng thái Application: COMPLETED (qua HTTP tới Core Service)
  → Publish SEND_EMAIL_EVENT
       {
         type: "REPORT",
         hr_email: "hr@company.com",
         candidate_name: "Nguyen Van A",
         job_title: "Backend Engineer",
         overall_score: 76,
         report_url: "https://app.com/reports/uuid",
         correlation_id: "uuid"
       }

[Assessment Service] — consume SEND_EMAIL_EVENT (chính nó)
  → Phân biệt loại email qua trường "type" (INVITE hoặc REPORT)
  → Gửi email qua Nodemailer / SendGrid
  → Ghi nhận kết quả vào collection EmailLog
```

---

### Luồng 4: HR Gửi Thư mời Phỏng vấn → Ứng viên Truy cập qua Magic Link

```
[Core Service]
  POST /api/applications/:id/invite (HR kích hoạt)
  → Kiểm tra trạng thái Application = READY_FOR_INTERVIEW
  → Tạo magic_link_token (UUID) và lưu vào bản ghi Application
  → Cập nhật trạng thái Application: INVITED
  → Publish SEND_EMAIL_EVENT
       {
         type: "INVITE",
         candidate_email: "candidate@email.com",
         candidate_name: "Nguyen Van A",
         job_title: "Backend Engineer",
         magic_link_url: "https://app.com/interview/{magic_link_token}",
         correlation_id: "uuid"
       }

[Assessment Service] — consume SEND_EMAIL_EVENT (type: INVITE)
  → Gửi email mời phỏng vấn chứa Magic Link tới ứng viên
  → Ghi nhận kết quả vào collection EmailLog

[Ứng viên]
  → Click Magic Link trong email
  → GET /interview/:token
  → AI Service xác thực token qua Core Service (HTTP nội bộ)
  → Nếu token hợp lệ và is_link_used = FALSE:
    → Tạo mới hoặc resume InterviewSession
    → Cập nhật trạng thái Application: IN_INTERVIEW
  → Nếu token không hợp lệ hoặc is_link_used = TRUE:
    → Trả về 403 Forbidden
```

---

### Luồng 3: Khôi phục Lỗi — Thử lại (Retry) & Dead Letter

```
SEND_EMAIL_EVENT
  ├─ Nỗ lực 1 → THẤT BẠI → đưa vào hàng đợi lại (độ trễ: 5s)
  ├─ Nỗ lực 2 → THẤT BẠI → đưa vào hàng đợi lại (độ trễ: 15s)
  ├─ Nỗ lực 3 → THẤT BẠI → đưa vào hàng đợi lại (độ trễ: 45s)
  └─ Nỗ lực 4 → THẤT BẠI → → DLQ (dlq.send.email)
                              → Ghi nhận lỗi (Log error)
                              → Cảnh báo on-call / dashboard
```

**Cấu hình RabbitMQ (mỗi hàng đợi):**
```json
{
  "x-dead-letter-exchange": "dlx.events",
  "x-message-ttl": 60000,
  "x-max-retries": 3
}
```

---

## 6. Xử lý Lỗi & Khả năng Phục hồi (Resilience)

### 6.1. Quy ước Lỗi HTTP

Tất cả các phản hồi REST đều tuân theo lớp bọc này:

```json
// Thành công
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100 }
}

// Lỗi
{
  "success": false,
  "error": {
    "code": "APPLICATION_NOT_FOUND",
    "message": "Không tìm thấy đơn ứng tuyển nào với id: abc-123",
    "details": null
  }
}
```

### 6.2. Circuit Breaker (Cầu dao điện) (AI Service → RAG Service)

Khi AI Service thực hiện lệnh gọi HTTP tới RAG Service để lấy ngữ cảnh:

| Trạng thái | Điều kiện | Hành vi |
|---|---|---|
| **Đóng (Closed)** | Hoạt động bình thường | Cho phép các yêu cầu đi qua |
| **Mở (Open)** | ≥ 3 lần thất bại trong 60s | Trả về phương án dự phòng (câu hỏi chung chung) trong 30s |
| **Nửa-Mở (Half-Open)** | Sau thời gian chờ 30s | Cho phép 1 yêu cầu đi qua; đóng nếu thành công |

**Hành vi dự phòng (Fallback):** AI Service trả về các câu hỏi phỏng vấn chung chung phù hợp với giai đoạn mà không có ngữ cảnh RAG.

**Thư viện:** `pybreaker` (Python) / `opossum` (Node.js)

### 6.3. Tóm tắt Chính sách Thử lại (Retry Policy)

| Kịch bản | Số lần thử lại | Thời gian trễ (Backoff) | Sau khi hết số lần thử lại tối đa |
|---|---|---|---|
| Lỗi phân tích PDF | 2 | Cố định 10s | Trạng thái: `CV_PARSE_FAILED` |
| Lỗi tạo Embedding | 3 | Cấp số nhân 5/15/45s | DLQ + trạng thái: `CV_PARSE_FAILED` |
| Hết thời gian chờ đánh giá (timeout) | 1 | Cố định 30s | DLQ + trạng thái: `PENDING_REVIEW` |
| Gửi email thất bại | 3 | Cấp số nhân 5/15/45s | DLQ + cảnh báo dashboard |

---

## 7. Khả năng Quan sát (Observability)

### 7.1. Logging có Cấu trúc (Structured Logging)

Mỗi mục nhật ký (log) là JSON với các trường nhất quán:

```json
{
  "timestamp": "2026-05-16T07:00:00Z",
  "level": "info",
  "service": "core-service",
  "correlation_id": "req-abc-123",
  "event": "application.created",
  "application_id": "uuid",
  "user_id": "uuid",
  "duration_ms": 42
}
```

**Thư viện:** Winston (Node.js) / Loguru (Python)

### 7.2. ID Tương quan (Correlation ID)

Mọi yêu cầu từ API Gateway được gắn thẻ `X-Correlation-ID`. Header này được:
- Chuyển tiếp tới tất cả các lệnh gọi HTTP của các dịch vụ tuyến dưới (downstream)
- Nhúng vào trong tất cả các payload (tải trọng) của tin nhắn RabbitMQ
- Đưa vào mỗi dòng log

Điều này cho phép theo dõi một hành động duy nhất của người dùng trên cả 4 dịch vụ và hàng đợi tin nhắn.

### 7.3. Kiểm tra Tình trạng (Health Checks)

Mỗi dịch vụ công khai:

```
GET /health → 200 OK
{
  "status": "healthy",
  "service": "core-service",
  "version": "1.0.0",
  "db": "connected",
  "uptime_seconds": 3600
}
```

Được sử dụng bởi Docker Compose `healthcheck` để tự động khởi động lại các container không khỏe mạnh.

### 7.4. Ngăn xếp Giám sát (Monitoring Stack) (Tùy chọn)

| Công cụ | Mục đích |
|---|---|
| Prometheus | Thu thập số liệu (tỷ lệ yêu cầu, tỷ lệ lỗi, độ trễ) |
| Grafana | Trực quan hóa Dashboard |
| Loki | Tập hợp log tập trung |
| RabbitMQ Management UI | Độ sâu hàng đợi, tỷ lệ tin nhắn, kiểm tra DLQ |

---

## 8. Triển khai (Deployment)

### Docker Compose Stack

```yaml
services:
  # ─── Hạ tầng (Infrastructure) ───────────────────────────
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: core_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mongodb:
    image: mongo:7
    volumes:
      - mongo_data:/data/db

  qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant_data:/qdrant/storage

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "15672:15672"   # Management UI

  # ─── Ứng dụng (Application) ──────────────────────────────
  api-gateway:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - core-service
      - ai-service
      - assessment-service

  core-service:
    build: ./core-service
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/core_db
      RABBITMQ_URL: amqp://rabbitmq:5672
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - rabbitmq
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 10s
      retries: 3

  ai-service:
    build: ./ai-service
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/ai_db
      RABBITMQ_URL: amqp://rabbitmq:5672
      RAG_SERVICE_URL: http://rag-service:3003
    depends_on:
      - rabbitmq
      - rag-service

  rag-service:
    build: ./rag-service
    environment:
      QDRANT_URL: http://qdrant:6333
      RABBITMQ_URL: amqp://rabbitmq:5672
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      - qdrant
      - rabbitmq

  assessment-service:
    build: ./assessment-service
    environment:
      MONGODB_URL: mongodb://mongodb:27017/assessment_db
      RABBITMQ_URL: amqp://rabbitmq:5672
      SMTP_HOST: ${SMTP_HOST}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    depends_on:
      - mongodb
      - rabbitmq

volumes:
  postgres_data:
  mongo_data:
  qdrant_data:
```

---

## 9. Cấu trúc Kho lưu trữ (Repository Structure)

```
ai-hr-recruiter/
├── docker-compose.yml
├── .env.example
├── README.md
│
├── api-gateway/
│   └── nginx.conf
│
├── core-service/              # Node.js + Express
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middlewares/
│   │   ├── events/            # RabbitMQ publishers & consumers
│   │   └── routes/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── Dockerfile
│   └── package.json
│
├── ai-service/                # Python + FastAPI
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── events/
│   │   ├── graph/             # LangGraph (Phase 2)
│   │   └── models/
│   ├── Dockerfile
│   └── requirements.txt
│
├── rag-service/               # Python + FastAPI
│   ├── app/
│   │   ├── routers/
│   │   ├── pipeline/          # Phân tích PDF → chia nhỏ (chunk) → embed
│   │   ├── events/
│   │   └── vector_store/
│   ├── Dockerfile
│   └── requirements.txt
│
├── assessment-service/        # Node.js hoặc Python
│   ├── src/
│   │   ├── scoring/           # Dựa trên quy tắc (Phase 1) / LLM (Phase 2)
│   │   ├── events/
│   │   ├── email/
│   │   └── reports/
│   ├── Dockerfile
│   └── package.json
│
└── docs/
    ├── ai_hr_recruiter_design_vi.md   ← tệp này
    └── api.postman_collection.json
```

---

## 10. Lộ trình Phát triển (Development Roadmap)

### Giai đoạn 1 (Phase 1) — Nền tảng (Foundation) (Tuần 1–3)

| Tuần | Nhiệm vụ (Tasks) |
|---|---|
| **Tuần 1** | Thiết lập hạ tầng Docker Compose · Core Service: Auth + User + CRUD Job |
| **Tuần 2** | Core Service: Đơn ứng tuyển (Application) + tải tệp lên · AI Service: Quản lý phiên + chat giả lập (mock chat) · RAG Service: Chỉ trích xuất văn bản PDF |
| **Tuần 3** | Assessment Service: Chấm điểm dựa trên quy tắc + email · Tích hợp MQ (cả 3 luồng) · API Gateway + JWT · Xử lý lỗi (thử lại, DLQ, cầu dao điện) |

### Giai đoạn 2 (Phase 2) — Tích hợp AI (Tuần 4–5)

| Tuần | Nhiệm vụ (Tasks) |
|---|---|
| **Tuần 4** | RAG Service: Pipeline Embedding + VectorDB + API tìm kiếm ngữ nghĩa |
| **Tuần 5** | AI Service: Máy trạng thái LangGraph + Câu hỏi được hỗ trợ bởi LLM · Assessment Service: Đánh giá dựa trên LLM |

### Giai đoạn 3 (Phase 3) — Hoàn thiện (Polish) (Tuần 6)

| Tuần | Nhiệm vụ (Tasks) |
|---|---|
| **Tuần 6** | Logging tập trung + ID Tương quan (Correlation ID) · Kiểm tra tình trạng (Health checks) + Dashboard Grafana · Kiểm thử end-to-end · Tài liệu |
