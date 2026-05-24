import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from app.database import Base


class InterviewStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class InterviewStage(str, enum.Enum):
    GREETING = "GREETING"
    EXPERIENCE_REVIEW = "EXPERIENCE_REVIEW"
    TECHNICAL_QUESTIONS = "TECHNICAL_QUESTIONS"
    SCENARIO_QUESTIONS = "SCENARIO_QUESTIONS"
    CLOSING = "CLOSING"


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    status = Column(SQLEnum(InterviewStatus), nullable=False, default=InterviewStatus.PENDING)
    current_stage = Column(String(30), nullable=False, default=InterviewStage.GREETING.value)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to chat messages
    messages = relationship("ChatMessage", back_populates="session", lazy="selectin")


# ─── Pydantic Schemas ──────────────────────────────────────────


class InterviewSessionResponse(BaseModel):
    id: str
    application_id: str
    status: str
    current_stage: str
    started_at: datetime | None = None
    ended_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StartSessionRequest(BaseModel):
    token: str
