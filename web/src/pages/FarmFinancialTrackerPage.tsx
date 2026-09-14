import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const sampleFinances = {
  income: 42500,
  expenses: 18200,
  netIncome: 24300,
};

const initialTransactions = [
  { id: 't1', title: 'Sold 350kg Yellow Corn to Bukidnon Wholesale', type: 'income', amount: 8750, date: 'Today, 2:15 PM' },
  { id: 't2', title: 'Bought 3 Bags Complete Fertilizer (14-14-14)', type: 'expense', amount: 4800, date: 'Yesterday' },
  { id: 't3', title: 'Delivered 200kg Red Tomatoes to Metro CDO', type: 'income', amount: 9000, date: 'Aug 29, 2026' },
  { id: 't4', title: 'Irrigation Pump Diesel Fuel (20 Liters)', type: 'expense', amount: 1400, date: 'Aug 26, 2026' },
  { id: 't5', title: 'Sold 150kg Eggplant to Local Market Vendor', type: 'income', amount: 4500, date: 'Aug 24, 2026' },
];

const sampleCalendar = [
  { id: '1', title: 'Planting (Tomato & Corn)', date: 'September 8', icon: '🌱', status: 'Upcoming' },
  { id: '2', title: 'Irrigation & Watering', date: 'September 10', icon: '💧', status: 'Scheduled' },
  { id: '3', title: 'Fertilizing Application', date: 'September 14', icon: '🌾', status: 'Scheduled' },
  { id: '4', title: 'Main Crop Harvest', date: 'September 22', icon: '🧺', status: 'Scheduled' },
];

export const FarmFinancialTrackerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'finances' | 'calendar' | 'records'>(() => {
    if (location.hash === '#calendar') return 'calendar';
    if (location.hash === '#records') return 'records';
    return 'finances';
  });

  useEffect(() => {
    if (location.hash === '#calendar') {
      setActiveTab('calendar');
    } else if (location.hash === '#records') {
      setActiveTab('records');
    } else {
      setActiveTab('finances');
    }
  }, [location.hash]);

  const handleTabChange = (tab: 'finances' | 'calendar' | 'records') => {
    setActiveTab(tab);
    if (tab === 'calendar') {
      navigate('/finances#calendar', { replace: true });
    } else if (tab === 'records') {
      navigate('/finances#records', { replace: true });
    } else {
      navigate('/finances', { replace: true });
    }
  };

  const [finances, setFinances] = useState(sampleFinances);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [activities, setActivities] = useState(sampleCalendar);
  const [showAddFinance, setShowAddFinance] = useState(false);
  const [financeType, setFinanceType] = useState<'income' | 'expense'>('income');
  const [financeAmount, setFinanceAmount] = useState('');
  const [financeTitle, setFinanceTitle] = useState('');
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDate, setActivityDate] = useState('');

  const handleAddFinance = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(financeAmount);
    if (!amt) return;

    const newTx = {
      id: `t-${Date.now()}`,
      title: financeTitle,
      type: financeType,
      amount: amt,
      date: 'Just now',
    };

    setTransactions([newTx, ...transactions]);

    if (financeType === 'income') {
      setFinances((prev) => ({
        ...prev,
        income: prev.income + amt,
        netIncome: prev.netIncome + amt,
      }));
    } else {
      setFinances((prev) => ({
        ...prev,
        expenses: prev.expenses + amt,
        netIncome: prev.netIncome - amt,
      }));
    }
    setShowAddFinance(false);
    setFinanceAmount('');
    setFinanceTitle('');
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle) return;

    setActivities([
      ...activities,
      {
        id: String(Date.now()),
        title: activityTitle,
        date: activityDate || 'September 25',
        icon: '📅',
        status: 'Upcoming',
      },
    ]);
    setShowAddActivity(false);
    setActivityTitle('');
    setActivityDate('');
  };

  return (
    <div className="app-container" style={{ paddingBottom: '50px' }}>
      {/* ─── Page Header ─── */}
      <div className="finance-header-wrap" style={{ marginBottom: '24px' }}>
        <div className="finance-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="finance-title" style={{ fontSize: '30px', fontWeight: 800, color: '#0E4A27', letterSpacing: '-0.02em', margin: 0 }}>
              {activeTab === 'finances'
                ? 'Farm Earnings & Expenses'
                : activeTab === 'calendar'
                ? 'Planting & Farm Calendar'
                : 'Financial Transaction Records'}
            </h1>
            <p className="finance-subtitle" style={{ fontSize: '15px', color: '#525450', lineHeight: 1.5, marginTop: '6px', margin: '6px 0 0 0' }}>
              {activeTab === 'finances'
                ? 'Track crop sales revenue, supply input costs, and net farm profits.'
                : activeTab === 'calendar'
                ? 'Organize planting dates, irrigation schedules, and harvest milestones.'
                : 'Detailed ledger of all farm sales collections and supply expenses.'}
            </p>
          </div>

          {/* ─── Top Segregated Navigation Tabs ─── */}
          <div
            className="finance-tabs-nav segmented-tabs-bar"
            style={{
              display: 'inline-flex',
              background: '#F1F3F0',
              border: '1px solid #E2E8F0',
              padding: '4px',
              borderRadius: '14px',
              gap: '4px',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => handleTabChange('finances')}
              className={`segmented-tab-btn ${activeTab === 'finances' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                background: activeTab === 'finances' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'finances' ? '#0E4A27' : '#64748b',
                boxShadow: activeTab === 'finances' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <span>💰</span>
              <span>Farm Finances</span>
            </button>

            <button
              onClick={() => handleTabChange('calendar')}
              className={`segmented-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                background: activeTab === 'calendar' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'calendar' ? '#0E4A27' : '#64748b',
                boxShadow: activeTab === 'calendar' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <span>📅</span>
              <span>Farm Calendar</span>
            </button>

            <button
              onClick={() => handleTabChange('records')}
              className={`segmented-tab-btn ${activeTab === 'records' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                background: activeTab === 'records' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'records' ? '#0E4A27' : '#64748b',
                boxShadow: activeTab === 'records' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <span>📋</span>
              <span>Records Log</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 1: FINANCIAL OVERVIEW
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'finances' && (
        <div>
          {/* Financial Summary Cards */}
          <div className="finance-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            {/* Money Earned */}
            <div className="card finance-summary-card finance-card-income" style={{ borderLeft: '5px solid #16A34A', background: '#FFFFFF', padding: '22px 24px' }}>
              <div className="finance-card-label" style={{ fontSize: '13px', fontWeight: 800, color: '#525450', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💚</span>
                <span>Total Money Earned (Sales)</span>
              </div>
              <div className="finance-card-value" style={{ fontSize: '32px', fontWeight: 800, color: '#16A34A', letterSpacing: '-0.02em', margin: '8px 0 4px 0', lineHeight: 1.2 }}>
                ₱{finances.income.toLocaleString()}
              </div>
              <div className="finance-card-sub" style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
                ↑ 14.2% higher than last harvest cycle
              </div>
            </div>

            {/* Money Spent */}
            <div className="card finance-summary-card finance-card-expense" style={{ borderLeft: '5px solid #DC2626', background: '#FFFFFF', padding: '22px 24px' }}>
              <div className="finance-card-label" style={{ fontSize: '13px', fontWeight: 800, color: '#525450', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>❤️</span>
                <span>Total Money Spent (Inputs)</span>
              </div>
              <div className="finance-card-value" style={{ fontSize: '32px', fontWeight: 800, color: '#DC2626', letterSpacing: '-0.02em', margin: '8px 0 4px 0', lineHeight: 1.2 }}>
                ₱{finances.expenses.toLocaleString()}
              </div>
              <div className="finance-card-sub" style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                Spent on seeds, fertilizers, fuel, transport
              </div>
            </div>

            {/* Net Profit */}
            <div className="card finance-summary-card finance-card-net" style={{ borderLeft: '5px solid #0E4A27', background: '#EAF6EE', padding: '22px 24px' }}>
              <div className="finance-card-label" style={{ fontSize: '13px', fontWeight: 800, color: '#176B3A', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💵</span>
                <span>Net Farm Profit</span>
              </div>
              <div className="finance-card-value" style={{ fontSize: '32px', fontWeight: 800, color: '#0E4A27', letterSpacing: '-0.02em', margin: '8px 0 4px 0', lineHeight: 1.2 }}>
                ₱{finances.netIncome.toLocaleString()}
              </div>
              <div className="finance-card-sub" style={{ fontSize: '13px', color: '#166534', fontWeight: 700 }}>
                ✓ Healthy cash balance
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="finance-action-buttons" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '32px' }}>
            <button
              onClick={() => { setFinanceType('income'); setShowAddFinance(true); }}
              className="btn btn-primary finance-action-btn"
              style={{ padding: '11px 22px', fontSize: '14px', fontWeight: 700, borderRadius: '12px' }}
            >
              + Add Money Earned (Sales)
            </button>

            <button
              onClick={() => { setFinanceType('expense'); setShowAddFinance(true); }}
              className="btn btn-secondary finance-action-btn"
              style={{ padding: '11px 22px', fontSize: '14px', fontWeight: 700, borderRadius: '12px' }}
            >
              + Add Money Spent (Expense)
            </button>
          </div>

          {/* Recent 3 Transactions Teaser */}
          <div className="card finance-tx-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="finance-tx-header-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
                Recent Cash Activity
              </h3>
              <button
                onClick={() => handleTabChange('records')}
                className="btn btn-secondary finance-view-all-btn"
                style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '10px' }}
              >
                View All Records ({transactions.length}) →
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {transactions.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  className="finance-tx-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: '#F8FAF8',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                    <div
                      className="finance-tx-icon"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: t.type === 'income' ? '#EAF6EE' : '#FDF2F2',
                        color: t.type === 'income' ? '#176B3A' : '#BA3C3C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '17px',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {t.type === 'income' ? '↓' : '↑'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="finance-tx-title" style={{ fontSize: '15px', fontWeight: 700, color: '#1A1C1A' }}>{t.title}</div>
                      <div className="finance-tx-date" style={{ fontSize: '13px', color: '#64748b' }}>{t.date}</div>
                    </div>
                  </div>

                  <div className="finance-tx-amount" style={{ fontSize: '17px', fontWeight: 800, color: t.type === 'income' ? '#176B3A' : '#BA3C3C', marginLeft: '12px', flexShrink: 0 }}>
                    {t.type === 'income' ? '+' : '-'}₱{t.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 2: FARM CALENDAR
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'calendar' && (
        <section id="calendar">
          <div className="finance-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 className="finance-section-title" style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
                Scheduled Farm Activities & Milestones
              </h2>
              <p className="finance-section-sub" style={{ fontSize: '14px', color: '#525450', marginTop: '4px', margin: '4px 0 0 0' }}>
                Dates for seedling transplanting, fertilization cycles, and planned harvest windows.
              </p>
            </div>

            <button
              onClick={() => setShowAddActivity(true)}
              className="btn btn-primary finance-add-activity-btn"
              style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 700, borderRadius: '12px' }}
            >
              + Add Farm Activity
            </button>
          </div>

          <div className="card finance-calendar-card" style={{ padding: '0', overflow: 'hidden' }}>
            {activities.map((act, idx) => (
              <div
                key={act.id}
                className="finance-calendar-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 22px',
                  borderBottom: idx < activities.length - 1 ? '1.5px solid #E4E2DC' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
                  <div
                    className="finance-calendar-icon"
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: '#EAF6EE',
                      color: '#176B3A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      flexShrink: 0,
                    }}
                  >
                    {act.icon}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="finance-calendar-title" style={{ fontSize: '16px', fontWeight: 700, color: '#1A1C1A' }}>
                      {act.title}
                    </div>
                    <div className="finance-calendar-date" style={{ fontSize: '13px', color: '#176B3A', fontWeight: 700, marginTop: '2px' }}>
                      📅 Scheduled: {act.date}
                    </div>
                  </div>
                </div>

                <span className="badge badge-verified finance-calendar-badge" style={{ fontSize: '13px', padding: '5px 12px', flexShrink: 0 }}>
                  {act.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 3: TRANSACTION RECORDS LEDGER
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'records' && (
        <section id="records">
          <div className="finance-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 className="finance-section-title" style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
                Complete Financial Ledger
              </h2>
              <p className="finance-section-sub" style={{ fontSize: '14px', color: '#525450', marginTop: '4px', margin: '4px 0 0 0' }}>
                All documented earnings and expenses for this farming period.
              </p>
            </div>

            <div className="finance-ledger-actions" style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setFinanceType('income'); setShowAddFinance(true); }}
                className="btn btn-primary finance-ledger-btn"
                style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 700, borderRadius: '10px' }}
              >
                + Add Sale
              </button>
              <button
                onClick={() => { setFinanceType('expense'); setShowAddFinance(true); }}
                className="btn btn-secondary finance-ledger-btn"
                style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 700, borderRadius: '10px' }}
              >
                + Add Expense
              </button>
            </div>
          </div>

          <div className="card finance-ledger-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div className="finance-ledger-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="finance-ledger-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8F7F3', borderBottom: '2px solid #E4E2DC' }}>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 800, color: '#0E4A27', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 800, color: '#0E4A27', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 800, color: '#0E4A27', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 800, color: '#0E4A27', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #E4E2DC' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          className="badge"
                          style={{
                            background: tx.type === 'income' ? '#EAF6EE' : '#FDF2F2',
                            color: tx.type === 'income' ? '#176B3A' : '#BA3C3C',
                            fontSize: '13px',
                            fontWeight: 800,
                            padding: '4px 10px',
                          }}
                        >
                          {tx.type === 'income' ? '🟢 Income' : '🔴 Expense'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '15px', fontWeight: 600, color: '#1A1C1A' }}>
                        {tx.title}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: '#64748b' }}>
                        {tx.date}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '16px', fontWeight: 800, textAlign: 'right', color: tx.type === 'income' ? '#176B3A' : '#BA3C3C' }}>
                        {tx.type === 'income' ? '+' : '-'}₱{tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ─── Add Finance Modal ─── */}
      {showAddFinance && (
        <div className="modal-backdrop" onClick={() => setShowAddFinance(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
                {financeType === 'income' ? '+ Add Money Earned (Sale)' : '+ Add Money Spent (Expense)'}
              </h2>
              <button onClick={() => setShowAddFinance(false)} style={{ background: '#F8F7F3', border: 'none', fontSize: '24px', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%' }}>✕</button>
            </div>

            <form onSubmit={handleAddFinance}>
              <div className="form-group">
                <label className="form-label">What is this record for?</label>
                <input
                  type="text"
                  value={financeTitle}
                  onChange={(e) => setFinanceTitle(e.target.value)}
                  placeholder={financeType === 'income' ? 'e.g. Sold 100kg Tomato' : 'e.g. Bought Fertilizer'}
                  required
                  className="form-input"
                  style={{ fontSize: '18px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '28px' }}>
                <label className="form-label">Amount in Pesos (₱)</label>
                <input
                  type="number"
                  value={financeAmount}
                  onChange={(e) => setFinanceAmount(e.target.value)}
                  placeholder="e.g. 2500"
                  required
                  className="form-input"
                  style={{ fontSize: '20px', fontWeight: 800 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '14px' }}>
                <button type="button" onClick={() => setShowAddFinance(false)} className="btn btn-secondary btn-large" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-large" style={{ flex: 2 }}>
                  Save Record →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Add Activity Modal ─── */}
      {showAddActivity && (
        <div className="modal-backdrop" onClick={() => setShowAddActivity(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
                + Add Farm Activity
              </h2>
              <button onClick={() => setShowAddActivity(false)} style={{ background: '#F8F7F3', border: 'none', fontSize: '24px', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%' }}>✕</button>
            </div>

            <form onSubmit={handleAddActivity}>
              <div className="form-group">
                <label className="form-label">Activity Description</label>
                <input
                  type="text"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="e.g. Tomato Suckers Pruning, Irrigation, Planting"
                  required
                  className="form-input"
                  style={{ fontSize: '18px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '28px' }}>
                <label className="form-label">Scheduled Date</label>
                <input
                  type="text"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  placeholder="e.g. September 25"
                  required
                  className="form-input"
                  style={{ fontSize: '18px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '14px' }}>
                <button type="button" onClick={() => setShowAddActivity(false)} className="btn btn-secondary btn-large" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-large" style={{ flex: 2 }}>
                  Add to Calendar →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
