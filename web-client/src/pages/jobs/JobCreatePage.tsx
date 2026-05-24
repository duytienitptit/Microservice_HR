import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobService } from '../../services/jobService';
import { useToast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export const JobCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    status: 'OPEN' as 'OPEN' | 'DRAFT',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!validateForm()) return;

    setLoading(true);
    try {
      await jobService.createJob({
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        status: formData.status as any,
      });
      showToast('success', 'Tạo vị trí tuyển dụng thành công.');
      navigate('/jobs');
    } catch (err: any) {
      showToast('error', err?.message || 'Tạo vị trí tuyển dụng thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', maxWidth: '700px', margin: '0 auto' }}>
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Tạo Vị trí Tuyển dụng</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Soạn thảo hoặc đăng tuyển một yêu cầu tuyển dụng mới.</p>
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
            disabled={loading}
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
            disabled={loading}
          >
            <option value="OPEN">Đang tuyển (Đăng ngay lập tức)</option>
            <option value="DRAFT">Bản nháp</option>
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
            placeholder="Mô tả nhiệm vụ công việc, trọng tâm vai trò, môi trường làm việc, v.v."
            value={formData.description}
            onChange={handleChange}
            disabled={loading}
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
            placeholder="e.g. Node.js, Express, Postgres, Docker, RabbitMQ"
            value={formData.requirements}
            onChange={handleChange}
            disabled={loading}
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
            disabled={loading}
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ minWidth: '120px' }}
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Tạo Vị trí'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobCreatePage;
