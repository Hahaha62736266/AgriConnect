import React, { useState, useEffect, useRef } from 'react';
import {
  getRegions,
  getProvinces,
  getMunicipalities,
  getBarangays,
} from '../data/philippineLocations';

interface LocationSelectorProps {
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  onChange: (region: string, province: string, municipality: string, barangay: string) => void;
  disabled?: boolean;
  layout?: 'stacked' | 'grid';
  showNumbers?: boolean;
  fontSize?: string;
  excludeBarangay?: boolean;
  progressive?: boolean;
}

type Step = 'region' | 'province' | 'municipality' | 'barangay';

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  region,
  province,
  municipality,
  barangay,
  onChange,
  disabled = false,
  layout = 'stacked',
  showNumbers = true,
  fontSize,
  excludeBarangay = false,
  progressive = false,
}) => {
  const regions = getRegions();

  // In progressive mode, allow empty selection at start
  const currentRegion = progressive
    ? (regions.includes(region) ? region : '')
    : (regions.includes(region) ? region : regions[0]);

  const provinces = currentRegion ? getProvinces(currentRegion) : [];
  const currentProvince = progressive
    ? (provinces.includes(province) ? province : '')
    : (provinces.includes(province) ? province : provinces[0] || '');

  const municipalities = (currentRegion && currentProvince)
    ? getMunicipalities(currentRegion, currentProvince)
    : [];
  const currentMunicipality = progressive
    ? (municipalities.includes(municipality) ? municipality : '')
    : (municipalities.includes(municipality) ? municipality : municipalities[0] || '');

  const barangays = (currentRegion && currentProvince && currentMunicipality)
    ? getBarangays(currentRegion, currentProvince, currentMunicipality)
    : [];
  const currentBarangay = progressive
    ? (barangays.includes(barangay) ? barangay : '')
    : (barangays.includes(barangay) ? barangay : barangays[0] || '');

  // -------------------------------------------------------------
  // SINGLE HIERARCHICAL DROPDOWN STATES (Progressive Mode)
  // -------------------------------------------------------------
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('region');
  const [draftRegion, setDraftRegion] = useState(currentRegion);
  const [draftProvince, setDraftProvince] = useState(currentProvince);
  const [draftMunicipality, setDraftMunicipality] = useState(currentMunicipality);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync draft states with external changes
  useEffect(() => {
    if (progressive) {
      setDraftRegion(currentRegion);
      setDraftProvince(currentProvince);
      setDraftMunicipality(currentMunicipality);
    }
  }, [currentRegion, currentProvince, currentMunicipality, progressive]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on step change or open
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isOpen, step]);

  // Initial sync on mount if initial values are missing or invalid (non-progressive mode only)
  useEffect(() => {
    if (!progressive) {
      if (
        region !== currentRegion ||
        province !== currentProvince ||
        municipality !== currentMunicipality ||
        barangay !== currentBarangay
      ) {
        onChange(currentRegion, currentProvince, currentMunicipality, currentBarangay);
      }
    }
  }, []);

  // Standard change handlers for non-progressive mode
  const handleNativeRegionChange = (newRegion: string) => {
    const newProvinces = getProvinces(newRegion);
    const newProv = newProvinces[0] || '';
    const newMunicipalities = getMunicipalities(newRegion, newProv);
    const newMun = newMunicipalities[0] || '';
    const newBarangays = getBarangays(newRegion, newProv, newMun);
    const newBar = newBarangays[0] || '';
    onChange(newRegion, newProv, newMun, newBar);
  };

  const handleNativeProvinceChange = (newProvVal: string) => {
    const newMunicipalities = getMunicipalities(currentRegion, newProvVal);
    const newMun = newMunicipalities[0] || '';
    const newBarangays = getBarangays(currentRegion, newProvVal, newMun);
    const newBar = newBarangays[0] || '';
    onChange(currentRegion, newProvVal, newMun, newBar);
  };

  const handleNativeMunicipalityChange = (newMunVal: string) => {
    const newBarangays = getBarangays(currentRegion, currentProvince, newMunVal);
    const newBar = newBarangays[0] || '';
    onChange(currentRegion, currentProvince, newMunVal, newBar);
  };

  const handleNativeBarangayChange = (newBarVal: string) => {
    onChange(currentRegion, currentProvince, currentMunicipality, newBarVal);
  };

  // -------------------------------------------------------------
  // HIERARCHICAL SELECTION DRILL-DOWN HANDLERS
  // -------------------------------------------------------------
  const handleSelectRegion = (selectedRegion: string) => {
    setDraftRegion(selectedRegion);
    setDraftProvince('');
    setDraftMunicipality('');
    setStep('province');
    setSearchQuery('');
  };

  const handleSelectProvince = (selectedProvince: string) => {
    setDraftProvince(selectedProvince);
    setDraftMunicipality('');
    setStep('municipality');
    setSearchQuery('');
  };

  const handleSelectMunicipality = (selectedMun: string) => {
    if (excludeBarangay) {
      // Municipal-level complete for LGU staff
      onChange(draftRegion, draftProvince, selectedMun, '');
      setIsOpen(false);
    } else {
      setDraftMunicipality(selectedMun);
      setStep('barangay');
      setSearchQuery('');
    }
  };

  const handleSelectBarangay = (selectedBar: string) => {
    onChange(draftRegion, draftProvince, draftMunicipality, selectedBar);
    setIsOpen(false);
  };

  const handleBack = () => {
    setSearchQuery('');
    if (step === 'barangay') {
      setStep('municipality');
    } else if (step === 'municipality') {
      setStep('province');
    } else if (step === 'province') {
      setStep('region');
    }
  };

  // Get active list for current step
  const getActiveOptions = (): string[] => {
    if (step === 'region') return regions;
    if (step === 'province') return draftRegion ? getProvinces(draftRegion) : [];
    if (step === 'municipality') return (draftRegion && draftProvince) ? getMunicipalities(draftRegion, draftProvince) : [];
    if (step === 'barangay') return (draftRegion && draftProvince && draftMunicipality) ? getBarangays(draftRegion, draftProvince, draftMunicipality) : [];
    return [];
  };

  const activeOptions = getActiveOptions();
  const filteredOptions = searchQuery.trim()
    ? activeOptions.filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : activeOptions;

  const isGrid = layout === 'grid';
  const inputStyle: React.CSSProperties = fontSize ? { fontSize } : {};

  const isComplete = Boolean(
    currentRegion &&
    currentProvince &&
    currentMunicipality &&
    (excludeBarangay || currentBarangay)
  );

  // -------------------------------------------------------------
  // NON-PROGRESSIVE RENDER (ProfilePage & Standard Native Selects)
  // -------------------------------------------------------------
  if (!progressive) {
    return (
      <div
        style={
          isGrid
            ? {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
              }
            : {
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }
        }
      >
        <div className="form-group">
          <label htmlFor="select-region" className="form-label">
            {showNumbers ? '1. Region' : 'Region'}
          </label>
          <select
            id="select-region"
            className="form-input"
            value={currentRegion}
            disabled={disabled}
            style={inputStyle}
            onChange={(e) => handleNativeRegionChange(e.target.value)}
          >
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="select-province" className="form-label">
            {showNumbers ? '2. Province' : 'Province'}
          </label>
          <select
            id="select-province"
            className="form-input"
            value={currentProvince}
            disabled={disabled || provinces.length === 0}
            style={inputStyle}
            onChange={(e) => handleNativeProvinceChange(e.target.value)}
          >
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="select-municipality" className="form-label">
            {showNumbers ? '3. Municipality / City' : 'Municipality / City'}
          </label>
          <select
            id="select-municipality"
            className="form-input"
            value={currentMunicipality}
            disabled={disabled || municipalities.length === 0}
            style={inputStyle}
            onChange={(e) => handleNativeMunicipalityChange(e.target.value)}
          >
            {municipalities.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {!excludeBarangay && (
          <div className="form-group">
            <label htmlFor="select-barangay" className="form-label">
              {showNumbers ? '4. Barangay' : 'Barangay'}
            </label>
            <select
              id="select-barangay"
              className="form-input"
              value={currentBarangay}
              disabled={disabled || barangays.length === 0}
              style={inputStyle}
              onChange={(e) => handleNativeBarangayChange(e.target.value)}
            >
              {barangays.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // SINGLE HIERARCHICAL DROPDOWN RENDER (RegisterPage)
  // -------------------------------------------------------------
  const stepIndex =
    step === 'region' ? 1 : step === 'province' ? 2 : step === 'municipality' ? 3 : 4;
  const totalSteps = excludeBarangay ? 3 : 4;

  return (
    <div ref={dropdownRef} className="single-hierarchical-dropdown">
      {/* Option 1: Verified Location Summary Card (When complete) */}
      {isComplete ? (
        <div
          className={`location-summary-card ${isOpen ? 'is-active' : ''}`}
          onClick={() => {
            if (disabled) return;
            if (!isOpen) {
              setStep('region');
            }
            setIsOpen(!isOpen);
            setSearchQuery('');
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (disabled) return;
              setIsOpen(!isOpen);
            }
          }}
        >
          <div className="location-summary-top">
            <div className="location-summary-badge">
              <span className="location-summary-dot" />
              <span>Registered Location</span>
            </div>
            <button
              type="button"
              className="location-summary-change-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (disabled) return;
                setStep('region');
                setIsOpen(true);
                setSearchQuery('');
              }}
            >
              <span>Change</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          </div>

          <div className="location-summary-content">
            {/* Primary Location: City/Municipality, Province */}
            <div className="location-summary-primary">
              <span className="location-summary-icon">📍</span>
              <div className="location-summary-city-prov">
                <span>{currentMunicipality}</span>
                <span style={{ color: 'var(--color-text-secondary, #64748B)', fontWeight: 600 }}>, {currentProvince}</span>
              </div>
            </div>

            {/* Tier Details: Barangay & Region */}
            <div className="location-summary-meta-grid">
              {!excludeBarangay && currentBarangay && (
                <div className="location-summary-meta-item">
                  <span className="location-meta-label">Barangay:</span>
                  <span className="location-meta-val">{currentBarangay}</span>
                </div>
              )}
              <div className="location-summary-meta-item">
                <span className="location-meta-label">Region:</span>
                <span className="location-meta-val">{currentRegion}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* The Single Trigger Dropdown Box (When not complete) */
        <button
          type="button"
          className={`hierarchical-trigger ${isOpen ? 'is-open' : ''}`}
          onClick={() => {
            if (disabled) return;
            if (!isOpen) {
              if (!draftRegion) setStep('region');
              else if (!draftProvince) setStep('province');
              else if (!draftMunicipality) setStep('municipality');
              else if (!excludeBarangay && !currentBarangay) setStep('barangay');
              else setStep('region');
            }
            setIsOpen(!isOpen);
            setSearchQuery('');
          }}
          disabled={disabled}
        >
          <div className="hierarchical-icon-badge">
            📍
          </div>

          <div className="hierarchical-val-container">
            <div className="hierarchical-placeholder">
              {currentRegion
                ? [currentRegion, currentProvince, currentMunicipality, currentBarangay].filter(Boolean).join(' › ')
                : 'Select Location (Region › Province › City › Barangay)...'}
            </div>
          </div>

          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
              color: 'var(--color-text-secondary, #64748B)',
              flexShrink: 0,
              marginLeft: 'auto',
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      )}

      {/* The Single Hierarchical Dropdown Menu (Drilldown) */}
      {isOpen && (
        <div className="hierarchical-menu">
          {/* Top Navigation Header */}
          <div className="hierarchical-nav">
            {step !== 'region' ? (
              <button type="button" className="hierarchical-back-btn" onClick={handleBack}>
                ‹ Back
              </button>
            ) : (
              <span style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '12px' }}>
                Select Location
              </span>
            )}

            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text)',
                textAlign: 'center',
                flex: 1,
                padding: '0 8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {step === 'region' && '1. Region'}
              {step === 'province' && `2. ${draftRegion}`}
              {step === 'municipality' && `3. ${draftProvince}`}
              {step === 'barangay' && `4. ${draftMunicipality}`}
            </span>

            <span className="hierarchical-step-badge">
              Step {stepIndex} of {totalSteps}
            </span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="hierarchical-progress-bar">
            <div className={`hierarchical-progress-seg ${stepIndex >= 1 ? 'is-active' : ''}`} />
            <div className={`hierarchical-progress-seg ${stepIndex >= 2 ? 'is-active' : ''}`} />
            <div className={`hierarchical-progress-seg ${stepIndex >= 3 ? 'is-active' : ''}`} />
            {!excludeBarangay && (
              <div className={`hierarchical-progress-seg ${stepIndex >= 4 ? 'is-active' : ''}`} />
            )}
          </div>

          {/* Search Filter Box */}
          <div className="hierarchical-search-wrap">
            <input
              ref={searchInputRef}
              type="text"
              className="hierarchical-search-input"
              placeholder={
                step === 'region'
                  ? '🔍 Search region...'
                  : step === 'province'
                  ? `🔍 Search province in ${draftRegion}...`
                  : step === 'municipality'
                  ? `🔍 Search municipality/city in ${draftProvince}...`
                  : `🔍 Search barangay in ${draftMunicipality}...`
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Scrollable Option List */}
          <div className="hierarchical-list">
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '18px', textAlign: 'center', color: '#94A3B8', fontSize: '12.5px' }}>
                No matching {step} found for &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredOptions.map((item) => {
                const isSelected =
                  (step === 'region' && currentRegion === item) ||
                  (step === 'province' && currentProvince === item) ||
                  (step === 'municipality' && currentMunicipality === item) ||
                  (step === 'barangay' && currentBarangay === item);
                const isFinal = step === 'barangay' || (step === 'municipality' && excludeBarangay);

                return (
                  <button
                    type="button"
                    key={item}
                    className={`hierarchical-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      if (step === 'region') handleSelectRegion(item);
                      else if (step === 'province') handleSelectProvince(item);
                      else if (step === 'municipality') handleSelectMunicipality(item);
                      else if (step === 'barangay') handleSelectBarangay(item);
                    }}
                  >
                    <span>{item}</span>
                    <span
                      style={{
                        fontSize: isFinal ? '14px' : '13px',
                        color: isSelected ? '#16A34A' : '#94A3B8',
                        fontWeight: 700,
                      }}
                    >
                      {isFinal ? (isSelected ? '✓' : '') : '›'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
