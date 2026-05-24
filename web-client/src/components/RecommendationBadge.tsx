import React from 'react';

interface RecommendationBadgeProps {
  recommendation: string;
}

export const RecommendationBadge: React.FC<RecommendationBadgeProps> = ({ recommendation }) => {
  let label = 'Không xác định';
  let badgeStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-glass)',
  };

  const rec = recommendation ? recommendation.toUpperCase() : '';

  if (rec.includes('ADVANCE') || rec.includes('NEXT_ROUND')) {
    label = 'Chuyển tiếp Vòng sau';
    badgeStyle = {
      background: 'rgba(16, 185, 129, 0.1)',
      color: 'hsl(var(--color-success))',
      border: '1px solid hsla(var(--color-success) / 0.3)',
    };
  } else if (rec.includes('HOLD') || rec.includes('REVIEW')) {
    label = 'Chờ xem xét';
    badgeStyle = {
      background: 'rgba(245, 158, 11, 0.1)',
      color: 'hsl(var(--color-warning))',
      border: '1px solid hsla(var(--color-warning) / 0.3)',
    };
  } else if (rec.includes('REJECT')) {
    label = 'Từ chối';
    badgeStyle = {
      background: 'rgba(239, 68, 68, 0.1)',
      color: 'hsl(var(--color-danger))',
      border: '1px solid hsla(var(--color-danger) / 0.3)',
    };
  } else {
    label = recommendation; // fallback
  }

  return (
    <span
      className="badge"
      style={{
        ...badgeStyle,
        padding: '6px 12px',
        fontSize: '0.8rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-sm)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        textTransform: 'none',
        letterSpacing: 'normal',
      }}
    >
      <span>
        {rec.includes('ADVANCE') && '✅'}
        {rec.includes('HOLD') && '⏳'}
        {rec.includes('REJECT') && '❌'}
      </span>
      {label}
    </span>
  );
};

export default RecommendationBadge;
