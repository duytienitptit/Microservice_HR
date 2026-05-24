import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobService } from '../../services/jobService';
import type { Job } from '../../services/jobService';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

export const JobListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Confirm delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const { jobs: list, total: itemsCount } = await jobService.getMyJobs(page, 10, statusFilter);
      setJobs(list);
      setTotal(itemsCount);
    } catch (err: any) {
      showToast('error', err?.message || 'Không thể tải danh sách vị trí tuyển dụng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, statusFilter]);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await jobService.updateJob(deleteId, { status: 'CLOSED' });
      showToast('success', 'Đã đóng vị trí tuyển dụng thành công.');
      setDeleteId(null);
      fetchJobs();
    } catch (err: any) {
      showToast('error', err?.message || 'Không thể đóng vị trí tuyển dụng.');
    }
  };

  // Search filter locally
  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Title & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Vị trí Tuyển dụng</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Tạo và quản lý các yêu cầu tuyển dụng.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/jobs/create')}>
          + Tạo Vị trí Mới
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
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Tìm kiếm theo tiêu đề vị trí..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ maxWidth: '160px' }}
          >
            <option value="">Tất cả Trạng thái</option>
            <option value="OPEN">Đang tuyển</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
        </div>
      </div>

      {/* Main List Area */}
      {loading ? (
        <LoadingSpinner centered />
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          title="Không tìm thấy Vị trí nào"
          description={searchTerm || statusFilter ? "Hãy thử thay đổi từ khóa hoặc bộ lọc tìm kiếm." : "Hãy tạo yêu cầu tuyển dụng đầu tiên để bắt đầu."}
          actionText={searchTerm || statusFilter ? undefined : "Tạo Vị trí Tuyển dụng"}
          onAction={() => navigate('/jobs/create')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="glass-panel animate-fade-in"
              style={{
                padding: 'var(--spacing-md) var(--spacing-lg)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--spacing-md)',
                flexWrap: 'wrap',
                transition: 'border-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'hsla(var(--color-primary) / 0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-glass)')}
            >
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', flex: 1 }}
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {job.title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Tạo ngày {new Date(job.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                <StatusBadge status={job.status} />
                
                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    🔍 Chi tiết
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate(`/jobs/${job.id}/edit`)}
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setDeleteId(job.id)}
                    style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'hsl(var(--color-danger))' }}
                    disabled={job.status === 'CLOSED'}
                  >
                    ❌ Đóng
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Reusable Pagination */}
          <Pagination
            currentPage={page}
            totalItems={total}
            itemsPerPage={10}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Delete/Close Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Đóng Vị trí Tuyển dụng"
        message="Bạn có chắc chắn muốn đóng vị trí tuyển dụng này? Việc này sẽ ngăn các ứng viên gửi hồ sơ mới hoặc thực hiện phỏng vấn."
        confirmText="Có, Đóng vị trí"
        cancelText="Hủy bỏ"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
        isDanger
      />
    </div>
  );
};

export default JobListPage;
