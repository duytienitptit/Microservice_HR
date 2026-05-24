from app.graph.state import InterviewState
from app.graph.prompts import GREETING_PROMPT
from app.graph.llm import get_llm
from app.graph.utils import build_messages

async def greeting_node(state: InterviewState) -> dict:
    """
    Greeting Node: Introduces the AI interviewer, explains the interview process,
    and asks if the candidate is ready.
    """
    prompt = GREETING_PROMPT.format(
        candidate_name=state.get("candidate_name") or "Ứng viên",
        job_title=state.get("job_title") or "Software Engineer"
    )
    
    messages = build_messages(prompt, state.get("chat_history") or [])
    
    llm = get_llm()
    response = await llm.ainvoke(messages)
    response_text = response.content if hasattr(response, "content") else str(response)
    
    new_message = {"role": "AI", "content": response_text}
    
    return {
        "ai_response": response_text,
        "chat_history": (state.get("chat_history") or []) + [new_message],
        "stage_question_count": state.get("stage_question_count", 0) + 1,
        "current_stage": "GREETING",
        "should_transition": False
    }
