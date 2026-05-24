import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { jobService } from '../services/jobService';
import { applicationService } from '../services/applicationService';
import { reportService } from '../services/reportService';
import type { Application } from '../services/applicationService';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import { Link, useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalCVs: 0,
    interviewsCompleted: 0,
    avgScore: 'N/A',
  });
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch Jobs
        const { jobs } = await jobService.getMyJobs(1, 100);
        const activeJobsCount = jobs.filter(j => j.status === 'OPEN').length;

        // Fetch Applications
        const { applications, total: totalApps } = await applicationService.getApplications(1, 100);
        
        // Count interviews completed
        const completedApps = applications.filter(app => app.status === 'COMPLETED').length;

        // Fetch Reports for avgScore
        let avgScoreStr = 'N/A';
        try {
          const { reports } = await reportService.getReports(1, 100);
          if (reports.length > 0) {
            const avg = reports.reduce((sum, r) => sum + (r.scores?.overall || 0), 0) / reports.length;
            avgScoreStr = avg.toFixed(1) + '%';
          }
        } catch (e) {
          // Reports may not be available yet
        }

        // Recent applications (take first 5)
        const recent = applications.slice(0, 5);

        setStats({
          activeJobs: activeJobsCount,
          totalCVs: totalApps,
          interviewsCompleted: completedApps,
          avgScore: avgScoreStr,
        });
        setRecentApplications(recent);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statsItems = [
    { label: 'Vị trí Tuyển dụng Hoạt động', value: stats.activeJobs.toString(), change: 'Vị trí đang mở', icon: '💼', color: 'hsl(var(--color-primary))', path: '/jobs' },
    { label: 'Tổng số CV đã Nhận', value: stats.totalCVs.toString(), change: `${stats.totalCVs - stats.interviewsCompleted} hồ sơ đang xử lý`, icon: '📝', color: 'hsl(var(--color-accent))', path: '/applications' },
    { label: 'Phỏng vấn Hoàn tất', value: stats.interviewsCompleted.toString(), change: 'Phiên phỏng vấn AI thực hiện', icon: '🤖', color: 'hsl(var(--color-success))', path: '/reports' },
    { label: 'Điểm Đánh giá Trung bình', value: stats.avgScore, change: 'trên thang điểm 100', icon: '🏆', color: 'hsl(var(--color-warning))', path: '/reports' },
  ];

  if (loading) {
    return <LoadingSpinner centered />;
  }

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      {/* Welcome Banner */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Chào mừng trở lại, {user?.fullName || 'Nhà tuyển dụng'} 👋
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Dưới đây là tổng quan quy trình tuyển dụng của bạn hôm nay.
        </p>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--spacing-md)',
        }}
      >
        {statsItems.map((stat, i) => (
          <div
            key={i}
            className="glass-panel"
            onClick={() => navigate(stat.path)}
            style={{
              padding: 'var(--spacing-lg)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-sm)',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform var(--transition-normal)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
          >
            <div
              style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${stat.color} 0%, rgba(0,0,0,0) 70%)`,
                opacity: 0.15,
                pointerEvents: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stat.label}
              </span>
              <span style={{ fontSize: '1.5rem' }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Applicants Split Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--spacing-lg)',
        }}
      >
        {/* Recent Applications Panel */}
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
            Hồ sơ Ứng tuyển Gần đây
          </h3>
          
          {recentApplications.length === 0 ? (
            <div style={{ padding: 'var(--spacing-lg) 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Chưa có hồ sơ nào nộp gần đây.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {recentApplications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => navigate(`/applications/${app.id}`)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: 'var(--radius-md)',
                    background: '#f8fafc',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {app.candidateName || 'Ứng viên Chưa đặt tên'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {app.job?.title || 'Vị trí Không xác định'}
                    </span>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              ))}
            </div>
          )}
          <Link
            to="/applications"
            style={{
              display: 'block',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'hsl(var(--color-primary))',
              marginTop: 'var(--spacing-md)',
              fontWeight: 500,
            }}
          >
            Xem Tất cả Hồ sơ &rarr;
          </Link>
        </div>

        {/* Quick Actions Panel */}
        <div
          className="glass-panel"
          style={{
            padding: 'var(--spacing-lg)',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
            borderLeft: '4px solid hsl(var(--color-primary))',
            border: '1px solid rgba(0, 0, 0, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Thao tác Nhanh
            </h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
            Bắt đầu bằng cách thêm mô tả công việc mới hoặc tải lên hồ sơ CV của ứng viên để thực hiện sơ tuyển AI.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
            <button className="btn btn-primary" onClick={() => navigate('/jobs/create')} style={{ justifyContent: 'flex-start' }}>
              💼 Tạo Vị trí Tuyển dụng
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/applications/upload')} style={{ justifyContent: 'flex-start' }}>
              📤 Tải lên PDF Hồ sơ CV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
