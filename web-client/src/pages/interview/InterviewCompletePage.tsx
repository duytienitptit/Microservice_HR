import React from 'react';

interface InterviewCompletePageProps {
  candidateName: string;
  jobTitle: string;
}

export const InterviewCompletePage: React.FC<InterviewCompletePageProps> = ({
  candidateName,
  jobTitle,
}) => {
  return (
    <div
      className="animate-scale-in"
      style={{
        maxWidth: '550px',
        marginInline: 'auto',
        padding: 'var(--spacing-2xl) var(--spacing-lg)',
        textAlign: 'center',
      }}
    >
      {/* Checkmark icon wrapper */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '2px solid hsl(var(--color-success))',
          color: 'hsl(var(--color-success))',
          fontSize: '2.5rem',
          marginBottom: 'var(--spacing-xl)',
          boxShadow: 'var(--shadow-glow-cyan)',
          animation: 'pulseBrand 2s infinite',
        }}
      >
        ✓
      </div>

      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          marginBottom: 'var(--spacing-sm)',
          background: 'linear-gradient(135deg, #ffffff 40%, hsl(var(--color-success)) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Phỏng vấn Hoàn tất!
      </h1>

      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '1.05rem',
          lineHeight: '1.6',
          marginBottom: 'var(--spacing-2xl)',
        }}
      >
        Cảm ơn bạn, <strong>{candidateName}</strong>, đã hoàn thành buổi phỏng vấn sơ tuyển cho vị trí <strong>{jobTitle}</strong>. Câu trả lời của bạn đã được ghi nhận thành công trên hệ thống.
      </p>

      {/* Summary Box */}
      <div
        className="glass-panel"
        style={{
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-glass)',
          textAlign: 'left',
          marginBottom: 'var(--spacing-xl)',
        }}
      >
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 'var(--spacing-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📋</span> Các bước tiếp theo
        </h3>
        <ul
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            paddingLeft: '20px',
            listStyleType: 'disc',
            lineHeight: '1.7',
          }}
        >
          <li>Phân tích viên AI đang tổng hợp và đánh giá nội dung phỏng vấn.</li>
          <li>Báo cáo kết quả chi tiết đang được chuyển tiếp tới bộ phận tuyển dụng (HR).</li>
          <li>Chúng tôi sẽ xem xét kết quả và liên hệ lại với bạn qua email trong thời gian sớm nhất.</li>
        </ul>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Bây giờ bạn có thể đóng tab hoặc cửa sổ trình duyệt này.
      </p>
    </div>
  );
};

export default InterviewCompletePage;
