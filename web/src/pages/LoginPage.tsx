import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import agriConnectLogo from '../assets/AgriConnect.svg';
import agriConnectPng from '../assets/AgriConnect.png';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { ContactLguModal } from '../components/ContactLguModal';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error, warning } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isContactLguOpen, setIsContactLguOpen] = useState(false);

  // Exclude dark mode on the login page
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

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      warning('Required Fields Missing', 'Please enter your email address and password.');
      setHasError(true);
      return;
    }

    setLoading(true);
    setHasError(false);

    try {
      await login({ email: email.trim(), password });
      success('Welcome back!', 'Signed in successfully. Redirecting to your dashboard...');
      navigate(from, { replace: true });
    } catch (err: any) {
      setHasError(true);
      const errMsg: string =
        err.response?.data?.error ||
        'Login failed. Please verify your credentials and try again.';

      if (errMsg.toLowerCase().includes('pending approval')) {
        warning('Account Pending Verification', errMsg);
      } else if (errMsg.toLowerCase().includes('rejected')) {
        error('Registration Denied', errMsg);
      } else {
        error('Sign-in Failed', errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-root">
      {/* ══════════════════════════════════════════════════════════════════════════
          LEFT BRANDING & HERO PANEL (Emerald Gradient + Network Constellation)
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className="login-hero-panel">

        {/* Top Brand Identity */}
        <div className="login-hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '13px',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
                flexShrink: 0,
                padding: '5px',
                boxSizing: 'border-box',
              }}
            >
              <img
                src={agriConnectPng}
                alt="AgriConnect"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '-0.4px',
                  lineHeight: 1.1,
                  color: '#FFFFFF',
                }}
              >
                <span>Agri</span><span style={{ fontWeight: 800 }}>Connect</span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 500,
                  letterSpacing: '0.2px',
                  marginTop: '2px',
                }}
              >
                Connect. Grow. Prosper.
              </div>
            </div>
          </div>
        </div>

        {/* Middle Narrative & 3 Feature Points matching reference */}
        <div className="login-hero-content" style={{ marginTop: 'clamp(14px, 2.5vh, 24px)', marginBottom: 'clamp(14px, 2.5vh, 24px)' }}>
          <div className="login-hero-eyebrow">
            <span style={{ fontSize: '13px', lineHeight: 1 }}>🇵🇭</span>
            <span>PHILIPPINE AGRICULTURAL PLATFORM</span>
          </div>

          <br />
          <br />

          {/* <h1 className="login-hero-headline">
            Where farmers, suppliers<br />
            & markets <span style={{ color: '#599d3a' }}>connect</span>.
          </h1> */}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 900,
                letterSpacing: '-0.6px',
                lineHeight: 1,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              Where farmers, suppliers<br />
              & markets <span style={{ color: '#8ecd2c' }}>connect</span>.
              {/* <span style={{ color: '#1c533c' }}>Agri</span><span style={{ color: '#599d3a' }}>Connect</span> */}
            </div>
          </div>

          <div
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: 500,
              letterSpacing: '0.2px',
              marginTop: '2px',
            }}>
            Streamline agricultural trade with real-time <br /> DA commodity benchmarks, access municipal <br /> assistance programs, and connect directly <br /> with markets — all in one secure platform.
          </div>

          {/* 4 Main Purposes of AgriConnect (2x2 Squircle Format) */}
          <div className="login-hero-purposes">
            {/* 1. Direct Farm Marketplace */}
            <div className="login-purpose-item">
              <div className="login-purpose-squircle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <div className="login-purpose-label">
                Direct Farm<br />Marketplace
              </div>
            </div>

            {/* 2. Live Price Benchmark */}
            <div className="login-purpose-item">
              <div className="login-purpose-squircle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <div className="login-purpose-label">
                Live Price<br />Benchmark
              </div>
            </div>

            {/* 3. Municipal Assistance Programs */}
            <div className="login-purpose-item">
              <div className="login-purpose-squircle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="22" x2="21" y2="22" />
                  <line x1="6" y1="18" x2="6" y2="11" />
                  <line x1="10" y1="18" x2="10" y2="11" />
                  <line x1="14" y1="18" x2="14" y2="11" />
                  <line x1="18" y1="18" x2="18" y2="11" />
                  <polygon points="12 2 20 7 4 7" />
                </svg>
              </div>
              <div className="login-purpose-label">
                Municipal Assistance<br />Programs
              </div>
            </div>

            {/* 4. Digital Farm Management */}
            <div className="login-purpose-item">
              <div className="login-purpose-squircle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20h16" />
                  <path d="M12 20V10" />
                  <path d="M12 10a5 5 0 0 1 5-5c0 4.5-2 7-5 7" />
                  <path d="M12 14a5 5 0 0 0-5-5c0 4.5 2 7 5 7" />
                </svg>
              </div>
              <div className="login-purpose-label">
                Digital Farm<br />Management
              </div>
            </div>
          </div>
        </div>
        <br />

        {/* Bottom-Left Trust & Compliance Badge (Matching Reference) */}
        <div className="login-hero-trust-badge">
          {/* Left: Shield & Protected Message */}
          <div className="login-trust-left">
            <svg className="login-trust-shield" viewBox="0 0 24 24" fill="none" stroke="#599D3A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" strokeWidth="2.6" />
            </svg>
            <div>
              <div className="login-trust-title">Secure. Verified. Government-Aligned.</div>
              <div className="login-trust-subtitle">Your data and transactions are protected.</div>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="login-trust-divider" />

          {/* Right: Bullet Checklist */}
          <div className="login-trust-right">
            <div className="login-trust-item">
              <svg className="login-trust-check" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#14763C" />
                <path d="m8.5 12 2.5 2.5 4.5-4.5" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Verified users</span>
            </div>
            <div className="login-trust-item">
              <svg className="login-trust-check" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#14763C" />
                <path d="m8.5 12 2.5 2.5 4.5-4.5" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Protected transactions</span>
            </div>
            <div className="login-trust-item">
              <svg className="login-trust-check" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#14763C" />
                <path d="m8.5 12 2.5 2.5 4.5-4.5" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>LGU-supported services</span>
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          RIGHT SIGN-IN PANEL (Clean Pure White, Centered, UMA-Style Alignment)
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className="login-form-panel">
        <div className="login-form-container">
          {/* Mobile Brand Header */}
          <div className="login-mobile-brand">
            <img
              src={agriConnectLogo}
              alt="AgriConnect Logo"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                objectFit: 'contain',
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: '-0.4px',
                }}
              >
                <span style={{ color: '#14532D' }}>Agri</span><span style={{ color: '#599D3A' }}>Connect</span>
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#64748B',
                  marginTop: '2px',
                }}
              >
                Connect. Grow. Prosper.
              </div>
            </div>
          </div>

          {/* Stylized Brand Logo Wordmark matching UMA header */}
          <div className="login-desktop-wordmark" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 900,
                letterSpacing: '-0.6px',
                lineHeight: 1,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              <span style={{ color: '#1c533c' }}>Agri</span><span style={{ color: '#599d3a' }}>Connect</span>
            </div>
          </div>

          {/* Eyebrow */}
          <div className="login-uma-eyebrow" style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#15803D', marginTop: '12px', marginBottom: '6px' }}>
            WELCOME BACK
          </div>

          {/* Title */}
          <h2 className="login-uma-title" style={{ fontSize: 'clamp(24px, 2.4vw, 28px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', margin: '0 0 6px 0', lineHeight: 1.2 }}>
            Sign in to AgriConnect
          </h2>

          {/* Subtitle */}
          <p className="login-uma-subtitle" style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: '0 0 20px 0' }}>
            Sign in to continue your agricultural journey on AgriConnect.
          </p>

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div className="login-field-wrap" style={{ marginBottom: '14px' }}>
              <label
                className="login-field-label"
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '5px',
                }}
              >
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '13px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#94A3B8',
                    pointerEvents: 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@gmail.com"
                  className="form-input login-input-box"
                  style={{
                    height: '42px',
                    paddingLeft: '38px',
                    paddingRight: '14px',
                    fontSize: '13.5px',
                    borderRadius: '10px',
                    border: hasError ? '2px solid #EF4444' : '1.5px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="login-field-wrap" style={{ marginBottom: '6px' }}>
              <label
                className="login-field-label"
                htmlFor="login-password"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '5px',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '13px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#94A3B8',
                    pointerEvents: 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="form-input login-input-box"
                  style={{
                    height: '42px',
                    paddingLeft: '38px',
                    paddingRight: '38px',
                    fontSize: '13.5px',
                    borderRadius: '10px',
                    border: hasError ? '2px solid #EF4444' : '1.5px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6B7280',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-.722-3.25" />
                      <path d="M2 8a10.645 10.645 0 0 0 20 0" />
                      <path d="m20 15-1.726-2.05" />
                      <path d="m4 15 1.726-2.05" />
                      <path d="m9 18 .722-3.25" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Right-Aligned Link matching reference */}
            <div className="login-forgot-wrap" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#15803D',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#14532D')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#15803D')}
              >
                Forgot password?
              </button>
            </div>

            {/* Primary Action Button: Sign in securely → */}
            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="login-submit-btn"
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: '#14532D',
                color: '#FFFFFF',
                fontSize: '14.5px',
                fontWeight: 700,
                borderRadius: '10px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(20, 83, 45, 0.2)',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#166534')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#14532D')}
            >
              {loading ? (
                <>
                  <span>🔄</span> Signing in…
                </>
              ) : (
                'Sign in securely →'
              )}
            </button>
          </form>

          {/* Option 2: Clean Centered Security Pill */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="login-security-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#599D3A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>Protected access · Encrypted session</span>
            </div>
          </div>

          {/* Hairline Divider */}
          <div className="login-bottom-divider" />

          {/* Option 2: Split Left/Right Action Bar */}
          <div
            className="login-dual-actions"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              boxSizing: 'border-box',
              marginTop: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setIsContactLguOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#475569',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                flexShrink: 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#15803D')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#475569')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a9 9 0 0 1 18 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
                <path d="M21 16v2a4 4 0 0 1-4 4h-5" />
              </svg>
              <span>Contact LGU Support</span>
            </button>

            <Link
              to="/register"
              style={{
                color: '#15803D',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                marginLeft: 'auto',
                flexShrink: 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#14532D')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#15803D')}
            >
              <span>Create account</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Recovery Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        defaultEmail={email}
      />

      {/* LGU Support Desk Modal */}
      <ContactLguModal
        isOpen={isContactLguOpen}
        onClose={() => setIsContactLguOpen(false)}
      />
    </div>
  );
};
