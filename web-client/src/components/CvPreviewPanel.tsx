import React, { useState, useEffect, useRef } from 'react';

interface CvPreviewPanelProps {
  applicationId: string;
  fileName?: string;
}

const CvPreviewPanel: React.FC<CvPreviewPanelProps> = ({ applicationId, fileName }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const displayName = fileName || 'CV.pdf';

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use native fetch with auth header for blob data (apiClient interceptors interfere with blob handling)
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/applications/${applicationId}/cv-file`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Không thể tải file CV.`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch (err: any) {
        setError(err?.message || 'Không thể tải file CV.');
      } finally {
        setLoading(false);
      }
    };

    fetchPdf();

    // Cleanup blob URL on unmount
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [applicationId]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = displayName;
    a.click();
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
          📄 Xem trước CV
        </h3>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '300px', background: '#f8fafc', borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(0,0,0,0.06)'
        }}>
          <div className="skeleton-line" style={{ width: '60%', height: '20px', marginBottom: '12px' }} />
          <div className="skeleton-line" style={{ width: '80%', height: '16px', marginBottom: '8px' }} />
          <div className="skeleton-line" style={{ width: '70%', height: '16px', marginBottom: '8px' }} />
          <div className="skeleton-line" style={{ width: '75%', height: '16px' }} />
          <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Đang tải file PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
          📄 Xem trước CV
        </h3>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-sm)',
          padding: 'var(--spacing-xl)', color: 'var(--text-muted)', textAlign: 'center',
          background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: '2.5rem' }}>📄</span>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()} style={{ marginTop: '8px', fontSize: '0.85rem', padding: '6px 16px' }}>
            🔄 Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px', marginBottom: 'var(--spacing-md)'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            📄 Xem trước CV
          </h3>
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setIsFullscreen(true)}
              style={{ padding: '4px 12px', fontSize: '0.8rem' }}
              title="Mở toàn màn hình"
            >
              🔍 Phóng to
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleDownload}
              style={{ padding: '4px 12px', fontSize: '0.8rem' }}
              title="Tải xuống CV"
            >
              ⬇️ Tải xuống
            </button>
          </div>
        </div>

        {blobUrl ? (
          <div style={{
            position: 'relative', width: '100%', minHeight: '600px',
            borderRadius: 'var(--radius-sm)', overflow: 'hidden',
            border: '1px solid rgba(0, 0, 0, 0.06)', background: '#525659'
          }}>
            <iframe
              src={`${blobUrl}#toolbar=1&navpanes=0&view=FitH`}
              title="CV Preview"
              style={{ width: '100%', height: '700px', border: 'none' }}
            />
          </div>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-xl)', color: 'var(--text-muted)', textAlign: 'center',
            background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(0,0,0,0.1)'
          }}>
            <span style={{ fontSize: '2.5rem' }}>📄</span>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Không thể hiển thị PDF.</p>
            <button className="btn btn-primary" onClick={handleDownload} style={{ marginTop: '8px' }}>
              ⬇️ Tải xuống CV để xem
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && blobUrl && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex', flexDirection: 'column',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsFullscreen(false); }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 'var(--spacing-sm) var(--spacing-lg)',
            background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>
              📄 {displayName}
            </span>
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
              <button
                onClick={handleDownload}
                style={{
                  padding: '6px 14px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer',
                  transition: 'background var(--transition-fast)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                ⬇️ Tải xuống
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                style={{
                  padding: '6px 14px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer',
                  transition: 'background var(--transition-fast)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                ✕ Đóng
              </button>
            </div>
          </div>
          {/* PDF Viewer */}
          <div style={{ flex: 1, padding: 'var(--spacing-sm)' }}>
            <iframe
              src={`${blobUrl}#toolbar=1&navpanes=0&view=FitH`}
              title="CV Preview Fullscreen"
              style={{
                width: '100%', height: '100%', border: 'none',
                borderRadius: 'var(--radius-sm)', background: '#525659'
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default CvPreviewPanel;
