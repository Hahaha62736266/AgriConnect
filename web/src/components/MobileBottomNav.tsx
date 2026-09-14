import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../api';

interface MobileBottomNavProps {
  onOpenAddModal?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenAddModal }) => {
  const { user } = useAuth();
  const [avatarError, setAvatarError] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setAvatarError(false);
  }, [user?.photoUrl]);

  const handleOpenModal = () => {
    if (onOpenAddModal) {
      onOpenAddModal();
    } else {
      setShowAddMenu(true);
    }
  };

  const actions = [
    {
      title: 'Add Crop',
      desc: 'Create a new listing to sell your harvest',
      icon: '🥦',
      action: () => {
        setShowAddMenu(false);
        navigate('/produce/manage?action=new');
      },
    },
    {
      title: 'Add Expense',
      desc: 'Record money spent on seeds or fertilizer',
      icon: '💸',
      action: () => {
        setShowAddMenu(false);
        navigate('/finances?action=expense');
      },
    },
    {
      title: 'Add Farm Activity',
      desc: 'Schedule planting, fertilizing, or harvest',
      icon: '📅',
      action: () => {
        setShowAddMenu(false);
        navigate('/finances?action=activity');
      },
    },
    {
      title: 'Ask Community',
      desc: 'Ask farmers or community for advice',
      icon: '💬',
      action: () => {
        setShowAddMenu(false);
        navigate('/community?action=ask');
      },
    },
  ];

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'var(--bottomnav-height)',
          background: '#FFFFFF',
          borderTop: '1px solid #E4E2DC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 480,
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.06)',
          padding: '0 8px',
        }}
        className="mobile-bottom-nav"
        aria-label="Mobile Navigation"
      >
        <NavLink
          to="/dashboard"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            textDecoration: 'none',
            color: isActive ? '#176B3A' : '#6F716C',
            fontWeight: isActive ? 800 : 600,
            fontSize: '13px',
          })}
          end
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/produce"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            textDecoration: 'none',
            color: isActive ? '#176B3A' : '#6F716C',
            fontWeight: isActive ? 800 : 600,
            fontSize: '13px',
          })}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          </svg>
          <span>Market</span>
        </NavLink>

        {/* Center Prominent + Add Action Button */}
        <button
          onClick={handleOpenModal}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: '#176B3A',
            color: '#FFFFFF',
            border: '3px solid #FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(23, 107, 58, 0.4)',
            marginTop: '-18px',
            cursor: 'pointer',
          }}
          aria-label="Add new item"
          title="Add Action"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <NavLink
          to="/produce/orders"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            textDecoration: 'none',
            color: isActive ? '#176B3A' : '#6F716C',
            fontWeight: isActive ? 800 : 600,
            fontSize: '13px',
          })}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          </svg>
          <span>Orders</span>
        </NavLink>

        <NavLink
          to="/profile"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            textDecoration: 'none',
            color: isActive ? '#176B3A' : '#6F716C',
            fontWeight: isActive ? 800 : 600,
            fontSize: '13px',
          })}
        >
          {({ isActive }) => (
            <>
              <div
                className={`mobile-nav-avatar ${isActive ? 'active' : ''}`}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: isActive ? '2px solid #176B3A' : '1.5px solid #CBD5E1',
                  boxShadow: isActive ? '0 0 0 1px rgba(23, 107, 58, 0.25)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#EAF6EE',
                  color: '#176B3A',
                  fontSize: '11px',
                  fontWeight: 800,
                  flexShrink: 0,
                  aspectRatio: '1 / 1',
                  transition: 'all 0.15s ease',
                }}
              >
                {!avatarError && user?.photoUrl ? (
                  <img
                    src={getImageUrl(user.photoUrl)}
                    alt={user ? `${user.firstName} ${user.lastName}` : 'Profile'}
                    onError={() => setAvatarError(true)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '50%',
                      display: 'block',
                      aspectRatio: '1 / 1',
                    }}
                  />
                ) : (
                  <span>
                    {(user?.firstName?.[0] || 'U').toUpperCase()}
                  </span>
                )}
              </div>
              <span>Profile</span>
            </>
          )}
        </NavLink>
      </nav>

      {/* Quick Add Modal / Action Sheet */}
      {showAddMenu && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddMenu(false)}
          style={{ zIndex: 999 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27' }}>What would you like to add?</h3>
                <p style={{ fontSize: '14px', color: '#6F716C' }}>Select an action to continue.</p>
              </div>
              <button
                onClick={() => setShowAddMenu(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6F716C' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {actions.map((act, i) => (
                <button
                  key={i}
                  onClick={act.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '2px solid #E4E2DC',
                    background: '#FFFFFF',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#176B3A')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E4E2DC')}
                >
                  <span style={{ fontSize: '32px' }}>{act.icon}</span>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#222522' }}>{act.title}</div>
                    <div style={{ fontSize: '14px', color: '#6F716C' }}>{act.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
