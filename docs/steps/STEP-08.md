# STEP 08 — Web Client: Project Setup + Design System + Auth Pages

## Trạng thái: ✅ DONE

## Mục tiêu
Scaffold dự án Vite + React (TypeScript) tại `web-client/`, thiết lập design system premium với dark mode và glassmorphism, xây dựng Layout Shell, và implement luồng Authentication (Login/Register) kết nối API thật.

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| PRD — HR Authentication | Acceptance criteria cho Login/Register | [PRD.md](../PRD.md) § Feature: HR Authentication |
| PRD — US-1, US-2 | User stories: HR Registration, HR Login | [PRD.md](../PRD.md) § US-1, US-2 |
| System Design — §4.1 | API spec: Auth endpoints | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 4.1 |
| System Design — §4.2 | API spec: User profile endpoints | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 4.2 |
| Architecture | Immutable constraints | [architecture.md](../../.agents/rules/architecture.md) |
| Code Standards | Response envelope format | [code-standards.md](../../.agents/rules/code-standards.md) |

## Prerequisite
- ✅ STEP-07 (Integration — API Gateway + E2E Test) phải hoàn thành trước
- ✅ Toàn bộ Phase 1 backend hoạt động end-to-end

## Tasks

### 8.1 — Project Scaffold
- [x] Tạo project Vite + React + TypeScript tại `web-client/`
  - `npx create-vite web-client --template react-ts`
  - Cài đặt dependencies: `react-router-dom`, `axios`
  - Setup folder structure:
    ```
    web-client/src/
    ├── components/     # Reusable UI components
    ├── pages/          # Page-level components
    ├── layouts/        # Layout shells
    ├── hooks/          # Custom React hooks
    ├── contexts/       # React Context providers
    ├── services/       # API client layer
    ├── utils/          # Helper functions
    ├── styles/         # CSS files + design tokens
    └── types/          # TypeScript type definitions
    ```

### 8.2 — Design System + CSS Tokens
- [x] Tạo `src/styles/tokens.css` — CSS custom properties:
  - Color palette (HSL-based, dark mode ready)
  - Typography scale (Google Fonts: Inter hoặc Outfit)
  - Spacing scale (4px base unit)
  - Border radius, shadows, transitions
  - Glassmorphism utilities (backdrop-filter, translucent backgrounds)
- [x] Tạo `src/styles/reset.css` — CSS reset + base styles
- [x] Tạo `src/styles/animations.css` — micro-animations (fade-in, slide-up, pulse)
- [x] Tạo `src/styles/components.css` — shared component styles (buttons, inputs, cards, badges)

### 8.3 — Layout Shell
- [x] Tạo `src/layouts/DashboardLayout.tsx`
  - Sidebar navigation (collapsible)
  - Top header với user info + logout
  - Main content area
  - Responsive: sidebar → hamburger menu trên mobile
- [x] Tạo `src/layouts/PublicLayout.tsx`
  - Layout cho trang public (login, register, interview)
  - Centered content, branded background

### 8.4 — Auth Pages
- [x] Tạo `src/pages/LoginPage.tsx`
  - Form: email + password
  - Validation (client-side)
  - Kết nối `POST /api/auth/login`
  - Error handling (wrong credentials, server error)
  - Redirect to dashboard on success
- [x] Tạo `src/pages/RegisterPage.tsx`
  - Form: full_name + email + password + confirm password
  - Kết nối `POST /api/auth/register`
  - Redirect to login on success

### 8.5 — Auth Context + Protected Routes
- [x] Tạo `src/contexts/AuthContext.tsx`
  - Manage JWT tokens (accessToken + refreshToken)
  - Store in localStorage (hoặc httpOnly cookie nếu proxy)
  - Auto-refresh accessToken trước khi hết hạn
  - Expose: `user`, `login()`, `logout()`, `isAuthenticated`
- [x] Tạo `src/components/ProtectedRoute.tsx`
  - Redirect to `/login` nếu chưa authenticated
  - Wrap tất cả HR pages

### 8.6 — API Client Layer
- [x] Tạo `src/services/apiClient.ts`
  - Axios instance với base URL (proxy qua Vite dev server hoặc direct)
  - Request interceptor: attach Bearer token
  - Response interceptor: auto-refresh on 401
  - Error parsing theo response envelope format
- [x] Tạo `src/services/authService.ts`
  - `login(email, password)`
  - `register(fullName, email, password)`
  - `refreshToken()`
  - `logout()`
  - `getProfile()`

### 8.7 — Router Setup
- [x] Tạo `src/App.tsx` với React Router:
  - `/login` → LoginPage (PublicLayout)
  - `/register` → RegisterPage (PublicLayout)
  - `/dashboard` → DashboardPage (DashboardLayout, protected)
  - `/jobs/*` → Job pages (DashboardLayout, protected)
  - `/applications/*` → Application pages (DashboardLayout, protected)
  - `/reports/*` → Report pages (DashboardLayout, protected)
  - `/interview/:token` → Interview pages (PublicLayout)
  - `*` → 404 NotFound page

### 8.8 — Docker Integration
- [x] Tạo `web-client/Dockerfile` (multi-stage: build + nginx serve)
- [x] Cập nhật `docker-compose.yml`: thêm `web-client` service
- [x] Cập nhật `api-gateway/nginx.conf`: route `/` → web-client

### 8.9 — Verify
- [x] Login/Register hoạt động end-to-end qua UI
- [x] Protected routes redirect đúng khi chưa login
- [x] Token refresh hoạt động tự động
- [x] Responsive layout hiển thị đúng trên mobile
- [x] `docker compose up` khởi động web-client cùng với backend

---

## Khi hoàn thành bước này
1. Đánh dấu tất cả tasks ở trên thành `[x]`
2. Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
3. Cập nhật [TASK.md](../TASK.md): STEP-08 → `✅ DONE`, STEP-09 → `🔄 NEXT`
