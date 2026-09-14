import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminApi } from '../api/admin';
import { produceApi } from '../api/produce';
import { priceApi } from '../api/price';
import type { MarketPrice } from '../types/price';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = user?.role || 'farmer';

  const roleNameMap: Record<string, string> = {
    farmer: 'Farmer',
    buyer: 'Wholesale Buyer',
    supplier: 'Supplier Partner',
    lgu_staff: 'LGU Officer',
    super_admin: 'Super Admin',
  };

  const rawName = user
    ? user.firstName || user.lastName || roleNameMap[role] || 'User'
    : 'User';
  const userName = rawName.trim();

  const subtitleMap: Record<string, string> = {
    farmer: 'How can AgriConnect help your farm today?',
    buyer: 'Source fresh wholesale produce directly from local verified farmers.',
    supplier: 'Manage your agricultural supply inventory and customer orders.',
    lgu_staff: 'Local Agriculture Office • Regional Monitoring & Governance',
    super_admin: 'Platform governance, staff approvals, and regional agricultural monitoring.',
  };

  // Real LGU & Admin Dynamic Metrics State
  const [lguStats, setLguStats] = useState({
    farmersCount: 0,
    listingsCount: 0,
    pendingCount: 0,
    loaded: false,
  });

  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    totalListings: 0,
    loaded: false,
  });

  const [farmerStats, setFarmerStats] = useState({
    activeListings: 0,
    pendingOrders: 0,
    loaded: false,
  });

  // Real Market Prices State
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [pricesLoaded, setPricesLoaded] = useState(false);

  useEffect(() => {
    // 1. Fetch real LGU overview data
    if (role === 'lgu_staff') {
      const fetchLguData = async () => {
        try {
          const [usersRes, listingsRes] = await Promise.allSettled([
            adminApi.listUsers(),
            produceApi.listListings(),
          ]);

          let farmers = 0;
          let pending = 0;
          if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
            const users = usersRes.value;
            // The backend automatically filters users to this LGU's jurisdiction!
            farmers = users.filter((u) => u.role === 'farmer' && u.status === 'approved').length;
            pending = users.filter((u) => u.status === 'pending').length;
          }

          let listings = 0;
          if (listingsRes.status === 'fulfilled' && Array.isArray(listingsRes.value)) {
            const mun = (user?.municipality || '').toLowerCase();
            listings = listingsRes.value.filter((l) => {
              if (l.status !== 'available') return false;
              if (!mun) return true;
              return (l.location || '').toLowerCase().includes(mun);
            }).length;
          }

          setLguStats({
            farmersCount: farmers,
            listingsCount: listings,
            pendingCount: pending,
            loaded: true,
          });
        } catch (e) {
          console.error('Failed to load real LGU overview data:', e);
          setLguStats({ farmersCount: 0, listingsCount: 0, pendingCount: 0, loaded: true });
        }
      };

      fetchLguData();
    }

    // 2. Fetch real Super Admin overview data
    if (role === 'super_admin') {
      const fetchAdminData = async () => {
        try {
          const [usersRes, listingsRes] = await Promise.allSettled([
            adminApi.listUsers(),
            produceApi.listListings(),
          ]);

          let total = 0;
          let pending = 0;
          if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
            total = usersRes.value.length;
            pending = usersRes.value.filter((u) => u.status === 'pending').length;
          }

          let activeListings = 0;
          if (listingsRes.status === 'fulfilled' && Array.isArray(listingsRes.value)) {
            activeListings = listingsRes.value.filter((l) => l.status === 'available').length;
          }

          setAdminStats({
            totalUsers: total,
            pendingUsers: pending,
            totalListings: activeListings,
            loaded: true,
          });
        } catch (e) {
          console.error('Failed to load admin overview data:', e);
          setAdminStats({ totalUsers: 0, pendingUsers: 0, totalListings: 0, loaded: true });
        }
      };

      fetchAdminData();
    }

    // 3. Fetch real Farmer overview data
    if (role === 'farmer' && user?.id) {
      const fetchFarmerData = async () => {
        try {
          const [listingsRes, ordersRes] = await Promise.allSettled([
            produceApi.listListings({ farmerId: user.id }),
            produceApi.listTransactions(),
          ]);

          let activeCount = 0;
          if (listingsRes.status === 'fulfilled' && Array.isArray(listingsRes.value)) {
            activeCount = listingsRes.value.filter((l) => l.status === 'available').length;
          }

          let pendingCount = 0;
          if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value)) {
            pendingCount = ordersRes.value.filter(
              (t) => t.farmerId === user.id && t.status === 'pending'
            ).length;
          }

          setFarmerStats({
            activeListings: activeCount,
            pendingOrders: pendingCount,
            loaded: true,
          });
        } catch (e) {
          console.error('Failed to load farmer data:', e);
          setFarmerStats({ activeListings: 0, pendingOrders: 0, loaded: true });
        }
      };

      fetchFarmerData();
    }

    // 4. Fetch real Market Prices
    const fetchMarketPrices = async () => {
      try {
        const records = await priceApi.listHistory();
        if (Array.isArray(records)) {
          // Get latest distinct crops
          const distinct: MarketPrice[] = [];
          const seen = new Set<string>();
          for (const r of records) {
            if (!seen.has(r.cropName)) {
              seen.add(r.cropName);
              distinct.push(r);
            }
            if (distinct.length >= 5) break;
          }
          setMarketPrices(distinct);
        }
      } catch (e) {
        console.error('Failed to fetch real market prices:', e);
      } finally {
        setPricesLoaded(true);
      }
    };

    fetchMarketPrices();
  }, [role, user?.id, user?.municipality]);

  const actionCards = (() => {
    switch (role) {
      case 'super_admin':
        return [
          {
            title: 'Staff & Account Approvals',
            subtitle: 'Review pending LGU staff, supplier, and expert accounts',
            icon: '🛡️',
            bg: '#176B3A',
            path: '/admin/approvals',
          },
          {
            title: 'LGU Regional Monitoring',
            subtitle: 'Inspect province & municipal agricultural activity',
            icon: '🏛️',
            bg: '#0E4A27',
            path: '/lgu/dashboard',
          },
          {
            title: 'Manage Government Programs',
            subtitle: 'Publish subsidies and agricultural assistance programs',
            icon: '📜',
            bg: '#2B72B3',
            path: '/programs/manage',
          },
        ];
      case 'lgu_staff':
        return [
          {
            title: 'Account Approvals',
            subtitle: 'Verify local farmers, buyers, and suppliers',
            icon: '📋',
            bg: '#176B3A',
            path: '/lgu/approvals',
          },
          {
            title: 'Regional Dashboard',
            subtitle: 'Track crop harvests, yields, and food security',
            icon: '🏛️',
            bg: '#0E4A27',
            path: '/lgu/dashboard',
          },
          {
            title: 'Manage Programs',
            subtitle: 'Publish agricultural assistance & subsidies',
            icon: '📜',
            bg: '#2B72B3',
            path: '/programs/manage',
          },
        ];
      case 'supplier':
        return [
          {
            title: 'Manage Supply Products',
            subtitle: 'Add and update seeds, fertilizers, and machinery items',
            icon: '🚜',
            bg: '#176B3A',
            path: '/supply/manage',
          },
          {
            title: 'Customer Supply Orders',
            subtitle: 'View and fulfill pending supply purchases from farmers',
            icon: '📦',
            bg: '#0E4A27',
            path: '/supply/orders',
          },
          {
            title: 'Check Produce Marketplace',
            subtitle: 'Explore local farms and prevailing commodity rates',
            icon: '📈',
            bg: '#2B72B3',
            path: '/produce',
          },
        ];
      case 'buyer':
        return [
          {
            title: 'Browse Produce Marketplace',
            subtitle: 'Order fresh vegetables, grains, and fruits from farms',
            icon: '🥦',
            bg: '#176B3A',
            path: '/produce',
          },
          {
            title: 'Track Purchase Orders',
            subtitle: 'Monitor delivery progress and order confirmations',
            icon: '📦',
            bg: '#0E4A27',
            path: '/produce/orders',
          },
          {
            title: 'Check Daily Market Prices',
            subtitle: 'Review prevailing price benchmarks and trends',
            icon: '📈',
            bg: '#2B72B3',
            path: '/market-prices',
          },
        ];
      default: // farmer
        return [
          {
            title: 'Sell My Crops',
            subtitle: 'Add a crop listing to sell to buyers',
            icon: '🥦',
            bg: '#176B3A',
            path: '/produce/manage?action=new',
          },
          {
            title: 'Check Market Prices',
            subtitle: "See today's crop prices in Northern Mindanao",
            icon: '📈',
            bg: '#0E4A27',
            path: '/market-prices',
          },
          {
            title: 'View My Orders',
            subtitle: 'See buyers who want to buy your crops',
            icon: '📦',
            bg: '#2B72B3',
            path: '/produce/orders',
          },
        ];
    }
  })();

  const summary = (() => {
    switch (role) {
      case 'super_admin':
        return {
          title: 'Platform Governance Summary',
          cards: [
            {
              label: 'Registered Users',
              value: adminStats.loaded ? `${adminStats.totalUsers}` : '...',
              sub: 'Across all Philippine regions',
              color: '#176B3A',
            },
            {
              label: 'Active Produce Listings',
              value: adminStats.loaded ? `${adminStats.totalListings} Harvests` : '...',
              sub: 'Available on platform marketplace',
              color: '#2B72B3',
            },
            {
              label: 'Pending Approvals',
              value: adminStats.loaded ? `${adminStats.pendingUsers} Accounts` : '...',
              sub: adminStats.pendingUsers > 0 ? 'Awaiting verification' : 'All accounts up to date',
              color: adminStats.pendingUsers > 0 ? '#BA3C3C' : '#176B3A',
            },
          ],
        };
      case 'lgu_staff':
        return {
          title: 'Local Jurisdiction Overview',
          cards: [
            {
              label: 'Registered Farmers',
              value: lguStats.loaded ? `${lguStats.farmersCount}` : '...',
              sub: `In ${user?.municipality || 'your municipality'}`,
              color: '#176B3A',
            },
            {
              label: 'Active Crop Listings',
              value: lguStats.loaded ? `${lguStats.listingsCount} Harvests` : '...',
              sub: lguStats.listingsCount > 0 ? 'Available for wholesale trade' : `No active harvests in ${user?.municipality || 'town'} yet`,
              color: '#2B72B3',
            },
            {
              label: 'Pending Approvals',
              value: lguStats.loaded ? `${lguStats.pendingCount} Accounts` : '...',
              sub: lguStats.pendingCount > 0 ? 'Awaiting your verification' : 'All accounts verified',
              color: lguStats.pendingCount > 0 ? '#BA3C3C' : '#176B3A',
            },
          ],
        };
      case 'supplier':
        return {
          title: 'Your Supply Business Summary',
          cards: [
            { label: 'Supply Products', value: 'Catalog Active', sub: 'Seeds, fertilizer, tools', color: '#176B3A' },
            { label: 'Customer Orders', value: 'Live', sub: 'Fulfillment & deliveries', color: '#2B72B3' },
            { label: 'Market Benchmarks', value: 'Monitored', sub: 'Direct from DA Region X', color: '#1E7E45' },
          ],
        };
      case 'buyer':
        return {
          title: 'Your Wholesale Purchasing Summary',
          cards: [
            { label: 'Marketplace Produce', value: 'Available', sub: 'Fresh harvest from verified farms', color: '#2B72B3' },
            { label: 'Purchase Orders', value: 'Live Tracking', sub: 'Direct from farmers', color: '#176B3A' },
            { label: 'Commodity Prices', value: 'Monitored', sub: 'Official regional benchmarks', color: '#0E4A27' },
          ],
        };
      default: // farmer
        return {
          title: 'Your Farm Summary',
          cards: [
            {
              label: 'Active Crops for Sale',
              value: farmerStats.loaded ? `${farmerStats.activeListings} Crops` : '...',
              sub: farmerStats.activeListings > 0 ? 'Selling actively today' : 'No active crop listings yet',
              color: '#2B72B3',
            },
            {
              label: 'Pending Orders',
              value: farmerStats.loaded ? `${farmerStats.pendingOrders} Orders` : '...',
              sub: farmerStats.pendingOrders > 0 ? 'Awaiting your fulfillment' : 'All orders fulfilled',
              color: farmerStats.pendingOrders > 0 ? '#BA3C3C' : '#176B3A',
            },
            {
              label: 'Market Monitoring',
              value: 'Active',
              sub: "Today's prices in Region X",
              color: '#0E4A27',
            },
          ],
        };
    }
  })();

  const getCropIcon = (cropName: string) => {
    const c = cropName.toLowerCase();
    if (c.includes('corn') || c.includes('mais')) return '🌽';
    if (c.includes('rice') || c.includes('palay')) return '🌾';
    if (c.includes('tomato') || c.includes('kamatis')) return '🍅';
    if (c.includes('eggplant') || c.includes('talong')) return '🍆';
    if (c.includes('banana') || c.includes('saging')) return '🍌';
    if (c.includes('mango') || c.includes('mangga')) return '🥭';
    return '🌱';
  };

  return (
    <div className="app-container" style={{ paddingBottom: '40px' }}>
      {/* ─── Compact Greeting & Location Banner ─── */}
      <div
        className="dashboard-welcome-banner"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          marginBottom: '20px',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div>
          <h1 className="dashboard-welcome-title" style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27', margin: 0, lineHeight: 1.2 }}>
            Hello, {userName}! 👋
          </h1>
          <p className="dashboard-welcome-sub" style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: '4px 0 0 0', fontWeight: 500 }}>
            {subtitleMap[role] || subtitleMap.farmer}
          </p>
        </div>

        <div
          className="dashboard-location-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            background: '#F0FDF4',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#166534',
            border: '1px solid #BBF7D0',
          }}
        >
          <span>📍</span>
          <span>
            {user?.municipality
              ? user.municipality
              : user?.province
              ? user.province
              : user?.region || 'Set your location'}
          </span>
        </div>
      </div>

      {/* ─── Section 1: PRIMARY ACTION CARDS ─── */}
      <section style={{ marginBottom: '28px' }}>
        <h2 className="dashboard-section-title" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
          Quick Actions & Tools
        </h2>

        <div
          className="dashboard-actions-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
          }}
        >
          {actionCards.map((card, idx) => (
            <button
              key={idx}
              onClick={() => navigate(card.path)}
              className={`big-action-card ${(card as any).primary ? 'big-action-card-primary' : ''}`}
            >
              <div className="big-action-icon-box" style={{ background: card.bg }}>
                {card.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="big-action-title">{card.title}</div>
                <div className="big-action-subtitle">{card.subtitle}</div>
              </div>
              <span className="big-action-arrow" style={{ color: '#CBD5E1', fontSize: '15px', fontWeight: 700 }}>→</span>
            </button>
          ))}
        </div>
      </section>

      {/* ─── Section 2: SUMMARY STATS SECTION (REAL LIVE DATA) ─── */}
      <section style={{ marginBottom: '28px' }}>
        <h2 className="dashboard-section-title" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
          {summary.title}
        </h2>

        <div
          className="dashboard-summary-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          {summary.cards.map((c, idx) => (
            <div
              key={idx}
              className="card dashboard-summary-card"
              style={{
                borderLeft: `4px solid ${c.color}`,
                border: '1px solid #E2E8F0',
                borderLeftWidth: '4px',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div className="dashboard-stat-label" style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {c.label}
              </div>
              <div className="dashboard-stat-value" style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27', margin: '6px 0 2px 0', lineHeight: 1.2 }}>
                {c.value}
              </div>
              <div className="dashboard-stat-sub" style={{ fontSize: '12px', color: c.color, fontWeight: 600 }}>
                {c.sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Section 3: REAL CROP PRICES ─── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="card dashboard-prices-card" style={{ padding: '22px 24px', borderRadius: '18px', border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="dashboard-prices-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
                Today's Crop Prices
              </h2>
              <p className="dashboard-prices-sub" style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                Verified official prices recorded across Department of Agriculture trading posts
              </p>
            </div>
            <Link
              to="/market-prices"
              className="btn btn-secondary dashboard-prices-view-btn"
              style={{ fontSize: '13px', padding: '7px 16px', borderRadius: '10px', fontWeight: 700 }}
            >
              View All Prices →
            </Link>
          </div>

          {!pricesLoaded ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
              Loading today's price benchmarks...
            </div>
          ) : marketPrices.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              <p style={{ margin: 0, fontSize: '14px' }}>No price records published yet for today.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {marketPrices.map((item) => (
                <div
                  key={item.id}
                  className="dashboard-price-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    borderRadius: '12px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <span style={{ fontSize: '22px' }}>{getCropIcon(item.cropName)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{item.cropName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                        📍 {item.marketLocation || item.region}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0E4A27' }}>
                    ₱{item.price} / {item.unit || 'kg'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Section 4: PHONE ASSISTANCE HOTLINE BANNER ─── */}
      <section>
        <div
          style={{
            padding: '20px 24px',
            borderRadius: '18px',
            background: '#F0FDF4',
            border: '1.5px solid #86EFAC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#14532D' }}>
              📞 Need Help Over the Phone?
            </div>
            <div style={{ fontSize: '13px', color: '#166534', marginTop: '2px', fontWeight: 500 }}>
              Speak directly to our friendly support team. We assist in Tagalog, Bisaya & English.
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
              Hotline: 0917-123-4567 (Toll Free)
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
