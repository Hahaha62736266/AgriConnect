import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useChat } from '../contexts/ChatContext';
import { supplyApi } from '../api/supply';
import { api, getImageUrl } from '../api';
import type { SupplyProduct, DeliveryMethod, PaymentMethod, SupplyOrder } from '../types/supply';
import { SUPPLY_CATEGORIES } from '../types/supply';

const categories: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: 'All Inputs', icon: '🏪' },
  { key: 'fertilizer', label: 'Fertilizers', icon: '🌱' },
  { key: 'pesticide_herbicide_fungicide', label: 'Crop Protection', icon: '🧪' },
  { key: 'seeds_seedlings', label: 'Seeds & Planting', icon: '🌽' },
  { key: 'animal_feeds', label: 'Animal Feeds', icon: '🌾' },
  { key: 'vet_medicines', label: 'Veterinary Biologics', icon: '💉' },
  { key: 'irrigation', label: 'Irrigation & Water', icon: '💧' },
  { key: 'machinery_equipment', label: 'Machinery & Equipment', icon: '⚙️' },
  { key: 'nursery_greenhouse', label: 'Greenhouse & Mulch', icon: '🏡' },
  { key: 'packaging_storage', label: 'Packaging & Sacks', icon: '📦' },
  { key: 'tools', label: 'Hand Tools', icon: '🔧' },
  { key: 'ppe', label: 'Safety Gear & PPE', icon: '🥽' },
];

const categoryImages: Record<string, string> = {
  fertilizer: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
  pesticide_herbicide_fungicide: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=600&q=80',
  seeds_seedlings: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=600&q=80',
  animal_feeds: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80',
  vet_medicines: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80',
  irrigation: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=600&q=80',
  machinery_equipment: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=600&q=80',
  nursery_greenhouse: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80',
  packaging_storage: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=600&q=80',
  tools: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=600&q=80',
  ppe: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
};

export const SupplyStorePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openChatWith } = useChat();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const handleChatWithSupplier = (item: SupplyProduct) => {
    if (!item.supplierId) {
      toastWarning('Contact Unavailable', 'Supplier contact information is currently unavailable for this product.');
      return;
    }
    if (user?.id === item.supplierId) {
      toastWarning('Own Product', 'You cannot chat with yourself on your own product.');
      return;
    }
    const photo = item.images?.[0] || categoryImages[item.category] || '';
    openChatWith(
      item.supplierId,
      {
        type: 'supply',
        referenceId: item.id,
        title: item.name,
        image: getImageUrl(photo),
        price: item.price,
        unit: item.unit,
      },
      `Hello! I'm inquiring about ${item.name} (₱${item.price}/${item.unit}).`
    );
  };
  const [products, setProducts] = useState<SupplyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  // Cart state in localStorage
  const [cartItemsMap, setCartItemsMap] = useState<Record<string, number>>({});
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Quick-view Product Details Modal state
  const [viewProduct, setViewProduct] = useState<SupplyProduct | null>(null);
  const [viewQuantity, setViewQuantity] = useState<number>(1);

  // Buy Now Express Checkout Modal state (Shopee-style direct checkout without cart)
  const [buyNowProduct, setBuyNowProduct] = useState<SupplyProduct | null>(null);
  const [buyNowQuantity, setBuyNowQuantity] = useState<number>(1);
  const [buyNowDeliveryMethod, setBuyNowDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [buyNowAddress, setBuyNowAddress] = useState('');
  const [buyNowPhone, setBuyNowPhone] = useState('');
  const [buyNowPaymentMethod, setBuyNowPaymentMethod] = useState<PaymentMethod>('cod');
  const [isSubmittingBuyNow, setIsSubmittingBuyNow] = useState(false);
  const [placedSupplyOrder, setPlacedSupplyOrder] = useState<SupplyOrder | null>(null);

  // Supplier Add Product Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [prodName, setProdName] = useState('');

  // Purchasing privilege check: Only Farmers and Buyers (and admin) can buy supplies
  const isPurchaser = user?.role === 'farmer' || user?.role === 'buyer' || user?.role === 'super_admin';
  const [prodCategory, setProdCategory] = useState('fertilizer');
  const [prodPrice, setProdPrice] = useState<number>(1000);
  const [prodUnit, setProdUnit] = useState('sack (50kg)');
  const [prodStock, setProdStock] = useState<number>(50);
  const [prodDesc, setProdDesc] = useState('');
  const [prodLocation, setProdLocation] = useState('');
  const [prodImageFile, setProdImageFile] = useState<File | null>(null);
  const [prodImagePreview, setProdImagePreview] = useState<string>('');
  const prodFileInputRef = useRef<HTMLInputElement>(null);
  const [submittingProd, setSubmittingProd] = useState(false);

  const currentProdCatConfig = SUPPLY_CATEGORIES.find((c) => c.key === prodCategory);

  const handleProdCategoryChange = (newCat: string) => {
    setProdCategory(newCat);
    const conf = SUPPLY_CATEGORIES.find((c) => c.key === newCat);
    if (conf && conf.suggestedUnits.length > 0) {
      setProdUnit(conf.suggestedUnits[0]);
    }
  };

  const openAddSupplyModal = () => {
    setProdName('');
    setProdCategory('fertilizer');
    setProdPrice(1000);
    setProdStock(50);
    setProdUnit('sack (50kg)');
    setProdDesc('');
    setProdLocation(
      user?.municipality && user?.province
        ? `${user.municipality}, ${user.province}`
        : user?.address || ''
    );
    setProdImageFile(null);
    setProdImagePreview('');
    if (prodFileInputRef.current) prodFileInputRef.current.value = '';
    setShowAddModal(true);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProd(true);
    let uploadedImageUrl = '';
    if (prodImageFile) {
      try {
        const res = await api.uploadImage(prodImageFile);
        uploadedImageUrl = res.url;
      } catch (uploadErr: any) {
        toastError('Upload Failed', 'Failed to upload image: ' + (uploadErr.response?.data?.error || uploadErr.message));
        setSubmittingProd(false);
        return;
      }
    }

    try {
      await supplyApi.createProduct({
        name: prodName,
        category: prodCategory as any,
        price: prodPrice,
        unit: prodUnit,
        stockQuantity: prodStock,
        description: prodDesc,
        location: prodLocation,
        images: uploadedImageUrl ? [uploadedImageUrl] : [],
      });
      toastSuccess('Product Listed', `"${prodName}" has been added to the store.`);
      setShowAddModal(false);
      setProdName(''); setProdDesc(''); setProdLocation('');
      setProdImageFile(null);
      setProdImagePreview('');
      if (prodFileInputRef.current) prodFileInputRef.current.value = '';
      fetchProducts();
    } catch (err: any) {
      toastError('Create Product Failed', err.response?.data?.error || 'Failed to create supply product.');
    } finally {
      setSubmittingProd(false);
    }
  };

  const updateCartCount = () => {
    const raw = localStorage.getItem('agriconnect_cart');
    if (raw) {
      try {
        const items = JSON.parse(raw);
        const map: Record<string, number> = {};
        items.forEach((item: any) => {
          if (item.product?.id) {
            map[item.product.id] = (map[item.product.id] || 0) + (Number(item.quantity) || 0);
          }
        });
        setCartItemsMap(map);
      } catch (e) {
        setCartItemsMap({});
      }
    } else {
      setCartItemsMap({});
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await supplyApi.listProducts({
        category: activeCategory !== 'all' ? activeCategory : undefined,
        q: search || undefined,
      });
      setProducts(data);

      // Automatically clamp any cart quantities that exceed live available stock
      try {
        const raw = localStorage.getItem('agriconnect_cart');
        if (raw) {
          const cartItems: any[] = JSON.parse(raw);
          if (Array.isArray(cartItems) && cartItems.length > 0) {
            const productMap = new Map(data.map((p) => [p.id, p]));
            let cartModified = false;
            const updated = cartItems.map((c) => {
              const fresh = productMap.get(c.product?.id);
              if (fresh) {
                const maxStock = Math.max(0, fresh.stockQuantity);
                if (c.quantity > maxStock || c.product?.stockQuantity !== fresh.stockQuantity) {
                  cartModified = true;
                  return { ...c, product: fresh, quantity: Math.min(c.quantity, maxStock) };
                }
              }
              return c;
            }).filter((c) => c.quantity > 0);

            if (cartModified) {
              localStorage.setItem('agriconnect_cart', JSON.stringify(updated));
              updateCartCount();
              window.dispatchEvent(new Event('cart-updated'));
            }
          }
        }
      } catch (e) {
        console.error('Failed to reconcile cart in store:', e);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    updateCartCount();

    const handleCartSync = () => updateCartCount();
    window.addEventListener('cart-updated', handleCartSync);
    window.addEventListener('storage', handleCartSync);
    return () => {
      window.removeEventListener('cart-updated', handleCartSync);
      window.removeEventListener('storage', handleCartSync);
    };
  }, [activeCategory, search]);

  const handleDirectAddToCart = (item: SupplyProduct, qty: number = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isPurchaser) {
      toastError('Purchasing Restricted', 'Suppliers cannot make purchases. Shopping cart is reserved for Farmers and Buyers.');
      return;
    }
    if (item.stockQuantity <= 0) return;

    const raw = localStorage.getItem('agriconnect_cart');
    let items: { product: SupplyProduct; quantity: number }[] = [];
    if (raw) {
      try { items = JSON.parse(raw); } catch (e) { }
    }

    const existingIndex = items.findIndex((i) => i.product.id === item.id);
    let newQty = qty;
    if (existingIndex > -1) {
      const currentQty = items[existingIndex].quantity;
      if (currentQty + qty > item.stockQuantity) {
        toastWarning(
          'Maximum Stock in Cart',
          `You already have ${currentQty} in your cart. Only ${item.stockQuantity} ${item.unit}s available.`
        );
        return;
      }
      items[existingIndex].quantity += qty;
      newQty = items[existingIndex].quantity;
    } else {
      items.push({ product: item, quantity: Math.min(qty, item.stockQuantity) });
    }

    localStorage.setItem('agriconnect_cart', JSON.stringify(items));
    updateCartCount();
    window.dispatchEvent(new Event('cart-updated'));

    // Micro-feedback state for this button
    setRecentlyAddedId(item.id);
    setTimeout(() => {
      setRecentlyAddedId((prev) => (prev === item.id ? null : prev));
    }, 1500);

    // Non-intrusive top-right toast notification
    toastSuccess(
      'Added to Cart! 🛒',
      `${qty} ${item.unit} of "${item.name}" added to your cart (${newQty} total in cart).`
    );
  };

  const handleOpenSupplyBuyNow = (item: SupplyProduct, qty: number = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isPurchaser) {
      toastError('Purchasing Restricted', 'Suppliers cannot make purchases. Direct ordering is reserved for Farmers and Buyers.');
      return;
    }
    if (item.stockQuantity <= 0) return;

    // Close quick-view if open
    setViewProduct(null);

    const userAddr = user ? [user.barangay, user.municipality, user.province].filter(Boolean).join(', ') || user.address || '' : '';
    setBuyNowProduct(item);
    setBuyNowQuantity(Math.min(qty, item.stockQuantity || 1));
    setBuyNowDeliveryMethod('delivery');
    setBuyNowAddress(userAddr);
    setBuyNowPhone(user?.phone || '');
    setBuyNowPaymentMethod('cod');
    setPlacedSupplyOrder(null);
  };

  const handlePlaceSupplyBuyNow = async () => {
    if (!buyNowProduct) return;
    if (buyNowQuantity <= 0) {
      toastWarning('Invalid Quantity', 'Please enter a valid quantity of at least 1.');
      return;
    }
    if (buyNowQuantity > buyNowProduct.stockQuantity) {
      toastWarning('Stock Exceeded', `Maximum available stock is ${buyNowProduct.stockQuantity} ${buyNowProduct.unit}s.`);
      return;
    }
    if (buyNowDeliveryMethod === 'delivery' && !buyNowAddress.trim()) {
      toastWarning('Address Required', 'Please provide your complete delivery address or barangay.');
      return;
    }
    if (!buyNowPhone.trim()) {
      toastWarning('Contact Required', 'Please provide your contact phone number so the supplier can coordinate fulfillment.');
      return;
    }

    setIsSubmittingBuyNow(true);

    try {
      const order = await supplyApi.createOrder({
        items: [{ productId: buyNowProduct.id, quantity: buyNowQuantity }],
        deliveryMethod: buyNowDeliveryMethod,
        deliveryAddress: buyNowDeliveryMethod === 'delivery' ? buyNowAddress.trim() : undefined,
        paymentMethod: buyNowPaymentMethod,
      });
      setPlacedSupplyOrder(order);
      // NOTE: Cart in localStorage is completely untouched!
    } catch (err: any) {
      toastError('Order Failed', err.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmittingBuyNow(false);
    }
  };

  return (
    <div className="app-container" style={{ paddingBottom: '40px' }}>
      {/* ─── Marketplace Channel Switcher (Segmented Control) ─── */}
      <div className="marketplace-channel-switcher">
        <button
          type="button"
          onClick={() => navigate('/produce')}
          className="marketplace-channel-btn"
          aria-label="Fresh Produce and Crops marketplace"
        >
          <span className="channel-icon">🌾</span>
          <span className="channel-label">Fresh Produce</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/supply')}
          className="marketplace-channel-btn active supply-active"
          aria-label="Farm Supplies and Inputs store"
        >
          <span className="channel-icon">🏪</span>
          <span className="channel-label">Farm Supplies</span>
        </button>
      </div>

      {/* ─── Page Header / Sub-banner ─── */}
      <div className="marketplace-header-wrap">
        <div className="marketplace-header-inner">
          <div className="marketplace-header-text">
            <h1 className="marketplace-header-title">
              Agri-Supply Store
            </h1>
            <p className="marketplace-header-subtitle">
              {user?.role === 'supplier'
                ? 'Manage your agricultural inputs, track buyer orders, and expand your catalog.'
                : user?.role === 'lgu_staff'
                  ? 'Inspect available certified fertilizers, hybrid seeds, and machinery for agricultural programs.'
                  : 'Order certified fertilizers, hybrid seeds, crop protection, and machinery directly from verified suppliers.'}
            </p>
          </div>

          {user?.role === 'supplier' && (
            <button
              className="btn btn-primary marketplace-manage-btn"
              onClick={openAddSupplyModal}
            >
              + Add Supply Product
            </button>
          )}
        </div>
      </div>

      {/* ─── Search Field & Category Pills ─── */}
      <div className="marketplace-search-card">
        {/* Search Field */}
        <div className="marketplace-search-wrapper">
          <span className="marketplace-search-icon">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for fertilizers, seeds, machinery, tools..."
            aria-label="Search supply store"
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

        {/* Category Pills */}
        <div className="marketplace-categories-scroll">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`marketplace-category-chip ${isSelected ? 'active' : ''}`}
              >
                <span style={{ fontSize: '15px' }}>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Products Grid ─── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', fontSize: '20px', color: '#525450', fontWeight: 700 }}>
          Loading certified supply products…
        </div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>🚜</div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27', marginBottom: '8px' }}>
            No products found in this category
          </h2>
          <p style={{ fontSize: '18px', color: '#525450', marginBottom: '24px' }}>
            Try searching for another product or select "All Inputs".
          </p>
          <button onClick={() => setActiveCategory('all')} className="btn btn-primary btn-large">
            Show All Supply Inputs
          </button>
        </div>
      ) : (
        <div className="marketplace-grid">
          {products.map((item) => {
            const qtyInCart = cartItemsMap[item.id] || 0;
            const isRecentlyAdded = recentlyAddedId === item.id;
            const isOutOfStock = item.stockQuantity <= 0;
            const isMaxInCart = qtyInCart >= item.stockQuantity && !isOutOfStock;
            const isOwnProduct = Boolean(
              user?.role === 'supplier' && (
                (item as any).supplierId === user.id ||
                item.supplierName?.toLowerCase() === `${user.firstName} ${user.lastName}`.toLowerCase() ||
                ((user as any).organizationName && item.supplierName?.toLowerCase() === (user as any).organizationName.toLowerCase())
              )
            );

            return (
              <div
                key={item.id}
                className="card card-interactive marketplace-card"
                onClick={() => {
                  setViewProduct(item);
                  setViewQuantity(1);
                }}
              >
                <div className="marketplace-card-image-box">
                  <img
                    src={getImageUrl(item.images?.[0], categoryImages[item.category] ?? 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80')}
                    alt={item.name}
                  />
                  {qtyInCart > 0 && (
                    <div className="marketplace-cart-badge">
                      🛒 {qtyInCart} <span className="marketplace-cart-badge-text">{item.unit || 'units'} in cart</span>
                    </div>
                  )}
                </div>

                <div className="marketplace-card-body">
                  {/* Row 1: Overline Seller Identity & Location */}
                  <div
                    className="marketplace-card-seller"
                    title={`Supplier: ${item.supplierName || 'Verified Supplier'} • 📍 ${item.location || 'Northern Mindanao'}`}
                  >
                    <span>Supplier: {item.supplierName || 'Verified Supplier'} • 📍 {item.location || 'Northern Mindanao'}</span>
                  </div>

                  {/* Row 2: Product Name */}
                  <h3 className="marketplace-card-title" title={item.name}>
                    {item.name}
                  </h3>

                  {/* Row 3: Secondary Details Slot (Desktop only) */}
                  <p
                    className="marketplace-card-desc"
                    title={item.description}
                  >
                    {item.description || 'Certified agricultural input from verified supplier.'}
                  </p>

                  {/* Row 4: Price Slot */}
                  <div className="marketplace-card-price">
                    <span>₱{item.price.toLocaleString()}</span>
                    <span className="marketplace-card-price-unit">/ {item.unit}</span>
                  </div>

                  {/* Row 5: Stock Status Badge */}
                  <div className="marketplace-card-stock">
                    {item.stockQuantity > 0 ? (
                      <span style={{ color: '#16A34A', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span>✓</span>
                        <span className="marketplace-stock-text">In Stock ({item.stockQuantity} {item.unit})</span>
                        <span className="marketplace-stock-compact">{item.stockQuantity} {item.unit}</span>
                      </span>
                    ) : (
                      <span style={{ color: '#DC2626' }}>✕ Out of Stock</span>
                    )}
                  </div>

                  {/* Row 6: Action Buttons pinned to bottom */}
                  <div className="marketplace-card-actions" onClick={(e) => e.stopPropagation()}>
                    {isOwnProduct ? (
                      <button
                        type="button"
                        onClick={() => {
                          setViewProduct(item);
                          setViewQuantity(1);
                        }}
                        className="marketplace-btn-own"
                      >
                        🏪 <span className="marketplace-btn-manage-full">Your Product (View)</span><span className="marketplace-btn-manage-compact">View</span>
                      </button>
                    ) : !isPurchaser ? (
                      <div className="marketplace-btn-view">
                        🏪 <span className="marketplace-btn-view-full">Catalog View</span><span className="marketplace-btn-view-compact">Catalog</span>
                      </div>
                    ) : (
                      <div className="marketplace-action-grid">
                        {/* Chat with Supplier button */}
                        <button
                          type="button"
                          onClick={() => handleChatWithSupplier(item)}
                          className="btn btn-secondary marketplace-btn-chat"
                          title={`Chat with ${item.supplierName || 'Supplier'}`}
                        >
                          <span>💬</span>
                          <span className="marketplace-btn-text"> Chat</span>
                        </button>

                        {/* Add to Cart button */}
                        <button
                          type="button"
                          onClick={(e) => handleDirectAddToCart(item, 1, e)}
                          disabled={isOutOfStock || isMaxInCart}
                          className="btn btn-secondary marketplace-btn-cart"
                          style={{
                            backgroundColor: isRecentlyAdded ? '#EAF6EE' : undefined,
                            borderColor: isRecentlyAdded ? '#10B981' : qtyInCart > 0 ? '#176B3A' : undefined,
                            color: isOutOfStock ? '#94A3B8' : '#0E4A27',
                          }}
                          title={isMaxInCart ? 'Max in cart' : 'Add to cart'}
                        >
                          <span>{isRecentlyAdded ? '✓' : '🛒'}</span>
                          <span className="marketplace-btn-text">
                            {isRecentlyAdded ? ' Added!' : isMaxInCart ? ' Max' : qtyInCart > 0 ? ` (+1)` : ' Cart'}
                          </span>
                          <span className="marketplace-btn-compact-count">
                            {qtyInCart > 0 ? ` ${qtyInCart}` : ''}
                          </span>
                        </button>

                        {/* Buy Now button */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenSupplyBuyNow(item, 1, e)}
                          disabled={isOutOfStock}
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
      )}

      {/* ─── Supplier Add Product Modal (Centered & Modern) ─── */}
      {showAddModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1050,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            overflowY: 'auto',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              margin: 'auto',
              width: '100%',
              maxWidth: '680px',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.9)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'min(92vh, 860px)',
              padding: 0,
              animation: 'modalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Sticky Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0,
                  }}
                >
                  {currentProdCatConfig?.icon || '📦'}
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                    Add Supply Product
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                    Publish supplies, animal feeds, veterinary biologics, or tools directly to the marketplace.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  color: '#64748b',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Category Picker */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                    Product Category <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => handleProdCategoryChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#fff',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none',
                    }}
                  >
                    {SUPPLY_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                    Product Name & Brand <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder={currentProdCatConfig?.placeholderName || 'e.g. Complete 14-14-14 Fertilizer 50kg'}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Pricing, Stock Quantity & Unit */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                      Price (₱) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b' }}>₱</span>
                      <input
                        type="number"
                        min="1"
                        required
                        value={prodPrice}
                        onChange={(e) => setProdPrice(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '11px 14px 11px 28px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '14px',
                          fontWeight: 700,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                      Available Stock <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={prodStock}
                      onChange={(e) => setProdStock(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        fontWeight: 700,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                      Unit of Sale <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={prodUnit}
                      onChange={(e) => setProdUnit(e.target.value)}
                      placeholder="e.g. sack, bag, bottle, piece"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Suggested quick unit chips */}
                {currentProdCatConfig?.suggestedUnits && currentProdCatConfig.suggestedUnits.length > 0 && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginRight: '8px' }}>
                      Quick Select Unit:
                    </span>
                    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {currentProdCatConfig.suggestedUnits.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setProdUnit(u)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: prodUnit === u ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                            backgroundColor: prodUnit === u ? '#f0fdf4' : '#fff',
                            color: prodUnit === u ? '#166534' : '#475569',
                            fontSize: '12px',
                            fontWeight: prodUnit === u ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.1s ease',
                          }}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warehouse / Store Pickup Location */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                    Store / Warehouse Pickup Location
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px' }}>📍</span>
                    <input
                      type="text"
                      value={prodLocation}
                      onChange={(e) => setProdLocation(e.target.value)}
                      placeholder="e.g. Sayre Highway, Poblacion, Valencia City, Bukidnon"
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 36px',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Photo Upload */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                    Product Photo (Recommended)
                  </label>
                  <input
                    ref={prodFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setProdImageFile(file);
                        setProdImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    style={{ display: 'none' }}
                  />

                  {!prodImagePreview ? (
                    <div
                      onClick={() => prodFileInputRef.current?.click()}
                      style={{
                        border: '2px dashed #bbf7d0',
                        borderRadius: '16px',
                        padding: '24px 20px',
                        textAlign: 'center',
                        backgroundColor: '#f0fdf4',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#16a34a';
                        e.currentTarget.style.backgroundColor = '#dcfce7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#bbf7d0';
                        e.currentTarget.style.backgroundColor = '#f0fdf4';
                      }}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '6px' }}>📸</div>
                      <div style={{ fontWeight: 700, color: '#166534', fontSize: '14px' }}>Click to upload product image</div>
                      <div style={{ fontSize: '12px', color: '#15803d', marginTop: '2px' }}>Supports JPG, PNG, WEBP (Max 10MB)</div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '12px 16px',
                        borderRadius: '16px',
                        border: '1.5px solid #bbf7d0',
                        backgroundColor: '#f0fdf4',
                      }}
                    >
                      <img
                        src={prodImagePreview}
                        alt="Product preview"
                        style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #86efac' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {prodImageFile?.name || 'Selected product photo'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                          ✓ Ready to save
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => prodFileInputRef.current?.click()}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#fff',
                            color: '#334155',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProdImageFile(null);
                            setProdImagePreview('');
                            if (prodFileInputRef.current) prodFileInputRef.current.value = '';
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fff',
                            color: '#dc2626',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                    Description & Specifications
                  </label>
                  <textarea
                    rows={3}
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Specify key nutrients, active ingredients, dosage, application recommendations, or compatibility..."
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #f1f5f9',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submittingProd}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    backgroundColor: '#fff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProd}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {submittingProd ? 'Saving...' : 'Publish Product →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Product Quick-View Details Modal ─── */}
      {viewProduct && (
        <div className="modal-backdrop" onClick={() => setViewProduct(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-info" style={{ fontSize: '13px', marginBottom: '6px', display: 'inline-block' }}>
                  {categories.find((c) => c.key === viewProduct.category)?.label || 'Agri-Supply'}
                </span>
                <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27' }}>
                  {viewProduct.name}
                </h2>
                <div style={{ fontSize: '15px', color: '#525450', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>Supplied by <strong>{viewProduct.supplierName}</strong></span>
                  <span style={{ color: '#166534', fontWeight: 600 }}>• 📍 {viewProduct.location || 'Northern Mindanao'}</span>
                </div>
              </div>
              <button
                onClick={() => setViewProduct(null)}
                style={{
                  background: '#F8F7F3',
                  border: 'none',
                  fontSize: '22px',
                  cursor: 'pointer',
                  color: '#525450',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ height: '240px', background: '#EAF6EE', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px' }}>
              <img
                src={getImageUrl(viewProduct.images?.[0], categoryImages[viewProduct.category] ?? 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80')}
                alt={viewProduct.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#0E4A27' }}>
                  ₱{viewProduct.price.toLocaleString()} <span style={{ fontSize: '17px', color: '#525450', fontWeight: 600 }}>/ {viewProduct.unit}</span>
                </div>
                <div style={{ fontSize: '15px', color: viewProduct.stockQuantity > 0 ? '#1E7E45' : '#BA3C3C', fontWeight: 700, marginTop: '2px' }}>
                  {viewProduct.stockQuantity > 0 ? `✓ ${viewProduct.stockQuantity} available in stock` : '✕ Currently Out of Stock'}
                </div>
              </div>
              <span className="badge badge-verified" style={{ fontSize: '14px' }}>
                ✓ Certified Product
              </span>
            </div>

            <div style={{ padding: '16px', borderRadius: '14px', background: '#F8F7F3', border: '1.5px solid #E4E2DC', marginBottom: '22px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#1A1C1A', marginBottom: '4px' }}>
                Product Description:
              </div>
              <div style={{ fontSize: '15px', color: '#525450', lineHeight: 1.5 }}>
                {viewProduct.description || 'Certified agricultural supply input suitable for regional farming conditions in Northern Mindanao.'}
              </div>
            </div>

            {/* Purchase Controls vs Catalog Notice */}
            {!isPurchaser ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '14px',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}>
                  ℹ️ Ordering supplies and shopping cart are available for registered Farmers and Buyers.
                </div>
                <button
                  type="button"
                  onClick={() => setViewProduct(null)}
                  className="btn btn-secondary btn-large"
                  style={{ minHeight: '48px', fontSize: '15px', fontWeight: 800 }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* Quantity Selector */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '16px', fontWeight: 800, color: '#1A1C1A', display: 'block', marginBottom: '8px' }}>
                    Select Quantity:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setViewQuantity((prev) => Math.max(1, prev - 1))}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        border: '2px solid #D8D6CF',
                        background: '#FFFFFF',
                        fontSize: '22px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={viewQuantity}
                      onChange={(e) => setViewQuantity(Math.max(1, Math.min(viewProduct.stockQuantity, Number(e.target.value) || 1)))}
                      min="1"
                      max={viewProduct.stockQuantity}
                      className="form-input"
                      style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        textAlign: 'center',
                        maxWidth: '120px',
                        minHeight: '48px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setViewQuantity((prev) => Math.min(viewProduct.stockQuantity, prev + 1))}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        border: '2px solid #D8D6CF',
                        background: '#FFFFFF',
                        fontSize: '22px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', color: '#525450', fontWeight: 700 }}>Total Subtotal:</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#0E4A27' }}>
                        ₱{(viewQuantity * viewProduct.price).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi CTA Buttons (Shopee style) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleChatWithSupplier(viewProduct);
                      setViewProduct(null);
                    }}
                    className="btn btn-secondary btn-large"
                    style={{
                      minHeight: '52px',
                      fontSize: '15px',
                      fontWeight: 800,
                      padding: '0 16px',
                      borderColor: '#176B3A',
                      color: '#0E4A27',
                      background: '#EFFDF5',
                    }}
                    title={`Chat with ${viewProduct.supplierName || 'Supplier'}`}
                  >
                    💬 Chat Supplier
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleDirectAddToCart(viewProduct, viewQuantity);
                      setViewProduct(null);
                    }}
                    disabled={viewProduct.stockQuantity <= 0}
                    className="btn btn-secondary btn-large"
                    style={{ minHeight: '52px', fontSize: '15px', fontWeight: 800 }}
                  >
                    🛒 Add to Cart
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSupplyBuyNow(viewProduct, viewQuantity)}
                    disabled={viewProduct.stockQuantity <= 0}
                    className="btn btn-primary btn-large"
                    style={{ minHeight: '52px', fontSize: '15px', fontWeight: 800 }}
                  >
                    ⚡ Buy Now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Supply Express Checkout Modal (Buy Now) ─── */}
      {buyNowProduct && (
        <div className="modal-backdrop" onClick={() => setBuyNowProduct(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '660px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}
          >
            {placedSupplyOrder ? (
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

                <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0E4A27', marginBottom: '8px' }}>
                  Supply Order Placed!
                </h2>
                <p style={{ fontSize: '17px', color: '#525450', marginBottom: '24px' }}>
                  Your direct order has been received by the supplier. Your shopping cart remains untouched!
                </p>

                <div
                  style={{
                    background: '#F8F7F3',
                    border: '2px solid #E4E2DC',
                    borderRadius: '16px',
                    padding: '22px',
                    textAlign: 'left',
                    marginBottom: '26px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '15px', color: '#525450', fontWeight: 600 }}>Order ID</span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#0E4A27', fontFamily: 'monospace' }}>
                      #{placedSupplyOrder.id.slice(-8).toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '15px', color: '#525450', fontWeight: 600 }}>Product</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#1A1C1A' }}>
                      {buyNowProduct.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '15px', color: '#525450', fontWeight: 600 }}>Supplier</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#1A1C1A' }}>
                      {buyNowProduct.supplierName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '15px', color: '#525450', fontWeight: 600 }}>Quantity</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#1A1C1A' }}>
                      {buyNowQuantity} {buyNowProduct.unit}
                    </span>
                  </div>

                  <div
                    style={{
                      borderTop: '2px dashed #D8D6CF',
                      paddingTop: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '17px', fontWeight: 800, color: '#1A1C1A' }}>Total Amount</span>
                    <span style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27' }}>
                      ₱{(buyNowQuantity * buyNowProduct.price).toLocaleString()}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: '14px',
                      padding: '12px 14px',
                      background: '#FFFFFF',
                      borderRadius: '10px',
                      border: '1px solid #D8D6CF',
                      fontSize: '14px',
                      color: '#525450',
                    }}
                  >
                    📍 <strong>Fulfillment:</strong> {buyNowDeliveryMethod === 'delivery' ? `Delivery to ${buyNowAddress}` : 'In-Store Pickup'} • Phone: {buyNowPhone} • {buyNowPaymentMethod === 'cod' ? 'Cash on Delivery/Pickup' : 'GCash'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <button
                    onClick={() => setBuyNowProduct(null)}
                    className="btn btn-secondary btn-large"
                    style={{ minHeight: '52px', fontSize: '16px' }}
                  >
                    Continue Shopping
                  </button>
                  <button
                    onClick={() => {
                      setBuyNowProduct(null);
                      navigate('/supply/orders');
                    }}
                    className="btn btn-primary btn-large"
                    style={{ minHeight: '52px', fontSize: '16px' }}
                  >
                    Track in My Orders →
                  </button>
                </div>
              </div>
            ) : (
              /* ─── Express Checkout Form ─── */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-warning" style={{ fontSize: '12px' }}>
                        ⚡ Express Buy Now
                      </span>
                      <span style={{ fontSize: '13px', color: '#525450' }}>Cart items untouched</span>
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0E4A27', marginTop: '4px' }}>
                      {buyNowProduct.name}
                    </h2>
                    <div style={{ fontSize: '15px', color: '#525450' }}>
                      Supplier: <strong>{buyNowProduct.supplierName}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => setBuyNowProduct(null)}
                    style={{
                      background: '#F8F7F3',
                      border: 'none',
                      fontSize: '22px',
                      cursor: 'pointer',
                      color: '#525450',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* 1. Quantity & Subtotal */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '16px', fontWeight: 800, color: '#1A1C1A', display: 'block', marginBottom: '8px' }}>
                    1. Quantity to Buy
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setBuyNowQuantity((prev) => Math.max(1, prev - 1))}
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        border: '2px solid #D8D6CF',
                        background: '#FFFFFF',
                        fontSize: '22px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={buyNowQuantity}
                      onChange={(e) => setBuyNowQuantity(Math.max(1, Math.min(buyNowProduct.stockQuantity, Number(e.target.value) || 1)))}
                      min="1"
                      max={buyNowProduct.stockQuantity}
                      className="form-input"
                      style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        textAlign: 'center',
                        maxWidth: '120px',
                        minHeight: '46px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setBuyNowQuantity((prev) => Math.min(buyNowProduct.stockQuantity, prev + 1))}
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        border: '2px solid #D8D6CF',
                        background: '#FFFFFF',
                        fontSize: '22px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', color: '#525450', fontWeight: 700 }}>Total:</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#0E4A27' }}>
                        ₱{(buyNowQuantity * buyNowProduct.price).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Fulfillment Method */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '16px', fontWeight: 800, color: '#1A1C1A', display: 'block', marginBottom: '8px' }}>
                    2. Fulfillment Method
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setBuyNowDeliveryMethod('delivery')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: `2.5px solid ${buyNowDeliveryMethod === 'delivery' ? '#176B3A' : '#D8D6CF'}`,
                        background: buyNowDeliveryMethod === 'delivery' ? '#EAF6EE' : '#FFFFFF',
                        color: buyNowDeliveryMethod === 'delivery' ? '#0E4A27' : '#1A1C1A',
                        fontWeight: 800,
                        fontSize: '15px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      🚚 Delivery to Address
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuyNowDeliveryMethod('pickup')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: `2.5px solid ${buyNowDeliveryMethod === 'pickup' ? '#176B3A' : '#D8D6CF'}`,
                        background: buyNowDeliveryMethod === 'pickup' ? '#EAF6EE' : '#FFFFFF',
                        color: buyNowDeliveryMethod === 'pickup' ? '#0E4A27' : '#1A1C1A',
                        fontWeight: 800,
                        fontSize: '15px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      🏬 In-Store Pickup
                    </button>
                  </div>
                  {buyNowDeliveryMethod === 'delivery' ? (
                    <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🚚</span>
                      <span><strong>Delivery Fee:</strong> To be confirmed by the supplier upon order acceptance based on cargo size and transport vehicle.</span>
                    </div>
                  ) : (
                    <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>✓</span>
                      <span><strong>Store Pickup:</strong> ₱0 (FREE) — Pickup directly at the supplier's store/warehouse.</span>
                    </div>
                  )}
                </div>

                {/* 3. Address & Phone */}
                <div style={{ marginBottom: '20px' }}>
                  {buyNowDeliveryMethod === 'delivery' && (
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '15px', fontWeight: 800, color: '#1A1C1A', display: 'block', marginBottom: '6px' }}>
                        Delivery Address / Barangay *
                      </label>
                      <input
                        type="text"
                        value={buyNowAddress}
                        onChange={(e) => setBuyNowAddress(e.target.value)}
                        placeholder="e.g. Purok 5, Poblacion, Malaybalay, Bukidnon"
                        className="form-input"
                        style={{ fontSize: '15px' }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '15px', fontWeight: 800, color: '#1A1C1A', display: 'block', marginBottom: '6px' }}>
                      Contact Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={buyNowPhone}
                      onChange={(e) => setBuyNowPhone(e.target.value)}
                      placeholder="e.g. 0917 123 4567"
                      className="form-input"
                      style={{ fontSize: '15px' }}
                    />
                  </div>
                </div>

                {/* 4. Payment Method */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '16px', fontWeight: 800, color: '#1A1C1A', display: 'block', marginBottom: '8px' }}>
                    3. Payment Method
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setBuyNowPaymentMethod('cod')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: `2.5px solid ${buyNowPaymentMethod === 'cod' ? '#176B3A' : '#D8D6CF'}`,
                        background: buyNowPaymentMethod === 'cod' ? '#EAF6EE' : '#FFFFFF',
                        color: buyNowPaymentMethod === 'cod' ? '#0E4A27' : '#1A1C1A',
                        fontWeight: 800,
                        fontSize: '15px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      💵 {buyNowDeliveryMethod === 'pickup' ? 'Cash on Pickup' : 'Cash on Delivery (COD)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuyNowPaymentMethod('gcash')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: `2.5px solid ${buyNowPaymentMethod === 'gcash' ? '#176B3A' : '#D8D6CF'}`,
                        background: buyNowPaymentMethod === 'gcash' ? '#EAF6EE' : '#FFFFFF',
                        color: buyNowPaymentMethod === 'gcash' ? '#0E4A27' : '#1A1C1A',
                        fontWeight: 800,
                        fontSize: '15px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      📱 GCash / E-Wallet
                    </button>
                  </div>
                </div>

                {/* 5. Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '14px', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => setBuyNowProduct(null)}
                    className="btn btn-secondary btn-large"
                    style={{ minHeight: '52px', fontSize: '16px' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handlePlaceSupplyBuyNow}
                    disabled={isSubmittingBuyNow}
                    className="btn btn-primary btn-large"
                    style={{
                      minHeight: '52px',
                      fontSize: '17px',
                      fontWeight: 800,
                      opacity: isSubmittingBuyNow ? 0.7 : 1,
                      cursor: isSubmittingBuyNow ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmittingBuyNow ? 'Placing Order...' : `🛒 Place Order (₱${(buyNowQuantity * buyNowProduct.price).toLocaleString()})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
