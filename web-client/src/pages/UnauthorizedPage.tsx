import React from 'react';
import { useNavigate } from 'react-router-dom';

interface UnauthorizedPageProps {
  message?: string;
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({ message }) => {
  const navigate = useNavigate();

  return (
    <div
      className="animate-scale-in"
      style={{
        maxWidth: '500px',
        marginInline: 'auto',
        padding: 'var(--spacing-2xl) var(--spacing-lg)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '72px',
          height: '72px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid hsl(var(--color-danger))',
          color: 'hsl(var(--color-danger))',
          fontSize: '2rem',
          marginBottom: 'var(--spacing-xl)',
        }}
      >
        🔒
      </div>

      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          marginBottom: 'var(--spacing-sm)',
          color: 'var(--text-primary)',
        }}
      >
        Truy cập bị Từ chối
      </h1>

      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          marginBottom: 'var(--spacing-xl)',
        }}
      >
        {message || 'Bạn không có quyền truy cập trang này. Mã liên kết mời phỏng vấn không hợp lệ, không tồn tại hoặc đã hết hạn.'}
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--spacing-md)' }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/login')}
          style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)' }}
        >
          Đi tới Đăng nhập
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
