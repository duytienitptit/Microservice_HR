# STEP 13 — Assessment Service: LLM-Based Scoring with Reasoning

## Trạng thái: ✅ DONE

## Mục tiêu
Nâng cấp Assessment Service từ rule-based scoring (Phase 1) sang LLM-based evaluation. LLM phân tích interview transcript, cho điểm theo rubric, cung cấp reasoning chi tiết và citations từ cuộc phỏng vấn.

## Context — Đọc trước khi code

| Tài liệu | Mục đích | Đường dẫn |
|-----------|----------|-----------|
| System Design — §3.4 | Assessment Service, scoring dimensions, report schema | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 3.4 |
| System Design — §5 Luồng 2 | Interview Completed → Assessment flow | [ai_hr_recruiter_design.md](../ai_hr_recruiter_design.md) § 5 Luồng 2 |
| PRD — Phase 2 | LLM-based scoring with reasoning | [PRD.md](../PRD.md) § Phase 2 |
| Assessment Service GEMINI | Service-specific context | [GEMINI.md](../../assessment-service/GEMINI.md) |
| Event Contracts | INTERVIEW_COMPLETED payload | [event-contracts.md](../../.agents/rules/event-contracts.md) |
| STEP-12 | LLM-powered interview đã hoạt động | [STEP-12.md](STEP-12.md) |

## Prerequisite
- ✅ STEP-12 (AI Service LangGraph) phải hoàn thành trước
- ✅ Phase 1 rule-based scoring đang hoạt động
- ✅ INTERVIEW_COMPLETED events chứa full chat history

## Tasks

### 13.1 — LLM Scoring Module
- [ ] Tạo `src/scoring/llmScorer.ts` (hoặc `llm_scorer.py` nếu Python)
  - Abstract interface `BaseScorer` — shared giữa rule-based và LLM
  - `score(chatHistory, jobDescription)` → assessment result
  - Config flag: `USE_LLM_SCORING=true/false`
  - Fallback: nếu LLM fails, tự động switch về rule-based scorer

### 13.2 — Scoring Prompt Engineering
- [ ] Tạo `src/scoring/prompts.ts`
  - System prompt: "You are an expert HR assessor..."
  - Rubric per dimension:
    - `technical_score` (0-100): đánh giá technical knowledge
    - `communication_score` (0-100): clarity, structure, articulation
    - `relevance_score` (0-100): alignment với JD requirements
    - `overall_score` (0-100): weighted composite
  - Output format: structured JSON
  - Include: scoring guidelines, examples of high/low scores

### 13.3 — Citation Extraction
- [ ] LLM prompt yêu cầu trích dẫn cụ thể từ interview transcript
  - Mỗi score dimension kèm theo 1-3 citations
  - Citation format: `{ quote, stage, relevance }`
  - Verify citations thực sự tồn tại trong transcript (validation)

### 13.4 — Enhanced Report Schema
- [ ] Cập nhật MongoDB report schema:
  ```json
  {
    "scores": { "technical": 75, ... },
    "reasoning": {
      "technical": "Candidate demonstrated strong REST API knowledge...",
      "communication": "Clear and structured responses...",
      "relevance": "Good alignment with backend requirements..."
    },
    "citations": [
      { "quote": "I have 3 years experience with...", "stage": "EXPERIENCE_REVIEW", "dimension": "technical" }
    ],
    "detailed_feedback": "Overall assessment paragraph...",
    "scoring_method": "LLM" | "RULE_BASED"
  }
  ```
- [ ] Migration: reports cũ vẫn đọc được (backward compatible)

### 13.5 — Update INTERVIEW_COMPLETED Consumer
- [ ] Cập nhật consumer để sử dụng LLM scorer
  - Check `USE_LLM_SCORING` config
  - Gọi LLM scorer → nếu fail → fallback rule-based
  - Lưu `scoring_method` trong report
  - Logging: thời gian scoring, method used

### 13.6 — Update Report API
- [ ] Cập nhật `GET /api/reports/:applicationId`
  - Trả về thêm: `reasoning`, `citations`, `detailed_feedback`, `scoring_method`
  - Backward compatible: reports cũ không có fields mới → return null

### 13.7 — Update Frontend Report UI
- [ ] Cập nhật `ReportDetailPage.tsx`
  - Hiển thị reasoning per dimension
  - Hiển thị citations với highlight
  - Hiển thị detailed_feedback paragraph
  - Badge: "AI-Scored" vs "Rule-Based"

### 13.8 — Unit Tests
- [ ] Test LLM scorer (mock LLM response)
- [ ] Test prompt rendering với chat history
- [ ] Test citation validation
- [ ] Test fallback: LLM fails → rule-based works
- [ ] Test enhanced report schema

### 13.9 — Integration Tests
- [ ] Test full flow: interview completed → LLM scoring → report saved
- [ ] Test report API returns enhanced fields
- [ ] Test backward compatibility (old reports still readable)

### 13.10 — Verify
- [ ] Chạy toàn bộ test suite — tất cả pass
- [ ] LLM scoring produces richer reports than rule-based
- [ ] Citations reference actual interview content
- [ ] Fallback hoạt động khi LLM unavailable
- [ ] Frontend hiển thị enhanced report đúng
- [ ] 🎉 **Phase 2 (AI Integration) HOÀN THÀNH!**

---

## Khi hoàn thành bước này
1. Đánh dấu tất cả tasks ở trên thành `[x]`
2. Cập nhật trạng thái đầu file: `## Trạng thái: ✅ DONE`
3. Cập nhật [TASK.md](../TASK.md): STEP-13 → `✅ DONE`, STEP-14 → `🔄 NEXT`
4. 🎉 **Phase 2 (AI Integration) HOÀN THÀNH!**
