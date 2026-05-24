import React, { useEffect, useState } from 'react';

interface ScoreChartProps {
  scores: {
    technical: number;
    communication: number;
    relevance: number;
    overall: number;
  };
}

export const ScoreChart: React.FC<ScoreChartProps> = ({ scores }) => {
  const [animatedScores, setAnimatedScores] = useState({
    technical: 0,
    communication: 0,
    relevance: 0,
    overall: 0,
  });

  useEffect(() => {
    // Subtle animated fill effect
    const timer = setTimeout(() => {
      setAnimatedScores({
        technical: scores.technical,
        communication: scores.communication,
        relevance: scores.relevance,
        overall: scores.overall,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [scores]);

  const scoreItems = [
    { label: 'Đánh giá Chung', value: animatedScores.overall, originalValue: scores.overall, isOverall: true },
    { label: 'Năng lực Kỹ thuật', value: animatedScores.technical, originalValue: scores.technical, isOverall: false },
    { label: 'Kỹ năng Giao tiếp', value: animatedScores.communication, originalValue: scores.communication, isOverall: false },
    { label: 'Độ Phù hợp Vai trò', value: animatedScores.relevance, originalValue: scores.relevance, isOverall: false },
  ];

  // Helper to color-code the score number
  const getScoreColorClass = (val: number) => {
    if (val >= 80) return 'hsl(var(--color-success))';
    if (val >= 60) return 'hsl(var(--color-warning))';
    return 'hsl(var(--color-danger))';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', width: '100%' }}>
      {scoreItems.map((item) => {
        const barColor = item.isOverall
          ? 'linear-gradient(90deg, hsl(var(--color-primary)), hsl(var(--color-accent)))'
          : 'linear-gradient(90deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.35))';

        return (
          <div
            key={item.label}
            style={{
              padding: item.isOverall ? 'var(--spacing-md)' : '0 var(--spacing-sm)',
              background: item.isOverall ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
              border: item.isOverall ? '1px solid var(--border-glass)' : 'none',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: item.isOverall ? '1rem' : '0.9rem',
                  fontWeight: item.isOverall ? 600 : 500,
                  color: item.isOverall ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontSize: item.isOverall ? '1.25rem' : '1rem',
                  fontWeight: 700,
                  color: getScoreColorClass(item.originalValue),
                }}
              >
                {item.originalValue}/100
              </span>
            </div>

            {/* Progress bar background */}
            <div
              style={{
                width: '100%',
                height: item.isOverall ? '12px' : '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Progress bar fill */}
              <div
                style={{
                  width: `${item.value}%`,
                  height: '100%',
                  background: barColor,
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: item.isOverall ? 'var(--shadow-glow-purple)' : 'none',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScoreChart;
