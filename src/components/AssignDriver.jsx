import React, { useState, useEffect } from 'react';
import '../App.css';

const AssignDriver = () => {
    const [pendingTrips, setPendingTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal & Assignment State
    const [showModal, setShowModal] = useState(false);
    const [drivers, setDrivers] = useState([]);
    const [loadingDrivers, setLoadingDrivers] = useState(false);
    const [selectedTripId, setSelectedTripId] = useState(null);
    const [assigning, setAssigning] = useState(false);

    const fetchPendingTrips = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://16.170.219.54:8081/api/v1/audits');
            if (!response.ok) {
                throw new Error('Failed to fetch trips');
            }
            const data = await response.json();
            const allTrips = Array.isArray(data) ? data : [];

            // Filter for trips with status PENDING
            const pending = allTrips.filter(item => {
                const status = item.currentStatus || (item.trip && item.trip.currentStatus);
                return status === 'PENDING';
            });

            setPendingTrips(pending);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingTrips();
    }, []);

    const handleOpenAssignModal = async (tripId) => {
        setSelectedTripId(tripId);
        setShowModal(true);
        setLoadingDrivers(true);
        try {
            // Fetch drivers to choose from
            const response = await fetch('http://16.170.219.54:8081/api/v1/drivers');
            if (!response.ok) throw new Error('Failed to fetch drivers');
            const data = await response.json();
            // Optional: Filter for Active drivers only? 
            // For now, let's show all, or maybe sort Active to top
            setDrivers(Array.isArray(data) ? data : []);
        } catch (err) {
            alert('Failed to load drivers list');
            setShowModal(false);
        } finally {
            setLoadingDrivers(false);
        }
    };

    const handleConfirmAssign = async (driverId) => {
        if (!selectedTripId || !driverId) return;

        setAssigning(true);
        try {
            const response = await fetch('http://16.170.219.54:8081/api/v1/dispatch/trips/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tripId: selectedTripId,
                    driverId: driverId
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Assignment failed');
            }

            // Success
            alert('Driver assigned successfully!');
            setShowModal(false);
            setSelectedTripId(null);

            // Refresh the pending list
            fetchPendingTrips();

        } catch (err) {
            console.error(err);
            alert(`Error: ${err.message}`);
        } finally {
            setAssigning(false);
        }
    };

    if (loading) return <div className="page-container">Loading pending trips...</div>;
    if (error) return <div className="page-container error-message">Error: {error}</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <h2>Assign Driver</h2>
            </header>
            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Trip ID</th>
                            <th>Passenger</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingTrips.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center' }}>No pending trips found.</td>
                            </tr>
                        ) : (
                            pendingTrips.map((audit) => {
                                const tripObj = audit.trip || {};
                                const id = audit.id || tripObj.id;
                                const passenger = audit.passengerName || tripObj.passengerName;
                                const from = audit.fromLocation || tripObj.fromLocation;
                                const to = audit.toLocation || tripObj.toLocation;
                                const status = audit.currentStatus || tripObj.currentStatus;

                                return (
                                    <tr key={id}>
                                        <td>{id}</td>
                                        <td>{passenger || 'N/A'}</td>
                                        <td>{from || 'N/A'}</td>
                                        <td>{to || 'N/A'}</td>
                                        <td>
                                            <span className="status-badge" style={{
                                                backgroundColor: '#fff7ed', // Orange/Yellowish
                                                color: '#c2410c'
                                            }}>
                                                {status || 'PENDING'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-primary"
                                                style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                                                onClick={() => handleOpenAssignModal(id)}
                                            >
                                                Assign
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Selection Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h3>Select Driver</h3>
                            <button className="close-button" onClick={() => setShowModal(false)}>&times;</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                            {loadingDrivers ? (
                                <p>Loading drivers...</p>
                            ) : (
                                <table className="data-table" style={{ fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Vehicle</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {drivers.map(driver => (
                                            <tr key={driver.id || driver._id}>
                                                <td>{driver.name}</td>
                                                <td>{driver.vehicleType} - {driver.vehicleNumber}</td>
                                                <td>
                                                    <span className="status-badge" style={{
                                                        fontSize: '0.75rem',
                                                        backgroundColor: driver.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                                                        color: driver.status === 'Active' ? '#166534' : '#1f2937'
                                                    }}>
                                                        {driver.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn-primary"
                                                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                                        disabled={assigning}
                                                        onClick={() => handleConfirmAssign(driver.id || driver._id)}
                                                    >
                                                        {assigning ? '...' : 'Select'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="form-actions" style={{ marginTop: 0 }}>
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignDriver;
