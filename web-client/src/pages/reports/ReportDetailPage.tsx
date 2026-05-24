import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportService, AssessmentReport } from '../../services/reportService';
import { applicationService, Application } from '../../services/applicationService';
import { interviewService, ChatMessage } from '../../services/interviewService';
import { ScoreChart } from '../../components/ScoreChart';
import { RecommendationBadge } from '../../components/RecommendationBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const ReportDetailPage: React.FC = () => {
  const { id: applicationId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const loadReportDetails = async () => {
      if (!applicationId) return;
      setLoading(true);
      setErrorText('');
      try {
        // Fetch report, application details, and transcript in parallel
        const fetchedReport = await reportService.getReportByApplicationId(applicationId);
        setReport(fetchedReport);

        const fetchedApp = await applicationService.getApplicationById(applicationId);
        setApplication(fetchedApp);

        if (fetchedReport.session_id) {
          try {
            const fetchedTranscript = await interviewService.getHistory(fetchedReport.session_id);
            setTranscript(fetchedTranscript);
          } catch (tErr) {
            console.error('Failed to load transcript:', tErr);
            // Non-blocking, still allow viewing report details
          }
        }
      } catch (err: any) {
        console.error('Failed to load report detail page:', err);
        setErrorText(err.message || 'Không tìm thấy thông tin chi tiết báo cáo.');
      } finally {
        setLoading(false);
      }
    };

    loadReportDetails();
  }, [applicationId]);

  if (loading) {
    return <LoadingSpinner centered />;
  }

  if (errorText || !report || !application) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
        <span style={{ fontSize: '3rem' }}>⚠️</span>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: 'var(--spacing-md)' }}>Không thể tải báo cáo</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>
          {errorText || 'Không tìm thấy báo cáo đánh giá của ứng viên này hoặc hệ thống AI đang trong quá trình tổng hợp kết quả.'}
        </p>
        <button className="btn btn-secondary" onClick={() => navigate('/reports')} style={{ marginTop: 'var(--spacing-lg)' }}>
          Quay lại Danh sách
        </button>
      </div>
    );
  }

  const highlightCitations = (content: string, citations?: { quote: string }[]): React.ReactNode => {
    if (!citations || citations.length === 0) return content;

    const matches: { start: number; end: number }[] = [];
    for (const citation of citations) {
      const quote = citation.quote.trim();
      if (!quote) continue;
      const idx = content.toLowerCase().indexOf(quote.toLowerCase());
      if (idx !== -1) {
        matches.push({ start: idx, end: idx + quote.length });
      }
    }

    if (matches.length === 0) return content;

    matches.sort((a, b) => a.start - b.start);
    const merged: { start: number; end: number }[] = [matches[0]];
    for (let i = 1; i < matches.length; i++) {
      const last = merged[merged.length - 1];
      if (matches[i].start <= last.end) {
        last.end = Math.max(last.end, matches[i].end);
      } else {
        merged.push(matches[i]);
      }
    }

    const parts: React.ReactNode[] = [];
    let cursor = 0;
    for (const m of merged) {
      if (cursor < m.start) {
        parts.push(content.slice(cursor, m.start));
      }
      parts.push(
        <mark key={m.start} style={{ background: 'rgba(124, 58, 237, 0.35)', color: 'inherit', padding: '2px 4px', borderRadius: '4px', borderBottom: '2px solid #7c3aed' }}>
          {content.slice(m.start, m.end)}
        </mark>
      );
      cursor = m.end;
    }
    if (cursor < content.length) {
      parts.push(content.slice(cursor));
    }

    return <>{parts}</>;
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', marginInline: 'auto' }}>
      {/* Back button and title header */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <button
          onClick={() => navigate('/reports')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginBottom: 'var(--spacing-sm)',
          }}
        >
          ← Quay lại Danh sách
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
              Báo cáo Đánh giá: {application.candidateName}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
              Cho vị trí <strong>{application.job?.title}</strong> • Email Ứng viên: {application.candidateEmail}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <RecommendationBadge recommendation={report.recommendation} />
            {report.scoring_method === 'LLM' ? (
              <span style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                ✨ Đánh giá bằng AI
              </span>
            ) : (
              <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '4px 10px', border: '1px solid var(--border-glass)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                ⚙️ Đánh giá Logic
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-lg)' }}>
        {/* Main Score Visualizer Card */}
        <div
          className="glass-panel"
          style={{
            padding: 'var(--spacing-xl)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass)',
          }}
        >
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-glass)', paddingBottom: 'var(--spacing-xs)' }}>
            Điểm số Đánh giá Chi tiết
          </h2>
          <ScoreChart scores={report.scores} />
        </div>

        {/* AI Evaluation Reasoning per Dimension */}
        {report.scoring_method === 'LLM' && report.reasoning && (
          <div
            className="glass-panel"
            style={{
              padding: 'var(--spacing-xl)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)',
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span>✨</span> Phân tích Đánh giá Chi tiết từ AI
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)' }}>
              {report.reasoning.technical && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#a78bfa', margin: '0 0 4px 0' }}>
                    💻 Năng lực Kỹ thuật (Technical Evaluation)
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                    {report.reasoning.technical}
                  </p>
                </div>
              )}
              {report.reasoning.communication && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 'var(--spacing-md)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#a78bfa', margin: '0 0 4px 0' }}>
                    💬 Kỹ năng Giao tiếp (Communication Skill)
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                    {report.reasoning.communication}
                  </p>
                </div>
              )}
              {report.reasoning.relevance && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 'var(--spacing-md)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#a78bfa', margin: '0 0 4px 0' }}>
                    🎯 Độ Phù hợp Vai trò (Role Alignment)
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                    {report.reasoning.relevance}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary Details */}
        <div
          className="glass-panel"
          style={{
            padding: 'var(--spacing-xl)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass)',
          }}
        >
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>Tóm tắt Đánh giá</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
            {report.summary}
          </p>
        </div>

        {/* Detailed Feedback */}
        {report.detailed_feedback && (
          <div
            className="glass-panel"
            style={{
              padding: 'var(--spacing-xl)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-glass)',
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: 'var(--spacing-md)', margin: '0 0 var(--spacing-sm) 0' }}>Nhận xét Chi tiết (Detailed Recommendations)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: 0 }}>
              {report.detailed_feedback}
            </p>
          </div>
        )}

        {/* Strengths & Weaknesses Split Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {/* Strengths */}
          <div
            className="glass-panel"
            style={{
              padding: 'var(--spacing-xl)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-glass)',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'hsl(var(--color-success))', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚀</span> Điểm mạnh Chính
            </h3>
            {report.strengths.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Không có điểm mạnh nổi bật nào được ghi nhận.</p>
            ) : (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {report.strengths.map((str, idx) => (
                  <li
                    key={idx}
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      padding: '8px 12px',
                      background: 'rgba(16, 185, 129, 0.04)',
                      borderLeft: '3px solid hsl(var(--color-success))',
                      borderRadius: '0 var(--radius-xs) var(--radius-xs) 0',
                    }}
                  >
                    {str}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Weaknesses */}
          <div
            className="glass-panel"
            style={{
              padding: 'var(--spacing-xl)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-glass)',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'hsl(var(--color-danger))', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> Điểm cần Cải thiện
            </h3>
            {report.weaknesses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Không phát hiện điểm yếu nào cần cải thiện.</p>
            ) : (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {report.weaknesses.map((weak, idx) => (
                  <li
                    key={idx}
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      padding: '8px 12px',
                      background: 'rgba(239, 68, 68, 0.04)',
                      borderLeft: '3px solid hsl(var(--color-danger))',
                      borderRadius: '0 var(--radius-xs) var(--radius-xs) 0',
                    }}
                  >
                    {weak}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Citations from Transcript */}
        {report.citations && report.citations.length > 0 && (
          <div
            className="glass-panel"
            style={{
              padding: 'var(--spacing-xl)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-glass)',
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 var(--spacing-md) 0' }}>
              <span>📌</span> Trích dẫn Trực tiếp từ Transcript (Citations)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {report.citations.map((citation, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 'var(--spacing-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid #7c3aed',
                    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <p style={{ fontStyle: 'italic', color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '8px', lineHeight: '1.5', margin: '0 0 8px 0' }}>
                    "{citation.quote}"
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Chiều đánh giá: <strong style={{ color: '#a78bfa' }}>{citation.dimension.toUpperCase()}</strong>
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {citation.stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Full Transcript */}
        {transcript.length > 0 && (
          <div
            className="glass-panel"
            style={{
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-glass)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              style={{
                width: '100%',
                padding: 'var(--spacing-lg)',
                background: 'rgba(255, 255, 255, 0.01)',
                border: 'none',
                color: 'var(--text-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '1.05rem',
                outline: 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💬</span> Xem Toàn bộ Nội dung Cuộc Phỏng vấn
              </span>
              <span>{showTranscript ? '▲' : '▼'}</span>
            </button>

            {showTranscript && (
              <div
                style={{
                  padding: 'var(--spacing-lg)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderTop: '1px solid var(--border-glass)',
                  maxHeight: '500px',
                  overflowY: 'auto',
                }}
              >
                {transcript.map((msg) => {
                  const isAI = msg.role === 'AI';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAI ? 'flex-start' : 'flex-end',
                        marginBottom: 'var(--spacing-md)',
                        width: '100%',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          marginBottom: '2px',
                        }}
                      >
                        {isAI ? 'Phỏng vấn viên AI' : application.candidateName} • {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.9rem',
                          lineHeight: '1.4',
                          maxWidth: '80%',
                          background: isAI ? 'var(--color-bg-surface)' : 'rgba(124, 58, 237, 0.15)',
                          color: 'var(--text-primary)',
                          border: isAI ? '1px solid var(--border-glass)' : '1px solid hsla(var(--color-primary) / 0.2)',
                        }}
                      >
                        {highlightCitations(msg.content, report.citations)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDetailPage;
