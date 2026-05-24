import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from app.database import Base


class MessageRole(str, enum.Enum):
    AI = "AI"
    CANDIDATE = "CANDIDATE"


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=False, index=True)
    role = Column(SQLEnum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    stage = Column(String(30), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationship back to session
    session = relationship("InterviewSession", back_populates="messages")


# ─── Pydantic Schemas ──────────────────────────────────────────


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    stage: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
