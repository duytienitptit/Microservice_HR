import React from 'react';
import { ChatMessage } from '../services/interviewService';

interface ChatBubbleProps {
  message: ChatMessage;
  candidateName: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, candidateName }) => {
  const isAI = message.role === 'AI';
  
  // Format creation time to readable HH:MM
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div
      className={`animate-slide-up`}
      style={{
        display: 'flex',
        flexDirection: isAI ? 'row' : 'row-reverse',
        alignItems: 'flex-start',
        gap: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-lg)',
        width: '100%',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-full)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          flexShrink: 0,
          background: isAI
            ? 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-accent)))'
            : 'rgba(255, 255, 255, 0.08)',
          border: isAI ? 'none' : '1px solid var(--border-glass)',
          boxShadow: isAI ? 'var(--shadow-glow-purple)' : 'none',
        }}
      >
        {isAI ? '🤖' : candidateName.charAt(0).toUpperCase()}
      </div>

      {/* Bubble Content Wrapper */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isAI ? 'flex-start' : 'flex-end',
          maxWidth: '75%',
        }}
      >
        {/* Name and Time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginBottom: '4px',
            paddingInline: '4px',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
            {isAI ? 'AI Interviewer' : candidateName}
          </span>
          <span>•</span>
          <span>{formatTime(message.created_at)}</span>
        </div>

        {/* Message Bubble */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: isAI
              ? '0px var(--radius-md) var(--radius-md) var(--radius-md)'
              : 'var(--radius-md) 0px var(--radius-md) var(--radius-md)',
            background: isAI
              ? 'var(--color-bg-surface)'
              : 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-primary) / 0.8))',
            color: 'var(--text-primary)',
            border: isAI ? '1px solid var(--border-glass)' : '1px solid hsla(var(--color-primary) / 0.3)',
            boxShadow: isAI ? 'var(--shadow-sm)' : '0 4px 12px 0 hsla(var(--color-primary) / 0.25)',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
};
