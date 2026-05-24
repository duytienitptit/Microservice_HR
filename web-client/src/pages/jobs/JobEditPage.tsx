import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jobService } from '../../services/jobService';
import { useToast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export const JobEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    status: 'OPEN' as 'OPEN' | 'DRAFT' | 'CLOSED',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const job = await jobService.getJobById(id);
        setFormData({
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          status: job.status,
        });
      } catch (err: any) {
        showToast('error', err?.message || 'Không thể tải thông tin chi tiết công việc.');
        navigate('/jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Tiêu đề công việc là bắt buộc';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Mô tả công việc là bắt buộc';
    }
    if (!formData.requirements.trim()) {
      newErrors.requirements = 'Yêu cầu công việc là bắt buộc';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !id) return;

    setUpdating(true);
    try {
      await jobService.updateJob(id, {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        status: formData.status,
      });
      showToast('success', 'Cập nhật vị trí tuyển dụng thành công.');
      navigate('/jobs');
    } catch (err: any) {
      showToast('error', err?.message || 'Cập nhật vị trí tuyển dụng thất bại.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner centered />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', maxWidth: '700px', margin: '0 auto' }}>
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Chỉnh sửa Vị trí Tuyển dụng</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Cập nhật thông tin chi tiết và yêu cầu tuyển dụng.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: 'var(--spacing-xl)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        {/* Title */}
        <div className="form-group">
          <label className="form-label" htmlFor="title">Tiêu đề Công việc</label>
          <input
            id="title"
            name="title"
            type="text"
            className={`form-input ${errors.title ? 'has-error' : ''}`}
            placeholder="Ví dụ: Kỹ sư Backend cấp cao"
            value={formData.title}
            onChange={handleChange}
            disabled={updating}
          />
          {errors.title && <span className="form-error">⚠️ {errors.title}</span>}
        </div>

        {/* Status selection */}
        <div className="form-group">
          <label className="form-label" htmlFor="status">Trạng thái Đăng tuyển</label>
          <select
            id="status"
            name="status"
            className="form-input"
            value={formData.status}
            onChange={handleChange}
            disabled={updating}
          >
            <option value="OPEN">Đang tuyển</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label" htmlFor="description">Mô tả Công việc</label>
          <textarea
            id="description"
            name="description"
            rows={5}
            className={`form-input ${errors.description ? 'has-error' : ''}`}
            placeholder="Mô tả nhiệm vụ công việc..."
            value={formData.description}
            onChange={handleChange}
            disabled={updating}
            style={{ fontFamily: 'inherit', resize: 'vertical' }}
          />
          {errors.description && <span className="form-error">⚠️ {errors.description}</span>}
        </div>

        {/* Requirements */}
        <div className="form-group">
          <label className="form-label" htmlFor="requirements">Yêu cầu Ứng viên</label>
          <textarea
            id="requirements"
            name="requirements"
            rows={5}
            className={`form-input ${errors.requirements ? 'has-error' : ''}`}
            placeholder="Ví dụ: Node.js, Express..."
            value={formData.requirements}
            onChange={handleChange}
            disabled={updating}
            style={{ fontFamily: 'inherit', resize: 'vertical' }}
          />
          {errors.requirements && <span className="form-error">⚠️ {errors.requirements}</span>}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)', borderTop: '1px solid var(--border-glass)', paddingTop: 'var(--spacing-md)' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/jobs')}
            disabled={updating}
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={updating}
            style={{ minWidth: '120px' }}
          >
            {updating ? <LoadingSpinner size="sm" /> : 'Lưu Thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobEditPage;
