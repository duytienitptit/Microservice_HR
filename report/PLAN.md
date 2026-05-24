# KẾ HOẠCH VIẾT BÁO CÁO DỰ ÁN AI HR RECRUITER

Tài liệu này dùng để theo dõi tiến độ viết tài liệu báo cáo kỹ thuật cho dự án **AI HR Recruiter**. Nội dung báo cáo sẽ được chia nhỏ thành các bước (Step) lưu trữ dưới dạng các file Markdown trong thư mục `report/` để các thành viên trong team dễ dàng đóng góp và kiểm duyệt trước khi gộp thành file HTML báo cáo tổng hợp.

---

## 📋 Trạng Thái Các Bước Viết Docs

| Bước | Tên Tài Liệu | Nội Dung Chính | Trạng Thái | File Liên Kết |
| :---: | :--- | :--- | :---: | :--- |
| **0** | **Kế hoạch viết Docs** | Khởi tạo cấu trúc thư mục và tài liệu kế hoạch | ✅ ĐÃ PHÊ DUYỆT | [PLAN.md](file:///Users/admin/01_Projects/Microservice/report/PLAN.md) |
| **1** | **Kiến trúc Microservices** | Nhập môn Microservices, Monolith vs Microservices, API Gateway (Nginx), RabbitMQ Async Giao tiếp | ✅ HOÀN THÀNH | [step1_architecture.md](file:///Users/admin/01_Projects/Microservice/report/step1_architecture.md) |
| **2** | **Cơ chế AI & RAG Pipeline** | RAG Pipeline, Vector Search (Qdrant), AI Service LangGraph, Gemini Scoring trong Assessment Service | ✅ HOÀN THÀNH | [step2_ai_rag.md](file:///Users/admin/01_Projects/Microservice/report/step2_ai_rag.md) |
| **3** | **Bảo mật & Giám sát** | Rate Limiting, Refresh Token Rotation, Prometheus, Grafana, Loki Centralized Logging | ✅ HOÀN THÀNH | [step3_security_monitoring.md](file:///Users/admin/01_Projects/Microservice/report/step3_security_monitoring.md) |
| **4** | **Kiểm thử & Vận hành** | Chiến lược Unit Test, Integration Test, E2E Automation Script, Hướng dẫn Docker Compose | ✅ HOÀN THÀNH | [step4_deployment.md](file:///Users/admin/01_Projects/Microservice/report/step4_deployment.md) |
| **5** | **Xuất Báo Cáo HTML** | Gộp các tài liệu trên thành file HTML duy nhất, thiết kế giao diện Light Mode, nhúng sơ đồ Mermaid động | ✅ HOÀN THÀNH | [project_report.html](file:///Users/admin/01_Projects/Microservice/report/project_report.html) |

---

## 🛠️ Quy Trình Phối Hợp Từng Bước

1. **Phê duyệt Kế hoạch:** Bạn xem xét kế hoạch này và phê duyệt đề xuất triển khai.
2. **Soạn thảo từng file Markdown:** Tôi sẽ viết chi tiết từng bước (Step 1, Step 2, Step 3, Step 4) và cập nhật trạng thái tại bảng trên thành `🔄 IN PROGRESS` -> `✅ DONE`. Sau khi hoàn thành một file, bạn sẽ kiểm duyệt nội dung.
3. **Tổng hợp và Chuyển đổi HTML:** Khi cả 4 file MD được duyệt hoàn toàn, tôi sẽ biên soạn một kịch bản gộp chúng lại thành `report/project_report.html`.
4. **Kiểm tra hiển thị:** Mở file HTML bằng trình duyệt để kiểm tra cấu trúc liên kết nội bộ, giao diện hiển thị code block và sơ đồ Mermaid.
