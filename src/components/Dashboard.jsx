import React, { useState, useEffect, useCallback } from 'react';
import { getToken } from '../services/authService';

const API_BASE = 'https://api-caby.story-labs.in';

/* ─────────────────────────────────────────────
   Mini SVG Bar Chart
───────────────────────────────────────────── */
const BarChart = ({ data = [], color = '#111', height = 160 }) => {
    if (!data.length) return <div className="db-chart-empty">No data</div>;
    const max = Math.max(...data.map(d => d.tripCount), 1);
    const barW = Math.max(18, Math.floor(560 / data.length) - 8);

    return (
        <svg viewBox={`0 0 560 ${height + 30}`} style={{ width: '100%', height: height + 30 }}>
            {data.map((d, i) => {
                const barH = Math.max(4, ((d.tripCount / max) * height));
                const x = i * (barW + 8) + 4;
                const y = height - barH;
                return (
                    <g key={d.label}>
                        <rect
                            x={x} y={y} width={barW} height={barH}
                            rx={4} fill={color} opacity={0.85}
                        />
                        {/* Value label */}
                        <text x={x + barW / 2} y={y - 5} textAnchor="middle"
                            fontSize="10" fill="#555" fontFamily="Inter,system-ui,sans-serif">
                            {d.tripCount}
                        </text>
                        {/* X-axis label */}
                        <text x={x + barW / 2} y={height + 18} textAnchor="middle"
                            fontSize="10" fill="#888" fontFamily="Inter,system-ui,sans-serif">
                            {d.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

/* ─────────────────────────────────────────────
   Mini SVG Donut Chart
───────────────────────────────────────────── */
const DonutChart = ({ slices = [], size = 140 }) => {
    const total = slices.reduce((s, x) => s + x.value, 0) || 1;
    const cx = size / 2, cy = size / 2, r = size * 0.38, ir = size * 0.24;
    let cumAngle = -Math.PI / 2;

    const arc = (startA, endA, outerR, innerR) => {
        const x1 = cx + outerR * Math.cos(startA);
        const y1 = cy + outerR * Math.sin(startA);
        const x2 = cx + outerR * Math.cos(endA);
        const y2 = cy + outerR * Math.sin(endA);
        const xi1 = cx + innerR * Math.cos(endA);
        const yi1 = cy + innerR * Math.sin(endA);
        const xi2 = cx + innerR * Math.cos(startA);
        const yi2 = cy + innerR * Math.sin(startA);
        const large = endA - startA > Math.PI ? 1 : 0;
        return `M${x1},${y1} A${outerR},${outerR} 0 ${large},1 ${x2},${y2} L${xi1},${yi1} A${innerR},${innerR} 0 ${large},0 ${xi2},${yi2} Z`;
    };

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {slices.map((s, i) => {
                const angle = (s.value / total) * 2 * Math.PI;
                const path = arc(cumAngle, cumAngle + angle, r, ir);
                cumAngle += angle;
                return <path key={i} d={path} fill={s.color} stroke="#fff" strokeWidth="2" />;
            })}
            <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="700"
                fill="#111" fontFamily="Inter,system-ui,sans-serif">
                {total}
            </text>
        </svg>
    );
};

/* ─────────────────────────────────────────────
   Sparkline (mini line chart for stat cards)
───────────────────────────────────────────── */
const Sparkline = ({ values = [], color = '#111', w = 80, h = 32 }) => {
    if (values.length < 2) return null;
    const max = Math.max(...values, 1);
    const pts = values.map((v, i) =>
        `${(i / (values.length - 1)) * w},${h - (v / max) * h}`
    ).join(' ');
    return (
        <svg width={w} height={h} style={{ display: 'block' }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
};

/* ─────────────────────────────────────────────
   Horizontal bar (status / company breakdown)
───────────────────────────────────────────── */
const HBar = ({ label, value, total, color }) => {
    const pct = total ? Math.round((value / total) * 100) : 0;
    return (
        <div className="db-hbar-row">
            <div className="db-hbar-label">
                <span>{label}</span>
                <span className="db-hbar-val">{value}</span>
            </div>
            <div className="db-hbar-track">
                <div className="db-hbar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Status badge colours (driver status)
───────────────────────────────────────────── */
const driverStatusStyle = (s) => {
    switch ((s || '').toUpperCase()) {
        case 'ACTIVE':   return { bg: '#e6f7e9', color: '#2e7d32' };
        case 'SUSPENDED': return { bg: '#ffebee', color: '#c62828' };
        case 'OFFLINE':  return { bg: '#f5f5f5', color: '#666' };
        default:          return { bg: '#f5f5f5', color: '#666' };
    }
};

/* ─────────────────────────────────────────────
   Main Dashboard component
───────────────────────────────────────────── */
const RANGE_OPTIONS = ['day', 'week', 'month', 'year'];
const STATUS_COLORS = { COMPLETED: '#2e7d32', ACCEPTED: '#1565c0', REQUESTED: '#ef6c00', CANCELLED: '#c62828' };
const COMPANY_PALETTE = ['#111', '#555', '#999', '#bbb', '#ddd'];

const Dashboard = ({ onNavigate }) => {
    const token = getToken();
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    /* ── State ── */
    const [mainData,    setMainData]    = useState(null);
    const [analytics,   setAnalytics]   = useState(null);
    const [lifecycle,   setLifecycle]   = useState(null);
    const [range,       setRange]       = useState('week');
    const [loading,     setLoading]     = useState(true);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    const [error,       setError]       = useState('');

    /* ── Fetch Main Dashboard ── */
    const fetchMain = useCallback(async () => {
        try {
            const [mainRes, lcRes] = await Promise.all([
                fetch(`${API_BASE}/api/v1/dashboard`, { headers }),
                fetch(`${API_BASE}/api/v1/dashboard/analytics/drivers`, { headers }),
            ]);
            if (!mainRes.ok) throw new Error('Failed to load dashboard');
            setMainData(await mainRes.json());
            if (lcRes.ok) setLifecycle(await lcRes.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);  // eslint-disable-line

    /* ── Fetch Trip Analytics ── */
    const fetchAnalytics = useCallback(async (r) => {
        setLoadingAnalytics(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/dashboard/analytics/trips?range=${r}`, { headers });
            if (!res.ok) throw new Error('Failed to load analytics');
            setAnalytics(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAnalytics(false);
        }
    }, []); // eslint-disable-line

    useEffect(() => { fetchMain(); }, [fetchMain]);
    useEffect(() => { fetchAnalytics(range); }, [range, fetchAnalytics]);

    /* ── Derived values ── */
    const m  = mainData?.metrics || {};
    const sb = mainData?.statusBreakdown || {};
    const cb = mainData?.companyBreakdown || {};
    const sbTotal = Object.values(sb).reduce((a, b) => a + b, 0) || 1;
    const cbTotal = Object.values(cb).reduce((a, b) => a + b, 0) || 1;

    const donutSlices = Object.entries(sb).map(([key, val], i) => ({
        label: key, value: val,
        color: STATUS_COLORS[key] || COMPANY_PALETTE[i % COMPANY_PALETTE.length],
    }));

    const lifecycleSlices = lifecycle ? [
        { label: 'Active Online', value: lifecycle.lifecycleBreakdown?.activeOnline || 0, color: '#2e7d32' },
        { label: 'Idle',          value: lifecycle.lifecycleBreakdown?.idle || 0,          color: '#1565c0' },
        { label: 'New This Week', value: lifecycle.lifecycleBreakdown?.newlyOnboardedThisWeek || 0, color: '#ef6c00' },
        { label: 'Suspended',     value: lifecycle.lifecycleBreakdown?.deactivatedOrSuspended || 0, color: '#c62828' },
    ] : [];

    /* ── Stat cards config ── */
    const statCards = [
        { label: 'Total Drivers',    value: m.totalDrivers,    sub: `${m.activeDrivers || 0} active`, icon: '🧑‍✈️', accent: '#111' },
        { label: 'Total Trips',      value: m.totalTrips,      sub: `${m.activeTrips || 0} in progress`, icon: '🛣️', accent: '#1565c0' },
        { label: 'Completed Trips',  value: m.completedTrips,  sub: `${m.pendingTrips || 0} pending`, icon: '✅', accent: '#2e7d32' },
        { label: 'Requested Trips',  value: m.requestedTrips,  sub: `of ${m.totalTrips || 0} total`, icon: '📋', accent: '#ef6c00' },
        { label: 'Companies',        value: m.totalCompanies,  sub: 'registered', icon: '🏢', accent: '#555' },
        { label: 'Fleet Distance',   value: m.totalFleetDistanceKm != null ? `${(m.totalFleetDistanceKm / 1000).toFixed(1)}k km` : '—', sub: `${(m.totalCorporateDistanceKm / 1000 || 0).toFixed(1)}k km corporate`, icon: '📏', accent: '#333' },
    ];

    /* ─── Render ─── */
    if (loading) return (
        <div className="db-loading">
            <div className="db-spinner" />
            <p>Loading dashboard…</p>
        </div>
    );

    if (error) return (
        <div className="db-error">
            <span>⚠️</span>
            <p>{error}</p>
            <button onClick={() => { setLoading(true); setError(''); fetchMain(); }}>Retry</button>
        </div>
    );

    return (
        <div className="db-root">
            {/* ── Page header ── */}
            <div className="db-page-header">
                <div>
                    <h2 className="db-page-title">Dashboard</h2>
                    <p className="db-page-sub">Overview of your fleet & trip activity</p>
                </div>
                <button className="db-refresh-btn" onClick={() => { fetchMain(); fetchAnalytics(range); }}>
                    ↻ Refresh
                </button>
            </div>

            {/* ── Stat cards ── */}
            <div className="db-stat-grid">
                {statCards.map(card => (
                    <div className="db-stat-card" key={card.label}>
                        <div className="db-stat-icon">{card.icon}</div>
                        <div className="db-stat-body">
                            <p className="db-stat-label">{card.label}</p>
                            <p className="db-stat-value" style={{ color: card.accent }}>
                                {card.value ?? '—'}
                            </p>
                            <p className="db-stat-sub">{card.sub}</p>
                        </div>
                        <Sparkline
                            values={[
                                Math.random() * 50,
                                Math.random() * 50,
                                Math.random() * 50,
                                Math.random() * 50,
                                Number(card.value) || 0,
                            ]}
                            color={card.accent}
                            w={100}
                            h={36}
                        />
                    </div>
                ))}
            </div>

            {/* ── Charts row ── */}
            <div className="db-charts-row">
                {/* Trip Volume Chart */}
                <div className="db-card db-card--wide">
                    <div className="db-card-header">
                        <h3 className="db-card-title">Trip Volume</h3>
                        <div className="db-range-tabs">
                            {RANGE_OPTIONS.map(r => (
                                <button
                                    key={r}
                                    className={`db-range-tab ${range === r ? 'active' : ''}`}
                                    onClick={() => setRange(r)}
                                >
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    {loadingAnalytics ? (
                        <div className="db-chart-placeholder"><div className="db-spinner" /></div>
                    ) : (
                        <>
                            {analytics && (
                                <p className="db-analytics-total">
                                    <strong>{analytics.totalTripsInPeriod}</strong> trips this {analytics.range}
                                </p>
                            )}
                            <div className="db-chart-wrap">
                                <BarChart data={analytics?.dataPoints || []} color="#111" height={160} />
                            </div>
                        </>
                    )}
                </div>

                {/* Status Breakdown Donut */}
                <div className="db-card">
                    <div className="db-card-header">
                        <h3 className="db-card-title">Trip Status</h3>
                    </div>
                    <div className="db-donut-wrap">
                        <DonutChart slices={donutSlices} size={140} />
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
            </div>

            {/* ── Second row ── */}
            <div className="db-charts-row db-charts-row--four">
                {/* Company Breakdown */}
                <div className="db-card">
                    <div className="db-card-header">
                        <h3 className="db-card-title">Company Breakdown</h3>
                    </div>
                    <div className="db-hbars">
                        {Object.entries(cb).map(([name, val], i) => (
                            <HBar key={name} label={name} value={val} total={cbTotal}
                                color={COMPANY_PALETTE[i % COMPANY_PALETTE.length]} />
                        ))}
                        {Object.keys(cb).length === 0 && <p className="db-empty">No data</p>}
                    </div>
                </div>

                {/* Driver Lifecycle */}
                <div className="db-card">
                    <div className="db-card-header">
                        <h3 className="db-card-title">Driver Lifecycle</h3>
                    </div>
                    {lifecycle ? (
                        <div className="db-donut-wrap">
                            <DonutChart slices={lifecycleSlices} size={140} />
                            <div className="db-donut-legend">
                                {lifecycleSlices.map(s => (
                                    <div key={s.label} className="db-legend-row">
                                        <span className="db-legend-dot" style={{ background: s.color }} />
                                        <span className="db-legend-label">{s.label}</span>
                                        <span className="db-legend-val">{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="db-empty">No lifecycle data</p>
                    )}
                </div>

                {/* Driver Status mini cards */}
                <div className="db-card">
                    <div className="db-card-header">
                        <h3 className="db-card-title">Driver Status</h3>
                    </div>
                    <div className="db-driver-status-grid">
                        {[
                            { label: 'Active',    value: m.activeDrivers,    color: '#2e7d32', bg: '#e6f7e9' },
                            { label: 'Offline',   value: m.offlineDrivers,   color: '#1565c0', bg: '#e3f2fd' },
                            { label: 'Suspended', value: m.suspendedDrivers, color: '#c62828', bg: '#ffebee' },
                            { label: 'Total',     value: m.totalDrivers,     color: '#333',    bg: '#f5f5f5' },
                        ].map(item => (
                            <div key={item.label} className="db-driver-pill" style={{ background: item.bg }}>
                                <span className="db-driver-pill-val" style={{ color: item.color }}>{item.value ?? '—'}</span>
                                <span className="db-driver-pill-label" style={{ color: item.color }}>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Drivers Preview */}
                <div className="db-card db-card--drivers-preview">
                    <div className="db-card-header">
                        <h3 className="db-card-title">Drivers</h3>
                        <button className="db-view-all-btn" onClick={() => onNavigate?.('drivers')}>
                            View All →
                        </button>
                    </div>
                    {(mainData?.drivers || []).length === 0 ? (
                        <p className="db-empty">No drivers</p>
                    ) : (() => {
                        const first = mainData.drivers[0];
                        const rest  = mainData.drivers.length - 1;
                        const st    = driverStatusStyle(first.status);
                        return (
                            <div className="db-driver-preview">
                                <div className="db-driver-preview-row">
                                    <div className="db-driver-card-avatar">
                                        {(first.name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="db-driver-preview-info">
                                        <p className="db-driver-card-name">{first.name || first.username}</p>
                                        <p className="db-driver-card-meta">{first.vehicleType} · {first.vehicleNumber || 'N/A'}</p>
                                    </div>
                                    <span className="db-status-badge" style={{ background: st.bg, color: st.color }}>
                                        {first.status || 'N/A'}
                                    </span>
                                </div>
                                {rest > 0 && (
                                    <button
                                        className="db-more-drivers-btn"
                                        onClick={() => onNavigate?.('drivers')}
                                    >
                                        +{rest} more driver{rest !== 1 ? 's' : ''}
                                    </button>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* ── Recent Trips Table ── */}
            <div className="db-card db-card--full">
                <div className="db-card-header">
                    <h3 className="db-card-title">Recent Trips</h3>
                    <span className="db-badge db-badge--neutral">{(mainData?.recentTrips || []).length} trips</span>
                </div>
                <div className="db-table-wrap">
                    <table className="db-table">
                        <thead>
                            <tr>
                                <th>Passenger</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Dist (km)</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(mainData?.recentTrips || []).length === 0 ? (
                                <tr><td colSpan="7" className="db-table-empty">No recent trips</td></tr>
                            ) : (
                                (mainData?.recentTrips || []).map(trip => {
                                    const s = driverStatusStyle(trip.currentStatus);
                                    return (
                                        <tr key={trip.id}>
                                            <td className="db-td-bold">{trip.passengerName || '—'}</td>
                                            <td>{trip.fromLocation || '—'}</td>
                                            <td>{trip.toLocation || '—'}</td>
                                            <td className="db-td-dim">{trip.startTime ? new Date(trip.startTime).toLocaleString() : '—'}</td>
                                            <td className="db-td-dim">{trip.endTime ? new Date(trip.endTime).toLocaleString() : '—'}</td>
                                            <td>{trip.totalDistanceCorporate ?? trip.totalDistanceOwner ?? '—'}</td>
                                            <td>
                                                <span className="db-status-badge" style={{ background: s.bg, color: s.color }}>
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

            {/* ── Active Trips Table ── */}
            {(mainData?.activeTrips || []).length > 0 && (
                <div className="db-card db-card--full">
                    <div className="db-card-header">
                        <h3 className="db-card-title">Active Trips</h3>
                        <span className="db-badge db-badge--green">{(mainData?.activeTrips || []).length} live</span>
                    </div>
                    <div className="db-table-wrap">
                        <table className="db-table">
                            <thead>
                                <tr>
                                    <th>Passenger</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Start</th>
                                    <th>Dist (km)</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(mainData?.activeTrips || []).map(trip => {
                                    const s = driverStatusStyle(trip.currentStatus);
                                    return (
                                        <tr key={trip.id}>
                                            <td className="db-td-bold">{trip.passengerName || '—'}</td>
                                            <td>{trip.fromLocation || '—'}</td>
                                            <td>{trip.toLocation || '—'}</td>
                                            <td className="db-td-dim">{trip.startTime ? new Date(trip.startTime).toLocaleString() : '—'}</td>
                                            <td>{trip.totalDistanceCorporate ?? trip.totalDistanceOwner ?? '—'}</td>
                                            <td>
                                                <span className="db-status-badge" style={{ background: s.bg, color: s.color }}>
                                                    {trip.currentStatus || '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Dashboard;
