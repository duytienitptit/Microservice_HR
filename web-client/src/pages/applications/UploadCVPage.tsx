import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jobService } from '../../services/jobService';
import type { Job } from '../../services/jobService';
import { applicationService } from '../../services/applicationService';
import { useToast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export const UploadCVPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<{ existingApplicationId: string } | null>(null);

  // Drag & Drop State
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoadingJobs(true);
        const { jobs: list } = await jobService.getMyJobs(1, 100);
        // Only active jobs can receive applications
        const openJobs = list.filter((j) => j.status === 'OPEN');
        setJobs(openJobs);

        // Pre-select job if passed in URL
        const urlJobId = searchParams.get('jobId');
        if (urlJobId && openJobs.some((j) => j.id === urlJobId)) {
          setSelectedJobId(urlJobId);
        } else if (openJobs.length > 0) {
          setSelectedJobId(openJobs[0].id);
        }
      } catch (err: any) {
        showToast('error', 'Không thể tải danh sách vị trí tuyển dụng đang mở.');
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchJobs();
  }, [searchParams]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!selectedJobId) {
      errors.jobId = 'Vui lòng chọn một vị trí tuyển dụng';
    }

    if (!selectedFile) {
      errors.file = 'Vui lòng tải lên tệp CV định dạng PDF';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (file: File) => {
    // Validate File Constraints (PDF only, max 5MB)
    if (file.type !== 'application/pdf') {
      showToast('error', 'Chỉ cho phép tải lên tệp định dạng PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Kích thước tệp vượt quá giới hạn 5MB.');
      return;
    }

    setSelectedFile(file);
    setFormErrors((prev) => ({ ...prev, file: '' }));
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !selectedFile) return;

    setSubmitting(true);
    try {
      const application = await applicationService.uploadCV(selectedJobId, selectedFile);
      showToast('success', 'Tải lên CV thành công. Đang bắt đầu quá trình xử lý.');
      navigate(`/applications/${application.id}`);
    } catch (err: any) {
      if (err?.code === 'DUPLICATE_APPLICATION' && err?.details?.existingApplicationId) {
        setDuplicateInfo({ existingApplicationId: err.details.existingApplicationId });
      } else {
        showToast('error', err?.message || 'Tải lên CV thất bại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJobs) {
    return <LoadingSpinner centered />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', maxWidth: '600px', margin: '0 auto' }}>
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Tải lên CV Ứng viên</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Tải lên sơ yếu lý lịch PDF để bắt đầu quy trình sơ tuyển bằng AI.</p>
      </div>

      {jobs.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <span style={{ fontSize: '2.5rem' }}>⚠️</span>
          <h3 style={{ fontSize: '1.2rem', marginTop: 'var(--spacing-sm)', color: 'var(--text-primary)' }}>Chưa có Vị trí Tuyển dụng Hoạt động</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--spacing-md)' }}>
            Bạn cần tạo ít nhất một vị trí tuyển dụng ở trạng thái "Đang tuyển" (OPEN) trước khi tải lên CV.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/jobs/create')}>
            Tạo vị trí Tuyển dụng
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: 'var(--spacing-xl)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Job Position Dropdown */}
          <div className="form-group">
            <label className="form-label" htmlFor="jobId">Ứng tuyển vào Vị trí</label>
            <select
              id="jobId"
              name="jobId"
              className={`form-input ${formErrors.jobId ? 'has-error' : ''}`}
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              disabled={submitting}
            >
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
            {formErrors.jobId && <span className="form-error">⚠️ {formErrors.jobId}</span>}
          </div>



          {/* File Upload Dropzone */}
          <div className="form-group">
            <label className="form-label">Tải tài liệu CV</label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: dragActive ? '2px dashed hsl(var(--color-primary))' : '1px dashed rgba(0, 0, 0, 0.15)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: dragActive ? '#f1f5f9' : '#f8fafc',
                padding: 'var(--spacing-xl) var(--spacing-md)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-normal)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={onFileInputChange}
                disabled={submitting}
              />
              
              <span style={{ fontSize: '2.5rem' }}>📤</span>
              
              {selectedFile ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedFile.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB &bull; Nhấn để thay thế tệp khác
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Kéo & Thả tệp PDF CV vào đây, hoặc click để duyệt tìm
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Chỉ hỗ trợ tệp định dạng PDF. Dung lượng tối đa 5MB.
                  </span>
                </div>
              )}
            </div>
            {formErrors.file && <span className="form-error">⚠️ {formErrors.file}</span>}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)', borderTop: '1px solid var(--border-glass)', paddingTop: 'var(--spacing-md)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/applications')}
              disabled={submitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ minWidth: '120px' }}
            >
              {submitting ? <LoadingSpinner size="sm" /> : 'Tải lên CV'}
            </button>
          </div>
        </form>
      )}

      {duplicateInfo && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-panel" style={{
            padding: 'var(--spacing-xl)', borderRadius: 'var(--radius-lg)',
            maxWidth: '460px', width: '90%', textAlign: 'center',
            display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)'
          }}>
            <span style={{ fontSize: '3rem' }}>⚠️</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Hồ sơ Trùng lặp
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Ứng viên với email này đã ứng tuyển cho vị trí này trước đó. Bạn có muốn xem hồ sơ đã tồn tại không?
            </p>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center', marginTop: 'var(--spacing-sm)' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDuplicateInfo(null)}
              >
                Đóng
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/applications/${duplicateInfo.existingApplicationId}`)}
              >
                Xem hồ sơ cũ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadCVPage;
