import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import agriConnectPng from '../assets/AgriConnect.png';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Exclude dark mode on the reset password page
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    return () => {
      const saved = localStorage.getItem('agriconnect_theme') || 'light';
      let effective = saved;
      if (saved === 'system') {
        effective = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      if (effective === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    };
  }, []);

  // Redirect to login after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate('/login'), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!token) {
      setErrorMsg('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Something went wrong. The link may have expired.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 30%, #f0fdf4 70%, #ecfdf5 100%)',
        padding: '20px',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #14532D 0%, #166534 100%)',
            padding: '32px 28px',
            textAlign: 'center',
            color: '#FFFFFF',
          }}
        >
          <img
            src={agriConnectPng}
            alt="AgriConnect Logo"
            style={{ height: '40px', marginBottom: '12px', filter: 'brightness(0) invert(1)' }}
          />
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800 }}>
            {success ? 'Password Updated!' : 'Set New Password'}
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
            {success ? 'You can now sign in with your new password' : 'AgriConnect Verified Account Service'}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '32px 28px' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  fontSize: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto',
                }}
              >
                ✓
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 800, color: '#111827' }}>
                Password Reset Successful
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#4B5563', lineHeight: 1.7 }}>
                Your password has been updated. You will be redirected to the sign-in page in a few seconds.
              </p>
              <Link
                to="/login"
                style={{
                  display: 'inline-block',
                  padding: '12px 28px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #14532D 0%, #166534 100%)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(20, 83, 45, 0.3)',
                }}
              >
                Go to Sign In →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {!token && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '12px',
                    padding: '14px',
                    marginBottom: '20px',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>⚠️</span>
                  <p style={{ margin: 0, fontSize: '13px', color: '#991B1B', lineHeight: 1.5 }}>
                    <strong>Invalid Link:</strong> This reset link appears to be missing or broken. Please{' '}
                    <Link to="/login" style={{ color: '#166534', fontWeight: 600 }}>
                      return to sign in
                    </Link>{' '}
                    and request a new password reset.
                  </p>
                </div>
              )}

              <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                Enter your new password below. It must be at least 8 characters long.
              </p>

              {/* New Password */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="new-password"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}
                >
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '16px',
                      color: '#9CA3AF',
                      pointerEvents: 'none',
                    }}
                  >
                    🔒
                  </span>
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    style={{
                      width: '100%',
                      height: '48px',
                      paddingLeft: '44px',
                      paddingRight: '48px',
                      fontSize: '15px',
                      borderRadius: '12px',
                      border: '1.5px solid #D1D5DB',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: '#6B7280',
                      padding: '4px',
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="confirm-password"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}
                >
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '16px',
                      color: '#9CA3AF',
                      pointerEvents: 'none',
                    }}
                  >
                    🔒
                  </span>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    style={{
                      width: '100%',
                      height: '48px',
                      paddingLeft: '44px',
                      paddingRight: '14px',
                      fontSize: '15px',
                      borderRadius: '12px',
                      border: confirmPassword && confirmPassword !== newPassword
                        ? '2px solid #EF4444'
                        : '1.5px solid #D1D5DB',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                  />
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#DC2626', fontWeight: 600 }}>
                    Passwords do not match.
                  </p>
                )}
              </div>

              {errorMsg && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    color: '#991B1B',
                    fontWeight: 500,
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: !token
                    ? '#D1D5DB'
                    : 'linear-gradient(135deg, #14532D 0%, #166534 100%)',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: loading || !token ? 'not-allowed' : 'pointer',
                  boxShadow: token ? '0 4px 12px rgba(20, 83, 45, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'opacity 0.2s',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Resetting Password...' : 'Reset Password →'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <Link
                  to="/login"
                  style={{
                    fontSize: '13px',
                    color: '#166534',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
