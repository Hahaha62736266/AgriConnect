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
  pending: { label: 'Order Placed · Pending Confirmation', bg: '#fef9c3', color: '#854d0e', icon: '📝' },
  quoted: { label: 'Delivery Fee Quoted · Action Required', bg: '#fef3c7', color: '#92400e', icon: '⚡' },
  processing: { label: 'Processing in Warehouse', bg: '#dbeafe', color: '#1e40af', icon: '📦' },
  shipped_ready: { label: 'Shipped / Ready for Pickup', bg: '#e0e7ff', color: '#3730a3', icon: '🚚' },
  completed: { label: 'Order Completed & Delivered', bg: '#dcfce7', color: '#166534', icon: '✓' },
  cancelled: { label: 'Order Cancelled', bg: '#fee2e2', color: '#991b1b', icon: '✕' },
};

// ── Payment status badge config ──────────────────────────────────────────────
const paymentStatusBadges: Record<PaymentStatus, { label: string; bg: string; color: string; icon: string }> = {
  pending_payment: { label: 'Awaiting Payment', bg: '#fef9c3', color: '#92400e', icon: '⏳' },
  payment_pending_verification: { label: 'Payment Pending Verification', bg: '#e0f2fe', color: '#0369a1', icon: '🔍' },
  paid: { label: 'Paid', bg: '#dcfce7', color: '#166534', icon: '✅' },
  failed: { label: 'Payment Failed', bg: '#fee2e2', color: '#991b1b', icon: '❌' },
  refunded: { label: 'Refunded', bg: '#f1f5f9', color: '#475569', icon: '↩️' },
};

// ── Payment method display config ────────────────────────────────────────────
const paymentMethodLabels: Record<PaymentMethod, { label: string; icon: string }> = {
  cod: { label: 'Cash on Delivery (COD)', icon: '💵' },
  gcash: { label: 'GCash', icon: '📱' },
  maya: { label: 'Maya', icon: '💜' },
  bank_transfer: { label: 'Bank Transfer', icon: '🏦' },
  card: { label: 'Credit / Debit Card', icon: '💳' },
};

const STEP_ORDER: SupplyOrderStatus[] = ['pending', 'processing', 'shipped_ready', 'completed'];

export const SupplyOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { openChatWith } = useChat();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError, warning: toastWarning, info: toastInfo } = useToast();

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
  const [filterTab, setFilterTab] = useState<'all' | 'to_pay' | 'pending' | 'quoted' | 'processing' | 'active' | 'completed' | 'cancelled'>('all');

  const handleConfirmDigitalPayment = async (orderId: string) => {
    const prevOrders = orders;
    // Optimistic update: mark as paid immediately
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'paid' } : o))
    );

    setMarkingPaid(orderId);
    try {
      await supplyApi.updatePaymentStatus(orderId, {
        paymentStatus: 'paid',
        paymentNote: `Payment verified & confirmed by supplier on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' })}`,
      });
      toastSuccess('Payment Verified! 🎉', 'You confirmed receipt of the digital transfer for this order.');
      await fetchOrders();
    } catch (err: any) {
      // Rollback on failure
      setOrders(prevOrders);
      toastError('Payment Verification Failed', err.response?.data?.error || 'Failed to verify payment');
    } finally {
      setMarkingPaid(null);
    }
  };
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
  const [submittingProofUrl, setSubmittingProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [isSubmittingRef, setIsSubmittingRef] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toastError('Invalid File', 'Please select an image file (PNG, JPG, JPEG).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toastError('File Too Large', 'Please upload a receipt screenshot under 10MB.');
      return;
    }

    setUploadingProof(true);
    try {
      const res = await api.uploadImage(file);
      setSubmittingProofUrl(res.url);
      toastSuccess('Receipt Uploaded!', 'Payment receipt screenshot attached successfully.');
    } catch (err: any) {
      toastError('Upload Failed', err.response?.data?.error || 'Failed to upload receipt screenshot.');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmitRefNo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToSubmitRef || !submittingRefInput.trim()) return;

    if (!submittingProofUrl) {
      toastWarning('Receipt Required', 'Please upload a photo or screenshot of your payment receipt.');
      return;
    }

    const currentOrder = orderToSubmitRef;
    const refNo = submittingRefInput.trim();
    const proofUrl = submittingProofUrl;
    const prevOrders = orders;

    // Optimistic Update: close modal and update order card immediately
    setOrders((prev) =>
      prev.map((o) =>
        o.id === currentOrder.id
          ? {
            ...o,
            paymentRefNo: refNo,
            paymentProofUrl: proofUrl,
            paymentStatus: 'payment_pending_verification',
          }
          : o
      )
    );
    setOrderToSubmitRef(null);
    setSubmittingRefInput('');
    setSubmittingProofUrl('');

    setIsSubmittingRef(true);
    try {
      const updated = await supplyApi.submitPaymentRef(
        currentOrder.id,
        refNo,
        proofUrl
      );
      toastSuccess('Reference Number & Proof Submitted! 🎉', 'Your payment reference and receipt proof have been sent to the seller for verification.');
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err: any) {
      // Rollback on failure
      setOrders(prevOrders);
      setOrderToSubmitRef(currentOrder);
      setSubmittingRefInput(refNo);
      setSubmittingProofUrl(proofUrl);
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
      api.getUserPublicProfile(orderToSubmitRef.supplierId, true)
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
            .catch(() => { });
        }
      });
    }
  }, [orders]);

  const [produceSalesCount, setProduceSalesCount] = useState<number | null>(null);
  const [producePurchasesCount, setProducePurchasesCount] = useState<number | null>(null);

  const fetchOrders = async (isSilent: boolean = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await supplyApi.listOrders();
      setOrders(data);
      if (orderToSubmitRef) {
        const updated = data.find((o) => o.id === orderToSubmitRef.id);
        if (updated) setOrderToSubmitRef(updated);
      }
    } catch (err) {
      console.error('Failed to load supply orders:', err);
    } finally {
      if (!isSilent) setLoading(false);
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

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders(true);
      }
    };

    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchOrders(true);
      }
    }, 4000);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user]);

  const handleUpdateStatus = async (id: string, status: SupplyOrderStatus, shippingFee?: number) => {
    const target = orders.find((o) => o.id === id);
    if (!target) return;

    const prevOrders = orders;
    const isQuoting = shippingFee !== undefined && shippingFee > 0;
    const fee = shippingFee !== undefined ? shippingFee : (target.shippingFee || 0);
    const sub = target.subtotal ?? (target.totalAmount - (target.shippingFee || 0));
    const total = sub + fee;

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
            ...o,
            status: isQuoting ? 'quoted' : status,
            shippingFee: fee,
            totalAmount: total,
          }
          : o
      )
    );

    setUpdatingStatusId(id);
    try {
      await supplyApi.updateOrderStatus(id, status, shippingFee);
      toastSuccess('Status Updated', `Order status progressed to ${status.replace('_', ' ')}.`);
      await fetchOrders();
    } catch (err: any) {
      // Rollback on failure
      setOrders(prevOrders);
      toastError('Update Failed', err.response?.data?.error || 'Failed to update order status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleQuoteDecision = async (orderId: string, action: 'approve' | 'switch_pickup' | 'reject') => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const prevOrders = orders;
    let optStatus: SupplyOrderStatus = 'processing';
    let optMethod = target.deliveryMethod;
    let optFee = target.shippingFee;
    let optTotal = target.totalAmount;
    const sub = target.subtotal ?? (target.totalAmount - (target.shippingFee || 0));

    if (action === 'approve') {
      optStatus = 'processing';
    } else if (action === 'switch_pickup') {
      optStatus = 'processing';
      optMethod = 'pickup';
      optFee = 0;
      optTotal = sub;
    } else {
      optStatus = 'cancelled';
    }

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
            ...o,
            status: optStatus,
            deliveryMethod: optMethod,
            shippingFee: optFee,
            totalAmount: optTotal,
          }
          : o
      )
    );

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
      // Rollback on failure
      setOrders(prevOrders);
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
    const prevOrders = orders;
    // Optimistic update: mark as paid immediately
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'paid' } : o))
    );

    setMarkingPaid(orderId);
    try {
      await supplyApi.updatePaymentStatus(orderId, {
        paymentStatus: 'paid',
        paymentNote: `COD confirmed on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' })}`,
      });
      toastSuccess('Payment Confirmed', 'Cash on Delivery payment has been verified as paid.');
      await fetchOrders();
    } catch (err: any) {
      // Rollback on failure
      setOrders(prevOrders);
      toastError('Payment Update Failed', err.response?.data?.error || 'Failed to confirm payment');
    } finally {
      setMarkingPaid(null);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  // Top KPI Metrics
  const activePendingCount = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'completed' && (o.status === 'pending' || (o.paymentMethod !== 'cod' && o.paymentStatus !== 'paid' && !o.paymentRefNo))).length;
  const activeConfirmedCount = orders.filter((o) => o.status === 'processing' || o.status === 'quoted' || o.status === 'shipped_ready').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const totalSpent = orders
    .filter((o) => o.status === 'completed' || o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Status counts (To Pay: Non-COD orders that are not paid yet AND customer has not submitted ref no yet, excluding cancelled, completed, and unquoted pending delivery)
  const toPayCount = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'completed' && !(o.deliveryMethod === 'delivery' && o.status === 'pending') && o.paymentMethod !== 'cod' && o.paymentStatus !== 'paid' && !o.paymentRefNo).length;
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const quotedCount = orders.filter((o) => o.status === 'quoted').length;
  const processingCount = orders.filter((o) => o.status === 'processing' || o.status === 'shipped_ready').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  // Filter orders based on active tab & search query
  const filteredOrders = orders.filter((order) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchSupplier = order.supplierName?.toLowerCase().includes(q);
      const matchBuyer = order.buyerName?.toLowerCase().includes(q);
      const matchItems = order.items?.some((i) => i.productName.toLowerCase().includes(q));
      if (!matchId && !matchSupplier && !matchBuyer && !matchItems) {
        return false;
      }
    }

    if (filterTab === 'to_pay') return order.status !== 'cancelled' && order.status !== 'completed' && !(order.deliveryMethod === 'delivery' && order.status === 'pending') && order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid' && !order.paymentRefNo;
    if (filterTab === 'pending') return order.status === 'pending';
    if (filterTab === 'quoted') return order.status === 'quoted';
    if (filterTab === 'processing') return order.status === 'processing' || order.status === 'shipped_ready';
    if (filterTab === 'completed') return order.status === 'completed';
    if (filterTab === 'cancelled') return order.status === 'cancelled';
    if (filterTab === 'active') return order.status === 'pending' || order.status === 'quoted' || order.status === 'processing' || order.status === 'shipped_ready';

    return true;
  });

  const isSupplier = user?.role === 'supplier';
  const isFarmer = user?.role === 'farmer';

  return (
    <div className="app-container" style={{ paddingBottom: '60px' }}>
      {/* ─── Order Category Navigation Switcher ─── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '22px', flexWrap: 'wrap' }}>
        {!isSupplier && (
          <>
            {/* Tab 1: Crop Sales Orders (Farmer) or Farm Purchases (Buyer) */}
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
              <span>{isFarmer ? '🌾 Crop Sales Orders' : '🌱 Farm Purchases'}</span>
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

        {/* Tab 3: Agri Supply Purchases (active) */}
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
          <span>{isSupplier ? '📦 Customer Supply Orders' : '🏪 Agri Supply Purchases'}</span>
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
              {isSupplier ? 'Customer Supply Orders' : 'Agri Supply Purchases'}
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

      {/* ─── Top KPI Metric Summary Cards ─── */}
      <div
        className="orders-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div
          className="orders-kpi-card"
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div className="orders-kpi-icon" style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
            📋
          </div>
          <div className="orders-kpi-info" style={{ minWidth: 0, flex: 1 }}>
            <div className="orders-kpi-label" style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Orders</div>
            <div className="orders-kpi-value" style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>{orders.length}</div>
          </div>
        </div>

        <div
          className="orders-kpi-card"
          style={{
            background: activePendingCount > 0 ? '#FEFCE8' : '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: `1.5px solid ${activePendingCount > 0 ? '#FDE047' : '#E2E8F0'}`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div className="orders-kpi-icon" style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
            ⏳
          </div>
          <div className="orders-kpi-info" style={{ minWidth: 0, flex: 1 }}>
            <div className="orders-kpi-label" style={{ fontSize: '13px', fontWeight: 700, color: activePendingCount > 0 ? '#A16207' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pending Action
            </div>
            <div className="orders-kpi-value" style={{ fontSize: '26px', fontWeight: 800, color: activePendingCount > 0 ? '#A16207' : '#0F172A' }}>
              {activePendingCount}
            </div>
          </div>
        </div>

        <div
          className="orders-kpi-card"
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div className="orders-kpi-icon" style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
            🚚
          </div>
          <div className="orders-kpi-info" style={{ minWidth: 0, flex: 1 }}>
            <div className="orders-kpi-label" style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Deliveries</div>
            <div className="orders-kpi-value" style={{ fontSize: '26px', fontWeight: 800, color: '#1E40AF' }}>{activeConfirmedCount}</div>
          </div>
        </div>

        <div
          className="orders-kpi-card"
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div className="orders-kpi-icon" style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
            💰
          </div>
          <div className="orders-kpi-info" style={{ minWidth: 0, flex: 1 }}>
            <div className="orders-kpi-label" style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isSupplier ? 'Sales Revenue' : 'Fulfilled Volume'}
            </div>
            <div className="orders-kpi-value" style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27' }}>₱{totalSpent.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ─── Search & Status Filters Bar ─── */}
      <div
        className="orders-filter-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: '16px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'all', label: 'All Orders', count: orders.length },
            { id: 'pending', label: 'Pending', count: pendingCount },
            { id: 'quoted', label: 'Quoted', count: quotedCount },
            ...(!isSupplier ? [{ id: 'to_pay', label: '💳 To Pay', count: toPayCount }] : []),
            { id: 'processing', label: 'Processing / Shipped', count: processingCount },
            { id: 'completed', label: 'Completed', count: completedCount },
            { id: 'cancelled', label: 'Cancelled', count: cancelledCount },
          ].map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: isActive ? '#0E4A27' : '#F1F5F9',
                  color: isActive ? '#FFFFFF' : '#475569',
                  fontWeight: isActive ? 800 : 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                    color: isActive ? '#FFFFFF' : '#64748B',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '8px',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#94A3B8' }}>
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search item, supplier, or order ID..."
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '10px',
              border: '1.5px solid #CBD5E1',
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              boxSizing: 'border-box',
              backgroundColor: '#FAFAFA',
            }}
          />
        </div>
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
                    {order.paymentProofUrl && (
                      <div style={{ marginTop: '4px' }}>
                        <a
                          href={getImageUrl(order.paymentProofUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '11.5px',
                            color: '#0284c7',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#F0F9FF',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #BAE6FD',
                            textDecoration: 'none',
                          }}
                        >
                          📸 View Payment Receipt Proof
                        </a>
                      </div>
                    )}
                    {order.paymentNote && (
                      <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
                        {order.paymentNote}
                      </div>
                    )}
                    {isBuyer && (order.paymentMethod === 'gcash' || order.paymentMethod === 'maya' || order.paymentMethod === 'bank_transfer') && order.paymentStatus !== 'paid' && order.status !== 'cancelled' && order.status !== 'completed' && (
                      !(order.deliveryMethod === 'delivery' && order.status === 'pending') || Boolean(order.paymentRefNo || order.paymentProofUrl) ? (
                        <button
                          type="button"
                          onClick={() => {
                            setOrderToSubmitRef(order);
                            setSubmittingRefInput(order.paymentRefNo || '');
                            setSubmittingProofUrl(order.paymentProofUrl || '');
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
                          <span>{order.paymentRefNo || order.paymentProofUrl ? 'Update Payment Ref / Proof' : 'Submit Payment Ref / Proof'}</span>
                        </button>
                      ) : (
                        <div style={{ fontSize: '11.5px', color: '#D97706', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span>⏳</span>
                          <span>Awaiting seller to quote delivery fee before payment</span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Action Buttons for Buyer (Farmer) and Supplier */}
                <div className="order-action-buttons" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: '4px' }}>
                  {/* Secondary Utility Actions (Chat & Cancel) - sits on left on desktop, row 2 on mobile */}
                  <div className="order-actions-secondary-row">
                    {/* Chat with other party */}
                    {((isSupplier && order.buyerId) || (!isSupplier && order.supplierId)) && (
                      <button
                        type="button"
                        className="order-chat-btn"
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

                    {/* Cancel Order (Disabled for paid transactions; allowed for COD or unpaid orders) */}
                    {order.paymentStatus !== 'paid' && (order.status === 'pending' || isQuoted || (isSupplier && order.status === 'processing')) && (
                      <button
                        type="button"
                        className="order-cancel-btn"
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

                  {/* Primary Workflow Actions (Fulfillment / Stage Progression) - sits on right on desktop, row 1 on mobile */}
                  {(
                    (isSupplier && isQuoted) ||
                    (isBuyer && order.status === 'pending') ||
                    (isBuyer && order.status === 'shipped_ready') ||
                    (isSupplier && (order.status === 'pending' || order.status === 'processing' || order.status === 'shipped_ready')) ||
                    canMarkCODPaid ||
                    (isSupplier && (order.paymentMethod === 'gcash' || order.paymentMethod === 'maya' || order.paymentMethod === 'bank_transfer') && Boolean(order.paymentRefNo && order.paymentProofUrl) && order.paymentStatus !== 'paid' && order.status !== 'cancelled' && order.status !== 'completed')
                  ) && (
                    <div className="order-actions-primary-row">
                      {/* Supplier waiting for buyer quote decision */}
                      {isSupplier && isQuoted && (
                        <span
                          className="order-status-waiting"
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
                          className="order-status-waiting"
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
                          className="order-primary-btn"
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
                          className="order-primary-btn"
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
                          className="order-primary-btn"
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
                          className="order-primary-btn"
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
                          className="order-primary-btn"
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

                      {/* Supplier Digital Payment Verification */}
                      {isSupplier &&
                        (order.paymentMethod === 'gcash' || order.paymentMethod === 'maya' || order.paymentMethod === 'bank_transfer') &&
                        Boolean(order.paymentRefNo && order.paymentProofUrl) &&
                        order.paymentStatus !== 'paid' &&
                        order.status !== 'cancelled' &&
                        order.status !== 'completed' && (
                          <button
                            className="order-primary-btn"
                            type="button"
                            onClick={() => handleConfirmDigitalPayment(order.id)}
                            disabled={markingPaid === order.id}
                            style={{
                              padding: '9px 18px',
                              borderRadius: '9px',
                              backgroundColor: markingPaid === order.id ? '#94A3B8' : '#16A34A',
                              color: '#FFFFFF',
                              fontWeight: 800,
                              border: 'none',
                              cursor: markingPaid === order.id ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: markingPaid === order.id ? 'none' : '0 2px 8px rgba(22, 163, 74, 0.3)',
                            }}
                          >
                            <span>✅</span>
                            <span>{markingPaid === order.id ? 'Verifying…' : 'Verify & Confirm Payment Received'}</span>
                          </button>
                        )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Set Delivery / Hauling Fee Modal (Supplier Quote) */}
      {orderToSetShipping && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setOrderToSetShipping(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '26px 28px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    backgroundColor: '#FEF3C7',
                    color: '#D97706',
                    fontSize: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.15)',
                  }}
                >
                  🚚
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0F172A' }}>
                    Set Delivery / Hauling Fee
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                    Order <strong>#{orderToSetShipping.id.slice(-6).toUpperCase()}</strong> · Buyer: <strong>{orderToSetShipping.buyerName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderToSetShipping(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '16px',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Delivery Address & Instructions Box */}
            <div
              style={{
                backgroundColor: '#FFFBEB',
                borderRadius: '14px',
                padding: '14px 16px',
                border: '1px solid #FDE68A',
                fontSize: '13px',
              }}
            >
              <div style={{ color: '#92400E', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📍 Delivery Address:</span>
                <span style={{ color: '#78350F' }}>{orderToSetShipping.deliveryAddress || 'Address on file'}</span>
              </div>
              <div style={{ color: '#B45309', fontSize: '12px', lineHeight: '1.45' }}>
                As the supplier, enter the freight/hauling cost based on the transport vehicle for this delivery. The buyer will review and approve the updated total before shipment.
              </div>
            </div>

            {/* Quick Vehicle Presets */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                ].map((preset) => {
                  const isSelected = shippingFeeInput === preset.fee;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setShippingFeeInput(preset.fee);
                        setShippingFeeDisplay(preset.fee === 0 ? '0' : preset.fee.toLocaleString());
                      }}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #D97706' : '1.5px solid #E2E8F0',
                        backgroundColor: isSelected ? '#FEFCE8' : '#FFFFFF',
                        color: isSelected ? '#92400E' : '#334155',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(217, 119, 6, 0.18)' : 'none',
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{preset.icon} {preset.label}</div>
                      <div style={{ fontSize: '11.5px', fontWeight: 900, color: isSelected ? '#D97706' : '#64748B', marginTop: '3px' }}>
                        {preset.fee === 0 ? '₱0 (Free)' : `₱${preset.fee.toLocaleString()}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Numeric Input */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                Exact Shipping / Hauling Fee (₱)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#B45309', fontSize: '16px' }}>
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
                    border: '1.5px solid #D97706',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Live Order Cost Summary */}
            {(() => {
              const subtotal = orderToSetShipping.subtotal || (orderToSetShipping.totalAmount - (orderToSetShipping.shippingFee || 0));
              const newTotal = subtotal + shippingFeeInput;
              return (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                    <span>Items Subtotal:</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>₱{subtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                    <span>Confirmed Delivery Fee:</span>
                    <span style={{ fontWeight: 800, color: '#D97706' }}>
                      {shippingFeeInput === 0 ? '₱0 (Free Delivery)' : `₱${shippingFeeInput.toLocaleString()}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '8px', fontSize: '15.5px', fontWeight: 900 }}>
                    <span style={{ color: '#0F172A' }}>Updated Order Total:</span>
                    <span style={{ color: '#16A34A' }}>₱{newTotal.toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setOrderToSetShipping(null)}
                style={{
                  padding: '11px 18px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13.5px',
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
                  padding: '11px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                  color: '#FFFFFF',
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

      {/* Submit Payment Reference Number & Proof Modal */}
      {orderToSubmitRef && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            maxWidth: '480px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📱</span> Payment Verification
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Submit your payment reference & attach receipt photo for faster seller verification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrderToSubmitRef(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '16px',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Order Summary Banner */}
            <div style={{
              fontSize: '13px',
              color: '#1E293B',
              lineHeight: 1.5,
              background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
              padding: '14px 16px',
              borderRadius: '14px',
              border: '1px solid #BAE6FD',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#0369A1' }}>
                  Order #{orderToSubmitRef.id.slice(-6).toUpperCase()}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#16A34A' }}>
                  ₱{orderToSubmitRef.totalAmount.toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                Supplier: <strong>{orderToSubmitRef.supplierName}</strong> • Method: <strong style={{ textTransform: 'uppercase' }}>{orderToSubmitRef.paymentMethod}</strong>
              </div>
            </div>

            {/* Seller Payment Recipient Details Card */}
            <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Recipient Details ({orderToSubmitRef.paymentMethod.toUpperCase()})</span>
                <span style={{ fontSize: '11.5px', color: '#16A34A', fontWeight: 800, background: '#DCFCE7', padding: '2px 8px', borderRadius: '10px' }}>
                  Send Total: ₱{orderToSubmitRef.totalAmount.toLocaleString()}
                </span>
              </div>

              {loadingModalProfile ? (
                <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>Loading seller account details…</div>
              ) : (
                <>
                  {orderToSubmitRef.paymentMethod === 'gcash' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      {!modalSupplierProfile?.gcashNumber && !modalSupplierProfile?.gcashQrUrl && (
                        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '10px 12px', marginBottom: '4px' }}>
                          <div style={{ fontWeight: 800, color: '#92400E', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            ⚠️ Seller Has Not Configured GCash
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#78350F', lineHeight: 1.4, marginBottom: '6px' }}>
                            This seller hasn't set up GCash yet. You can transfer using their alternate accounts below, or chat with them directly:
                          </div>
                          {(modalSupplierProfile?.mayaNumber || modalSupplierProfile?.phone) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #FDE68A', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>
                                💜 Maya: {modalSupplierProfile.mayaNumber || modalSupplierProfile.phone}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyModalText(modalSupplierProfile.mayaNumber || modalSupplierProfile.phone || '', 'Maya Number')}
                                style={{ padding: '2px 8px', fontSize: '10.5px', fontWeight: 700, borderRadius: '4px', background: '#F3E8FF', color: '#6D28D9', border: 'none', cursor: 'pointer' }}
                              >
                                📋 {copiedModalText === 'Maya Number' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          )}
                          {modalSupplierProfile?.bankAccountNo && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #FDE68A', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>
                                🏦 {modalSupplierProfile.bankName || 'Bank'}: {modalSupplierProfile.bankAccountNo}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyModalText(modalSupplierProfile.bankAccountNo || '', 'Bank Account')}
                                style={{ padding: '2px 8px', fontSize: '10.5px', fontWeight: 700, borderRadius: '4px', background: '#E2E8F0', color: '#334155', border: 'none', cursor: 'pointer' }}
                              >
                                📋 {copiedModalText === 'Bank Account' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>GCash Name:</span>
                        <span style={{ color: '#0F172A', fontWeight: 800 }}>
                          {modalSupplierProfile?.gcashName || (modalSupplierProfile?.firstName ? `${modalSupplierProfile.firstName} ${modalSupplierProfile.lastName}` : orderToSubmitRef.supplierName)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>GCash Number:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#0284C7', fontWeight: 800, fontFamily: 'monospace', fontSize: '15px' }}>
                            {modalSupplierProfile?.gcashNumber || modalSupplierProfile?.phone || 'Not configured by seller'}
                          </span>
                          {(modalSupplierProfile?.gcashNumber || modalSupplierProfile?.phone) ? (
                            <button
                              type="button"
                              onClick={() => copyModalText(modalSupplierProfile?.gcashNumber || modalSupplierProfile?.phone || '', 'GCash Number')}
                              style={{ padding: '3px 9px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: '#E0F2FE', color: '#0284C7', border: 'none', cursor: 'pointer' }}
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
                        <div style={{ marginTop: '6px', textAlign: 'center', background: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1.5px dashed #BAE6FD' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284C7', marginBottom: '6px' }}>Scan QR Code with GCash App:</div>
                          <img src={getImageUrl(modalSupplierProfile.gcashQrUrl)} alt="GCash QR Code" style={{ maxWidth: '170px', maxHeight: '170px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} />
                        </div>
                      )}
                    </div>
                  )}

                  {orderToSubmitRef.paymentMethod === 'maya' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      {!modalSupplierProfile?.mayaNumber && !modalSupplierProfile?.mayaQrUrl && (
                        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '10px 12px', marginBottom: '4px' }}>
                          <div style={{ fontWeight: 800, color: '#92400E', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            ⚠️ Seller Has Not Configured Maya
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#78350F', lineHeight: 1.4, marginBottom: '6px' }}>
                            This seller hasn't set up Maya yet. You can transfer using their alternate accounts below, scan their QRPh code, or chat with them directly:
                          </div>
                          {(modalSupplierProfile?.gcashNumber || modalSupplierProfile?.phone) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #FDE68A', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>
                                📱 GCash: {modalSupplierProfile.gcashNumber || modalSupplierProfile.phone}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyModalText(modalSupplierProfile.gcashNumber || modalSupplierProfile.phone || '', 'GCash Number')}
                                style={{ padding: '2px 8px', fontSize: '10.5px', fontWeight: 700, borderRadius: '4px', background: '#E0F2FE', color: '#0284C7', border: 'none', cursor: 'pointer' }}
                              >
                                📋 {copiedModalText === 'GCash Number' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          )}
                          {modalSupplierProfile?.bankAccountNo && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #FDE68A', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>
                                🏦 {modalSupplierProfile.bankName || 'Bank'}: {modalSupplierProfile.bankAccountNo}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyModalText(modalSupplierProfile.bankAccountNo || '', 'Bank Account')}
                                style={{ padding: '2px 8px', fontSize: '10.5px', fontWeight: 700, borderRadius: '4px', background: '#E2E8F0', color: '#334155', border: 'none', cursor: 'pointer' }}
                              >
                                📋 {copiedModalText === 'Bank Account' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          )}
                          <div style={{ marginTop: '6px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const orderRef = orderToSubmitRef;
                                setOrderToSubmitRef(null);
                                handleChatOrderParty(orderRef);
                              }}
                              style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: '#16A34A', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                            >
                              💬 Chat Seller for Details
                            </button>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Maya Name:</span>
                        <span style={{ color: '#0F172A', fontWeight: 800 }}>
                          {modalSupplierProfile?.mayaName || (modalSupplierProfile?.firstName ? `${modalSupplierProfile.firstName} ${modalSupplierProfile.lastName}` : orderToSubmitRef.supplierName)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Maya Number:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#7C3AED', fontWeight: 800, fontFamily: 'monospace', fontSize: '15px' }}>
                            {modalSupplierProfile?.mayaNumber || modalSupplierProfile?.phone || 'Not configured by seller'}
                          </span>
                          {(modalSupplierProfile?.mayaNumber || modalSupplierProfile?.phone) ? (
                            <button
                              type="button"
                              onClick={() => copyModalText(modalSupplierProfile?.mayaNumber || modalSupplierProfile?.phone || '', 'Maya Number')}
                              style={{ padding: '3px 9px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: '#F3E8FF', color: '#6D28D9', border: 'none', cursor: 'pointer' }}
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
                      {(modalSupplierProfile?.mayaQrUrl || modalSupplierProfile?.gcashQrUrl) && (
                        <div style={{ marginTop: '6px', textAlign: 'center', background: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1.5px dashed #DDD6FE' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#6D28D9', marginBottom: '6px' }}>
                            {modalSupplierProfile?.mayaQrUrl ? 'Scan QR Code with Maya App:' : 'Scan Seller QR Code (QRPh / Maya Compatible):'}
                          </div>
                          <img src={getImageUrl(modalSupplierProfile.mayaQrUrl || modalSupplierProfile.gcashQrUrl || '')} alt="Maya QR Code" style={{ maxWidth: '170px', maxHeight: '170px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} />
                        </div>
                      )}
                    </div>
                  )}

                  {orderToSubmitRef.paymentMethod === 'bank_transfer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      {!modalSupplierProfile?.bankAccountNo && !modalSupplierProfile?.bankQrUrl && (
                        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '10px 12px', marginBottom: '4px' }}>
                          <div style={{ fontWeight: 800, color: '#92400E', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            ⚠️ Seller Has Not Configured Bank Account
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#78350F', lineHeight: 1.4, marginBottom: '6px' }}>
                            This seller hasn't set up bank details yet. You can transfer using their alternate accounts below, scan their QRPh code, or chat with them directly:
                          </div>
                          {(modalSupplierProfile?.gcashNumber || modalSupplierProfile?.phone) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #FDE68A', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>
                                📱 GCash: {modalSupplierProfile.gcashNumber || modalSupplierProfile.phone}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyModalText(modalSupplierProfile.gcashNumber || modalSupplierProfile.phone || '', 'GCash Number')}
                                style={{ padding: '2px 8px', fontSize: '10.5px', fontWeight: 700, borderRadius: '4px', background: '#E0F2FE', color: '#0284C7', border: 'none', cursor: 'pointer' }}
                              >
                                📋 {copiedModalText === 'GCash Number' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          )}
                          {(modalSupplierProfile?.mayaNumber || modalSupplierProfile?.phone) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #FDE68A', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>
                                💜 Maya: {modalSupplierProfile.mayaNumber || modalSupplierProfile.phone}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyModalText(modalSupplierProfile.mayaNumber || modalSupplierProfile.phone || '', 'Maya Number')}
                                style={{ padding: '2px 8px', fontSize: '10.5px', fontWeight: 700, borderRadius: '4px', background: '#F3E8FF', color: '#6D28D9', border: 'none', cursor: 'pointer' }}
                              >
                                📋 {copiedModalText === 'Maya Number' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          )}
                          <div style={{ marginTop: '6px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const orderRef = orderToSubmitRef;
                                setOrderToSubmitRef(null);
                                handleChatOrderParty(orderRef);
                              }}
                              style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: '#16A34A', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                            >
                              💬 Chat Seller for Details
                            </button>
                          </div>
                        </div>
                      )}
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
                          <span style={{ color: '#0F172A', fontWeight: 800, fontFamily: 'monospace', fontSize: '15px' }}>
                            {modalSupplierProfile?.bankAccountNo || 'Contact seller'}
                          </span>
                          {modalSupplierProfile?.bankAccountNo && (
                            <button
                              type="button"
                              onClick={() => copyModalText(modalSupplierProfile?.bankAccountNo || '', 'Account Number')}
                              style={{ padding: '3px 9px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', background: '#E2E8F0', color: '#334155', border: 'none', cursor: 'pointer' }}
                            >
                              📋 {copiedModalText === 'Account Number' ? 'Copied!' : 'Copy'}
                            </button>
                          )}
                        </div>
                      </div>
                      {(modalSupplierProfile?.bankQrUrl || modalSupplierProfile?.gcashQrUrl) && (
                        <div style={{ marginTop: '6px', textAlign: 'center', background: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1.5px dashed #CBD5E1' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                            {modalSupplierProfile?.bankQrUrl ? 'Scan Bank QR Code (InstaPay / PESONet):' : 'Scan Seller QR Code (InstaPay / QRPh Compatible):'}
                          </div>
                          <img src={getImageUrl(modalSupplierProfile.bankQrUrl || modalSupplierProfile.gcashQrUrl || '')} alt="Bank QR Code" style={{ maxWidth: '170px', maxHeight: '170px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <form onSubmit={handleSubmitRefNo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  Transaction Reference Number <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={submittingRefInput}
                  onChange={(e) => setSubmittingRefInput(e.target.value)}
                  placeholder="e.g. 1029384756123 (13 digits)"
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    borderRadius: '10px',
                    border: '1.5px solid #0284C7',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0C4A6E',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                  Paste the 13-digit transaction reference number from your GCash, Maya, or Bank receipt.
                </div>
              </div>

              {/* Receipt Image Proof Uploader */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  Proof of Transaction / Receipt Photo <span style={{ color: '#EF4444' }}>*</span> <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>(Required)</span>
                </label>

                {submittingProofUrl ? (
                  <div style={{
                    position: 'relative',
                    borderRadius: '12px',
                    border: '1.5px solid #16A34A',
                    padding: '10px 14px',
                    background: '#F0FDF4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <img
                      src={getImageUrl(submittingProofUrl)}
                      alt="Payment Receipt Proof"
                      style={{ width: '54px', height: '54px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #BBF7D0' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#15803D' }}>✓ Payment Receipt Attached</div>
                      <div style={{ fontSize: '11px', color: '#166534' }}>Ready for seller verification</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubmittingProofUrl('')}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid #FECACA',
                        background: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      🗑️ Remove
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '2px dashed #CBD5E1',
                    background: '#F8FAFC',
                    cursor: uploadingProof ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingProof}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: '24px', marginBottom: '2px' }}>📸</span>
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#334155' }}>
                      {uploadingProof ? 'Uploading Receipt Screenshot…' : 'Click to Upload Payment Receipt / Proof'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      Supports PNG, JPG, JPEG (Max 10MB)
                    </span>
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setOrderToSubmitRef(null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
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
                  disabled={isSubmittingRef || uploadingProof || !submittingRefInput.trim() || !submittingProofUrl}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: isSubmittingRef || uploadingProof || !submittingRefInput.trim() || !submittingProofUrl ? '#94A3B8' : '#0284C7',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: isSubmittingRef || uploadingProof || !submittingRefInput.trim() || !submittingProofUrl ? 'not-allowed' : 'pointer',
                    boxShadow: isSubmittingRef || uploadingProof || !submittingRefInput.trim() || !submittingProofUrl ? 'none' : '0 4px 12px rgba(2, 132, 199, 0.3)',
                  }}
                >
                  {isSubmittingRef ? 'Submitting…' : 'Submit Ref & Receipt Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
