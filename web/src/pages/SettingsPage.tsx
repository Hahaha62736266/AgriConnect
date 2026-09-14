import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../api';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ─── Privacy & Security state ───
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  // Reset any custom font size override back to clean default
  useEffect(() => {
    localStorage.removeItem('agriconnect_font_size');
    document.documentElement.style.fontSize = '';
  }, []);

  if (!user) return null;

  // ─── Password change handler ───
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toastWarning('Missing Fields', 'All password fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      toastWarning('Password Too Short', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toastError('Passwords Do Not Match', 'New password and confirmation do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      toastWarning('Identical Password', 'New password must be different from current password.');
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toastSuccess('Password Changed', 'Your password has been updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to change password.';
      toastError('Change Failed', errorMsg);
    } finally {
      setChangingPassword(false);
    }
  };

  // ─── Logout all sessions ───
  const handleLogoutAllSessions = () => {
    logout();
    navigate('/login');
  };

  // Password strength indicator
  const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (!pw) return { label: '', color: 'transparent', width: '0%' };
    if (pw.length < 8) return { label: 'Too short', color: '#BA3C3C', width: '20%' };
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw);
    const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

    if (pw.length >= 12 && score >= 3) return { label: 'Strong', color: '#1E7E45', width: '100%' };
    if (pw.length >= 8 && score >= 2) return { label: 'Good', color: '#B87A00', width: '66%' };
    return { label: 'Weak', color: '#BA3C3C', width: '33%' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="app-container" style={{ paddingBottom: '40px' }}>
      {/* ─── Page Header ─── */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="settings-page-title" style={{ fontSize: '34px', fontWeight: 800, color: '#0E4A27' }}>
          Settings
        </h1>
        <p className="settings-page-desc" style={{ fontSize: '20px', color: '#525450', marginTop: '4px' }}>
          Manage your account security and password settings.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '720px' }}>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* Privacy & Security Section                                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="card settings-main-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div
              className="settings-icon-badge"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: '#EAF6EE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0,
              }}
            >
              🔒
            </div>
            <div>
              <h2 className="settings-section-title" style={{ fontSize: '24px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
                Privacy & Security
              </h2>
              <p className="settings-section-desc" style={{ fontSize: '15px', color: '#525450', margin: '2px 0 0 0' }}>
                Manage your password and account security
              </p>
            </div>
          </div>

          {/* ─── Change Password Form ─── */}
          <div
            className="settings-subbox settings-password-box"
            style={{
              marginTop: '24px',
              padding: '24px',
              borderRadius: '16px',
              backgroundColor: '#F7FAF7',
              border: '1.5px solid #D1E5D9',
            }}
          >
            <h3 className="settings-subbox-title" style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#176B3A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Change Password
            </h3>

            <form onSubmit={handleChangePassword}>
              {/* Current Password */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '16px' }}>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    style={{ fontSize: '17px', paddingRight: '52px' }}
                  />
                  <button
                    type="button"
                    className="settings-eye-btn"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '20px',
                      color: '#525450',
                      padding: '4px',
                      minHeight: 'auto',
                    }}
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ fontSize: '16px' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    style={{ fontSize: '17px', paddingRight: '52px' }}
                  />
                  <button
                    type="button"
                    className="settings-eye-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '20px',
                      color: '#525450',
                      padding: '4px',
                      minHeight: 'auto',
                    }}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div style={{ marginBottom: '16px' }}>
                  <div
                    className="settings-strength-track"
                    style={{
                      height: '6px',
                      backgroundColor: '#E4E2DC',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      marginBottom: '6px',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: passwordStrength.width,
                        backgroundColor: passwordStrength.color,
                        borderRadius: '3px',
                        transition: 'width 0.3s ease, background-color 0.3s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: passwordStrength.color }}>
                    Password strength: {passwordStrength.label}
                  </span>
                </div>
              )}

              {/* Confirm New Password */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ fontSize: '16px' }}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    style={{
                      fontSize: '17px',
                      paddingRight: '52px',
                      borderColor: confirmNewPassword && confirmNewPassword !== newPassword ? '#BA3C3C' : undefined,
                    }}
                  />
                  <button
                    type="button"
                    className="settings-eye-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '20px',
                      color: '#525450',
                      padding: '4px',
                      minHeight: 'auto',
                    }}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirmNewPassword && confirmNewPassword !== newPassword && (
                  <span style={{ fontSize: '14px', color: '#BA3C3C', fontWeight: 700 }}>
                    Passwords do not match
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword}
                className="btn btn-primary"
                style={{ fontSize: '17px', width: '100%' }}
              >
                {changingPassword ? 'Changing password…' : '🔑 Update Password'}
              </button>
            </form>
          </div>

          {/* ─── Login Sessions ─── */}
          <div
            className="settings-subbox settings-sessions-box"
            style={{
              marginTop: '24px',
              padding: '24px',
              borderRadius: '16px',
              backgroundColor: '#FAFAF7',
              border: '1.5px solid #E4E2DC',
            }}
          >
            <h3 className="settings-subbox-title" style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#176B3A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Login Sessions
            </h3>
            <p className="settings-subbox-desc" style={{ fontSize: '15px', color: '#525450', marginBottom: '16px', lineHeight: 1.5 }}>
              Signing out of all sessions will log you out from every device where you are currently signed in. You will need to sign in again on each device.
            </p>

            <div
              className="settings-current-session-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1.5px solid #E4E2DC',
                marginBottom: '16px',
              }}
            >
              <div
                className="settings-session-icon"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#EAF6EE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0,
                }}
              >
                💻
              </div>
              <div style={{ flex: 1 }}>
                <div className="settings-session-title" style={{ fontSize: '16px', fontWeight: 700, color: '#1A1C1A' }}>
                  Current Session
                </div>
                <div className="settings-session-meta" style={{ fontSize: '13px', color: '#525450', marginTop: '2px' }}>
                  This device • Active now
                </div>
              </div>
              <span
                className="settings-session-badge"
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#1E7E45',
                  background: '#EAF6EE',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(30, 126, 69, 0.2)',
                }}
              >
                ACTIVE
              </span>
            </div>

            <button
              onClick={handleLogoutAllSessions}
              className="btn settings-logout-all-btn"
              style={{
                width: '100%',
                fontSize: '16px',
                background: '#FDF2F2',
                color: '#BA3C3C',
                border: '2px solid #F8D7D7',
                fontWeight: 700,
              }}
            >
              🚪 Sign Out of All Sessions
            </button>
          </div>

          {/* ─── Data Privacy ─── */}
          <div
            className="settings-subbox settings-privacy-box"
            style={{
              marginTop: '24px',
              padding: '24px',
              borderRadius: '16px',
              backgroundColor: '#FAFAF7',
              border: '1.5px solid #E4E2DC',
            }}
          >
            <h3 className="settings-subbox-title" style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#176B3A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Data Privacy
            </h3>
            <p className="settings-subbox-desc" style={{ fontSize: '15px', color: '#525450', lineHeight: 1.6 }}>
              Your personal information is protected and only shared with authorized entities as needed for agricultural services. We follow data privacy best practices to keep your account secure.
            </p>
            <div
              className="settings-privacy-pill"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '14px',
                padding: '12px 16px',
                background: '#EAF6EE',
                borderRadius: '12px',
                border: '1px solid rgba(23, 107, 58, 0.15)',
              }}
            >
              <span style={{ fontSize: '18px' }}>✅</span>
              <span className="settings-privacy-text" style={{ fontSize: '14px', fontWeight: 700, color: '#176B3A' }}>
                Your account is secured with encrypted password storage (bcrypt)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
