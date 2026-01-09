import React, { useState, useEffect } from 'react';
import '../App.css'; // Reusing global styles for now, but will verify table styles

const Drivers = () => {
    const API_BASE_URL = 'http://16.170.219.54:8081/api/v1/drivers';

    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        phoneNumber: '',
        vehicleType: 'Sedan',
        vehicleNumber: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        try {
            const response = await fetch(API_BASE_URL);
            if (!response.ok) throw new Error('Failed to fetch drivers');
            const data = await response.json();
            // Ensure data is an array
            setDrivers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            // fallback to empty or show error
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        // Fallback status if API doesn't return one yet
        const displayStatus = status || 'Inactive';
        switch (displayStatus) {
            case 'Active': return { backgroundColor: '#e6f7e9', color: '#2e7d32' };
            case 'Inactive': return { backgroundColor: '#ffebee', color: '#c62828' };
            case 'On Trip': return { backgroundColor: '#e3f2fd', color: '#1565c0' };
            case 'Maintenance': return { backgroundColor: '#fff3e0', color: '#ef6c00' };
            default: return { backgroundColor: '#f5f5f5', color: '#666' };
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEdit = (driver) => {
        setIsEditMode(true);
        setEditingId(driver.id || driver._id); // Handle potential ID field names
        setFormData({
            username: driver.username || '',
            password: '', // Usually don't populate password on edit
            name: driver.name || '',
            phoneNumber: driver.phoneNumber || driver.phone || '',
            vehicleType: driver.vehicleType || 'Sedan',
            vehicleNumber: driver.vehicleNumber || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this driver?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete driver');

            setDrivers(prev => prev.filter(d => (d.id || d._id) !== id));
            alert('Driver deleted successfully');
        } catch (err) {
            alert(err.message);
        }
    };

    const openAddModal = () => {
        setIsEditMode(false);
        setEditingId(null);
        setFormData({
            username: '',
            password: '',
            name: '',
            phoneNumber: '',
            vehicleType: 'Sedan',
            vehicleNumber: ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const url = isEditMode ? `${API_BASE_URL}/${editingId}` : API_BASE_URL;
            const method = isEditMode ? 'PUT' : 'POST';

            // Clean up password if empty in edit mode (optional logic depending on backend)
            const payload = { ...formData };
            if (isEditMode && !payload.password) delete payload.password;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to ${isEditMode ? 'update' : 'create'} driver`);
            }

            // Refresh list or update local stateoptimistically
            // Ideally we re-fetch to ensure sync with server state
            fetchDrivers();

            setShowModal(false);
            alert(`Driver ${isEditMode ? 'updated' : 'created'} successfully!`);

            // Reset form for next use (though modal closes)
            setFormData({
                username: '',
                password: '',
                name: '',
                phoneNumber: '',
                vehicleType: 'Sedan',
                vehicleNumber: ''
            });

        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <h2>All Drivers</h2>
                <button className="btn-primary" onClick={openAddModal}>
                    + Add Driver
                </button>
            </header>

            <div className="table-wrapper">
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                        Loading drivers...
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Vehicle Type</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drivers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No drivers found.
                                    </td>
                                </tr>
                            ) : (
                                drivers.map((driver) => (
                                    <tr key={driver.id || driver._id}>
                                        <td>
                                            <div className="driver-name-cell">
                                                <div className="table-avatar">
                                                    {(driver.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                {driver.name}
                                            </div>
                                        </td>
                                        <td>{driver.phoneNumber || driver.phone}</td>
                                        <td>{driver.vehicleType}</td>
                                        <td>
                                            <span className="status-badge" style={getStatusStyle(driver.status)}>
                                                {driver.status || 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-icon edit"
                                                    title="Edit"
                                                    onClick={() => handleEdit(driver)}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn-icon delete"
                                                    title="Delete"
                                                    onClick={() => handleDelete(driver.id || driver._id)}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{isEditMode ? 'Edit Driver' : 'Add New Driver'}</h3>
                            <button className="close-button" onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-control"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    className="form-control"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isEditMode} // Assuming username shouldn't change
                                />
                            </div>
                            {!isEditMode && (
                                <div className="form-group">
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        className="form-control"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    className="form-control"
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Vehicle Type</label>
                                <select
                                    name="vehicleType"
                                    className="form-control"
                                    value={formData.vehicleType}
                                    onChange={handleInputChange}
                                >
                                    <option value="Sedan">Sedan</option>
                                    <option value="SUV">SUV</option>
                                    <option value="Van">Van</option>
                                    <option value="Auto">Auto</option>
                                    <option value="Bike">Bike</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Vehicle Number</label>
                                <input
                                    type="text"
                                    name="vehicleNumber"
                                    className="form-control"
                                    value={formData.vehicleNumber}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? 'Saving...' : (isEditMode ? 'Update Driver' : 'Create Driver')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Drivers;
