import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Họ và tên là bắt buộc.';
    }

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

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
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
      await register(fullName, email, password);
      // Navigate to login with success state
      navigate('/login', { state: { registrationSuccess: true, registeredEmail: email } });
    } catch (err: any) {
      console.error('Registration error details:', err);
      setServerError(err.message || 'Đăng ký không gian làm việc thất bại. Email có thể đã được sử dụng.');
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
        Tạo tài khoản Tuyển dụng
      </h2>

      {serverError && (
        <div className="alert alert-danger animate-fade-in" role="alert">
          <span>⚠️</span>
          <div>
            <strong>Đăng ký thất bại</strong>
            <p style={{ marginTop: '2px', fontSize: '0.85rem' }}>{serverError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Full Name Input */}
        <div className="form-group">
          <label className="form-label" htmlFor="name-input">
            Họ và tên
          </label>
          <div className="form-input-container glow-border-purple">
            <input
              id="name-input"
              type="text"
              className={`form-input ${errors.fullName ? 'has-error' : ''}`}
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              disabled={loading}
              autoComplete="name"
              required
            />
          </div>
          {errors.fullName && <span className="form-error">⚠️ {errors.fullName}</span>}
        </div>

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
              placeholder="e.g. jdoe@company.com"
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
          <label className="form-label" htmlFor="password-input">
            Mật khẩu
          </label>
          <div className="form-input-container glow-border-purple">
            <input
              id="password-input"
              type="password"
              className={`form-input ${errors.password ? 'has-error' : ''}`}
              placeholder="Tối thiểu 8 ký tự"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              disabled={loading}
              autoComplete="new-password"
              required
            />
          </div>
          {errors.password && <span className="form-error">⚠️ {errors.password}</span>}
        </div>

        {/* Confirm Password Input */}
        <div className="form-group">
          <label className="form-label" htmlFor="confirm-password-input">
            Xác nhận Mật khẩu
          </label>
          <div className="form-input-container glow-border-purple">
            <input
              id="confirm-password-input"
              type="password"
              className={`form-input ${errors.confirmPassword ? 'has-error' : ''}`}
              placeholder="Nhập lại mật khẩu để xác thực"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              disabled={loading}
              autoComplete="new-password"
              required
            />
          </div>
          {errors.confirmPassword && <span className="form-error">⚠️ {errors.confirmPassword}</span>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary pulse-glow"
          style={{ width: '100%', marginTop: 'var(--spacing-md)', height: '48px' }}
          disabled={loading}
        >
          {loading ? <div className="spinner"></div> : 'Đăng ký Tài khoản'}
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
        Đã có tài khoản không gian làm việc?{' '}
        <Link
          to="/login"
          style={{
            color: 'hsl(var(--color-accent))',
            fontWeight: 500,
            textDecoration: 'underline',
          }}
        >
          Đăng nhập
        </Link>
      </div>
    </div>
  );
};
