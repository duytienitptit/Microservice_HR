from typing import List, Dict, Any
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage, BaseMessage

def format_chat_history(chat_history: List[Dict[str, Any]]) -> str:
    """
    Formats the list of chat messages into a readable text history.
    """
    formatted = []
    for msg in chat_history:
        role = msg.get("role")
        # Handle MessageRole Enum or raw string
        role_str = role.value if hasattr(role, "value") else str(role)
        content = msg.get("content", "")
        
        if role_str.upper() == "AI":
            formatted.append(f"AI: {content}")
        else:
            formatted.append(f"Candidate: {content}")
            
    return "\n".join(formatted)

def build_messages(system_prompt: str, chat_history: List[Dict[str, Any]]) -> List[BaseMessage]:
    """
    Converts list of chat messages into LangChain message objects.
    """
    messages = [SystemMessage(content=system_prompt)]
    for msg in chat_history:
        role = msg.get("role")
        role_str = role.value if hasattr(role, "value") else str(role)
        content = msg.get("content", "")
        
        if role_str.upper() == "AI":
            messages.append(AIMessage(content=content))
        else:
            messages.append(HumanMessage(content=content))
            
    return messages
