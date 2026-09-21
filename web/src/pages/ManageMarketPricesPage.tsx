import React, { useState, useEffect, useMemo } from 'react';
import { priceApi } from '../api/price';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { TableRowSkeleton } from '../components/PageSkeletons';
import type { MarketPrice } from '../types/price';

interface CommodityPreset {
  name: string;
  category: string;
  unit: string;
  icon: string;
  defaultPrice: number;
}

const commodityPresets: CommodityPreset[] = [
  { name: 'Yellow Corn', category: 'Grains & Cereals', unit: 'kg', icon: '🌽', defaultPrice: 25 },
  { name: 'White Corn', category: 'Grains & Cereals', unit: 'kg', icon: '🌽', defaultPrice: 28 },
  { name: 'Palay (Paddy Rice)', category: 'Grains & Cereals', unit: 'kg', icon: '🌾', defaultPrice: 22 },
  { name: 'Milled Rice (Regular)', category: 'Grains & Cereals', unit: 'kg', icon: '🍚', defaultPrice: 48 },
  { name: 'Red Onion', category: 'Vegetables', unit: 'kg', icon: '🧅', defaultPrice: 120 },
  { name: 'Garlic', category: 'Vegetables', unit: 'kg', icon: '🧄', defaultPrice: 110 },
  { name: 'Tomato', category: 'Vegetables', unit: 'kg', icon: '🍅', defaultPrice: 45 },
  { name: 'Eggplant', category: 'Vegetables', unit: 'kg', icon: '🍆', defaultPrice: 40 },
  { name: 'Cabbage', category: 'Vegetables', unit: 'kg', icon: '🥬', defaultPrice: 50 },
  { name: 'Banana (Lakatan)', category: 'Fruits', unit: 'kg', icon: '🍌', defaultPrice: 65 },
  { name: 'Cassava', category: 'Root Crops', unit: 'kg', icon: '🥔', defaultPrice: 18 },
  { name: 'Sweet Potato (Camote)', category: 'Root Crops', unit: 'kg', icon: '🍠', defaultPrice: 35 },
];

const categories = ['All', 'Grains & Cereals', 'Vegetables', 'Fruits', 'Root Crops', 'Livestock'];

import { getRegions } from '../data/philippineLocations';

const philippineRegions = getRegions();

const directoryRegionOptions = [
  'All Regions (National View)',
  ...philippineRegions,
];

const getCropIcon = (cropName: string): string => {
  const match = commodityPresets.find((c) => c.name.toLowerCase() === cropName.toLowerCase());
  if (match) return match.icon;
  const lower = cropName.toLowerCase();
  if (lower.includes('corn')) return '🌽';
  if (lower.includes('rice') || lower.includes('palay')) return '🌾';
  if (lower.includes('onion')) return '🧅';
  if (lower.includes('tomato')) return '🍅';
  if (lower.includes('banana')) return '🍌';
  if (lower.includes('eggplant')) return '🍆';
  if (lower.includes('cabbage')) return '🥬';
  if (lower.includes('garlic')) return '🧄';
  if (lower.includes('potato') || lower.includes('cassava')) return '🥔';
  return '🌱';
};

export const ManageMarketPricesPage: React.FC = () => {
  const { user } = useAuth();
  const isLguStaff = user?.role === 'lgu_staff';
  const isSuperAdmin = user?.role === 'super_admin';

  // For Super Admin or Central Office users, their role oversees all regions nationally.
  const isCentralOffice = user?.region === 'Central Office' || isSuperAdmin;
  const initialFormRegion = !isCentralOffice && user?.region ? user.region : 'Region X - Northern Mindanao';
  const initialDirectoryRegion = isCentralOffice ? 'All Regions (National View)' : (user?.region || 'Region X - Northern Mindanao');

  const defaultMarketLocation = user?.municipality
    ? `${user.municipality} Agri-Trading Post`
    : 'Malaybalay Central Agri-Trading Post';

  // Form State
  const [cropName, setCropName] = useState(commodityPresets[0].name);
  const [category, setCategory] = useState(commodityPresets[0].category);
  const [unit, setUnit] = useState(commodityPresets[0].unit);
  const [price, setPrice] = useState<number>(commodityPresets[0].defaultPrice);
  const [formRegion, setFormRegion] = useState(initialFormRegion);
  const [marketLocation, setMarketLocation] = useState(defaultMarketLocation);
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState('DA-AMAS / Municipal Agriculture Office');

  // Directory & Search State
  const [directoryRegion, setDirectoryRegion] = useState(initialDirectoryRegion);
  const [tableSearch, setTableSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [allRecords, setAllRecords] = useState<MarketPrice[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [saving, setSaving] = useState(false);

  const { success, error: toastError } = useToast();

  const fetchRecords = async () => {
    setLoadingRecords(true);
    try {
      const isAll = directoryRegion.startsWith('All Regions');
      const data = await priceApi.listHistory({
        region: isAll ? undefined : directoryRegion,
      });
      setAllRecords(data);
    } catch (e) {
      console.warn('Could not load prices:', e);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [directoryRegion]);

  const handleSelectPreset = (preset: CommodityPreset) => {
    setCropName(preset.name);
    setCategory(preset.category);
    setUnit(preset.unit);
    setPrice(preset.defaultPrice);
  };

  const handlePrefillFromRecord = (rec: MarketPrice) => {
    setCropName(rec.cropName);
    setCategory(rec.category);
    setUnit(rec.unit);
    setPrice(rec.price);
    if (!isLguStaff && rec.region) {
      setFormRegion(rec.region);
    }
    setMarketLocation(rec.marketLocation);
    setSource(rec.source);
    setRecordedAt(new Date().toISOString().split('T')[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await priceApi.createRecord({
        cropName,
        category,
        unit,
        price,
        region: formRegion,
        marketLocation,
        recordedAt,
        source,
      });
      success(
        'Official Benchmark Published!',
        `Official price of ₱${price}/${unit} for ${cropName} recorded in ${formRegion}.`
      );
      fetchRecords();
    } catch (err: any) {
      toastError('Failed to Record Price', err.response?.data?.error || 'Could not save official price.');
    } finally {
      setSaving(false);
    }
  };

  // Filter records for directory view
  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => {
      const q = tableSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        rec.cropName.toLowerCase().includes(q) ||
        rec.marketLocation.toLowerCase().includes(q) ||
        rec.category.toLowerCase().includes(q) ||
        (rec.region && rec.region.toLowerCase().includes(q));
      const matchCat = selectedCategoryFilter === 'All' || rec.category === selectedCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [allRecords, tableSearch, selectedCategoryFilter]);

  const todayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return allRecords.filter((r) => r.recordedAt?.startsWith(todayStr)).length;
  }, [allRecords]);

  return (
    <div className="app-container" style={{ paddingBottom: '60px' }}>
      {/* ─── Page Header ─── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '20px',
              background: '#F0FDF4',
              color: '#166534',
              border: '1px solid #BBF7D0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span>📊</span> Official Commodity Price Benchmarks
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '20px',
              background: isCentralOffice ? '#EFF6FF' : '#F1F5F9',
              color: isCentralOffice ? '#1D4ED8' : '#475569',
              border: `1px solid ${isCentralOffice ? '#BFDBFE' : '#CBD5E1'}`,
            }}
          >
            {isCentralOffice ? '🏛️ National Oversight (Central Office)' : `📍 ${user?.region || 'Region X - Northern Mindanao'}`}
          </span>
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.25 }}>
          Record Official Market Prices
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '6px', maxWidth: '800px', lineHeight: 1.5 }}>
          Publish and monitor official DA and LGU agricultural commodity pricing benchmarks to guide local trading posts, fair transactions, and farmer price monitoring.
        </p>
      </div>

      {/* ─── KPI Metric Cards Row ─── */}
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
            background: '#FFFFFF',
            padding: '18px 20px',
            borderRadius: '16px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#DCFCE7',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            🌾
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Active Benchmarks
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {allRecords.length} Records
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            padding: '18px 20px',
            borderRadius: '16px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#FEF3C7',
              color: '#B45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            ⚡
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Published Today
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {todayCount} Today
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            padding: '18px 20px',
            borderRadius: '16px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#E0F2FE',
              color: '#0369A1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            📍
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {isCentralOffice ? 'Jurisdiction Scope' : 'Jurisdiction Region'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {directoryRegion.startsWith('All')
                ? 'National (All Regions)'
                : directoryRegion.split('-')[0].trim()}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            padding: '18px 20px',
            borderRadius: '16px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#F3E8FF',
              color: '#7E22CE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            🏛️
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Authority Standard
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
              DA-AMAS Verified
            </div>
          </div>
        </div>
      </div>

      {/* ─── Two-Column Workspace Grid ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 460px) 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Form Card */}
        <div
          className="card"
          style={{
            padding: '24px 26px',
            borderRadius: '20px',
            border: '1.5px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Publish Price Benchmark
            </h2>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534', background: '#F0FDF4', padding: '2px 8px', borderRadius: '6px' }}>
              Daily Entry
            </span>
          </div>

          {/* Quick Commodity Selection Chips */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
              Quick Presets:
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {commodityPresets.slice(0, 6).map((preset) => {
                const isSelected = cropName === preset.name;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSelected ? '#166534' : '#E2E8F0'}`,
                      background: isSelected ? '#F0FDF4' : '#FFFFFF',
                      color: isSelected ? '#166534' : '#334155',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      minHeight: 'unset',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Commodity Name & Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Commodity Name *
                </label>
                <input
                  type="text"
                  required
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  placeholder="e.g. Yellow Corn"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {categories.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Official Price, Unit, Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Price (₱) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: 800, color: '#166534' }}>
                    ₱
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '9px 10px 9px 24px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#0E4A27',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Unit *
                </label>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="kg, sack"
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Recorded Date *
                </label>
                <input
                  type="date"
                  required
                  value={recordedAt}
                  onChange={(e) => setRecordedAt(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Jurisdiction Region & Market Location */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Jurisdiction / Region
                {isLguStaff ? (
                  <span
                    style={{
                      marginLeft: '6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#166534',
                      background: '#F0FDF4',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      border: '1px solid #BBF7D0',
                    }}
                  >
                    📍 Assigned
                  </span>
                ) : (
                  <span
                    style={{
                      marginLeft: '6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#1D4ED8',
                      background: '#EFF6FF',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      border: '1px solid #BFDBFE',
                    }}
                  >
                    🌐 Central Authority
                  </span>
                )}
              </label>
              {isLguStaff ? (
                <div
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #BBF7D0',
                    backgroundColor: '#F0FDF4',
                    fontSize: '13px',
                    color: '#166534',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                  }}
                >
                  🗺️ {formRegion}
                </div>
              ) : (
                <select
                  value={formRegion}
                  onChange={(e) => setFormRegion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {philippineRegions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Trading Post Location */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Market / Trading Post *
              </label>
              <input
                type="text"
                required
                value={marketLocation}
                onChange={(e) => setMarketLocation(e.target.value)}
                placeholder="e.g. Bukidnon Provincial Agri-Trading Post"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Data Source */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Data Source Agency *
              </label>
              <input
                type="text"
                required
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary btn-full"
              style={{
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 800,
                padding: '12px',
                boxShadow: '0 4px 14px rgba(22, 101, 52, 0.25)',
              }}
            >
              {saving ? 'Publishing Benchmark...' : '✓ Publish Official Price Benchmark'}
            </button>
          </form>
        </div>

        {/* Right Column: Active Benchmarks Directory Table */}
        <div
          className="card"
          style={{
            padding: '24px 26px',
            borderRadius: '20px',
            border: '1.5px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header with Region Filter & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Published Benchmark Directory
              </h2>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Showing {filteredRecords.length} records for{' '}
                <strong style={{ color: '#0F172A' }}>
                  {directoryRegion.startsWith('All') ? 'All Philippine Regions' : directoryRegion}
                </strong>
              </div>
            </div>

            {/* Region Selector & Table Search Input */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={directoryRegion}
                onChange={(e) => setDirectoryRegion(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1E293B',
                  background: '#F8FAFC',
                  cursor: 'pointer',
                  outline: 'none',
                  height: '34px',
                }}
                aria-label="Filter by region"
              >
                {directoryRegionOptions.map((r) => (
                  <option key={r} value={r}>
                    {r === 'All Regions (National View)' ? '🌐 All Regions (National View)' : r}
                  </option>
                ))}
              </select>

              <div style={{ position: 'relative', width: '180px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94A3B8' }}>
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search commodities..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 28px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    height: '34px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
            {categories.map((cat) => {
              const isSelected = selectedCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '16px',
                    border: `1.5px solid ${isSelected ? '#166534' : '#E2E8F0'}`,
                    background: isSelected ? '#166534' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#475569',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    minHeight: 'unset',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Records Table / Feed */}
          {loadingRecords ? (
            <div className="card" role="status" aria-label="Loading official commodity records..." style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <TableRowSkeleton columns={5} />
              <TableRowSkeleton columns={5} />
              <TableRowSkeleton columns={5} />
              <TableRowSkeleton columns={5} />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                borderRadius: '14px',
                border: '1.5px dashed #CBD5E1',
                background: '#F8FAFC',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '15px' }}>
                No Benchmark Records Found
              </div>
              <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>
                {tableSearch
                  ? `No commodities matching "${tableSearch}". Try a different keyword.`
                  : `No benchmark records recorded for ${directoryRegion.startsWith('All') ? 'any region' : directoryRegion}. Use the entry form to publish new benchmarks.`}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredRecords.map((rec) => {
                const icon = getCropIcon(rec.cropName);
                return (
                  <div
                    key={rec.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      border: '1.5px solid #E2E8F0',
                      background: '#FFFFFF',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Left: Crop Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: '#F0FDF4',
                          border: '1px solid #DCFCE7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          flexShrink: 0,
                        }}
                      >
                        {icon}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>
                            {rec.cropName}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#475569',
                              background: '#F1F5F9',
                              padding: '1px 6px',
                              borderRadius: '6px',
                            }}
                          >
                            {rec.category}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#1E40AF',
                              background: '#EFF6FF',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid #DBEAFE',
                            }}
                          >
                            {rec.region ? rec.region.split(' - ')[0] : 'Region'}
                          </span>
                          <span>📍 {rec.marketLocation}</span>
                          <span style={{ color: '#94A3B8' }}>·</span>
                          <span style={{ color: '#94A3B8' }}>{new Date(rec.recordedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Price & Quick Action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#166534' }}>
                          ₱{rec.price.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                          per {rec.unit}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePrefillFromRecord(rec)}
                        title="Prefill this commodity to publish today's price"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          background: '#F8FAFC',
                          color: '#334155',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          minHeight: 'unset',
                        }}
                      >
                        Update ↗
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
