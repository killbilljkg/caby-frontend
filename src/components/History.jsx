import React, { useState, useEffect } from 'react';
import { FiSearch, FiEye } from 'react-icons/fi';
import '../App.css';

const History = ({ onSelectTrip }) => {
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchAudits = async () => {
            try {
                const response = await fetch('http://16.170.219.54:8081/api/v1/audits');
                if (!response.ok) {
                    throw new Error('Failed to fetch audit history');
                }
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

    // Filter audits based on search term
    const filteredAudits = audits.filter(audit => {
        const term = searchTerm.toLowerCase();
        return (
            (audit.driverId && audit.driverId.toLowerCase().includes(term)) ||
            (audit.passengerName && audit.passengerName.toLowerCase().includes(term)) ||
            (audit.fromLocation && audit.fromLocation.toLowerCase().includes(term)) ||
            (audit.toLocation && audit.toLocation.toLowerCase().includes(term))
        );
    });

    if (loading) return <div className="page-container drivers-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading history...</div>;
    if (error) return <div className="page-container drivers-page error-message">Error: {error}</div>;

    return (
        <div className="page-container drivers-page">
            <header className="page-header">
                <h2>Trip History</h2>
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
                                    No history found matching "{searchTerm}".
                                </td>
                            </tr>
                        ) : (
                            filteredAudits.map((audit) => (
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
                                        <span className="status-badge" style={{
                                            backgroundColor: audit.currentStatus === 'START' ? '#dcfce7' : '#f3f4f6',
                                            color: audit.currentStatus === 'START' ? '#166534' : '#1f2937'
                                        }}>
                                            {audit.currentStatus || 'N/A'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn-icon"
                                            onClick={() => onSelectTrip(audit.id)}
                                            title="View Details"
                                            style={{ color: '#333' }}
                                        >
                                            <FiEye />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default History;
