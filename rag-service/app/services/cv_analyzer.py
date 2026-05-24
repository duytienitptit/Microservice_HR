import json
import uuid
import google.generativeai as genai
from app.database import get_db_context
from app.config import settings
from app.utils.logger import logger


class DocumentNotFoundError(Exception):
    """Raised when no document is found for the given application_id."""
    pass


def _build_prompt(raw_text: str, job_title: str | None, job_requirements: str | None) -> str:
    """Build the Gemini prompt for CV analysis."""
    job_context = ""
    match_instruction = ""

    if job_title or job_requirements:
        job_parts = []
        if job_title:
            job_parts.append(f"Vị trí tuyển dụng: {job_title}")
        if job_requirements:
            job_parts.append(f"Yêu cầu công việc:\n{job_requirements}")
        job_context = "\n".join(job_parts)
        match_instruction = """
- "match_score": Điểm phù hợp từ 0-100 dựa trên mức độ phù hợp của ứng viên với vị trí tuyển dụng.
- "match_highlights": Danh sách các điểm nổi bật phù hợp với yêu cầu công việc (bằng tiếng Việt).
- "concerns": Danh sách các điểm lo ngại hoặc thiếu sót so với yêu cầu công việc (bằng tiếng Việt)."""
    else:
        match_instruction = """
- "match_score": null (không có thông tin vị trí tuyển dụng để đánh giá).
- "match_highlights": [] (mảng rỗng).
- "concerns": [] (mảng rỗng)."""

    prompt = f"""Bạn là chuyên gia phân tích CV/hồ sơ ứng viên. Hãy phân tích CV dưới đây và trả về kết quả dưới dạng JSON.

{f"--- THÔNG TIN VỊ TRÍ TUYỂN DỤNG ---{chr(10)}{job_context}{chr(10)}" if job_context else ""}
--- NỘI DUNG CV ---
{raw_text}
--- HẾT CV ---

Trả về ĐÚNG một JSON object (không có markdown, không có giải thích thêm) với cấu trúc sau:
{{
  "summary": "Tóm tắt ngắn gọn về ứng viên bằng tiếng Việt",
  "skills": ["Kỹ năng 1", "Kỹ năng 2"],
  "experience": [
    {{"company": "Tên công ty", "role": "Vị trí", "duration": "Thời gian"}}
  ],
  "education": [
    {{"school": "Tên trường", "degree": "Bằng cấp", "year": "Năm"}}
  ],
  "languages": ["Ngôn ngữ 1", "Ngôn ngữ 2"],
  "match_score": 78,
  "match_highlights": ["Điểm phù hợp 1"],
  "concerns": ["Điểm lo ngại 1"]
}}

Yêu cầu chi tiết:
- "summary": Tóm tắt ngắn gọn bằng tiếng Việt về kinh nghiệm, kỹ năng chính và điểm mạnh của ứng viên.
- "skills": Danh sách các kỹ năng kỹ thuật và mềm được đề cập trong CV.
- "experience": Danh sách kinh nghiệm làm việc, mỗi mục gồm company, role, duration.
- "education": Danh sách học vấn, mỗi mục gồm school, degree, year.
- "languages": Danh sách ngôn ngữ mà ứng viên sử dụng.
{match_instruction}

CHỈ trả về JSON, không có text khác."""

    return prompt


def _build_fallback_analysis(
    raw_text: str,
    job_title: str | None,
    job_requirements: str | None,
) -> dict:
    """Return a minimal analysis when LLM call fails."""
    text_preview = raw_text[:500] if raw_text else ""
    return {
        "summary": f"Không thể phân tích CV tự động. Nội dung CV: {text_preview}...",
        "skills": [],
        "experience": [],
        "education": [],
        "languages": [],
        "match_score": None,
        "match_highlights": [],
        "concerns": ["Phân tích tự động thất bại — cần xem xét thủ công"],
    }


async def analyze_cv(
    application_id: str,
    job_title: str | None = None,
    job_requirements: str | None = None,
) -> dict:
    """
    Analyze a CV for the given application_id.

    1. Check cv_analyses cache — return cached result if found.
    2. Look up raw_text from the documents table.
    3. Call Google Gemini to produce a structured analysis.
    4. Cache the result in cv_analyses.
    5. Return the analysis dict.
    """

    # ── 1. Check cache ──────────────────────────────────────
    async with get_db_context() as db:
        cursor = await db.execute(
            "SELECT analysis_json FROM cv_analyses WHERE application_id = ?",
            (application_id,),
        )
        row = await cursor.fetchone()
        if row:
            logger.info(
                "Returning cached CV analysis",
                application_id=application_id,
            )
            return json.loads(row[0])

    # ── 2. Fetch raw_text from documents ────────────────────
    async with get_db_context() as db:
        cursor = await db.execute(
            "SELECT raw_text FROM documents WHERE application_id = ? AND type = 'CV'",
            (application_id,),
        )
        row = await cursor.fetchone()

    if not row or not row[0]:
        raise DocumentNotFoundError(
            f"No CV document found for application_id: {application_id}"
        )

    raw_text: str = row[0]

    # ── 3. Call Gemini API ──────────────────────────────────
    analysis: dict | None = None
    try:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured")

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")

        prompt = _build_prompt(raw_text, job_title, job_requirements)
        response = model.generate_content(prompt)

        response_text = response.text.strip()
        # Strip markdown fences if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first line (```json) and last line (```)
            lines = [l for l in lines if not l.strip().startswith("```")]
            response_text = "\n".join(lines)

        analysis = json.loads(response_text)
        logger.info(
            "CV analysis completed via Gemini",
            application_id=application_id,
            match_score=analysis.get("match_score"),
        )
    except Exception as e:
        logger.error(
            f"Gemini CV analysis failed: {str(e)}",
            application_id=application_id,
        )
        analysis = _build_fallback_analysis(raw_text, job_title, job_requirements)

    # ── 4. Cache the result ─────────────────────────────────
    analysis_id = uuid.uuid4().hex
    analysis_json_str = json.dumps(analysis, ensure_ascii=False)

    async with get_db_context() as db:
        await db.execute(
            """
            INSERT INTO cv_analyses (id, application_id, job_title, job_requirements, analysis_json)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(application_id) DO UPDATE SET
                job_title = excluded.job_title,
                job_requirements = excluded.job_requirements,
                analysis_json = excluded.analysis_json,
                created_at = CURRENT_TIMESTAMP
            """,
            (analysis_id, application_id, job_title, job_requirements, analysis_json_str),
        )
        await db.commit()

    logger.info(
        "CV analysis cached",
        application_id=application_id,
        analysis_id=analysis_id,
    )

    # ── 5. Return ───────────────────────────────────────────
    return analysis
