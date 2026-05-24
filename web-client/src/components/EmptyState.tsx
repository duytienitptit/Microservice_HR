import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = '📂',
  actionText,
  onAction,
}) => {
  return (
    <div
      className="glass-panel animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-xl) var(--spacing-lg)',
        textAlign: 'center',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px dashed var(--border-glass)',
        minHeight: '280px',
        gap: 'var(--spacing-md)',
      }}
    >
      <div style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.15))' }}>{icon}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '400px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{description}</p>
      </div>
      {actionText && onAction && (
        <button className="btn btn-primary" onClick={onAction} style={{ marginTop: 'var(--spacing-xs)' }}>
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
