import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface InviteModalProps {
  isOpen: boolean;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  onConfirm: (data: { candidateName: string; candidateEmail: string; jobTitle: string }) => Promise<void>;
  onCancel: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  candidateName,
  candidateEmail,
  jobTitle,
  onConfirm,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Editable form state
  const [editName, setEditName] = useState(candidateName);
  const [editEmail, setEditEmail] = useState(candidateEmail);
  const [editJobTitle, setEditJobTitle] = useState(jobTitle);

  // Sync from props when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setEditName(candidateName);
      setEditEmail(candidateEmail);
      setEditJobTitle(jobTitle);
      setError(null);
      setValidationError(null);
    }
  }, [isOpen, candidateName, candidateEmail, jobTitle]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = async () => {
    if (!editName.trim()) {
      setValidationError('Tên ứng viên không được để trống.');
      return;
    }
    if (!editEmail.trim() || !editEmail.includes('@')) {
      setValidationError('Email ứng viên không hợp lệ.');
      return;
    }
    setValidationError(null);
    setLoading(true);
    setError(null);
    try {
      await onConfirm({
        candidateName: editName.trim(),
        candidateEmail: editEmail.trim(),
        jobTitle: editJobTitle.trim(),
      });
    } catch (err: any) {
      console.error('Failed to send interview invitation:', err);
      setError(err?.message || 'Không thể gửi thư mời phỏng vấn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 'var(--spacing-md)',
      }}
    >
      <div
        className="glass-panel animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '480px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg), 0 0 50px rgba(0,0,0,0.5)',
          background: 'rgba(10, 15, 32, 0.95)',
          border: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--spacing-lg)',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Gửi Thư mời Phỏng vấn
          </h3>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.25rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {error && (
            <div className="alert alert-danger" style={{ margin: 0 }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Kiểm tra thông tin ứng viên bên dưới và chỉnh sửa nếu cần trước khi gửi lời mời phỏng vấn.
          </p>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-sm)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ứng viên:</label>
              <input
                type="text"
                className="form-input"
                value={editName}
                onChange={(e) => { setEditName(e.target.value); setValidationError(null); }}
                placeholder="Nhập tên ứng viên"
                disabled={loading}
                style={{ fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Email:</label>
              <input
                type="email"
                className="form-input"
                value={editEmail}
                onChange={(e) => { setEditEmail(e.target.value); setValidationError(null); }}
                placeholder="Nhập email ứng viên"
                disabled={loading}
                style={{ fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Vị trí Tuyển dụng:</label>
              <input
                type="text"
                className="form-input"
                value={editJobTitle}
                onChange={(e) => setEditJobTitle(e.target.value)}
                placeholder="Nhập vị trí tuyển dụng"
                disabled={loading}
                style={{ fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {validationError && (
            <div className="alert alert-danger" style={{ margin: 0 }}>
              <span>⚠️</span>
              <span>{validationError}</span>
            </div>
          )}

          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
            * Lưu ý: Gửi lời mời này sẽ chuyển trạng thái của hồ sơ sang <strong>ĐÃ MỜI (INVITED)</strong>. Ứng viên sẽ nhận được thư mời tham gia cuộc phỏng vấn sơ tuyển.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 'var(--spacing-md) var(--spacing-lg)',
            background: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--spacing-sm)',
            borderTop: '1px solid var(--border-glass)',
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            Hủy bỏ
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading}
            style={{ padding: '8px 16px', fontSize: '0.9rem', minWidth: '120px' }}
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Gửi Lời mời'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
