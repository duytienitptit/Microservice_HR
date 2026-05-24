import React from 'react';

interface InterviewLandingPageProps {
  candidateName: string;
  jobTitle: string;
  onStart: () => void;
  isLoading: boolean;
}

export const InterviewLandingPage: React.FC<InterviewLandingPageProps> = ({
  candidateName,
  jobTitle,
  onStart,
  isLoading,
}) => {
  return (
    <div className="animate-slide-up" style={{ maxWidth: '600px', marginInline: 'auto', padding: 'var(--spacing-lg)' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div style={{
          fontSize: '4.5rem',
          lineHeight: '1',
          marginBottom: 'var(--spacing-md)',
          animation: 'float 3s ease-in-out infinite'
        }}>
          🤖
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 'var(--spacing-xs)'
        }}>
          Phỏng vấn Sơ tuyển AI
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Phát triển bởi SupportHR
        </p>
      </div>

      <div className="card" style={{
        padding: 'var(--spacing-xl)',
        marginBottom: 'var(--spacing-lg)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(10px)',
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 'var(--spacing-md)',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: 'var(--spacing-sm)'
        }}>
          Chào mừng, {candidateName}!
        </h2>

        <p style={{ color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: 'var(--spacing-md)' }}>
          Bạn đã được mời tham gia buổi phỏng vấn cho vị trí <strong>{jobTitle}</strong>.
        </p>

        <div style={{
          background: 'rgba(59, 130, 246, 0.05)',
          borderLeft: '4px solid var(--primary-color)',
          padding: 'var(--spacing-md)',
          borderRadius: '0 var(--border-radius-sm) var(--border-radius-sm) 0',
          marginBottom: 'var(--spacing-lg)',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          color: 'var(--text-secondary)'
        }}>
          <strong style={{ color: 'var(--primary-color)', display: 'block', marginBottom: '4px' }}>
            Hướng dẫn:
          </strong>
          Đây là một buổi phỏng vấn có cấu trúc dưới hình thức nhắn tin (chat) do Phỏng vấn viên AI của chúng tôi thực hiện. Buổi phỏng vấn gồm 5 giai đoạn: giới thiệu bản thân, đánh giá kinh nghiệm, kiểm tra kỹ thuật, xử lý tình huống và đóng phỏng vấn. Hãy trả lời một cách tự nhiên và chi tiết nhất. Không giới hạn thời gian trả lời, bạn có thể tải lại trang để tiếp tục bất cứ lúc nào nếu bị gián đoạn kết nối.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💬</span> <span>Hình thức: Nhắn tin trực tuyến (Chỉ dùng văn bản)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊</span> <span>Giai đoạn: 5 (Chào hỏi, Kinh nghiệm, Kỹ thuật, Tình huống, Đóng phỏng vấn)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⏱️</span> <span>Thời lượng: Khoảng 15–20 phút</span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          className="btn btn-primary pulse-glow"
          onClick={onStart}
          disabled={isLoading}
          style={{
            width: '100%',
            maxWidth: '320px',
            height: '52px',
            fontSize: '1.1rem',
            fontWeight: 600,
            borderRadius: '26px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          {isLoading ? 'Đang khởi tạo...' : 'Bắt đầu Phỏng vấn'}
        </button>
      </div>
    </div>
  );
};
