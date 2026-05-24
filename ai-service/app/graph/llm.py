from typing import List, Any, Optional
from langchain_core.language_models.chat_models import SimpleChatModel
from langchain_core.messages import BaseMessage
from langchain_core.callbacks.manager import CallbackManagerForLLMRun
from app.config import settings
from app.utils.logger import logger

class MockChatModel(SimpleChatModel):
    """
    Mock LLM for test environments or when no API keys are provided.
    Generates stage-aware interview questions based on system prompt detection.
    """
    def _call(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        system_content = ""
        for m in messages:
            if m.type == "system":
                system_content = m.content
            elif hasattr(m, "role") and m.role == "system":
                system_content = m.content

        # Match content based on current stage keyword in system prompts
        if "GREETING" in system_content or "giới thiệu bản thân" in system_content:
            return "Chào bạn, tôi là AI Recruiter. Rất vui được gặp bạn để bắt đầu buổi phỏng vấn hôm nay. Chúng ta sẽ trải qua các phần: xem xét kinh nghiệm, câu hỏi kỹ thuật, câu hỏi tình huống và cuối cùng là trao đổi thêm. Bạn đã sẵn sàng chưa?"

        elif "EXPERIENCE_REVIEW" in system_content:
            return "Tôi đã xem qua CV của bạn. Bạn có thể chia sẻ chi tiết hơn về một dự án phần mềm bạn từng thực hiện nổi bật nhất được không?"
        elif "TECHNICAL_QUESTIONS" in system_content:
            return "Về mặt kỹ thuật, bạn có kinh nghiệm làm việc với REST APIs không? Hãy giải thích cách bạn thiết kế một API tốt."
        elif "SCENARIO_QUESTIONS" in system_content:
            return "Giả sử hệ thống đang gặp lỗi nghiêm trọng trên production và khách hàng đang khiếu nại, bạn sẽ xử lý tình huống này thế nào?"
        elif "CLOSING" in system_content:
            return "Cảm ơn bạn đã tham gia buổi phỏng vấn hôm nay. Chúng tôi sẽ đánh giá kết quả và liên hệ lại với bạn sớm qua email."
        else:
            return "Đây là câu hỏi giả lập từ Mock AI Recruiter. Hãy trả lời để tiếp tục."

    @property
    def _llm_type(self) -> str:
        return "mock-chat-model"


def get_llm():
    """
    Returns the configured LLM based on LLM_PROVIDER and LLM_API_KEY.
    """
    provider = settings.LLM_PROVIDER
    api_key = settings.LLM_API_KEY

    if not api_key:
        logger.info("No LLM_API_KEY provided. Using MockChatModel.")
        return MockChatModel()

    if provider == "openai":
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(openai_api_key=api_key, model="gpt-4o-mini", temperature=0.7)
        except Exception as e:
            logger.error(f"Failed to load ChatOpenAI: {str(e)}. Using MockChatModel.")
            return MockChatModel()
    elif provider == "gemini":
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(google_api_key=api_key, model="gemini-3.5-flash", temperature=0.7)
        except Exception as e:
            logger.error(f"Failed to load ChatGoogleGenerativeAI: {str(e)}. Using MockChatModel.")
            return MockChatModel()
    
    logger.info(f"LLM_PROVIDER '{provider}' not recognized. Using MockChatModel.")
    return MockChatModel()
