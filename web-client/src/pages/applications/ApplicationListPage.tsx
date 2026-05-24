import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicationService } from '../../services/applicationService';
import type { Application } from '../../services/applicationService';
import { jobService } from '../../services/jobService';
import type { Job } from '../../services/jobService';
import { useToast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import InviteModal from '../../components/InviteModal';
import ConfirmDialog from '../../components/ConfirmDialog';

export const ApplicationListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [jobFilter, setJobFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Invite Modal State
  const [inviteApp, setInviteApp] = useState<Application | null>(null);

  // Delete State
  const [deleteApp, setDeleteApp] = useState<Application | null>(null);
  const [showRejectBeforeDelete, setShowRejectBeforeDelete] = useState(false);

  const fetchApplicationsAndJobs = async () => {
    try {
      setLoading(true);
      
      // Fetch applications
      const { applications: apps, total: totalCount } = await applicationService.getApplications(
        page,
        10,
        jobFilter || undefined,
        statusFilter || undefined
      );
      setApplications(apps);
      setTotal(totalCount);

      // Fetch jobs for the dropdown filter (only once or on page load)
      if (jobs.length === 0) {
        const { jobs: jobsList } = await jobService.getMyJobs(1, 100);
        setJobs(jobsList);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Không thể tải danh sách hồ sơ ứng tuyển.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationsAndJobs();
  }, [page, jobFilter, statusFilter]);

  const handleSendInviteConfirm = async (data: { candidateName: string; candidateEmail: string; jobTitle: string }) => {
    if (!inviteApp) return;
    try {
      await applicationService.sendInvite(inviteApp.id, {
        candidate_name: data.candidateName,
        candidate_email: data.candidateEmail,
      });
      showToast('success', `Đã gửi thư mời phỏng vấn đến ứng viên ${data.candidateName || ''}.`);
      setInviteApp(null);
      fetchApplicationsAndJobs();
    } catch (err: any) {
      throw err; // Re-throw so InviteModal can display the error
    }
  };

  // Delete handlers
  const handleDeleteClick = (app: Application) => {
    setDeleteApp(app);
    if (app.status !== 'REJECTED' && app.status !== 'ARCHIVED') {
      setShowRejectBeforeDelete(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteApp) return;
    try {
      await applicationService.deleteApplication(deleteApp.id);
      showToast('success', `Đã xóa hồ sơ ứng viên ${deleteApp.candidateName || ''} thành công.`);
      setDeleteApp(null);
      setShowRejectBeforeDelete(false);
      fetchApplicationsAndJobs();
    } catch (err: any) {
      showToast('error', err?.message || 'Không thể xóa hồ sơ ứng viên.');
    }
  };

  const handleRejectAndDeleteConfirm = async () => {
    if (!deleteApp) return;
    try {
      await applicationService.rejectApplication(deleteApp.id);
      await applicationService.deleteApplication(deleteApp.id);
      showToast('success', `Đã từ chối và xóa hồ sơ ứng viên ${deleteApp.candidateName || ''} thành công.`);
      setDeleteApp(null);
      setShowRejectBeforeDelete(false);
      fetchApplicationsAndJobs();
    } catch (err: any) {
      showToast('error', err?.message || 'Không thể từ chối và xóa hồ sơ ứng viên.');
    }
  };

  const cancelDelete = () => {
    setDeleteApp(null);
    setShowRejectBeforeDelete(false);
  };

  // Local filtering for search and status filter
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      (app.candidateName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.candidateEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Title & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Hồ sơ Ứng tuyển</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Theo dõi hồ sơ CV đã nộp và trạng thái đánh giá.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/applications/upload')}>
          📤 Tải lên PDF CV
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          gap: 'var(--spacing-md)',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flex: 1, minWidth: '240px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo tên ứng viên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '300px', flex: 1 }}
          />

          <select
            className="form-input"
            value={jobFilter}
            onChange={(e) => {
              setJobFilter(e.target.value);
              setPage(1);
            }}
            style={{ maxWidth: '200px' }}
          >
            <option value="">Tất cả Công việc</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>

          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ maxWidth: '200px' }}
          >
            <option value="">Tất cả Trạng thái</option>
            <option value="PROCESSING">Đang xử lý</option>
            <option value="READY_FOR_INTERVIEW">Sẵn sàng Phỏng vấn</option>
            <option value="CV_PARSE_FAILED">Phân tích CV Thất bại</option>
            <option value="INVITED">Đã gửi Lời mời</option>
            <option value="INTERVIEWING">Đang phỏng vấn</option>
            <option value="COMPLETED">Đã hoàn thành</option>
            <option value="REJECTED">Từ chối</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
          </select>
        </div>
      </div>

      {/* Main List Area */}
      {loading ? (
        <LoadingSpinner centered />
      ) : filteredApplications.length === 0 ? (
        <EmptyState
          title="Không tìm thấy Hồ sơ ứng tuyển"
          description={searchTerm || jobFilter || statusFilter ? "Hãy thử thay đổi từ khóa hoặc bộ lọc tìm kiếm." : "Tải lên CV của ứng viên để bắt đầu đánh giá."}
          actionText={searchTerm || jobFilter || statusFilter ? undefined : "Tải lên PDF CV"}
          onAction={() => navigate('/applications/upload')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <div
            className="glass-panel"
            style={{
              overflowX: 'auto',
              borderRadius: 'var(--radius-md)',
              padding: 0,
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.9rem',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '16px' }}>Ứng viên</th>
                  <th style={{ padding: '16px' }}>Email</th>
                  <th style={{ padding: '16px' }}>Vị trí Ứng tuyển</th>
                  <th style={{ padding: '16px' }}>Trạng thái</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    style={{
                      borderBottom: '1px solid var(--border-glass)',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    onClick={() => navigate(`/applications/${app.id}`)}
                  >
                    <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {app.candidateName || 'Đang xử lý ứng viên...'}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                      {app.candidateEmail || 'Đang trích xuất...'}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                      {app.job?.title || 'Vị trí tuyển dụng'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <StatusBadge status={app.status} />
                    </td>
                    <td
                      style={{ padding: '16px', textAlign: 'right' }}
                      onClick={(e) => e.stopPropagation()} // Avoid triggering row navigation
                    >
                      <div style={{ display: 'inline-flex', gap: 'var(--spacing-xs)', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => navigate(`/applications/${app.id}`)}
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                          🔍 Chi tiết
                        </button>
                        
                        {app.status === 'READY_FOR_INTERVIEW' && (
                          <button
                            className="btn btn-primary"
                            onClick={() => setInviteApp(app)}
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          >
                            ✉️ Mời PV
                          </button>
                        )}

                        <button
                          className="btn btn-secondary"
                          onClick={() => handleDeleteClick(app)}
                          style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'hsl(var(--color-danger))' }}
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            totalItems={total}
            itemsPerPage={10}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Invite Modal Overlay */}
      {inviteApp && (
        <InviteModal
          isOpen={!!inviteApp}
          candidateName={inviteApp.candidateName || 'Candidate'}
          candidateEmail={inviteApp.candidateEmail || ''}
          jobTitle={inviteApp.job?.title || 'Job Position'}
          onConfirm={handleSendInviteConfirm}
          onCancel={() => setInviteApp(null)}
        />
      )}

      {/* Reject-Before-Delete Dialog */}
      {deleteApp && showRejectBeforeDelete && (
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
                Bạn <strong>chưa từ chối</strong> ứng viên <strong>{deleteApp.candidateName || 'này'}</strong>. 
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

      {/* Simple Delete Confirm Dialog (for already rejected/archived) */}
      {deleteApp && !showRejectBeforeDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Xác nhận Xóa"
          message={`Bạn có chắc chắn muốn xóa hồ sơ ứng viên ${deleteApp.candidateName || ''}? Hành động này không thể hoàn tác.`}
          confirmText="Có, Xóa"
          onConfirm={handleDeleteConfirm}
          onCancel={cancelDelete}
          isDanger
        />
      )}
    </div>
  );
};

export default ApplicationListPage;
