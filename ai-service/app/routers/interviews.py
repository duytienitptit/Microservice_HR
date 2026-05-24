from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import auth_service, interview_service
from app.models.chat_message import ChatRequest, ChatMessageResponse
from app.models.interview_session import InterviewSessionResponse, StartSessionRequest
from app.utils.logger import logger, correlation_id_var

router = APIRouter()


# ─── Magic Link Entry Point (Public) ────────────────────────


@router.get("/api/interview/{token}")
async def magic_link_entry(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Magic link entry point — start or resume an interview session.
    No JWT authentication — token-based auth only.
    """
    correlation_id = request.headers.get("x-correlation-id", "")
    correlation_id_var.set(correlation_id)

    # 1. Validate token via Core Service
    token_data = await auth_service.validate_magic_token(token, correlation_id)
    application_id = token_data["application_id"]

    # 2. Start or resume session
    session, messages = await interview_service.start_session(
        db, application_id, correlation_id
    )

    return {
        "success": True,
        "data": {
            "session": _format_session(session),
            "messages": [_format_message(m) for m in messages],
            "candidate_name": token_data.get("candidate_name", "Candidate"),
            "job_title": token_data.get("job_title", ""),
        },
    }


# ─── Interview API Endpoints (Internal / Gateway) ──────────


@router.get("/api/interviews/{session_id}")
async def get_session(
    session_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get interview session info and current stage."""
    correlation_id = request.headers.get("x-correlation-id", "")
    correlation_id_var.set(correlation_id)

    session = await interview_service.get_session(db, session_id)

    return {
        "success": True,
        "data": _format_session(session),
    }


@router.post("/api/interviews/{session_id}/chat")
async def chat(
    session_id: str,
    body: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message from the candidate and receive the next AI question.
    Automatically advances through interview stages.
    """
    correlation_id = request.headers.get("x-correlation-id", "")
    correlation_id_var.set(correlation_id)

    import html
    sanitized_message = html.escape(body.message)

    candidate_msg, ai_response, session = await interview_service.process_message(
        db, session_id, sanitized_message, correlation_id
    )

    response_data = {
        "session": _format_session(session),
        "candidate_message": _format_message(candidate_msg),
        "ai_response": _format_message(ai_response) if ai_response else None,
        "interview_ended": session.status.value == "COMPLETED" if hasattr(session.status, "value") else session.status == "COMPLETED",
    }

    return {
        "success": True,
        "data": response_data,
    }


@router.get("/api/interviews/{session_id}/history")
async def get_history(
    session_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get full chat transcript for an interview session."""
    correlation_id = request.headers.get("x-correlation-id", "")
    correlation_id_var.set(correlation_id)

    messages = await interview_service.get_history(db, session_id)

    return {
        "success": True,
        "data": {
            "messages": [_format_message(m) for m in messages],
            "total": len(messages),
        },
    }


@router.post("/api/interviews/{session_id}/end")
async def end_session(
    session_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Manually end an interview session.
    Marks session as COMPLETED and publishes INTERVIEW_COMPLETED event.
    """
    correlation_id = request.headers.get("x-correlation-id", "")
    correlation_id_var.set(correlation_id)

    session = await interview_service.end_session(db, session_id, correlation_id)

    return {
        "success": True,
        "data": _format_session(session),
    }


# ─── Response Formatters ───────────────────────────────────


def _format_session(session) -> dict:
    """Format an InterviewSession model to a dict for API response."""
    return {
        "id": str(session.id),
        "application_id": str(session.application_id),
        "status": session.status.value if hasattr(session.status, "value") else session.status,
        "current_stage": session.current_stage,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None,
    }


def _format_message(msg) -> dict:
    """Format a ChatMessage model to a dict for API response."""
    return {
        "id": str(msg.id),
        "session_id": str(msg.session_id),
        "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
        "content": msg.content,
        "stage": msg.stage,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }
