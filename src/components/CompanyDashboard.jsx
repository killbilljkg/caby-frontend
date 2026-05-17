import React, { useState, useEffect, useCallback } from 'react';
import { getToken, getUser, logout as authLogout } from '../services/authService';
import CompanyPassengers from './CompanyPassengers';
import CompanyTrips from './CompanyTrips';
import { FiGrid, FiUsers, FiLogOut, FiList } from 'react-icons/fi';

const API_BASE = 'https://api-caby.story-labs.in';

/* ─────────────────────────────────────────────
   Donut Chart
───────────────────────────────────────────── */
const DonutChart = ({ slices = [], size = 130 }) => {
    const total = slices.reduce((s, x) => s + x.value, 0) || 1;
    const cx = size / 2, cy = size / 2, r = size * 0.38, ir = size * 0.24;
    let cum = -Math.PI / 2;

    const arc = (sa, ea, or, ir2) => {
        const x1 = cx + or * Math.cos(sa), y1 = cy + or * Math.sin(sa);
        const x2 = cx + or * Math.cos(ea), y2 = cy + or * Math.sin(ea);
        const xi1 = cx + ir2 * Math.cos(ea), yi1 = cy + ir2 * Math.sin(ea);
        const xi2 = cx + ir2 * Math.cos(sa), yi2 = cy + ir2 * Math.sin(sa);
        const lg = ea - sa > Math.PI ? 1 : 0;
        return `M${x1},${y1} A${or},${or} 0 ${lg},1 ${x2},${y2} L${xi1},${yi1} A${ir2},${ir2} 0 ${lg},0 ${xi2},${yi2} Z`;
    };

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {slices.map((s, i) => {
                const angle = (s.value / total) * 2 * Math.PI;
                const path = arc(cum, cum + angle, r, ir);
                cum += angle;
                return <path key={i} d={path} fill={s.color} stroke="#fff" strokeWidth="2" />;
            })}
            <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="700"
                fill="#111" fontFamily="Inter,system-ui,sans-serif">{total}</text>
        </svg>
    );
};

/* ─────────────────────────────────────────────
   Status colours
───────────────────────────────────────────── */
const STATUS_COLORS = {
    COMPLETED: { bg: '#e6f7e9', color: '#2e7d32' },
    PICKUP:    { bg: '#e3f2fd', color: '#1565c0' },
    REQUESTED: { bg: '#fff7ed', color: '#c2410c' },
    ACCEPTED:  { bg: '#e3f2fd', color: '#1565c0' },
    CANCELLED: { bg: '#ffebee', color: '#c62828' },
};
const statusStyle = (s) => STATUS_COLORS[(s || '').toUpperCase()] || { bg: '#f5f5f5', color: '#666' };

const DONUT_COLORS = {
    COMPLETED: '#2e7d32', PICKUP: '#1565c0', REQUESTED: '#ef6c00',
    ACCEPTED: '#1565c0', CANCELLED: '#c62828',
};

/* ─────────────────────────────────────────────
   Stat card
───────────────────────────────────────────── */
const StatCard = ({ label, value, sub, icon, accent }) => (
    <div className="db-stat-card">
        <div className="db-stat-icon">{icon}</div>
        <div className="db-stat-body">
            <p className="db-stat-label">{label}</p>
            <p className="db-stat-value" style={{ color: accent }}>{value ?? '—'}</p>
            {sub && <p className="db-stat-sub">{sub}</p>}
        </div>
    </div>
);

/* ─────────────────────────────────────────────
   Dashboard page
───────────────────────────────────────────── */
const DashboardPage = ({ onRefresh }) => {
    const token   = getToken();
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const user = getUser();

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/v1/company/dashboard`, { headers });
            if (!res.ok) throw new Error('Failed to load company dashboard');
            setData(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []); // eslint-disable-line

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    if (loading) return (
        <div className="db-loading"><div className="db-spinner" /><p>Loading dashboard…</p></div>
    );
    if (error) return (
        <div className="db-error">
            <span>⚠️</span><p>{error}</p>
            <button onClick={fetchDashboard}>Retry</button>
        </div>
    );

    const m  = data?.metrics || {};
    const sb = data?.statusBreakdown || {};

    const donutSlices = Object.entries(sb).map(([key, val]) => ({
        label: key, value: val, color: DONUT_COLORS[key] || '#999',
    }));

    const statCards = [
        { label: 'Total Trips',     value: m.totalTrips,     sub: `${m.activeTrips || 0} active`,   icon: '🛣️', accent: '#1565c0' },
        { label: 'Completed Trips', value: m.completedTrips, sub: `${m.pendingTrips || 0} pending`, icon: '✅', accent: '#2e7d32' },
        { label: 'Total Passengers',value: m.totalPassengers,sub: 'registered',                      icon: '👥', accent: '#111'    },
        {
            label: 'Fleet Distance',
            value: m.totalCorporateDistanceKm != null
                ? `${(m.totalCorporateDistanceKm / 1000).toFixed(1)}k km` : '—',
            sub: 'corporate km', icon: '📏', accent: '#333',
        },
    ];

    const activeTrips  = data?.activeTrips || [];
    const recentTrips  = data?.recentCompletedTrips || [];
    const passengers   = data?.passengers || [];

    return (
        <div className="db-root">
            {/* Header */}
            <div className="db-page-header">
                <div>
                    <h2 className="db-page-title">Company Dashboard</h2>
                    <p className="db-page-sub">Welcome, {user?.username} · Company overview</p>
                </div>
                <button className="db-refresh-btn" onClick={fetchDashboard}>↻ Refresh</button>
            </div>

            {/* Stat cards */}
            <div className="db-stat-grid">
                {statCards.map(c => <StatCard key={c.label} {...c} />)}
            </div>

            {/* Charts row */}
            <div className="db-charts-row">
                <div className="db-card">
                    <div className="db-card-header">
                        <h3 className="db-card-title">Trip Status Breakdown</h3>
                    </div>
                    <div className="db-donut-wrap">
                        <DonutChart slices={donutSlices} size={130} />
                        <div className="db-donut-legend">
                            {donutSlices.map(s => (
                                <div key={s.label} className="db-legend-row">
                                    <span className="db-legend-dot" style={{ background: s.color }} />
                                    <span className="db-legend-label">{s.label}</span>
                                    <span className="db-legend-val">{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="db-card db-card--wide">
                    <div className="db-card-header">
                        <h3 className="db-card-title">Active Trips</h3>
                        <span className="db-badge db-badge--green">{activeTrips.length} live</span>
                    </div>
                    {activeTrips.length === 0 ? (
                        <p className="db-empty">No active trips right now</p>
                    ) : (
                        <div className="db-table-wrap">
                            <table className="db-table">
                                <thead>
                                    <tr>
                                        <th>Passenger</th><th>From</th><th>To</th><th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeTrips.map(trip => {
                                        const st = statusStyle(trip.currentStatus);
                                        return (
                                            <tr key={trip.id}>
                                                <td className="db-td-bold">{trip.passengerName || '—'}</td>
                                                <td>{trip.fromLocation || '—'}</td>
                                                <td>{trip.toLocation || '—'}</td>
                                                <td>
                                                    <span className="db-status-badge" style={{ background: st.bg, color: st.color }}>
                                                        {trip.currentStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Completed Trips */}
            <div className="db-card db-card--full">
                <div className="db-card-header">
                    <h3 className="db-card-title">Recent Completed Trips</h3>
                    <span className="db-badge db-badge--neutral">{recentTrips.length} trips</span>
                </div>
                <div className="db-table-wrap">
                    <table className="db-table">
                        <thead>
                            <tr>
                                <th>Passenger</th><th>From</th><th>To</th>
                                <th>Start</th><th>End</th><th>Distance (km)</th><th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTrips.length === 0 ? (
                                <tr><td colSpan="7" className="db-table-empty">No completed trips</td></tr>
                            ) : (
                                recentTrips.map(trip => {
                                    const st = statusStyle(trip.currentStatus);
                                    return (
                                        <tr key={trip.id}>
                                            <td className="db-td-bold">{trip.passengerName || '—'}</td>
                                            <td>{trip.fromLocation || '—'}</td>
                                            <td>{trip.toLocation || '—'}</td>
                                            <td className="db-td-dim">{trip.startTime ? new Date(trip.startTime).toLocaleString() : '—'}</td>
                                            <td className="db-td-dim">{trip.endTime ? new Date(trip.endTime).toLocaleString() : '—'}</td>
                                            <td>{trip.totalDistanceCorporateKm ?? trip.totalDistanceCorporate ?? '—'}</td>
                                            <td>
                                                <span className="db-status-badge" style={{ background: st.bg, color: st.color }}>
                                                    {trip.currentStatus || '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Passengers summary */}
            <div className="db-card db-card--full">
                <div className="db-card-header">
                    <h3 className="db-card-title">Passengers</h3>
                    <span className="db-badge db-badge--neutral">{passengers.length}</span>
                </div>
                <div className="db-table-wrap">
                    <table className="db-table">
                        <thead>
                            <tr>
                                <th>Name</th><th>Employee ID</th><th>Phone</th>
                                <th>Username</th><th>Trips</th><th>Last Trip</th>
                            </tr>
                        </thead>
                        <tbody>
                            {passengers.length === 0 ? (
                                <tr><td colSpan="6" className="db-table-empty">No passengers</td></tr>
                            ) : (
                                passengers.map(p => (
                                    <tr key={p.id}>
                                        <td className="db-td-bold">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                <div className="db-driver-card-avatar" style={{ width: 30, height: 30, fontSize: '0.8rem' }}>
                                                    {(p.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                {p.name || '—'}
                                            </div>
                                        </td>
                                        <td className="db-td-dim">{p.corporateId || '—'}</td>
                                        <td>{p.phoneNumber || '—'}</td>
                                        <td className="db-td-dim">{p.username || '—'}</td>
                                        <td><span className="db-badge db-badge--neutral">{p.tripCount ?? 0}</span></td>
                                        <td className="db-td-dim">
                                            {p.lastTripAt ? new Date(p.lastTripAt).toLocaleDateString() : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Nav items
───────────────────────────────────────────── */
const NAV = [
    { id: 'dashboard',  label: 'Dashboard',  icon: <FiGrid size={18} /> },
    { id: 'trips',      label: 'Trips',       icon: <FiList size={18} /> },
    { id: 'passengers', label: 'Passengers',  icon: <FiUsers size={18} /> },
];

/* ─────────────────────────────────────────────
   Root layout (sidebar + content)
───────────────────────────────────────────── */
const CompanyDashboard = ({ onLogout }) => {
    const [activePage, setActivePage] = useState(
        () => localStorage.getItem('caby_company_page') || 'dashboard'
    );
    const user = getUser();

    const navigate = (page) => {
        localStorage.setItem('caby_company_page', page);
        setActivePage(page);
    };

    const renderPage = () => {
        switch (activePage) {
            case 'trips':      return <CompanyTrips />;
            case 'passengers': return <CompanyPassengers />;
            default:           return <DashboardPage />;
        }
    };

    return (
        <div className="app-root app-root--top-nav">
            {/* ── Top nav bar (same structure as Sidebar.jsx) ── */}
            <header className="top-nav">
                <div className="top-nav-brand">
                    <span className="brand-dot" />
                    <span className="brand-name">Caby Admin</span>
                </div>

                <nav className="top-nav-tabs">
                    {NAV.map(item => (
                        <button
                            key={item.id}
                            className={`top-nav-tab ${activePage === item.id ? 'active' : ''}`}
                            onClick={() => navigate(item.id)}
                        >
                            <span className="tab-icon">{item.icon}</span>
                            <span className="tab-label">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="top-nav-user">
                    <div className="avatar" title={user?.username || 'Company Admin'}>
                        {(user?.username || 'C').charAt(0).toUpperCase()}
                    </div>
                    {user?.username && <span className="nav-username">{user.username}</span>}
                    <button className="nav-logout-btn" onClick={onLogout} title="Sign out">
                        <FiLogOut size={15} />
                        Logout
                    </button>
                </div>
            </header>

            {/* ── Main content ── */}
            <div className="main-content">
                {renderPage()}
            </div>
        </div>
    );
};

export default CompanyDashboard;
