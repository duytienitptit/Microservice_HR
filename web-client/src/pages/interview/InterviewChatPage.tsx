import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, interviewService, InterviewStage } from '../../services/interviewService';
import { ChatBubble } from '../../components/ChatBubble';
import { StageProgress } from '../../components/StageProgress';

interface InterviewChatPageProps {
  sessionId: string;
  candidateName: string;
  initialMessages: ChatMessage[];
  currentStage: InterviewStage;
  onComplete: () => void;
}

export const InterviewChatPage: React.FC<InterviewChatPageProps> = ({
  sessionId,
  candidateName,
  initialMessages,
  currentStage: initialStage,
  onComplete,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [stage, setStage] = useState<InterviewStage>(initialStage);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorText, setErrorText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handle message send
  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessageText = inputValue.trim();
    setInputValue('');
    setErrorText('');
    setIsTyping(true);

    // Create a optimistic client-side message representation for instant feedback
    const tempCandidateMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      session_id: sessionId,
      role: 'CANDIDATE',
      content: userMessageText,
      stage: stage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempCandidateMessage]);

    try {
      const response = await interviewService.sendMessage(sessionId, userMessageText);

      // Update actual messages list with response messages from backend
      setMessages((prev) => {
        // Remove the temporary message and replace with the backend ones
        const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
        const newMsgs = [...filtered, response.candidate_message];
        if (response.ai_response) {
          newMsgs.push(response.ai_response);
        }
        return newMsgs;
      });

      // Update stage
      setStage(response.session.current_stage);

      // Check if session completed
      if (response.session.status === 'COMPLETED') {
        setTimeout(() => {
          onComplete();
        }, 1800); // 1.8s delay to let the candidate see their last message sent
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      // Remove optimistic message and show error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      setInputValue(userMessageText); // Restore input
      setErrorText(err.message || 'Không thể gửi tin nhắn. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setIsTyping(false);
      // Re-focus the input
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        maxWidth: '850px',
        marginInline: 'auto',
        position: 'relative',
      }}
    >
      {/* Stage Progress Header */}
      <div style={{ flexShrink: 0, paddingBottom: 'var(--spacing-md)' }}>
        <StageProgress currentStage={stage} />
      </div>

      {/* Chat Messages Panel */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--spacing-lg) var(--spacing-sm)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} candidateName={candidateName} />
        ))}

        {/* AI Typing Indicator */}
        {isTyping && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-lg)',
              width: '100%',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-accent)))',
                flexShrink: 0,
                boxShadow: 'var(--shadow-glow-purple)',
              }}
            >
              🤖
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', paddingInline: '4px' }}>
                Phỏng vấn viên AI đang soạn câu trả lời...
              </div>
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '0px var(--radius-md) var(--radius-md) var(--radius-md)',
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--border-glass)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '48px',
                }}
              >
                <div className="typing-dot" style={{ animationDelay: '0s' }} />
                <div className="typing-dot" style={{ animationDelay: '0.2s' }} />
                <div className="typing-dot" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Message banner */}
      {errorText && (
        <div className="alert alert-danger animate-slide-down" style={{ margin: 'var(--spacing-sm) 0' }}>
          <span>⚠️</span>
          <span style={{ flex: 1 }}>{errorText}</span>
          <button
            onClick={() => setErrorText('')}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Input panel */}
      <div
        className="glass-panel"
        style={{
          flexShrink: 0,
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--radius-lg)',
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          marginBottom: 'var(--spacing-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-md)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập câu trả lời của bạn tại đây... (Nhấn Enter để gửi, Shift+Enter để xuống dòng)"
          disabled={isTyping}
          style={{
            flex: 1,
            height: '44px',
            resize: 'none',
            padding: '10px 14px',
            background: '#f8fafc',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            lineHeight: '1.4',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'hsl(var(--color-primary))';
            e.target.style.boxShadow = 'var(--shadow-glow-purple)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-glass)';
            e.target.style.boxShadow = 'none';
          }}
        />

        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={!inputValue.trim() || isTyping}
          style={{
            height: '44px',
            width: '80px',
            borderRadius: 'var(--radius-md)',
            padding: '0',
            fontWeight: 600,
          }}
        >
          Gửi
        </button>
      </div>

      {/* Embedded CSS for typing dots */}
      <style>{`
        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--text-muted);
          animation: bounce 1.2s infinite ease-in-out;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .desktop-only {
          display: inline;
        }
        .mobile-only {
          display: none;
        }
        @media (max-width: 576px) {
          .desktop-only {
            display: none;
          }
          .mobile-only {
            display: inline;
          }
        }
      `}</style>
    </div>
  );
};
