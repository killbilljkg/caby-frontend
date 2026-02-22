
import React, { useState, useEffect } from 'react';
import { FiUserPlus, FiCheck, FiX, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
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
    const [driverSearchTerm, setDriverSearchTerm] = useState('');

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
        setDriverSearchTerm(''); // Reset search
        try {
            // Fetch drivers to choose from
            const response = await fetch('http://16.170.219.54:8081/api/v1/drivers');
            if (!response.ok) throw new Error('Failed to fetch drivers');
            const data = await response.json();
            // Optional: Filter for Active drivers only? 
            // For now, let's show all, or maybe sort Active to top
            setDrivers(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error('Failed to load drivers list');
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
            toast.success('Driver assigned successfully!');
            setShowModal(false);
            setSelectedTripId(null);

            // Refresh the pending list
            fetchPendingTrips();

        } catch (err) {
            console.error(err);
            toast.error(`Error: ${err.message} `);
        } finally {
            setAssigning(false);
        }
    };

    // Filter drivers for modal
    const filteredDrivers = drivers.filter(driver =>
        (driver.name && driver.name.toLowerCase().includes(driverSearchTerm.toLowerCase())) ||
        (driver.vehicleNumber && driver.vehicleNumber.toLowerCase().includes(driverSearchTerm.toLowerCase()))
    );

    if (loading) return <div className="page-container drivers-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading pending trips...</div>;
    if (error) return <div className="page-container drivers-page error-message">Error: {error}</div>;

    return (
        <div className="page-container drivers-page">
            <header className="page-header">
                <h2>Assign Driver</h2>
            </header>

            <div className="table-wrapper" style={{ background: 'transparent', border: 'none' }}>
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
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', background: '#ffffff', borderRadius: '8px' }}>
                                    No pending trips found.
                                </td>
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
                                        <td style={{ fontWeight: '500' }}>#{id ? id.toString().slice(-6) : 'N/A'}</td>
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
                                                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                onClick={() => handleOpenAssignModal(id)}
                                                title="Assign Driver"
                                            >
                                                <FiUserPlus /> Assign
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
                            <button className="close-button" onClick={() => setShowModal(false)}><FiX /></button>
                        </div>

                        {/* Search in Modal */}
                        <div className="search-container" style={{ marginBottom: '1rem' }}>
                            <span className="search-icon" style={{ left: '15px' }}>🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                                placeholder="Search driver by name or vehicle..."
                                value={driverSearchTerm}
                                onChange={(e) => setDriverSearchTerm(e.target.value)}
                            />
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                            {loadingDrivers ? (
                                <p style={{ textAlign: 'center', padding: '1rem' }}>Loading drivers...</p>
                            ) : (
                                <table className="data-table" style={{ fontSize: '0.9rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 1 }}>
                                        {/* Note: In modal we might want dark or light? 
                                            If drivers-page class spans, modal might be white. 
                                            Let's check styling. Modal content usually has own BG. 
                                            If modal is dark, we need dark table. 
                                            Let's assume modal follows app theme or its own override. 
                                        */}
                                        <tr>
                                            <th>Name</th>
                                            <th>Vehicle</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="modal-table-body">
                                        {filteredDrivers.map(driver => (
                                            <tr key={driver.id || driver._id} style={{ background: 'transparent', borderBottom: '1px solid #eee' }}>
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
                                                        className="btn-icon"
                                                        style={{ color: '#4caf50' }}
                                                        onClick={() => handleConfirmAssign(driver.id || driver._id)}
                                                        disabled={assigning}
                                                        title="Select"
                                                    >
                                                        <FiCheck size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {!loadingDrivers && filteredDrivers.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>No drivers found.</p>
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
