import React from 'react';
import type { ApplicationStatus } from '../services/applicationService';

interface StatusPipelineProps {
  currentStatus: ApplicationStatus;
}

interface Step {
  key: string;
  label: string;
  statuses: ApplicationStatus[];
}

export const StatusPipeline: React.FC<StatusPipelineProps> = ({ currentStatus }) => {
  const steps: Step[] = [
    { key: 'processing', label: 'Đang xử lý CV', statuses: ['PENDING', 'PROCESSING'] },
    { key: 'ready', label: 'Sẵn sàng phỏng vấn', statuses: ['READY_FOR_INTERVIEW'] },
    { key: 'invited', label: 'Đã mời', statuses: ['INVITED'] },
    { key: 'interviewing', label: 'Đang phỏng vấn', statuses: ['INTERVIEWING'] },
    { key: 'completed', label: 'Đã hoàn thành', statuses: ['COMPLETED'] },
  ];

  // Helper to determine the active index
  const getActiveIndex = () => {
    if (currentStatus === 'CV_PARSE_FAILED' || currentStatus === 'REJECTED' || currentStatus === 'ARCHIVED') {
      // Find where it branched or just show up to where it was (we'll display warning separately)
      return -1;
    }
    return steps.findIndex((step) => step.statuses.includes(currentStatus));
  };

  const activeIndex = getActiveIndex();
  const currentStepIndex = steps.findIndex((step) => step.statuses.includes(currentStatus));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Horizontal Pipeline Steps */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          padding: '12px 0',
          overflowX: 'auto',
          gap: 'var(--spacing-md)',
        }}
      >
        {/* Connecting Line behind steps */}
        <div
          style={{
            position: 'absolute',
            top: '32px',
            left: '32px',
            right: '32px',
            height: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            zIndex: 1,
          }}
        />

        {steps.map((step, idx) => {
          const isCompleted = activeIndex > idx || currentStatus === 'COMPLETED';
          const isActive = currentStepIndex === idx;

          let stepBg = 'rgba(255, 255, 255, 0.05)';
          let borderStyle = '1px solid var(--border-glass)';
          let labelColor = 'var(--text-muted)';
          let numberColor = 'var(--text-secondary)';

          if (isCompleted) {
            stepBg = 'linear-gradient(135deg, hsl(var(--color-success)), hsl(var(--color-success) / 0.8))';
            borderStyle = '1px solid hsla(var(--color-success) / 0.3)';
            labelColor = 'var(--text-primary)';
            numberColor = '#fff';
          } else if (isActive) {
            stepBg = 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-accent)))';
            borderStyle = '1px solid hsla(var(--color-primary) / 0.3)';
            labelColor = 'var(--text-primary)';
            numberColor = '#fff';
          }

          return (
            <div
              key={step.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                minWidth: '100px',
                zIndex: 2,
                position: 'relative',
              }}
            >
              {/* Node Circle */}
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: stepBg,
                  border: borderStyle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: numberColor,
                  boxShadow: isActive ? 'var(--shadow-glow-purple)' : 'none',
                  transition: 'all var(--transition-normal)',
                }}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>

              {/* Label */}
              <span
                style={{
                  marginTop: '10px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 600 : 500,
                  color: labelColor,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Exception banner for special statuses */}
      {(currentStatus === 'CV_PARSE_FAILED' || currentStatus === 'REJECTED' || currentStatus === 'ARCHIVED') && (
        <div
          className="alert alert-danger"
          style={{
            marginTop: 'var(--spacing-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            borderLeft: '4px solid hsl(var(--color-danger))',
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <div>
            <strong style={{ display: 'block' }}>
              Hồ sơ {currentStatus === 'CV_PARSE_FAILED' ? 'phân tích thất bại' : currentStatus === 'REJECTED' ? 'đã bị từ chối' : 'đã được lưu trữ'}
            </strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Hồ sơ này ở trạng thái {currentStatus === 'CV_PARSE_FAILED' ? 'PHÂN TÍCH THẤT BẠI' : currentStatus === 'REJECTED' ? 'TỪ CHỐI' : 'LƯU TRỮ'}. Tiến trình tuyển dụng tiêu chuẩn đã dừng.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusPipeline;
