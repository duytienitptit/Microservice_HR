# PHẦN 4: KIỂM THỬ & VẬN HÀNH (TESTING & OPERATIONS)

Chào mừng các bạn dev! Khi phát triển một ứng dụng Monolith, việc kiểm thử thường khá trực diện: bạn chạy một DB cục bộ, khởi động ứng dụng và chạy các bộ kiểm thử hoặc click tay trên giao diện. Tuy nhiên, khi chuyển sang kiến trúc **Microservices**, mọi thứ trở nên phức tạp hơn rất nhiều:
1.  Các dịch vụ phụ thuộc chéo lẫn nhau thông qua mạng (HTTP hoặc RabbitMQ).
2.  Việc cài đặt môi trường phát triển đòi hỏi phải chạy đồng thời hàng chục container (App, Database, Queue, RAG Store, Monitoring).
3.  Làm sao để viết Unit Test cho một service mà không cần khởi chạy các service còn lại?

Trong tài liệu này, chúng ta sẽ khám phá chi tiết cách hệ thống **AI HR Recruiter** được thiết kế để giải quyết bài toán **Kiểm thử (Testing)** và **Vận hành (Operations)** một cách chuyên nghiệp và tự động.

---

## 1. Chiến Lược Kiểm Thử Trong Mô Hình Microservices (Testing Strategy)

Chúng ta chia chiến lược kiểm thử làm 3 cấp độ:
*   **Unit Test (Kiểm thử đơn vị):** Kiểm thử logic nghiệp vụ cô lập của một Service hoặc Class. Mọi giao tiếp ra ngoài (gọi DB, gọi REST API sang service khác) đều được **Mock** hoàn toàn.
*   **Integration Test (Kiểm thử tích hợp):** Kiểm thử sự phối hợp giữa router, middleware và database cục bộ của chính service đó.
*   **End-to-End (E2E) Test (Kiểm thử toàn trình):** Kiểm thử luồng nghiệp vụ hoàn chỉnh của toàn bộ hệ thống từ client đi qua API Gateway đến các microservice.

### 1.1. Kiểm thử trong Node.js (Jest + Supertest)

Với các dịch vụ viết bằng Node.js/TypeScript (`core-service` và `assessment-service`), chúng ta sử dụng **Jest** làm test runner và **Supertest** để giả lập các HTTP request trực tiếp vào Express app mà không cần khởi động server thật qua cổng TCP.

Để đảm bảo các bài test chạy nhanh và không bị ô nhiễm dữ liệu, toàn bộ các Repository kết nối cơ sở dữ liệu đều được Mock.

#### Ví dụ kiểm thử tích hợp Router & Middleware đăng ký với Supertest:
```typescript
// File: core-service/tests/integration/auth.test.ts

// 1. Mock Prisma Client và AuthRepository trước khi import App để tránh kết nối DB thật
jest.mock('../../src/repositories/prismaClient', () => ({
  __esModule: true,
  default: {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $on: jest.fn(),
  },
}));

jest.mock('../../src/repositories/authRepository', () => ({
  userRepository: {
    findByEmail: jest.fn(),
    create: jest.fn(),
  },
}));

import request from 'supertest';
import app from '../../src/app';
import { userRepository } from '../../src/repositories/authRepository';

const MOCK_USER = {
  id: 'user-uuid-1',
  email: 'hr@example.com',
  passwordHash: 'hashed_password',
  fullName: 'HR Manager',
  role: 'HR' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/auth/register', () => {
  afterEach(() => jest.clearAllMocks());

  it('trả về 201 cùng dữ liệu user khi đăng ký thành công', async () => {
    // Thiết lập hành vi giả lập cho repository
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    (userRepository.create as jest.Mock).mockResolvedValue(MOCK_USER);

    // Dùng Supertest để gọi API giả lập
    const res = await request(app)
      .post('/api/auth/register')
      .send({ 
        email: 'hr@example.com', 
        password: 'password123', 
        fullName: 'HR Manager', 
        role: 'HR' 
      });

    // Kiểm tra kết quả
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('hr@example.com');
  });

  it('trả về 400 nếu thiếu trường bắt buộc (Middleware Validation hoạt động)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' }); // Thiếu password và fullName

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### 1.2. Kiểm thử trong Python (Pytest + HTTPX + SQLAlchemy Mocking)

Với các dịch vụ viết bằng Python/FastAPI (`ai-service` và `rag-service`), chúng ta sử dụng **Pytest** và thư viện bất đồng bộ **Pytest-asyncio**.

#### Sử dụng Database In-Memory SQLite cho Integration Test:
Để test các câu lệnh SQL mà không cần cài đặt Postgres test riêng, chúng ta cấu hình Pytest sử dụng **SQLite in-memory** bất đồng bộ (`sqlite+aiosqlite:///:memory:`). Mỗi khi chạy test, SQLite sẽ tự động khởi tạo bảng cấu trúc từ SQLAlchemy Base và tự động hủy bỏ khi test xong, giúp môi trường kiểm thử cực kỳ sạch sẽ và độc lập.

```python
# File: ai-service/tests/conftest.py

import os
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database import Base

# Ghi đè biến môi trường Database sang SQLite In-Memory trước khi import App
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def db_engine():
    """Tạo engine SQLite in-memory cho môi trường test."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all) # Tạo cấu trúc bảng
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture
async def db_session(db_engine):
    """Cung cấp một phiên DB session độc lập cho từng ca test."""
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
```

#### Mock giao tiếp HTTP gọi chéo giữa các Microservices:
Trong `ai-service`, khi candidate gửi một mã token Magic Link để vào phỏng vấn, `ai-service` cần gọi HTTP POST sang `core-service` để xác thực token. Để test độc lập `ai-service`, chúng ta mock thư viện HTTP Client **HTTPX** để giả lập các kết quả trả về từ `core-service` (thành công, hết hạn, hoặc sập kết nối):

```python
# File: ai-service/tests/test_auth_service.py

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
from fastapi import HTTPException
from app.services.auth_service import validate_magic_token

@pytest.mark.asyncio
async def test_validate_token_success():
    """Test trường hợp token hợp lệ, trả về thông tin ứng viên."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "success": True,
        "data": {
            "application_id": "test-app-id",
            "candidate_name": "John Doe",
            "job_title": "Backend Engineer",
        },
    }

    # Patch AsyncClient của HTTPX để trả về mock response tự định nghĩa
    with patch("app.services.auth_service.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await validate_magic_token("valid-token", "test-corr-id")

        assert result["application_id"] == "test-app-id"
        assert result["candidate_name"] == "John Doe"

@pytest.mark.asyncio
async def test_validate_token_core_service_unavailable():
    """Test khả năng phòng vệ: Khi Core Service bị sập mạng (ConnectError)"""
    with patch("app.services.auth_service.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        # Giả lập lỗi mất kết nối mạng
        mock_client.post.side_effect = httpx.ConnectError("Connection refused")
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        # Kiểm tra xem AI Service có chuyển thành lỗi 502 Bad Gateway hay không
        with pytest.raises(HTTPException) as exc_info:
            await validate_magic_token("any-token", "test-corr-id")
        assert exc_info.value.status_code == 502
```

---

## 2. Kịch Bản Kiểm Thử Toàn Trình Tự Động (E2E Integration Testing)

Để đảm bảo toàn bộ hệ thống phối hợp nhịp nhàng sau mỗi lần thay đổi mã nguồn, chúng ta xây dựng một script kiểm thử tự động toàn trình (End-to-End) bằng Python tại [run_e2e.py](file:///Users/admin/01_Projects/Microservice/scratch/run_e2e.py). 

Script này giả lập đầy đủ vai trò của cả **HR Recruiter** và **Candidate**, thực hiện một chu trình tuyển dụng khép kín:

```mermaid
sequenceDiagram
    autonumber
    actor HR as HR Recruiter (E2E)
    actor Can as Candidate (E2E)
    participant GW as API Gateway (Nginx)
    participant CS as Core Service
    participant RAG as RAG Service
    participant AI as AI Service
    participant AS as Assessment Service

    Note over HR, AS: [Bước 0] Tạo CV PDF ảo
    HR->>GW: Đăng ký & Đăng nhập tài khoản HR mới
    GW->>CS: Xác thực thông tin & Trả về JWT Token
    HR->>GW: Đăng tuyển Job & Upload file CV PDF ứng viên
    GW->>CS: Lưu CV -> Gửi sự kiện CV_UPLOADED (RabbitMQ)
    Note over CS, RAG: Xử lý RAG bất đồng bộ qua RabbitMQ
    RAG->>CS: Gửi sự kiện CV_READY -> Cập nhật trạng thái READY_FOR_INTERVIEW
    Note over HR: [Polling] Chờ trạng thái hồ sơ đổi sang READY_FOR_INTERVIEW
    HR->>GW: Bấm gửi thư mời phỏng vấn
    GW->>CS: Sinh ra magicLinkToken
    Note over Can: [Nhận Token] Giả lập ứng viên click link
    Can->>GW: Truy cập link phỏng vấn (/api/interview/{token})
    GW->>AI: Khởi tạo phiên phỏng vấn (LangGraph) -> Trả về Greeting chào mừng
    loop 3 lượt Chat (Simulated Turns)
        Can->>GW: Gửi câu trả lời phỏng vấn
        GW->>AI: Đưa tin nhắn vào LangGraph -> AI phân tích phản hồi tiếp
    end
    Can->>GW: Bấm kết thúc buổi phỏng vấn (/end)
    GW->>AI: Đóng phiên -> Gửi sự kiện INTERVIEW_COMPLETED (RabbitMQ)
    Note over AI, AS: Assessment Service nhận event, chấm điểm qua Gemini & Lưu MongoDB
    Note over HR: [Polling] Đợi báo cáo phỏng vấn xuất hiện
    HR->>GW: Xem báo cáo đánh giá và điểm số (/api/reports/{id})
    GW->>AS: Trả về Báo cáo chi tiết & Điểm đánh giá (Overall, Tech, Comm)
```

### Các đoạn mã cốt lõi trong Script E2E:

#### 1. Lan truyền Correlation ID để theo dõi vết lỗi:
Trong E2E script, mọi request gửi đi đều được tự động gắn một mã UUID ngẫu nhiên làm `X-Correlation-ID`. Nhờ vậy, nếu kịch bản E2E bị lỗi ở bước nào, chúng ta chỉ cần tra cứu mã này trên Grafana/Loki để tìm ra nguyên nhân ngay lập tức.
```python
# Trích đoạn run_e2e.py: Hàm wrapper gửi HTTP request
def send_request(path, method="GET", data=None, headers=None, content_type="application/json"):
    url = f"{BASE_URL}{path}"
    if headers is None:
        headers = {}
    
    # Sinh và lan truyền Correlation ID
    corr_id = str(uuid.uuid4())
    headers["X-Correlation-ID"] = corr_id
    
    if data is not None:
        if isinstance(data, dict):
            req_data = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        else:
            req_data = data
            headers["Content-Type"] = content_type

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    # Bỏ qua xác thực chứng chỉ SSL tự ký (Self-signed) của môi trường Dev
    import ssl
    context = ssl._create_unverified_context()
    try:
        with urllib.request.urlopen(req, context=context) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body), response.status
    except urllib.error.HTTPError as e:
        # Trả về mã lỗi từ server
        return json.loads(e.read().decode("utf-8")), e.code
```

#### 2. Giả lập Upload File CV (Multipart Form Data):
Vì script E2E chạy độc lập bằng Python thuần (không dùng thư viện bên ngoài như `requests` để đảm bảo có thể chạy ở mọi môi trường), chúng ta tự viết hàm mã hóa dữ liệu multipart để tải file PDF lên:
```python
# Trích đoạn run_e2e.py: Tạo payload Multipart Form-data
def encode_multipart_formdata(fields, files):
    boundary = b'----WebKitFormBoundaryE2ETestBoundary'
    lines = []
    # Thêm các trường text thường
    for name, value in fields.items():
        lines.append(b'--' + boundary)
        lines.append(f'Content-Disposition: form-data; name="{name}"'.encode('utf-8'))
        lines.append(b'')
        lines.append(str(value).encode('utf-8'))
    # Thêm file nhị phân (PDF CV)
    for name, filepath in files.items():
        filename = os.path.basename(filepath)
        lines.append(b'--' + boundary)
        lines.append(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"'.encode('utf-8'))
        lines.append(b'Content-Type: application/pdf')
        lines.append(b'')
        with open(filepath, 'rb') as f:
            lines.append(f.read())
    lines.append(b'--' + boundary + b'--')
    lines.append(b'')
    body = b'\r\n'.join(lines)
    content_type = f'multipart/form-data; boundary={boundary.decode("utf-8")}'
    return content_type, body
```

---

## 3. Điều Phối Hệ Thống Với Docker Compose (Docker Orchestration)

Để vận hành toàn bộ hệ thống gồm 10 dịch vụ (5 dịch vụ nghiệp vụ và 5 dịch vụ hạ tầng/giám sát) một cách trơn tru trên máy cục bộ của lập trình viên, chúng ta sử dụng công cụ **Docker Compose**.

Tập tin [docker-compose.yml](file:///Users/admin/01_Projects/Microservice/docker-compose.yml) được cấu hình tối ưu với các cơ chế:

### 3.1. Đồng bộ thứ tự khởi động (Service Dependencies & Healthchecks)
Một trong những lỗi kinh điển khi khởi chạy microservice bằng Docker Compose là: **Service khởi động và cố kết nối với Database hoặc RabbitMQ khi các hạ tầng này chưa sẵn sàng nhận kết nối**, dẫn đến container bị crash liên tục.

Chúng ta giải quyết triệt để lỗi này bằng cách cấu hình `healthcheck` cho hạ tầng và ràng buộc điều kiện khởi động `depends_on` với trạng thái `service_healthy`.

#### Cách thức khai báo trong `docker-compose.yml`:
```yaml
services:
  # ─── Hạ tầng Cơ sở ──────────────────────────────────────
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: core_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      # Kiểm tra xem Postgres thực sự đã sẵn sàng nhận kết nối hay chưa
      test: ["CMD-SHELL", "pg_isready -U user -d core_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management
    healthcheck:
      # Dùng công cụ chẩn đoán có sẵn của RabbitMQ
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── Dịch vụ Nghiệp vụ ──────────────────────────────────
  core-service:
    build: ./core-service
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/core_db
      RABBITMQ_URL: amqp://rabbitmq:5672
    depends_on:
      # Core Service CHỈ khởi chạy khi Postgres và RabbitMQ đã HEALTHY hoàn toàn
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 10s
      timeout: 5s
      retries: 3
```

### 3.2. Phân vùng Mạng và Lưu trữ dữ liệu (Networks & Volumes)
*   **Mạng biệt lập (Isolated Network):** Theo mặc định, Docker Compose tự động tạo một mạng chung cho tất cả các dịch vụ. Nhờ vậy, `ai-service` có thể dễ dàng giao tiếp với `core-service` thông qua DNS nội bộ của Docker: `http://core-service:3001` thay vì phải cấu hình cứng địa chỉ IP.
*   **Chia sẻ dữ liệu tập tin (Shared Volumes):**
    *   `cv_storage`: Dùng chung giữa `core-service` (nơi nhận file upload) và `rag-service` (nơi đọc file PDF để phân tích text và tạo vector embeddings).
    *   `app_logs`: Toàn bộ các service ghi log JSON vào volume này để Promtail có thể truy cập và thu gom đẩy về Loki.
    *   `postgres_data` & `mongo_data` & `qdrant_data`: Giúp bảo toàn dữ liệu ứng dụng không bị mất đi mỗi khi container bị khởi động lại hoặc build lại.

---

## 4. Tóm Tắt & Best Practices Vận Hành Cho Web Developer

1.  **Luôn viết Healthcheck cho mọi Container:** Đừng bao giờ bỏ trống mục `healthcheck` trong file `docker-compose.yml`. Một container có cổng TCP đã mở chưa chắc logic bên trong đã hoạt động tốt (ví dụ mất kết nối DB ngầm).
2.  **Mock các kết nối mạng khi chạy Unit Test:** Tốc độ chạy unit test là yếu tố then chốt. Hãy mock triệt để các lệnh gọi API HTTP bằng `httpx` mock hoặc `nock` (Node.js) để bộ test có thể chạy xong dưới 5 giây mà không cần mạng Internet.
3.  **Tự động hóa E2E định kỳ:** E2E test là tấm khiên vững chắc nhất chống lại lỗi hồi quy (regression bugs). Hãy tích hợp file chạy kịch bản E2E (như `run_e2e.py`) vào luồng **CI/CD** (GitHub Actions, GitLab CI) để tự động chạy kiểm thử trước mỗi lần merge code lên nhánh chính.
4.  **Sử dụng Database cô lập (SQLite/InMemory) cho Integration Test:** Đừng dùng chung database phát triển (Development DB) để chạy test tích hợp. Việc tạo và xóa dữ liệu ngẫu nhiên của các ca test sẽ làm bẩn dữ liệu chạy thử của bạn.
