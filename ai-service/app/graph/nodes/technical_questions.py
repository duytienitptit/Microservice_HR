from app.graph.state import InterviewState
from app.graph.prompts import TECHNICAL_QUESTIONS_PROMPT
from app.graph.llm import get_llm
from app.graph.utils import build_messages, format_chat_history
from app.graph.rag_client import get_cv_context, get_jd_context

async def technical_questions_node(state: InterviewState) -> dict:
    """
    Technical Questions Node: Asks specialized technical questions matching
    the Job Description requirements and the candidate's declared CV capabilities.
    """
    cv_context = state.get("cv_context") or ""
    if not cv_context and state.get("application_id"):
        cv_context = await get_cv_context(state.get("application_id"), "Get CV technical skills")
        
    jd_context = state.get("jd_context") or ""
    if not jd_context and state.get("application_id"):
        jd_context = await get_jd_context(state.get("application_id"))
        
    chat_history_str = format_chat_history(state.get("chat_history") or [])
    
    prompt = TECHNICAL_QUESTIONS_PROMPT.format(
        candidate_name=state.get("candidate_name") or "Ứng viên",
        job_title=state.get("job_title") or "Software Engineer",
        cv_context=cv_context or "Không có thông tin CV.",
        jd_context=jd_context or "Không có thông tin yêu cầu công việc.",
        chat_history=chat_history_str
    )
    
    messages = build_messages(prompt, state.get("chat_history") or [])
    
    llm = get_llm()
    response = await llm.ainvoke(messages)
    response_text = response.content if hasattr(response, "content") else str(response)
    
    new_message = {"role": "AI", "content": response_text}
    
    is_new_stage = state.get("current_stage") != "TECHNICAL_QUESTIONS"
    new_count = 1 if is_new_stage else state.get("stage_question_count", 0) + 1
    
    return {
        "ai_response": response_text,
        "chat_history": (state.get("chat_history") or []) + [new_message],
        "stage_question_count": new_count,
        "cv_context": cv_context,
        "jd_context": jd_context,
        "current_stage": "TECHNICAL_QUESTIONS",
        "should_transition": False
    }
