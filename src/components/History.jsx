import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FiSearch, FiEye, FiChevronDown, FiCheck, FiX, FiFileText } from 'react-icons/fi';
import { getToken } from '../services/authService';
import '../App.css';

const API_BASE = 'https://api-caby.story-labs.in';

/* Status colour map */
const STATUS_STYLES = {
    COMPLETED: { bg: '#dcfce7', color: '#166534' },
    END:       { bg: '#dcfce7', color: '#166534' },
    ACCEPTED:  { bg: '#e3f2fd', color: '#1565c0' },
    REQUESTED: { bg: '#fff7ed', color: '#c2410c' },
    CANCELLED: { bg: '#ffebee', color: '#c62828' },
    START:     { bg: '#f3e5f5', color: '#6a1b9a' },
    PICKUP:    { bg: '#e3f2fd', color: '#1565c0' },
    DROPOFF:   { bg: '#e3f2fd', color: '#1565c0' },
};
const statusStyle = (s) => STATUS_STYLES[(s || '').toUpperCase()] || { bg: '#f3f4f6', color: '#1f2937' };

const isViewable = (status) => ['END', 'COMPLETED'].includes((status || '').toUpperCase());

const fmt = (n) => n != null ? `₹${Number(n).toFixed(2)}` : '—';

/* ─── Bill Modal ─── */
const BillModal = ({ tripId, audit, onClose }) => {
    const [bill,    setBill]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        const token = getToken();
        fetch(`${API_BASE}/api/v1/audits/${tripId}/bill`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then(async res => {
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.message || `Error ${res.status}`);
                }
                return res.json();
            })
            .then(setBill)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [tripId]);

    const st = statusStyle(audit?.currentStatus);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                style={{ maxWidth: 480, width: '95vw' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header" style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <FiFileText size={18} style={{ color: '#111' }} />
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Trip Bill</h3>
                    </div>
                    <button className="close-button" onClick={onClose}><FiX /></button>
                </div>

                {/* Trip summary strip */}
                {audit && (
                    <div style={{
                        background: '#f8f9fa', borderRadius: 10, padding: '0.75rem 1rem',
                        margin: '0.85rem 0', display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.92rem', color: '#111' }}>
                                {audit.passengerName || 'Passenger'}
                            </span>
                            <span className="status-badge" style={{ backgroundColor: st.bg, color: st.color, fontSize: '0.73rem' }}>
                                {audit.currentStatus}
                            </span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#888' }}>
                            {audit.fromLocation || '—'} → {audit.toLocation || '—'}
                        </span>
                    </div>
                )}

                {/* Bill body */}
                {loading && (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
                        Loading bill…
                    </div>
                )}

                {error && (
                    <div className="error-message" style={{ margin: '0.5rem 0' }}>
                        {error}
                    </div>
                )}

                {bill && !loading && !error && (
                    <div className="bill-body">
                        {/* Breakdown */}
                        {bill.breakdown && Object.keys(bill.breakdown).length > 0 && (
                            <div className="bill-breakdown">
                                <p className="bill-section-label">Breakdown</p>
                                {Object.entries(bill.breakdown).map(([key, value]) => (
                                    <div key={key} className="bill-line">
                                        <span className="bill-line-label">
                                            {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                        </span>
                                        <span className="bill-line-value">{fmt(value)}</span>
                                    </div>
                                ))}
                                <div className="bill-divider" />
                            </div>
                        )}

                        {/* Total */}
                        <div className="bill-total-row">
                            <span>Total Amount</span>
                            <span className="bill-total-value">{fmt(bill.totalAmount)}</span>
                        </div>

                        {/* Generated at */}
                        {bill.generatedAt && (
                            <p className="bill-generated-at">
                                Generated: {new Date(bill.generatedAt).toLocaleString()}
                            </p>
                        )}
                    </div>
                )}

                <div className="form-actions" style={{ marginTop: '0.75rem' }}>
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

/* ─── Main History component ─── */
const History = ({ onSelectTrip }) => {
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    /* ── Multi-select status filter ── */
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    /* ── Bill modal ── */
    const [billAudit, setBillAudit] = useState(null); // the audit row whose bill is shown

    useEffect(() => {
        const fetchAudits = async () => {
            try {
                const token = getToken();
                const response = await fetch(`${API_BASE}/api/v1/audits`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!response.ok) throw new Error('Failed to fetch audit history');
                const data = await response.json();
                setAudits(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAudits();
    }, []);

    /* Close dropdown when clicking outside */
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* Unique statuses from data */
    const allStatuses = useMemo(() => {
        const set = new Set(audits.map(a => (a.currentStatus || '').toUpperCase()).filter(Boolean));
        return [...set].sort();
    }, [audits]);

    const toggleStatus = (status) => {
        setSelectedStatuses(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };
    const clearStatuses = () => setSelectedStatuses([]);

    /* Combined filter */
    const filteredAudits = audits.filter(audit => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = !term || (
            (audit.driverId    && audit.driverId.toLowerCase().includes(term))    ||
            (audit.driverName  && audit.driverName.toLowerCase().includes(term))  ||
            (audit.passengerName && audit.passengerName.toLowerCase().includes(term)) ||
            (audit.fromLocation  && audit.fromLocation.toLowerCase().includes(term))  ||
            (audit.toLocation    && audit.toLocation.toLowerCase().includes(term))
        );
        const matchesStatus = selectedStatuses.length === 0 ||
            selectedStatuses.includes((audit.currentStatus || '').toUpperCase());
        return matchesSearch && matchesStatus;
    });

    if (loading) return (
        <div className="page-container drivers-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Loading history...
        </div>
    );
    if (error) return (
        <div className="page-container drivers-page error-message">Error: {error}</div>
    );

    const filterLabel = selectedStatuses.length === 0
        ? 'All Statuses'
        : selectedStatuses.length === 1
            ? selectedStatuses[0]
            : `${selectedStatuses.length} selected`;

    return (
        <div className="page-container drivers-page">
            <header className="page-header">
                <h2>Trip History</h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>

                    {/* Multi-select status filter */}
                    <div className="hist-filter-wrap" ref={dropdownRef}>
                        <button
                            className="hist-filter-btn"
                            onClick={() => setDropdownOpen(o => !o)}
                            title="Filter by status"
                        >
                            <span className="hist-filter-label">{filterLabel}</span>
                            <FiChevronDown
                                size={14}
                                style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            />
                            {selectedStatuses.length > 0 && (
                                <span className="hist-filter-badge">{selectedStatuses.length}</span>
                            )}
                        </button>

                        {dropdownOpen && (
                            <div className="hist-filter-dropdown">
                                {allStatuses.length === 0 && (
                                    <p className="hist-filter-empty">No statuses available</p>
                                )}
                                {allStatuses.map(status => {
                                    const st = statusStyle(status);
                                    const checked = selectedStatuses.includes(status);
                                    return (
                                        <div
                                            key={status}
                                            className={`hist-filter-option ${checked ? 'hist-filter-option--active' : ''}`}
                                            onClick={() => toggleStatus(status)}
                                        >
                                            <span
                                                className="hist-filter-check"
                                                style={{ background: checked ? '#111' : 'transparent', borderColor: checked ? '#111' : '#ccc' }}
                                            >
                                                {checked && <FiCheck size={10} color="#fff" />}
                                            </span>
                                            <span className="hist-filter-dot" style={{ background: st.color }} />
                                            <span className="hist-filter-text">{status}</span>
                                        </div>
                                    );
                                })}
                                {selectedStatuses.length > 0 && (
                                    <button className="hist-filter-clear" onClick={clearStatuses}>
                                        Clear filter
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Search */}
                    <div className="search-container">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search history..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div className="table-wrapper" style={{ background: 'transparent', border: 'none' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Driver Name</th>
                            <th>Passenger</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAudits.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', background: '#ffffff', borderRadius: '8px' }}>
                                    No history found{searchTerm ? ` matching "${searchTerm}"` : ''}{selectedStatuses.length > 0 ? ` with status: ${selectedStatuses.join(', ')}` : ''}.
                                </td>
                            </tr>
                        ) : (
                            filteredAudits.map((audit) => {
                                const st = statusStyle(audit.currentStatus);
                                const canView = isViewable(audit.currentStatus);
                                return (
                                    <tr key={audit.id} className="history-row">
                                        <td>
                                            <div style={{ fontWeight: '500', color: '#333' }}>
                                                {audit.driverName || (audit.driverId ? `…${audit.driverId.slice(-8)}` : 'N/A')}
                                            </div>
                                        </td>
                                        <td>{audit.passengerName || 'N/A'}</td>
                                        <td>{audit.fromLocation || 'N/A'}</td>
                                        <td>{audit.toLocation || 'N/A'}</td>
                                        <td>
                                            <span className="status-badge" style={{ backgroundColor: st.bg, color: st.color }}>
                                                {audit.currentStatus || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                {/* 👁 View trip detail */}
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => canView && onSelectTrip(audit.id)}
                                                    title={canView ? 'View Trip Detail' : 'Only available for completed trips'}
                                                    disabled={!canView}
                                                    style={{
                                                        color: canView ? '#333' : '#ccc',
                                                        cursor: canView ? 'pointer' : 'not-allowed',
                                                    }}
                                                >
                                                    <FiEye />
                                                </button>
                                                {/* 🧾 View bill */}
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => canView && setBillAudit(audit)}
                                                    title={canView ? 'View Bill' : 'Only available for completed trips'}
                                                    disabled={!canView}
                                                    style={{
                                                        color: canView ? '#1565c0' : '#ccc',
                                                        cursor: canView ? 'pointer' : 'not-allowed',
                                                    }}
                                                >
                                                    <FiFileText />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Bill Modal ── */}
            {billAudit && (
                <BillModal
                    tripId={billAudit.id}
                    audit={billAudit}
                    onClose={() => setBillAudit(null)}
                />
            )}
        </div>
    );
};

export default History;
