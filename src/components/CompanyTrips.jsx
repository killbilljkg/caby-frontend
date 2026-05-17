import React, { useState, useEffect, useCallback } from 'react';
import { FiEye, FiArrowLeft, FiChevronLeft, FiChevronRight, FiFilter, FiX } from 'react-icons/fi';
import { getToken } from '../services/authService';
import '../App.css';

const API_BASE = 'https://api-caby.story-labs.in';

const STATUS_STYLES = {
    COMPLETED:  { bg: '#e6f7e9', color: '#2e7d32' },
    PICKUP:     { bg: '#e3f2fd', color: '#1565c0' },
    DROPOFF:    { bg: '#e3f2fd', color: '#1565c0' },
    REQUESTED:  { bg: '#fff7ed', color: '#c2410c' },
    ACCEPTED:   { bg: '#e3f2fd', color: '#1565c0' },
    CANCELLED:  { bg: '#ffebee', color: '#c62828' },
    START:      { bg: '#f3e5f5', color: '#6a1b9a' },
    END:        { bg: '#e6f7e9', color: '#2e7d32' },
};
const statusStyle = (s) => STATUS_STYLES[(s || '').toUpperCase()] || { bg: '#f5f5f5', color: '#666' };

const ALL_STATUSES = ['COMPLETED', 'REQUESTED', 'ACCEPTED', 'PICKUP', 'DROPOFF', 'CANCELLED'];

const fmt = (dt) => dt ? new Date(dt).toLocaleString() : '—';
const fmtDate = (dt) => dt ? new Date(dt).toLocaleDateString() : '—';

/* ─────────────────── Milestone timeline ─────────────────── */
const MilestoneTimeline = ({ milestones = [] }) => (
    <div className="ct-timeline">
        {milestones.map((m, i) => {
            const st = statusStyle(m.eventType);
            return (
                <div key={i} className={`ct-milestone ${i < milestones.length - 1 ? 'ct-milestone--line' : ''}`}>
                    <div className="ct-milestone-dot" style={{ background: st.color }} />
                    <div className="ct-milestone-body">
                        <div className="ct-milestone-header">
                            <span className="ct-milestone-event" style={{ background: st.bg, color: st.color }}>
                                {m.eventType}
                            </span>
                            <span className="ct-milestone-time">{fmt(m.timestamp)}</span>
                        </div>
                        <div className="ct-milestone-meta">
                            <span>📍 {m.latitude?.toFixed(4)}, {m.longitude?.toFixed(4)}</span>
                            {m.odometer != null && <span>🛣 {m.odometer} km</span>}
                            <span style={{ color: m.geofenceValid ? '#2e7d32' : '#c62828' }}>
                                {m.geofenceValid ? '✔ Geofence OK' : '✘ Outside geofence'}
                            </span>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
);

/* ─────────────────── Trip Detail panel ─────────────────── */
const TripDetail = ({ tripId, onBack }) => {
    const headers = { 'Authorization': `Bearer ${getToken()}` };
    const [trip,    setTrip]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        setLoading(true);
        fetch(`${API_BASE}/api/v1/company/trips/${tripId}`, { headers })
            .then(r => { if (!r.ok) throw new Error('Trip not found'); return r.json(); })
            .then(setTrip)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [tripId]); // eslint-disable-line

    if (loading) return (
        <div className="page-container drivers-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#888' }}>Loading trip details…</div>
        </div>
    );
    if (error) return (
        <div className="page-container drivers-page">
            <div className="error-message">{error}</div>
            <button className="btn-secondary" onClick={onBack} style={{ marginTop: '1rem' }}>← Back</button>
        </div>
    );

    const st = statusStyle(trip.currentStatus);

    return (
        <div className="page-container drivers-page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn-icon" onClick={onBack} title="Back to trips" style={{ color: '#333' }}>
                        <FiArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 style={{ margin: 0 }}>Trip Detail</h2>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#888' }}>#{trip.id?.slice(-8)}</p>
                    </div>
                </div>
                <span className="status-badge" style={{ background: st.bg, color: st.color, fontSize: '0.85rem', padding: '6px 14px' }}>
                    {trip.currentStatus}
                </span>
            </header>

            {/* Info cards */}
            <div className="ct-info-grid">
                <div className="ct-info-card">
                    <p className="ct-info-label">Passenger</p>
                    <p className="ct-info-value">{trip.passengerName || '—'}</p>
                    <p className="ct-info-sub">{trip.passengerPhoneNumber || ''}</p>
                </div>
                <div className="ct-info-card">
                    <p className="ct-info-label">Driver ID</p>
                    <p className="ct-info-value" style={{ fontSize: '0.82rem', wordBreak: 'break-all' }}>{trip.driverId || '—'}</p>
                </div>
                <div className="ct-info-card">
                    <p className="ct-info-label">From</p>
                    <p className="ct-info-value">{trip.fromLocation || '—'}</p>
                    <p className="ct-info-sub">{trip.pickupLat?.toFixed(4)}, {trip.pickupLng?.toFixed(4)}</p>
                </div>
                <div className="ct-info-card">
                    <p className="ct-info-label">To</p>
                    <p className="ct-info-value">{trip.toLocation || '—'}</p>
                    <p className="ct-info-sub">{trip.dropoffLat?.toFixed(4)}, {trip.dropoffLng?.toFixed(4)}</p>
                </div>
                <div className="ct-info-card">
                    <p className="ct-info-label">Start Time</p>
                    <p className="ct-info-value">{fmt(trip.startTime)}</p>
                </div>
                <div className="ct-info-card">
                    <p className="ct-info-label">End Time</p>
                    <p className="ct-info-value">{fmt(trip.endTime)}</p>
                </div>
                <div className="ct-info-card">
                    <p className="ct-info-label">Corporate Distance</p>
                    <p className="ct-info-value">{trip.corporateDistanceKm ?? '—'} km</p>
                </div>
                <div className="ct-info-card">
                    <p className="ct-info-label">Owner Distance</p>
                    <p className="ct-info-value">{trip.ownerDistanceKm ?? '—'} km</p>
                </div>
            </div>

            {/* Milestones */}
            <div className="table-wrapper" style={{ background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', border: '1px solid #e8e8e8' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#111' }}>
                    Milestone Audit Trail
                    <span style={{ marginLeft: 8, fontSize: '0.78rem', fontWeight: 500, color: '#888' }}>
                        ({(trip.milestones || []).length} events)
                    </span>
                </h3>
                {(trip.milestones || []).length === 0 ? (
                    <p style={{ color: '#bbb', fontSize: '0.88rem' }}>No milestones recorded</p>
                ) : (
                    <MilestoneTimeline milestones={trip.milestones} />
                )}
            </div>
        </div>
    );
};

/* ─────────────────── Main list component ─────────────────── */
const CompanyTrips = () => {
    const headers = { 'Authorization': `Bearer ${getToken()}` };

    /* Pagination */
    const [page,         setPage]         = useState(0);
    const [pageSize]                       = useState(20);
    const [totalPages,   setTotalPages]   = useState(1);
    const [totalElements,setTotalElements]= useState(0);

    /* Data */
    const [trips,    setTrips]    = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState('');

    /* Filters */
    const [showFilters,  setShowFilters]  = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [fromDate,     setFromDate]     = useState('');
    const [toDate,       setToDate]       = useState('');
    const [applied,      setApplied]      = useState({}); // filters currently in use

    /* Detail view */
    const [selectedTripId, setSelectedTripId] = useState(null);

    /* ── Fetch ── */
    const fetchTrips = useCallback(async (pg = 0, filters = {}) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: pg, size: pageSize });
            if (filters.status) params.set('status', filters.status);
            if (filters.from)   params.set('from',   filters.from + 'T00:00:00');
            if (filters.to)     params.set('to',     filters.to   + 'T23:59:59');

            const res = await fetch(`${API_BASE}/api/v1/company/trips?${params}`, { headers });
            if (!res.ok) throw new Error('Failed to fetch trips');
            const data = await res.json();

            setTrips(data.content || []);
            setTotalPages(data.totalPages || 1);
            setTotalElements(data.totalElements || 0);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [pageSize]); // eslint-disable-line

    useEffect(() => { fetchTrips(0, {}); }, [fetchTrips]);

    const applyFilters = () => {
        const f = { status: statusFilter, from: fromDate, to: toDate };
        setApplied(f);
        setPage(0);
        setShowFilters(false);
        fetchTrips(0, f);
    };

    const clearFilters = () => {
        setStatusFilter(''); setFromDate(''); setToDate('');
        setApplied({});
        setPage(0);
        fetchTrips(0, {});
    };

    const goToPage = (pg) => {
        setPage(pg);
        fetchTrips(pg, applied);
    };

    const activeFilterCount = [applied.status, applied.from, applied.to].filter(Boolean).length;

    /* ── Detail view ── */
    if (selectedTripId) {
        return <TripDetail tripId={selectedTripId} onBack={() => setSelectedTripId(null)} />;
    }

    /* ── List view ── */
    return (
        <div className="page-container drivers-page">
            <header className="page-header">
                <h2>Trips</h2>
                <div className="actions-header">
                    {activeFilterCount > 0 && (
                        <button className="btn-secondary" onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FiX size={14} /> Clear filters ({activeFilterCount})
                        </button>
                    )}
                    <button
                        className={activeFilterCount > 0 ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setShowFilters(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <FiFilter size={14} />
                        Filter
                        {activeFilterCount > 0 && ` (${activeFilterCount})`}
                    </button>
                </div>
            </header>

            {/* ── Filter panel ── */}
            {showFilters && (
                <div className="ct-filter-panel">
                    <div className="ct-filter-row">
                        <div className="form-group" style={{ margin: 0, flex: 1 }}>
                            <label>Status</label>
                            <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <option value="">All statuses</option>
                                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ margin: 0, flex: 1 }}>
                            <label>From date</label>
                            <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin: 0, flex: 1 }}>
                            <label>To date</label>
                            <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                            <button className="btn-primary" onClick={applyFilters}>Apply</button>
                            <button className="btn-secondary" onClick={() => setShowFilters(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Active filter chips ── */}
            {activeFilterCount > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '-0.25rem' }}>
                    {applied.status && (
                        <span className="ct-chip">
                            Status: {applied.status}
                        </span>
                    )}
                    {applied.from && <span className="ct-chip">From: {applied.from}</span>}
                    {applied.to   && <span className="ct-chip">To: {applied.to}</span>}
                </div>
            )}

            {/* ── Table ── */}
            <div className="table-wrapper" style={{ background: 'transparent', border: 'none' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading trips…</div>
                ) : error ? (
                    <div className="error-message">{error}</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Passenger</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Distance (km)</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trips.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No trips found{activeFilterCount > 0 ? ' for the selected filters' : ''}.
                                    </td>
                                </tr>
                            ) : (
                                trips.map(trip => {
                                    const st = statusStyle(trip.currentStatus);
                                    return (
                                        <tr key={trip.id}>
                                            <td>
                                                <div className="driver-name-cell">
                                                    <div className="table-avatar">
                                                        {(trip.passengerName || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{trip.passengerName || '—'}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{trip.passengerPhoneNumber || ''}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{trip.fromLocation || '—'}</td>
                                            <td>{trip.toLocation || '—'}</td>
                                            <td style={{ fontSize: '0.83rem', color: '#666' }}>{fmt(trip.startTime)}</td>
                                            <td style={{ fontSize: '0.83rem', color: '#666' }}>{fmt(trip.endTime)}</td>
                                            <td>{trip.corporateDistanceKm ?? '—'}</td>
                                            <td>
                                                <span className="status-badge" style={{ background: st.bg, color: st.color }}>
                                                    {trip.currentStatus || '—'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-icon"
                                                    title="View Details"
                                                    style={{ color: '#333' }}
                                                    onClick={() => setSelectedTripId(trip.id)}
                                                >
                                                    <FiEye />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Pagination ── */}
            {!loading && !error && totalPages > 1 && (
                <div className="ct-pagination">
                    <span className="ct-pagination-info">
                        {totalElements} trips · Page {page + 1} of {totalPages}
                    </span>
                    <div className="ct-pagination-btns">
                        <button
                            className="ct-page-btn"
                            disabled={page === 0}
                            onClick={() => goToPage(page - 1)}
                        >
                            <FiChevronLeft size={16} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i)
                            .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 2)
                            .reduce((acc, i, idx, arr) => {
                                if (idx > 0 && i - arr[idx - 1] > 1) acc.push('…');
                                acc.push(i);
                                return acc;
                            }, [])
                            .map((item, idx) =>
                                item === '…' ? (
                                    <span key={`ellipsis-${idx}`} className="ct-page-ellipsis">…</span>
                                ) : (
                                    <button
                                        key={item}
                                        className={`ct-page-btn ${item === page ? 'ct-page-btn--active' : ''}`}
                                        onClick={() => goToPage(item)}
                                    >
                                        {item + 1}
                                    </button>
                                )
                            )
                        }
                        <button
                            className="ct-page-btn"
                            disabled={page >= totalPages - 1}
                            onClick={() => goToPage(page + 1)}
                        >
                            <FiChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyTrips;
