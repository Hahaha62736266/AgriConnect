import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { supplyApi } from '../api/supply';
import { api, getImageUrl } from '../api';
import { useToast } from '../contexts/ToastContext';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import type { SupplyCategory, SupplyProduct } from '../types/supply';
import { SUPPLY_CATEGORIES } from '../types/supply';

export const ManageSupplyProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<SupplyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'stock_desc' | 'stock_asc'>('newest');

  const [name, setName] = useState('');
  const [category, setCategory] = useState<SupplyCategory>('fertilizer');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [stockQuantity, setStockQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('sack (50kg)');
  const [location, setLocation] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [existingImageUrl, setExistingImageUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const currentCatConfig = SUPPLY_CATEGORIES.find((c) => c.key === category);

  const handleCategoryChange = (newCat: SupplyCategory) => {
    setCategory(newCat);
    const conf = SUPPLY_CATEGORIES.find((c) => c.key === newCat);
    if (conf && conf.suggestedUnits.length > 0 && !editingId) {
      setUnit(conf.suggestedUnits[0]);
    }
  };

  const fetchMyProducts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await supplyApi.listProducts({ supplierId: user.id });
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProducts();
  }, [user]);

  const handleOpenForm = (product?: SupplyProduct) => {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (product) {
      setEditingId(product.id);
      setName(product.name);
      setCategory(product.category);
      setDescription(product.description);
      setPrice(product.price);
      setStockQuantity(product.stockQuantity);
      setUnit(product.unit);
      setLocation(product.location || '');
      const img = product.images?.[0] || '';
      setExistingImageUrl(img);
      setImagePreview(img ? getImageUrl(img) : '');
    } else {
      setEditingId(null);
      setName('');
      setCategory('fertilizer');
      setDescription('');
      setPrice('');
      setStockQuantity('');
      setUnit('sack (50kg)');
      setLocation(
        user?.municipality && user?.province
          ? `${user.municipality}, ${user.province}`
          : user?.address || 'Northern Mindanao'
      );
      setExistingImageUrl('');
      setImagePreview('');
    }
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setExistingImageUrl('');
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let finalImageUrl = existingImageUrl;
    if (imageFile) {
      try {
        const uploadRes = await api.uploadImage(imageFile);
        finalImageUrl = uploadRes.url;
      } catch (err: any) {
        toastError('Upload Failed', 'Failed to upload product image: ' + (err.response?.data?.error || err.message));
        setSaving(false);
        return;
      }
    }

    const parsedPrice = typeof price === 'number' ? price : parseFloat(String(price));
    const parsedStock = typeof stockQuantity === 'number' ? stockQuantity : parseInt(String(stockQuantity), 10);

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toastError('Invalid Price', 'Please enter a valid product price greater than ₱0.');
      setSaving(false);
      return;
    }

    if (isNaN(parsedStock) || parsedStock < 0) {
      toastError('Invalid Stock', 'Please enter a valid stock quantity (0 or greater).');
      setSaving(false);
      return;
    }

    const payload = {
      name,
      category,
      description,
      price: parsedPrice,
      stockQuantity: parsedStock,
      unit,
      location,
      images: finalImageUrl ? [finalImageUrl] : [],
    };

    try {
      if (editingId) {
        await supplyApi.updateProduct(editingId, payload);
        toastSuccess('Product Updated', `"${name}" has been updated successfully!`);
      } else {
        await supplyApi.createProduct(payload);
        toastSuccess('Product Added', `"${name}" has been added to your inventory!`);
      }
      setShowForm(false);
      setImageFile(null);
      setExistingImageUrl('');
      setImagePreview('');
      fetchMyProducts();
    } catch (err: any) {
      toastError('Save Failed', err.response?.data?.error || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const [productToDelete, setProductToDelete] = useState<SupplyProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await supplyApi.deleteProduct(productToDelete.id);
      toastSuccess('Product Deleted', `"${productToDelete.name}" has been permanently removed.`);
      setProductToDelete(null);
      fetchMyProducts();
    } catch (err: any) {
      toastError('Delete Failed', err.response?.data?.error || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  // KPI Metrics
  const totalProducts = products.length;
  const totalInventoryValue = products.reduce((sum, p) => sum + p.price * p.stockQuantity, 0);
  const activeCategoriesCount = new Set(products.map((p) => p.category)).size;
  const lowStockProducts = products.filter((p) => p.stockQuantity <= 10).length;

  // Filter & Sort
  const sortedAndFilteredProducts = products
    .filter((item) => {
      const matchesCat = filterCategory === 'all' || item.category === filterCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'stock_desc') return b.stockQuantity - a.stockQuantity;
      if (sortBy === 'stock_asc') return a.stockQuantity - b.stockQuantity;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Navbar />

      <main style={{ maxWidth: '1160px', margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Top Header Banner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '20px',
            marginBottom: '28px',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
              🏪 Agri-Supply Partner Hub
            </div>
            <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Manage My Products
            </h1>
            <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>
              Add, update, and manage supplies, feeds, veterinary medicine, and tools listed for local farmers.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/supply/orders')}
              style={{
                padding: '11px 20px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                backgroundColor: '#fff',
                color: '#334155',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#94a3b8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
            >
              📦 View Orders Received
            </button>

            <button
              onClick={() => handleOpenForm()}
              style={{
                padding: '11px 22px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(22, 163, 74, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(22, 163, 74, 0.3)';
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
              <span>Add New Product</span>
            </button>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              padding: '20px',
              borderRadius: '16px',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Listed Products</span>
              <span style={{ fontSize: '20px' }}>📦</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{totalProducts}</div>
            <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>Active in Store</div>
          </div>

          <div
            style={{
              padding: '20px',
              borderRadius: '16px',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Total Stock Value</span>
              <span style={{ fontSize: '20px' }}>💰</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>
              ₱{totalInventoryValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Estimated retail value</div>
          </div>

          <div
            style={{
              padding: '20px',
              borderRadius: '16px',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Categories Offered</span>
              <span style={{ fontSize: '20px' }}>🏷️</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{activeCategoriesCount}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Across {SUPPLY_CATEGORIES.length} available</div>
          </div>

          <div
            style={{
              padding: '20px',
              borderRadius: '16px',
              backgroundColor: lowStockProducts > 0 ? '#fefce8' : '#fff',
              border: lowStockProducts > 0 ? '1px solid #fef08a' : '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: lowStockProducts > 0 ? '#854d0e' : '#64748b' }}>
                Low Stock Alert
              </span>
              <span style={{ fontSize: '20px' }}>⚠️</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: lowStockProducts > 0 ? '#b45309' : '#0f172a' }}>
              {lowStockProducts}
            </div>
            <div style={{ fontSize: '12px', color: lowStockProducts > 0 ? '#b45309' : '#16a34a', fontWeight: 600, marginTop: '4px' }}>
              {lowStockProducts > 0 ? 'Needs replenishment (≤ 10 qty)' : 'All items well stocked'}
            </div>
          </div>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            padding: '18px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#94a3b8' }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by title, active ingredient, brand, or location..."
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 40px',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="newest">Recently Added</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="stock_desc">Highest Stock</option>
                <option value="stock_asc">Lowest Stock</option>
              </select>
            </div>
          </div>

          {/* Category Pill Filters */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              onClick={() => setFilterCategory('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1.5px solid',
                borderColor: filterCategory === 'all' ? '#16a34a' : '#e2e8f0',
                backgroundColor: filterCategory === 'all' ? '#f0fdf4' : '#fff',
                color: filterCategory === 'all' ? '#166534' : '#64748b',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.12s ease',
              }}
            >
              🏪 All ({products.length})
            </button>
            {SUPPLY_CATEGORIES.map((cat) => {
              const count = products.filter((p) => p.category === cat.key).length;
              const active = filterCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setFilterCategory(cat.key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1.5px solid',
                    borderColor: active ? '#16a34a' : '#e2e8f0',
                    backgroundColor: active ? '#f0fdf4' : '#fff',
                    color: active ? '#166534' : '#64748b',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span style={{ opacity: 0.8, fontSize: '11px', fontWeight: 600 }}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product List */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔄</div>
            <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 600, margin: 0 }}>Loading your store inventory...</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: '60px 24px', borderRadius: '20px', textAlign: 'center', backgroundColor: '#fff', border: '1.5px dashed #cbd5e1' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏪🌾</div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              No supply products listed yet
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '440px', margin: '0 auto 20px' }}>
              Start listing animal feeds, veterinary biologics, fertilizers, crop protection, seeds, or machinery for farmers.
            </p>
            <button
              onClick={() => handleOpenForm()}
              style={{
                padding: '10px 22px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              }}
            >
              + Add Your First Product
            </button>
          </div>
        ) : sortedAndFilteredProducts.length === 0 ? (
          <div style={{ padding: '48px 24px', borderRadius: '20px', textAlign: 'center', backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔍</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>No matching products</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px' }}>Try clearing your search query or choosing another category.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('all');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                backgroundColor: '#fff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {sortedAndFilteredProducts.map((item) => {
              const catConf = SUPPLY_CATEGORIES.find((c) => c.key === item.category);
              const isLowStock = item.stockQuantity > 0 && item.stockQuantity <= 10;
              const isOutOfStock = item.stockQuantity === 0;

              return (
                <div
                  key={item.id}
                  style={{
                    padding: '20px',
                    borderRadius: '20px',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '20px',
                    flexWrap: 'wrap',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1, minWidth: '280px' }}>
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={getImageUrl(item.images[0])}
                        alt={item.name}
                        style={{
                          width: '76px',
                          height: '76px',
                          borderRadius: '14px',
                          objectFit: 'cover',
                          border: '1px solid #e2e8f0',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '76px',
                          height: '76px',
                          borderRadius: '14px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '30px',
                          flexShrink: 0,
                        }}
                      >
                        {catConf?.icon || '📦'}
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {item.name}
                        </h3>

                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '12px',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            color: '#166534',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <span>{catConf?.icon || '📦'}</span>
                          <span>{catConf?.label || item.category.replace(/_/g, ' ')}</span>
                        </span>

                        {isOutOfStock ? (
                          <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', backgroundColor: '#fee2e2', color: '#991b1b' }}>
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#92400e' }}>
                            Low Stock
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#065f46' }}>
                            In Stock
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>
                          ₱{item.price.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                          per {item.unit}
                        </span>
                        <span style={{ color: '#cbd5e1', margin: '0 4px' }}>•</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                          {item.stockQuantity} {item.unit}s available
                        </span>
                      </div>

                      {item.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#64748b' }}>
                          <span>📍</span>
                          <span>{item.location}</span>
                        </div>
                      )}

                      {item.description && (
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleOpenForm(item)}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: '#fff',
                        color: '#1e293b',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.borderColor = '#94a3b8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fff';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      onClick={() => setProductToDelete(item)}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '10px',
                        border: '1.5px solid #fecaca',
                        backgroundColor: '#fef2f2',
                        color: '#b91c1c',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fef2f2';
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2 2v2" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Centered Modal Form ─── */}
        {showForm && (
          <div
            className="modal-backdrop"
            onClick={() => setShowForm(false)}
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
                    {currentCatConfig?.icon || '📦'}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                      {editingId ? 'Edit Supply Product' : 'Add New Supply Product'}
                    </h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                      {editingId
                        ? 'Update the price, stock, or details of this inventory item.'
                        : 'List supplies, feeds, veterinary biologics, or tools for local farmers.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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
              <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Category Picker */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                      Product Category <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => handleCategoryChange(e.target.value as SupplyCategory)}
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
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={currentCatConfig?.placeholderName || 'e.g. Complete 14-14-14 Fertilizer 50kg'}
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
                          min="0"
                          step="any"
                          required
                          value={price}
                          placeholder="0.00"
                          onFocus={() => {
                            if (price === 0) setPrice('');
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setPrice('');
                            } else {
                              const num = parseFloat(val);
                              setPrice(isNaN(num) ? '' : num);
                            }
                          }}
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
                        value={stockQuantity}
                        placeholder="e.g. 50"
                        onFocus={() => {
                          if (stockQuantity === 0) setStockQuantity('');
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setStockQuantity('');
                          } else {
                            const num = parseInt(val, 10);
                            setStockQuantity(isNaN(num) ? '' : num);
                          }
                        }}
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
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
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
                  {currentCatConfig?.suggestedUnits && currentCatConfig.suggestedUnits.length > 0 && (
                    <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginRight: '8px' }}>
                        Quick Select Unit:
                      </span>
                      <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {currentCatConfig.suggestedUnits.map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setUnit(u)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '8px',
                              border: unit === u ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                              backgroundColor: unit === u ? '#f0fdf4' : '#fff',
                              color: unit === u ? '#166534' : '#475569',
                              fontSize: '12px',
                              fontWeight: unit === u ? 700 : 500,
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

                  {/* Warehouse / Pickup Location */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                      Store / Warehouse Pickup Location
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px' }}>📍</span>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
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
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />

                    {!imagePreview ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
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
                          src={imagePreview}
                          alt="Product preview"
                          style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #86efac' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {imageFile?.name || 'Selected product photo'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                            ✓ Ready to save
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
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
                            onClick={handleRemoveImage}
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
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
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
                    onClick={() => setShowForm(false)}
                    disabled={saving}
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
                    disabled={saving}
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
                    {saving ? 'Saving...' : editingId ? 'Update Product' : 'Add to Inventory'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* UI/UX Expert Destructive Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={!!productToDelete}
          onClose={() => {
            if (!isDeleting) setProductToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          item={
            productToDelete
              ? {
                id: productToDelete.id,
                name: productToDelete.name,
                category: productToDelete.category,
                price: productToDelete.price,
                unit: productToDelete.unit,
                stock: productToDelete.stockQuantity,
                image: productToDelete.images?.[0],
                typeLabel: 'Supply Product',
              }
              : null
          }
          title="Delete Supply Product?"
          description="Are you sure you want to delete this supply product from your store inventory? Once removed, buyers and farmers will no longer be able to purchase it."
          confirmText="Yes, Delete Product"
          cancelText="Cancel, Keep Product"
          isDeleting={isDeleting}
        />
      </main>
    </div>
  );
};
