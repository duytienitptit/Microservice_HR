import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { label: 'Tổng quan', path: '/dashboard', icon: '📊' },
    { label: 'Vị trí Tuyển dụng', path: '/jobs', icon: '💼' },
    { label: 'Hồ sơ Ứng tuyển', path: '/applications', icon: '📝' },
    { label: 'Kết quả Đánh giá', path: '/reports', icon: '🏆' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--color-bg-base)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* SIDEBAR FOR DESKTOP */}
      <aside
        className="glass-panel"
        style={{
          width: sidebarCollapsed ? '72px' : '260px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(0, 0, 0, 0.06)',
          transition: 'width var(--transition-normal)',
          zIndex: 10,
          background: 'var(--color-bg-primary)',
        }}
        // In mobile view, hide desktop sidebar
        css-media-desktop=""
      >
        {/* Sidebar Header / Logo */}
        <div
          style={{
            padding: 'var(--spacing-lg) var(--spacing-md)',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            gap: 'var(--spacing-sm)',
            height: '70px',
          }}
        >
          {!sidebarCollapsed && (
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'hsl(var(--color-primary))', fontWeight: 800, fontSize: '1.4rem' }}>✓</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'hsl(var(--color-accent))' }}>
                Support<span style={{ color: 'hsl(var(--color-primary))' }}>HR</span>
              </span>
            </Link>
          )}
          {sidebarCollapsed && (
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--color-primary))' }}>S</span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.06)',
              color: 'var(--text-secondary)',
              display: 'none', // Shown conditionally or generic styles
            }}
            className="btn-desktop-toggle"
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav style={{ flex: 1, padding: 'var(--spacing-md) var(--spacing-sm)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  color: active ? 'hsl(var(--color-accent))' : 'var(--text-secondary)',
                  background: active ? 'rgba(0, 177, 79, 0.08)' : 'transparent',
                  borderLeft: active ? '4px solid hsl(var(--color-primary))' : '4px solid transparent',
                  gap: 'var(--spacing-md)',
                  transition: 'all var(--transition-fast)',
                }}
                className={active ? '' : 'btn-secondary-hover'}
              >
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                {!sidebarCollapsed && <span style={{ fontWeight: active ? 700 : 500 }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div
          style={{
            padding: 'var(--spacing-md)',
            borderTop: '1px solid var(--border-glass)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-sm)',
          }}
        >
          {!sidebarCollapsed && user && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.fullName || 'HR'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.85rem',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
          >
            🚪 {!sidebarCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* MOBILE OVERLAY SIDEBAR */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 99,
          }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        className="glass-panel"
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: '260px',
          zIndex: 100,
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform var(--transition-normal)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-bg-primary)',
          borderRight: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <div
          style={{
            padding: 'var(--spacing-md)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '70px',
          }}
        >
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'hsl(var(--color-accent))', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'hsl(var(--color-primary))' }}>✓</span>SupportHR
          </span>
          <button onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1.2rem', padding: '6px' }}>
            ✕
          </button>
        </div>
        <nav style={{ flex: 1, padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  color: active ? 'hsl(var(--color-accent))' : 'var(--text-secondary)',
                  background: active ? 'rgba(0, 177, 79, 0.08)' : 'transparent',
                  borderLeft: active ? '4px solid hsl(var(--color-primary))' : '4px solid transparent',
                  gap: 'var(--spacing-md)',
                }}
              >
                <span>{item.icon}</span>
                <span style={{ fontWeight: active ? 700 : 500 }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div
          style={{
            padding: 'var(--spacing-md)',
            borderTop: '1px solid var(--border-glass)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
          }}
        >
          {user && (
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.fullName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
            </div>
          )}
          <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%' }}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Global Header */}
        <header
          style={{
            height: '70px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--spacing-lg)',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              padding: '8px',
              marginRight: 'var(--spacing-md)',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0,0,0,0.03)',
              color: 'var(--text-primary)',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
            className="btn-mobile-hamburger"
          >
            ☰
          </button>

          {/* Desktop header title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Nền tảng Tuyển dụng
            </span>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 500 }}>
              {navItems.find((n) => isActive(n.path))?.label || 'Tổng quan'}
            </span>
          </div>

          {/* User info panel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            {user && (
              <>
                <span className="badge badge-info">{user.role}</span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                  }}
                  className="user-profile-badge"
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-full)',
                      background: 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-accent)))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      color: '#fff',
                      fontSize: '0.9rem',
                    }}
                  >
                    {(user?.fullName || user?.email || 'H').charAt(0).toUpperCase()}
                  </div>
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                    }}
                    className="desktop-only"
                  >
                    {user?.fullName || user?.email}
                  </span>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Scrollable page body */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--spacing-lg)',
            background: 'var(--color-bg-base)',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* CSS overrides for responsive layouts */}
      <style>{`
        @media (max-width: 768px) {
          aside[css-media-desktop] {
            display: none !important;
          }
          .btn-mobile-hamburger {
            display: block !important;
          }
          .desktop-only {
            display: none !important;
          }
        }
        @media (min-width: 769px) {
          .btn-mobile-hamburger {
            display: none !important;
          }
          .btn-desktop-toggle {
            display: block !important;
          }
        }
        
        .btn-secondary-hover:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary) !important;
        }
      `}</style>
    </div>
  );
};
