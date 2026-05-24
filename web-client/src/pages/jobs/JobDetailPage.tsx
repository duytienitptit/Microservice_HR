import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { jobService } from '../../services/jobService';
import type { Job } from '../../services/jobService';
import { applicationService } from '../../services/applicationService';
import type { Application } from '../../services/applicationService';
import { useToast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobAndApps = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const fetchedJob = await jobService.getJobById(id);
        setJob(fetchedJob);

        const { applications: appsList } = await applicationService.getApplications(1, 100, id);
        setApplications(appsList);
      } catch (err: any) {
        showToast('error', err?.message || 'Không thể tải thông tin chi tiết vị trí tuyển dụng.');
        navigate('/jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobAndApps();
  }, [id]);

  if (loading) {
    return <LoadingSpinner centered />;
  }

  if (!job) {
    return (
      <EmptyState
        title="Không tìm thấy Vị trí Tuyển dụng"
        description="Vị trí tuyển dụng được yêu cầu không tồn tại hoặc đã bị xóa."
        actionText="Quay lại Danh sách"
        onAction={() => navigate('/jobs')}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      {/* Header breadcrumb & actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <Link to="/jobs" style={{ color: 'var(--text-muted)' }}>Vị trí tuyển dụng</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>Chi tiết</span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
            {job.title}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginTop: '4px' }}>
            <StatusBadge status={job.status} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Tạo ngày {new Date(job.createdAt).toLocaleDateString('vi-VN')}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/jobs/${job.id}/edit`)}>
            ✏️ Sửa Vị trí
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/applications/upload?jobId=${job.id}`)}
          >
            📤 Tải lên PDF CV
          </button>
        </div>
      </div>

      {/* Detail section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--spacing-lg)',
        }}
      >
        {/* Left Side: Job details */}
        <div
          className="glass-panel"
          style={{
            padding: 'var(--spacing-lg)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
              Mô tả Công việc
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
              {job.description}
            </p>
          </div>

          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
              Yêu cầu Công việc
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
              {job.requirements}
            </p>
          </div>
        </div>

        {/* Right Side: Applicant list */}
        <div
          className="glass-panel"
          style={{
            padding: 'var(--spacing-lg)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Danh sách Ứng viên ({applications.length})
          </h3>

          {applications.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-lg)', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', marginBottom: '8px' }}>📝</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)' }}>Chưa có Ứng viên nào</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '260px' }}>
                Tải lên tệp sơ yếu lý lịch của ứng viên để bắt đầu đánh giá.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {applications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => navigate(`/applications/${app.id}`)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-glass)',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {app.candidateName || 'Ứng viên Chưa đặt tên'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {app.candidateEmail || 'Chưa trích xuất email'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <StatusBadge status={app.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailPage;
