import React, { useState, useEffect } from 'react';
import '../App.css';

const History = ({ onSelectTrip }) => {
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    if (loading) return <div className="page-container">Loading history...</div>;
    if (error) return <div className="page-container error-message">Error: {error}</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <h2>Trip History</h2>
            </header>
            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Driver ID</th>
                            <th>Passenger Name</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {audits.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center' }}>No history found.</td>
                            </tr>
                        ) : (
                            audits.map((audit) => (
                                <tr
                                    key={audit.id}
                                    onClick={() => onSelectTrip(audit.id)}
                                    style={{ cursor: 'pointer' }}
                                    className="history-row"
                                >
                                    <td>
                                        <div className="driver-name-cell">
                                            {audit.driverId}
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
