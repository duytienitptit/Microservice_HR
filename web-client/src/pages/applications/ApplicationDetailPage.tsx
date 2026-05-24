import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { applicationService } from '../../services/applicationService';
import type { Application } from '../../services/applicationService';
import { useToast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import StatusPipeline from '../../components/StatusPipeline';
import InviteModal from '../../components/InviteModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import CvAnalysisPanel from '../../components/CvAnalysisPanel';
import CvPreviewPanel from '../../components/CvPreviewPanel';

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  // Invitation and rejection modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Delete modal states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectBeforeDelete, setShowRejectBeforeDelete] = useState(false);

  const fetchApplication = async (silent = false) => {
    if (!id) return;
    try {
      if (!silent) setLoading(true);
      const app = await applicationService.getApplicationById(id);
      setApplication(app);
    } catch (err: any) {
      showToast('error', err?.message || 'Không thể tải thông tin chi tiết hồ sơ ứng tuyển.');
      navigate('/applications');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [id]);

  // Polling for processing state (every 4 seconds)
  useEffect(() => {
    if (!application) return;
    if (application.status === 'PROCESSING' || application.status === 'PENDING') {
      const interval = setInterval(() => {
        fetchApplication(true);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [application?.status]);

  const handleSendInviteConfirm = async (data: { candidateName: string; candidateEmail: string; jobTitle: string }) => {
    if (!application) return;
    try {
      await applicationService.sendInvite(application.id, {
        candidate_name: data.candidateName,
        candidate_email: data.candidateEmail,
      });
      showToast('success', 'Đã gửi thư mời phỏng vấn thành công.');
      setShowInviteModal(false);
      fetchApplication();
    } catch (err: any) {
      throw err; // Re-throw so InviteModal can display the error
    }
  };

  const handleRejectConfirm = async () => {
    if (!application) return;
    try {
      await applicationService.rejectApplication(application.id);
      showToast('success', 'Đã từ chối ứng viên. Email từ chối đã được gửi.');
      setShowRejectDialog(false);
      fetchApplication();
    } catch (err: any) {
      showToast('error', err?.message || 'Không thể từ chối ứng viên.');
    }
  };

  const handleArchiveConfirm = async () => {
    if (!application) return;
    try {
      await applicationService.updateStatus(application.id, 'ARCHIVED');
      showToast('success', 'Đã chuyển trạng thái hồ sơ thành Lưu trữ.');
      setShowArchiveDialog(false);
      fetchApplication();
    } catch (err: any) {
      showToast('error', err?.message || 'Không thể lưu trữ hồ sơ.');
    }
  };

  // Delete handlers
  const handleDeleteClick = () => {
    if (application?.status !== 'REJECTED' && application?.status !== 'ARCHIVED') {
      setShowRejectBeforeDelete(true);
    } else {
      setShowDeleteDialog(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!application) return;
    try {
      await applicationService.deleteApplication(application.id);
      showToast('success', 'Đã xóa hồ sơ ứng viên thành công.');
      navigate('/applications');
    } catch (err: any) {
      showToast('error', err?.message || 'Không thể xóa hồ sơ ứng viên.');
    }
  };

  const handleRejectAndDeleteConfirm = async () => {
    if (!application) return;
    try {
      await applicationService.rejectApplication(application.id);
      await applicationService.deleteApplication(application.id);
      showToast('success', 'Đã từ chối và xóa hồ sơ ứng viên thành công.');
      navigate('/applications');
    } catch (err: any) {
      showToast('error', err?.message || 'Không thể từ chối và xóa hồ sơ ứng viên.');
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setShowRejectBeforeDelete(false);
  };

  const copyMagicLink = () => {
    if (!application?.magicLinkToken) return;
    const origin = window.location.origin;
    const link = `${origin}/interview/${application.magicLinkToken}`;
    navigator.clipboard.writeText(link);
    showToast('success', 'Đã sao chép liên kết phỏng vấn vào bộ nhớ tạm.');
  };

  if (loading) {
    return <LoadingSpinner centered />;
  }

  if (!application) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <h3>Không tìm thấy Hồ sơ ứng tuyển</h3>
        <button className="btn btn-primary" onClick={() => navigate('/applications')}>
          Quay lại Danh sách
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      {/* Header breadcrumb & actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <Link to="/applications" style={{ color: 'var(--text-muted)' }}>Hồ sơ ứng tuyển</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>Chi tiết</span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
            {application.candidateName || 'Đang xử lý Hồ sơ CV'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginTop: '4px' }}>
            <StatusBadge status={application.status} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Đã nộp lúc {new Date(application.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        {/* Global actions */}
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
          {application.status === 'READY_FOR_INTERVIEW' && (
            <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
              ✉️ Gửi Lời mời Phỏng vấn
            </button>
          )}

          {application.status === 'COMPLETED' && (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/reports/${application.id}`)}
            >
              🏆 Xem Báo cáo Đánh giá
            </button>
          )}

          {application.status !== 'REJECTED' && application.status !== 'ARCHIVED' && application.status !== 'COMPLETED' && (
            <button className="btn btn-secondary" style={{ color: 'hsl(var(--color-danger))' }} onClick={() => setShowRejectDialog(true)}>
              ⛔ Từ chối Ứng viên
            </button>
          )}

          {application.status === 'COMPLETED' && (
            <button className="btn btn-secondary" onClick={() => setShowArchiveDialog(true)}>
              📁 Lưu trữ
            </button>
          )}

          <button className="btn btn-secondary" style={{ color: 'hsl(var(--color-danger))' }} onClick={handleDeleteClick}>
            🗑️ Xóa Ứng viên
          </button>
        </div>
      </div>

      {/* Visual Pipeline View */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
          Quy trình Đánh giá Hồ sơ
        </h3>
        <StatusPipeline currentStatus={application.status} />
      </div>

      {/* Main Splits details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--spacing-lg)',
        }}
      >
        {/* Profile Card */}
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px', margin: 0 }}>
            Thông tin Ứng viên
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Họ và tên:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {application.candidateName || 'Đang trích xuất từ tệp...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Email:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {application.candidateEmail || 'Đang trích xuất từ tệp...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Vị trí Ứng tuyển:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {application.job?.title || 'Vị trí công việc'}
              </span>
            </div>
          </div>
        </div>

        {/* CV File metadata */}
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px', margin: 0 }}>
            Tệp CV đã tải lên
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-sm)', background: '#f8fafc', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
              <span style={{ fontSize: '1.5rem' }}>📄</span>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {application.cvFilePath.split('/').pop()}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tài liệu PDF</span>
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Thư mục lưu trữ: <code style={{ wordBreak: 'break-all' }}>{application.cvFilePath}</code>
            </span>
          </div>
        </div>
      </div>

      {/* CV Analysis & Preview - shown when READY_FOR_INTERVIEW or later */}
      {!['PENDING', 'PROCESSING', 'CV_PARSE_FAILED'].includes(application.status) && (
        <>
          <CvAnalysisPanel applicationId={application.id} />
          <CvPreviewPanel
            applicationId={application.id}
            fileName={application.cvFilePath.split('/').pop()}
          />
        </>
      )}

      {/* Magic Link / Status Helper panels */}
      {application.status === 'INVITED' && application.magicLinkToken && (
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid hsl(var(--color-primary))', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Đã Tạo Thư mời Phỏng vấn
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--spacing-md)' }}>
            Thư mời phỏng vấn bằng email đã được gửi đi. Để kiểm tra hoặc chia sẻ thủ công, bạn có thể sao chép liên kết phỏng vấn trực tiếp dưới đây:
          </p>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0, 0, 0, 0.06)', justifyContent: 'space-between', overflow: 'hidden' }}>
            <code style={{ fontSize: '0.85rem', color: 'hsl(var(--color-accent))', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1, paddingRight: '12px' }}>
              {window.location.origin}/interview/{application.magicLinkToken}
            </code>
            <button className="btn btn-secondary" onClick={copyMagicLink} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
              📋 Sao chép liên kết
            </button>
          </div>
        </div>
      )}

      {application.status === 'PROCESSING' && (
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid hsl(var(--color-primary))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <LoadingSpinner size="sm" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              AI đang phân tích tệp CV
            </h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px', marginBottom: 0 }}>
            Hệ thống RAG đang xử lý tệp PDF. Tên ứng viên, email và các thông tin khớp sẽ tự động hiển thị sau khi hoàn tất.
          </p>
        </div>
      )}

      {/* Modals and Overlays */}
      <InviteModal
        isOpen={showInviteModal}
        candidateName={application.candidateName || 'Candidate'}
        candidateEmail={application.candidateEmail || ''}
        jobTitle={application.job?.title || 'Job Position'}
        onConfirm={handleSendInviteConfirm}
        onCancel={() => setShowInviteModal(false)}
      />

      <ConfirmDialog
        isOpen={showRejectDialog}
        title="Từ chối Ứng viên"
        message={`Bạn có chắc chắn muốn từ chối ứng viên ${application.candidateName || ''}? Trạng thái hồ sơ của ứng viên sẽ được chuyển sang TỪ CHỐI và email thông báo từ chối sẽ được gửi cho ứng viên.`}
        confirmText="Có, Từ chối"
        onConfirm={handleRejectConfirm}
        onCancel={() => setShowRejectDialog(false)}
        isDanger
      />

      <ConfirmDialog
        isOpen={showArchiveDialog}
        title="Lưu trữ Ứng viên"
        message={`Bạn có chắc chắn muốn lưu trữ ứng viên ${application.candidateName || ''}? Trạng thái hồ sơ của ứng viên sẽ được chuyển sang LƯU TRỮ.`}
        confirmText="Có, Lưu trữ"
        onConfirm={handleArchiveConfirm}
        onCancel={() => setShowArchiveDialog(false)}
      />

      {/* Reject-Before-Delete Dialog */}
      {showRejectBeforeDelete && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999, padding: 'var(--spacing-md)',
          }}
        >
          <div
            className="glass-panel animate-scale-in"
            style={{
              width: '100%', maxWidth: '480px', borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg), 0 0 50px rgba(0,0,0,0.5)',
              background: 'rgba(10, 15, 32, 0.95)', border: '1px solid var(--border-glass)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-glass)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                ⚠️ Xóa Hồ sơ Ứng viên
              </h3>
            </div>
            <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Bạn <strong>chưa từ chối</strong> ứng viên <strong>{application.candidateName || 'này'}</strong>. 
                Bạn muốn xử lý như thế nào?
              </p>
            </div>
            <div style={{
              padding: 'var(--spacing-md) var(--spacing-lg)', background: 'rgba(0, 0, 0, 0.25)',
              display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)',
              borderTop: '1px solid var(--border-glass)', flexWrap: 'wrap',
            }}>
              <button className="btn btn-secondary" onClick={cancelDelete} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                Hủy bỏ
              </button>
              <button className="btn btn-secondary" onClick={handleDeleteConfirm} style={{ padding: '8px 16px', fontSize: '0.9rem', color: 'hsl(var(--color-danger))' }}>
                Xóa không từ chối
              </button>
              <button className="btn btn-danger" onClick={handleRejectAndDeleteConfirm} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                Từ chối & Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Xác nhận Xóa"
        message={`Bạn có chắc chắn muốn xóa hồ sơ ứng viên ${application.candidateName || ''}? Hành động này không thể hoàn tác.`}
        confirmText="Có, Xóa"
        onConfirm={handleDeleteConfirm}
        onCancel={cancelDelete}
        isDanger
      />
    </div>
  );
};

export default ApplicationDetailPage;
