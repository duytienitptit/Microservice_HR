import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: 'var(--spacing-xl)',
      }}
      className="animate-scale-in"
    >
      <div style={{ fontSize: '4rem', fontWeight: 800, color: 'hsl(var(--color-primary))', marginBottom: 'var(--spacing-sm)' }}>
        404
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>
        Không Tìm Thấy Trang
      </h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: 'var(--spacing-lg)' }}>
        Đường dẫn bạn yêu cầu có thể bị hỏng hoặc trang đã bị di chuyển.
      </p>
      <Link to="/dashboard" className="btn btn-primary">
        Quay lại Tổng quan
      </Link>
    </div>
  );
};
