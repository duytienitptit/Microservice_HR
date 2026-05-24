from typing import TypedDict, List, Dict, Any

class InterviewState(TypedDict):
    session_id: str
    application_id: str
    candidate_name: str
    job_title: str
    current_stage: str
    chat_history: List[Dict[str, Any]]
    cv_context: str
    jd_context: str
    candidate_message: str
    ai_response: str
    stage_question_count: int
    should_transition: bool
