# STEP 10 — Web Client: Candidate Interview UI + Assessment Reports

## Trạng thái: ✅ DONE

## Mục tiêu
Xây giao diện phỏng vấn cho ứng viên (truy cập qua magic link, không cần login) với chat UI, và trang xem Assessment Reports cho HR. Hoàn thành toàn bộ frontend cho Phase 1.

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| PRD — Interview Session | Magic link flow, chat stages | [PRD.md](../PRD.md) § Feature: Interview Session |
| PRD — Assessment & Notification | Report content, scores | [PRD.md](../PRD.md) § Feature: Assessment & Notification |
| PRD — US-8, US-9, US-10, US-11 | User stories chi tiết | [PRD.md](../PRD.md) § US-8, US-9, US-10, US-11 |
| System Design — §4.5 | API spec: /api/interviews | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 4.5 |
| System Design — §4.6 | API spec: /api/reports | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 4.6 |
| System Design — §3.4 | Assessment report schema | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 3.4 |
| STEP-09 | Dashboard + shared components đã setup | [STEP-09.md](STEP-09.md) |

## Prerequisite
- ✅ STEP-09 (HR Dashboard) phải hoàn thành trước

## Tasks

### 10.1 — Interview API Service Layer
- [ ] Tạo `src/services/interviewService.ts`
  - `validateMagicLink(token)` → GET `/interview/:token`
  - `getSession(sessionId, token)` → session info + current stage
  - `sendMessage(sessionId, message, token)` → POST chat message, receive AI response
  - `getHistory(sessionId, token)` → full chat transcript
  - `endInterview(sessionId, token)` → end session
- [ ] Tạo `src/services/reportService.ts`
  - `getReports(page, limit)` → paginated report list
  - `getReportByApplicationId(applicationId)` → full report detail

### 10.2 — Magic Link Landing Page
- [ ] Tạo `src/pages/interview/InterviewLandingPage.tsx`
  - URL: `/interview/:token`
  - Validate magic link token qua API
  - Hiển thị: job title, company info, interview instructions
  - Button: "Start Interview" hoặc "Resume Interview"
  - Error states: invalid token (403), expired/used token (410), loading

### 10.3 — Chat Interview UI
- [ ] Tạo `src/pages/interview/InterviewChatPage.tsx`
  - Chat bubble layout (AI messages left, candidate right)
  - Message input area (textarea + send button)
  - Send on Enter (Shift+Enter for newline)
  - Auto-scroll to latest message
  - Typing indicator khi đợi AI response
- [ ] Tạo `src/components/ChatBubble.tsx`
  - Differentiate AI vs Candidate messages (color, alignment)
  - Timestamp display
  - Message appear animation (slide-in)
- [ ] Tạo `src/components/StageProgress.tsx`
  - Visual progress bar cho 5 interview stages
  - GREETING → EXPERIENCE_REVIEW → TECHNICAL_QUESTIONS → SCENARIO_QUESTIONS → CLOSING
  - Highlight current stage, completed stages

### 10.4 — Interview Completion Page
- [ ] Tạo `src/pages/interview/InterviewCompletePage.tsx`
  - Thank you message
  - Summary: number of questions answered, duration
  - "Your assessment is being generated" message
  - Branded, polished design

### 10.5 — Assessment Reports — HR View
- [ ] Tạo `src/pages/reports/ReportListPage.tsx`
  - Bảng danh sách reports với pagination
  - Columns: candidate name, job title, overall score, date, recommendation
  - Score color coding (green/yellow/red)
  - Click → report detail
- [ ] Tạo `src/pages/reports/ReportDetailPage.tsx`
  - Candidate info header
  - Score overview (4 dimensions: technical, communication, relevance, overall)
  - Radar chart hoặc bar chart cho scores (dùng CSS hoặc lightweight chart lib)
  - Strengths list (green badges)
  - Weaknesses list (red badges)
  - Recommendation badge (ADVANCE / HOLD / REJECT)
  - Summary text
  - Link to view full interview transcript

### 10.6 — Score Visualization
- [ ] Tạo `src/components/ScoreChart.tsx`
  - Radar chart hoặc horizontal bar chart
  - 4 dimensions: Technical, Communication, Relevance, Overall
  - Animated fill effect
  - Color gradient based on score value
- [ ] Tạo `src/components/RecommendationBadge.tsx`
  - ADVANCE_TO_NEXT_ROUND → green badge
  - HOLD_FOR_REVIEW → yellow badge
  - REJECT → red badge

### 10.7 — Error Pages + Empty States
- [ ] Tạo `src/pages/NotFoundPage.tsx` — 404 page
- [ ] Tạo `src/pages/TokenExpiredPage.tsx` — 410 Gone (magic link used)
- [ ] Tạo `src/pages/UnauthorizedPage.tsx` — 403 page
- [ ] Loading skeletons cho: interview chat, report detail, report list

### 10.8 — Verify
- [ ] Full interview flow qua UI: magic link → chat → completion
- [ ] Report list + detail hiển thị đúng dữ liệu
- [ ] Score chart render đúng
- [ ] Error pages hiển thị đúng cho các edge cases
- [ ] Responsive trên mobile (đặc biệt chat UI)
- [ ] 🎉 **Phase 1.5 (Frontend) HOÀN THÀNH!**

---

## Khi hoàn thành bước này
1. Đánh dấu tất cả tasks ở trên thành `[x]`
2. Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
3. Cập nhật [TASK.md](../TASK.md): STEP-10 → `✅ DONE`, STEP-11 → `🔄 NEXT`
4. 🎉 **Phase 1.5 (Frontend) HOÀN THÀNH!**
