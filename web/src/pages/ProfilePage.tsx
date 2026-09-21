import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api, getImageUrl } from '../api';
import { supplyApi } from '../api/supply';
import type { SupplyOrder, PaymentMethod, PaymentStatus } from '../types/supply';

import { LocationSelector } from '../components/LocationSelector';
import gcashLogo from '../assets/gcash.png';
import mayaLogo from '../assets/maya.webp';

const roleLabelMap: Record<string, string> = {
  farmer: 'Farmer Producer',
  buyer: 'Wholesale Buyer',
  supplier: 'Agri Supplier',
  lgu_staff: 'LGU Officer',
  super_admin: 'Super Administrator',
};

type PurchaseTab = 'quoted' | 'to_pay' | 'to_ship' | 'to_receive' | 'completed' | 'cancelled' | 'refunded';

const purchaseTabs: { key: PurchaseTab; label: string; icon: string }[] = [
  { key: 'quoted', label: 'Quoted', icon: '💬' },
  { key: 'to_pay', label: 'To Pay', icon: '💳' },
  { key: 'to_ship', label: 'To Ship', icon: '📦' },
  { key: 'to_receive', label: 'To Receive', icon: '🚚' },
  { key: 'completed', label: 'Completed', icon: '✅' },
  { key: 'cancelled', label: 'Cancelled', icon: '❌' },
  { key: 'refunded', label: 'Return / Refund', icon: '↩️' },
];

const paymentMethodLabels: Record<PaymentMethod, { label: string; icon: string }> = {
  cod: { label: 'Cash on Delivery', icon: '💵' },
  gcash: { label: 'GCash', icon: '📱' },
  maya: { label: 'Maya', icon: '💜' },
  bank_transfer: { label: 'Bank Transfer', icon: '🏦' },
  card: { label: 'Card Payment', icon: '💳' },
};

const paymentStatusBadges: Record<PaymentStatus, { label: string; badgeClass: string; icon: string }> = {
  pending_payment: { label: '⏳ Awaiting Payment', badgeClass: 'badge-warning', icon: '⏳' },
  payment_pending_verification: { label: '🔍 Pending Verification', badgeClass: 'badge-info', icon: '🔍' },
  paid: { label: '✅ Payment Completed', badgeClass: 'badge-success', icon: '✅' },
  failed: { label: '❌ Payment Failed', badgeClass: 'badge-danger', icon: '❌' },
  refunded: { label: '↩️ Payment Refunded', badgeClass: 'badge-info', icon: '↩️' },
};

export const ProfilePage: React.FC = () => {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [region, setRegion] = useState(user?.region || '');
  const [province, setProvince] = useState(user?.province || '');
  const [municipality, setMunicipality] = useState(user?.municipality || '');
  const [barangay, setBarangay] = useState(user?.barangay || '');
  const [address, setAddress] = useState(user?.address || '');
  const [gcashNumber, setGcashNumber] = useState(user?.gcashNumber || '');
  const [gcashName, setGcashName] = useState(user?.gcashName || '');
  const [gcashQrUrl, setGcashQrUrl] = useState(user?.gcashQrUrl || '');
  const [mayaNumber, setMayaNumber] = useState(user?.mayaNumber || '');
  const [mayaName, setMayaName] = useState(user?.mayaName || '');
  const [mayaQrUrl, setMayaQrUrl] = useState(user?.mayaQrUrl || '');
  const [bankName, setBankName] = useState(user?.bankName || '');
  const [bankAccountNo, setBankAccountNo] = useState(user?.bankAccountNo || '');
  const [bankAccountName, setBankAccountName] = useState(user?.bankAccountName || '');
  const [bankQrUrl, setBankQrUrl] = useState(user?.bankQrUrl || '');
  const [uploadingQr, setUploadingQr] = useState(false);
  const [uploadingMayaQr, setUploadingMayaQr] = useState(false);
  const [uploadingBankQr, setUploadingBankQr] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setRegion(user.region || '');
      setProvince(user.province || '');
      setMunicipality(user.municipality || '');
      setBarangay(user.barangay || '');
      setAddress(user.address || '');
      setGcashNumber(user.gcashNumber || '');
      setGcashName(user.gcashName || '');
      setGcashQrUrl(user.gcashQrUrl || '');
      setMayaNumber(user.mayaNumber || '');
      setMayaName(user.mayaName || '');
      setMayaQrUrl(user.mayaQrUrl || '');
      setBankName(user.bankName || '');
      setBankAccountNo(user.bankAccountNo || '');
      setBankAccountName(user.bankAccountName || '');
      setBankQrUrl(user.bankQrUrl || '');
    }
  }, [user]);

  const { success: toastSuccess, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    toastSuccess('Logged Out', 'You have been safely logged out.');
    navigate('/login');
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const res = await api.uploadImage(file);
      setGcashQrUrl(res.url);
      toastSuccess('QR Code Uploaded', 'Your GCash QR Code image has been attached.');
    } catch {
      toastError('Upload Failed', 'Could not upload QR Code image.');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleMayaQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMayaQr(true);
    try {
      const res = await api.uploadImage(file);
      setMayaQrUrl(res.url);
      toastSuccess('QR Code Uploaded', 'Your Maya QR Code image has been attached.');
    } catch {
      toastError('Upload Failed', 'Could not upload Maya QR Code image.');
    } finally {
      setUploadingMayaQr(false);
    }
  };

  const handleBankQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBankQr(true);
    try {
      const res = await api.uploadImage(file);
      setBankQrUrl(res.url);
      toastSuccess('QR Code Uploaded', 'Your Bank / InstaPay QR Code image has been attached.');
    } catch {
      toastError('Upload Failed', 'Could not upload Bank QR Code image.');
    } finally {
      setUploadingBankQr(false);
    }
  };

  // Purchases state
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<PurchaseTab>('to_ship');

  useEffect(() => {
    if (user && (user.role === 'farmer' || user.role === 'buyer')) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await supplyApi.listOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders for profile:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  if (!user) return null;

  const isApproved =
    (user.status === 'approved' || !user.status || user.isVerified) &&
    user.status !== 'pending' &&
    user.status !== 'rejected';
  const isLocationLocked = isApproved && user.role !== 'super_admin';

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.updateProfile({
        firstName,
        lastName,
        phone,
        region,
        province,
        municipality,
        barangay,
        address,
        gcashNumber,
        gcashName,
        gcashQrUrl,
        mayaNumber,
        mayaName,
        mayaQrUrl,
        bankName,
        bankAccountNo,
        bankAccountName,
        bankQrUrl,
      });
      await refreshProfile();
      toastSuccess('Profile Updated', 'Your profile and payment account details have been saved!');
    } catch (err: any) {
      toastError('Update Failed', err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      await api.uploadPhoto(file);
      await refreshProfile();
      toastSuccess('Photo Updated', 'Your profile photo has been updated!');
    } catch (err: any) {
      toastError('Upload Failed', err.response?.data?.error || 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // Filter orders by tab
  const getOrdersForTab = (tab: PurchaseTab) => {
    return orders.filter((o) => {
      if (tab === 'refunded') return o.paymentStatus === 'refunded';
      if (tab === 'to_pay') {
        return (
          o.status !== 'cancelled' &&
          o.status !== 'completed' &&
          !(o.deliveryMethod === 'delivery' && o.status === 'pending') &&
          o.paymentMethod !== 'cod' &&
          o.paymentStatus !== 'paid' &&
          !o.paymentRefNo
        );
      }
      if (tab === 'quoted') return o.status === 'quoted';
      if (tab === 'to_ship') return o.status === 'pending' || o.status === 'processing';
      if (tab === 'to_receive') return o.status === 'shipped_ready';
      if (tab === 'completed') return o.status === 'completed' && o.paymentStatus !== 'refunded';
      if (tab === 'cancelled') return o.status === 'cancelled' && o.paymentStatus !== 'refunded';
      return false;
    });
  };

  const currentTabOrders = getOrdersForTab(activeTab);

  return (
    <div className="app-container profile-container" style={{ paddingBottom: '40px' }}>
      {/* ─── Page Header ─── */}
      <div className="profile-page-header" style={{ marginBottom: '28px' }}>
        <h1 className="profile-page-title" style={{ fontSize: '34px', fontWeight: 800, color: '#0E4A27' }}>
          My Account & Profile
        </h1>
        <p className="profile-page-subtitle" style={{ fontSize: '20px', color: '#525450', marginTop: '4px' }}>
          Manage your contact information, farm location, and view your supply purchases.
        </p>
      </div>

      <div className="profile-content-stack" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* ─── Avatar & User Card ─── */}
        <div className="card profile-user-card" style={{ padding: '28px', display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
          <div className="profile-avatar-wrap" style={{ position: 'relative' }}>
            <div
              className="profile-avatar-circle"
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: '#176B3A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                fontWeight: 800,
                overflow: 'hidden',
                boxShadow: '0 4px 14px rgba(23, 107, 58, 0.25)',
                aspectRatio: '1 / 1',
                flexShrink: 0,
              }}
            >
              {user.photoUrl ? (
                <img
                  src={getImageUrl(user.photoUrl)}
                  alt="Profile"
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
                user.firstName[0]?.toUpperCase()
              )}
            </div>

            <label
              className="profile-photo-upload-btn"
              style={{
                position: 'absolute',
                bottom: '0px',
                right: '0px',
                backgroundColor: '#0E4A27',
                color: '#FFFFFF',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px',
                border: '3px solid #FFFFFF',
              }}
              title="Upload photo"
            >
              📷
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
          </div>

          <div className="profile-user-details">
            <div className="profile-user-header-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h2 className="profile-user-name" style={{ fontSize: '28px', fontWeight: 800, color: '#1A1C1A', margin: 0 }}>
                {user.firstName} {user.lastName}
              </h2>
              <span
                className={`badge profile-verified-badge ${user.role === 'super_admin' || isApproved
                  ? 'badge-verified'
                  : user.status === 'rejected'
                    ? 'badge-danger'
                    : 'badge-warning'
                  }`}
                style={{ fontSize: '16px' }}
              >
                {user.role === 'super_admin'
                  ? '🛡️ Verified Administrator'
                  : user.status === 'rejected'
                    ? '❌ Rejected Account'
                    : user.status === 'pending'
                      ? '⏳ Pending Verification'
                      : user.role === 'lgu_staff'
                        ? '🏛️ Verified LGU Officer'
                        : user.role === 'supplier'
                          ? '🚜 Verified Agri-Supplier'
                          : user.role === 'buyer'
                            ? '📦 Verified Wholesale Buyer'
                            : '🧑‍🌾 Verified Farmer'}
              </span>
            </div>

            <p className="profile-user-contact" style={{ color: '#525450', fontSize: '18px', margin: '6px 0 8px 0', fontWeight: 600 }}>
              📧 {user.email} {user.phone ? `• 📞 ${user.phone}` : ''}
            </p>

            {(user.barangay || user.municipality || user.province || user.region) && (
              <p className="profile-user-location" style={{ color: '#0E4A27', fontSize: '15px', margin: '0 0 12px 0', fontWeight: 700 }}>
                📍 {user.role === 'lgu_staff'
                  ? [user.municipality ? `${user.municipality} (All Barangays)` : '', user.province, user.region].filter(Boolean).join(', ')
                  : [user.barangay ? `Brgy. ${user.barangay}` : '', user.municipality, user.province, user.region].filter(Boolean).join(', ')}
              </p>
            )}

            <div className="profile-user-roles-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-info profile-role-badge" style={{ fontSize: '16px' }}>
                🌾 {roleLabelMap[user.role] ?? user.role}
              </span>

              {uploading && (
                <span className="profile-uploading-text" style={{ fontSize: '16px', color: '#176B3A', marginLeft: '12px', fontWeight: 800 }}>
                  Uploading photo…
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ─── My Purchases Section ─── */}
        {(user.role === 'farmer' || user.role === 'buyer') && (
          <div className="card profile-purchases-card" style={{ padding: '28px' }}>
            <div className="profile-purchases-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 className="profile-section-title" style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
                🛍️ My Purchases
              </h2>
              <button
                onClick={() => navigate('/supply/orders')}
                className="btn btn-secondary profile-view-all-btn"
                style={{ fontSize: '16px' }}
              >
                View All Purchases →
              </button>
            </div>

            {/* Purchase Tabs */}
            <div className="profile-purchases-tabs" style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #E4E2DC', paddingBottom: '16px', overflowX: 'auto' }}>
              {purchaseTabs.map((tab) => {
                const count = getOrdersForTab(tab.key).length;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    className={`profile-purchase-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 20px',
                      borderRadius: '30px',
                      border: `2.5px solid ${isActive ? '#176B3A' : '#D8D6CF'}`,
                      background: isActive ? '#176B3A' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#1A1C1A',
                      fontWeight: 800,
                      fontSize: '17px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span
                        className="profile-purchase-tab-badge"
                        style={{
                          backgroundColor: isActive ? '#FFFFFF' : '#176B3A',
                          color: isActive ? '#176B3A' : '#FFFFFF',
                          fontSize: '14px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Orders Content */}
            <div className="profile-purchases-content" style={{ marginTop: '24px' }}>
              {ordersLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#525450', fontSize: '18px', fontWeight: 600 }}>
                  Loading your supply orders…
                </div>
              ) : currentTabOrders.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: '#525450' }}>
                  <div style={{ fontSize: '56px', marginBottom: '12px' }}>🛒</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27' }}>
                    No supply orders in "{purchaseTabs.find((t) => t.key === activeTab)?.label}"
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {currentTabOrders.map((order) => {
                    const payMethod = paymentMethodLabels[order.paymentMethod] ?? { label: order.paymentMethod, icon: '💳' };
                    const payBadge = paymentStatusBadges[order.paymentStatus] ?? paymentStatusBadges['pending_payment'];

                    return (
                      <div
                        key={order.id}
                        className="profile-order-item-card"
                        style={{
                          padding: '20px 24px',
                          borderRadius: '16px',
                          border: '2px solid #E4E2DC',
                          backgroundColor: '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div>
                            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0E4A27' }}>
                              Order #{order.id.slice(-6).toUpperCase()}
                            </span>
                            <span style={{ fontSize: '16px', color: '#525450', marginLeft: '12px', fontWeight: 600 }}>
                              Supplier: {order.supplierName}
                            </span>
                          </div>

                          <span className={`badge ${payBadge.badgeClass}`} style={{ fontSize: '15px' }}>
                            {payBadge.label}
                          </span>
                        </div>

                        {/* Order Items */}
                        <div style={{ fontSize: '17px', color: '#1A1C1A', backgroundColor: '#F8F7F3', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E4E2DC' }}>
                          {order.items.map((i, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span>{i.quantity} × {i.productName}</span>
                              <span style={{ fontWeight: 800 }}>₱{(i.quantity * i.pricePerItem).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <span style={{ fontSize: '16px', color: '#525450', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {order.paymentMethod === 'gcash' ? (
                              <img src={gcashLogo} alt="GCash" style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '3px' }} />
                            ) : order.paymentMethod === 'maya' ? (
                              <img src={mayaLogo} alt="Maya" style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '3px' }} />
                            ) : (
                              <span>{payMethod.icon}</span>
                            )}
                            <span>{payMethod.label}</span>
                            <span>•</span>
                            <span>{order.deliveryMethod === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}</span>
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '24px', fontWeight: 800, color: '#0E4A27' }}>
                              Total: ₱{order.totalAmount.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => navigate('/supply/orders')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                background: activeTab === 'to_pay' ? '#16A34A' : activeTab === 'quoted' ? '#D97706' : '#F1F5F9',
                                color: activeTab === 'to_pay' || activeTab === 'quoted' ? '#FFFFFF' : '#334155',
                                border: '1px solid ' + (activeTab === 'to_pay' ? '#15803D' : activeTab === 'quoted' ? '#B45309' : '#CBD5E1'),
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                              }}
                            >
                              {activeTab === 'to_pay' ? '💳 Pay Now →' : activeTab === 'quoted' ? '💬 Review Quote →' : 'View Order →'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Personal Information Form Card ─── */}
        <div className="card profile-form-card" style={{ padding: '28px' }}>
          <h2 className="profile-section-title" style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27', marginBottom: '24px' }}>
            {user.role === 'super_admin'
              ? 'Personal Information & Office Jurisdiction'
              : user.role === 'lgu_staff'
                ? 'Personal Information & LGU Jurisdiction'
                : user.role === 'buyer'
                  ? 'Personal Information & Business Location'
                  : user.role === 'supplier'
                    ? 'Personal Information & Supply Store Location'
                    : 'Personal Information & Farm Address'}
          </h2>

          <form onSubmit={handleUpdateProfile}>
            <div className="profile-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  className="form-input profile-form-input"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{ fontSize: '18px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  className="form-input profile-form-input"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{ fontSize: '18px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div className="form-group" style={{ maxWidth: '420px' }}>
                <label className="form-label">Contact Phone Number</label>
                <input
                  className="form-input profile-form-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0917-123-4567"
                  style={{ fontSize: '18px' }}
                />
              </div>
            </div>

            {/* Cascading Philippine Location Dropdowns */}
            <div
              className="profile-location-box"
              style={{
                marginBottom: '24px',
                padding: '24px',
                borderRadius: '16px',
                backgroundColor: '#F7FAF7',
                border: '1.5px solid #D1E5D9',
              }}
            >
              <div
                style={{
                  fontSize: '19px',
                  fontWeight: 800,
                  color: '#0E4A27',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>📍</span>{' '}
                {user.role === 'super_admin' || user.role === 'lgu_staff'
                  ? 'Office & Jurisdiction Location'
                  : user.role === 'buyer' || user.role === 'supplier'
                    ? 'Business & Jurisdiction Location'
                    : 'Farm & Jurisdiction Location'}
              </div>
              <p style={{ color: '#525450', fontSize: '15px', marginTop: '-10px', marginBottom: '16px' }}>
                Select your official Region, Province, Municipality, and Barangay jurisdiction.
              </p>

              {user.role === 'lgu_staff' ? (
                /* ─── LGU Officer Official Jurisdiction Lock (Immutable to prevent data leaks) ─── */
                <div
                  className="profile-location-locked-card"
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #86EFAC',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        🔒 Official Municipal Jurisdiction (Locked)
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#0E4A27', marginTop: '4px' }}>
                        {user.municipality || 'Assigned Municipality'}, {user.province || 'Province'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#4B5563', marginTop: '2px' }}>
                        {user.region || 'Region X - Northern Mindanao'} • Covers All Municipal Barangays
                      </div>
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        background: '#DCFCE7',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#15803D',
                        border: '1px solid #86EFAC',
                      }}
                    >
                      🏛️ LGU Agriculture Office
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: '14px',
                      padding: '10px 14px',
                      background: '#F0FDF4',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#166534',
                      lineHeight: 1.45,
                      borderLeft: '3px solid #16A34A',
                    }}
                  >
                    <strong>Data Privacy & Security:</strong> To prevent unauthorized cross-municipality data leakage, jurisdiction cannot be self-edited. Barangay is excluded because your office oversees the entire municipality. To request an official jurisdictional transfer, contact the Super Administrator.
                  </div>
                </div>
              ) : isLocationLocked ? (
                /* ─── Approved User Jurisdiction Lock (Farmers, Buyers, Suppliers) ─── */
                <div
                  className="profile-location-locked-card"
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #86EFAC',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🔒</span>
                        <span>Verified Jurisdiction (Approved & Locked)</span>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#0E4A27', marginTop: '4px' }}>
                        {user.barangay ? `Brgy. ${user.barangay}, ` : ''}{user.municipality || 'Municipality'}, {user.province || 'Province'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#4B5563', marginTop: '2px' }}>
                        {user.region || 'Region X - Northern Mindanao'}
                      </div>
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        background: '#DCFCE7',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#15803D',
                        border: '1px solid #86EFAC',
                      }}
                    >
                      ✓ LGU Verified & Approved
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: '14px',
                      padding: '10px 14px',
                      background: '#F0FDF4',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#166534',
                      lineHeight: 1.45,
                      borderLeft: '3px solid #16A34A',
                    }}
                  >
                    <strong>Official Jurisdiction Policy:</strong> Your {user.role === 'farmer' ? 'farm' : 'registered'} jurisdiction is locked because your account has been officially verified and approved by the LGU. To preserve municipal aid records, localized market price tracking, and delivery logistics, jurisdiction cannot be self-edited. If your {user.role === 'farmer' ? 'farm' : 'business'} has relocated, please contact your Municipal Agriculture Office or Super Administrator to request an official jurisdiction transfer.
                  </div>
                </div>
              ) : (
                /* ─── Super Admin or Pending Account Location Selector ─── */
                <div>
                  {user.role === 'super_admin' && (
                    <div style={{ marginBottom: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#166534', background: '#DCFCE7', padding: '4px 10px', borderRadius: '12px' }}>
                      🛡️ Super Admin — Unrestricted Jurisdiction Authority
                    </div>
                  )}
                  <LocationSelector
                    layout="grid"
                    showNumbers={false}
                    fontSize="16px"
                    region={region}
                    province={province}
                    municipality={municipality}
                    barangay={barangay}
                    onChange={(r, p, m, b) => {
                      setRegion(r);
                      setProvince(p);
                      setMunicipality(m);
                      setBarangay(b);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label">
                {user.role === 'farmer'
                  ? 'Specific Street Address / Farm Landmark'
                  : 'Specific Street Address / Building Landmark'}
              </label>
              <textarea
                className="form-input profile-form-input"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Purok, Sitio, Street name, House/Lot No., Landmark"
                style={{ fontSize: '18px', resize: 'vertical' }}
              />
            </div>

            {/* ─── Payment & Payout Receiving Accounts Section (Farmers & Suppliers Only) ─── */}
            {(user.role === 'farmer' || user.role === 'supplier') && (
              <div
                style={{
                  marginBottom: '28px',
                  padding: '24px',
                  borderRadius: '16px',
                  backgroundColor: '#F0F9FF',
                  border: '1.5px solid #BAE6FD',
                }}
              >
                <div style={{ fontSize: '19px', fontWeight: 800, color: '#0369A1', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💳</span> Payment Receiving Accounts (GCash / Maya / Bank)
                </div>
                <p style={{ color: '#0369A1', fontSize: '14px', margin: '0 0 16px 0', lineHeight: 1.45 }}>
                  Configure your e-wallet & bank details. When buyers pay for your produce or supplies via GCash or Maya, your QR code and account details will be shown directly at checkout!
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  {/* GCash Details */}
                  <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #CBD5E1' }}>
                    <div style={{ fontWeight: 800, color: '#005CE6', fontSize: '15px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={gcashLogo}
                        alt="GCash"
                        style={{
                          width: '22px',
                          height: '22px',
                          objectFit: 'contain',
                          borderRadius: '4px',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      GCash Account
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                          GCash Mobile Number
                        </label>
                        <input
                          type="text"
                          placeholder="0917XXXXXXX"
                          value={gcashNumber}
                          onChange={(e) => setGcashNumber(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                          Registered Account Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Juan Dela Cruz"
                          value={gcashName}
                          onChange={(e) => setGcashName(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          GCash QR Code Image
                        </label>
                        {gcashQrUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={getImageUrl(gcashQrUrl)} alt="GCash QR" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                            <label style={{ fontSize: '12px', color: '#005CE6', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                              {uploadingQr ? 'Uploading...' : 'Change QR Code'}
                              <input type="file" accept="image/*" onChange={handleQrUpload} style={{ display: 'none' }} disabled={uploadingQr} />
                            </label>
                          </div>
                        ) : (
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: '#EFF6FF', border: '1px dashed #3B82F6', color: '#1D4ED8', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            📸 {uploadingQr ? 'Uploading QR...' : 'Upload GCash QR Code Image'}
                            <input type="file" accept="image/*" onChange={handleQrUpload} style={{ display: 'none' }} disabled={uploadingQr} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Maya Details */}
                  <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #CBD5E1' }}>
                    <div style={{ fontWeight: 800, color: '#7C3AED', fontSize: '15px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={mayaLogo}
                        alt="Maya"
                        style={{
                          width: '22px',
                          height: '22px',
                          objectFit: 'contain',
                          borderRadius: '4px',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      Maya Account
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                          Maya Mobile Number
                        </label>
                        <input
                          type="text"
                          placeholder="0918XXXXXXX"
                          value={mayaNumber}
                          onChange={(e) => setMayaNumber(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                          Account Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Juan Dela Cruz"
                          value={mayaName}
                          onChange={(e) => setMayaName(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Maya QR Code Image
                        </label>
                        {mayaQrUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={getImageUrl(mayaQrUrl)} alt="Maya QR" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                            <label style={{ fontSize: '12px', color: '#7C3AED', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                              {uploadingMayaQr ? 'Uploading...' : 'Change QR Code'}
                              <input type="file" accept="image/*" onChange={handleMayaQrUpload} style={{ display: 'none' }} disabled={uploadingMayaQr} />
                            </label>
                          </div>
                        ) : (
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: '#F5F3FF', border: '1px dashed #A78BFA', color: '#6D28D9', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            📸 {uploadingMayaQr ? 'Uploading QR...' : 'Upload Maya QR Code Image'}
                            <input type="file" accept="image/*" onChange={handleMayaQrUpload} style={{ display: 'none' }} disabled={uploadingMayaQr} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #CBD5E1' }}>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '15px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🏦 Bank Account (InstaPay / PESONet)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                          Bank Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. BDO, BPI, Landbank, DBP"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                          Account Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 001234567890"
                          value={bankAccountNo}
                          onChange={(e) => setBankAccountNo(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Juan Dela Cruz"
                          value={bankAccountName}
                          onChange={(e) => setBankAccountName(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Bank / InstaPay QR Code Image
                        </label>
                        {bankQrUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={getImageUrl(bankQrUrl)} alt="Bank QR" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                            <label style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                              {uploadingBankQr ? 'Uploading...' : 'Change QR Code'}
                              <input type="file" accept="image/*" onChange={handleBankQrUpload} style={{ display: 'none' }} disabled={uploadingBankQr} />
                            </label>
                          </div>
                        ) : (
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: '#F8FAFC', border: '1px dashed #94A3B8', color: '#334155', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            📸 {uploadingBankQr ? 'Uploading QR...' : 'Upload Bank QR Code Image'}
                            <input type="file" accept="image/*" onChange={handleBankQrUpload} style={{ display: 'none' }} disabled={uploadingBankQr} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="profile-form-actions">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary btn-large btn-full profile-save-btn"
                style={{ fontSize: '20px' }}
              >
                {saving ? 'Saving changes…' : '✓ Save Profile Changes'}
              </button>

              {/* Bottom Mobile/Desktop Log Out Button */}
              <button
                type="button"
                className="profile-bottom-logout-btn"
                onClick={() => setShowLogoutModal(true)}
              >
                <span>🚪</span>
                <span>Log Out of AgriConnect</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── Log Out Confirmation Modal ─── */}
      {showLogoutModal && (
        <div
          className="modal-backdrop profile-logout-modal-backdrop"
          onClick={() => setShowLogoutModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="modal-card profile-logout-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>🚪</div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
              Log Out of AgriConnect?
            </h3>
            <p style={{ fontSize: '14.5px', color: '#64748B', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Are you sure you want to end your current session? You will need your login credentials to sign back in.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowLogoutModal(false)}
                style={{ flex: 1, padding: '12px', fontSize: '15px', fontWeight: 700, borderRadius: '10px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn profile-logout-confirm-btn"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '15px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                  cursor: 'pointer',
                }}
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
