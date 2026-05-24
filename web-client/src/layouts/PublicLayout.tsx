import React from 'react';
import { Outlet } from 'react-router-dom';

export const PublicLayout: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-base)',
        position: 'relative',
        padding: 'var(--spacing-md)',
        overflow: 'hidden',
      }}
    >
      {/* Decorative light gradient glow behind */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, hsla(var(--color-primary) / 0.08) 0%, rgba(255,255,255,0) 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Main Content Area */}
      <div
        style={{
          zIndex: 1,
          width: '100%',
          maxWidth: '460px',
        }}
        className="animate-scale-in"
      >
        {/* Branding header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 'var(--spacing-lg)',
          }}
        >
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: '0 0 var(--spacing-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: 'hsl(var(--color-primary))' }}>✓</span>
            <span style={{
              background: 'linear-gradient(135deg, hsl(var(--color-accent)) 30%, hsl(var(--color-primary)) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>SupportHR</span>
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Hệ thống Tuyển dụng AI thông minh
          </p>
        </div>

        {/* Card containing the actual page */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-xl)', border: '1px solid rgba(0,0,0,0.06)' }}>
          <Outlet />
        </div>
      </div>
      
      {/* Footer copyright */}
      <div
        style={{
          zIndex: 1,
          marginTop: 'var(--spacing-xl)',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          letterSpacing: '0.05em',
        }}
      >
        &copy; {new Date().getFullYear()} SupportHR AI. All rights reserved.
      </div>
    </div>
  );
};
