import uuid
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
import pybreaker
import httpx

from app.config import settings
from app.models.interview_session import InterviewSession, InterviewStatus, InterviewStage
from app.models.chat_message import ChatMessage, MessageRole
from app.templates.questions import (
    get_greeting_message,
    get_question_for_stage,
    get_next_stage,
    is_last_stage,
    RESPONSES_PER_STAGE,
)
from app.events.interview_publisher import publish_interview_completed
from app.utils.logger import logger
from app.graph.builder import interview_graph
from app.graph.rag_client import get_application_info, get_cv_context, get_jd_context


# Circuit Breaker for RAG service HTTP calls
# 3 failures in 60s -> open, reset_timeout=30s
rag_breaker = pybreaker.CircuitBreaker(
    fail_max=3,
    reset_timeout=30.0,
)

async def query_rag_context(application_id: str, correlation_id: str = "") -> dict | None:
    """
    Calls RAG Service POST /internal/documents/query to retrieve CV context.
    Wrapped in a Circuit Breaker.
    """
    url = f"{settings.RAG_SERVICE_URL}/internal/documents/query"
    
    try:
        with rag_breaker.calling():
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    url,
                    json={"application_id": application_id, "query": "Get CV context for interview"},
                    headers={"X-Correlation-ID": correlation_id}
                )
                response.raise_for_status()
                result = response.json()
                return result
    except Exception as e:
        raise e



async def start_session(
    db: AsyncSession,
    application_id: str,
    correlation_id: str = "",
) -> tuple[InterviewSession, list[ChatMessage]]:
    """
    Start or resume an interview session for the given application.
    - If a session already exists (not COMPLETED), resume it.
    - Otherwise, create a new session in IN_PROGRESS with the first greeting.
    """
    # Check for existing session
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.application_id == uuid.UUID(application_id))
        .where(InterviewSession.status != InterviewStatus.COMPLETED)
    )
    existing_session = result.scalars().first()

    if existing_session:
        # Resume: return existing session with its messages
        messages_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == existing_session.id)
            .order_by(ChatMessage.created_at)
        )
        messages = list(messages_result.scalars().all())
        logger.info(
            "Resumed existing interview session",
            correlation_id=correlation_id,
            session_id=str(existing_session.id),
            application_id=application_id,
        )
        return existing_session, messages

    # Create new session
    if settings.USE_LANGGRAPH:
        app_info = await get_application_info(application_id, correlation_id)
        candidate_name = app_info.get("candidate_name") or "Ứng viên"
        job_title = app_info.get("job_title") or "Software Engineer"
        
        cv_context = await get_cv_context(application_id, correlation_id=correlation_id)
        jd_context = await get_jd_context(application_id, correlation_id=correlation_id)
        
        session_id = uuid.uuid4()
        
        initial_state = {
            "session_id": str(session_id),
            "application_id": application_id,
            "candidate_name": candidate_name,
            "job_title": job_title,
            "current_stage": "GREETING",
            "chat_history": [],
            "cv_context": cv_context,
            "jd_context": jd_context,
            "candidate_message": "",
            "ai_response": "",
            "stage_question_count": 0,
            "should_transition": False
        }
        
        try:
            result_state = await interview_graph.ainvoke(initial_state)
            greeting_content = result_state.get("ai_response")
        except Exception as e:
            logger.error(
                f"LangGraph start session failed: {str(e)}. Falling back to static greeting.",
                correlation_id=correlation_id
            )
            greeting_content = get_greeting_message()
            
        session = InterviewSession(
            id=session_id,
            application_id=uuid.UUID(application_id),
            status=InterviewStatus.IN_PROGRESS,
            current_stage=InterviewStage.GREETING.value,
            started_at=datetime.utcnow(),
        )
        db.add(session)
        
        greeting = ChatMessage(
            id=uuid.uuid4(),
            session_id=session.id,
            role=MessageRole.AI,
            content=greeting_content,
            stage=InterviewStage.GREETING.value,
        )
        db.add(greeting)
        
        await db.commit()
        await db.refresh(session)
        
        logger.info(
            "Created new LangGraph interview session",
            correlation_id=correlation_id,
            session_id=str(session.id),
            application_id=application_id,
        )
        return session, [greeting]
    else:
        try:
            logger.info(
                f"Querying RAG Service for new session context (application_id: {application_id})",
                correlation_id=correlation_id
            )
            rag_context = await query_rag_context(application_id, correlation_id)
            logger.info(
                "Successfully fetched context from RAG Service",
                correlation_id=correlation_id,
                rag_context=rag_context
            )
        except Exception as exc:
            logger.warning(
                f"RAG Service query failed (Circuit Breaker state: {rag_breaker.current_state}). "
                f"Using fallback generic questions. Error: {str(exc)}",
                correlation_id=correlation_id
            )

        session = InterviewSession(
            id=uuid.uuid4(),
            application_id=uuid.UUID(application_id),
            status=InterviewStatus.IN_PROGRESS,
            current_stage=InterviewStage.GREETING.value,
            started_at=datetime.utcnow(),
        )
        db.add(session)

        # Add the initial greeting message
        greeting = ChatMessage(
            id=uuid.uuid4(),
            session_id=session.id,
            role=MessageRole.AI,
            content=get_greeting_message(),
            stage=InterviewStage.GREETING.value,
        )
        db.add(greeting)

        await db.commit()
        await db.refresh(session)

        logger.info(
            "Created new interview session",
            correlation_id=correlation_id,
            session_id=str(session.id),
            application_id=application_id,
        )
        return session, [greeting]


async def process_message(
    db: AsyncSession,
    session_id: str,
    candidate_message: str,
    correlation_id: str = "",
) -> tuple[ChatMessage, ChatMessage | None, InterviewSession]:
    """
    Process a candidate's message:
    1. Store the candidate's message
    2. Count responses in the current stage
    3. If enough responses → advance to next stage
    4. Return the next AI question (or None if interview ended)

    Returns: (candidate_msg, ai_response_msg_or_None, updated_session)
    """
    # Fetch session
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == uuid.UUID(session_id))
    )
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail={
            "code": "SESSION_NOT_FOUND",
            "message": f"Interview session not found: {session_id}",
        })

    if session.status == InterviewStatus.COMPLETED:
        raise HTTPException(status_code=400, detail={
            "code": "SESSION_COMPLETED",
            "message": "This interview session has already been completed.",
        })

    if session.status == InterviewStatus.PENDING:
        raise HTTPException(status_code=400, detail={
            "code": "SESSION_NOT_STARTED",
            "message": "This interview session has not been started yet.",
        })

    current_stage = session.current_stage

    if settings.USE_LANGGRAPH:
        if current_stage == InterviewStage.CLOSING.value:
            # 1. Store candidate message
            candidate_msg = ChatMessage(
                id=uuid.uuid4(),
                session_id=session.id,
                role=MessageRole.CANDIDATE,
                content=candidate_message,
                stage=InterviewStage.CLOSING.value,
            )
            db.add(candidate_msg)
            
            # 2. Mark session as completed
            session.status = InterviewStatus.COMPLETED
            session.ended_at = datetime.utcnow()
            await db.commit()
            await db.refresh(session)
            
            # 3. Publish completion event
            await _publish_completed_event(db, session, correlation_id)
            
            logger.info(
                "Interview session completed after CLOSING response (LangGraph)",
                correlation_id=correlation_id,
                session_id=str(session.id),
            )
            return candidate_msg, None, session

        # 1. Store candidate message
        candidate_msg = ChatMessage(
            id=uuid.uuid4(),
            session_id=session.id,
            role=MessageRole.CANDIDATE,
            content=candidate_message,
            stage=current_stage,
        )
        db.add(candidate_msg)
        await db.flush()
        
        # 2. Fetch history and metadata
        db_messages = await get_history(db, str(session.id))
        chat_history = [
            {
                "role": msg.role.value if hasattr(msg.role, "value") else str(msg.role),
                "content": msg.content
            }
            for msg in db_messages
        ]
        
        app_info = await get_application_info(str(session.application_id), correlation_id)
        candidate_name = app_info.get("candidate_name") or "Ứng viên"
        job_title = app_info.get("job_title") or "Software Engineer"
        
        cv_context = await get_cv_context(str(session.application_id), correlation_id=correlation_id)
        jd_context = await get_jd_context(str(session.application_id), correlation_id=correlation_id)
        
        # 3. Count AI messages in current stage (before this run) to track stage_question_count
        ai_count_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session.id)
            .where(ChatMessage.role == MessageRole.AI)
            .where(ChatMessage.stage == current_stage)
        )
        stage_question_count = len(ai_count_result.scalars().all())
        
        # 4. Invoke LangGraph
        inputs = {
            "session_id": str(session.id),
            "application_id": str(session.application_id),
            "candidate_name": candidate_name,
            "job_title": job_title,
            "current_stage": current_stage,
            "chat_history": chat_history,
            "cv_context": cv_context,
            "jd_context": jd_context,
            "candidate_message": candidate_message,
            "ai_response": "",
            "stage_question_count": stage_question_count,
            "should_transition": False
        }
        
        try:
            result_state = await interview_graph.ainvoke(inputs)
            new_ai_response = result_state.get("ai_response")
            new_stage = result_state.get("current_stage")
        except Exception as e:
            logger.error(
                f"LangGraph execution failed: {str(e)}",
                correlation_id=correlation_id
            )
            raise e
            
        session.current_stage = new_stage
        
        # 5. Store AI response
        ai_response = ChatMessage(
            id=uuid.uuid4(),
            session_id=session.id,
            role=MessageRole.AI,
            content=new_ai_response,
            stage=new_stage,
        )
        db.add(ai_response)
        
        await db.commit()
        await db.refresh(session)
        
        logger.info(
            "Processed LangGraph interview message",
            correlation_id=correlation_id,
            session_id=str(session.id),
            stage=session.current_stage,
        )
        
        return candidate_msg, ai_response, session
    else:
        # Call RAG Service (wrapped in circuit breaker)
        try:
            logger.info(
                f"Querying RAG Service for chat session context (application_id: {session.application_id})",
                correlation_id=correlation_id
            )
            rag_context = await query_rag_context(str(session.application_id), correlation_id)
            logger.info(
                "Successfully fetched context from RAG Service during chat",
                correlation_id=correlation_id,
                rag_context=rag_context
            )
        except Exception as exc:
            logger.warning(
                f"RAG Service query failed (Circuit Breaker state: {rag_breaker.current_state}). "
                f"Using fallback generic questions. Error: {str(exc)}",
                correlation_id=correlation_id
            )


        # 1. Store candidate's message
        candidate_msg = ChatMessage(
            id=uuid.uuid4(),
            session_id=session.id,
            role=MessageRole.CANDIDATE,
            content=candidate_message,
            stage=current_stage,
        )
        db.add(candidate_msg)
        await db.flush()  # Flush to make the message visible to subsequent queries

        # 2. Count candidate responses in the current stage
        count_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session.id)
            .where(ChatMessage.role == MessageRole.CANDIDATE)
            .where(ChatMessage.stage == current_stage)
        )
        response_count = len(count_result.scalars().all())

        required = RESPONSES_PER_STAGE.get(current_stage, 1)

        # 3. Determine next action
        ai_response = None

        if response_count >= required:
            # Check if this is the closing stage → end interview
            if is_last_stage(current_stage):
                # Session will be ended — no more AI response
                session.status = InterviewStatus.COMPLETED
                session.ended_at = datetime.utcnow()

                await db.commit()
                await db.refresh(session)

                # Publish INTERVIEW_COMPLETED event
                await _publish_completed_event(db, session, correlation_id)

                logger.info(
                    "Interview session auto-completed after CLOSING response",
                    correlation_id=correlation_id,
                    session_id=str(session.id),
                )
                return candidate_msg, None, session

            # Advance to next stage
            next_stage = get_next_stage(current_stage)
            if next_stage:
                session.current_stage = next_stage

                # Get the first question of the new stage
                question_text = get_question_for_stage(next_stage, 0)
                if question_text:
                    ai_response = ChatMessage(
                        id=uuid.uuid4(),
                        session_id=session.id,
                        role=MessageRole.AI,
                        content=question_text,
                        stage=next_stage,
                    )
                    db.add(ai_response)
        else:
            # Same stage — get the next question in sequence
            question_text = get_question_for_stage(current_stage, response_count)
            if question_text:
                ai_response = ChatMessage(
                    id=uuid.uuid4(),
                    session_id=session.id,
                    role=MessageRole.AI,
                    content=question_text,
                    stage=current_stage,
                )
                db.add(ai_response)

        await db.commit()
        await db.refresh(session)

        logger.info(
            "Processed interview message",
            correlation_id=correlation_id,
            session_id=str(session.id),
            stage=session.current_stage,
            response_count=response_count,
        )

        return candidate_msg, ai_response, session


async def end_session(
    db: AsyncSession,
    session_id: str,
    correlation_id: str = "",
) -> InterviewSession:
    """
    Manually end an interview session.
    Marks as COMPLETED and publishes INTERVIEW_COMPLETED event.
    """
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == uuid.UUID(session_id))
    )
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail={
            "code": "SESSION_NOT_FOUND",
            "message": f"Interview session not found: {session_id}",
        })

    if session.status == InterviewStatus.COMPLETED:
        raise HTTPException(status_code=400, detail={
            "code": "SESSION_ALREADY_COMPLETED",
            "message": "This interview session is already completed.",
        })

    session.status = InterviewStatus.COMPLETED
    session.ended_at = datetime.utcnow()

    await db.commit()
    await db.refresh(session)

    # Publish INTERVIEW_COMPLETED event
    await _publish_completed_event(db, session, correlation_id)

    logger.info(
        "Interview session manually ended",
        correlation_id=correlation_id,
        session_id=str(session.id),
    )

    return session


async def get_session(
    db: AsyncSession,
    session_id: str,
) -> InterviewSession:
    """Get session info by ID."""
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == uuid.UUID(session_id))
    )
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail={
            "code": "SESSION_NOT_FOUND",
            "message": f"Interview session not found: {session_id}",
        })

    return session


async def get_history(
    db: AsyncSession,
    session_id: str,
) -> list[ChatMessage]:
    """Get all chat messages for a session, ordered by creation time."""
    # Verify session exists
    await get_session(db, session_id)

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == uuid.UUID(session_id))
        .order_by(ChatMessage.created_at)
    )
    return list(result.scalars().all())


# ─── Private Helpers ────────────────────────────────────────


async def _publish_completed_event(
    db: AsyncSession,
    session: InterviewSession,
    correlation_id: str,
) -> None:
    """Build chat history and publish the INTERVIEW_COMPLETED event."""
    messages = await get_history(db, str(session.id))

    chat_history = [
        {
            "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
            "content": msg.content,
            "stage": msg.stage,
            "timestamp": msg.created_at.isoformat(),
        }
        for msg in messages
    ]

    await publish_interview_completed(
        session_id=str(session.id),
        application_id=str(session.application_id),
        chat_history=chat_history,
        correlation_id=correlation_id,
    )
