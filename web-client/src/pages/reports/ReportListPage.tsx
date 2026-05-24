import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService, AssessmentReport } from '../../services/reportService';
import { RecommendationBadge } from '../../components/RecommendationBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';

interface ReportWithDetails extends AssessmentReport {
  candidateName: string;
  jobTitle: string;
}

export const ReportListPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const loadReports = async () => {
    setLoading(true);
    try {
      const result = await reportService.getReports(page, limit);
      
      // Use denormalized candidate_name/job_title from the report document
      const detailedReports: ReportWithDetails[] = result.reports.map((report) => ({
        ...report,
        candidateName: report.candidate_name || 'Ứng viên',
        jobTitle: report.job_title || 'Vị trí Không xác định',
      }));

      setReports(detailedReports);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [page]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'hsl(var(--color-success))';
    if (score >= 60) return 'hsl(var(--color-warning))';
    return 'hsl(var(--color-danger))';
  };

  if (loading) {
    return <LoadingSpinner centered />;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Kết quả Đánh giá Phỏng vấn</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Xem điểm số đánh giá AI và đề xuất tuyển dụng cho các buổi phỏng vấn đã hoàn tất
          </p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: 'var(--spacing-2xl)',
            textAlign: 'center',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass)',
          }}
        >
          <span style={{ fontSize: '3rem' }}>🏆</span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: 'var(--spacing-md)' }}>Chưa có Báo cáo nào</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px', margin: '8px auto 0' }}>
            Sau khi ứng viên hoàn thành buổi phỏng vấn AI, báo cáo chi tiết và điểm số sẽ được tự động cập nhật tại đây.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Table Container */}
          <div
            className="glass-panel"
            style={{
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-glass)',
              overflowX: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.01)' }}>
                  <th style={{ padding: '16px var(--spacing-lg)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Tên Ứng viên
                  </th>
                  <th style={{ padding: '16px var(--spacing-lg)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Vị trí Tuyển dụng
                  </th>
                  <th style={{ padding: '16px var(--spacing-lg)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Đề xuất tuyển dụng
                  </th>
                  <th style={{ padding: '16px var(--spacing-lg)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>
                    Điểm Tổng thể
                  </th>
                  <th style={{ padding: '16px var(--spacing-lg)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Ngày Đánh giá
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report._id}
                    onClick={() => navigate(`/reports/${report.application_id}`)}
                    style={{
                      borderBottom: '1px solid var(--border-glass)',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '16px var(--spacing-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {report.candidateName}
                    </td>
                    <td style={{ padding: '16px var(--spacing-lg)', color: 'var(--text-secondary)' }}>
                      {report.jobTitle}
                    </td>
                    <td style={{ padding: '16px var(--spacing-lg)' }}>
                      <RecommendationBadge recommendation={report.recommendation} />
                    </td>
                    <td style={{ padding: '16px var(--spacing-lg)', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          color: getScoreColor(report.scores.overall),
                        }}
                      >
                        {report.scores.overall}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/100</span>
                    </td>
                    <td style={{ padding: '16px var(--spacing-lg)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {new Date(report.generated_at).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-sm)' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Trang <strong>{page}</strong> trên <strong>{totalPages}</strong> (Tổng {total} báo cáo)
              </span>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button
                  className="btn btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Trước
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportListPage;
