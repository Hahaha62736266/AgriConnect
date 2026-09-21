import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Skeleton placeholder for a single produce or supply card.
 * Accurately mirrors .marketplace-card layout to prevent cumulative layout shifts (CLS).
 */
export const MarketplaceCardSkeleton: React.FC = () => {
  return (
    <div
      className="card marketplace-card skeleton-marketplace-card"
      style={{ pointerEvents: 'none', cursor: 'default' }}
      aria-hidden="true"
    >
      {/* Product Image Placeholder */}
      <div className="marketplace-card-image-box" style={{ background: 'transparent' }}>
        <Skeleton variant="rectangular" height="100%" width="100%" borderRadius={0} />
      </div>

      <div className="marketplace-card-body">
        {/* Row 1: Seller Name & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <Skeleton variant="circular" width={16} height={16} />
          <Skeleton variant="text-sm" width="55%" style={{ marginBottom: 0 }} />
        </div>

        {/* Row 2: Product Name Title */}
        <Skeleton variant="title" width="80%" height={22} style={{ marginTop: '2px', marginBottom: '8px' }} />

        {/* Row 3: Description preview */}
        <div style={{ marginBottom: '10px' }}>
          <Skeleton variant="text-sm" width="100%" style={{ marginBottom: '4px' }} />
          <Skeleton variant="text-sm" width="70%" style={{ marginBottom: 0 }} />
        </div>

        {/* Row 4: Price Badge */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
          <Skeleton variant="rectangular" width={90} height={26} borderRadius={8} />
          <Skeleton variant="text-sm" width={40} style={{ marginBottom: 0 }} />
        </div>

        {/* Row 5: Stock Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <Skeleton variant="circular" width={12} height={12} />
          <Skeleton variant="text-sm" width="60%" style={{ marginBottom: 0 }} />
        </div>

        {/* Row 5.5: Location Origin */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <Skeleton variant="circular" width={12} height={12} />
          <Skeleton variant="text-sm" width="50%" style={{ marginBottom: 0 }} />
        </div>

        {/* Row 6: Action Buttons pinned to bottom */}
        <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
          <Skeleton variant="rectangular" width="100%" height={48} borderRadius={12} />
        </div>
      </div>
    </div>
  );
};

/**
 * Grid of Marketplace Card Skeletons
 */
export const MarketplaceGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div
      className="marketplace-grid"
      role="status"
      aria-label="Loading products..."
      style={{ width: '100%' }}
    >
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}>
        Loading marketplace items, please wait...
      </span>
      {Array.from({ length: count }).map((_, i) => (
        <MarketplaceCardSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * Skeleton for market price benchmark rows (Dashboard & Price Monitoring)
 */
export const PriceRowSkeleton: React.FC = () => {
  return (
    <div
      className="dashboard-price-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        borderRadius: '12px',
        background: 'var(--color-surface, #F8FAFC)',
        border: '1px solid var(--color-border, #E2E8F0)',
        flexWrap: 'wrap',
        gap: '8px',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <div>
          <Skeleton variant="text" width={130} height={18} style={{ marginBottom: '4px' }} />
          <Skeleton variant="text-sm" width={80} style={{ marginBottom: 0 }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Skeleton variant="rectangular" width={75} height={24} borderRadius={6} />
        <Skeleton variant="rectangular" width={60} height={24} borderRadius={12} />
      </div>
    </div>
  );
};

/**
 * List of Price Benchmark Skeletons for Dashboard
 */
export const DashboardPriceListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
      role="status"
      aria-label="Loading price benchmarks..."
    >
      {Array.from({ length: count }).map((_, i) => (
        <PriceRowSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * Skeleton for Community Hub Feed Posts
 */
export const CommunityPostSkeleton: React.FC = () => {
  return (
    <div
      className="card skeleton-post-card"
      style={{
        padding: '24px',
        marginBottom: '20px',
        borderRadius: '16px',
        border: '1px solid var(--color-border)',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {/* Author Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <Skeleton variant="circular" width={48} height={48} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Skeleton variant="text" width={140} height={16} style={{ marginBottom: 0 }} />
            <Skeleton variant="pill" width={70} height={20} />
          </div>
          <Skeleton variant="text-sm" width={100} style={{ marginBottom: 0 }} />
        </div>
      </div>

      {/* Post Text Content */}
      <div style={{ marginBottom: '16px' }}>
        <Skeleton variant="text" width="100%" height={16} style={{ marginBottom: '8px' }} />
        <Skeleton variant="text" width="92%" height={16} style={{ marginBottom: '8px' }} />
        <Skeleton variant="text" width="65%" height={16} style={{ marginBottom: 0 }} />
      </div>

      {/* Media placeholder */}
      <div style={{ marginBottom: '18px' }}>
        <Skeleton variant="rectangular" width="100%" height={180} borderRadius={12} />
      </div>

      {/* Actions footer (Likes, Comments, Share) */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <Skeleton variant="pill" width={80} height={36} />
        <Skeleton variant="pill" width={110} height={36} />
        <Skeleton variant="pill" width={75} height={36} />
      </div>
    </div>
  );
};

/**
 * Skeleton for Government Assistance & Subsidies Programs
 */
export const ProgramCardSkeleton: React.FC = () => {
  return (
    <div
      className="card"
      style={{
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {/* Agency & Category Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton variant="pill" width={110} height={26} />
        <Skeleton variant="pill" width={80} height={24} />
      </div>

      {/* Program Title */}
      <Skeleton variant="title" width="85%" height={24} style={{ marginBottom: 0 }} />

      {/* Description */}
      <div>
        <Skeleton variant="text-sm" width="100%" style={{ marginBottom: '6px' }} />
        <Skeleton variant="text-sm" width="75%" style={{ marginBottom: 0 }} />
      </div>

      {/* Meta Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
          padding: '12px',
          borderRadius: '10px',
          background: 'var(--color-bg)',
        }}
      >
        <div>
          <Skeleton variant="text-sm" width={70} style={{ marginBottom: '4px' }} />
          <Skeleton variant="text" width={100} height={16} style={{ marginBottom: 0 }} />
        </div>
        <div>
          <Skeleton variant="text-sm" width={60} style={{ marginBottom: '4px' }} />
          <Skeleton variant="text" width={90} height={16} style={{ marginBottom: 0 }} />
        </div>
      </div>

      {/* Apply Button */}
      <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
        <Skeleton variant="rectangular" width="100%" height={48} borderRadius={12} />
      </div>
    </div>
  );
};

/**
 * Skeleton for generic table rows
 */
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <div className="skeleton-table-row" aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} style={{ flex: i === 0 ? 1.5 : 1 }}>
          <Skeleton variant="text" width={i === 0 ? '75%' : '60%'} height={16} style={{ marginBottom: 0 }} />
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton for listing / inventory management rows
 */
export const ManageItemSkeleton: React.FC = () => {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        padding: '20px 24px',
        borderRadius: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: '280px' }}>
        <Skeleton variant="rectangular" width={95} height={95} borderRadius={14} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Skeleton variant="title" width="60%" height={22} style={{ marginBottom: '8px' }} />
          <Skeleton variant="text-sm" width="85%" style={{ marginBottom: '8px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Skeleton variant="pill" width={90} height={24} />
            <Skeleton variant="pill" width={70} height={24} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <Skeleton variant="rectangular" width={85} height={42} borderRadius={10} />
        <Skeleton variant="rectangular" width={85} height={42} borderRadius={10} />
      </div>
    </div>
  );
};

/**
 * Skeleton placeholder for Supply and Produce Orders
 */
export const OrderCardSkeleton: React.FC = () => {
  return (
    <div
      className="card"
      style={{
        padding: '24px',
        borderRadius: '20px',
        border: '1.5px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        pointerEvents: 'none',
        background: 'var(--color-surface)',
      }}
      aria-hidden="true"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Skeleton variant="rectangular" width={140} height={20} borderRadius={6} />
          <Skeleton variant="pill" width={90} height={24} />
        </div>
        <Skeleton variant="pill" width={110} height={26} />
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Skeleton variant="rectangular" width={72} height={72} borderRadius={12} />
        <div style={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={18} style={{ marginBottom: '6px' }} />
          <Skeleton variant="text-sm" width="35%" style={{ marginBottom: 0 }} />
        </div>
        <Skeleton variant="text" width={100} height={22} style={{ marginBottom: 0 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
        <Skeleton variant="text-sm" width={120} style={{ marginBottom: 0 }} />
        <Skeleton variant="rectangular" width={120} height={38} borderRadius={10} />
      </div>
    </div>
  );
};

/**
 * Full Application Shell Skeleton (replacing round spinner on initial auth/route load)
 */
export const AppShellSkeleton: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--color-bg, #F8F7F3)',
        color: 'var(--color-text)',
      }}
      role="status"
      aria-label="Loading AgriConnect application..."
    >
      {/* Sidebar Skeleton (hidden on mobile) */}
      <aside
        style={{
          width: '280px',
          flexShrink: 0,
          borderRight: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface, #FFFFFF)',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
        className="app-sidebar-skeleton"
      >
        {/* Logo Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Skeleton variant="circular" width={42} height={42} />
          <div>
            <Skeleton variant="text" width={110} height={18} style={{ marginBottom: '4px' }} />
            <Skeleton variant="text-sm" width={70} style={{ marginBottom: 0 }} />
          </div>
        </div>

        {/* Navigation Categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
          <Skeleton variant="text-sm" width={60} style={{ marginBottom: '4px' }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 4px' }}>
              <Skeleton variant="circular" width={26} height={26} />
              <Skeleton variant="text" width={i % 2 === 0 ? 120 : 95} height={16} style={{ marginBottom: 0 }} />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Skeleton variant="circular" width={36} height={36} />
          <Skeleton variant="pill" width={110} height={32} />
        </div>
      </aside>

      {/* Main Content Area Skeleton */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '68px',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            gap: '16px',
          }}
        >
          <Skeleton variant="rectangular" width="45%" height={40} borderRadius={12} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Skeleton variant="circular" width={38} height={38} />
            <Skeleton variant="circular" width={38} height={38} />
            <Skeleton variant="circular" width={42} height={42} />
          </div>
        </header>

        {/* Body Content */}
        <main style={{ padding: '32px 36px', flex: 1, overflowY: 'auto' }}>
          {/* Breadcrumb & Title */}
          <div style={{ marginBottom: '28px' }}>
            <Skeleton variant="text-sm" width={160} style={{ marginBottom: '10px' }} />
            <Skeleton variant="title" width={320} height={32} style={{ marginBottom: '10px' }} />
            <Skeleton variant="text" width={480} height={18} style={{ marginBottom: 0 }} />
          </div>

          {/* Metric KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '18px',
              marginBottom: '32px',
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="card"
                style={{
                  padding: '20px 22px',
                  borderRadius: '16px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <Skeleton variant="text-sm" width={80} style={{ marginBottom: 0 }} />
                  <Skeleton variant="circular" width={28} height={28} />
                </div>
                <Skeleton variant="rectangular" width={110} height={28} borderRadius={8} style={{ marginBottom: '8px' }} />
                <Skeleton variant="text-sm" width={130} style={{ marginBottom: 0 }} />
              </div>
            ))}
          </div>

          {/* Cards Grid */}
          <MarketplaceGridSkeleton count={4} />
        </main>
      </div>
    </div>
  );
};


