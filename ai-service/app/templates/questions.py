"""
Static interview questions for Phase 1 (no LLM).
Each stage has a fixed set of questions. The interview auto-advances
through stages based on the number of candidate responses received.
"""

from app.models.interview_session import InterviewStage


# ─── Stage Questions ─────────────────────────────────────────

STAGE_QUESTIONS: dict[str, list[str]] = {
    InterviewStage.GREETING: [
        "Hello! Welcome to the interview. I'm your AI interviewer today. "
        "Thank you for taking the time to speak with us. "
        "Could you please start by briefly introducing yourself?"
    ],
    InterviewStage.EXPERIENCE_REVIEW: [
        "Thank you for the introduction! Let's talk about your experience. "
        "Can you describe your most recent role and your main responsibilities?",
        "What was the most challenging project you've worked on, and how did you handle it?",
        "How do you typically stay up-to-date with new technologies and industry trends?",
    ],
    InterviewStage.TECHNICAL_QUESTIONS: [
        "Great, let's move on to some technical questions. "
        "Can you explain a complex technical concept you've worked with to a non-technical audience?",
        "Describe your approach to debugging a difficult issue in production. "
        "Walk me through your thought process.",
        "How do you ensure code quality in your projects? "
        "What practices or tools do you rely on?",
        "Can you describe your experience with version control and collaborative development workflows?",
    ],
    InterviewStage.SCENARIO_QUESTIONS: [
        "Now let's discuss some scenarios. "
        "If you were given a tight deadline for a feature and realized mid-way that your approach won't scale, "
        "what would you do?",
        "Imagine you disagree with a team lead's technical decision. "
        "How would you handle the situation?",
        "Describe how you would onboard yourself onto an unfamiliar codebase with minimal documentation.",
    ],
    InterviewStage.CLOSING: [
        "Thank you so much for your time and thoughtful responses! "
        "That concludes our interview. We will review your answers and get back to you shortly. "
        "Do you have any final thoughts you'd like to share before we wrap up?"
    ],
}

# ─── Stage Progression Logic ─────────────────────────────────

# How many candidate responses are expected before advancing to the next stage
RESPONSES_PER_STAGE: dict[str, int] = {
    InterviewStage.GREETING: 1,
    InterviewStage.EXPERIENCE_REVIEW: 3,
    InterviewStage.TECHNICAL_QUESTIONS: 4,
    InterviewStage.SCENARIO_QUESTIONS: 3,
    InterviewStage.CLOSING: 1,
}

# Ordered stage progression
STAGE_ORDER: list[str] = [
    InterviewStage.GREETING,
    InterviewStage.EXPERIENCE_REVIEW,
    InterviewStage.TECHNICAL_QUESTIONS,
    InterviewStage.SCENARIO_QUESTIONS,
    InterviewStage.CLOSING,
]


def get_next_stage(current_stage: str) -> str | None:
    """Return the next stage, or None if current stage is the last one."""
    try:
        idx = STAGE_ORDER.index(current_stage)
        if idx + 1 < len(STAGE_ORDER):
            return STAGE_ORDER[idx + 1]
    except ValueError:
        pass
    return None


def get_question_for_stage(stage: str, question_index: int) -> str | None:
    """
    Return the question at the given index for a stage.
    Returns None if the index is out of bounds.
    """
    questions = STAGE_QUESTIONS.get(stage, [])
    if 0 <= question_index < len(questions):
        return questions[question_index]
    return None


def get_greeting_message() -> str:
    """Return the first greeting message to start the interview."""
    return STAGE_QUESTIONS[InterviewStage.GREETING][0]


def is_last_stage(stage: str) -> bool:
    """Check if the given stage is the last one (CLOSING)."""
    return stage == InterviewStage.CLOSING
