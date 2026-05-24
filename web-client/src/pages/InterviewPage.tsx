import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewService, InterviewSession, ChatMessage } from '../services/interviewService';
import { InterviewLandingPage } from './interview/InterviewLandingPage';
import { InterviewChatPage } from './interview/InterviewChatPage';
import { InterviewCompletePage } from './interview/InterviewCompletePage';
import { TokenExpiredPage } from './TokenExpiredPage';
import { UnauthorizedPage } from './UnauthorizedPage';
import { LoadingSpinner } from '../components/LoadingSpinner';

type PageState = 'LOADING' | 'LANDING' | 'CHAT' | 'COMPLETE' | 'EXPIRED' | 'UNAUTHORIZED';

interface CachedSession {
  sessionId: string;
  token: string;
  candidateName: string;
  jobTitle: string;
}

/** Compact branding header for the interview page */
const InterviewBranding: React.FC = () => (
  <div style={{ textAlign: 'center', padding: 'var(--spacing-md) 0' }}>
    <h1
      style={{
        fontSize: '1.6rem',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}
    >
      <span style={{ color: 'hsl(var(--color-primary))' }}>✓</span>
      <span
        style={{
          background: 'linear-gradient(135deg, hsl(var(--color-accent)) 30%, hsl(var(--color-primary)) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        SupportHR
      </span>
    </h1>
  </div>
);

export const InterviewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>('LOADING');
  const [candidateName, setCandidateName] = useState('Candidate');
  const [jobTitle, setJobTitle] = useState('');
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const cacheKey = `interview_session_${token}`;

  useEffect(() => {
    const initializeSession = async () => {
      if (!token) {
        setPageState('UNAUTHORIZED');
        return;
      }

      try {
        // 1. Check local cache first
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          const cached: CachedSession = JSON.parse(cachedStr);
          
          // Verify session on backend & fetch latest history
          try {
            const fetchedSession = await interviewService.getSession(cached.sessionId);
            const history = await interviewService.getHistory(cached.sessionId);

            setSession(fetchedSession);
            setMessages(history);
            setCandidateName(cached.candidateName);
            setJobTitle(cached.jobTitle);

            if (fetchedSession.status === 'COMPLETED') {
              setPageState('COMPLETE');
            } else {
              setPageState('CHAT');
            }
            return;
          } catch (fetchError: any) {
            // If session not found or other API error, clear cache and fall back to token validation
            localStorage.removeItem(cacheKey);
          }
        }

        // 2. Call backend validation
        const result = await interviewService.validateMagicLink(token);
        
        setSession(result.session);
        setMessages(result.messages);
        setCandidateName(result.candidate_name);
        setJobTitle(result.job_title);

        // Cache session details locally to allow reload/resume
        const newCache: CachedSession = {
          sessionId: result.session.id,
          token,
          candidateName: result.candidate_name,
          jobTitle: result.job_title,
        };
        localStorage.setItem(cacheKey, JSON.stringify(newCache));

        if (result.session.status === 'COMPLETED') {
          setPageState('COMPLETE');
        } else {
          setPageState('LANDING');
        }
      } catch (err: any) {
        console.error('Validation error:', err);
        const code = err.code || (err.response?.data?.error?.code);
        const msg = err.message || (err.response?.data?.error?.message);

        setErrorMessage(msg || 'Đã xảy ra lỗi khi xác thực thư mời phỏng vấn của bạn.');

        if (code === 'TOKEN_ALREADY_USED' || err.status === 410) {
          setPageState('EXPIRED');
        } else if (code === 'TOKEN_NOT_FOUND' || err.status === 403) {
          setPageState('UNAUTHORIZED');
        } else {
          setPageState('UNAUTHORIZED'); // General fallback
        }
      }
    };

    initializeSession();
  }, [token]);

  const handleStartInterview = () => {
    setPageState('CHAT');
  };

  const handleCompleteInterview = () => {
    setPageState('COMPLETE');
  };

  // For CHAT state, use a wider layout
  const isChat = pageState === 'CHAT';

  // Render the inner content based on page state
  const renderContent = () => {
    switch (pageState) {
      case 'LOADING':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: 'var(--spacing-md)'
          }}>
            <LoadingSpinner size="lg" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Đang xác thực thư mời phỏng vấn...
            </p>
          </div>
        );
      case 'LANDING':
        return (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-xl)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <InterviewLandingPage
              candidateName={candidateName}
              jobTitle={jobTitle}
              onStart={handleStartInterview}
              isLoading={false}
            />
          </div>
        );
      case 'CHAT':
        return (
          session && (
            <InterviewChatPage
              sessionId={session.id}
              candidateName={candidateName}
              initialMessages={messages}
              currentStage={session.current_stage}
              onComplete={handleCompleteInterview}
            />
          )
        );
      case 'COMPLETE':
        return (
          session && (
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-xl)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <InterviewCompletePage
                candidateName={candidateName}
                jobTitle={jobTitle}
              />
            </div>
          )
        );
      case 'EXPIRED':
        return (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-xl)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <TokenExpiredPage />
          </div>
        );
      case 'UNAUTHORIZED':
      default:
        return (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-xl)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <UnauthorizedPage message={errorMessage} />
          </div>
        );
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--color-bg-base)',
        position: 'relative',
        padding: isChat ? 'var(--spacing-sm) var(--spacing-md)' : 'var(--spacing-md)',
        overflow: 'hidden',
      }}
    >
      {/* Decorative light gradient glow behind */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, hsla(var(--color-primary) / 0.08) 0%, rgba(255,255,255,0) 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Branding */}
      <div style={{ zIndex: 1, flexShrink: 0 }}>
        <InterviewBranding />
      </div>

      {/* Main Content */}
      <div
        style={{
          zIndex: 1,
          width: '100%',
          maxWidth: isChat ? '900px' : '560px',
          flex: isChat ? 1 : undefined,
          display: isChat ? 'flex' : undefined,
          flexDirection: isChat ? 'column' : undefined,
        }}
        className="animate-scale-in"
      >
        {renderContent()}
      </div>

      {/* Footer copyright — hidden during chat for space */}
      {!isChat && (
        <div
          style={{
            zIndex: 1,
            marginTop: 'var(--spacing-xl)',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            letterSpacing: '0.05em',
          }}
        >
          &copy; {new Date().getFullYear()} SupportHR AI. All rights reserved.
        </div>
      )}
    </div>
  );
};

export default InterviewPage;
