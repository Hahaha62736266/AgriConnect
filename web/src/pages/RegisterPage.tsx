import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Role } from '../types/auth';

import { LocationSelector } from '../components/LocationSelector';
import agriConnectLogo from '../assets/AgriConnect.png';

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
      if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    };
  }, []);

  const [role, setRole] = useState<Role>('farmer');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Cascading Philippine Location State
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');

  const [loading, setLoading] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      toastWarning('Incomplete Fields', 'Please fill in all required fields.');
      return;
    }

    if (!region || !province || !municipality || (role !== 'lgu_staff' && !barangay)) {
      toastWarning('Incomplete Location', 'Please select your region, province, municipality, and barangay.');
      return;
    }

    if (password.length < 8) {
      toastWarning('Password Too Short', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await register({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        region,
        province,
        municipality,
        barangay: role === 'lgu_staff' ? '' : barangay,
      });
      if (res && (res as any).token) {
        toastSuccess('Registration Successful!', 'Welcome to AgriConnect!');
        navigate('/dashboard');
      } else {
        setIsPendingApproval(true);
        toastSuccess('Registration Submitted', 'Your account is pending verification.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Registration failed. Please try again.';
      toastError('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = rolesList.find((r) => r.role === role);
  const approverText =
    role === 'lgu_staff'
      ? 'DA (Department of Agriculture) Administrators'
      : `LGU Officers of ${municipality || 'your municipality'}, ${province || 'your province'}`;

  if (isPendingApproval) {
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
            Your account as <strong style={{ color: 'var(--color-text)' }}>{selectedRole?.title}</strong> for <strong style={{ color: 'var(--color-text)' }}>{role === 'lgu_staff' ? `${municipality}, ${province} (${region})` : `Brgy. ${barangay}, ${municipality}, ${province} (${region})`}</strong> has been registered.
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
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link
            to="/"
            className="register-brand-wrap"
            title="AgriConnect Home"
          >
            <img
              src={agriConnectLogo}
              alt="AgriConnect Logo"
              style={{
                width: '44px',
                height: '44px',
                objectFit: 'contain',
                flexShrink: 0,
                display: 'block',
              }}
            />
            <div style={{ textAlign: 'left' }}>
              <div className="register-brand-title">
                <span className="brand-part-1">Agri</span>
                <span className="brand-part-2">Connect</span>
              </div>
              <div className="register-brand-subtitle">
                Connect. Grow. Prosper.
              </div>
            </div>
          </Link>
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

          {/* Location field */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                {role === 'lgu_staff' ? 'Municipal Jurisdiction' : 'Location'}
              </label>
              {role === 'lgu_staff' && (
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  (Administered at municipal level)
                </span>
              )}
            </div>
            <LocationSelector
              region={region}
              province={province}
              municipality={municipality}
              barangay={barangay}
              excludeBarangay={role === 'lgu_staff'}
              progressive={true}
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
