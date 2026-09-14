import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { priceApi } from '../api/price';
import { useAuth } from '../contexts/AuthContext';
import { PriceChart } from '../components/PriceChart';
import type { MarketPrice } from '../types/price';

interface CropOption {
  name: string;
  cleanName: string;
  icon: string;
}

const cropsList: CropOption[] = [
  { name: 'Yellow Corn (Mais)', cleanName: 'Yellow Corn', icon: '🌽' },
  { name: 'White Corn', cleanName: 'White Corn', icon: '🌽' },
  { name: 'Palay (Paddy Rice)', cleanName: 'Palay', icon: '🌾' },
  { name: 'Milled Rice (Regular)', cleanName: 'Milled Rice', icon: '🍚' },
  { name: 'Tomato (Kamatis)', cleanName: 'Tomato', icon: '🍅' },
  { name: 'Eggplant (Talong)', cleanName: 'Eggplant', icon: '🍆' },
  { name: 'Red Onion (Sibuyas)', cleanName: 'Red Onion', icon: '🧅' },
  { name: 'Garlic (Bawang)', cleanName: 'Garlic', icon: '🧄' },
  { name: 'Cabbage (Repolyo)', cleanName: 'Cabbage', icon: '🥬' },
  { name: 'Banana (Lakatan)', cleanName: 'Banana', icon: '🍌' },
];

import { getRegions } from '../data/philippineLocations';

const philippineRegions = [
  'All Regions',
  ...getRegions(),
];

// Reference regional benchmark differences for comparison table
const regionalComparisons = [
  { region: 'Region X - Northern Mindanao', market: 'Cagayan de Oro Agri-Terminal', diff: '₱0 (Base)', badge: 'Local Market' },
  { region: 'Region XI - Davao Region', market: 'Davao City Wholesale Trading Center', diff: '+₱2.50', badge: 'Higher Demand' },
  { region: 'Region III - Central Luzon', market: 'Nueva Ecija Food Terminal', diff: '-₱1.00', badge: 'High Supply' },
  { region: 'Region IV-A - CALABARZON', market: 'Tanauan Trading Center', diff: '+₱3.00', badge: 'High Demand' },
  { region: 'National Capital Region', market: 'Balintawak / Divisoria Wholesale', diff: '+₱5.50', badge: 'Metro Peak' },
];

interface MarketPriceMonitoringPageProps {
  initialTab?: 'prices' | 'trends';
}

export const MarketPriceMonitoringPage: React.FC<MarketPriceMonitoringPageProps> = ({ initialTab }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userRegion = user?.region || 'Region X - Northern Mindanao';

  // Determine active tab from URL hash, props, or path
  const [activeTab, setActiveTab] = useState<'prices' | 'trends'>(() => {
    if (initialTab) return initialTab;
    if (location.pathname.includes('/price-trends') || location.hash === '#trends') return 'trends';
    return 'prices';
  });

  // Sync state if URL hash or pathname changes
  useEffect(() => {
    if (location.pathname.includes('/price-trends') || location.hash === '#trends') {
      setActiveTab('trends');
    } else if (location.hash === '#prices' || location.pathname === '/market-prices') {
      setActiveTab('prices');
    }
  }, [location.hash, location.pathname]);

  const handleTabChange = (tab: 'prices' | 'trends') => {
    setActiveTab(tab);
    if (tab === 'trends') {
      navigate('/market-prices#trends', { replace: true });
    } else {
      navigate('/market-prices', { replace: true });
    }
  };

  const [selectedCrop, setSelectedCrop] = useState<CropOption>(cropsList[0]);
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '3m' | '1y'>('30d');
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculator State
  const [myListingPrice, setMyListingPrice] = useState<number>(0);
  const [harvestQuantity, setHarvestQuantity] = useState<number>(100);

  const fetchPriceHistory = async () => {
    setLoading(true);
    try {
      const data = await priceApi.listHistory({
        cropName: selectedCrop.cleanName,
        region: selectedRegion !== 'All Regions' ? selectedRegion : undefined,
      });
      setPrices(data);
    } catch (err) {
      console.error('Failed to fetch price history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceHistory();
  }, [selectedCrop, selectedRegion]);

  const latestRecord = prices.length > 0 ? prices[prices.length - 1] : null;
  const currentBasePrice = latestRecord?.price || 25;
  const unit = latestRecord?.unit || 'kg';

  // Calculate Trend Statistics
  const priceValues = useMemo(() => {
    return prices.length > 0 ? prices.map((p) => p.price) : [currentBasePrice];
  }, [prices, currentBasePrice]);

  const maxPrice = useMemo(() => Math.max(...priceValues, currentBasePrice + 5), [priceValues, currentBasePrice]);
  const minPrice = useMemo(() => Math.min(...priceValues, Math.max(10, currentBasePrice - 5)), [priceValues, currentBasePrice]);
  const avgPrice = useMemo(() => Math.round(priceValues.reduce((a, b) => a + b, 0) / priceValues.length), [priceValues]);
  const firstPrice = priceValues[0] || currentBasePrice;
  const lastPrice = priceValues[priceValues.length - 1] || currentBasePrice;
  const pctChange = firstPrice > 0 ? (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(1) : '0.0';
  const isUpward = Number(pctChange) >= 0;

  // Floor to ceiling position percentage
  const priceRangePosition = useMemo(() => {
    if (maxPrice === minPrice) return 50;
    const pos = ((currentBasePrice - minPrice) / (maxPrice - minPrice)) * 100;
    return Math.min(100, Math.max(0, pos));
  }, [currentBasePrice, minPrice, maxPrice]);

  return (
    <div className="app-container" style={{ paddingBottom: '60px' }}>
      {/* ─── Page Header ─── */}
      <div className="market-prices-header-wrap" style={{ marginBottom: '24px' }}>
        <div className="market-prices-header-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="market-prices-badges" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
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
                <span>🌾</span> Agricultural Price Bulletin
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                }}
              >
                📍 {userRegion}
              </span>
            </div>

            <h1 className="market-prices-title" style={{ fontSize: '30px', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.25 }}>
              {activeTab === 'prices' ? 'Official Market Prices' : 'Commodity Price Trends & Analytics'}
            </h1>
            <p className="market-prices-subtitle" style={{ fontSize: '14px', color: '#64748B', marginTop: '6px', maxWidth: '720px', lineHeight: 1.5 }}>
              {activeTab === 'prices'
                ? 'Daily official wholesale and retail pricing index monitored by DA-AMAS and regional agricultural trading posts.'
                : 'Analyze historical volatility, price trajectory movements, and seasonal agricultural selling windows.'}
            </p>
          </div>

          {/* Top Segregated Navigation Tabs */}
          <div
            className="price-tabs-nav segmented-tabs-bar"
            style={{
              display: 'inline-flex',
              background: '#F1F5F9',
              padding: '4px',
              borderRadius: '14px',
              border: '1.5px solid #E2E8F0',
              gap: '4px',
            }}
          >
            <button
              onClick={() => handleTabChange('prices')}
              className={`segmented-tab-btn ${activeTab === 'prices' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === 'prices' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'prices' ? '#166534' : '#64748B',
                boxShadow: activeTab === 'prices' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                minHeight: 'unset',
              }}
            >
              <span>🏷️</span>
              <span>Today's Market Prices</span>
            </button>

            <button
              onClick={() => handleTabChange('trends')}
              className={`segmented-tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === 'trends' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'trends' ? '#166534' : '#64748B',
                boxShadow: activeTab === 'trends' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                minHeight: 'unset',
              }}
            >
              <span>📈</span>
              <span>Price Trends & History</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Fast Interactive Commodity Selector Bar ─── */}
      <div
        className="price-filter-card"
        style={{
          marginBottom: '20px',
          background: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: '18px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}
      >
        <div className="price-filter-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div className="price-filter-label" style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            🌾 Select Commodity to Monitor:
          </div>

          {/* Region Quick Selector Dropdown */}
          <div className="price-region-selector-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="price-region-label" style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
              📍 Regional Market:
            </span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="price-region-select"
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1.5px solid #CBD5E1',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1E293B',
                background: '#F8FAFC',
                cursor: 'pointer',
                outline: 'none',
                height: '36px',
              }}
            >
              {philippineRegions.map((r) => (
                <option key={r} value={r}>
                  {r === 'All Regions' ? '🌐 All Regions (National Overview)' : r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable Quick Crop Chips */}
        <div className="price-crops-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {cropsList.map((crop) => {
            const isSelected = selectedCrop.cleanName === crop.cleanName;
            return (
              <button
                key={crop.name}
                type="button"
                onClick={() => setSelectedCrop(crop)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: `1.5px solid ${isSelected ? '#166534' : '#E2E8F0'}`,
                  background: isSelected ? '#166534' : '#F8FAFC',
                  color: isSelected ? '#FFFFFF' : '#334155',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minHeight: 'unset',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 3px 8px rgba(22, 101, 52, 0.2)' : 'none',
                }}
              >
                <span style={{ fontSize: '16px' }}>{crop.icon}</span>
                <span>{crop.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 1: TODAY'S MARKET PRICES (Bulletin, Benchmarks & Calculator)
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'prices' && (
        <div>
          {/* Price Overview 3-Card Grid */}
          <div
            className="price-summary-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '28px',
            }}
          >
            {/* Card 1: Official DA-AMAS Benchmark */}
            <div
              className="card price-summary-card price-card-benchmark"
              style={{
                padding: '22px 24px',
                borderRadius: '18px',
                border: '1.5px solid #E2E8F0',
                borderLeft: '6px solid #166534',
                background: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Official DA-AMAS Benchmark
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#166534',
                    background: '#F0FDF4',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    border: '1px solid #BBF7D0',
                  }}
                >
                  ✓ Official Standard
                </span>
              </div>

              <div style={{ fontSize: '38px', fontWeight: 800, color: '#0F172A', margin: '10px 0 6px 0', lineHeight: 1 }}>
                ₱{currentBasePrice.toLocaleString()}{' '}
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#64748B' }}>/ {unit}</span>
              </div>

              <div style={{ fontSize: '13px', color: '#475569', marginTop: '10px', lineHeight: 1.4 }}>
                <div>📍 {latestRecord?.marketLocation || 'Central Agri-Trading Post'}</div>
                <div style={{ color: '#94A3B8', fontSize: '12px', marginTop: '2px' }}>
                  📅 Verified on {latestRecord?.recordedAt ? new Date(latestRecord.recordedAt).toLocaleDateString() : 'Today'}
                </div>
              </div>
            </div>

            {/* Card 2: Daily Trading Range with Progress Bar */}
            <div
              className="card"
              style={{
                padding: '22px 24px',
                borderRadius: '18px',
                border: '1.5px solid #E2E8F0',
                borderLeft: '6px solid #2563EB',
                background: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Today's Trading Range
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>FLOOR (LOW)</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#166534' }}>
                    ₱{minPrice} <span style={{ fontSize: '13px' }}>/{unit}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>CEILING (HIGH)</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#BA3C3C' }}>
                    ₱{maxPrice} <span style={{ fontSize: '13px' }}>/{unit}</span>
                  </div>
                </div>
              </div>

              {/* Progress Visualizer */}
              <div style={{ marginTop: '14px', marginBottom: '8px' }}>
                <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      width: `${priceRangePosition}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #166534 0%, #2563EB 100%)',
                      borderRadius: '4px',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: `calc(${priceRangePosition}% - 6px)`,
                      top: '-2px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#1E293B',
                      border: '2px solid #FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  />
                </div>
              </div>

              <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', marginTop: '6px' }}>
                Average Regional Rate: ₱{avgPrice} / {unit}
              </div>
            </div>

            {/* Card 3: Supply & Market Liquidity Status */}
            <div
              className="card"
              style={{
                padding: '22px 24px',
                borderRadius: '18px',
                border: '1.5px solid #E2E8F0',
                borderLeft: '6px solid #D97706',
                background: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Market Status & Liquidity
              </div>

              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '10px 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🟢</span> Stable Wholesale Demand
              </div>

              <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Local buying centers and institutional buyers actively purchasing {selectedCrop.name}. Transportation routes are clear and trading flows are steady.
              </p>
            </div>
          </div>

          {/* ─── Interactive Farmer Pricing Benchmark Calculator ─── */}
          <div
            className="card"
            style={{
              padding: '26px 28px',
              marginBottom: '32px',
              background: '#FAFDF9',
              borderRadius: '20px',
              border: '1.5px solid #BBF7D0',
              boxShadow: '0 4px 16px rgba(22, 101, 52, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  🧮 Farmer Price Benchmark & Revenue Calculator
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Simulate your target selling price and harvest volume to evaluate revenue and market alignment.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMyListingPrice(currentBasePrice)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: '1px solid #BBF7D0',
                  background: '#F0FDF4',
                  color: '#166534',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  minHeight: 'unset',
                }}
              >
                Use Benchmark Rate (₱{currentBasePrice})
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '18px', alignItems: 'end' }}>
              {/* Proposed Selling Price */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Proposed Price (₱ / {unit})
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', fontWeight: 800, color: '#166534' }}>
                    ₱
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={myListingPrice || ''}
                    onChange={(e) => setMyListingPrice(Number(e.target.value))}
                    placeholder="Enter price..."
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 30px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#0F172A',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Harvest Volume */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Estimated Harvest Volume ({unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={harvestQuantity || ''}
                  onChange={(e) => setHarvestQuantity(Number(e.target.value))}
                  placeholder="e.g. 500"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '16px',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Projected Gross Revenue */}
              <div
                style={{
                  background: '#FFFFFF',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1.5px solid #E2E8F0',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Projected Gross Revenue:
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                  ₱{((myListingPrice || currentBasePrice) * (harvestQuantity || 0)).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Competitiveness Feedback Banner */}
            {myListingPrice > 0 && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background:
                    myListingPrice < currentBasePrice
                      ? '#F0FDF4'
                      : myListingPrice === currentBasePrice
                      ? '#EFF6FF'
                      : '#FEF2F2',
                  color:
                    myListingPrice < currentBasePrice
                      ? '#166534'
                      : myListingPrice === currentBasePrice
                      ? '#1D4ED8'
                      : '#BA3C3C',
                  border: `1.5px solid ${
                    myListingPrice < currentBasePrice
                      ? '#BBF7D0'
                      : myListingPrice === currentBasePrice
                      ? '#BFDBFE'
                      : '#FECACA'
                  }`,
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{myListingPrice < currentBasePrice ? '✓' : myListingPrice === currentBasePrice ? '⚖️' : '⚠️'}</span>
                <span>
                  {myListingPrice < currentBasePrice
                    ? `Very Competitive! (₱${(currentBasePrice - myListingPrice).toFixed(2)} / ${unit} below official market average). Great for fast inventory turnover.`
                    : myListingPrice === currentBasePrice
                    ? `Aligned Exactly with Official Benchmark (₱${currentBasePrice}/${unit}). Meets standard wholesale trading criteria.`
                    : `Priced at Premium (+₱${(myListingPrice - currentBasePrice).toFixed(2)} / ${unit} above benchmark). Recommended for grade-A or organic certified produce.`}
                </span>
              </div>
            )}
          </div>

          {/* ─── Regional Price Comparison Table ─── */}
          <div
            className="card"
            style={{
              padding: '24px 26px',
              borderRadius: '20px',
              border: '1.5px solid #E2E8F0',
              background: '#FFFFFF',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  🗺️ Inter-Regional Market Comparison for {selectedCrop.name}
                </h2>
                <p style={{ color: '#64748B', fontSize: '13px', marginTop: '4px' }}>
                  Compare prevailing commodity wholesale rates across key trading terminals in the Philippines.
                </p>
              </div>

              <button
                onClick={() => handleTabChange('trends')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#1E293B',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  minHeight: 'unset',
                }}
              >
                View Historical Trends →
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                    <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Region</th>
                    <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Trading Terminal</th>
                    <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Price per {unit}</th>
                    <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Variance</th>
                    <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {regionalComparisons.map((row, idx) => {
                    const priceOffset = idx === 0 ? 0 : idx === 1 ? 2.5 : idx === 2 ? -1 : idx === 3 ? 3 : 5.5;
                    const computedPrice = Math.max(10, currentBasePrice + priceOffset);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px', fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>{row.region}</td>
                        <td style={{ padding: '14px', color: '#64748B', fontSize: '13px' }}>{row.market}</td>
                        <td style={{ padding: '14px', fontWeight: 800, fontSize: '15px', color: '#166534' }}>
                          ₱{computedPrice.toFixed(2)}
                        </td>
                        <td style={{ padding: '14px', fontWeight: 700, fontSize: '13px', color: row.diff.startsWith('+') ? '#BA3C3C' : row.diff.startsWith('-') ? '#166534' : '#64748B' }}>
                          {row.diff}
                        </td>
                        <td style={{ padding: '14px' }}>
                          <span
                            style={{
                              background: idx === 0 ? '#F0FDF4' : idx === 4 ? '#FEF3C7' : '#F1F5F9',
                              color: idx === 0 ? '#166534' : idx === 4 ? '#92400E' : '#475569',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {row.badge}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 2: PRICE TRENDS & HISTORICAL ANALYTICS (Charts, Forecasts & High/Low)
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'trends' && (
        <div>
          {/* Trend Analytics Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {/* 30-Day Trend Movement */}
            <div
              className="card"
              style={{
                borderLeft: `6px solid ${isUpward ? '#166534' : '#BA3C3C'}`,
                background: '#FFFFFF',
                padding: '20px 22px',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Overall Price Movement
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: isUpward ? '#166534' : '#BA3C3C', margin: '6px 0 2px 0' }}>
                {isUpward ? '↑' : '↓'} {pctChange}%
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {isUpward ? 'Upward price momentum over period' : 'Downward softening over period'}
              </div>
            </div>

            {/* Average Price */}
            <div
              className="card"
              style={{
                borderLeft: '6px solid #2563EB',
                background: '#FFFFFF',
                padding: '20px 22px',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Period Average Rate
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', margin: '6px 0 2px 0' }}>
                ₱{avgPrice} <span style={{ fontSize: '14px', color: '#64748B' }}>/{unit}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#2563EB', fontWeight: 700 }}>
                Range: ₱{minPrice} — ₱{maxPrice}
              </div>
            </div>

            {/* Volatility Index */}
            <div
              className="card"
              style={{
                borderLeft: '6px solid #10B981',
                background: '#FFFFFF',
                padding: '20px 22px',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Volatility & Market Risk
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '6px 0 2px 0' }}>
                🟢 Low Volatility
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Predictable price curve; ideal for forward crop contracts.
              </div>
            </div>

            {/* Seasonal Window */}
            <div
              className="card"
              style={{
                borderLeft: '6px solid #D97706',
                background: '#FFFFFF',
                padding: '20px 22px',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Seasonal Trading Advisory
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '6px 0 2px 0' }}>
                🌾 Favorable Window
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Demand is climbing as wet season harvesting concludes.
              </div>
            </div>
          </div>

          {/* Interactive Trend Chart Card */}
          <div
            className="card"
            style={{
              marginBottom: '32px',
              padding: '26px 28px',
              borderRadius: '20px',
              border: '1.5px solid #E2E8F0',
              background: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Historical Price Trend: {selectedCrop.name}
                </h2>
                <p style={{ color: '#64748B', fontSize: '13px', marginTop: '4px' }}>
                  Recorded fluctuations in {selectedRegion}.
                </p>
              </div>

              {/* Timeframe Filter Buttons */}
              <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                {(['7d', '30d', '3m', '1y'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      background: timeframe === t ? '#166534' : 'transparent',
                      color: timeframe === t ? '#FFFFFF' : '#64748B',
                      minHeight: 'unset',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t === '7d' ? '7 Days' : t === '30d' ? '30 Days' : t === '3m' ? '3 Months' : '1 Year'}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ color: '#64748B', fontSize: '14px', textAlign: 'center', padding: '48px', fontWeight: 600 }}>
                Loading market price trend chart…
              </div>
            ) : (
              <div>
                <PriceChart
                  data={prices.map((p) => ({
                    date: p.recordedAt,
                    price: p.price,
                    marketLocation: p.marketLocation,
                  }))}
                  unit={`₱/${unit}`}
                />
              </div>
            )}
          </div>

          {/* Seasonal Analysis & Insights Card */}
          <div
            className="card"
            style={{
              padding: '24px 26px',
              background: '#F8FAFC',
              borderRadius: '20px',
              border: '1.5px solid #E2E8F0',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
              💡 Agronomic Market Intelligence & Cycle Analysis
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  📅 Peak Harvest Season Impact
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  For {selectedCrop.cleanName}, regional harvest peaks typically bring temporary dips in farmgate prices. Farmers with safe drying/storage facilities benefit by holding stock 3–4 weeks for higher returns.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  🚚 Wholesale Freight & Logistics Advice
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Shipping directly to major regional food terminals in Bukidnon and Cagayan de Oro yields 8–15% higher net margins than selling at remote farmgate gates.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
