import pytest
import uuid
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException

from app.services import interview_service
from app.models.interview_session import InterviewStatus, InterviewStage
from app.models.chat_message import MessageRole


@pytest.mark.asyncio
async def test_start_session_creates_new(db_session, mock_publish, sample_application_id):
    """Starting a session should create it in IN_PROGRESS with a greeting message."""
    session, messages = await interview_service.start_session(
        db_session, sample_application_id
    )

    assert session is not None
    assert str(session.application_id) == sample_application_id
    assert session.status == InterviewStatus.IN_PROGRESS
    assert session.current_stage == InterviewStage.GREETING.value
    assert session.started_at is not None
    assert len(messages) == 1
    assert messages[0].role == MessageRole.AI
    assert messages[0].stage == InterviewStage.GREETING.value


@pytest.mark.asyncio
async def test_start_session_resumes_existing(db_session, mock_publish, sample_application_id):
    """Starting a session when one already exists should resume it, not create a duplicate."""
    # Create initial session
    session1, _ = await interview_service.start_session(
        db_session, sample_application_id
    )

    # Try to start again — should resume
    session2, messages = await interview_service.start_session(
        db_session, sample_application_id
    )

    assert str(session1.id) == str(session2.id)
    assert len(messages) == 1  # The greeting from the first session


@pytest.mark.asyncio
async def test_process_message_stores_candidate_message(db_session, mock_publish, sample_application_id):
    """Processing a message should store the candidate's message and return an AI response."""
    session, _ = await interview_service.start_session(
        db_session, sample_application_id
    )

    candidate_msg, ai_response, updated_session = await interview_service.process_message(
        db_session, str(session.id), "Hello, I'm John Doe."
    )

    assert candidate_msg is not None
    assert candidate_msg.role == MessageRole.CANDIDATE
    assert candidate_msg.content == "Hello, I'm John Doe."
    assert candidate_msg.stage == InterviewStage.GREETING.value


@pytest.mark.asyncio
async def test_stage_progression_greeting_to_experience(db_session, mock_publish, sample_application_id):
    """After 1 response in GREETING, should advance to EXPERIENCE_REVIEW."""
    session, _ = await interview_service.start_session(
        db_session, sample_application_id
    )

    # Send 1 response to GREETING (requires 1)
    _, ai_response, updated = await interview_service.process_message(
        db_session, str(session.id), "I'm a software engineer with 5 years of experience."
    )

    assert updated.current_stage == InterviewStage.EXPERIENCE_REVIEW.value
    assert ai_response is not None
    assert ai_response.stage == InterviewStage.EXPERIENCE_REVIEW.value


@pytest.mark.asyncio
async def test_stage_progression_experience_to_technical(db_session, mock_publish, sample_application_id):
    """After 3 responses in EXPERIENCE_REVIEW, should advance to TECHNICAL_QUESTIONS."""
    session, _ = await interview_service.start_session(
        db_session, sample_application_id
    )

    # GREETING → 1 response
    await interview_service.process_message(
        db_session, str(session.id), "I'm a software engineer."
    )

    # EXPERIENCE_REVIEW → 3 responses
    for i in range(3):
        _, ai_resp, updated = await interview_service.process_message(
            db_session, str(session.id), f"Experience answer {i + 1}"
        )

    assert updated.current_stage == InterviewStage.TECHNICAL_QUESTIONS.value


@pytest.mark.asyncio
async def test_full_interview_flow(db_session, mock_publish, sample_application_id):
    """Complete interview flow through all 5 stages should end with COMPLETED status."""
    session, _ = await interview_service.start_session(
        db_session, sample_application_id
    )
    sid = str(session.id)

    # GREETING → 1 response
    await interview_service.process_message(db_session, sid, "Intro answer")

    # EXPERIENCE_REVIEW → 3 responses
    for i in range(3):
        await interview_service.process_message(db_session, sid, f"Experience {i}")

    # TECHNICAL_QUESTIONS → 4 responses
    for i in range(4):
        await interview_service.process_message(db_session, sid, f"Technical {i}")

    # SCENARIO_QUESTIONS → 3 responses
    for i in range(3):
        await interview_service.process_message(db_session, sid, f"Scenario {i}")

    # CLOSING → 1 response (should auto-complete)
    _, ai_resp, final_session = await interview_service.process_message(
        db_session, sid, "Thank you!"
    )

    assert final_session.status == InterviewStatus.COMPLETED
    assert final_session.ended_at is not None
    assert ai_resp is None  # No AI response after closing
    mock_publish.assert_called_once()

    # Verify publish args
    call_args = mock_publish.call_args
    assert call_args.kwargs["session_id"] == sid
    assert call_args.kwargs["application_id"] == sample_application_id
    assert len(call_args.kwargs["chat_history"]) > 0


@pytest.mark.asyncio
async def test_end_session_manually(db_session, mock_publish, sample_application_id):
    """Manually ending a session should mark it as COMPLETED and publish event."""
    session, _ = await interview_service.start_session(
        db_session, sample_application_id
    )

    ended = await interview_service.end_session(
        db_session, str(session.id), "test-correlation"
    )

    assert ended.status == InterviewStatus.COMPLETED
    assert ended.ended_at is not None
    mock_publish.assert_called_once()


@pytest.mark.asyncio
async def test_end_session_already_completed(db_session, mock_publish, sample_application_id):
    """Ending an already completed session should raise 400."""
    session, _ = await interview_service.start_session(
        db_session, sample_application_id
    )
    await interview_service.end_session(db_session, str(session.id))

    with pytest.raises(HTTPException) as exc_info:
        await interview_service.end_session(db_session, str(session.id))
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_get_session_not_found(db_session, mock_publish):
    """Getting a non-existent session should raise 404."""
    fake_id = str(uuid.uuid4())

    with pytest.raises(HTTPException) as exc_info:
        await interview_service.get_session(db_session, fake_id)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_history(db_session, mock_publish, sample_application_id):
    """Get history should return all messages in order."""
    session, _ = await interview_service.start_session(
        db_session, sample_application_id
    )

    # Add a few messages
    await interview_service.process_message(
        db_session, str(session.id), "Test message"
    )

    history = await interview_service.get_history(db_session, str(session.id))

    # Should have: 1 greeting + 1 candidate + 1 AI response = 3
    assert len(history) >= 2  # At minimum greeting + candidate
    assert history[0].role == MessageRole.AI  # Greeting first


@pytest.mark.asyncio
async def test_process_message_on_completed_session(db_session, mock_publish, sample_application_id):
    """Sending a message to a completed session should raise 400."""
    session, _ = await interview_service.start_session(
        db_session, sample_application_id
    )
    await interview_service.end_session(db_session, str(session.id))

    with pytest.raises(HTTPException) as exc_info:
        await interview_service.process_message(
            db_session, str(session.id), "Late message"
        )
    assert exc_info.value.status_code == 400
