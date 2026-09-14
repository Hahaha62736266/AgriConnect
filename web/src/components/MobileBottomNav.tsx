import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../api';

interface MobileBottomNavProps {
  onOpenAddModal?: () => void;
}

interface QuickAction {
  title: string;
  desc: string;
  icon: string;
  action: () => void;
}

const roleDisplayNames: Record<string, { label: string; badgeIcon: string }> = {
  farmer: { label: 'Farmer', badgeIcon: '🧑‍🌾' },
  buyer: { label: 'Buyer', badgeIcon: '🛒' },
  supplier: { label: 'Supplier', badgeIcon: '📦' },
  lgu_staff: { label: 'LGU Staff', badgeIcon: '🏛️' },
  super_admin: { label: 'Super Admin', badgeIcon: '🛡️' },
};

const getTab4Config = (role?: string) => {
  if (role === 'lgu_staff') {
    return { label: 'Approvals', path: '/lgu/approvals', iconType: 'approvals' };
  }
  if (role === 'super_admin') {
    return { label: 'Approvals', path: '/admin/approvals', iconType: 'approvals' };
  }
  if (role === 'supplier') {
    return { label: 'Orders', path: '/supply/orders', iconType: 'orders' };
  }
  return { label: 'Orders', path: '/produce/orders', iconType: 'orders' };
};

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

  const userRole = user?.role || 'farmer';
  const roleInfo = roleDisplayNames[userRole] || { label: 'User', badgeIcon: '🌱' };
  const tab4 = getTab4Config(userRole);

  const getActions = (): QuickAction[] => {
    switch (userRole) {
      case 'buyer':
        return [
          {
            title: 'Browse Harvest Marketplace',
            desc: 'Find fresh produce directly from local farmers',
            icon: '🥬',
            action: () => {
              setShowAddMenu(false);
              navigate('/produce');
            },
          },
          {
            title: 'Order Agri-Supplies',
            desc: 'Buy certified seeds, fertilizers & tools',
            icon: '🛍️',
            action: () => {
              setShowAddMenu(false);
              navigate('/supply');
            },
          },
          {
            title: 'Check Market Prices',
            desc: 'View latest official crop price trends',
            icon: '📈',
            action: () => {
              setShowAddMenu(false);
              navigate('/market-prices');
            },
          },
          {
            title: 'Community Hub',
            desc: 'Connect & discuss with local agricultural producers',
            icon: '💬',
            action: () => {
              setShowAddMenu(false);
              navigate('/community');
            },
          },
        ];

      case 'supplier':
        return [
          {
            title: 'Add Supply Product',
            desc: 'List seeds, fertilizers, or farm machinery for sale',
            icon: '📦',
            action: () => {
              setShowAddMenu(false);
              navigate('/supply/manage?action=new');
            },
          },
          {
            title: 'View Customer Orders',
            desc: 'Manage pending agri-supply customer orders',
            icon: '📋',
            action: () => {
              setShowAddMenu(false);
              navigate('/supply/orders');
            },
          },
          {
            title: 'Post Announcement',
            desc: 'Share product deals & store updates with farmers',
            icon: '📢',
            action: () => {
              setShowAddMenu(false);
              navigate('/community?action=ask');
            },
          },
          {
            title: 'Community Hub',
            desc: 'Engage directly with agricultural buyers & farmers',
            icon: '💬',
            action: () => {
              setShowAddMenu(false);
              navigate('/community');
            },
          },
        ];

      case 'lgu_staff':
        return [
          {
            title: 'Add Gov\'t Program',
            desc: 'Publish new financial aid, subsidy, or training program',
            icon: '🏛️',
            action: () => {
              setShowAddMenu(false);
              navigate('/programs/manage?action=new');
            },
          },
          {
            title: 'Update Price Benchmark',
            desc: 'Record official trading post crop prices',
            icon: '📊',
            action: () => {
              setShowAddMenu(false);
              navigate('/market-prices/manage?action=new');
            },
          },
          {
            title: 'Approve Regional Accounts',
            desc: 'Verify pending farmer, buyer & supplier registrations',
            icon: '🛡️',
            action: () => {
              setShowAddMenu(false);
              navigate('/lgu/approvals');
            },
          },
          {
            title: 'Regional Dashboard',
            desc: 'Access regional monitoring & data insights',
            icon: '📈',
            action: () => {
              setShowAddMenu(false);
              navigate('/lgu/dashboard');
            },
          },
        ];

      case 'super_admin':
        return [
          {
            title: 'Account Approvals',
            desc: 'Approve LGU staff & official platform registrations',
            icon: '🛡️',
            action: () => {
              setShowAddMenu(false);
              navigate('/admin/approvals');
            },
          },
          {
            title: 'Manage Gov\'t Programs',
            desc: 'Oversight for national assistance programs',
            icon: '🏛️',
            action: () => {
              setShowAddMenu(false);
              navigate('/programs/manage?action=new');
            },
          },
          {
            title: 'Manage Price Data',
            desc: 'Monitor & edit national price benchmarks',
            icon: '📊',
            action: () => {
              setShowAddMenu(false);
              navigate('/market-prices/manage');
            },
          },
          {
            title: 'Community Moderation',
            desc: 'Oversee discussions, announcements & guides',
            icon: '💬',
            action: () => {
              setShowAddMenu(false);
              navigate('/community');
            },
          },
        ];

      case 'farmer':
      default:
        return [
          {
            title: 'Add Crop Listing',
            desc: 'Create a new listing to sell your harvest',
            icon: '🥦',
            action: () => {
              setShowAddMenu(false);
              navigate('/produce/manage?action=new');
            },
          },
          {
            title: 'Record Expense / Income',
            desc: 'Track farm input costs or revenue',
            icon: '💸',
            action: () => {
              setShowAddMenu(false);
              navigate('/finances?action=expense');
            },
          },
          {
            title: 'Add Farm Activity',
            desc: 'Schedule planting, fertilizing, or harvest date',
            icon: '📅',
            action: () => {
              setShowAddMenu(false);
              navigate('/finances?action=activity');
            },
          },
          {
            title: 'Ask Community',
            desc: 'Request agricultural advice from local farmers',
            icon: '💬',
            action: () => {
              setShowAddMenu(false);
              navigate('/community?action=ask');
            },
          },
        ];
    }
  };

  const actions = getActions();

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
          to={tab4.path}
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
          {tab4.iconType === 'approvals' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            </svg>
          )}
          <span>{tab4.label}</span>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>Quick Actions</h3>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#15803D',
                    background: '#DCFCE7',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <span>{roleInfo.badgeIcon}</span> {roleInfo.label}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#6F716C', margin: 0 }}>Select a shortcut to continue.</p>
              </div>
              <button
                onClick={() => setShowAddMenu(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6F716C', padding: '0 4px' }}
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
