import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FiSearch, FiEye, FiChevronDown, FiCheck } from 'react-icons/fi';
import '../App.css';

/* Status colour map */
const STATUS_STYLES = {
    COMPLETED:  { bg: '#dcfce7', color: '#166534' },
    ACCEPTED:   { bg: '#e3f2fd', color: '#1565c0' },
    REQUESTED:  { bg: '#fff7ed', color: '#c2410c' },
    CANCELLED:  { bg: '#ffebee', color: '#c62828' },
    START:      { bg: '#dcfce7', color: '#166534' },
};
const statusStyle = (s) => STATUS_STYLES[(s || '').toUpperCase()] || { bg: '#f3f4f6', color: '#1f2937' };

const History = ({ onSelectTrip }) => {
    const [audits,     setAudits]     = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    /* ── Multi-select status filter ── */
    const [selectedStatuses, setSelectedStatuses] = useState([]); // [] = all
    const [dropdownOpen,     setDropdownOpen]     = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const fetchAudits = async () => {
            try {
                const response = await fetch('https://api-caby.story-labs.in/api/v1/audits');
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

    /* Unique statuses derived from fetched data */
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

    /* Combined filter: search term + selected statuses */
    const filteredAudits = audits.filter(audit => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = !term || (
            (audit.driverId      && audit.driverId.toLowerCase().includes(term))      ||
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

                    {/* Multi-select status filter — left of search */}
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
                                            <span
                                                className="hist-filter-dot"
                                                style={{ background: st.color }}
                                            />
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
                            <th>Driver ID</th>
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
                                return (
                                    <tr key={audit.id} className="history-row">
                                        <td>
                                            <div style={{ fontWeight: '500', color: '#333' }}>
                                                {audit.driverId || 'N/A'}
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
                                            <button
                                                className="btn-icon"
                                                onClick={() => onSelectTrip(audit.id)}
                                                title={audit.currentStatus === 'COMPLETED' ? 'View Details' : 'Only available for completed trips'}
                                                disabled={(audit.currentStatus || '').toUpperCase() !== 'COMPLETED'}
                                                style={{
                                                    color: (audit.currentStatus || '').toUpperCase() === 'COMPLETED' ? '#333' : '#ccc',
                                                    cursor: (audit.currentStatus || '').toUpperCase() === 'COMPLETED' ? 'pointer' : 'not-allowed',
                                                }}
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
            </div>
        </div>
    );
};

export default History;
