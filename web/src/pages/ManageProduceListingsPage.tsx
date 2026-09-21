import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getImageUrl } from '../api';
import { produceApi } from '../api/produce';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { ManageItemSkeleton } from '../components/PageSkeletons';
import { PRODUCE_CATEGORIES, type ProduceListing, type ListingStatus } from '../types/produce';

export const ManageProduceListingsPage: React.FC = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [searchParams] = useSearchParams();

  const [myListings, setMyListings] = useState<ProduceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter state for listings
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // Add / Edit Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingListing, setEditingListing] = useState<ProduceListing | null>(null);

  // Form Fields
  const [cropName, setCropName] = useState('');
  const [category, setCategory] = useState('Vegetables');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('50');
  const [farmLocation, setFarmLocation] = useState('');
  const [availableDate, setAvailableDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to find category config
  const currentCatConfig =
    PRODUCE_CATEGORIES.find(
      (c) =>
        c.name.toLowerCase() === category.toLowerCase() ||
        c.id === category.toLowerCase() ||
        (category.toLowerCase().includes('livestock') && c.id === 'livestock') ||
        (category.toLowerCase().includes('grain') && c.id === 'grains') ||
        (category.toLowerCase().includes('fruit') && c.id === 'fruits') ||
        (category.toLowerCase().includes('root') && c.id === 'root_crops') ||
        (category.toLowerCase().includes('fish') && c.id === 'fisheries') ||
        (category.toLowerCase().includes('spice') && c.id === 'spices')
    ) || PRODUCE_CATEGORIES[0];

  const isLivestock = category.toLowerCase().includes('livestock');
  const isFisheries = category.toLowerCase().includes('fish');

  // Category Icon resolver
  const getCategoryIcon = (catName?: string): string => {
    if (!catName) return '🌱';
    const match = PRODUCE_CATEGORIES.find(
      (c) =>
        c.name.toLowerCase() === catName.toLowerCase() ||
        c.id === catName.toLowerCase() ||
        catName.toLowerCase().includes(c.id) ||
        (catName.toLowerCase().includes('livestock') && c.id === 'livestock')
    );
    return match ? match.icon : '🌱';
  };

  // Adaptive suggested tags based on category
  const getSuggestedTags = () => {
    if (isLivestock) {
      return [
        'Free-Range / Pasture-Raised',
        'Dewormed & Vaccinated',
        'Breeder Quality',
        'Live Weight Verified',
        'Farmgate Pickup Ready',
        'Organic-Fed',
      ];
    }
    if (isFisheries) {
      return [
        'Fresh Catch of the Day',
        'Live Fish Available',
        'Cleaned & Gutted Option',
        'Pond Harvested',
        'Bulk Wholesale Ready',
      ];
    }
    return [
      'Fresh Harvest',
      'Organically Grown',
      'Grade A Premium',
      'Farmgate Wholesale',
      'Pesticide-Free',
      'Same-Day Delivery Ready',
    ];
  };

  // Switch category and adapt unit/price defaults smoothly
  const handleCategoryChange = (newCatName: string) => {
    setCategory(newCatName);
    const catCfg = PRODUCE_CATEGORIES.find(
      (c) => c.name.toLowerCase() === newCatName.toLowerCase() || c.id === newCatName.toLowerCase()
    );
    if (catCfg && catCfg.suggestedUnits.length > 0) {
      if (newCatName.toLowerCase().includes('livestock') && (!unit || unit === 'kg')) {
        setUnit('head');
        setQuantity('5');
        setPrice('3500');
      } else if (!newCatName.toLowerCase().includes('livestock') && unit === 'head') {
        setUnit(catCfg.suggestedUnits[0]);
        setQuantity('100');
        setPrice('50');
      }
    }
  };

  // Load farmer's actual listings from backend
  const loadListings = async () => {
    setIsLoading(true);
    try {
      if (user?.id) {
        const data = await produceApi.listListings({ farmerId: user.id });
        setMyListings(data);
      } else {
        // Fallback to all listings if user ID not yet available
        const all = await produceApi.listListings();
        setMyListings(all);
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [user?.id]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openAddModal();
    }
  }, [searchParams]);

  const defaultUserLocation = user
    ? [user.barangay, user.municipality, user.province].filter(Boolean).join(', ') || user.address || ''
    : '';

  const openAddModal = (presetCategory?: string) => {
    setEditingListing(null);
    setCropName('');
    const initialCat = presetCategory || 'Vegetables';
    setCategory(initialCat);
    const catCfg = PRODUCE_CATEGORIES.find(
      (c) => c.name.toLowerCase() === initialCat.toLowerCase() || c.id === initialCat.toLowerCase()
    );
    if (initialCat.toLowerCase().includes('livestock')) {
      setUnit('head');
      setQuantity('5');
      setPrice('3500');
    } else {
      setUnit(catCfg?.suggestedUnits[0] || 'kg');
      setQuantity('100');
      setPrice('50');
    }
    setFarmLocation(defaultUserLocation || 'Northern Mindanao');
    setAvailableDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setSelectedTags([]);
    setImageFile(null);
    setImagePreview('');
    setExistingPhotos([]);
    setShowFormModal(true);
  };

  const openEditModal = (item: ProduceListing) => {
    setEditingListing(item);
    setCropName(item.cropName);
    const itemCat = item.category || 'Vegetables';
    setCategory(itemCat);
    setQuantity(String(item.quantity));
    setUnit(item.unit || 'kg');
    setPrice(String(item.pricePerUnit));
    setFarmLocation(item.location || '');
    setAvailableDate(item.harvestDate ? String(item.harvestDate).split('T')[0] : '');
    
    // Parse tags from description if present
    const tagsMatch = item.description?.match(/Tags:\s*(.+)$/i);
    if (tagsMatch) {
      const parsedTags = tagsMatch[1].split(',').map((t) => t.trim()).filter(Boolean);
      setSelectedTags(parsedTags);
      setDescription((item.description || '').replace(/\n*Tags:\s*.+$/i, '').trim());
    } else {
      setSelectedTags([]);
      setDescription(item.description || '');
    }

    setImageFile(null);
    setImagePreview('');
    setExistingPhotos(item.photos || []);
    setShowFormModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setExistingPhotos([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropName.trim()) return;

    setIsSubmitting(true);
    let uploadedPhotoUrl = '';

    try {
      if (imageFile) {
        const uploadRes = await api.uploadImage(imageFile);
        uploadedPhotoUrl = uploadRes.url;
      }
    } catch (uploadErr) {
      console.warn('Image upload failed, continuing with listing:', uploadErr);
    }

    const finalPhotos = uploadedPhotoUrl
      ? [uploadedPhotoUrl]
      : existingPhotos.length > 0
      ? existingPhotos
      : [];

    try {
      const tagsSuffix = selectedTags.length > 0 ? `\n\nTags: ${selectedTags.join(', ')}` : '';
      const defaultDesc = isLivestock
        ? `Healthy livestock from ${farmLocation.trim()}`
        : isFisheries
        ? `Fresh fish/seafood from ${farmLocation.trim()}`
        : `Fresh harvest from ${farmLocation.trim()}`;
      const finalDescription = (description.trim() || defaultDesc) + tagsSuffix;

      if (editingListing) {
        // Update existing listing
        await produceApi.updateListing(editingListing.id, {
          cropName: cropName.trim(),
          category,
          quantity: Number(quantity) || 1,
          unit: unit.trim() || 'kg',
          pricePerUnit: Number(price) || 0,
          harvestDate: availableDate,
          location: farmLocation.trim(),
          photos: finalPhotos,
          description: finalDescription,
          status: editingListing.status === 'sold' && Number(quantity) > 0 ? 'available' : editingListing.status,
        });
        toastSuccess('Listing Updated!', `"${cropName}" changes have been saved.`);
      } else {
        // Create new listing
        await produceApi.createListing({
          cropName: cropName.trim(),
          category,
          quantity: Number(quantity) || 1,
          unit: unit.trim() || 'kg',
          pricePerUnit: Number(price) || 0,
          harvestDate: availableDate,
          location: farmLocation.trim(),
          photos: finalPhotos,
          description: finalDescription,
        });
        toastSuccess('Listing Published!', `"${cropName}" is now live on the marketplace.`);
      }

      await loadListings();
      setShowFormModal(false);
    } catch (err: any) {
      console.error('Failed to save listing:', err);
      toastError('Save Failed', err.response?.data?.error || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePauseStatus = async (item: ProduceListing) => {
    const newStatus: ListingStatus = item.status === 'available' ? 'reserved' : 'available';
    try {
      // Optimistic update
      setMyListings((prev) =>
        prev.map((l) => (l.id === item.id ? { ...l, status: newStatus } : l))
      );
      await produceApi.updateListing(item.id, {
        cropName: item.cropName,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        pricePerUnit: item.pricePerUnit,
        harvestDate: item.harvestDate,
        location: item.location,
        photos: item.photos,
        status: newStatus,
      });
      if (newStatus === 'available') {
        toastSuccess('Listing Live', `"${item.cropName}" is now accepting orders!`);
      } else {
        toastInfo('Listing Paused', `"${item.cropName}" is paused from marketplace search.`);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      toastError('Update Failed', 'Could not update listing status.');
      loadListings();
    }
  };

  const [listingToDelete, setListingToDelete] = useState<ProduceListing | null>(null);
  const [isDeletingListing, setIsDeletingListing] = useState(false);

  const handleConfirmDeleteListing = async () => {
    if (!listingToDelete) return;
    setIsDeletingListing(true);
    try {
      await produceApi.deleteListing(listingToDelete.id);
      toastInfo('Listing Deleted', `Listing for "${listingToDelete.cropName}" has been removed.`);
      setListingToDelete(null);
      loadListings();
    } catch (err: any) {
      toastError('Delete Failed', err.response?.data?.error || err.message);
    } finally {
      setIsDeletingListing(false);
    }
  };

  const filteredMyListings = myListings.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.cropName.toLowerCase().includes(q) ||
      (item.location && item.location.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q));

    const catLower = (item.category || '').toLowerCase();
    const filterLower = filterCategory.toLowerCase();
    const matchesCategory =
      filterCategory === 'All' ||
      catLower === filterLower ||
      catLower.includes(filterLower) ||
      filterLower.includes(catLower) ||
      (filterLower.includes('livestock') && catLower.includes('livestock'));

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="app-container" style={{ paddingBottom: '40px' }}>
      {/* ─── Page Header ─── */}
      <div className="manage-header-wrap" style={{ marginBottom: '24px' }}>
        <div className="manage-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="manage-title" style={{ fontSize: '32px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
              My Farm Listings (Crops & Livestock)
            </h1>
            <p className="manage-subtitle" style={{ fontSize: '16px', color: '#525450', marginTop: '6px', margin: 0 }}>
              Manage and list real harvests, livestock, and farm goods you are selling on the AgriConnect Marketplace.
            </p>
          </div>

          <button
            onClick={() => openAddModal()}
            className="btn btn-primary btn-large manage-add-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '15px', fontWeight: 800 }}
          >
            <span className="manage-add-btn-full">+ Add Listing for Sale</span>
            <span className="manage-add-btn-compact">+ Add</span>
          </button>
        </div>
      </div>

      {/* ─── Search & Category Filter Bar ─── */}
      <div
        className="manage-search-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          marginBottom: '24px',
          backgroundColor: '#ffffff',
          padding: '16px 20px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="manage-search-box" style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#94a3b8' }}>
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your listings by name, location, or notes..."
              className="form-input manage-search-input"
              style={{ paddingLeft: '38px', paddingRight: '14px', height: '42px', fontSize: '14px', width: '100%' }}
            />
          </div>

          <div className="manage-count-label" style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
            Showing {filteredMyListings.length} of {myListings.length} listing{myListings.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Category Pills */}
        <div className="manage-categories-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            type="button"
            onClick={() => setFilterCategory('All')}
            className={`manage-category-chip ${filterCategory === 'All' ? 'active' : ''}`}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: filterCategory === 'All' ? '1.5px solid #0E4A27' : '1px solid #cbd5e1',
              backgroundColor: filterCategory === 'All' ? '#0E4A27' : '#f8fafc',
              color: filterCategory === 'All' ? '#ffffff' : '#475569',
              fontSize: '13px',
              fontWeight: filterCategory === 'All' ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            🌱 All ({myListings.length})
          </button>

          {PRODUCE_CATEGORIES.map((cat) => {
            const count = myListings.filter((l) => {
              const c = (l.category || '').toLowerCase();
              return c.includes(cat.name.toLowerCase()) || c.includes(cat.id.toLowerCase());
            }).length;

            const isSelected = filterCategory === cat.name;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.name)}
                className={`manage-category-chip ${isSelected ? 'active' : ''}`}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: isSelected ? '1.5px solid #0E4A27' : '1px solid #cbd5e1',
                  backgroundColor: isSelected ? '#0E4A27' : '#f8fafc',
                  color: isSelected ? '#ffffff' : '#475569',
                  fontSize: '13px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.icon} {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Add / Edit Modal Form ─── */}
      {showFormModal && (
        <div className="modal-backdrop" onClick={() => setShowFormModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
                  {editingListing
                    ? isLivestock
                      ? 'Edit Livestock Listing'
                      : 'Edit Product Listing'
                    : isLivestock
                    ? 'Add Livestock / Poultry for Sale'
                    : isFisheries
                    ? 'Add Fisheries / Aquaculture for Sale'
                    : 'Add Crop / Produce for Sale'}
                </h2>
                <p style={{ fontSize: '14px', color: '#525450', marginTop: '4px', margin: 0 }}>
                  {editingListing
                    ? 'Update the price, quantity, or details of your listing.'
                    : isLivestock
                    ? 'Fill out details below to publish live cattle, swine, goats, poultry, or farm animals.'
                    : 'Fill out the details below to publish your harvest to local buyers.'}
                </p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                style={{
                  background: '#F8F7F3',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#525450',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveListing}>
              {/* Product / Animal Name */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                  {isLivestock
                    ? '1. What livestock / poultry are you selling? *'
                    : isFisheries
                    ? '1. What fish / seafood are you selling? *'
                    : '1. What crop / farm product are you selling? *'}
                </label>
                <input
                  type="text"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  placeholder={currentCatConfig.samplePlaceholder}
                  required
                  className="form-input"
                  style={{ fontSize: '15px', padding: '12px 14px' }}
                />
              </div>

              {/* Category */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                  2. Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '15px', padding: '12px 14px' }}
                >
                  {PRODUCE_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '8px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                    3. Total Quantity Available *
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 10"
                    min="1"
                    required
                    className="form-input"
                    style={{ fontSize: '15px', padding: '12px 14px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                    Unit *
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. head, kg, sack"
                    required
                    className="form-input"
                    style={{ fontSize: '15px', padding: '12px 14px' }}
                  />
                </div>
              </div>

              {/* Quick Unit Suggestion Chips */}
              <div
                style={{
                  marginBottom: '16px',
                  backgroundColor: '#F8FAFC',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  ⚡ Quick Units for {currentCatConfig.name}:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {currentCatConfig.suggestedUnits.map((u) => {
                    const isSelected = unit.toLowerCase() === u.toLowerCase();
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnit(u)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '16px',
                          border: isSelected ? '1.5px solid #0E4A27' : '1px solid #CBD5E1',
                          backgroundColor: isSelected ? '#E8F5E9' : '#FFFFFF',
                          color: isSelected ? '#0E4A27' : '#334155',
                          fontSize: '12px',
                          fontWeight: isSelected ? 800 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected ? '✓ ' : ''}{u}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price per unit */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                  4. Price per {unit || 'unit'} (₱) *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 3500"
                  min="0"
                  step="any"
                  required
                  className="form-input"
                  style={{ fontSize: '15px', padding: '12px 14px' }}
                />
              </div>

              {/* Location */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                  5. Farm / Pickup Location *
                </label>
                <input
                  type="text"
                  value={farmLocation}
                  onChange={(e) => setFarmLocation(e.target.value)}
                  placeholder="e.g. Brgy. Carmen, Cagayan de Oro, Misamis Oriental"
                  required
                  className="form-input"
                  style={{ fontSize: '15px', padding: '12px 14px' }}
                />
              </div>

              {/* Available / Harvest Date */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                  {isLivestock
                    ? '6. Date ready for live inspection / pickup *'
                    : '6. When is it harvested / ready for pickup? *'}
                </label>
                <input
                  type="date"
                  value={availableDate}
                  onChange={(e) => setAvailableDate(e.target.value)}
                  required
                  className="form-input"
                  style={{ fontSize: '15px', padding: '12px 14px' }}
                />
              </div>

              {/* Quality Highlights & Badges */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                  7. Highlights & Quality Badges (optional)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {getSuggestedTags().map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(selectedTags.filter((t) => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '16px',
                          border: isSelected ? '1.5px solid #0E4A27' : '1px solid #E2E8F0',
                          backgroundColor: isSelected ? '#E8F5E9' : '#FFFFFF',
                          color: isSelected ? '#0E4A27' : '#64748B',
                          fontSize: '12px',
                          fontWeight: isSelected ? 800 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                  8. Description & Notes (optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    isLivestock
                      ? 'Describe your livestock (e.g. breed, approx. weight in kg, age in months, vaccination status, feeding regimen)...'
                      : 'Describe your crop (e.g. freshly picked, organically grown, grade A size, sweet variety, ideal for retail or bulk buyers)...'
                  }
                  className="form-input"
                  style={{ fontSize: '14px', padding: '10px 14px', width: '100%', borderRadius: '10px', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              {/* Image Upload */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                  9. Attach Photo (optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />

                {!imagePreview && existingPhotos.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #93c5fd',
                      borderRadius: '14px',
                      padding: '20px',
                      textAlign: 'center',
                      backgroundColor: '#eff6ff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>{isLivestock ? '🐓' : '📷'}</div>
                    <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '15px' }}>
                      {isLivestock ? 'Click to upload animal photo' : 'Click to upload fresh harvest photo'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Supports JPG, PNG, WEBP</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px', borderRadius: '14px', border: '1.5px solid #bfdbfe', backgroundColor: '#f0f9ff' }}>
                    <img
                      src={imagePreview || getImageUrl(existingPhotos[0], '')}
                      alt="Preview"
                      style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {imageFile?.name || 'Current photo'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>Ready with listing</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #fca5a5', backgroundColor: '#fff', color: '#dc2626', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                      Change / Remove
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="btn btn-secondary btn-large"
                  style={{ flex: 1, fontSize: '15px' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-large"
                  style={{ flex: 2, fontSize: '15px', fontWeight: 800 }}
                >
                  {isSubmitting
                    ? 'Saving Listing…'
                    : editingListing
                    ? 'Save Changes'
                    : 'Publish Listing →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Crop / Livestock List or Empty State ─── */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} role="status" aria-label="Loading your farm listings...">
          <ManageItemSkeleton />
          <ManageItemSkeleton />
          <ManageItemSkeleton />
        </div>
      ) : filteredMyListings.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {filteredMyListings.map((item) => {
            const isSoldOut = item.status === 'sold' || item.quantity <= 0;
            const isLive = item.status === 'available' && item.quantity > 0;
            const isItemLivestock = (item.category || '').toLowerCase().includes('livestock');
            const defaultPhoto = isItemLivestock
              ? 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=600&q=80'
              : 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80';
            const photoUrl = getImageUrl(item.photos?.[0], defaultPhoto);

            // Extract tags from description if present
            const tagsMatch = item.description?.match(/Tags:\s*(.+)$/i);
            const itemTags = tagsMatch ? tagsMatch[1].split(',').map((t) => t.trim()).filter(Boolean) : [];
            const cleanDesc = item.description ? item.description.replace(/\n*Tags:\s*.+$/i, '').trim() : '';

            return (
              <div
                key={item.id}
                className="card manage-listing-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '20px',
                  padding: '20px 24px',
                  borderRadius: '16px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                }}
              >
                <div className="manage-listing-main" style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: '280px' }}>
                  <img
                    src={photoUrl}
                    alt={item.cropName}
                    className="manage-listing-img"
                    style={{ width: '95px', height: '95px', borderRadius: '14px', objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }}
                  />
                  <div className="manage-listing-info" style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 className="manage-listing-title" style={{ fontSize: '20px', fontWeight: 800, color: '#1A1C1A', margin: 0 }}>
                        {item.cropName}
                      </h3>
                      {item.category && (
                        <span
                          className="manage-listing-cat-badge"
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '10px',
                            backgroundColor: isItemLivestock ? '#FEF3C7' : '#E8F5E9',
                            color: isItemLivestock ? '#92400E' : '#0E4A27',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>{getCategoryIcon(item.category)}</span>
                          <span>{item.category}</span>
                        </span>
                      )}
                    </div>

                    <div className="manage-listing-price" style={{ fontSize: '18px', fontWeight: 800, color: '#0E4A27', margin: '4px 0' }}>
                      ₱{item.pricePerUnit} per {item.unit || 'kg'} • {item.quantity} {item.unit || 'kg'} available
                    </div>
                    <div className="manage-listing-meta" style={{ fontSize: '14px', color: '#525450', fontWeight: 500 }}>
                      📍 {item.location || 'Region X'} • Ready: {item.harvestDate ? String(item.harvestDate).split('T')[0] : 'Ready'}
                    </div>

                    {/* Highlight Tags */}
                    {itemTags.length > 0 && (
                      <div className="manage-listing-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {itemTags.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#F0FDF4',
                              color: '#166534',
                              border: '1px solid #BBF7D0',
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            ✓ {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {cleanDesc && (
                      <p className="manage-listing-desc" style={{ fontSize: '13px', color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                        {cleanDesc}
                      </p>
                    )}
                  </div>
                </div>

                <div className="manage-listing-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span
                    className={`manage-listing-status-badge ${isLive ? 'badge badge-verified' : isSoldOut ? 'badge badge-danger' : 'badge badge-warning'}`}
                    style={{ fontSize: '14px', padding: '6px 14px', borderRadius: '20px' }}
                  >
                    {isLive ? '✓ Live & Selling' : isSoldOut ? '📦 Sold Out' : '⏸ Temporarily Paused'}
                  </span>

                  <button
                    onClick={() => togglePauseStatus(item)}
                    className="btn btn-secondary manage-btn-action"
                    style={{ fontSize: '14px', padding: '8px 16px', fontWeight: 700 }}
                  >
                    {isLive ? 'Pause Sale' : 'Resume Sale'}
                  </button>

                  <button
                    onClick={() => openEditModal(item)}
                    className="btn btn-accent manage-btn-action"
                    style={{ fontSize: '14px', padding: '8px 16px', fontWeight: 700 }}
                  >
                    Edit Details
                  </button>

                  <button
                    onClick={() => setListingToDelete(item)}
                    className="manage-btn-delete"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #fecdd3',
                      backgroundColor: '#fff1f2',
                      color: '#be123c',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff1f2';
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : myListings.length > 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', borderRadius: '20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔍</div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1A1C1A', margin: '0 0 6px 0' }}>
            No listings matched your filter
          </h3>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' }}>
            No products found matching "{searchQuery || filterCategory}".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterCategory('All');
            }}
            className="btn btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '20px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>🌾</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0E4A27', marginBottom: '8px' }}>
            You don't have any farm listings yet
          </h2>
          <p style={{ fontSize: '16px', color: '#525450', marginBottom: '24px', maxWidth: '520px', margin: '0 auto 24px' }}>
            Publish your fresh harvest, livestock, or agricultural goods to connect directly with wholesale buyers and local vendors.
          </p>
          <button
            onClick={() => openAddModal()}
            className="btn btn-primary btn-large"
            style={{ padding: '12px 28px', fontSize: '16px', fontWeight: 800 }}
          >
            + Add Your First Listing
          </button>
        </div>
      )}

      {/* Modern UI/UX Destructive Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!listingToDelete}
        onClose={() => {
          if (!isDeletingListing) setListingToDelete(null);
        }}
        onConfirm={handleConfirmDeleteListing}
        item={
          listingToDelete
            ? {
                id: listingToDelete.id,
                name: listingToDelete.cropName,
                category: listingToDelete.category,
                price: listingToDelete.pricePerUnit,
                unit: listingToDelete.unit,
                stock: listingToDelete.quantity,
                image: listingToDelete.photos?.[0],
                typeLabel: 'Produce Listing',
              }
            : null
        }
        title="Delete Farm Listing?"
        description={`Are you sure you want to remove your listing for "${listingToDelete?.cropName}"? Once removed, it will no longer appear in the marketplace.`}
        confirmText="Yes, Delete Listing"
        cancelText="Cancel, Keep Listing"
        isDeleting={isDeletingListing}
      />
    </div>
  );
};
