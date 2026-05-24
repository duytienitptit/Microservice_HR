from app.graph.state import InterviewState
from app.graph.prompts import CLOSING_PROMPT
from app.graph.llm import get_llm
from app.graph.utils import build_messages, format_chat_history

async def closing_node(state: InterviewState) -> dict:
    """
    Closing Node: Ends the interview, thanks the candidate, and sets should_transition to True.
    """
    chat_history_str = format_chat_history(state.get("chat_history") or [])
    
    prompt = CLOSING_PROMPT.format(
        candidate_name=state.get("candidate_name") or "Ứng viên",
        job_title=state.get("job_title") or "Software Engineer",
        chat_history=chat_history_str
    )
    
    messages = build_messages(prompt, state.get("chat_history") or [])
    
    llm = get_llm()
    response = await llm.ainvoke(messages)
    response_text = response.content if hasattr(response, "content") else str(response)
    
    new_message = {"role": "AI", "content": response_text}
    
    is_new_stage = state.get("current_stage") != "CLOSING"
    new_count = 1 if is_new_stage else state.get("stage_question_count", 0) + 1
    
    return {
        "ai_response": response_text,
        "chat_history": (state.get("chat_history") or []) + [new_message],
        "stage_question_count": new_count,
        "current_stage": "CLOSING",
        "should_transition": True
    }
