from langgraph.graph import END
from app.graph.state import InterviewState

def route_interview(state: InterviewState) -> str:
    """
    Decides the next stage/node to run based on current_stage and stage_question_count.
    """
    current_stage = state.get("current_stage")
    count = state.get("stage_question_count", 0)
    chat_history = state.get("chat_history") or []
    
    # Identify candidate answers in chat history
    candidate_replies = [msg for msg in chat_history if msg.get("role") == "CANDIDATE"]
    
    if not current_stage:
        return "greeting"
        
    if current_stage == "GREETING":
        # If candidate has responded to greeting, transition to experience review
        if len(candidate_replies) >= 1:
            return "experience_review"
        return "greeting"
        
    elif current_stage == "EXPERIENCE_REVIEW":
        # Transition to technical questions after 3 questions in experience review
        if count >= 3:
            return "technical_questions"
        return "experience_review"
        
    elif current_stage == "TECHNICAL_QUESTIONS":
        # Transition to scenario questions after 4 questions in technical
        if count >= 4:
            return "scenario_questions"
        return "technical_questions"
        
    elif current_stage == "SCENARIO_QUESTIONS":
        # Transition to closing after 3 scenario questions
        if count >= 3:
            return "closing"
        return "scenario_questions"
        
    elif current_stage == "CLOSING":
        return END
        
    return END
