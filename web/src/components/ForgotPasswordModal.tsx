import React, { useState } from 'react';
import { api } from '../api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
}) => {
  const [resetEmail, setResetEmail] = useState(defaultEmail);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      await api.forgotPassword(resetEmail.trim());
      setSubmitted(true);
    } catch {
      // The backend always returns 200 for valid requests,
      // so an error here means a network issue or server error.
      setErrorMsg('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetState = () => {
    setSubmitted(false);
    setResetEmail('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 25, 15, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleResetState();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header Ribbon */}
        <div
          style={{
            background: 'linear-gradient(135deg, #14532D 0%, #166534 100%)',
            padding: '24px 28px',
            color: '#FFFFFF',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={handleResetState}
            aria-label="Close dialog"
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#FFFFFF',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.3)')}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.15)')}
          >
            ✕
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              🔑
            </div>
            <div>
              <h3 id="forgot-password-title" style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>
                Password Recovery
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '2px' }}>
                AgriConnect Verified Account Service
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '28px' }}>
          {!submitted ? (
            <form onSubmit={handleSubmit} noValidate>
              <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: 1.6, margin: '0 0 20px 0' }}>
                Enter the email address registered with your AgriConnect account. We will send you a secure verification link to reset your password.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="recovery-email"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  Registered Email Address
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
                    ✉️
                  </span>
                  <input
                    id="recovery-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="e.g. farmer@gmail.com"
                    style={{
                      width: '100%',
                      height: '48px',
                      paddingLeft: '44px',
                      paddingRight: '14px',
                      fontSize: '15px',
                      borderRadius: '12px',
                      border: errorMsg ? '2px solid #EF4444' : '1.5px solid #D1D5DB',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                  />
                </div>
                {errorMsg && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#DC2626', fontWeight: 600 }}>
                    {errorMsg}
                  </p>
                )}
              </div>

              {/* LGU RSBSA Note */}
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginBottom: '24px',
                  display: 'flex',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '16px' }}>🌾</span>
                <p style={{ margin: 0, fontSize: '12px', color: '#166534', lineHeight: 1.5 }}>
                  <strong>Farmers & Cooperatives:</strong> You may also verify your identity in person at your Municipal Agriculture Office using your official RSBSA stub.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleResetState}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '10px',
                    border: '1px solid #D1D5DB',
                    background: '#FFFFFF',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #14532D 0%, #166534 100%)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(20, 83, 45, 0.3)',
                  }}
                >
                  {loading ? 'Sending Link...' : 'Send Reset Link →'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  fontSize: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                }}
              >
                ✓
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                Instructions Sent!
              </h4>
              <p style={{ margin: '0 0 18px 0', fontSize: '14px', color: '#4B5563', lineHeight: 1.6 }}>
                If an active AgriConnect account exists for <strong>{resetEmail}</strong>, we have dispatched a secure password reset link. Please check your inbox and spam folder.
              </p>
              <div
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '12px',
                  color: '#6B7280',
                  marginBottom: '20px',
                  textAlign: 'left',
                }}
              >
                • Link expires in 30 minutes for security.<br />
                • Inquiries? Contact your municipal LGU focal person.
              </div>
              <button
                type="button"
                onClick={handleResetState}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#166534',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
