import React from 'react';
import { InterviewStage } from '../services/interviewService';

interface StageProgressProps {
  currentStage: InterviewStage;
}

interface StageItem {
  key: InterviewStage;
  label: string;
  shortLabel: string;
}

const STAGES: StageItem[] = [
  { key: 'GREETING', label: 'Chào hỏi', shortLabel: 'Chào hỏi' },
  { key: 'EXPERIENCE_REVIEW', label: 'Xem xét CV', shortLabel: 'CV' },
  { key: 'TECHNICAL_QUESTIONS', label: 'Hỏi Kỹ thuật', shortLabel: 'Kỹ thuật' },
  { key: 'SCENARIO_QUESTIONS', label: 'Tình huống', shortLabel: 'Tình huống' },
  { key: 'CLOSING', label: 'Kết thúc', shortLabel: 'Kết thúc' },
];

export const StageProgress: React.FC<StageProgressProps> = ({ currentStage }) => {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div style={{ width: '100%', padding: 'var(--spacing-md) 0', borderBottom: '1px solid var(--border-glass)' }}>
      {/* Stepper container */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', maxWidth: '800px', marginInline: 'auto' }}>
        {/* Connecting progress line */}
        <div style={{
          position: 'absolute',
          top: '18px',
          left: '4%',
          right: '4%',
          height: '2px',
          background: 'rgba(255, 255, 255, 0.08)',
          zIndex: 1,
        }} />

        {/* Filling progress line */}
        <div style={{
          position: 'absolute',
          top: '18px',
          left: '4%',
          width: `${(Math.max(0, currentIndex) / (STAGES.length - 1)) * 92}%`,
          height: '2px',
          background: 'linear-gradient(90deg, hsl(var(--color-primary)), hsl(var(--color-accent)))',
          zIndex: 1,
          transition: 'width 0.4s ease',
        }} />

        {/* Steps */}
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;
          
          let circleBg = 'var(--color-bg-secondary)';
          let circleBorder = '2px solid rgba(255, 255, 255, 0.12)';
          let circleColor = 'var(--text-muted)';
          let glowClass = '';

          if (isCompleted) {
            circleBg = 'hsl(var(--color-accent))';
            circleBorder = '2px solid hsl(var(--color-accent))';
            circleColor = 'var(--text-inverse)';
          } else if (isActive) {
            circleBg = 'var(--color-bg-surface)';
            circleBorder = '2px solid hsl(var(--color-primary))';
            circleColor = 'hsl(var(--color-primary))';
            glowClass = 'glow-border-purple';
          }

          return (
            <div
              key={stage.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 2,
                flex: 1,
              }}
            >
              {/* Step indicator circle */}
              <div
                className={glowClass}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-full)',
                  background: circleBg,
                  border: circleBorder,
                  color: circleColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  boxShadow: isActive ? 'var(--shadow-glow-purple)' : 'none',
                }}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>

              {/* Label - Desktop only (visible, short label shown on mobile) */}
              <span
                style={{
                  marginTop: '8px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive
                    ? 'var(--text-primary)'
                    : isCompleted
                    ? 'var(--text-secondary)'
                    : 'var(--text-muted)',
                  textAlign: 'center',
                  transition: 'color 0.3s ease',
                }}
              >
                {/* Desktop label / Mobile fallback in CSS media query styles */}
                <span className="desktop-only">{stage.label}</span>
                <span className="mobile-only">{stage.shortLabel}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
