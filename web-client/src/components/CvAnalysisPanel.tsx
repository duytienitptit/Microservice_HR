import React, { useEffect, useState } from 'react';
import { applicationService } from '../services/applicationService';
import LoadingSpinner from './LoadingSpinner';

interface CvAnalysis {
  summary: string;
  skills: string[];
  experience: { company: string; role: string; duration: string }[];
  education: { school: string; degree: string; year: string }[];
  languages: string[];
  match_score: number | null;
  match_highlights: string[];
  concerns: string[];
}

interface CvAnalysisPanelProps {
  applicationId: string;
}

const CvAnalysisPanel: React.FC<CvAnalysisPanelProps> = ({ applicationId }) => {
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await applicationService.getCvAnalysis(applicationId);
      setAnalysis(data);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải kết quả phân tích CV.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [applicationId]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
          🔍 Kết quả Phân tích CV
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Skeleton shimmer animation */}
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton-line" style={{ width: '30%', height: '14px' }} />
              <div className="skeleton-line" style={{ width: '100%', height: '18px' }} />
              <div className="skeleton-line" style={{ width: '85%', height: '18px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
          🔍 Kết quả Phân tích CV
        </h3>
        <div style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-sm)', 
          padding: 'var(--spacing-lg)', color: 'var(--text-muted)', textAlign: 'center' 
        }}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
          <button className="btn btn-secondary" onClick={fetchAnalysis} style={{ marginTop: '8px', fontSize: '0.85rem', padding: '6px 16px' }}>
            🔄 Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'hsl(var(--color-success))';
    if (score >= 50) return 'hsl(var(--color-warning))';
    return 'hsl(var(--color-danger))';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return 'Phù hợp tốt';
    if (score >= 50) return 'Phù hợp trung bình';
    return 'Ít phù hợp';
  };

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
      <h3 style={{ 
        fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', 
        borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px', margin: '0 0 var(--spacing-md) 0' 
      }}>
        🔍 Kết quả Phân tích CV bằng AI
      </h3>

      {/* Summary */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h4 style={sectionTitleStyle}>📋 Tóm tắt</h4>
        <p style={{ 
          color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.65, margin: 0,
          padding: 'var(--spacing-sm) var(--spacing-md)',
          background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,0,0,0.04)'
        }}>
          {analysis.summary}
        </p>
      </div>

      {/* Match Score */}
      {analysis.match_score !== null && (
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h4 style={sectionTitleStyle}>🎯 Điểm phù hợp với vị trí tuyển dụng</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `conic-gradient(${getScoreColor(analysis.match_score)} ${analysis.match_score * 3.6}deg, #e2e8f0 0deg)`,
              position: 'relative'
            }}>
              <div style={{
                width: '50px', height: '50px', borderRadius: '50%',
                background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '1.1rem', color: getScoreColor(analysis.match_score)
              }}>
                {analysis.match_score}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, color: getScoreColor(analysis.match_score), fontSize: '0.9rem' }}>
                  {getScoreLabel(analysis.match_score)}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{analysis.match_score}/100</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${analysis.match_score}%`, height: '100%',
                  background: getScoreColor(analysis.match_score),
                  borderRadius: '4px',
                  transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skills */}
      {analysis.skills && analysis.skills.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h4 style={sectionTitleStyle}>🛠️ Kỹ năng ({analysis.skills.length})</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {analysis.skills.map((skill, idx) => (
              <span key={idx} style={skillChipStyle}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Two-column layout for Experience & Education */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        {/* Experience */}
        {analysis.experience && analysis.experience.length > 0 && (
          <div>
            <h4 style={sectionTitleStyle}>💼 Kinh nghiệm</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {analysis.experience.map((exp, idx) => (
                <div key={idx} style={listItemStyle}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{exp.role}</div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>{exp.company} • {exp.duration}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {analysis.education && analysis.education.length > 0 && (
          <div>
            <h4 style={sectionTitleStyle}>🎓 Học vấn</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {analysis.education.map((edu, idx) => (
                <div key={idx} style={listItemStyle}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{edu.degree}</div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>{edu.school} {edu.year && `• ${edu.year}`}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Languages */}
      {analysis.languages && analysis.languages.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h4 style={sectionTitleStyle}>🌐 Ngôn ngữ</h4>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {analysis.languages.map((lang, idx) => (
              <span key={idx} style={{ ...skillChipStyle, background: 'hsl(var(--color-accent) / 0.08)', color: 'hsl(var(--color-accent))' }}>
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Match Highlights & Concerns */}
      {(analysis.match_highlights?.length > 0 || analysis.concerns?.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {analysis.match_highlights && analysis.match_highlights.length > 0 && (
            <div>
              <h4 style={sectionTitleStyle}>✅ Điểm nổi bật</h4>
              <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {analysis.match_highlights.map((h, idx) => (
                  <li key={idx} style={{
                    fontSize: '0.88rem', color: 'hsl(var(--color-success))',
                    padding: '6px 10px', background: 'hsl(var(--color-success) / 0.06)',
                    borderRadius: 'var(--radius-xs)', display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <span style={{ flexShrink: 0 }}>✓</span> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.concerns && analysis.concerns.length > 0 && (
            <div>
              <h4 style={sectionTitleStyle}>⚠️ Lưu ý</h4>
              <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {analysis.concerns.map((c, idx) => (
                  <li key={idx} style={{
                    fontSize: '0.88rem', color: 'hsl(var(--color-warning))',
                    padding: '6px 10px', background: 'hsl(var(--color-warning) / 0.06)',
                    borderRadius: 'var(--radius-xs)', display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <span style={{ flexShrink: 0 }}>!</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Shared styles
const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.3px',
};

const skillChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 12px',
  borderRadius: 'var(--radius-full)',
  fontSize: '0.82rem',
  fontWeight: 500,
  background: 'hsl(var(--color-primary) / 0.08)',
  color: 'hsl(var(--color-primary))',
  border: '1px solid hsl(var(--color-primary) / 0.15)',
  transition: 'all var(--transition-fast)',
};

const listItemStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#f8fafc',
  borderRadius: 'var(--radius-sm)',
  borderLeft: '3px solid hsl(var(--color-primary) / 0.4)',
};

export default CvAnalysisPanel;
