import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supplyApi } from '../api/supply';
import { produceApi } from '../api/produce';
import { api, getImageUrl } from '../api';
import { useToast } from '../contexts/ToastContext';
import type { DeliveryMethod, PaymentMethod, SupplyProduct } from '../types/supply';
import type { PublicUserProfile } from '../types/auth';

interface CartItem {
  product: SupplyProduct;
  quantity: number;
}

interface ProduceCartItem {
  id: string;
  listing: any;
  quantity: number;
}

const getPaymentOptions = (isPickup: boolean): {
  id: PaymentMethod;
  label: string;
  icon: string;
  desc: string;
  comingSoon?: boolean;
}[] => [
  {
    id: 'cod',
    label: isPickup ? 'Cash on Pickup' : 'Cash on Delivery',
    icon: '💵',
    desc: isPickup ? 'Pay in cash upon in-store collection.' : 'Pay in cash when your order arrives.',
  },
  {
    id: 'gcash',
    label: 'GCash Direct QR',
    icon: '📱',
    desc: 'Scan QR code or transfer to seller GCash.',
  },
  {
    id: 'maya',
    label: 'Maya Direct',
    icon: '💜',
    desc: 'Send via Maya e-wallet.',
  },
  {
    id: 'bank_transfer',
    label: 'Bank Transfer (InstaPay)',
    icon: '🏦',
    desc: 'Direct transfer to seller bank account.',
  },
  {
    id: 'card',
    label: 'Credit / Debit Card',
    icon: '💳',
    desc: 'Visa, Mastercard via gateway.',
    comingSoon: true,
  },
];

export const CheckoutPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const checkoutState = location.state as {
    type?: 'supplies' | 'produce';
    selectedSupplyItems?: CartItem[];
    selectedProduceItems?: ProduceCartItem[];
  } | null;

  const orderType = checkoutState?.type || 'supplies';
  const supplyItems = checkoutState?.selectedSupplyItems || [];
  const produceItems = checkoutState?.selectedProduceItems || [];

  const [activeSupplyItems, setActiveSupplyItems] = useState<CartItem[]>(supplyItems);
  const [activeProduceItems, setActiveProduceItems] = useState<ProduceCartItem[]>(produceItems);

  useEffect(() => {
    if (orderType === 'supplies' && activeSupplyItems.length === 0) {
      const raw = sessionStorage.getItem('agriconnect_checkout_supplies');
      if (raw) {
        try {
          setActiveSupplyItems(JSON.parse(raw));
        } catch {
          navigate('/cart');
        }
      } else {
        navigate('/cart');
      }
    } else if (orderType === 'produce' && activeProduceItems.length === 0) {
      const raw = sessionStorage.getItem('agriconnect_checkout_produce');
      if (raw) {
        try {
          setActiveProduceItems(JSON.parse(raw));
        } catch {
          navigate('/cart');
        }
      } else {
        navigate('/cart');
      }
    }
  }, [orderType]);

  // Delivery & Address States
  const defaultAddress = user ? [user.barangay, user.municipality, user.province].filter(Boolean).join(', ') || user.address || '' : '';
  const [deliveryAddress, setDeliveryAddress] = useState(defaultAddress);
  const [recipientPhone, setRecipientPhone] = useState(user?.phone || '');
  const [recipientName, setRecipientName] = useState(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : '');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');

  // Address edit modal state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [tempAddress, setTempAddress] = useState(deliveryAddress);
  const [tempPhone, setTempPhone] = useState(recipientPhone);
  const [tempName, setTempName] = useState(recipientName);

  // Payment States
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [paymentRefNo, setPaymentRefNo] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Seller Details Fetch
  const [sellerProfile, setSellerProfile] = useState<PublicUserProfile | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(false);

  const primarySupplierId = orderType === 'supplies'
    ? activeSupplyItems[0]?.product?.supplierId
    : activeProduceItems[0]?.listing?.farmerId;

  useEffect(() => {
    if (primarySupplierId) {
      setLoadingSeller(true);
      api.getUserPublicProfile(primarySupplierId)
        .then((data: PublicUserProfile) => setSellerProfile(data))
        .catch(() => setSellerProfile(null))
        .finally(() => setLoadingSeller(false));
    }
  }, [primarySupplierId]);

  // Pricing calculations
  const itemsSubtotal = orderType === 'supplies'
    ? activeSupplyItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
    : activeProduceItems.reduce((sum, i) => sum + (i.listing?.pricePerUnit || 0) * i.quantity, 0);

  // Shipping fee: ₱0 by default (or to be quoted by seller upon order acceptance)
  const shippingFee: number = 0;
  const grandTotal = itemsSubtotal + shippingFee;

  const handleSaveAddress = () => {
    if (!tempAddress.trim()) {
      toastWarning('Address Required', 'Please enter a valid delivery address.');
      return;
    }
    if (!tempPhone.trim()) {
      toastWarning('Phone Required', 'Please enter a contact phone number.');
      return;
    }
    setDeliveryAddress(tempAddress.trim());
    setRecipientPhone(tempPhone.trim());
    setRecipientName(tempName.trim());
    setShowAddressModal(false);
    toastSuccess('Address Updated', 'Delivery details updated for this order.');
  };

  const handlePlaceOrder = async () => {
    if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
      toastWarning('Address Missing', 'Please provide a delivery address before placing your order.');
      setShowAddressModal(true);
      return;
    }

    if (!recipientPhone.trim()) {
      toastWarning('Phone Required', 'Please provide a contact phone number.');
      setShowAddressModal(true);
      return;
    }

    setPlacingOrder(true);

    if (orderType === 'supplies') {
      try {
        await supplyApi.createOrder({
          items: activeSupplyItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          deliveryMethod,
          deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : undefined,
          paymentMethod,
          paymentRefNo: paymentRefNo.trim() || undefined,
        });

        // Remove ordered items from cart
        const rawSupply = localStorage.getItem('agriconnect_cart');
        if (rawSupply) {
          try {
            const parsed: CartItem[] = JSON.parse(rawSupply);
            const orderedIds = new Set(activeSupplyItems.map((i) => i.product.id));
            const remaining = parsed.filter((i) => !orderedIds.has(i.product.id));
            localStorage.setItem('agriconnect_cart', JSON.stringify(remaining));
          } catch {}
        }
        sessionStorage.removeItem('agriconnect_checkout_supplies');

        toastSuccess(
          'Order Placed Successfully! 🎉',
          paymentMethod === 'cod'
            ? 'Your order has been sent to the supplier. Redirecting to My Supply Orders…'
            : 'Order submitted with payment details! Redirecting to My Supply Orders…'
        );

        setTimeout(() => navigate('/supply/orders'), 1800);
      } catch (err: any) {
        toastError('Order Failed', err.response?.data?.error || err.message || 'Failed to place supply order.');
      } finally {
        setPlacingOrder(false);
      }
    } else {
      // Produce Orders
      const successfulItemIds: string[] = [];
      const failedErrors: string[] = [];

      try {
        for (const item of activeProduceItems) {
          try {
            const refNoText = paymentRefNo.trim() ? ` • Ref No: ${paymentRefNo.trim()}` : '';
            const contactMsg = `Recipient: ${recipientName} (${recipientPhone}) • Fulfillment: ${deliveryMethod === 'delivery' ? `Delivery to ${deliveryAddress}` : 'Farm-Gate Pickup'} • Payment: ${paymentMethod.toUpperCase()}${refNoText}`;
            await produceApi.initiateTransaction({
              listingId: item.id,
              quantity: item.quantity,
              contactMessage: contactMsg,
              deliveryMethod: deliveryMethod,
              deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : undefined,
            });
            successfulItemIds.push(item.id);
          } catch (itemErr: any) {
            const errMsg = itemErr.response?.data?.error || itemErr.message || `Failed to order crop item`;
            failedErrors.push(errMsg);
          }
        }

        // Remove successfully ordered items from produce cart
        if (successfulItemIds.length > 0) {
          const rawProduce = localStorage.getItem('agriconnect_produce_cart');
          if (rawProduce) {
            try {
              const parsed: ProduceCartItem[] = JSON.parse(rawProduce);
              const remaining = parsed.filter((i) => !successfulItemIds.includes(i.id));
              localStorage.setItem('agriconnect_produce_cart', JSON.stringify(remaining));
            } catch {}
          }
          sessionStorage.removeItem('agriconnect_checkout_produce');
        }

        if (failedErrors.length > 0) {
          toastError('Checkout Issue', failedErrors.join(' • '));
        }

        if (successfulItemIds.length > 0) {
          toastSuccess('Harvest Crop Order Placed! 🌾', 'Order created successfully! Redirecting to My Crop Orders…');
          setTimeout(() => navigate('/produce/orders'), 1800);
        }
      } catch (err: any) {
        toastError('Order Failed', err.message || 'Failed to place crop order.');
      } finally {
        setPlacingOrder(false);
      }
    }
  };

  const sellerDisplayName = sellerProfile
    ? `${sellerProfile.firstName || ''} ${sellerProfile.lastName || ''}`.trim() || 'Seller Account'
    : (orderType === 'supplies' ? activeSupplyItems[0]?.product?.supplierName || 'Farm Supplier' : 'Farmer / Seller');

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '60px' }}>
      {/* Top Header & Steps Bar */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/cart')}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontWeight: 600,
                fontSize: '13px',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ← Back to Cart
            </button>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🛍️ Check Out
            </h1>
          </div>

          {/* Shopee-style Progress Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600 }}>
            <span style={{ color: '#64748b' }}>1. Shopping Cart</span>
            <span style={{ color: '#cbd5e1' }}>›</span>
            <span style={{ color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: '20px' }}>2. Checkout & Payment</span>
            <span style={{ color: '#cbd5e1' }}>›</span>
            <span style={{ color: '#94a3b8' }}>3. Order Complete</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '24px auto', padding: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
          
          {/* Main Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. Delivery Address Card (Shopee Style) */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                overflow: 'hidden',
              }}
            >
              <div style={{ height: '5px', background: 'linear-gradient(90deg, #16a34a 0%, #059669 50%, #0d9488 100%)' }} />
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: 800, fontSize: '15px' }}>
                    📍 Delivery Address & Contact
                  </div>
                  <button
                    onClick={() => {
                      setTempAddress(deliveryAddress);
                      setTempPhone(recipientPhone);
                      setTempName(recipientName);
                      setShowAddressModal(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Change Address
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{recipientName}</span>
                    <span style={{ color: '#64748b', fontSize: '14px', marginLeft: '10px' }}>({recipientPhone || 'No phone set'})</span>
                  </div>
                  <div style={{ flex: 1, minWidth: '240px', color: '#334155', fontSize: '14px', lineHeight: '1.4' }}>
                    {deliveryMethod === 'delivery' ? (
                      deliveryAddress ? deliveryAddress : <span style={{ color: '#dc2626', fontWeight: 600 }}>No address specified. Click Change Address to set.</span>
                    ) : (
                      <span style={{ color: '#059669', fontWeight: 600 }}>🏬 In-Store / Farm-Gate Pickup (No delivery required)</span>
                    )}
                  </div>
                  {deliveryMethod === 'delivery' && (
                    <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
                      DEFAULT
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Order Items Grouped by Seller */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '20px 24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              {/* Seller Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#15803d' }}>
                    {orderType === 'supplies' ? '🏪' : '🌾'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px' }}>
                      {sellerDisplayName}
                    </div>
                    {sellerProfile?.municipality && (
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        📍 {sellerProfile.municipality}, {sellerProfile.province}
                      </div>
                    )}
                  </div>
                </div>
                <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                  Verified Seller
                </span>
              </div>

              {/* Items Table / List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {orderType === 'supplies'
                  ? activeSupplyItems.map((item) => {
                      const img = item.product.images?.[0] ? getImageUrl(item.product.images[0]) : '';
                      return (
                        <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                          <img
                            src={img || 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=200&q=80'}
                            alt={item.product.name}
                            style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                          />
                          <div style={{ flex: 1, minWidth: '180px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{item.product.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Unit: {item.product.unit}</div>
                          </div>
                          <div style={{ textAlign: 'right', minWidth: '100px' }}>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>₱{item.product.price.toLocaleString()} × {item.quantity}</div>
                            <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '15px' }}>
                              ₱{(item.product.price * item.quantity).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  : activeProduceItems.map((item) => {
                      const img = item.listing?.images?.[0] ? getImageUrl(item.listing.images[0]) : '';
                      return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                          <img
                            src={img || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=200&q=80'}
                            alt={item.listing?.cropName || 'Crop'}
                            style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                          />
                          <div style={{ flex: 1, minWidth: '180px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{item.listing?.cropName}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Variety: {item.listing?.variety || 'Standard'}</div>
                          </div>
                          <div style={{ textAlign: 'right', minWidth: '100px' }}>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>₱{item.listing?.pricePerUnit} × {item.quantity}</div>
                            <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '15px' }}>
                              ₱{((item.listing?.pricePerUnit || 0) * item.quantity).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
              </div>

              {/* Delivery Option Selector inside seller card */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#334155' }}>Fulfillment Option:</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('delivery')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: deliveryMethod === 'delivery' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        background: deliveryMethod === 'delivery' ? '#f0fdf4' : '#ffffff',
                        color: deliveryMethod === 'delivery' ? '#15803d' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      🚚 Local Delivery (To be quoted by seller)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('pickup')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: deliveryMethod === 'pickup' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        background: deliveryMethod === 'pickup' ? '#f0fdf4' : '#ffffff',
                        color: deliveryMethod === 'pickup' ? '#15803d' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      🏬 Store / Farm Pickup (FREE - ₱0)
                    </button>
                  </div>
                </div>

                {/* Explanatory Banner */}
                {deliveryMethod === 'delivery' ? (
                  <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '12.5px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '10px', lineHeight: '1.4' }}>
                    <span style={{ fontSize: '16px' }}>ℹ️</span>
                    <span><strong>Seller Delivery Quote:</strong> The shipping/hauling fee will be quoted by the seller upon order acceptance based on delivery location and item weight. You can review and confirm the total fee before payment.</span>
                  </div>
                ) : (
                  <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '12.5px', color: '#166534', display: 'flex', alignItems: 'center', gap: '10px', lineHeight: '1.4' }}>
                    <span style={{ fontSize: '16px' }}>🏬</span>
                    <span><strong>Self Pickup:</strong> ₱0 shipping fee. Collect your item(s) directly at the seller's location after order acceptance.</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Payment Method Selection (Shopee Style) */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '20px 24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💳 Select Payment Method
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {getPaymentOptions(deliveryMethod === 'pickup').map((opt) => {
                  const isSelected = paymentMethod === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => !opt.comingSoon && setPaymentMethod(opt.id)}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
                        background: isSelected ? '#f0fdf4' : (opt.comingSoon ? '#f8fafc' : '#ffffff'),
                        cursor: opt.comingSoon ? 'not-allowed' : 'pointer',
                        opacity: opt.comingSoon ? 0.6 : 1,
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '22px' }}>{opt.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: isSelected ? '#15803d' : '#1e293b' }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{opt.desc}</div>
                        </div>
                        {isSelected && <span style={{ color: '#16a34a', fontWeight: 900 }}>✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Digital Payment Info & Seller Details Box */}
              {(paymentMethod === 'gcash' || paymentMethod === 'maya' || paymentMethod === 'bank_transfer') && (
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📱 Seller Direct Payment Details:
                  </div>

                  {loadingSeller ? (
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Loading seller details…</div>
                  ) : sellerProfile ? (
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Account Name</div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                          {sellerProfile.gcashName || `${sellerProfile.firstName || ''} ${sellerProfile.lastName || ''}`.trim()}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Number / Phone</div>
                        <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '15px' }}>
                          {paymentMethod === 'gcash' ? (sellerProfile.gcashNumber || sellerProfile.phone) : (sellerProfile.mayaNumber || sellerProfile.phone)}
                        </div>
                      </div>
                      {sellerProfile.gcashQrUrl && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>QR Code</div>
                          <img
                            src={getImageUrl(sellerProfile.gcashQrUrl)}
                            alt="Seller Payment QR"
                            style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                      Contact seller after order placement to confirm transfer details.
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Transaction Reference Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 100234589012"
                      value={paymentRefNo}
                      onChange={(e) => setPaymentRefNo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Sticky Order Summary Card (Shopee Style) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                position: 'sticky',
                top: '20px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                Order Summary
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Merchandise Subtotal:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>₱{itemsSubtotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
                  <span>Shipping Fee Subtotal:</span>
                  {deliveryMethod === 'delivery' ? (
                    <span style={{ fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '3px 9px', borderRadius: '6px', fontSize: '12px' }}>
                      Pending Seller Quote
                    </span>
                  ) : (
                    <span style={{ fontWeight: 700, color: '#16a34a' }}>
                      FREE (₱0)
                    </span>
                  )}
                </div>
                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px' }}>Total Payment:</span>
                    <span style={{ fontWeight: 900, color: '#16a34a', fontSize: '22px' }}>
                      ₱{grandTotal.toLocaleString()}
                    </span>
                  </div>
                  {deliveryMethod === 'delivery' && (
                    <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 600, textAlign: 'right', marginTop: '4px' }}>
                      + Delivery fee to be quoted by seller
                    </div>
                  )}
                </div>
              </div>

              {/* Primary Place Order CTA */}
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: placingOrder ? '#94a3b8' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '16px',
                  border: 'none',
                  cursor: placingOrder ? 'not-allowed' : 'pointer',
                  boxShadow: placingOrder ? 'none' : '0 4px 14px rgba(22, 163, 74, 0.35)',
                  transition: 'all 0.15s ease',
                }}
              >
                {placingOrder ? 'Processing Order…' : 'Place Order Now'}
              </button>

              <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', marginTop: '14px', lineHeight: '1.4' }}>
                🔒 Safe & Verified AgriConnect Transaction
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Edit Address Modal */}
      {showAddressModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '16px',
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
              📍 Edit Delivery Address & Contact
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  placeholder="e.g. 09171234567"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Delivery Address (House/Street, Barangay, Municipality, Province)
                </label>
                <textarea
                  rows={3}
                  value={tempAddress}
                  onChange={(e) => setTempAddress(e.target.value)}
                  placeholder="e.g. Zone 4, Brgy. Central, Malaybalay City, Bukidnon"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAddress}
                style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
              >
                Save Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
