import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useChat } from '../contexts/ChatContext';
import { produceApi } from '../api/produce';
import { supplyApi } from '../api/supply';
import { api, getImageUrl } from '../api';
import type { PublicUserProfile } from '../types/auth';

export interface OrderItem {
  id: string;
  isBackend?: boolean;
  buyerId?: string;
  farmerId?: string;
  buyerName: string;
  buyerLocation: string;
  farmerName?: string;
  product: string;
  photo?: string;
  quantityNum: number;
  quantity: string;
  unitPrice: number;
  subtotal?: number;
  shippingFee?: number;
  total: number;
  deliveryMethod?: string;
  deliveryAddress?: string;
  status: 'Pending' | 'Quoted' | 'Confirmed' | 'Completed' | 'Cancelled';
  date: string;
  contactMessage?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentRefNo?: string;
  paymentProofUrl?: string;
}

export interface ParsedContactInfo {
  fulfillment: string;
  phone: string;
  payment: string;
  notes: string;
}

export function parseContactMessage(msg?: string): ParsedContactInfo {
  if (!msg) {
    return { fulfillment: 'Farm Delivery / Pickup', phone: '', payment: 'Cash on Delivery (COD)', notes: '' };
  }

  const parts = msg.split('•').map((p) => p.trim());
  let fulfillment = '';
  let phone = '';
  let payment = '';
  let notes = '';

  for (const part of parts) {
    if (part.toLowerCase().startsWith('fulfillment:')) {
      fulfillment = part.replace(/fulfillment:\s*/i, '').trim();
    } else if (part.toLowerCase().startsWith('phone:')) {
      phone = part.replace(/phone:\s*/i, '').trim();
    } else if (part.toLowerCase().startsWith('payment:')) {
      payment = part.replace(/payment:\s*/i, '').trim();
    } else if (part.toLowerCase().startsWith('notes:')) {
      notes = part.replace(/notes:\s*/i, '').trim();
    }
  }

  if (!fulfillment && !phone && !payment) {
    fulfillment = msg;
  }

  return {
    fulfillment: fulfillment || 'Farm-Gate Pickup',
    phone: phone || '',
    payment: payment || 'Cash on Delivery (COD)',
    notes: notes || '',
  };
}

export const paymentMethodLabels: Record<string, { label: string; icon: string }> = {
  cod: { label: 'Cash on Delivery', icon: '💵' },
  gcash: { label: 'GCash', icon: '📱' },
  maya: { label: 'Maya', icon: '💳' },
  bank_transfer: { label: 'Bank Transfer', icon: '🏦' },
  card: { label: 'Credit / Debit Card', icon: '💳' },
};

export const getPaymentBadge = (paymentMethod?: string, paymentStatus?: string, paymentRefNo?: string) => {
  if (paymentMethod === 'cod') {
    return { label: 'COD (Pay on Delivery)', bg: '#F1F5F9', color: '#475569', icon: '💵' };
  }
  if (paymentStatus === 'paid') {
    return { label: 'Paid & Verified', bg: '#DCFCE7', color: '#166534', icon: '✅' };
  }
  if (paymentRefNo) {
    return { label: 'Pending Verification', bg: '#FEF3C7', color: '#92400E', icon: '⌛' };
  }
  return { label: 'Awaiting Payment', bg: '#FEF9C3', color: '#854D0E', icon: '⏳' };
};

export function getCropIcon(cropName: string = ''): string {
  const c = cropName.toLowerCase();
  if (c.includes('corn') || c.includes('mais')) return '🌽';
  if (c.includes('rice') || c.includes('palay') || c.includes('bugas') || c.includes('dinorado')) return '🌾';
  if (c.includes('tomato') || c.includes('kamatis')) return '🍅';
  if (c.includes('mango') || c.includes('mangga')) return '🥭';
  if (c.includes('banana') || c.includes('saging')) return '🍌';
  if (c.includes('potato') || c.includes('patatas') || c.includes('cassava') || c.includes('kamote')) return '🥔';
  if (c.includes('onion') || c.includes('sibuyas')) return '🧅';
  if (c.includes('garlic') || c.includes('ahos') || c.includes('bawang')) return '🧄';
  if (c.includes('cabbage') || c.includes('lettuce') || c.includes('pechay')) return '🥬';
  if (c.includes('eggplant') || c.includes('talong')) return '🍆';
  if (c.includes('chili') || c.includes('sili')) return '🌶️';
  return '🌱';
}

export function getCropImageFallback(cropName: string = ''): string {
  const c = cropName.toLowerCase();
  if (c.includes('corn') || c.includes('mais')) return 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80';
  if (c.includes('rice') || c.includes('palay') || c.includes('bugas') || c.includes('dinorado')) return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80';
  if (c.includes('tomato') || c.includes('kamatis')) return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80';
  if (c.includes('mango') || c.includes('mangga')) return 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80';
  if (c.includes('banana') || c.includes('saging')) return 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=600&q=80';
  if (c.includes('potato') || c.includes('patatas') || c.includes('cassava') || c.includes('kamote')) return 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80';
  if (c.includes('onion') || c.includes('sibuyas')) return 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80';
  if (c.includes('garlic') || c.includes('ahos') || c.includes('bawang')) return 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80';
  if (c.includes('cabbage') || c.includes('lettuce') || c.includes('pechay')) return 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80';
  if (c.includes('eggplant') || c.includes('talong')) return 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80';
  if (c.includes('chili') || c.includes('sili')) return 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80';
  return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80';
}

export function formatOrderId(id: string): string {
  if (id.length > 8) {
    return `#ORD-${id.slice(-6).toUpperCase()}`;
  }
  return `#ORD-${id}`;
}

export const ProduceTransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { openChatWith } = useChat();
  const { success: toastSuccess, error: toastError, warning: toastWarning, info: toastInfo } = useToast();
  const isFarmer = user?.role === 'farmer';
  const isBuyer = user?.role === 'buyer';

  // viewMode: 'sales' = farmer selling to buyers, 'purchases' = farmer buying from other farmers
  const queryParams = new URLSearchParams(location.search);
  const initialView = queryParams.get('view') === 'purchases' ? 'purchases' : 'sales';
  const [viewMode, setViewMode] = useState<'sales' | 'purchases'>(initialView);
  const isViewingPurchases = isFarmer && viewMode === 'purchases';
  // True whenever the current user is in the buyer/purchaser seat (regular buyer OR farmer buying from co-farmer)
  const isViewingAsBuyer = isBuyer || isViewingPurchases;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('view') === 'purchases' && isFarmer) {
      setViewMode('purchases');
    } else {
      setViewMode('sales');
    }
  }, [location.search, isFarmer]);

  const handleChatOrderParty = async (ord: OrderItem) => {
    // When viewing as buyer (farmer's own purchases or general buyer), chat target is the seller (farmerId)
    // When viewing sales orders, chat target is the buyer (buyerId)
    const targetUserId = isViewingAsBuyer ? ord.farmerId : ord.buyerId;
    if (!targetUserId) {
      toastError('Account Unavailable', 'Contact information is currently unavailable for this user.');
      return;
    }
    const initialMsg = isViewingAsBuyer
      ? `Hi! Inquiring regarding harvest crop order #${ord.id.slice(-6).toUpperCase()} (${ord.product}, total ₱${ord.total?.toLocaleString()}).`
      : `Hello ${ord.buyerName || 'Customer'}! Thank you for your harvest order #${ord.id.slice(-6).toUpperCase()} (${ord.product}). We are preparing your order!`;

    await openChatWith(
      targetUserId,
      {
        type: 'produce_order',
        referenceId: ord.id,
        title: `Order #${ord.id.slice(-6).toUpperCase()} - ${ord.product}`,
        image: ord.photo ? getImageUrl(ord.photo) : undefined,
        price: ord.total,
      },
      initialMsg
    );
    navigate('/messages');
  };

  const [selectedTab, setSelectedTab] = useState<'All Orders' | 'Pending' | 'Quoted' | 'To Pay' | 'Confirmed' | 'Completed' | 'Cancelled'>('All Orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<OrderItem | null>(null);
  const [orderToSetShipping, setOrderToSetShipping] = useState<OrderItem | null>(null);
  const [shippingFeeInput, setShippingFeeInput] = useState<number>(0);
  const [shippingFeeDisplay, setShippingFeeDisplay] = useState<string>('0');

  // Payment proof modal states
  const [orderToSubmitRef, setOrderToSubmitRef] = useState<OrderItem | null>(null);
  const [submittingRefInput, setSubmittingRefInput] = useState('');
  const [submittingProofUrl, setSubmittingProofUrl] = useState('');
  const [isSubmittingRef, setIsSubmittingRef] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [modalFarmerProfile, setModalFarmerProfile] = useState<PublicUserProfile | null>(null);
  const [loadingModalProfile, setLoadingModalProfile] = useState(false);
  const [copiedModalText, setCopiedModalText] = useState<string | null>(null);

  const copyModalText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedModalText(label);
    toastSuccess('Copied to Clipboard!', `${label} (${text}) copied to clipboard.`);
    setTimeout(() => setCopiedModalText(null), 2000);
  };

  const [farmerProfiles, setFarmerProfiles] = useState<Record<string, PublicUserProfile>>({});

  useEffect(() => {
    if (orders.length > 0) {
      const farmerIds = Array.from(new Set(orders.map((o) => o.farmerId).filter(Boolean))) as string[];
      farmerIds.forEach((fId) => {
        if (!farmerProfiles[fId]) {
          api.getUserPublicProfile(fId)
            .then((profile) => {
              setFarmerProfiles((prev) => ({ ...prev, [fId]: profile }));
            })
            .catch(() => { });
        }
      });
    }
  }, [orders]);

  useEffect(() => {
    if (orderToSubmitRef?.farmerId) {
      setLoadingModalProfile(true);
      api.getUserPublicProfile(orderToSubmitRef.farmerId, true)
        .then((profile) => setModalFarmerProfile(profile))
        .catch(() => setModalFarmerProfile(null))
        .finally(() => setLoadingModalProfile(false));
    } else {
      setModalFarmerProfile(null);
    }
  }, [orderToSubmitRef]);

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProof(true);
    try {
      const res = await api.uploadImage(file);
      setSubmittingProofUrl(res.url);
      toastSuccess('Receipt Uploaded!', 'Proof of payment image uploaded successfully.');
    } catch (err: any) {
      toastError('Upload Failed', err.message || 'Failed to upload receipt photo.');
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
    const prevSelected = selectedOrder;

    // Optimistic Update: close modal and show pending verification state immediately
    setOrders((prev) =>
      prev.map((o) =>
        o.id === currentOrder.id
          ? {
            ...o,
            paymentRefNo: refNo,
            paymentProofUrl: proofUrl || o.paymentProofUrl,
            paymentStatus: 'pending_verification',
          }
          : o
      )
    );
    if (selectedOrder && selectedOrder.id === currentOrder.id) {
      setSelectedOrder((prev) =>
        prev
          ? {
            ...prev,
            paymentRefNo: refNo,
            paymentProofUrl: proofUrl || prev.paymentProofUrl,
            paymentStatus: 'pending_verification',
          }
          : null
      );
    }
    setOrderToSubmitRef(null);
    setSubmittingRefInput('');
    setSubmittingProofUrl('');

    setIsSubmittingRef(true);
    try {
      await produceApi.submitPaymentRef(
        currentOrder.id,
        refNo,
        proofUrl
      );
      toastSuccess('Payment Reference Submitted! 🎉', 'Your payment reference and proof receipt have been sent to the selling farmer for verification.');
    } catch (err: any) {
      // Rollback on failure
      setOrders(prevOrders);
      setSelectedOrder(prevSelected);
      setOrderToSubmitRef(currentOrder);
      setSubmittingRefInput(refNo);
      setSubmittingProofUrl(proofUrl);
      toastError('Submission Failed', err.response?.data?.error || err.message || 'Failed to submit payment reference.');
    } finally {
      setIsSubmittingRef(false);
    }
  };

  const handleVerifyPayment = async (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const prevOrders = orders;
    const prevSelected = selectedOrder;

    // Optimistic update: mark as paid immediately
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'paid' } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, paymentStatus: 'paid' } : null));
    }

    setIsUpdatingStatus(true);
    try {
      const updatedTx = await produceApi.updateTransactionStatus(
        orderId,
        target.status.toLowerCase() as any,
        target.shippingFee,
        'paid'
      );
      toastSuccess('Payment Verified! ✅', 'Payment received and verified successfully.');
      const finalStatus = updatedTx?.status
        ? ((updatedTx.status.charAt(0).toUpperCase() + updatedTx.status.slice(1).toLowerCase()) as any)
        : target.status;
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'paid', status: finalStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, paymentStatus: 'paid', status: finalStatus } : null));
      }
    } catch (err: any) {
      // Rollback on failure
      setOrders(prevOrders);
      setSelectedOrder(prevSelected);
      toastError('Verification Failed', err.message || 'Failed to verify payment.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    if (orderToSetShipping) {
      const fee = orderToSetShipping.shippingFee || 0;
      setShippingFeeInput(fee);
      setShippingFeeDisplay(fee === 0 ? '0' : fee.toLocaleString());
    }
  }, [orderToSetShipping]);
  const [loading, setLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const tabs: ('All Orders' | 'Pending' | 'Quoted' | 'To Pay' | 'Confirmed' | 'Completed' | 'Cancelled')[] = [
    'All Orders',
    'Pending',
    'Quoted',
    'To Pay',
    'Confirmed',
    'Completed',
    'Cancelled',
  ];

  const [supplyOrdersCount, setSupplyOrdersCount] = useState<number | null>(null);

  useEffect(() => {
    loadTransactions();
    if (user?.role !== 'super_admin') {
      supplyApi.listOrders()
        .then((data) => {
          if (Array.isArray(data)) {
            setSupplyOrdersCount(data.length);
          }
        })
        .catch((err) => console.error('Failed to load supply count:', err));
    }

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        loadTransactions(true);
      }
    };

    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadTransactions(true);
      }
    }, 4000);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user?.id]);

  const loadTransactions = async (isSilent: boolean = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [res, listingsRes] = await Promise.all([
        produceApi.listTransactions(),
        produceApi.listListings().catch(() => [] as any),
      ]);
      const listingMap = new Map<string, string>();
      if (Array.isArray(listingsRes)) {
        for (const l of listingsRes) {
          if (l.photos && l.photos.length > 0) {
            listingMap.set(l.id, l.photos[0]);
          }
        }
      }

      if (res && res.length > 0) {
        const mapped: OrderItem[] = res.map((t) => {
          const capStatus = (t.status.charAt(0).toUpperCase() + t.status.slice(1).toLowerCase()) as any;
          const d = new Date(t.createdAt);
          const timeStr = !isNaN(d.getTime())
            ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Just now';
          const parsedContact = parseContactMessage(t.contactMessage);
          const photo = t.cropPhoto || (t.listingId ? listingMap.get(t.listingId) : undefined);
          const isDelivery = t.deliveryMethod === 'delivery' || (!t.deliveryMethod && !parsedContact.fulfillment?.toLowerCase().includes('pickup'));
          const subtotal = t.subtotal ?? (t.unitPrice ? t.unitPrice * t.quantity : t.totalPrice);
          const shippingFee = t.shippingFee ?? 0;

          let pm = t.paymentMethod;
          if (!pm) {
            const pLower = parsedContact.payment.toLowerCase();
            if (pLower.includes('gcash')) pm = 'gcash';
            else if (pLower.includes('maya')) pm = 'maya';
            else if (pLower.includes('bank')) pm = 'bank_transfer';
            else if (pLower.includes('cod') || pLower.includes('cash on delivery')) pm = 'cod';
            else pm = 'gcash';
          }

          return {
            id: t.id,
            isBackend: true,
            buyerId: t.buyerId,
            farmerId: t.farmerId,
            buyerName: t.buyerName || 'Buyer',
            buyerLocation: t.deliveryAddress || parsedContact.fulfillment || 'Northern Mindanao',
            farmerName: t.farmerName,
            product: t.cropName || 'Farm Produce',
            photo,
            quantityNum: t.quantity,
            quantity: `${t.quantity} kg`,
            unitPrice: t.unitPrice || (t.totalPrice / (t.quantity || 1)),
            subtotal,
            shippingFee,
            total: t.totalPrice,
            deliveryMethod: t.deliveryMethod || (isDelivery ? 'delivery' : 'pickup'),
            deliveryAddress: t.deliveryAddress,
            status: capStatus,
            date: timeStr,
            contactMessage: t.contactMessage,
            paymentMethod: pm,
            paymentStatus: t.paymentStatus || 'unpaid',
            paymentRefNo: t.paymentRefNo || '',
            paymentProofUrl: t.paymentProofUrl || '',
          };
        });
        setOrders(mapped);
        setSelectedOrder((current) => {
          if (!current) return null;
          const updated = mapped.find((o) => o.id === current.id);
          return updated || current;
        });
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Failed to load transactions', err);
      if (!isSilent) setOrders([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: 'confirmed' | 'completed' | 'cancelled', shippingFee?: number) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const prevOrders = orders;
    const prevSelected = selectedOrder;

    // Optimistic calculation
    const isQuoting = shippingFee !== undefined && shippingFee > 0;
    const optimisticStatusStr = isQuoting ? 'Quoted' : (newStatus.charAt(0).toUpperCase() + newStatus.slice(1).toLowerCase());
    const optimisticFee = shippingFee !== undefined ? shippingFee : (target.shippingFee || 0);
    const sub = target.subtotal ?? (target.total - (target.shippingFee || 0));
    const optimisticTotal = sub + optimisticFee;

    // Optimistic Update: render changes immediately
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: optimisticStatusStr as any, shippingFee: optimisticFee, total: optimisticTotal }
          : o
      )
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) =>
        prev
          ? { ...prev, status: optimisticStatusStr as any, shippingFee: optimisticFee, total: optimisticTotal }
          : null
      );
    }

    setIsUpdatingStatus(true);
    try {
      let returnedStatus = newStatus as string;
      let updatedTx: any = null;
      if (target?.isBackend) {
        updatedTx = await produceApi.updateTransactionStatus(orderId, newStatus, shippingFee);
        if (updatedTx?.status) {
          returnedStatus = updatedTx.status;
        }
      }
      const capStatus = (returnedStatus.charAt(0).toUpperCase() + returnedStatus.slice(1).toLowerCase()) as any;
      const fee = updatedTx?.shippingFee !== undefined ? updatedTx.shippingFee : optimisticFee;
      const total = updatedTx?.totalPrice !== undefined ? updatedTx.totalPrice : optimisticTotal;

      // Reconcile with authoritative server response
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            return { ...o, status: capStatus, shippingFee: fee, total };
          }
          return o;
        })
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: capStatus, shippingFee: fee, total } : null));
      }
      if (returnedStatus === 'quoted') {
        toastSuccess('Delivery Fee Quoted', `Hauling fee of ₱${fee.toLocaleString()} submitted. Waiting for buyer approval.`);
      } else {
        toastSuccess('Order Status Updated', `Order #${orderId.slice(-6).toUpperCase()} marked as ${capStatus}.`);
      }
    } catch (err: any) {
      console.error('Failed to update status', err);
      // Rollback on failure
      setOrders(prevOrders);
      setSelectedOrder(prevSelected);
      toastError('Update Failed', err.response?.data?.error || 'Failed to update order status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleQuoteDecision = async (orderId: string, action: 'approve' | 'switch_pickup' | 'reject') => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const prevOrders = orders;
    const prevSelected = selectedOrder;

    // Optimistic calculation
    let optimisticStatus: any = 'Confirmed';
    let optimisticDeliveryMethod = target.deliveryMethod;
    let optimisticShippingFee = target.shippingFee;
    let optimisticTotal = target.total;
    const sub = target.subtotal ?? (target.total - (target.shippingFee || 0));

    if (action === 'approve') {
      optimisticStatus = 'Confirmed';
    } else if (action === 'switch_pickup') {
      optimisticStatus = 'Confirmed';
      optimisticDeliveryMethod = 'PICKUP';
      optimisticShippingFee = 0;
      optimisticTotal = sub;
    } else {
      optimisticStatus = 'Cancelled';
    }

    // Optimistic update: reflect decision immediately
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
            ...o,
            status: optimisticStatus,
            deliveryMethod: optimisticDeliveryMethod,
            shippingFee: optimisticShippingFee,
            total: optimisticTotal,
          }
          : o
      )
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) =>
        prev
          ? {
            ...prev,
            status: optimisticStatus,
            deliveryMethod: optimisticDeliveryMethod,
            shippingFee: optimisticShippingFee,
            total: optimisticTotal,
          }
          : null
      );
    }

    setIsUpdatingStatus(true);
    try {
      const updated = await produceApi.respondToQuote(orderId, action);
      const capStatus = (updated.status.charAt(0).toUpperCase() + updated.status.slice(1).toLowerCase()) as any;
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            return {
              ...o,
              status: capStatus,
              deliveryMethod: updated.deliveryMethod || o.deliveryMethod,
              shippingFee: updated.shippingFee,
              total: updated.totalPrice,
            };
          }
          return o;
        })
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
              ...prev,
              status: capStatus,
              deliveryMethod: updated.deliveryMethod || prev.deliveryMethod,
              shippingFee: updated.shippingFee,
              total: updated.totalPrice,
            }
            : null
        );
      }
      if (action === 'approve') {
        toastSuccess('Quote Approved', 'You approved the delivery fee! Order is confirmed and farmer will begin fulfillment.');
      } else if (action === 'switch_pickup') {
        toastSuccess('Switched to Pickup', 'Order switched to Farm Pickup (₱0 fee). Ready for pickup scheduling.');
      } else {
        toastInfo('Order Cancelled', 'Quoted delivery fee was declined and order has been cancelled.');
      }
    } catch (err: any) {
      console.error('Failed to respond to quote', err);
      // Rollback on failure
      setOrders(prevOrders);
      setSelectedOrder(prevSelected);
      toastError('Action Failed', err.response?.data?.error || 'Failed to submit quote decision');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toastInfo('Copied to Clipboard', `Order ID #${id.slice(-6).toUpperCase()} copied.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // KPI calculations
  const totalRevenue = orders
    .filter((o) => o.status === 'Confirmed' || o.status === 'Completed')
    .reduce((sum, o) => sum + o.total, 0);

  // Split orders into sales (farmer as seller) and purchases (farmer as buyer)
  const salesOrders = isFarmer
    ? orders.filter((o) => o.farmerId === user?.id)
    : orders;
  const purchaseOrders = isFarmer
    ? orders.filter((o) => o.buyerId === user?.id)
    : [];

  // Which pool of orders to show based on viewMode
  const activeOrders = isViewingPurchases ? purchaseOrders : salesOrders;

  // KPI recalculations based on active pool
  const activePendingCount = activeOrders.filter((o) => o.status === 'Pending').length;
  const activeQuotedCount = activeOrders.filter((o) => o.status === 'Quoted').length;
  const activeToPayCount = activeOrders.filter((o) => {
    const isCOD = o.paymentMethod === 'cod' || parseContactMessage(o.contactMessage).payment.toLowerCase().includes('cash on delivery') || parseContactMessage(o.contactMessage).payment.toLowerCase().includes('cod');
    return !isCOD && o.paymentStatus !== 'paid' && !o.paymentRefNo && o.status !== 'Pending' && o.status !== 'Quoted' && o.status !== 'Completed' && o.status !== 'Cancelled';
  }).length;
  const activeConfirmedCount = activeOrders.filter((o) => o.status === 'Confirmed').length;
  const activeCompletedCount = activeOrders.filter((o) => o.status === 'Completed').length;
  const activeCancelledCount = activeOrders.filter((o) => o.status === 'Cancelled').length;

  // Filtering
  const filteredOrders = activeOrders.filter((ord) => {
    const isCOD = ord.paymentMethod === 'cod' || parseContactMessage(ord.contactMessage).payment.toLowerCase().includes('cash on delivery') || parseContactMessage(ord.contactMessage).payment.toLowerCase().includes('cod');
    const isToPay = !isCOD && ord.paymentStatus !== 'paid' && !ord.paymentRefNo && ord.status !== 'Pending' && ord.status !== 'Quoted' && ord.status !== 'Completed' && ord.status !== 'Cancelled';

    const matchesTab =
      selectedTab === 'All Orders'
        ? true
        : selectedTab === 'To Pay'
          ? isToPay
          : ord.status.toLowerCase() === selectedTab.toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query === '' ||
      ord.product.toLowerCase().includes(query) ||
      ord.buyerName.toLowerCase().includes(query) ||
      (ord.farmerName && ord.farmerName.toLowerCase().includes(query)) ||
      ord.id.toLowerCase().includes(query) ||
      (ord.contactMessage && ord.contactMessage.toLowerCase().includes(query));
    return matchesTab && matchesSearch;
  });

  const getStatusBadgeStyle = (status: OrderItem['status']) => {
    switch (status) {
      case 'Pending':
        return {
          bg: '#FEF9C3',
          border: '#FDE047',
          color: '#854D0E',
          dot: '#CA8A04',
          label: '⏳ Pending Confirmation',
        };
      case 'Quoted':
        return {
          bg: '#FEF3C7',
          border: '#FCD34D',
          color: '#92400E',
          dot: '#F59E0B',
          label: '⚡ Review Delivery Fee',
        };
      case 'Confirmed':
        return {
          bg: '#EFF6FF',
          border: '#BFDBFE',
          color: '#1E40AF',
          dot: '#3B82F6',
          label: '🚚 Confirmed / In Delivery',
        };
      case 'Completed':
        return {
          bg: '#F0FDF4',
          border: '#BBF7D0',
          color: '#166534',
          dot: '#22C55E',
          label: '✓ Completed & Paid',
        };
      case 'Cancelled':
        return {
          bg: '#FEF2F2',
          border: '#FECACA',
          color: '#991B1B',
          dot: '#EF4444',
          label: '✕ Cancelled',
        };
    }
  };

  const getStatusBorderColor = (status: OrderItem['status']) => {
    switch (status) {
      case 'Pending':
        return '#EAB308';
      case 'Quoted':
        return '#F59E0B';
      case 'Confirmed':
        return '#3B82F6';
      case 'Completed':
        return '#16A34A';
      case 'Cancelled':
        return '#EF4444';
    }
  };

  return (
    <div className="app-container" style={{ paddingBottom: '60px' }}>
      {/* ─── Order Category Navigation Switcher ─── */}
      <div className="orders-channel-switcher segmented-tabs-bar" style={{ display: 'flex', gap: '10px', marginBottom: '22px', flexWrap: 'wrap' }}>

        {/* Sales Orders tab (farmer's default view) / Buyer Produce Purchases */}
        <button
          type="button"
          onClick={() => {
            setViewMode('sales');
            setSelectedTab('All Orders');
            navigate('/produce/orders', { replace: true });
          }}
          className={`segmented-tab-btn ${!isViewingPurchases ? 'active' : ''}`}
          style={{
            padding: '10px 22px',
            borderRadius: '24px',
            border: `2px solid ${!isViewingPurchases ? '#176B3A' : '#e2e8f0'}`,
            backgroundColor: !isViewingPurchases ? '#EAF6EE' : '#ffffff',
            color: !isViewingPurchases ? '#0E4A27' : '#64748b',
            fontWeight: !isViewingPurchases ? 800 : 700,
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: !isViewingPurchases ? '0 2px 8px rgba(23, 107, 58, 0.12)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <span>{isFarmer ? '🌾 Crop Sales Orders' : '🌱 Farm Purchases'}</span>
          <span style={{
            backgroundColor: !isViewingPurchases ? '#176B3A' : '#cbd5e1',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '10px',
          }}>
            {salesOrders.length}
          </span>
        </button>

        {/* My Crop Purchases tab — only visible for Farmers */}
        {isFarmer && (
          <button
            type="button"
            onClick={() => {
              setViewMode('purchases');
              setSelectedTab('All Orders');
              navigate('/produce/orders?view=purchases', { replace: true });
            }}
            className={`segmented-tab-btn ${isViewingPurchases ? 'active' : ''}`}
            style={{
              padding: '10px 22px',
              borderRadius: '24px',
              border: `2px solid ${isViewingPurchases ? '#7C3AED' : '#e2e8f0'}`,
              backgroundColor: isViewingPurchases ? '#F5F3FF' : '#ffffff',
              color: isViewingPurchases ? '#4C1D95' : '#64748b',
              fontWeight: isViewingPurchases ? 800 : 700,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isViewingPurchases ? '0 2px 8px rgba(124, 58, 237, 0.12)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🛒 My Crop Purchases</span>
            <span style={{
              backgroundColor: isViewingPurchases ? '#7C3AED' : '#cbd5e1',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '10px',
            }}>
              {purchaseOrders.length}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/supply/orders')}
          className="segmented-tab-btn"
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
            e.currentTarget.style.borderColor = '#ca8a04';
            e.currentTarget.style.color = '#854d0e';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <span>{user?.role === 'supplier' ? '📦 Customer Supply Orders' : '🏪 Agri Supply Purchases'}</span>
          {supplyOrdersCount !== null && (
            <span style={{
              backgroundColor: '#cbd5e1',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '10px',
            }}>
              {supplyOrdersCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── Page Header ─── */}
      <div className="orders-header-wrap" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <span style={{ fontSize: '32px' }}>{isViewingPurchases ? '🛒' : (isFarmer ? '🌾' : '🛒')}</span>
            <h1 className="orders-header-title" style={{ fontSize: '32px', fontWeight: 800, color: isViewingPurchases ? '#4C1D95' : '#0E4A27', margin: 0 }}>
              {isViewingPurchases ? 'My Crop Purchases' : (isFarmer ? 'Crop Sales & Buyer Orders' : 'Farm Purchases')}
            </h1>
          </div>
          <p className="orders-header-subtitle" style={{ fontSize: '16px', color: '#525450', margin: 0 }}>
            {isViewingPurchases
              ? 'Track produce you purchased from other farmers. View order status and contact the seller.'
              : (isFarmer
                ? 'Review incoming purchase requests from buyers for your harvests, confirm fulfillment, and track payments.'
                : 'Track fresh farm harvests you ordered from local farmers across Northern Mindanao.')}
          </p>
        </div>

        {loading && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', backgroundColor: '#E0F2FE', color: '#0369A1', fontWeight: 700, fontSize: '14px' }}>
            <span style={{ animation: 'spin 1s linear infinite' }}>🔄</span> Syncing latest orders...
          </span>
        )}
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
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            📋
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Orders</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>{activeOrders.length}</div>
          </div>
        </div>

        <div
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
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            ⏳
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: activePendingCount > 0 ? '#A16207' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pending Action
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: activePendingCount > 0 ? '#A16207' : '#0F172A' }}>
              {activePendingCount}
            </div>
          </div>
        </div>

        <div
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
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            🚚
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Deliveries</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#1E40AF' }}>{activeConfirmedCount}</div>
          </div>
        </div>

        <div
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
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            💰
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fulfilled Volume</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27' }}>₱{totalRevenue.toLocaleString()}</div>
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
          borderRadius: '18px',
          border: '1.5px solid #E2E8F0',
        }}
      >
        {/* Filter Tabs with Counter Badges */}
        <div className="orders-filter-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: '4px' }}>
          {tabs.map((tab) => {
            const isSelected = selectedTab === tab;
            let count = activeOrders.length;
            if (tab === 'Pending') count = activePendingCount;
            if (tab === 'Quoted') count = activeQuotedCount;
            if (tab === 'To Pay') count = activeToPayCount;
            if (tab === 'Confirmed') count = activeConfirmedCount;
            if (tab === 'Completed') count = activeCompletedCount;
            if (tab === 'Cancelled') count = activeCancelledCount;

            return (
              <button
                key={tab}
                className={`orders-filter-tab-btn ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedTab(tab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: isSelected ? '1.5px solid #0E4A27' : '1.5px solid transparent',
                  background: isSelected ? '#0E4A27' : '#F1F5F9',
                  color: isSelected ? '#FFFFFF' : '#334155',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{tab === 'To Pay' ? '💳 To Pay' : tab}</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(255,255,255,0.25)' : '#CBD5E1',
                    color: isSelected ? '#FFFFFF' : '#1E293B',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input Box */}
        <div className="orders-search-box" style={{ position: 'relative', minWidth: '280px', flex: '1 1 280px', maxWidth: '400px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '16px' }}>
            🔍
          </span>
          <input
            type="text"
            className="orders-search-input"
            placeholder="Search crop, buyer, phone, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              borderRadius: '12px',
              border: '1.5px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              fontSize: '14px',
              fontWeight: 600,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ─── Orders List ─── */}
      {filteredOrders.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {filteredOrders.map((ord) => {
            const badge = getStatusBadgeStyle(ord.status);
            const parsed = parseContactMessage(ord.contactMessage);
            const cropIcon = getCropIcon(ord.product);
            const shortId = formatOrderId(ord.id);
            const leftBorder = getStatusBorderColor(ord.status);

            return (
              <div
                key={ord.id}
                className="card order-manage-card"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  border: '1.5px solid #E2E8F0',
                  borderLeft: `6px solid ${leftBorder}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  padding: '24px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Order Card Header */}
                <div
                  className="order-card-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #F1F5F9',
                    marginBottom: '18px',
                  }}
                >
                  <div className="order-id-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div
                      onClick={(e) => handleCopyId(ord.id, e)}
                      title={`Click to copy full ID: ${ord.id}`}
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#F1F5F9',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 800,
                        color: '#0E4A27',
                        fontFamily: 'monospace',
                        letterSpacing: '0.5px',
                      }}
                    >
                      <span>{shortId}</span>
                      <span style={{ fontSize: '12px', opacity: 0.7 }}>
                        {copiedId === ord.id ? '✓ Copied!' : '📋'}
                      </span>
                    </div>

                    <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>
                      🕒 {ord.date}
                    </span>
                  </div>

                  {/* Rich Status Badge */}
                  <div
                    className="order-status-badge"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      backgroundColor: badge.bg,
                      border: `1px solid ${badge.border}`,
                      color: badge.color,
                      fontSize: '14px',
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: badge.dot,
                        display: 'inline-block',
                      }}
                    />
                    <span>{badge.label}</span>
                  </div>
                </div>

                {/* ─── Live Fulfillment Timeline (Shopee Style) ─── */}
                {ord.status !== 'Cancelled' && (
                  <div
                    className="order-timeline-box"
                    style={{
                      backgroundColor: '#F8FAFC',
                      padding: '16px 20px',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      marginBottom: '20px',
                    }}
                  >
                    <div className="order-timeline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Live Crop Order Timeline
                      </span>
                      <span style={{ fontSize: '12px', color: '#0E4A27', fontWeight: 700 }}>
                        {ord.status === 'Pending' && '⏳ Waiting for Farmer Confirmation'}
                        {ord.status === 'Quoted' && '⚡ Fee Quoted · Awaiting Buyer Review'}
                        {ord.status === 'Confirmed' && '🚚 Harvest Confirmed · Ready for Pickup / Delivery'}
                        {ord.status === 'Completed' && '✓ Successfully Delivered & Completed'}
                      </span>
                    </div>

                    <div className="order-timeline-steps" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                      {[
                        { stepNum: 1, title: '1. Order Placed' },
                        { stepNum: 2, title: '2. Harvest Confirmed' },
                        { stepNum: 3, title: '3. In Transit / Ready' },
                        { stepNum: 4, title: '4. Delivered & Paid' },
                      ].map((s) => {
                        const stepDone = ord.status === 'Completed'
                          ? true
                          : ord.status === 'Confirmed'
                            ? s.stepNum <= 3
                            : ord.status === 'Quoted'
                              ? s.stepNum <= 2
                              : s.stepNum === 1;

                        const isCurrent = ord.status === 'Completed'
                          ? s.stepNum === 4
                          : ord.status === 'Confirmed'
                            ? s.stepNum === 3
                            : ord.status === 'Quoted'
                              ? s.stepNum === 2
                              : s.stepNum === 1;

                        return (
                          <div
                            key={s.stepNum}
                            className="order-timeline-step"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              flex: 1,
                              position: 'relative',
                              zIndex: 2,
                            }}
                          >
                            <div
                              className="order-timeline-circle"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: stepDone ? (isCurrent ? '#16A34A' : '#0E4A27') : '#E2E8F0',
                                color: stepDone ? '#FFFFFF' : '#94A3B8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '13px',
                                boxShadow: isCurrent ? '0 0 0 4px rgba(22, 163, 74, 0.25)' : 'none',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              {stepDone ? (s.stepNum === 4 ? '✓' : s.stepNum) : s.stepNum}
                            </div>
                            <span
                              className="order-timeline-label"
                              style={{
                                fontSize: '12px',
                                fontWeight: isCurrent ? 800 : 600,
                                color: isCurrent ? '#0E4A27' : stepDone ? '#166534' : '#94A3B8',
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

                {/* Order Card Main Content Grid */}
                <div
                  className="order-card-body-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(260px, 1.2fr) minmax(280px, 1.8fr)',
                    gap: '24px',
                    alignItems: 'start',
                  }}
                >
                  {/* Left Column: Crop & Quantity */}
                  <div className="order-product-col" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        backgroundColor: '#F1F5F9',
                        border: '1.5px solid #E2E8F0',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '30px',
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      }}
                    >
                      <img
                        src={getImageUrl(ord.photo, getCropImageFallback(ord.product))}
                        alt={ord.product}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          if (target.parentElement) {
                            target.parentElement.innerHTML = `<span style="font-size: 28px;">${cropIcon}</span>`;
                          }
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                        Produce Item
                      </div>
                      <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '2px 0 6px 0' }}>
                        {ord.product}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, backgroundColor: '#ECFDF5', color: '#065F46', padding: '3px 10px', borderRadius: '8px' }}>
                          📦 Quantity: {ord.quantity}
                        </span>
                        {ord.unitPrice > 0 && (
                          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                            • ₱{ord.unitPrice.toLocaleString()}/kg
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ─── Delivery Details & Payment Details Grid (Matching Supply Orders UI/UX) ─── */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: '16px',
                      alignItems: 'start',
                    }}
                  >
                    {/* Left: DELIVERY DETAILS */}
                    <div
                      style={{
                        padding: '14px 16px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '14px',
                        border: '1px solid #E2E8F0',
                        fontSize: '13px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          color: '#64748B',
                          fontSize: '11.5px',
                          letterSpacing: '0.4px',
                          textTransform: 'uppercase',
                          marginBottom: '2px',
                        }}
                      >
                        DELIVERY DETAILS
                      </div>
                      <div style={{ color: '#0F172A' }}>
                        <strong>Method:</strong> {ord.deliveryMethod === 'pickup' ? 'Farm-Gate Pickup' : 'Home / Farm Delivery'}
                      </div>
                      <div style={{ color: '#334155' }}>
                        <strong>Address:</strong> {ord.deliveryAddress || ord.buyerLocation || 'Buyer Address'}
                      </div>
                      <div style={{ color: '#475569' }}>
                        <strong>Customer / Buyer:</strong> {ord.buyerName} {isViewingAsBuyer && <span style={{ color: '#854D0E', fontWeight: 700 }}>(You)</span>}
                      </div>
                      {isViewingAsBuyer && ord.farmerName && (
                        <div style={{ color: '#4C1D95', fontSize: '12.5px', marginTop: '2px' }}>
                          <strong>Selling Farmer:</strong> {ord.farmerName}
                        </div>
                      )}
                      {parsed.notes && (
                        <div style={{ marginTop: '4px', padding: '6px 10px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', fontStyle: 'italic', color: '#64748B', fontSize: '12px' }}>
                          "{parsed.notes}"
                        </div>
                      )}
                    </div>

                    {/* Right: PAYMENT DETAILS */}
                    <div
                      style={{
                        padding: '14px 16px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '14px',
                        border: '1px solid #E2E8F0',
                        fontSize: '13px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          color: '#64748B',
                          fontSize: '11.5px',
                          letterSpacing: '0.4px',
                          textTransform: 'uppercase',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>PAYMENT DETAILS</span>
                      </div>

                      {(() => {
                        const pmKey = ord.paymentMethod || 'gcash';
                        const pInfo = paymentMethodLabels[pmKey] || { label: pmKey.toUpperCase(), icon: '💳' };
                        const pBadge = getPaymentBadge(ord.paymentMethod, ord.paymentStatus, ord.paymentRefNo);
                        const fProf = ord.farmerId ? farmerProfiles[ord.farmerId] : null;
                        const isNonCOD = ord.paymentMethod !== 'cod';

                        const recipientName =
                          fProf?.gcashName ||
                          fProf?.mayaName ||
                          fProf?.bankAccountName ||
                          (fProf?.firstName ? `${fProf.firstName} ${fProf.lastName}` : ord.farmerName || 'Selling Farmer');
                        const recipientNum =
                          (ord.paymentMethod === 'maya'
                            ? fProf?.mayaNumber
                            : ord.paymentMethod === 'bank_transfer'
                              ? fProf?.bankAccountNo
                              : (fProf?.gcashNumber || fProf?.phone)) || fProf?.phone;

                        return (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span>{pInfo.icon}</span>
                              <strong style={{ color: '#0F172A' }}>{pInfo.label}</strong>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '8px',
                                  backgroundColor: pBadge.bg,
                                  color: pBadge.color,
                                }}
                              >
                                {pBadge.icon} {pBadge.label}
                              </span>
                            </div>

                            {/* Recipient Details Box on Order Card */}
                            {isNonCOD && (
                              <div
                                style={{
                                  marginTop: '4px',
                                  padding: '8px 10px',
                                  background: '#FFFFFF',
                                  borderRadius: '8px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '12px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                  <span>Recipient Name:</span>
                                  <strong style={{ color: '#0F172A' }}>{recipientName}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{(ord.paymentMethod || 'GCash').toUpperCase()} Number:</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284C7', fontSize: '13px' }}>
                                      {recipientNum || 'Contact farmer'}
                                    </span>
                                    {recipientNum && (
                                      <button
                                        type="button"
                                        onClick={() => copyModalText(recipientNum, `${(ord.paymentMethod || 'GCash').toUpperCase()} Number`)}
                                        style={{
                                          padding: '2px 6px',
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          borderRadius: '4px',
                                          background: '#E0F2FE',
                                          color: '#0369A1',
                                          border: 'none',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        📋 Copy
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {ord.paymentRefNo && (
                              <div style={{ fontSize: '12px', color: '#0369A1', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>🧾 Ref No:</span>
                                <span style={{ fontFamily: 'monospace', background: '#E0F2FE', padding: '1px 6px', borderRadius: '4px' }}>#{ord.paymentRefNo}</span>
                              </div>
                            )}

                            {ord.paymentProofUrl && (
                              <div style={{ marginTop: '2px' }}>
                                <a
                                  href={getImageUrl(ord.paymentProofUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: '11.5px',
                                    color: '#0284C7',
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

                            {/* Primary Submit Payment Ref / Proof Action Button (Inside Payment Details Card for Buyer after quote approval / confirmation) */}
                            {isViewingAsBuyer && isNonCOD && ord.paymentStatus !== 'paid' && (ord.status === 'Confirmed' || ord.status === 'Completed' || ord.paymentRefNo || ord.paymentProofUrl) && ord.status !== 'Cancelled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOrderToSubmitRef(ord);
                                  setSubmittingRefInput(ord.paymentRefNo || '');
                                  setSubmittingProofUrl(ord.paymentProofUrl || '');
                                }}
                                style={{
                                  marginTop: '6px',
                                  padding: '8px 14px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  backgroundColor: '#0284C7',
                                  color: '#FFFFFF',
                                  fontWeight: 800,
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  boxShadow: '0 2px 4px rgba(2,132,199,0.25)',
                                }}
                              >
                                <span>📱</span>
                                <span>{ord.paymentRefNo || ord.paymentProofUrl ? 'Update Payment Ref / Proof' : 'Submit Payment Ref / Proof'}</span>
                              </button>
                            )}

                            {/* Seller Verify Payment Button (Inside Payment Details Card for Seller) */}
                            {!isViewingAsBuyer && isNonCOD && Boolean(ord.paymentRefNo) && ord.paymentStatus !== 'paid' && ord.status !== 'Completed' && ord.status !== 'Cancelled' && (
                              <button
                                type="button"
                                disabled={isUpdatingStatus}
                                onClick={() => handleVerifyPayment(ord.id)}
                                style={{
                                  marginTop: '6px',
                                  padding: '8px 14px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  backgroundColor: '#16A34A',
                                  color: '#FFFFFF',
                                  fontWeight: 800,
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  boxShadow: '0 2px 4px rgba(22,163,74,0.25)',
                                }}
                              >
                                <span>✅</span>
                                <span>Verify & Confirm Payment Received</span>
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Quoted Banner (Awaiting Buyer Decision) */}
                {ord.status === 'Quoted' && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      backgroundColor: '#FEF9C3',
                      border: '1.5px solid #FDE047',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>⚡</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#854D0E' }}>
                          Delivery Hauling Fee Quoted: ₱{(ord.shippingFee || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '12px', color: '#A16207', marginTop: '2px' }}>
                          {(isBuyer || isViewingPurchases)
                            ? `Total order cost is ₱${ord.total.toLocaleString()} (Produce: ₱${(ord.subtotal ?? (ord.total - (ord.shippingFee || 0))).toLocaleString()} + Delivery: ₱${(ord.shippingFee || 0).toLocaleString()}). Please approve or switch to farm pickup.`
                            : `Awaiting buyer decision for this ₱${(ord.shippingFee || 0).toLocaleString()} delivery quote before harvest fulfillment.`}
                        </div>
                      </div>
                    </div>
                    {(isBuyer || isViewingPurchases) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleQuoteDecision(ord.id, 'approve')}
                          style={{
                            padding: '8px 16px',
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
                          disabled={isUpdatingStatus}
                          onClick={() => handleQuoteDecision(ord.id, 'switch_pickup')}
                          style={{
                            padding: '8px 14px',
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
                          disabled={isUpdatingStatus}
                          onClick={() => handleQuoteDecision(ord.id, 'reject')}
                          style={{
                            padding: '8px 12px',
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
                    {isFarmer && !isViewingPurchases && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderToSetShipping(ord);
                          setShippingFeeInput(ord.shippingFee || 0);
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

                {/* Order Card Footer */}
                <div
                  className="order-card-footer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid #F1F5F9',
                  }}
                >
                  <div className="order-pricing-summary">
                    <div className="order-pricing-meta" style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>Subtotal: <strong>₱{(ord.subtotal ?? (ord.total - (ord.shippingFee || 0))).toLocaleString()}</strong></span>
                      <span>•</span>
                      <span>
                        {ord.deliveryMethod === 'pickup'
                          ? '🏪 Farm-Gate Pickup (₱0)'
                          : ord.shippingFee && ord.shippingFee > 0
                            ? `🚚 Delivery: ₱${ord.shippingFee.toLocaleString()}`
                            : (ord.status === 'Pending' ? '🚚 Delivery: Fee Pending Farmer Confirmation' : '🚚 Delivery: ₱0')}
                      </span>
                    </div>
                    <div className="order-total-amount" style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27', marginTop: '2px' }}>
                      ₱{ord.total.toLocaleString()}
                    </div>
                  </div>

                  <div className="order-action-buttons" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Primary Decisions / Status Area */}
                    {(ord.status === 'Pending' || ord.status === 'Quoted' || ord.status === 'Confirmed') && (
                      <div className="order-actions-primary-row">
                        {ord.status === 'Pending' && isFarmer && !isViewingPurchases && (
                          <button
                            type="button"
                            className="order-primary-btn"
                            disabled={isUpdatingStatus}
                            onClick={() => {
                              if (ord.deliveryMethod === 'pickup') {
                                handleUpdateStatus(ord.id, 'confirmed', 0);
                              } else {
                                setOrderToSetShipping(ord);
                                setShippingFeeInput(ord.shippingFee || 0);
                              }
                            }}
                            style={{
                              padding: '10px 20px',
                              borderRadius: '10px',
                              backgroundColor: '#16A34A',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '15px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 4px rgba(22,163,74,0.2)',
                            }}
                          >
                            <span>{ord.deliveryMethod === 'pickup' ? '✓' : '⚡'}</span>
                            <span>{ord.deliveryMethod === 'pickup' ? 'Accept & Confirm Order' : 'Quote Shipping Fee'}</span>
                          </button>
                        )}

                        {ord.status === 'Pending' && (isBuyer || isViewingPurchases) && (
                          <span
                            className="order-status-waiting"
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#D97706',
                              backgroundColor: '#FEF3C7',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>⏳</span>
                            <span>Waiting for Farmer Confirmation</span>
                          </span>
                        )}

                        {ord.status === 'Quoted' && isFarmer && !isViewingPurchases && (
                          <span
                            className="order-status-waiting"
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#D97706',
                              backgroundColor: '#FEF3C7',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>⏳</span>
                            <span>Awaiting Buyer Quote Approval</span>
                          </span>
                        )}

                        {(() => {
                          const isCOD = ord.paymentMethod === 'cod' || parseContactMessage(ord.contactMessage).payment.toLowerCase().includes('cash on delivery') || parseContactMessage(ord.contactMessage).payment.toLowerCase().includes('cod');
                          const hasSubmittedPayment = Boolean(ord.paymentRefNo) || Boolean(ord.paymentProofUrl) || ord.paymentStatus === 'paid';
                          const isPaid = ord.paymentStatus === 'paid';

                          if (ord.status !== 'Confirmed') return null;

                          // For the farmer: on digital non-COD orders, the farmer must verify payment first via "Verify & Confirm Payment Received".
                          // Do not show completion button until payment is verified, preventing duplicate "Confirm Payment" buttons.
                          if (isFarmer && !isViewingPurchases) {
                            if (!isCOD && !isPaid) {
                              return null;
                            }
                          }

                          // For the buyer: on non-COD orders, buyer must submit payment ref/proof first before confirming receipt.
                          if (isViewingAsBuyer) {
                            if (!isCOD && !hasSubmittedPayment) {
                              return null;
                            }
                          }

                          return (
                            <button
                              type="button"
                              className="order-primary-btn"
                              disabled={isUpdatingStatus}
                              onClick={() => handleUpdateStatus(ord.id, 'completed')}
                              style={{
                                padding: '10px 20px',
                                borderRadius: '10px',
                                backgroundColor: (isFarmer && !isViewingPurchases) ? '#16A34A' : '#2563EB',
                                color: '#FFFFFF',
                                fontWeight: 700,
                                fontSize: '14px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: (isFarmer && !isViewingPurchases)
                                  ? '0 2px 6px rgba(22,163,74,0.25)'
                                  : '0 2px 6px rgba(37,99,235,0.25)',
                              }}
                            >
                              <span>{(isFarmer && !isViewingPurchases) ? (isCOD ? '💵' : '✓') : '✓'}</span>
                              <span>
                                {isUpdatingStatus
                                  ? 'Updating...'
                                  : (isFarmer && !isViewingPurchases)
                                    ? (isCOD ? `Confirm COD Payment & Complete (₱${ord.total.toLocaleString()})` : '✓ Mark Order as Completed')
                                    : 'Confirm Produce Received & Paid'}
                              </span>
                            </button>
                          );
                        })()}


                        {/* Cancel Order button with Seller Restriction Guard */}
                        {ord.status === 'Pending' && (
                          <>
                            {isFarmer && !isViewingPurchases && ord.paymentMethod !== 'cod' && (ord.paymentStatus === 'paid' || ord.paymentRefNo) ? (
                              <span
                                title="Customer has already submitted payment for this non-COD order. Seller cancellation is restricted."
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: '10px',
                                  backgroundColor: '#F1F5F9',
                                  border: '1.5px solid #CBD5E1',
                                  color: '#64748B',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span>🔒</span>
                                <span>Paid — Cancellation Restricted</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="order-cancel-btn"
                                disabled={isUpdatingStatus}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderToCancel(ord);
                                }}
                                style={{
                                  padding: '10px 16px',
                                  borderRadius: '10px',
                                  border: '1.5px solid #FECACA',
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  fontWeight: 700,
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <span>✕</span>
                                <span>Cancel Order</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Secondary Utility Actions */}
                    <div className="order-actions-secondary-row">
                      {/* Chat with other party */}
                      {((isViewingPurchases && ord.farmerId) || (isFarmer && !isViewingPurchases && ord.buyerId) || (isBuyer && ord.farmerId)) && (
                        <button
                          type="button"
                          className="order-chat-btn"
                          onClick={() => handleChatOrderParty(ord)}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '10px',
                            backgroundColor: '#EFFDF5',
                            color: '#0E4A27',
                            fontWeight: 700,
                            fontSize: '14px',
                            border: '1.5px solid #16A34A',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          title={isViewingPurchases ? `Chat with Farmer (${ord.farmerName || 'Farmer'})` : (isFarmer ? `Chat with Buyer (${ord.buyerName})` : `Chat with Farmer (${ord.farmerName || 'Farmer'})`)}
                        >
                          <span>💬</span>
                          <span>{isViewingPurchases ? 'Chat Farmer' : (isFarmer ? 'Chat Buyer' : 'Chat Farmer')}</span>
                        </button>
                      )}

                      <button
                        className="order-btn-details"
                        onClick={() => setSelectedOrder(ord)}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A',
                          fontWeight: 700,
                          fontSize: '15px',
                          cursor: 'pointer',
                        }}
                      >
                        View Order Details →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            padding: '60px 24px',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '2px dashed #CBD5E1',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🌾📦</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
            No orders found in "{selectedTab}"
          </h2>
          <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '480px', margin: '0 auto 20px auto' }}>
            {searchQuery
              ? `No match found for "${searchQuery}". Try clearing your search query.`
              : isFarmer
                ? 'No incoming crop orders yet. When buyers request to purchase your harvest on AgriConnect, their order slips and delivery requests will appear here.'
                : 'You have not ordered any fresh crops yet. Connect directly with local farmers across Northern Mindanao.'}
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                backgroundColor: '#0E4A27',
                color: '#FFFFFF',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Clear Search Query
            </button>
          ) : (
            <button
              onClick={() => navigate(isFarmer ? '/produce/manage' : '/produce')}
              className="btn btn-primary btn-large"
              style={{ padding: '12px 24px', fontSize: '15px', fontWeight: 800 }}
            >
              {isFarmer ? 'View My Crop Listings →' : 'Browse Produce Marketplace →'}
            </button>
          )}
        </div>
      )}

      {/* ─── High-Fidelity Order Details Modal ─── */}
      {selectedOrder && (() => {
        const parsedModal = parseContactMessage(selectedOrder.contactMessage);
        const modalBadge = getStatusBadgeStyle(selectedOrder.status);
        const modalCropIcon = getCropIcon(selectedOrder.product);
        const isPending = selectedOrder.status === 'Pending';
        const isQuoted = selectedOrder.status === 'Quoted';
        const isConfirmed = selectedOrder.status === 'Confirmed';
        const isCompleted = selectedOrder.status === 'Completed';
        const isCancelled = selectedOrder.status === 'Cancelled';

        return (
          <div
            className="modal-backdrop"
            onClick={() => setSelectedOrder(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '620px',
                width: '100%',
                maxHeight: '92vh',
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                padding: 0,
                animation: 'modalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* 1. Sleek Sticky Header */}
              <div
                style={{
                  padding: '18px 24px',
                  backgroundColor: '#FFFFFF',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: '#16A34A',
                        backgroundColor: '#DCFCE7',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      RECEIPT & DETAILS
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleCopyId(selectedOrder.id, e)}
                      title="Click to copy full Order ID"
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#334155',
                        backgroundColor: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{formatOrderId(selectedOrder.id)}</span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        {copiedId === selectedOrder.id ? '✓' : '📋'}
                      </span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Order Summary
                    </h2>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      • 📅 {selectedOrder.date}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      padding: '5px 12px',
                      borderRadius: '16px',
                      backgroundColor: modalBadge.bg,
                      color: modalBadge.color,
                      fontWeight: 800,
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {modalBadge.label}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    aria-label="Close modal"
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #E2E8F0',
                      color: '#64748B',
                      fontSize: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E2E8F0';
                      e.currentTarget.style.color = '#0F172A';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F1F5F9';
                      e.currentTarget.style.color = '#64748B';
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 2. Scrollable Body */}
              <div
                style={{
                  padding: '20px 24px',
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* ── Section A: Digital Invoice & Crop Summary Card (Prominently at the top!) ── */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '14px',
                          backgroundColor: '#F1F5F9',
                          border: '1.5px solid #E2E8F0',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '26px',
                          flexShrink: 0,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                        }}
                      >
                        <img
                          src={getImageUrl(selectedOrder.photo, getCropImageFallback(selectedOrder.product))}
                          alt={selectedOrder.product}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            if (target.parentElement) {
                              target.parentElement.innerHTML = `<span style="font-size: 26px;">${modalCropIcon}</span>`;
                            }
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                          {selectedOrder.product}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span>Quantity: <strong style={{ color: '#0F172A' }}>{selectedOrder.quantity}</strong></span>
                          <span>•</span>
                          <span>₱{(selectedOrder.unitPrice || (selectedOrder.total / (selectedOrder.quantityNum || 1))).toFixed(2)} / kg</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#0E4A27' }}>
                        ₱{selectedOrder.total.toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#16A34A',
                          backgroundColor: '#DCFCE7',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-block',
                          marginTop: '2px',
                        }}
                      >
                        {isCompleted ? '✓ Paid' : parsedModal.payment}
                      </div>
                    </div>
                  </div>

                  {/* Itemized Cost Breakdown */}
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #E2E8F0', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                      <span>Crop Harvest Subtotal</span>
                      <span style={{ fontWeight: 600, color: '#334155' }}>
                        ₱{(selectedOrder.subtotal ?? (selectedOrder.total - (selectedOrder.shippingFee || 0))).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                      <span>
                        Hauling / Delivery Fee
                        {selectedOrder.deliveryMethod === 'pickup' && <span style={{ color: '#16A34A', fontWeight: 600 }}> (Farm-Gate Pickup)</span>}
                      </span>
                      <span style={{ fontWeight: 600, color: selectedOrder.deliveryMethod === 'pickup' ? '#16A34A' : (selectedOrder.shippingFee ? '#0F172A' : '#D97706') }}>
                        {selectedOrder.deliveryMethod === 'pickup'
                          ? '₱0 (FREE)'
                          : selectedOrder.shippingFee !== undefined && selectedOrder.shippingFee > 0
                            ? `₱${selectedOrder.shippingFee.toLocaleString()}`
                            : (isPending ? 'Pending Farmer Confirmation' : '₱0 (FREE)')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #E2E8F0', fontSize: '15px', fontWeight: 800 }}>
                      <span style={{ color: '#0F172A' }}>Total Order Value</span>
                      <span style={{ color: '#0E4A27' }}>₱{selectedOrder.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* ── Section B: Order Lifecycle Tracker with True Connecting Track Line ── */}
                {isCancelled ? (
                  <div
                    style={{
                      backgroundColor: '#FEF2F2',
                      border: '1.5px solid #FECACA',
                      borderRadius: '16px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#991B1B' }}>
                        Order Cancelled
                      </div>
                      <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '2px' }}>
                        This transaction was cancelled. Reserved harvest ({selectedOrder.quantity}) was safely restored to the listing.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '16px',
                      padding: '14px 18px 16px 18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B' }}>
                        Order Lifecycle Tracker
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: isCompleted ? '#16A34A' : isConfirmed ? '#2563EB' : isQuoted ? '#D97706' : '#D97706' }}>
                        {isPending && '⏳ Waiting for Farmer Confirmation'}
                        {isQuoted && '⚡ Quoted · Awaiting Buyer Decision'}
                        {isConfirmed && '🚚 Ready for Delivery / Pickup'}
                        {isCompleted && '✓ Completed & Delivered'}
                      </span>
                    </div>

                    {/* Stepper with continuous connecting bar */}
                    <div style={{ position: 'relative', padding: '0 8px' }}>
                      {/* Gray Background Track */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '15px',
                          left: '32px',
                          right: '32px',
                          height: '3px',
                          backgroundColor: '#E2E8F0',
                          zIndex: 1,
                        }}
                      >
                        {/* Green Active Fill Track */}
                        <div
                          style={{
                            height: '100%',
                            backgroundColor: '#16A34A',
                            width: isCompleted ? '100%' : isConfirmed ? '66%' : isQuoted ? '33%' : '10%',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                        {[
                          { stepNum: 1, title: 'Placed', full: '1. Order Placed' },
                          { stepNum: 2, title: 'Confirmed', full: '2. Confirmed' },
                          { stepNum: 3, title: 'In Transit', full: '3. In Transit' },
                          { stepNum: 4, title: 'Delivered', full: '4. Delivered' },
                        ].map((s) => {
                          const stepDone = isCompleted
                            ? true
                            : isConfirmed
                              ? s.stepNum <= 3
                              : isQuoted
                                ? s.stepNum <= 2
                                : s.stepNum === 1;

                          const isCurrent = isCompleted
                            ? s.stepNum === 4
                            : isConfirmed
                              ? s.stepNum === 3
                              : isQuoted
                                ? s.stepNum === 2
                                : s.stepNum === 1;

                          return (
                            <div
                              key={s.stepNum}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                width: '68px',
                              }}
                            >
                              <div
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '50%',
                                  backgroundColor: stepDone ? (isCurrent ? '#16A34A' : '#0E4A27') : '#E2E8F0',
                                  color: stepDone ? '#FFFFFF' : '#94A3B8',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '12px',
                                  boxShadow: isCurrent ? '0 0 0 3px rgba(22, 163, 74, 0.25)' : 'none',
                                  border: '2px solid #FFFFFF',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                {stepDone ? (s.stepNum === 4 ? '✓' : (isCurrent || s.stepNum === 1 ? '✓' : s.stepNum)) : s.stepNum}
                              </div>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: isCurrent ? 800 : 600,
                                  color: isCurrent ? '#0E4A27' : stepDone ? '#166534' : '#94A3B8',
                                  marginTop: '5px',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {s.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Section C: Clean Structured Logistics & Customer Grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  {/* Fulfillment Details */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>📍</span>
                      <span>Fulfillment & Logistics</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        {parsedModal.fulfillment.toLowerCase().includes('pickup') ? 'Farm-Gate Pickup' : 'Delivery Address'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4, marginTop: '2px' }}>
                        {parsedModal.fulfillment}
                      </div>
                    </div>
                    {parsedModal.notes && (
                      <div
                        style={{
                          marginTop: '4px',
                          padding: '6px 10px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                          fontSize: '11px',
                          color: '#475569',
                          fontStyle: 'italic',
                        }}
                      >
                        "{parsedModal.notes}"
                      </div>
                    )}
                  </div>

                  {/* Party & Contact Details */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: isViewingAsBuyer ? '#6D28D9' : '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>👤</span>
                      <span>{isViewingAsBuyer ? 'Selling Farmer' : 'Customer & Payment'}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{isViewingAsBuyer ? (selectedOrder.farmerName || 'Verified Farmer') : selectedOrder.buyerName}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '1px 6px', borderRadius: '4px' }}>
                          Verified
                        </span>
                      </div>
                    </div>

                    {/* Phone Row with Copy */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', backgroundColor: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📞</span>
                        <span>{parsedModal.phone || 'No phone'}</span>
                      </span>
                      {parsedModal.phone && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(parsedModal.phone);
                            toastInfo('Phone Copied', `${parsedModal.phone} copied.`);
                          }}
                          title="Copy Phone Number"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#0284C7',
                            padding: '2px 4px',
                            fontWeight: 700,
                          }}
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Sticky Action Footer */}
              <div
                style={{
                  padding: '14px 24px',
                  backgroundColor: '#F8FAFC',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 10,
                }}
              >
                <div>
                  {/* Cancel Button */}
                  {!isCancelled && !isCompleted && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => setOrderToCancel(selectedOrder)}
                      style={{
                        padding: '9px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #FECACA',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                    >
                      <span>✕</span>
                      <span>Cancel Order</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {parsedModal.phone && (
                    <a
                      href={`tel:${parsedModal.phone.replace(/[^0-9+]/g, '')}`}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        fontWeight: 700,
                        fontSize: '13px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>📞</span>
                      <span>{isViewingAsBuyer ? 'Call Farmer' : 'Call Buyer'}</span>
                    </a>
                  )}

                  {isPending && isFarmer && !isViewingPurchases && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={async () => {
                        if (selectedOrder.deliveryMethod === 'pickup') {
                          await handleUpdateStatus(selectedOrder.id, 'confirmed', 0);
                        } else {
                          setOrderToSetShipping(selectedOrder);
                          setShippingFeeInput(selectedOrder.shippingFee || 0);
                        }
                      }}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                      }}
                    >
                      <span>✓</span>
                      <span>{isUpdatingStatus ? 'Confirming...' : 'Accept & Confirm Order'}</span>
                    </button>
                  )}

                  {isPending && (isBuyer || isViewingPurchases) && (
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#D97706',
                        backgroundColor: '#FEF3C7',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>⏳</span>
                      <span>Awaiting Farmer Acceptance</span>
                    </span>
                  )}

                  {isQuoted && (isBuyer || isViewingPurchases) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleQuoteDecision(selectedOrder.id, 'approve')}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: '#16A34A',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(22,163,74,0.25)',
                        }}
                      >
                        <span>✓</span>
                        <span>Approve Total (₱{selectedOrder.total.toLocaleString()})</span>
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleQuoteDecision(selectedOrder.id, 'switch_pickup')}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '10px',
                          border: '1.5px solid #2563EB',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>🏪</span>
                        <span>Switch to Pickup (₱0 Fee)</span>
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleQuoteDecision(selectedOrder.id, 'reject')}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #FECACA',
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>✕</span>
                        <span>Decline Quote</span>
                      </button>
                    </div>
                  )}

                  {isQuoted && isFarmer && !isViewingPurchases && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#D97706',
                          backgroundColor: '#FEF3C7',
                          padding: '8px 14px',
                          borderRadius: '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>⏳</span>
                        <span>Quoted ₱{(selectedOrder.shippingFee || 0).toLocaleString()} · Awaiting Buyer Approval</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOrderToSetShipping(selectedOrder);
                          setShippingFeeInput(selectedOrder.shippingFee || 0);
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          border: '1px solid #D97706',
                          backgroundColor: '#FFFFFF',
                          color: '#B45309',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        Adjust Fee
                      </button>
                    </div>
                  )}

                  {(() => {
                    const isSelectedCOD = selectedOrder.paymentMethod === 'cod' || parseContactMessage(selectedOrder.contactMessage).payment.toLowerCase().includes('cash on delivery') || parseContactMessage(selectedOrder.contactMessage).payment.toLowerCase().includes('cod');
                    const hasSelectedSubmittedPayment = Boolean(selectedOrder.paymentRefNo) || Boolean(selectedOrder.paymentProofUrl) || selectedOrder.paymentStatus === 'paid';
                    const isSelectedPaid = selectedOrder.paymentStatus === 'paid';

                    if (!isConfirmed) return null;

                    if (isFarmer && !isViewingPurchases) {
                      if (!isSelectedCOD && !isSelectedPaid) {
                        return null;
                      }
                    }

                    if (isViewingAsBuyer) {
                      if (!isSelectedCOD && !hasSelectedSubmittedPayment) {
                        return null;
                      }
                    }

                    return (
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={async () => {
                          await handleUpdateStatus(selectedOrder.id, 'completed');
                        }}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: (isFarmer && !isViewingPurchases) ? '#16A34A' : '#2563EB',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: (isFarmer && !isViewingPurchases)
                            ? '0 2px 6px rgba(22, 163, 74, 0.25)'
                            : '0 2px 6px rgba(37, 99, 235, 0.25)',
                        }}
                      >
                        <span>{(isFarmer && !isViewingPurchases) ? (isSelectedCOD ? '💵' : '✓') : '✓'}</span>
                        <span>
                          {isUpdatingStatus
                            ? 'Updating...'
                            : (isFarmer && !isViewingPurchases)
                              ? (isSelectedCOD ? `Confirm COD Payment & Complete (₱${selectedOrder.total.toLocaleString()})` : '✓ Mark Order as Completed')
                              : 'Confirm Produce Received & Paid'}
                        </span>
                      </button>
                    );
                  })()}

                  {isCompleted && (
                    <div
                      style={{
                        padding: '9px 16px',
                        borderRadius: '10px',
                        backgroundColor: '#DCFCE7',
                        color: '#166534',
                        fontWeight: 800,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>✓</span>
                      <span>{(isFarmer && !isViewingPurchases) ? 'Payment Received · Completed' : 'Order Completed & Paid'}</span>
                    </div>
                  )}

                  {isCancelled && (
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(null)}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '10px',
                        backgroundColor: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        color: '#475569',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── In-App Cancel Order Confirmation Dialog ─── */}
      {orderToCancel && (
        <div
          className="modal-backdrop"
          onClick={() => !isUpdatingStatus && setOrderToCancel(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              padding: '24px',
              animation: 'modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Cancel Order?
                </h3>
                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                  Order {formatOrderId(orderToCancel.id)}
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '14px',
                padding: '14px 16px',
                fontSize: '13px',
                color: '#991B1B',
                lineHeight: 1.5,
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid #FECACA',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <img
                  src={getImageUrl(orderToCancel.photo, getCropImageFallback(orderToCancel.product))}
                  alt={orderToCancel.product}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                Are you sure you want to cancel this order for{' '}
                <strong>{orderToCancel.quantity}</strong> of <strong>{orderToCancel.product}</strong>?
                <div style={{ marginTop: '4px', color: '#B91C1C', fontWeight: 600, fontSize: '12px' }}>
                  🌾 Reserved harvest will be immediately returned to the marketplace listing for other buyers.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => setOrderToCancel(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Nevermind, Keep Order
              </button>

              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={async () => {
                  const id = orderToCancel.id;
                  await handleUpdateStatus(id, 'cancelled');
                  if (selectedOrder && selectedOrder.id === id) {
                    setSelectedOrder((prev) => (prev ? { ...prev, status: 'Cancelled' } : null));
                  }
                  setOrderToCancel(null);
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                }}
              >
                <span>✕</span>
                <span>{isUpdatingStatus ? 'Cancelling...' : 'Yes, Cancel Order'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Farmer Delivery / Hauling Fee Confirmation Modal ─── */}
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
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#EFFDF5',
                  color: '#16A34A',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #BBF7D0',
                }}
              >
                🚚
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                  Set Crop Delivery / Hauling Fee
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
                  Order #{orderToSetShipping.id.slice(-6).toUpperCase()} · {orderToSetShipping.product} ({orderToSetShipping.quantity})
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '20px',
                border: '1px solid #E2E8F0',
                fontSize: '13px',
              }}
            >
              <div style={{ color: '#334155', marginBottom: '6px' }}>
                📍 <strong>Delivery Address:</strong> {orderToSetShipping.deliveryAddress || orderToSetShipping.buyerLocation || 'Buyer Address'}
              </div>
              <div style={{ color: '#64748B', fontSize: '12px', lineHeight: '1.4' }}>
                As the farmer supplying this harvest, confirm the trucking/hauling fee based on the vehicle (trike, multicab, or truck) you arranged locally to deliver this produce to the buyer.
              </div>
            </div>

            {/* Quick Vehicle Presets */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quick Hauling Presets
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Free Delivery', fee: 0, icon: '🎁' },
                  { label: 'Trike / Bike', fee: 150, icon: '🛵' },
                  { label: 'Multicab', fee: 500, icon: '🛻' },
                  { label: 'Canter / Truck', fee: 1500, icon: '🚚' },
                  { label: 'Elf 6-Wheeler', fee: 3500, icon: '🚛' },
                  { label: '10-W Forwarder', fee: 7500, icon: '🏗️' },
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
                      border: `1.5px solid ${shippingFeeInput === preset.fee ? '#16A34A' : '#E2E8F0'}`,
                      backgroundColor: shippingFeeInput === preset.fee ? '#F0FDF4' : '#FFFFFF',
                      color: shippingFeeInput === preset.fee ? '#166534' : '#334155',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>{preset.icon} {preset.label}</div>
                    <div style={{ fontSize: '11px', color: shippingFeeInput === preset.fee ? '#16A34A' : '#64748B', marginTop: '2px' }}>
                      {preset.fee === 0 ? '₱0' : `₱${preset.fee.toLocaleString()}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Numeric Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Exact Delivery / Hauling Fee (₱)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748B', fontSize: '16px' }}>
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
                    border: '1.5px solid #CBD5E1',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Live Calculation */}
            {(() => {
              const subtotal = orderToSetShipping.subtotal ?? (orderToSetShipping.total - (orderToSetShipping.shippingFee || 0));
              const newTotal = subtotal + shippingFeeInput;
              return (
                <div
                  style={{
                    backgroundColor: '#F1F5F9',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    marginBottom: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                    <span>Crop Subtotal:</span>
                    <span style={{ fontWeight: 600 }}>₱{subtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                    <span>Confirmed Hauling Fee:</span>
                    <span style={{ fontWeight: 700, color: '#16A34A' }}>₱{shippingFeeInput.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '6px', fontSize: '15px', fontWeight: 800 }}>
                    <span style={{ color: '#0F172A' }}>Updated Order Total:</span>
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
                  border: '1.5px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
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
                disabled={isUpdatingStatus}
                onClick={async () => {
                  const targetOrder = orderToSetShipping;
                  setOrderToSetShipping(null);
                  await handleUpdateStatus(targetOrder.id, 'confirmed', shippingFeeInput);
                }}
                style={{
                  padding: '11px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                }}
              >
                Confirm & Send Quote to Buyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Non-COD Payment Reference & Receipt Proof Submission Modal ─── */}
      {orderToSubmitRef && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          onClick={() => setOrderToSubmitRef(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '26px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💳 Submit Payment Reference & Proof</span>
              </h3>
              <button
                type="button"
                onClick={() => setOrderToSubmitRef(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94A3B8', cursor: 'pointer' }}
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
                  Harvest Order #{orderToSubmitRef.id.slice(-6).toUpperCase()}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#16A34A' }}>
                  ₱{orderToSubmitRef.total.toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                Farmer: <strong>{orderToSubmitRef.farmerName || 'Selling Farmer'}</strong> • Crop: <strong>{orderToSubmitRef.product} ({orderToSubmitRef.quantity})</strong>
              </div>
            </div>

            {/* Seller Account Details Card */}
            <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Seller Payment Details</span>
                <span style={{ fontSize: '11.5px', color: '#16A34A', fontWeight: 800, background: '#DCFCE7', padding: '2px 8px', borderRadius: '10px' }}>
                  Send Total: ₱{orderToSubmitRef.total.toLocaleString()}
                </span>
              </div>

              {loadingModalProfile ? (
                <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>Loading farmer payment details…</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>GCash / Maya / Phone:</span>
                    <span style={{ color: '#0F172A', fontWeight: 800 }}>
                      {modalFarmerProfile?.phone || modalFarmerProfile?.gcashNumber || 'Not specified'}
                    </span>
                  </div>
                  {(modalFarmerProfile?.phone || modalFarmerProfile?.gcashNumber) && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => copyModalText(modalFarmerProfile?.phone || modalFarmerProfile?.gcashNumber || '', 'Payment Number')}
                        style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '6px', background: '#E0F2FE', color: '#0369A1', border: 'none', cursor: 'pointer' }}
                      >
                        📋 {copiedModalText === 'Payment Number' ? 'Copied!' : 'Copy Payment Number'}
                      </button>
                    </div>
                  )}
                  {/* Warning if selected method not configured */}
                  {orderToSubmitRef.paymentMethod === 'maya' && !modalFarmerProfile?.mayaNumber && !modalFarmerProfile?.mayaQrUrl && (
                    <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '10px 12px', marginTop: '4px' }}>
                      <div style={{ fontWeight: 800, color: '#92400E', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        ⚠️ Farmer Has Not Configured Maya
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#78350F', lineHeight: 1.4, marginBottom: '6px' }}>
                        This farmer hasn't set up Maya yet. You can transfer using their alternate verified accounts below or scan their QRPh code:
                      </div>
                      {(modalFarmerProfile?.gcashNumber || modalFarmerProfile?.phone) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #FDE68A', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>
                            📱 GCash: {modalFarmerProfile.gcashNumber || modalFarmerProfile.phone}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyModalText(modalFarmerProfile.gcashNumber || modalFarmerProfile.phone || '', 'GCash Number')}
                            style={{ padding: '2px 8px', fontSize: '10.5px', fontWeight: 700, borderRadius: '4px', background: '#E0F2FE', color: '#0284C7', border: 'none', cursor: 'pointer' }}
                          >
                            📋 {copiedModalText === 'GCash Number' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      )}
                      {modalFarmerProfile?.bankAccountNo && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                          <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>
                            🏦 {modalFarmerProfile.bankName || 'Bank'}: {modalFarmerProfile.bankAccountNo}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyModalText(modalFarmerProfile.bankAccountNo || '', 'Bank Account')}
                            style={{ padding: '2px 8px', fontSize: '10.5px', fontWeight: 700, borderRadius: '4px', background: '#E2E8F0', color: '#334155', border: 'none', cursor: 'pointer' }}
                          >
                            📋 {copiedModalText === 'Bank Account' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {orderToSubmitRef.paymentMethod === 'bank_transfer' && !modalFarmerProfile?.bankAccountNo && !modalFarmerProfile?.bankQrUrl && (
                    <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '10px 12px', marginTop: '4px' }}>
                      <div style={{ fontWeight: 800, color: '#92400E', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        ⚠️ Farmer Has Not Configured Bank Account
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#78350F', lineHeight: 1.4, marginBottom: '6px' }}>
                        This farmer hasn't set up bank details yet. You can transfer using their alternate accounts below:
                      </div>
                      {(modalFarmerProfile?.gcashNumber || modalFarmerProfile?.phone) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #FDE68A', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700 }}>
                            📱 GCash: {modalFarmerProfile.gcashNumber || modalFarmerProfile.phone}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyModalText(modalFarmerProfile.gcashNumber || modalFarmerProfile.phone || '', 'GCash Number')}
                            style={{ padding: '2px 8px', fontSize: '10.5px', fontWeight: 700, borderRadius: '4px', background: '#E0F2FE', color: '#0284C7', border: 'none', cursor: 'pointer' }}
                          >
                            📋 {copiedModalText === 'GCash Number' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* GCash QR */}
                  {(!orderToSubmitRef.paymentMethod || orderToSubmitRef.paymentMethod === 'gcash') && modalFarmerProfile?.gcashQrUrl && (
                    <div style={{ marginTop: '6px', textAlign: 'center', background: '#FFFFFF', padding: '10px', borderRadius: '12px', border: '1.5px dashed #BAE6FD' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284C7', marginBottom: '6px' }}>Scan GCash QR Code:</div>
                      <img src={getImageUrl(modalFarmerProfile.gcashQrUrl)} alt="GCash QR Code" style={{ maxWidth: '160px', maxHeight: '160px', borderRadius: '10px', border: '1px solid #E2E8F0' }} />
                    </div>
                  )}

                  {/* Maya QR */}
                  {(!orderToSubmitRef.paymentMethod || orderToSubmitRef.paymentMethod === 'maya') && (modalFarmerProfile?.mayaQrUrl || (orderToSubmitRef.paymentMethod === 'maya' && modalFarmerProfile?.gcashQrUrl)) && (
                    <div style={{ marginTop: '6px', textAlign: 'center', background: '#FFFFFF', padding: '10px', borderRadius: '12px', border: '1.5px dashed #DDD6FE' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#6D28D9', marginBottom: '6px' }}>
                        {modalFarmerProfile?.mayaQrUrl ? 'Scan Maya QR Code:' : 'Scan Seller QR Code (QRPh / Maya Compatible):'}
                      </div>
                      <img src={getImageUrl(modalFarmerProfile?.mayaQrUrl || modalFarmerProfile?.gcashQrUrl || '')} alt="Maya QR Code" style={{ maxWidth: '160px', maxHeight: '160px', borderRadius: '10px', border: '1px solid #E2E8F0' }} />
                    </div>
                  )}

                  {/* Bank QR */}
                  {(!orderToSubmitRef.paymentMethod || orderToSubmitRef.paymentMethod === 'bank_transfer') && (modalFarmerProfile?.bankQrUrl || (orderToSubmitRef.paymentMethod === 'bank_transfer' && modalFarmerProfile?.gcashQrUrl)) && (
                    <div style={{ marginTop: '6px', textAlign: 'center', background: '#FFFFFF', padding: '10px', borderRadius: '12px', border: '1.5px dashed #CBD5E1' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                        {modalFarmerProfile?.bankQrUrl ? 'Scan Bank / InstaPay QR Code:' : 'Scan Seller QR Code (InstaPay / QRPh Compatible):'}
                      </div>
                      <img src={getImageUrl(modalFarmerProfile?.bankQrUrl || modalFarmerProfile?.gcashQrUrl || '')} alt="Bank QR Code" style={{ maxWidth: '160px', maxHeight: '160px', borderRadius: '10px', border: '1px solid #E2E8F0' }} />
                    </div>
                  )}
                </div>
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
                  Enter the transaction reference number from your GCash, Maya, or Bank receipt.
                </div>
              </div>

              {/* Receipt Image Proof Uploader */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  Proof of Transaction / Receipt Photo <span style={{ color: '#EF4444' }}>*</span> <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>(Required)</span>
                </label>

                {submittingProofUrl ? (
                  <div style={{ position: 'relative', background: '#F8FAFC', padding: '10px', borderRadius: '12px', border: '1.5px solid #16A34A', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={getImageUrl(submittingProofUrl)} alt="Receipt Proof Preview" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>✓ Receipt Photo Uploaded</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Click change to upload a different image receipt.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubmittingProofUrl('')}
                      style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProofFileChange}
                      disabled={uploadingProof}
                      style={{ display: 'none' }}
                      id="produce-receipt-upload-input"
                    />
                    <label
                      htmlFor="produce-receipt-upload-input"
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: '2px dashed #0284C7',
                        background: '#F0F9FF',
                        color: '#0369A1',
                        fontWeight: 700,
                        fontSize: '13px',
                        textAlign: 'center',
                        cursor: uploadingProof ? 'wait' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>📸</span>
                      <span>{uploadingProof ? 'Uploading Receipt Image…' : 'Click to Upload Transaction Receipt Image'}</span>
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Supports JPG, PNG, WEBP receipts</span>
                    </label>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setOrderToSubmitRef(null)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRef || uploadingProof || !submittingRefInput.trim() || !submittingProofUrl}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isSubmittingRef || uploadingProof || !submittingRefInput.trim() || !submittingProofUrl ? '#94A3B8' : '#0284C7',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: isSubmittingRef || uploadingProof || !submittingRefInput.trim() || !submittingProofUrl ? 'not-allowed' : 'pointer',
                    boxShadow: isSubmittingRef || uploadingProof || !submittingRefInput.trim() || !submittingProofUrl ? 'none' : '0 2px 6px rgba(2,132,199,0.3)',
                  }}
                >
                  {isSubmittingRef ? 'Submitting…' : 'Submit Reference & Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
