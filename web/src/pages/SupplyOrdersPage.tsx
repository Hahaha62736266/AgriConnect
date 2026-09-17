import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useChat } from '../contexts/ChatContext';
import { supplyApi } from '../api/supply';
import { produceApi } from '../api/produce';
import { api, getImageUrl } from '../api';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import type { PaymentMethod, PaymentStatus, SupplyOrder, SupplyOrderStatus } from '../types/supply';
import type { PublicUserProfile } from '../types/auth';

const getSupplyFallback = (name: string = ''): string => {
  const n = name.toLowerCase();
  if (n.includes('urea') || n.includes('fertilizer') || n.includes('14-14-14') || n.includes('complete') || n.includes('potash')) {
    return 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80';
  }
  if (n.includes('seed') || n.includes('binhi') || n.includes('hybrid')) {
    return 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=600&q=80';
  }
  if (n.includes('spray') || n.includes('insecticide') || n.includes('fungicide') || n.includes('herbicide') || n.includes('pest')) {
    return 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=600&q=80';
  }
  if (n.includes('tool') || n.includes('shovel') || n.includes('hoe') || n.includes('rake') || n.includes('bato') || n.includes('tulo')) {
    return 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=600&q=80';
  }
  return 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80';
};

// ── Fulfillment status badge config ─────────────────────────────────────────
const statusBadges: Record<SupplyOrderStatus, { label: string; bg: string; color: string; icon: string }> = {
  pending:       { label: 'Order Placed · Pending Confirmation', bg: '#fef9c3', color: '#854d0e', icon: '📝' },
  quoted:        { label: 'Delivery Fee Quoted · Action Required', bg: '#fef3c7', color: '#92400e', icon: '⚡' },
  processing:    { label: 'Processing in Warehouse',           bg: '#dbeafe', color: '#1e40af', icon: '📦' },
  shipped_ready: { label: 'Shipped / Ready for Pickup',        bg: '#e0e7ff', color: '#3730a3', icon: '🚚' },
  completed:     { label: 'Order Completed & Delivered',       bg: '#dcfce7', color: '#166534', icon: '✓' },
  cancelled:     { label: 'Order Cancelled',                   bg: '#fee2e2', color: '#991b1b', icon: '✕' },
};

// ── Payment status badge config ──────────────────────────────────────────────
const paymentStatusBadges: Record<PaymentStatus, { label: string; bg: string; color: string; icon: string }> = {
  pending_payment:             { label: 'Awaiting Payment',               bg: '#fef9c3', color: '#92400e', icon: '⏳' },
  payment_pending_verification: { label: 'Payment Pending Verification', bg: '#e0f2fe', color: '#0369a1', icon: '🔍' },
  paid:                        { label: 'Paid',                           bg: '#dcfce7', color: '#166534', icon: '✅' },
  failed:                      { label: 'Payment Failed',                 bg: '#fee2e2', color: '#991b1b', icon: '❌' },
  refunded:                    { label: 'Refunded',                       bg: '#f1f5f9', color: '#475569', icon: '↩️' },
};

// ── Payment method display config ────────────────────────────────────────────
const paymentMethodLabels: Record<PaymentMethod, { label: string; icon: string }> = {
  cod:           { label: 'Cash on Delivery (COD)', icon: '💵' },
  gcash:         { label: 'GCash',                  icon: '📱' },
  maya:          { label: 'Maya',                   icon: '💜' },
  bank_transfer: { label: 'Bank Transfer',          icon: '🏦' },
  card:          { label: 'Credit / Debit Card',    icon: '💳' },
};

const STEP_ORDER: SupplyOrderStatus[] = ['pending', 'processing', 'shipped_ready', 'completed'];

export const SupplyOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { openChatWith } = useChat();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  const handleChatOrderParty = async (order: SupplyOrder) => {
    const isSupplier = user?.role === 'supplier';
    const targetUserId = isSupplier ? order.buyerId : order.supplierId;
    if (!targetUserId) {
      toastError('Account Unavailable', 'Contact information is currently unavailable for this user.');
      return;
    }
    const firstItem = order.items?.[0];
    const initialMsg = isSupplier
      ? `Hello ${order.buyerName || 'Customer'}! Thank you for your order #${order.id.slice(-6).toUpperCase()} (₱${order.totalAmount?.toLocaleString()}). Let me know if you have any questions or delivery instructions!`
      : `Hi! Inquiring regarding supply order #${order.id.slice(-6).toUpperCase()} (₱${order.totalAmount?.toLocaleString()}).`;

    await openChatWith(
      targetUserId,
      {
        type: 'supply_order',
        referenceId: order.id,
        title: `Supply Order #${order.id.slice(-6).toUpperCase()} - ${firstItem?.productName || 'Agri Supplies'}`,
        image: firstItem?.productImage ? getImageUrl(firstItem.productImage) : undefined,
        price: order.totalAmount,
      },
      initialMsg
    );
    navigate('/messages');
  };

  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [orderToSetShipping, setOrderToSetShipping] = useState<SupplyOrder | null>(null);
  const [shippingFeeInput, setShippingFeeInput] = useState<number>(0);
  const [shippingFeeDisplay, setShippingFeeDisplay] = useState<string>('0');

  useEffect(() => {
    if (orderToSetShipping) {
      const fee = orderToSetShipping.shippingFee || 0;
      setShippingFeeInput(fee);
      setShippingFeeDisplay(fee === 0 ? '0' : fee.toLocaleString());
    }
  }, [orderToSetShipping]);
  const [orderToCancel, setOrderToCancel] = useState<SupplyOrder | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const [orderToSubmitRef, setOrderToSubmitRef] = useState<SupplyOrder | null>(null);
  const [submittingRefInput, setSubmittingRefInput] = useState('');
  const [isSubmittingRef, setIsSubmittingRef] = useState(false);

  const handleSubmitRefNo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToSubmitRef || !submittingRefInput.trim()) return;

    setIsSubmittingRef(true);
    try {
      const updated = await supplyApi.submitPaymentRef(orderToSubmitRef.id, submittingRefInput.trim());
      toastSuccess('Reference Number Submitted!', 'Your payment reference number has been sent to the seller for verification.');
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setOrderToSubmitRef(null);
      setSubmittingRefInput('');
    } catch (err: any) {
      toastError('Submission Failed', err.response?.data?.error || err.message || 'Failed to submit payment reference.');
    } finally {
      setIsSubmittingRef(false);
    }
  };

  const [modalSupplierProfile, setModalSupplierProfile] = useState<PublicUserProfile | null>(null);
  const [loadingModalProfile, setLoadingModalProfile] = useState(false);
  const [copiedModalText, setCopiedModalText] = useState<string | null>(null);

  const copyModalText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedModalText(label);
    toastSuccess('Copied to Clipboard!', `${label} (${text}) copied to clipboard.`);
    setTimeout(() => setCopiedModalText(null), 2000);
  };

  useEffect(() => {
    if (orderToSubmitRef?.supplierId) {
      setLoadingModalProfile(true);
      api.getUserPublicProfile(orderToSubmitRef.supplierId)
        .then((profile) => setModalSupplierProfile(profile))
        .catch(() => setModalSupplierProfile(null))
        .finally(() => setLoadingModalProfile(false));
    } else {
      setModalSupplierProfile(null);
    }
  }, [orderToSubmitRef]);
  const [supplierProfiles, setSupplierProfiles] = useState<Record<string, PublicUserProfile>>({});

  useEffect(() => {
    if (orders.length > 0) {
      const supplierIds = Array.from(new Set(orders.map((o) => o.supplierId).filter(Boolean)));
      supplierIds.forEach((supId) => {
        if (!supplierProfiles[supId]) {
          api.getUserPublicProfile(supId)
            .then((profile) => {
              setSupplierProfiles((prev) => ({ ...prev, [supId]: profile }));
            })
            .catch(() => {});
        }
      });
    }
  }, [orders]);

  const [produceSalesCount, setProduceSalesCount] = useState<number | null>(null);
  const [producePurchasesCount, setProducePurchasesCount] = useState<number | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await supplyApi.listOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load supply orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    if (user?.role !== 'supplier') {
      produceApi.listTransactions()
        .then((txs) => {
          if (Array.isArray(txs)) {
            if (user?.role === 'farmer') {
              setProduceSalesCount(txs.filter((t) => t.farmerId === user?.id).length);
              setProducePurchasesCount(txs.filter((t) => t.buyerId === user?.id).length);
            } else {
              setProducePurchasesCount(txs.length);
            }
          }
        })
        .catch((err) => console.error('Failed to load produce counts:', err));
    }
  }, [user]);

  const handleUpdateStatus = async (id: string, status: SupplyOrderStatus, shippingFee?: number) => {
    setUpdatingStatusId(id);
    try {
      await supplyApi.updateOrderStatus(id, status, shippingFee);
      toastSuccess('Status Updated', `Order status progressed to ${status.replace('_', ' ')}.`);
      await fetchOrders();
    } catch (err: any) {
      toastError('Update Failed', err.response?.data?.error || 'Failed to update order status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleQuoteDecision = async (orderId: string, action: 'approve' | 'switch_pickup' | 'reject') => {
    setUpdatingStatusId(orderId);
    try {
      await supplyApi.respondToQuote(orderId, action);
      if (action === 'approve') {
        toastSuccess('Quote Approved', 'You approved the delivery fee! The order has been sent to warehouse processing.');
      } else if (action === 'switch_pickup') {
        toastSuccess('Switched to Pickup', 'Order switched to Store Pickup (₱0 fee). Processing in warehouse.');
      } else {
        toastInfo('Order Cancelled', 'Delivery quote declined and order cancelled. Inventory restored.');
      }
      await fetchOrders();
    } catch (err: any) {
      console.error('Failed to respond to quote:', err);
      toastError('Action Failed', err.response?.data?.error || 'Failed to submit quote decision');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;
    setIsCancelling(true);
    try {
      await handleUpdateStatus(orderToCancel.id, 'cancelled');
      setOrderToCancel(null);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleMarkCODPaid = async (orderId: string) => {
    setMarkingPaid(orderId);
    try {
      await supplyApi.updatePaymentStatus(orderId, {
        paymentStatus: 'paid',
        paymentNote: `COD confirmed on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' })}`,
      });
      toastSuccess('Payment Confirmed', 'Cash on Delivery payment has been verified as paid.');
      await fetchOrders();
    } catch (err: any) {
      toastError('Payment Update Failed', err.response?.data?.error || 'Failed to confirm payment');
    } finally {
      setMarkingPaid(null);
    }
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order) => {
    if (filterTab === 'active') {
      return order.status === 'pending' || order.status === 'quoted' || order.status === 'processing' || order.status === 'shipped_ready';
    }
    if (filterTab === 'completed') {
      return order.status === 'completed';
    }
    if (filterTab === 'cancelled') {
      return order.status === 'cancelled';
    }
    return true;
  });

  const activeCount = orders.filter((o) => o.status === 'pending' || o.status === 'quoted' || o.status === 'processing' || o.status === 'shipped_ready').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  const isSupplier = user?.role === 'supplier';
  const isFarmer = user?.role === 'farmer';

  return (
    <div className="app-container" style={{ paddingBottom: '60px' }}>
      {/* ─── Order Category Navigation Switcher ─── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '22px', flexWrap: 'wrap' }}>
        {!isSupplier && (
          <>
            {/* Tab 1: Crop Sales Orders (Farmer) or My Produce Purchases (Buyer) */}
            <button
              type="button"
              onClick={() => navigate('/produce/orders')}
              style={{
                padding: '10px 22px',
                borderRadius: '24px',
                border: '2px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#64748b',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#176B3A';
                e.currentTarget.style.color = '#0E4A27';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <span>{isFarmer ? '🌾 Crop Sales Orders' : '🌱 My Produce Purchases'}</span>
              {(isFarmer ? produceSalesCount : producePurchasesCount) !== null && (
                <span style={{
                  backgroundColor: '#cbd5e1',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}>
                  {isFarmer ? produceSalesCount : producePurchasesCount}
                </span>
              )}
            </button>

            {/* Tab 2: My Crop Purchases — only visible for Farmers */}
            {isFarmer && (
              <button
                type="button"
                onClick={() => navigate('/produce/orders?view=purchases')}
                style={{
                  padding: '10px 22px',
                  borderRadius: '24px',
                  border: '2px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#7C3AED';
                  e.currentTarget.style.color = '#4C1D95';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <span>🛒 My Crop Purchases</span>
                {producePurchasesCount !== null && (
                  <span style={{
                    backgroundColor: '#cbd5e1',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                  }}>
                    {producePurchasesCount}
                  </span>
                )}
              </button>
            )}
          </>
        )}

        {/* Tab 3: My Supply Purchases (active) */}
        <button
          type="button"
          onClick={() => navigate('/supply/orders')}
          style={{
            padding: '10px 22px',
            borderRadius: '24px',
            border: '2px solid #ca8a04',
            backgroundColor: '#FBF6EE',
            color: '#854d0e',
            fontWeight: 800,
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(202, 138, 4, 0.15)',
          }}
        >
          <span>{isSupplier ? '📦 Customer Supply Orders' : '🏪 My Supply Purchases'}</span>
          <span style={{
            backgroundColor: '#ca8a04',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '10px',
          }}>
            {orders.length}
          </span>
        </button>
      </div>

      {/* ─── Page Header ─── */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <span style={{ fontSize: '32px' }}>{isSupplier ? '📦' : '🏪'}</span>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
              {isSupplier ? 'Customer Supply Orders' : 'My Supply Purchases'}
            </h1>
          </div>
          <p style={{ fontSize: '16px', color: '#525450', margin: 0 }}>
            {isSupplier
              ? 'Fulfill incoming fertilizer, seed, and input orders from farmers and buyers, manage packing, and dispatch couriers.'
              : 'Track fertilizers, seeds, tools, and farm equipment ordered from certified suppliers across Northern Mindanao.'}
          </p>
        </div>

        <button
          onClick={() => navigate('/supply')}
          className="btn btn-primary"
          style={{ padding: '10px 20px', fontSize: '15px', fontWeight: 700 }}
        >
          {isSupplier ? 'View Supply Catalog' : '+ Browse Supply Store'}
        </button>
      </div>

      {/* ─── Status Filter Tabs ─── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterTab('all')}
          style={{
            padding: '8px 18px',
            borderRadius: '20px',
            border: `1.5px solid ${filterTab === 'all' ? '#176B3A' : '#e2e8f0'}`,
            backgroundColor: filterTab === 'all' ? '#176B3A' : '#ffffff',
            color: filterTab === 'all' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          All Orders ({orders.length})
        </button>

        <button
          onClick={() => setFilterTab('active')}
          style={{
            padding: '8px 18px',
            borderRadius: '20px',
            border: `1.5px solid ${filterTab === 'active' ? '#ca8a04' : '#e2e8f0'}`,
            backgroundColor: filterTab === 'active' ? '#ca8a04' : '#ffffff',
            color: filterTab === 'active' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Active / In Transit ({activeCount})
        </button>

        <button
          onClick={() => setFilterTab('completed')}
          style={{
            padding: '8px 18px',
            borderRadius: '20px',
            border: `1.5px solid ${filterTab === 'completed' ? '#16a34a' : '#e2e8f0'}`,
            backgroundColor: filterTab === 'completed' ? '#16a34a' : '#ffffff',
            color: filterTab === 'completed' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Completed ({completedCount})
        </button>

        <button
          onClick={() => setFilterTab('cancelled')}
          style={{
            padding: '8px 18px',
            borderRadius: '20px',
            border: `1.5px solid ${filterTab === 'cancelled' ? '#dc2626' : '#e2e8f0'}`,
            backgroundColor: filterTab === 'cancelled' ? '#dc2626' : '#ffffff',
            color: filterTab === 'cancelled' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Cancelled
        </button>
      </div>

      {/* ─── Orders List ─── */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '36px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
          <p style={{ marginTop: '12px', fontSize: '16px', fontWeight: 600 }}>Loading your supply orders…</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '20px' }}>
          <span style={{ fontSize: '56px' }}>📦</span>
          <h3 style={{ marginTop: '16px', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            No {filterTab !== 'all' ? filterTab : ''} supply orders found
          </h3>
          <p style={{ color: '#64748b', fontSize: '15px', maxWidth: '460px', margin: '8px auto 24px' }}>
            When you purchase certified fertilizers, seeds, tools, or farm equipment from certified suppliers, you can track their shipping and delivery live right here.
          </p>
          <button
            onClick={() => navigate('/supply')}
            className="btn btn-primary btn-large"
            style={{ padding: '12px 28px', fontSize: '16px', fontWeight: 800 }}
          >
            Browse Supply Store →
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '22px' }}>
          {filteredOrders.map((order) => {
            const fulfillBadge = statusBadges[order.status] || statusBadges.pending;
            const payBadge = paymentStatusBadges[order.paymentStatus] ?? paymentStatusBadges['pending_payment'];
            const payMethod = paymentMethodLabels[order.paymentMethod] ?? { label: order.paymentMethod, icon: '💳' };
            const isSupplier = user?.id === order.supplierId;
            const isBuyer = user?.id === order.buyerId;

            const isQuoted = order.status === 'quoted';
            const currentStepIdx = isQuoted ? 0 : STEP_ORDER.indexOf(order.status);
            const isCancelled = order.status === 'cancelled';

            const canMarkCODPaid =
              isSupplier &&
              order.paymentMethod === 'cod' &&
              order.paymentStatus === 'pending_payment' &&
              (order.status === 'shipped_ready' || order.status === 'completed');

            const orderDateStr = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString('en-PH', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recently';

            return (
              <div
                key={order.id}
                className="card"
                style={{
                  padding: '24px',
                  borderRadius: '18px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  border: '1.5px solid #e2e8f0',
                }}
              >
                {/* Header Row: ID, Date, Amount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                        Order #{order.id.slice(-6).toUpperCase()}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: '12px',
                        backgroundColor: fulfillBadge.bg,
                        color: fulfillBadge.color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <span>{fulfillBadge.icon}</span>
                        <span>{fulfillBadge.label}</span>
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                      Placed on {orderDateStr} · Supplier: <strong>{order.supplierName}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#ca8a04' }}>
                      ₱{order.totalAmount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                      🚚 {order.deliveryMethod === 'delivery' ? 'Home / Farm Delivery' : 'Store Pickup'}
                    </div>
                  </div>
                </div>

                {/* Live Tracking Progress Bar (Shopee style timeline) */}
                {!isCancelled && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Live Fulfillment Timeline
                      </span>
                      {isQuoted && (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>
                          ⚡ Delivery Fee Quoted · Awaiting Buyer Approval
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                      {[
                        { step: 'pending', title: '1. Order Placed' },
                        { step: 'processing', title: '2. Warehouse Packing' },
                        { step: 'shipped_ready', title: '3. Out for Delivery' },
                        { step: 'completed', title: '4. Delivered & Done' },
                      ].map((s, idx) => {
                        const stepIndex = STEP_ORDER.indexOf(s.step as SupplyOrderStatus);
                        const isDone = currentStepIdx >= stepIndex;
                        const isCurrent = currentStepIdx === stepIndex;
                        const isNextStep = isSupplier && !isCancelled && order.status !== 'completed' && stepIndex === currentStepIdx + 1;

                        const tooltipText = isNextStep
                          ? `Click to advance order to: ${s.title}`
                          : isCurrent
                          ? `Current Status: ${s.title}`
                          : isDone
                          ? `Completed: ${s.title}`
                          : `Locked: Complete previous steps first`;

                        return (
                          <div
                            key={s.step}
                            onClick={() => {
                              if (isNextStep && updatingStatusId !== order.id) {
                                if (s.step === 'processing' && order.deliveryMethod === 'delivery') {
                                  setOrderToSetShipping(order);
                                  setShippingFeeInput(order.shippingFee || 0);
                                } else {
                                  handleUpdateStatus(order.id, s.step as SupplyOrderStatus);
                                }
                              }
                            }}
                            title={tooltipText}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              flex: 1,
                              position: 'relative',
                              zIndex: 2,
                              cursor: isNextStep ? 'pointer' : 'default',
                            }}
                          >
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                backgroundColor: isDone
                                  ? (isCurrent ? '#ca8a04' : '#16a34a')
                                  : isNextStep
                                  ? '#fef3c7'
                                  : '#e2e8f0',
                                color: isDone
                                  ? '#ffffff'
                                  : isNextStep
                                  ? '#ca8a04'
                                  : '#94a3b8',
                                border: isNextStep ? '2px dashed #ca8a04' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '14px',
                                boxShadow: isCurrent
                                  ? '0 0 0 4px rgba(202, 138, 4, 0.25)'
                                  : isNextStep
                                  ? '0 0 0 3px rgba(202, 138, 4, 0.15)'
                                  : 'none',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              {isDone ? (s.step === 'completed' ? '✓' : idx + 1) : idx + 1}
                            </div>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: isCurrent ? 800 : isNextStep ? 700 : 600,
                                color: isCurrent ? '#854d0e' : isDone ? '#166534' : isNextStep ? '#b45309' : '#94a3b8',
                                marginTop: '6px',
                                textAlign: 'center',
                              }}
                            >
                              {s.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Items Breakdown */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', backgroundColor: '#f8fafc', fontSize: '12px', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                    ORDERED ITEMS ({order.items.length})
                  </div>
                  <div style={{ padding: '8px 16px' }}>
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 0',
                          borderBottom: idx < order.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                          fontSize: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '10px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                          >
                            <img
                              src={getImageUrl(item.productImage, getSupplyFallback(item.productName))}
                              alt={item.productName}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                if (target.parentElement) {
                                  target.parentElement.innerHTML = '<span style="font-size: 20px;">📦</span>';
                                }
                              }}
                            />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.productName}</div>
                            <div style={{ color: '#64748b', fontSize: '12.5px', marginTop: '2px' }}>
                              ₱{item.pricePerItem.toLocaleString()} × {item.quantity}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>
                          ₱{(item.quantity * item.pricePerItem).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Financial Breakdown: Subtotal + Delivery Fee = Total */}
                  <div style={{ padding: '12px 16px', backgroundColor: '#fafaf9', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Items Subtotal</span>
                      <span style={{ fontWeight: 600, color: '#334155' }}>
                        ₱{(order.subtotal || (order.totalAmount - (order.shippingFee || 0))).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>
                        Shipping & Hauling Fee
                        {order.deliveryMethod === 'pickup' && <span style={{ color: '#16a34a', fontWeight: 600 }}> (Store Pickup)</span>}
                      </span>
                      <span style={{ fontWeight: 600, color: order.deliveryMethod === 'pickup' ? '#16a34a' : (order.shippingFee ? '#0f172a' : '#d97706') }}>
                        {order.deliveryMethod === 'pickup'
                          ? '₱0 (FREE)'
                          : order.shippingFee !== undefined && order.shippingFee > 0
                          ? `₱${order.shippingFee.toLocaleString()}`
                          : (order.status === 'pending' ? 'Pending Supplier Confirmation' : '₱0 (FREE)')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', fontSize: '15px', fontWeight: 800 }}>
                      <span style={{ color: '#0f172a' }}>Total Amount</span>
                      <span style={{ color: '#ca8a04' }}>₱{order.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Quoted Fee Review Banner */}
                {isQuoted && (
                  <div
                    style={{
                      padding: '16px 20px',
                      borderRadius: '14px',
                      backgroundColor: '#FEF9C3',
                      border: '1.5px solid #FDE047',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>⚡</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#854D0E' }}>
                          Supplier Quoted Delivery Hauling Fee: ₱{(order.shippingFee || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '12px', color: '#A16207', marginTop: '3px' }}>
                          {isBuyer
                            ? `Total order amount is ₱${order.totalAmount.toLocaleString()} (Items: ₱${(order.subtotal || (order.totalAmount - (order.shippingFee || 0))).toLocaleString()} + Delivery: ₱${(order.shippingFee || 0).toLocaleString()}). Please review and approve to begin fulfillment, or switch to store pickup.`
                            : `You quoted a delivery hauling fee of ₱${(order.shippingFee || 0).toLocaleString()}. Waiting for buyer to approve total amount before warehouse packing.`}
                        </div>
                      </div>
                    </div>

                    {isBuyer && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          disabled={updatingStatusId === order.id}
                          onClick={() => handleQuoteDecision(order.id, 'approve')}
                          style={{
                            padding: '9px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#16A34A',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 4px rgba(22,163,74,0.2)',
                          }}
                        >
                          <span>✓</span>
                          <span>Approve Total</span>
                        </button>
                        <button
                          type="button"
                          disabled={updatingStatusId === order.id}
                          onClick={() => handleQuoteDecision(order.id, 'switch_pickup')}
                          style={{
                            padding: '9px 14px',
                            borderRadius: '8px',
                            border: '1.5px solid #2563EB',
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>🏪</span>
                          <span>Switch to Pickup (₱0)</span>
                        </button>
                        <button
                          type="button"
                          disabled={updatingStatusId === order.id}
                          onClick={() => handleQuoteDecision(order.id, 'reject')}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: '1.5px solid #FECACA',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          <span>✕</span>
                          <span>Decline</span>
                        </button>
                      </div>
                    )}

                    {isSupplier && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderToSetShipping(order);
                          setShippingFeeInput(order.shippingFee || 0);
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: '1px solid #D97706',
                          backgroundColor: '#FFFFFF',
                          color: '#B45309',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Adjust Fee
                      </button>
                    )}
                  </div>
                )}

                {/* Delivery & Payment Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', fontSize: '13px' }}>
                  <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>DELIVERY DETAILS</div>
                    <div style={{ color: '#0f172a', fontWeight: 600 }}>
                      Method: {order.deliveryMethod === 'delivery' ? 'Home / Farm Delivery' : 'Store Pickup'}
                    </div>
                    {order.deliveryAddress && (
                      <div style={{ color: '#475569', marginTop: '4px' }}>
                        Address: <strong>{order.deliveryAddress}</strong>
                      </div>
                    )}
                    <div style={{ color: '#475569', marginTop: '2px' }}>
                      Customer / Buyer: <strong>{order.buyerName}</strong> {isBuyer && <span style={{ color: '#ca8a04' }}>(You)</span>}
                    </div>
                  </div>

                  <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>PAYMENT DETAILS</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{payMethod.icon}</span>
                      <strong style={{ color: '#0f172a' }}>{payMethod.label}</strong>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '8px',
                        backgroundColor: payBadge.bg,
                        color: payBadge.color,
                      }}>
                        {payBadge.icon} {payBadge.label}
                      </span>
                    </div>

                    {/* Direct Recipient Info Card on Order Card */}
                    {(() => {
                      const supProf = supplierProfiles[order.supplierId];
                      const isEWallet = order.paymentMethod === 'gcash' || order.paymentMethod === 'maya' || order.paymentMethod === 'bank_transfer';
                      if (!isEWallet) return null;

                      const eWalletNum = order.paymentMethod === 'gcash'
                        ? (supProf?.gcashNumber || supProf?.phone)
                        : order.paymentMethod === 'maya'
                        ? (supProf?.mayaNumber || supProf?.phone)
                        : supProf?.bankAccountNo;
                      const eWalletName = order.paymentMethod === 'gcash'
                        ? (supProf?.gcashName || (supProf?.firstName ? `${supProf.firstName} ${supProf.lastName}` : order.supplierName))
                        : order.paymentMethod === 'maya'
                        ? (supProf?.mayaName || (supProf?.firstName ? `${supProf.firstName} ${supProf.lastName}` : order.supplierName))
                        : (supProf?.bankAccountName || order.supplierName);

                      return (
                        <div style={{ marginTop: '8px', padding: '8px 10px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                            <span>Recipient Name:</span>
                            <strong style={{ color: '#0F172A' }}>{eWalletName}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{order.paymentMethod.toUpperCase()} Number:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284C7', fontSize: '13px' }}>
                                {eWalletNum || 'Contact seller'}
                              </span>
                              {eWalletNum && (
                                <button
                                  type="button"
                                  onClick={() => copyModalText(eWalletNum, `${order.paymentMethod.toUpperCase()} Number`)}
                                  style={{ padding: '2px 6px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', background: '#E0F2FE', color: '#0369A1', border: 'none', cursor: 'pointer' }}
                                >
                                  📋 Copy
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {order.paymentRefNo && (
                      <div style={{ fontSize: '12px', color: '#0369A1', fontWeight: 800, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🧾 Ref No:</span>
                        <span style={{ fontFamily: 'monospace', background: '#E0F2FE', padding: '1px 6px', borderRadius: '4px' }}>#{order.paymentRefNo}</span>
                      </div>
                    )}
                    {order.paymentNote && (
                      <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
                        {order.paymentNote}
                      </div>
                    )}
                    {isBuyer && (order.paymentMethod === 'gcash' || order.paymentMethod === 'maya' || order.paymentMethod === 'bank_transfer') && order.paymentStatus !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderToSubmitRef(order);
                          setSubmittingRefInput(order.paymentRefNo || '');
                        }}
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#0284C7',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <span>📱</span>
                        <span>{order.paymentRefNo ? 'Update Payment Ref No' : 'Submit Payment Ref No'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Action Buttons for Buyer (Farmer) and Supplier */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: '4px' }}>
                  {/* Chat with other party */}
                  {((isSupplier && order.buyerId) || (!isSupplier && order.supplierId)) && (
                    <button
                      type="button"
                      onClick={() => handleChatOrderParty(order)}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '9px',
                        backgroundColor: '#EFFDF5',
                        color: '#0E4A27',
                        fontWeight: 700,
                        fontSize: '13px',
                        border: '1.5px solid #16A34A',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      title={isSupplier ? `Chat with Customer (${order.buyerName})` : `Chat with Supplier (${order.supplierName})`}
                    >
                      <span>💬</span>
                      <span>{isSupplier ? 'Chat Customer' : 'Chat Supplier'}</span>
                    </button>
                  )}

                  {/* Supplier waiting for buyer quote decision */}
                  {isSupplier && isQuoted && (
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#D97706',
                        backgroundColor: '#FEF3C7',
                        padding: '8px 14px',
                        borderRadius: '9px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>⏳</span>
                      <span>Waiting for Buyer Quote Approval</span>
                    </span>
                  )}

                  {/* Buyer waiting for supplier confirmation */}
                  {isBuyer && order.status === 'pending' && (
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#D97706',
                        backgroundColor: '#FEF3C7',
                        padding: '8px 14px',
                        borderRadius: '9px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>⏳</span>
                      <span>Waiting for Supplier Confirmation</span>
                    </span>
                  )}

                  {/* Farmer / Buyer can mark as received when shipped */}
                  {isBuyer && order.status === 'shipped_ready' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'completed')}
                      disabled={updatingStatusId === order.id}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        fontWeight: 800,
                        border: 'none',
                        cursor: updatingStatusId === order.id ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                      }}
                    >
                      {updatingStatusId === order.id ? 'Updating…' : '✓ Confirm Received & Complete Order'}
                    </button>
                  )}

                  {/* Supplier fulfillment workflow actions */}
                  {isSupplier && order.status === 'pending' && (
                    <button
                      onClick={() => {
                        if (order.deliveryMethod === 'delivery') {
                          setOrderToSetShipping(order);
                          setShippingFeeInput(order.shippingFee || 0);
                        } else {
                          handleUpdateStatus(order.id, 'processing');
                        }
                      }}
                      disabled={updatingStatusId === order.id}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '9px',
                        backgroundColor: '#ca8a04',
                        color: '#fff',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      ▶ Start Processing
                    </button>
                  )}

                  {isSupplier && order.status === 'processing' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'shipped_ready')}
                      disabled={updatingStatusId === order.id}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '9px',
                        backgroundColor: '#3730a3',
                        color: '#fff',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      🚚 Mark Shipped / Ready
                    </button>
                  )}

                  {isSupplier && order.status === 'shipped_ready' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'completed')}
                      disabled={updatingStatusId === order.id}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '9px',
                        backgroundColor: '#16a34a',
                        color: '#fff',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      ✓ Mark as Completed
                    </button>
                  )}

                  {/* Supplier COD Confirmation */}
                  {canMarkCODPaid && (
                    <button
                      onClick={() => handleMarkCODPaid(order.id)}
                      disabled={markingPaid === order.id}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '9px',
                        backgroundColor: markingPaid === order.id ? '#a3a3a3' : '#166534',
                        color: '#fff',
                        fontWeight: 700,
                        border: 'none',
                        cursor: markingPaid === order.id ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      💵 {markingPaid === order.id ? 'Confirming…' : 'Confirm COD Payment Received'}
                    </button>
                  )}

                  {/* Cancel Order (Buyer or Supplier can cancel pending/quoted/processing orders) */}
                  {(order.status === 'pending' || isQuoted || (isSupplier && order.status === 'processing')) && (
                    <button
                      onClick={() => setOrderToCancel(order)}
                      disabled={updatingStatusId === order.id}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '9px',
                        border: '1.5px solid #fecaca',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      ✕ Cancel Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Supplier Shipping Fee Confirmation Modal ─── */}
      {orderToSetShipping && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setOrderToSetShipping(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#fef3c7',
                  color: '#ca8a04',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                🚚
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  Set Delivery / Hauling Fee
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                  Order #{orderToSetShipping.id.slice(-6).toUpperCase()} · Buyer: {orderToSetShipping.buyerName}
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '20px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
              }}
            >
              <div style={{ color: '#475569', marginBottom: '6px' }}>
                📍 <strong>Delivery Address:</strong> {orderToSetShipping.deliveryAddress || 'Address on file'}
              </div>
              <div style={{ color: '#64748b', fontSize: '12px', lineHeight: '1.4' }}>
                As the supplier, confirm the freight/hauling cost based on the transport vehicle you coordinated for this delivery. The buyer will review and approve the final total before warehouse fulfillment starts.
              </div>
            </div>

            {/* Quick Vehicle Presets */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quick Vehicle Presets
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Free Delivery', fee: 0, icon: '🎁' },
                  { label: 'Courier / Trike', fee: 150, icon: '🛵' },
                  { label: 'Multicab / Van', fee: 500, icon: '🛻' },
                  { label: 'Light Truck', fee: 1500, icon: '🚚' },
                  { label: 'Elf 6-Wheeler', fee: 3500, icon: '🚛' },
                  { label: 'Heavy Forwarder', fee: 6500, icon: '🏗️' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setShippingFeeInput(preset.fee);
                      setShippingFeeDisplay(preset.fee === 0 ? '0' : preset.fee.toLocaleString());
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: `1.5px solid ${shippingFeeInput === preset.fee ? '#ca8a04' : '#e2e8f0'}`,
                      backgroundColor: shippingFeeInput === preset.fee ? '#fefce8' : '#ffffff',
                      color: shippingFeeInput === preset.fee ? '#854d0e' : '#334155',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>{preset.icon} {preset.label}</div>
                    <div style={{ fontSize: '11px', color: shippingFeeInput === preset.fee ? '#ca8a04' : '#64748b', marginTop: '2px' }}>
                      {preset.fee === 0 ? '₱0' : `₱${preset.fee.toLocaleString()}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Numeric Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Exact Shipping / Hauling Fee (₱)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748b', fontSize: '16px' }}>
                  ₱
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={shippingFeeDisplay}
                  onFocus={(e) => {
                    if (shippingFeeDisplay === '0' || shippingFeeInput === 0) {
                      setShippingFeeDisplay('');
                    } else {
                      e.target.select();
                    }
                  }}
                  onChange={(e) => {
                    const rawDigits = e.target.value.replace(/\D/g, '');
                    if (!rawDigits) {
                      setShippingFeeDisplay('');
                      setShippingFeeInput(0);
                    } else {
                      const num = parseInt(rawDigits, 10);
                      setShippingFeeInput(num);
                      setShippingFeeDisplay(num.toLocaleString());
                    }
                  }}
                  onBlur={() => {
                    if (!shippingFeeDisplay.trim()) {
                      setShippingFeeDisplay('0');
                      setShippingFeeInput(0);
                    } else {
                      setShippingFeeDisplay(shippingFeeInput.toLocaleString());
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 34px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Live Calculation */}
            {(() => {
              const subtotal = orderToSetShipping.subtotal || (orderToSetShipping.totalAmount - (orderToSetShipping.shippingFee || 0));
              const newTotal = subtotal + shippingFeeInput;
              return (
                <div
                  style={{
                    backgroundColor: '#f1f5f9',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    marginBottom: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Items Subtotal:</span>
                    <span style={{ fontWeight: 600 }}>₱{subtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Confirmed Delivery Fee:</span>
                    <span style={{ fontWeight: 700, color: '#ca8a04' }}>₱{shippingFeeInput.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontSize: '15px', fontWeight: 800 }}>
                    <span style={{ color: '#0f172a' }}>Updated Order Total:</span>
                    <span style={{ color: '#0E4A27' }}>₱{newTotal.toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setOrderToSetShipping(null)}
                style={{
                  padding: '11px 20px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingStatusId === orderToSetShipping.id}
                onClick={async () => {
                  const targetOrder = orderToSetShipping;
                  setOrderToSetShipping(null);
                  await handleUpdateStatus(targetOrder.id, 'processing', shippingFeeInput);
                }}
                style={{
                  padding: '11px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#ca8a04',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(202, 138, 4, 0.3)',
                }}
              >
                Send Delivery Quote to Buyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern UI/UX Destructive Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!orderToCancel}
        onClose={() => {
          if (!isCancelling) setOrderToCancel(null);
        }}
        onConfirm={handleConfirmCancelOrder}
        item={
          orderToCancel
            ? {
                id: orderToCancel.id,
                name: `Supply Order #${orderToCancel.id.slice(-6).toUpperCase()}`,
                category: `${orderToCancel.items?.length || 0} items`,
                price: orderToCancel.totalAmount,
                image: orderToCancel.items?.[0]?.productImage,
                typeLabel: 'Supply Order',
              }
            : null
        }
        title="Cancel Supply Order?"
        description="Are you sure you want to cancel this supply order? All reserved inventory will be automatically restored to the store catalog."
        confirmText="Yes, Cancel Order"
        cancelText="Keep Order Active"
        isDeleting={isCancelling}
      />

      {/* Submit Payment Reference Number Modal */}
      {orderToSubmitRef && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📱</span> Submit Payment Ref No
              </h3>
              <button
                type="button"
                onClick={() => setOrderToSubmitRef(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, background: '#F0F9FF', padding: '12px 14px', borderRadius: '10px', border: '1px solid #BAE6FD' }}>
              Order <strong>#{orderToSubmitRef.id.slice(-6).toUpperCase()}</strong> · Total Amount: <strong>₱{orderToSubmitRef.totalAmount.toLocaleString()}</strong><br/>
              Payment Method: <strong>{orderToSubmitRef.paymentMethod.toUpperCase()}</strong> · Supplier: <strong>{orderToSubmitRef.supplierName}</strong>
            </div>

            {/* Seller Payment Recipient Card inside Modal */}
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Recipient Payment Info ({orderToSubmitRef.paymentMethod.toUpperCase()})</span>
                <span style={{ fontSize: '12px', color: '#0284C7', fontWeight: 800 }}>
                  Send: ₱{orderToSubmitRef.totalAmount.toLocaleString()}
                </span>
              </div>

              {loadingModalProfile ? (
                <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>Loading seller account details…</div>
              ) : (
                <>
                  {orderToSubmitRef.paymentMethod === 'gcash' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>GCash Name:</span>
                        <span style={{ color: '#0F172A', fontWeight: 800 }}>
                          {modalSupplierProfile?.gcashName || (modalSupplierProfile?.firstName ? `${modalSupplierProfile.firstName} ${modalSupplierProfile.lastName}` : orderToSubmitRef.supplierName)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>GCash Number:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#0284C7', fontWeight: 800, fontFamily: 'monospace', fontSize: '14px' }}>
                            {modalSupplierProfile?.gcashNumber || modalSupplierProfile?.phone || 'Not configured by seller'}
                          </span>
                          {(modalSupplierProfile?.gcashNumber || modalSupplierProfile?.phone) ? (
                            <button
                              type="button"
                              onClick={() => copyModalText(modalSupplierProfile?.gcashNumber || modalSupplierProfile?.phone || '', 'GCash Number')}
                              style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: '#E0F2FE', color: '#0369A1', border: 'none', cursor: 'pointer' }}
                            >
                              📋 {copiedModalText === 'GCash Number' ? 'Copied!' : 'Copy'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const orderRef = orderToSubmitRef;
                                setOrderToSubmitRef(null);
                                handleChatOrderParty(orderRef);
                              }}
                              style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: '#EFFDF5', color: '#16A34A', border: '1px solid #86EFAC', cursor: 'pointer' }}
                            >
                              💬 Chat Seller for Details
                            </button>
                          )}
                        </div>
                      </div>
                      {modalSupplierProfile?.gcashQrUrl && (
                        <div style={{ marginTop: '6px', textAlign: 'center', background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284C7', marginBottom: '4px' }}>Scan QR Code with GCash App:</div>
                          <img src={getImageUrl(modalSupplierProfile.gcashQrUrl)} alt="GCash QR Code" style={{ maxWidth: '160px', maxHeight: '160px', borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                        </div>
                      )}
                    </div>
                  )}

                  {orderToSubmitRef.paymentMethod === 'maya' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Maya Name:</span>
                        <span style={{ color: '#0F172A', fontWeight: 800 }}>
                          {modalSupplierProfile?.mayaName || (modalSupplierProfile?.firstName ? `${modalSupplierProfile.firstName} ${modalSupplierProfile.lastName}` : orderToSubmitRef.supplierName)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Maya Number:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#7C3AED', fontWeight: 800, fontFamily: 'monospace', fontSize: '14px' }}>
                            {modalSupplierProfile?.mayaNumber || modalSupplierProfile?.phone || 'Not configured by seller'}
                          </span>
                          {(modalSupplierProfile?.mayaNumber || modalSupplierProfile?.phone) ? (
                            <button
                              type="button"
                              onClick={() => copyModalText(modalSupplierProfile?.mayaNumber || modalSupplierProfile?.phone || '', 'Maya Number')}
                              style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: '#F3E8FF', color: '#6D28D9', border: 'none', cursor: 'pointer' }}
                            >
                              📋 {copiedModalText === 'Maya Number' ? 'Copied!' : 'Copy'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const orderRef = orderToSubmitRef;
                                setOrderToSubmitRef(null);
                                handleChatOrderParty(orderRef);
                              }}
                              style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: '#EFFDF5', color: '#16A34A', border: '1px solid #86EFAC', cursor: 'pointer' }}
                            >
                              💬 Chat Seller for Details
                            </button>
                          )}
                        </div>
                      </div>
                      {modalSupplierProfile?.mayaQrUrl && (
                        <div style={{ marginTop: '6px', textAlign: 'center', background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#6D28D9', marginBottom: '4px' }}>Scan QR Code with Maya App:</div>
                          <img src={getImageUrl(modalSupplierProfile.mayaQrUrl)} alt="Maya QR Code" style={{ maxWidth: '160px', maxHeight: '160px', borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                        </div>
                      )}
                    </div>
                  )}

                  {orderToSubmitRef.paymentMethod === 'bank_transfer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Bank Name:</span>
                        <span style={{ color: '#0F172A', fontWeight: 800 }}>{modalSupplierProfile?.bankName || 'BDO / BPI / Landbank'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Account Name:</span>
                        <span style={{ color: '#0F172A', fontWeight: 800 }}>
                          {modalSupplierProfile?.bankAccountName || (modalSupplierProfile?.firstName ? `${modalSupplierProfile.firstName} ${modalSupplierProfile.lastName}` : orderToSubmitRef.supplierName)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Account Number:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#0F172A', fontWeight: 800, fontFamily: 'monospace', fontSize: '14px' }}>
                            {modalSupplierProfile?.bankAccountNo || 'Contact seller'}
                          </span>
                          {modalSupplierProfile?.bankAccountNo && (
                            <button
                              type="button"
                              onClick={() => copyModalText(modalSupplierProfile?.bankAccountNo || '', 'Account Number')}
                              style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: '#E2E8F0', color: '#334155', border: 'none', cursor: 'pointer' }}
                            >
                              📋 {copiedModalText === 'Account Number' ? 'Copied!' : 'Copy'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <form onSubmit={handleSubmitRefNo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  Transaction Reference Number *
                </label>
                <input
                  type="text"
                  required
                  value={submittingRefInput}
                  onChange={(e) => setSubmittingRefInput(e.target.value)}
                  placeholder="e.g. 1029384756123 (13 digits)"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #0284C7',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0C4A6E',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                  Paste the 13-digit transaction reference number from your GCash, Maya, or Bank receipt.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setOrderToSubmitRef(null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRef || !submittingRefInput.trim()}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0284C7',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingRef ? 'Submitting…' : 'Submit Reference Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
