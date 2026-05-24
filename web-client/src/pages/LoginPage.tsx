import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState((location.state as any)?.registeredEmail || '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Get redirection path or default to /dashboard
  const from = (location.state as any)?.from?.pathname || '/dashboard';
  const registrationSuccess = (location.state as any)?.registrationSuccess;

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Địa chỉ email là bắt buộc.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Vui lòng nhập địa chỉ email hợp lệ.';
    }

    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc.';
    } else if (password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Login error details:', err);
      // Map API Error Envelope codes/messages
      setServerError(err.message || 'Email hoặc mật khẩu không đúng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <h2
        style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 'var(--spacing-md)',
          textAlign: 'center',
        }}
      >
        Đăng nhập Không gian Tuyển dụng
      </h2>

      {registrationSuccess && (
        <div className="alert alert-success animate-fade-in" role="alert">
          <span>✅</span>
          <div>
            <strong>Đã Đăng ký Không gian làm việc!</strong>
            <p style={{ marginTop: '2px', fontSize: '0.85rem' }}>
              Tài khoản tuyển dụng của bạn đã được tạo. Vui lòng đăng nhập bên dưới.
            </p>
          </div>
        </div>
      )}

      {serverError && (
        <div className="alert alert-danger animate-fade-in" role="alert">
          <span>⚠️</span>
          <div>
            <strong>Đăng nhập thất bại</strong>
            <p style={{ marginTop: '2px', fontSize: '0.85rem' }}>{serverError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Email Input */}
        <div className="form-group">
          <label className="form-label" htmlFor="email-input">
            Địa chỉ Email
          </label>
          <div className="form-input-container glow-border-purple">
            <input
              id="email-input"
              type="email"
              className={`form-input ${errors.email ? 'has-error' : ''}`}
              placeholder="e.g. recruit@supporthr.vn"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>
          {errors.email && <span className="form-error">⚠️ {errors.email}</span>}
        </div>

        {/* Password Input */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" htmlFor="password-input">
              Mật khẩu
            </label>
          </div>
          <div className="form-input-container glow-border-purple">
            <input
              id="password-input"
              type="password"
              className={`form-input ${errors.password ? 'has-error' : ''}`}
              placeholder="Nhập mật khẩu bảo mật của bạn"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              disabled={loading}
              autoComplete="current-password"
              required
            />
          </div>
          {errors.password && <span className="form-error">⚠️ {errors.password}</span>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary pulse-glow"
          style={{ width: '100%', marginTop: 'var(--spacing-md)', height: '48px' }}
          disabled={loading}
        >
          {loading ? <div className="spinner"></div> : 'Đi tới Trang quản trị'}
        </button>
      </form>

      {/* Footer Navigation */}
      <div
        style={{
          marginTop: 'var(--spacing-lg)',
          textAlign: 'center',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
        }}
      >
        Chưa có tài khoản tuyển dụng?{' '}
        <Link
          to="/register"
          style={{
            color: 'hsl(var(--color-accent))',
            fontWeight: 500,
            textDecoration: 'underline',
          }}
        >
          Đăng ký Không gian làm việc
        </Link>
      </div>
    </div>
  );
};
