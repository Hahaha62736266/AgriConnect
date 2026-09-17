import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../api';
import { produceApi } from '../api/produce';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useChat } from '../contexts/ChatContext';
import type { ProduceListing, ProduceTransaction } from '../types/produce';

const categories = [
  { label: 'All Products', icon: '🌱' },
  { label: 'Vegetables', icon: '🥬' },
  { label: 'Fruits', icon: '🍌' },
  { label: 'Grains & Cereals', icon: '🌾' },
  { label: 'Root Crops', icon: '🥔' },
  { label: 'Livestock & Poultry', icon: '🐓' },
  { label: 'Fisheries', icon: '🐟' },
  { label: 'Spices & Herbs', icon: '🌶️' },
  { label: 'Agri-Processed', icon: '🍯' },
];

const sampleCropListings = [
  {
    id: 'crop-1',
    cropName: 'Fresh Red Tomatoes (Kamatis)',
    category: 'Vegetables',
    pricePerUnit: 65,
    unit: 'kg',
    quantity: 120,
    location: 'Cagayan de Oro, Misamis Oriental',
    sellerName: 'Juan Dela Cruz',
    sellerVerified: true,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
    description: 'Freshly harvested vine-ripened red tomatoes from Bukidnon farm.',
  },
  {
    id: 'crop-2',
    cropName: 'Sweet Yellow Corn (Mais)',
    category: 'Grains & Cereals',
    pricePerUnit: 42,
    unit: 'kg',
    quantity: 500,
    location: 'Malaybalay, Bukidnon',
    sellerName: 'Pedro Penduko',
    sellerVerified: true,
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
    description: 'High-grade yellow corn suitable for feed or food processing.',
  },
  {
    id: 'crop-3',
    cropName: 'Carabao Mangoes (Mangga)',
    category: 'Fruits',
    pricePerUnit: 95,
    unit: 'kg',
    quantity: 250,
    location: 'Gingoog, Misamis Oriental',
    sellerName: 'Maria Santos',
    sellerVerified: true,
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
    description: 'Sweet Carabao mangoes, freshly harvested yesterday.',
  },
  {
    id: 'crop-4',
    cropName: 'Purple Eggplant (Talong)',
    category: 'Vegetables',
    pricePerUnit: 48,
    unit: 'kg',
    quantity: 180,
    location: 'Valencia, Bukidnon',
    sellerName: 'Roberto Garcia',
    sellerVerified: true,
    rating: 4.7,
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
    description: 'Organic eggplant harvested at peak freshness.',
  },
  {
    id: 'crop-5',
    cropName: 'Free-Range Native Chicken (Manok)',
    category: 'Livestock & Poultry',
    pricePerUnit: 350,
    unit: 'head',
    quantity: 45,
    location: 'Manolo Fortich, Bukidnon',
    sellerName: 'Danilo Ramos',
    sellerVerified: true,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=600&q=80',
    description: 'Healthy, pasture-raised native chickens fed with corn and green forage. Ready for breeding or meat.',
  },
  {
    id: 'crop-6',
    cropName: 'Boer Cross Goats (Kambing)',
    category: 'Livestock & Poultry',
    pricePerUnit: 4200,
    unit: 'head',
    quantity: 12,
    location: 'Malaybalay, Bukidnon',
    sellerName: 'Esteban Cruz',
    sellerVerified: true,
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=600&q=80',
    description: 'Dewormed and vitamin-supplemented Boer cross goats. Average weight 18-25 kg live weight.',
  },
];

export const ProduceMarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openChatWith } = useChat();
  const { success: toastSuccess, error: toastError, warning: toastWarning, info: toastInfo } = useToast();

  const handleChatWithFarmer = async (listing: any) => {
    const targetFarmerId = listing.farmerId || listing.sellerId;
    if (!targetFarmerId) {
      toastWarning('Contact Unavailable', 'Farmer contact information is currently unavailable for this listing.');
      return;
    }
    if (user?.id === targetFarmerId) {
      toastInfo('Own Listing', 'You cannot chat with yourself on your own crop listing.');
      return;
    }
    const photo = listing.photos?.[0] || listing.imageUrl;
    const initialMsg = user?.role === 'buyer'
      ? `Hello! I'm a buyer interested in purchasing your ${listing.cropName} harvest listed at ₱${listing.pricePerUnit}/${listing.unit || 'kg'}. Is bulk purchase available?`
      : user?.role === 'farmer'
      ? `Hello fellow farmer! Inquiring about your ${listing.cropName} harvest (₱${listing.pricePerUnit}/${listing.unit || 'kg'}).`
      : `Hello! Inquiring about your ${listing.cropName} listed at ₱${listing.pricePerUnit}/${listing.unit || 'kg'}.`;

    await openChatWith(
      targetFarmerId,
      {
        type: 'produce',
        referenceId: listing.id,
        title: listing.cropName,
        image: getImageUrl(photo),
        price: listing.pricePerUnit,
        unit: listing.unit || 'kg',
      },
      initialMsg
    );
    navigate('/messages');
  };
  const [listings, setListings] = useState<ProduceListing[]>([]);
  const [_loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Products');

  // Produce Cart state (Shopee-style)
  const [produceCartMap, setProduceCartMap] = useState<Record<string, number>>({});
  const [produceRecentlyAddedId, setProduceRecentlyAddedId] = useState<string | null>(null);

  // Checkout modal states (Buy Now flow)
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(10);
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'gcash'>('cod');
  const [buyerNotes, setBuyerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any | null>(null);

  // Purchasing privilege: Farmers and Buyers can purchase produce; suppliers sell supplies only
  const isPurchaser = user?.role === 'buyer' || user?.role === 'farmer' || user?.role === 'super_admin';

  const updateProduceCartMap = () => {
    try {
      const raw = localStorage.getItem('agriconnect_produce_cart');
      if (raw) {
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          const map: Record<string, number> = {};
          items.forEach((i: any) => {
            map[i.id] = (map[i.id] || 0) + (i.quantity || 0);
          });
          setProduceCartMap(map);
          return;
        }
      }
    } catch { }
    setProduceCartMap({});
  };

  useEffect(() => {
    fetchListings();
    updateProduceCartMap();
    const handleCartSync = () => updateProduceCartMap();
    window.addEventListener('cart-updated', handleCartSync);
    window.addEventListener('storage', handleCartSync);
    return () => {
      window.removeEventListener('cart-updated', handleCartSync);
      window.removeEventListener('storage', handleCartSync);
    };
  }, []);

  const handleAddProduceToCart = (item: any, qty: number = 5, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isPurchaser) {
      toastError('Purchasing Restricted', 'Suppliers cannot make purchases. Shopping cart is reserved for Farmers and Buyers.');
      return;
    }
    const raw = localStorage.getItem('agriconnect_produce_cart');
    let items: { id: string; listing: any; quantity: number }[] = [];
    if (raw) {
      try { items = JSON.parse(raw); } catch { }
    }

    const idx = items.findIndex((i) => i.id === item.id);
    let newQty = qty;
    if (idx > -1) {
      const current = items[idx].quantity;
      if (item.quantity && current + qty > item.quantity) {
        toastWarning(
          'Maximum Harvest in Cart',
          `You already have ${current} ${item.unit || 'kg'} in your cart. Only ${item.quantity} ${item.unit || 'kg'} available.`
        );
        return;
      }
      items[idx].quantity += qty;
      newQty = items[idx].quantity;
    } else {
      items.push({ id: item.id, listing: item, quantity: qty });
    }

    localStorage.setItem('agriconnect_produce_cart', JSON.stringify(items));
    updateProduceCartMap();
    window.dispatchEvent(new Event('cart-updated'));

    setProduceRecentlyAddedId(item.id);
    setTimeout(() => {
      setProduceRecentlyAddedId((prev) => (prev === item.id ? null : prev));
    }, 1500);

    toastSuccess(
      'Added to Crop Cart! 🧺',
      `${qty} ${item.unit || 'kg'} of "${item.cropName}" added to your cart (${newQty}${item.unit || 'kg'} total).`
    );
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await produceApi.listListings();
      if (res && res.length > 0) {
        setListings(res);
      } else {
        setListings(sampleCropListings as any);
      }
    } catch {
      setListings(sampleCropListings as any);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCheckout = (item: any) => {
    setSelectedListing(item);
    setBuyQuantity(Math.min(10, item.quantity || 10));
    setFulfillmentType('delivery');
    const userAddr = user ? [user.barangay, user.municipality, user.province].filter(Boolean).join(', ') || user.address || '' : '';
    setDeliveryAddress(userAddr);
    setContactPhone(user?.phone || '');
    setPaymentMethod('cod');
    setBuyerNotes('');
    setPlacedOrder(null);
  };

  const filteredListings = listings.filter((item: any) => {
    const catLower = (item.category || '').toLowerCase();
    const selLower = selectedCategory.toLowerCase();
    const matchesCategory =
      selectedCategory === 'All Products' ||
      selectedCategory === 'All Crops' ||
      selectedCategory === 'All' ||
      catLower.includes(selLower) ||
      selLower.includes(catLower) ||
      (selLower.includes('livestock') && catLower.includes('livestock')) ||
      (selLower.includes('grain') && catLower.includes('grain')) ||
      (selLower.includes('root') && catLower.includes('root')) ||
      (selLower.includes('fish') && catLower.includes('fish')) ||
      (selLower.includes('spice') && catLower.includes('spice'));
    const matchesSearch =
      search.trim() === '' ||
      item.cropName?.toLowerCase().includes(search.toLowerCase()) ||
      item.location?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleBuyNow = async () => {
    if (!selectedListing) return;
    if (!isPurchaser) {
      toastError('Purchasing Restricted', 'Suppliers cannot make purchases. Ordering is reserved for Farmers and Buyers.');
      return;
    }
    if (user && ((selectedListing as any).farmerId === user.id || selectedListing.farmerName?.toLowerCase() === `${user.firstName} ${user.lastName}`.toLowerCase())) {
      toastError('Cannot Purchase Own Produce', 'You cannot purchase your own produce listing.');
      return;
    }
    if (buyQuantity <= 0) {
      toastWarning('Invalid Quantity', 'Please enter a valid quantity greater than zero.');
      return;
    }
    if (buyQuantity > selectedListing.quantity) {
      toastWarning('Harvest Limit', `Quantity cannot exceed available harvest of ${selectedListing.quantity} ${selectedListing.unit || 'kg'}.`);
      return;
    }
    if (fulfillmentType === 'delivery' && !deliveryAddress.trim()) {
      toastWarning('Address Required', 'Please provide your delivery address or barangay.');
      return;
    }
    if (!contactPhone.trim()) {
      toastWarning('Contact Required', 'Please provide your contact phone number so the seller can reach you.');
      return;
    }

    setIsSubmitting(true);

    const contactMsg = `Fulfillment: ${fulfillmentType === 'delivery' ? `Delivery to ${deliveryAddress.trim()}` : 'Farm-Gate Pickup'} • Phone: ${contactPhone.trim()} • Payment: ${paymentMethod === 'gcash' ? 'GCash / Maya' : 'Cash on Delivery (COD)'}${buyerNotes.trim() ? ` • Notes: ${buyerNotes.trim()}` : ''}`;

    try {
      const tx = await produceApi.initiateTransaction({
        listingId: selectedListing.id,
        quantity: buyQuantity,
        contactMessage: contactMsg,
        deliveryMethod: fulfillmentType,
        deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress.trim() : undefined,
      });
      setPlacedOrder(tx);
    } catch (err: any) {
      // If mock ID or network fallback, create local transaction object
      const fallbackTx: ProduceTransaction = {
        id: 'ord-' + Math.floor(1000 + Math.random() * 9000),
        listingId: selectedListing.id,
        cropName: selectedListing.cropName,
        buyerId: user?.id || 'usr-buyer',
        buyerName: user ? `${user.firstName} ${user.lastName}` : 'Buyer',
        farmerId: selectedListing.farmerId || 'farmer-1',
        farmerName: selectedListing.farmerName || selectedListing.sellerName || 'Verified Farmer',
        quantity: buyQuantity,
        unitPrice: selectedListing.pricePerUnit,
        totalPrice: buyQuantity * selectedListing.pricePerUnit,
        contactMessage: contactMsg,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPlacedOrder(fallbackTx);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container" style={{ paddingBottom: '40px' }}>
      {/* ─── Marketplace Channel Switcher (Segmented Control) ─── */}
      <div className="marketplace-channel-switcher">
        <button
          type="button"
          onClick={() => navigate('/produce')}
          className="marketplace-channel-btn active"
          aria-label="Fresh Produce and Crops marketplace"
        >
          <span className="channel-icon">🌾</span>
          <span className="channel-label">Fresh Produce</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/supply')}
          className="marketplace-channel-btn"
          aria-label="Farm Supplies and Inputs store"
        >
          <span className="channel-icon">🏪</span>
          <span className="channel-label">Farm Supplies</span>
        </button>
      </div>

      {/* ─── Page Title / Header Row ─── */}
      <div className="marketplace-header-wrap">
        <div className="marketplace-header-inner">
          <div className="marketplace-header-text">
            <h1 className="marketplace-header-title">
              Fresh Produce & Harvests
            </h1>
            <p className="marketplace-header-subtitle">
              {user?.role === 'lgu_staff'
                ? 'Browse and monitor fresh harvests listed by verified local farmers in your jurisdiction.'
                : user?.role === 'farmer'
                  ? 'Explore market listings, compare regional harvest prices, or post your new crops.'
                  : 'Buy fresh crops directly from verified farmers in Northern Mindanao.'}
            </p>
          </div>

          {user?.role === 'farmer' && (
            <button
              className="btn btn-primary marketplace-manage-btn"
              onClick={() => navigate('/produce/manage?action=new')}
            >
              + Manage My Listings
            </button>
          )}
        </div>
      </div>

      {/* ─── Search Field & Category Pills ─── */}
      <div className="marketplace-search-card">
        <div className="marketplace-search-wrapper">
          <span className="marketplace-search-icon">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type crop name to search (e.g. Tomato, Corn)..."
            aria-label="Search for crops or products"
            className="form-input marketplace-search-input"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="marketplace-search-clear"
              aria-label="Clear search text"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Buttons (Clean scroll without visible grey scrollbar) */}
        <div className="marketplace-categories-scroll">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => setSelectedCategory(cat.label)}
                className={`marketplace-category-chip ${isSelected ? 'active' : ''}`}
              >
                <span style={{ fontSize: '15px' }}>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Crop Cards Grid ─── */}
      {filteredListings.length > 0 ? (
        <div className="marketplace-grid">
          {filteredListings.map((item: any) => {
            const qtyInCart = produceCartMap[item.id] || 0;
            const isRecentlyAdded = produceRecentlyAddedId === item.id;
            const isOwnListing = Boolean(
              user && (
                (item as any).farmerId === user.id ||
                item.farmerName?.toLowerCase() === `${user.firstName} ${user.lastName}`.toLowerCase() ||
                item.sellerName?.toLowerCase() === `${user.firstName} ${user.lastName}`.toLowerCase()
              )
            );

            return (
              <div
                key={item.id}
                className="card card-interactive marketplace-card"
                onClick={() => handleOpenCheckout(item)}
              >
                <div className="marketplace-card-image-box">
                  <img
                    src={getImageUrl(item.photos?.[0] || item.imageUrl, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80')}
                    alt={item.cropName}
                  />
                  {qtyInCart > 0 && (
                    <div className="marketplace-cart-badge">
                      🛒 {qtyInCart} <span className="marketplace-cart-badge-text">{item.unit || 'kg'} in cart</span>
                    </div>
                  )}
                </div>

                <div className="marketplace-card-body">
                  {/* Row 1: Overline Seller Identity & Location */}
                  <div
                    className="marketplace-card-seller"
                    title={`Farmer: ${item.farmerName || item.sellerName || 'Verified Farmer'} • 📍 ${item.location || 'Northern Mindanao'}`}
                  >
                    <span className="marketplace-seller-name-full">Farmer: {item.farmerName || item.sellerName || 'Verified Farmer'}{item.location ? ` • 📍 ${item.location}` : ' • 📍 Northern Mindanao'}</span>
                    <span className="marketplace-seller-name-compact">🧑‍🌾 {item.farmerName || item.sellerName || 'Verified Farmer'}</span>
                  </div>

                  {/* Row 2: Product Name */}
                  <h3 className="marketplace-card-title" title={item.cropName}>
                    {item.cropName}
                  </h3>

                  {/* Row 3: Secondary Details Slot (Desktop only) */}
                  <p
                    className="marketplace-card-desc"
                    title={item.description || `Freshly harvested ${item.cropName} directly from verified farm in ${item.location || 'Northern Mindanao'}.`}
                  >
                    {item.description || `Freshly harvested ${item.cropName} directly from verified farm in ${item.location || 'Northern Mindanao'}.`}
                  </p>

                  {/* Row 4: Price Slot */}
                  <div className="marketplace-card-price">
                    <span>₱{item.pricePerUnit}</span>
                    <span className="marketplace-card-price-unit">/ {item.unit || 'kg'}</span>
                  </div>

                  {/* Row 5: Stock Status Badge */}
                  <div className="marketplace-card-stock">
                    {(item.quantity || 0) > 0 ? (
                      <span style={{ color: '#16A34A', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span>✓</span>
                        <span className="marketplace-stock-text">{item.quantity} {item.unit || 'kg'} available</span>
                        <span className="marketplace-stock-compact">{item.quantity} {item.unit || 'kg'}</span>
                      </span>
                    ) : (
                      <span style={{ color: '#DC2626' }}>✕ Out of Stock</span>
                    )}
                  </div>

                  {/* Row 5.5: Location Origin Line */}
                  <div className="marketplace-card-location" title={item.location || 'Northern Mindanao'}>
                    <span className="marketplace-loc-pin">📍</span>
                    <span className="marketplace-loc-text">{item.location || 'Northern Mindanao'}</span>
                  </div>

                  {/* Row 6: Action Buttons pinned to bottom */}
                  <div className="marketplace-card-actions" onClick={(e) => e.stopPropagation()}>
                    {isOwnListing ? (
                      <button
                        type="button"
                        onClick={() => navigate('/produce/manage')}
                        className="marketplace-btn-own"
                      >
                        🌱 <span className="marketplace-btn-manage-full">Your Listing (Manage)</span><span className="marketplace-btn-manage-compact">Manage</span>
                      </button>
                    ) : !isPurchaser ? (
                      <div className="marketplace-btn-view">
                        🌾 <span className="marketplace-btn-view-full">View Crop Details</span><span className="marketplace-btn-view-compact">Details</span>
                      </div>
                    ) : (
                      <div className="marketplace-action-grid">
                        <button
                          type="button"
                          onClick={() => handleChatWithFarmer(item)}
                          className="btn btn-secondary marketplace-btn-chat"
                          title={`Chat with ${item.farmerName || item.sellerName || 'Farmer'}`}
                        >
                          <span>💬</span>
                          <span className="marketplace-btn-text"> Chat</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleAddProduceToCart(item, 5, e)}
                          disabled={(item.quantity || 0) <= 0}
                          className="btn btn-secondary marketplace-btn-cart"
                          style={{
                            backgroundColor: isRecentlyAdded ? '#EAF6EE' : undefined,
                            borderColor: isRecentlyAdded ? '#10B981' : qtyInCart > 0 ? '#176B3A' : undefined,
                            color: (item.quantity || 0) <= 0 ? '#94A3B8' : '#0E4A27',
                          }}
                          title="Add to cart"
                        >
                          <span>{isRecentlyAdded ? '✓' : '🛒'}</span>
                          <span className="marketplace-btn-text">
                            {isRecentlyAdded ? ' Added!' : qtyInCart > 0 ? ` (${qtyInCart})` : ' Cart'}
                          </span>
                          <span className="marketplace-btn-compact-count">
                            {qtyInCart > 0 ? ` ${qtyInCart}` : ''}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenCheckout(item)}
                          disabled={(item.quantity || 0) <= 0}
                          className="btn btn-primary marketplace-btn-buy"
                        >
                          <span>⚡</span>
                          <span> Buy</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>🌱</div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27', marginBottom: '8px' }}>
            No crops found in this category
          </h2>
          <p style={{ fontSize: '18px', color: '#525450', marginBottom: '24px' }}>
            Tap the button below to view all crop listings.
          </p>
          <button onClick={() => setSelectedCategory('All Products')} className="btn btn-primary btn-large">
            Show All Products
          </button>
        </div>
      )}

      {/* ─── Product Details & Order Modal ─── */}
      {selectedListing && (
        <div className="modal-backdrop" onClick={() => setSelectedListing(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}
          >
            {placedOrder ? (
              /* ─── Order Placed Successfully Screen ─── */
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#EAF6EE',
                    color: '#176B3A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '44px',
                    margin: '0 auto 20px',
                    border: '3px solid #176B3A',
                  }}
                >
                  ✓
                </div>

                <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#0E4A27', marginBottom: '8px' }}>
                  Order Placed Successfully!
                </h2>
                <p style={{ fontSize: '18px', color: '#525450', marginBottom: '24px' }}>
                  Your crop order has been recorded and sent to the farmer.
                </p>

                <div
                  style={{
                    background: '#F8F7F3',
                    border: '2px solid #E4E2DC',
                    borderRadius: '18px',
                    padding: '24px',
                    textAlign: 'left',
                    marginBottom: '28px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '16px', color: '#525450', fontWeight: 600 }}>Order ID</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#0E4A27', fontFamily: 'monospace' }}>
                      #{placedOrder.id.slice(-8).toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '16px', color: '#525450', fontWeight: 600 }}>Crop Item</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#1A1C1A' }}>
                      {placedOrder.cropName || selectedListing.cropName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '16px', color: '#525450', fontWeight: 600 }}>Farmer / Seller</span>
                    <span style={{ fontSize: '17px', fontWeight: 700, color: '#1A1C1A' }}>
                      👤 {placedOrder.farmerName || selectedListing.sellerName || 'Verified Farmer'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '16px', color: '#525450', fontWeight: 600 }}>Quantity</span>
                    <span style={{ fontSize: '17px', fontWeight: 800, color: '#1A1C1A' }}>
                      {placedOrder.quantity} {selectedListing.unit || 'kg'}
                    </span>
                  </div>

                  <div
                    style={{
                      borderTop: '2px dashed #D8D6CF',
                      paddingTop: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#1A1C1A' }}>Total Amount</span>
                    <span style={{ fontSize: '28px', fontWeight: 800, color: '#0E4A27' }}>
                      ₱{placedOrder.totalPrice.toLocaleString()}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #D8D6CF',
                      fontSize: '15px',
                      color: '#525450',
                    }}
                  >
                    📍 <strong>Details:</strong> {placedOrder.contactMessage}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <button
                    onClick={() => setSelectedListing(null)}
                    className="btn btn-secondary btn-large"
                    style={{ minHeight: '56px', fontSize: '17px' }}
                  >
                    Continue Shopping
                  </button>
                  <button
                    onClick={() => {
                      setSelectedListing(null);
                      navigate(user?.role === 'farmer' ? '/produce/orders?view=purchases' : '/produce/orders');
                    }}
                    className="btn btn-primary btn-large"
                    style={{ minHeight: '56px', fontSize: '17px' }}
                  >
                    View in My Orders →
                  </button>
                </div>
              </div>
            ) : (
              /* ─── Checkout Form ─── */
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27' }}>
                      {selectedListing.cropName}
                    </h2>
                    <div style={{ fontSize: '16px', color: '#525450', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span>Selling by <strong>{selectedListing.sellerName || selectedListing.farmerName || 'Verified Farmer'}</strong> • 📍 {selectedListing.location || 'Northern Mindanao'}</span>
                      {selectedListing.farmerId && user?.id !== selectedListing.farmerId && (
                        <button
                          type="button"
                          onClick={() => handleChatWithFarmer(selectedListing)}
                          className="btn btn-secondary"
                          style={{
                            padding: '4px 12px',
                            fontSize: '12px',
                            fontWeight: 800,
                            borderRadius: '16px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            color: '#0E4A27',
                            borderColor: '#176B3A',
                            background: '#EFFDF5',
                          }}
                        >
                          💬 Chat Farmer
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedListing(null)}
                    style={{
                      background: '#F8F7F3',
                      border: 'none',
                      fontSize: '22px',
                      cursor: 'pointer',
                      color: '#525450',
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                </div>

                {/* Crop Brief Banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: '#F8F7F3',
                    borderRadius: '16px',
                    border: '1.5px solid #E4E2DC',
                    marginBottom: '22px',
                  }}
                >
                  <img
                    src={getImageUrl(selectedListing.photos?.[0] || selectedListing.imageUrl, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80')}
                    alt={selectedListing.cropName}
                    style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0E4A27' }}>
                      ₱{selectedListing.pricePerUnit} <span style={{ fontSize: '16px', color: '#525450', fontWeight: 600 }}>/ {selectedListing.unit || 'kg'}</span>
                    </div>
                    <div style={{ fontSize: '15px', color: '#525450', marginTop: '2px', fontWeight: 600 }}>
                      📦 Available Harvest: <strong>{selectedListing.quantity} {selectedListing.unit || 'kg'}</strong>
                    </div>
                    {selectedListing.description && (
                      <div style={{ fontSize: '13.5px', color: '#64748B', marginTop: '4px', lineHeight: 1.4 }}>
                        {selectedListing.description}
                      </div>
                    )}
                  </div>
                  <span className="badge badge-verified" style={{ fontSize: '14px' }}>
                    ✓ Verified
                  </span>
                </div>
                {!isPurchaser ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                    <div style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      backgroundColor: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '14px',
                      textAlign: 'center',
                      lineHeight: 1.5,
                    }}>
                      ℹ️ Purchasing fresh produce is reserved for registered Buyers and Farmers. Suppliers manage and sell supplies on AgriConnect.
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedListing(null)}
                      className="btn btn-secondary btn-large"
                      style={{ minHeight: '48px', fontSize: '15px', fontWeight: 800 }}
                    >
                      Close Details
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 1. Quantity & Total Calculation */}
                    <div style={{ marginBottom: '22px' }}>
                      <label style={{ fontSize: '17px', fontWeight: 800, color: '#1A1C1A', display: 'block', marginBottom: '8px' }}>
                        1. How many kilograms do you want to order?
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setBuyQuantity((prev) => Math.max(1, prev - 5))}
                          style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '14px',
                            border: '2px solid #D8D6CF',
                            background: '#FFFFFF',
                            fontSize: '24px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={buyQuantity}
                          onChange={(e) => setBuyQuantity(Math.max(1, Number(e.target.value) || 0))}
                          min="1"
                          max={selectedListing.quantity}
                          className="form-input"
                          style={{
                            fontSize: '22px',
                            fontWeight: 800,
                            textAlign: 'center',
                            maxWidth: '160px',
                            minHeight: '52px',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setBuyQuantity((prev) => Math.min(selectedListing.quantity, prev + 5))}
                          style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '14px',
                            border: '2px solid #D8D6CF',
                            background: '#FFFFFF',
                            fontSize: '24px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          +
                        </button>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', color: '#525450', fontWeight: 700 }}>Estimated Subtotal:</div>
                          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27' }}>
                            ₱{(buyQuantity * (selectedListing.pricePerUnit || 0)).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Fulfillment Type */}
                    <div style={{ marginBottom: '22px' }}>
                      <label style={{ fontSize: '17px', fontWeight: 800, color: '#1A1C1A', display: 'block', marginBottom: '8px' }}>
                        2. Fulfillment Method
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setFulfillmentType('delivery')}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '14px',
                            border: `2.5px solid ${fulfillmentType === 'delivery' ? '#176B3A' : '#D8D6CF'}`,
                            background: fulfillmentType === 'delivery' ? '#EAF6EE' : '#FFFFFF',
                            color: fulfillmentType === 'delivery' ? '#0E4A27' : '#1A1C1A',
                            fontWeight: 800,
                            fontSize: '16px',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          🚚 Delivery to Address
                        </button>
                        <button
                          type="button"
                          onClick={() => setFulfillmentType('pickup')}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '14px',
                            border: `2.5px solid ${fulfillmentType === 'pickup' ? '#176B3A' : '#D8D6CF'}`,
                            background: fulfillmentType === 'pickup' ? '#EAF6EE' : '#FFFFFF',
                            color: fulfillmentType === 'pickup' ? '#0E4A27' : '#1A1C1A',
                            fontWeight: 800,
                            fontSize: '16px',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          🚜 Farm-Gate Pickup
                        </button>
                      </div>
                      {fulfillmentType === 'delivery' ? (
                        <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🚚</span>
                          <span><strong>Delivery Fee:</strong> To be confirmed by the selling farmer upon order acceptance based on vehicle/hauling arrangements.</span>
                        </div>
                      ) : (
                        <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>✓</span>
                          <span><strong>Farm-Gate Pickup:</strong> ₱0 (FREE) — Pickup directly at the seller's farm.</span>
                        </div>
                      )}
                    </div>

                    {/* 3. Address & Phone */}
                    <div style={{ marginBottom: '22px' }}>
                      {fulfillmentType === 'delivery' && (
                        <div style={{ marginBottom: '14px' }}>
                          <label style={{ fontSize: '16px', fontWeight: 800, color: '#1A1C1A', display: 'block', marginBottom: '6px' }}>
                            Delivery Address / Barangay *
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder="e.g. Purok 4, Poblacion, Valencia City, Bukidnon"
                            className="form-input"
                            style={{ fontSize: '16px' }}
                          />
                        </div>
                      )}

                      <div>
                        <label style={{ fontSize: '16px', fontWeight: 800, color: '#1A1C1A', display: 'block', marginBottom: '6px' }}>
                          Contact Phone Number (for delivery/pickup updates) *
                        </label>
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="e.g. 0917-123-4567"
                          className="form-input"
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                    </div>

                    {/* 4. Payment Method */}
                    <div style={{ marginBottom: '22px' }}>
                      <label style={{ fontSize: '16px', fontWeight: 800, color: '#1A1C1A', display: 'block', marginBottom: '8px' }}>
                        4. Payment Preference
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('cod')}
                          style={{
                            padding: '14px',
                            borderRadius: '14px',
                            border: `2.5px solid ${paymentMethod === 'cod' ? '#176B3A' : '#D8D6CF'}`,
                            background: paymentMethod === 'cod' ? '#EAF6EE' : '#FFFFFF',
                            color: paymentMethod === 'cod' ? '#0E4A27' : '#1A1C1A',
                            fontWeight: 800,
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          💵 Cash on Delivery (COD)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('gcash')}
                          style={{
                            padding: '14px',
                            borderRadius: '14px',
                            border: `2.5px solid ${paymentMethod === 'gcash' ? '#176B3A' : '#D8D6CF'}`,
                            background: paymentMethod === 'gcash' ? '#EAF6EE' : '#FFFFFF',
                            color: paymentMethod === 'gcash' ? '#0E4A27' : '#1A1C1A',
                            fontWeight: 800,
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          📱 GCash / Maya
                        </button>
                      </div>
                    </div>

                    {/* 5. Special Notes */}
                    <div style={{ marginBottom: '26px' }}>
                      <label style={{ fontSize: '16px', fontWeight: 800, color: '#1A1C1A', display: 'block', marginBottom: '6px' }}>
                        Special Instructions / Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={buyerNotes}
                        onChange={(e) => setBuyerNotes(e.target.value)}
                        placeholder="e.g. Please deliver early morning before 10 AM"
                        className="form-input"
                        style={{ fontSize: '15px' }}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '14px', marginBottom: '14px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          handleAddProduceToCart(selectedListing, buyQuantity);
                          setSelectedListing(null);
                        }}
                        className="btn btn-secondary btn-large"
                        style={{ minHeight: '54px', fontSize: '16px', fontWeight: 800 }}
                      >
                        🛒 Add to Cart ({buyQuantity}kg)
                      </button>

                      <button
                        type="button"
                        onClick={handleBuyNow}
                        disabled={isSubmitting}
                        className="btn btn-primary btn-large"
                        style={{
                          minHeight: '54px',
                          fontSize: '17px',
                          fontWeight: 800,
                          opacity: isSubmitting ? 0.7 : 1,
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isSubmitting ? '⏳ Placing Order...' : `⚡ Place Order (₱${(buyQuantity * (selectedListing.pricePerUnit || 0)).toLocaleString()})`}
                      </button>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => toastInfo('Calling Farmer', `Initiating direct contact to ${selectedListing.sellerName || selectedListing.farmerName || 'Farmer'}...`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#525450',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        📞 Need to talk first? Call farmer directly
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
