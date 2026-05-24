import React from 'react';

export const TokenExpiredPage: React.FC = () => {
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
          background: 'rgba(245, 158, 11, 0.1)',
          border: '2px solid hsl(var(--color-warning))',
          color: 'hsl(var(--color-warning))',
          fontSize: '2rem',
          marginBottom: 'var(--spacing-xl)',
        }}
      >
        ⏳
      </div>

      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          marginBottom: 'var(--spacing-sm)',
          color: 'var(--text-primary)',
        }}
      >
        Liên kết Đã Sử dụng hoặc Hết hạn
      </h1>

      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          marginBottom: 'var(--spacing-xl)',
        }}
      >
        Liên kết mời phỏng vấn này không còn hiệu lực. Mỗi liên kết chỉ có thể xác thực một lần để bắt đầu phiên. Nếu buổi phỏng vấn của bạn đã diễn ra, vui lòng sử dụng cùng trình duyệt/thiết bị trước đó để tiếp tục.
      </p>

      <div
        style={{
          padding: 'var(--spacing-md)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          lineHeight: '1.5',
        }}
      >
        Nếu bạn cho rằng đây là một sự cố hoặc đã bị ngắt kết nối giữa chừng, vui lòng liên hệ với bộ phận nhân sự (HR) đã gửi thư mời này để yêu cầu cấp lại liên kết mới.
      </div>
    </div>
  );
};

export default TokenExpiredPage;
