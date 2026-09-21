import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Role } from '../types/auth';

import { LocationSelector } from '../components/LocationSelector';

const rolesList: { role: Role; title: string; desc: string; icon: string }[] = [
  { role: 'farmer', title: 'Farmer', desc: 'Sell produce and access live market rates', icon: '🧑‍🌾' },
  { role: 'buyer', title: 'Buyer', desc: 'Source fresh crops and livestock directly', icon: '📦' },
  { role: 'supplier', title: 'Supplier', desc: 'Sell seeds, fertilizers, and machinery', icon: '🏪' },
  { role: 'lgu_staff', title: 'LGU Staff', desc: 'Coordinate regional agricultural programs', icon: '🏛️' },
];

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  // Exclude dark mode on the register page (same as login page)
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [region, setRegion] = useState('Region III - Central Luzon');
  const [province, setProvince] = useState('Bulacan');
  const [municipality, setMunicipality] = useState('Malolos City');
  const [barangay, setBarangay] = useState('Santo Rosario (Poblacion)');
  const [role, setRole] = useState<Role>('farmer');

  const [loading, setLoading] = useState(false);
  const [submittedPending, setSubmittedPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toastWarning('Password Too Short', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await register({ email, password, role, firstName, lastName, region, province, municipality, barangay });
      if (res.token) {
        toastSuccess('Registration Successful!', 'Welcome to AgriConnect!');
        navigate('/dashboard');
      } else {
        toastSuccess('Registration Submitted', 'Your account is pending verification.');
        setSubmittedPending(true);
      }
    } catch (err: any) {
      toastError('Registration Failed', err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = rolesList.find((r) => r.role === role);

  if (submittedPending) {
    const approverText = role === 'lgu_staff' ? 'Super Admin' : `LGU Staff of ${region}`;

    return (
      <div
        className="gradient-bg"
        style={{
          minHeight: '100dvh',
          padding: '48px 20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          className="glass-panel animate-fade-in"
          style={{
            width: '100%',
            maxWidth: '520px',
            borderRadius: 'var(--radius-xl)',
            padding: '44px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text)', marginBottom: '12px' }}>
            Registration Submitted!
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
            Your account as <strong style={{ color: 'var(--color-text)' }}>{selectedRole?.title}</strong> for <strong style={{ color: 'var(--color-text)' }}>Brgy. {barangay}, {municipality}, {province} ({region})</strong> has been registered.
            <br />
            <br />
            It is currently <span style={{ color: '#d97706', fontWeight: 700 }}>Pending Approval</span> by the <strong>{approverText}</strong>. You will be able to log in once your account has been reviewed and approved.
          </p>

          <button
            type="button"
            className="btn btn-primary btn-lg btn-full"
            onClick={() => navigate('/login')}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="gradient-bg"
      style={{
        minHeight: '100dvh',
        padding: '48px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '620px',
          borderRadius: 'var(--radius-xl)',
          padding: '44px',
          marginBottom: '40px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <span style={{ fontSize: '26px' }}>🌾</span>
            <span
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--color-text)',
                letterSpacing: '-0.4px',
              }}
            >
              AgriConnect
            </span>
          </div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: 'var(--color-text)',
              letterSpacing: '-0.4px',
              marginBottom: '6px',
            }}
          >
            Create your account
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Choose your role to personalize your experience
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Role Selection */}
          <div style={{ marginBottom: '28px' }}>
            <div className="form-label" style={{ marginBottom: '12px' }}>
              Select your role
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '10px',
              }}
            >
              {rolesList.map((r) => {
                const isSelected = role === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    id={`role-${r.role}`}
                    onClick={() => setRole(r.role)}
                    aria-pressed={isSelected}
                    style={{
                      padding: '16px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected
                        ? '2px solid var(--color-accent)'
                        : '1.5px solid var(--color-border)',
                      backgroundColor: isSelected
                        ? 'var(--color-accent-light)'
                        : 'var(--color-surface)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all var(--transition-fast)',
                      boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                      transform: isSelected ? 'translateY(-1px)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-300)';
                        (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                        (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)';
                      }
                    }}
                  >
                    <div style={{ fontSize: '22px', marginBottom: '6px' }}>{r.icon}</div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: isSelected ? 'var(--green-700)' : 'var(--color-text)',
                        marginBottom: '3px',
                      }}
                    >
                      {r.title}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.4,
                      }}
                    >
                      {r.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name fields */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              marginBottom: '14px',
            }}
          >
            <div className="form-group">
              <label htmlFor="reg-firstname" className="form-label">
                First name
              </label>
              <input
                id="reg-firstname"
                type="text"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Maria"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-lastname" className="form-label">
                Last name
              </label>
              <input
                id="reg-lastname"
                type="text"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Santos"
                className="form-input"
              />
            </div>
          </div>

          {/* Cascading Philippine Location Dropdowns */}
          <div style={{ marginBottom: '18px', padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px' }}>
              📍 {role === 'lgu_staff' ? 'Municipal Jurisdiction Location' : 'Account Location'}
            </div>
            {role === 'lgu_staff' && (
              <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 10px 0' }}>
                LGU officers administer at the municipal level (all barangays within the chosen municipality).
              </p>
            )}
            <LocationSelector
              region={region}
              province={province}
              municipality={municipality}
              barangay={barangay}
              excludeBarangay={role === 'lgu_staff'}
              onChange={(r, p, m, b) => {
                setRegion(r);
                setProvince(p);
                setMunicipality(m);
                setBarangay(role === 'lgu_staff' ? '' : b);
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label htmlFor="reg-email" className="form-label">
              Email address
            </label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@example.com"
              className="form-input"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label htmlFor="reg-password" className="form-label">
              Password{' '}
              <span style={{ fontWeight: 400, color: 'var(--color-text-light)' }}>
                (8+ characters)
              </span>
            </label>
            <input
              id="reg-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input"
            />
          </div>

          <button
            type="submit"
            id="register-submit"
            disabled={loading}
            className="btn btn-primary btn-lg btn-full"
          >
            {loading
              ? 'Creating account…'
              : `Register as ${selectedRole?.title ?? 'Farmer'}`}
          </button>
        </form>

        <div
          style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid var(--color-border)',
            textAlign: 'center',
            fontSize: '14px',
            color: 'var(--color-text-muted)',
          }}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = 'underline')}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = 'none')}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
