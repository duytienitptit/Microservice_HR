import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from pybreaker import CircuitBreakerError

from app.config import settings
from app.graph.state import InterviewState
from app.graph.nodes.greeting import greeting_node
from app.graph.nodes.experience_review import experience_review_node
from app.graph.nodes.technical_questions import technical_questions_node
from app.graph.nodes.scenario_questions import scenario_questions_node
from app.graph.nodes.closing import closing_node
from app.graph.router import route_interview
from app.graph.builder import interview_graph
from app.graph.rag_client import get_cv_context, get_jd_context, get_application_info, rag_breaker, core_breaker

@pytest.mark.asyncio
async def test_greeting_node():
    state = {
        "session_id": "test_session",
        "application_id": "test_app",
        "candidate_name": "Nguyen Van A",
        "job_title": "React Developer",
        "current_stage": "GREETING",
        "chat_history": [],
        "cv_context": "",
        "jd_context": "",
        "candidate_message": "",
        "ai_response": "",
        "stage_question_count": 0,
        "should_transition": False
    }
    
    result = await greeting_node(state)
    assert result["current_stage"] == "GREETING"
    assert result["stage_question_count"] == 1
    assert "chào mừng" in result["ai_response"].lower() or "chào" in result["ai_response"].lower()
    assert len(result["chat_history"]) == 1
    assert result["chat_history"][0]["role"] == "AI"

@pytest.mark.asyncio
async def test_experience_review_node():
    state = {
        "session_id": "test_session",
        "application_id": "test_app",
        "candidate_name": "Nguyen Van A",
        "job_title": "React Developer",
        "current_stage": "EXPERIENCE_REVIEW",
        "chat_history": [{"role": "AI", "content": "Welcome"}, {"role": "CANDIDATE", "content": "Hi"}],
        "cv_context": "Has 3 years experience with React.",
        "jd_context": "",
        "candidate_message": "Hi",
        "ai_response": "",
        "stage_question_count": 0,
        "should_transition": False
    }
    
    result = await experience_review_node(state)
    assert result["current_stage"] == "EXPERIENCE_REVIEW"
    assert result["stage_question_count"] == 1
    assert "cv" in result["ai_response"].lower() or "kinh nghiệm" in result["ai_response"].lower() or "dự án" in result["ai_response"].lower()

@pytest.mark.asyncio
async def test_technical_questions_node():
    state = {
        "session_id": "test_session",
        "application_id": "test_app",
        "candidate_name": "Nguyen Van A",
        "job_title": "React Developer",
        "current_stage": "TECHNICAL_QUESTIONS",
        "chat_history": [],
        "cv_context": "Has 3 years experience with React.",
        "jd_context": "Must know REST APIs.",
        "candidate_message": "React",
        "ai_response": "",
        "stage_question_count": 1,
        "should_transition": False
    }
    
    result = await technical_questions_node(state)
    assert result["current_stage"] == "TECHNICAL_QUESTIONS"
    assert result["stage_question_count"] == 2
    assert "api" in result["ai_response"].lower() or "kỹ thuật" in result["ai_response"].lower()

@pytest.mark.asyncio
async def test_scenario_questions_node():
    state = {
        "session_id": "test_session",
        "application_id": "test_app",
        "candidate_name": "Nguyen Van A",
        "job_title": "React Developer",
        "current_stage": "SCENARIO_QUESTIONS",
        "chat_history": [],
        "cv_context": "",
        "jd_context": "REST APIs",
        "candidate_message": "OK",
        "ai_response": "",
        "stage_question_count": 2,
        "should_transition": False
    }
    
    result = await scenario_questions_node(state)
    assert result["current_stage"] == "SCENARIO_QUESTIONS"
    assert result["stage_question_count"] == 3
    assert "tình huống" in result["ai_response"].lower() or "production" in result["ai_response"].lower()

@pytest.mark.asyncio
async def test_closing_node():
    state = {
        "session_id": "test_session",
        "application_id": "test_app",
        "candidate_name": "Nguyen Van A",
        "job_title": "React Developer",
        "current_stage": "CLOSING",
        "chat_history": [],
        "cv_context": "",
        "jd_context": "",
        "candidate_message": "Thank you",
        "ai_response": "",
        "stage_question_count": 0,
        "should_transition": False
    }
    
    result = await closing_node(state)
    assert result["current_stage"] == "CLOSING"
    assert result["should_transition"] is True
    assert "cảm ơn" in result["ai_response"].lower()

def test_route_interview():
    # From GREETING to EXPERIENCE_REVIEW
    state1 = {
        "current_stage": "GREETING",
        "chat_history": [{"role": "AI", "content": "Welcome"}, {"role": "CANDIDATE", "content": "Hello"}],
        "stage_question_count": 1
    }
    assert route_interview(state1) == "experience_review"
    
    # Stay in EXPERIENCE_REVIEW
    state2 = {
        "current_stage": "EXPERIENCE_REVIEW",
        "chat_history": [],
        "stage_question_count": 2
    }
    assert route_interview(state2) == "experience_review"
    
    # Transition to TECHNICAL_QUESTIONS after 3
    state3 = {
        "current_stage": "EXPERIENCE_REVIEW",
        "chat_history": [],
        "stage_question_count": 3
    }
    assert route_interview(state3) == "technical_questions"
    
    # Stay in TECHNICAL_QUESTIONS
    state4 = {
        "current_stage": "TECHNICAL_QUESTIONS",
        "chat_history": [],
        "stage_question_count": 3
    }
    assert route_interview(state4) == "technical_questions"
    
    # Transition to SCENARIO_QUESTIONS after 4
    state5 = {
        "current_stage": "TECHNICAL_QUESTIONS",
        "chat_history": [],
        "stage_question_count": 4
    }
    assert route_interview(state5) == "scenario_questions"

@pytest.mark.asyncio
async def test_compiled_graph():
    # Test starting session
    initial_state = {
        "session_id": "test_session",
        "application_id": "test_app",
        "candidate_name": "Nguyen Van A",
        "job_title": "React Developer",
        "current_stage": "GREETING",
        "chat_history": [],
        "cv_context": "CV info",
        "jd_context": "JD info",
        "candidate_message": "",
        "ai_response": "",
        "stage_question_count": 0,
        "should_transition": False
    }
    
    result = await interview_graph.ainvoke(initial_state)
    assert result["current_stage"] == "GREETING"
    assert result["stage_question_count"] == 1
    assert len(result["chat_history"]) == 1

@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
async def test_rag_client_cv_context(mock_post):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "success": True,
        "data": {
            "raw_text": "Mocked CV raw text"
        }
    }
    mock_post.return_value = mock_response
    
    # Ensure breaker is closed
    rag_breaker.close()
    
    cv_text = await get_cv_context("app_id", "query")
    assert cv_text == "Mocked CV raw text"

@pytest.mark.asyncio
@patch("httpx.AsyncClient.get")
async def test_rag_client_jd_context(mock_get):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "success": True,
        "data": {
            "application": {
                "candidateName": "Nguyen Van A",
                "jobId": "job_123",
                "job": {
                    "title": "Backend Dev",
                    "description": "NodeJS backend developer",
                    "requirements": "Prisma, Postgres"
                }
            }
        }
    }
    mock_get.return_value = mock_response
    
    core_breaker.close()
    
    jd_text = await get_jd_context("app_id")
    assert "Backend Dev" in jd_text
    assert "Prisma, Postgres" in jd_text
    
    info = await get_application_info("app_id")
    assert info["candidate_name"] == "Nguyen Van A"
    assert info["job_title"] == "Backend Dev"
