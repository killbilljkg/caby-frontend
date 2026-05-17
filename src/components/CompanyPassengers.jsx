import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getToken } from '../services/authService';
import '../App.css';

const API_URL = 'https://api-caby.story-labs.in/api/v1/company/passengers';

const EMPTY_FORM = {
    username: '',
    password: '',
    name: '',
    phoneNumber: '',
    corporateId: '',
};

const CompanyPassengers = () => {
    const readHeaders  = { 'Authorization': `Bearer ${getToken()}` };
    const writeHeaders = { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };

    const [passengers,  setPassengers]  = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [searchTerm,  setSearchTerm]  = useState('');

    const [showModal,   setShowModal]   = useState(false);
    const [isEditMode,  setIsEditMode]  = useState(false);
    const [editingId,   setEditingId]   = useState(null);
    const [formData,    setFormData]    = useState(EMPTY_FORM);
    const [submitting,  setSubmitting]  = useState(false);
    const [formError,   setFormError]   = useState('');

    useEffect(() => { fetchPassengers(); }, []);

    /* ── Fetch ── */
    const fetchPassengers = async () => {
        setLoading(true);
        try {
            const res = await fetch(API_URL, { headers: readHeaders });
            if (!res.ok) throw new Error('Failed to fetch passengers');
            const data = await res.json();
            setPassengers(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    /* ── Filter ── */
    const filtered = passengers.filter(p =>
        (p.name        && p.name.toLowerCase().includes(searchTerm.toLowerCase()))   ||
        (p.username    && p.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.phoneNumber && p.phoneNumber.includes(searchTerm))                         ||
        (p.corporateId && p.corporateId.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    /* ── Form helpers ── */
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openAddModal = () => {
        setIsEditMode(false);
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setFormError('');
        setShowModal(true);
    };

    const handleEdit = (p) => {
        setIsEditMode(true);
        setEditingId(p.id);
        setFormData({
            username:    p.username    || '',
            password:    '',           // never pre-fill password
            name:        p.name        || '',
            phoneNumber: p.phoneNumber || '',
            corporateId: p.corporateId || '',
        });
        setFormError('');
        setShowModal(true);
    };

    /* ── Submit (Create / Update) ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError('');

        try {
            const url    = isEditMode ? `${API_URL}/${editingId}` : API_URL;
            const method = isEditMode ? 'PUT' : 'POST';

            const payload = { ...formData };
            // Password is optional on edit — only send if filled in
            if (isEditMode && !payload.password) delete payload.password;

            const res = await fetch(url, {
                method,
                headers: writeHeaders,
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `Failed to ${isEditMode ? 'update' : 'create'} passenger`);
            }

            toast.success(`Passenger ${isEditMode ? 'updated' : 'created'} successfully!`);
            setShowModal(false);
            fetchPassengers();
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Delete (soft) ── */
    const handleDelete = async (id) => {
        if (!window.confirm('Delete this passenger? This action cannot be undone.')) return;
        try {
            const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: readHeaders });
            if (!res.ok && res.status !== 204) throw new Error('Failed to delete passenger');
            setPassengers(prev => prev.filter(p => p.id !== id));
            toast.success('Passenger deleted');
        } catch (err) {
            toast.error(err.message);
        }
    };

    /* ─────────────────────────────── Render ─────────────────────────────── */
    return (
        <div className="page-container drivers-page">
            <header className="page-header">
                <h2>Passengers</h2>
                <div className="actions-header">
                    <div className="search-container">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search passengers…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary" onClick={openAddModal}>
                        + Add Passenger
                    </button>
                </div>
            </header>

            <div className="table-wrapper" style={{ background: 'transparent', border: 'none' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                        Loading passengers…
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Employee ID</th>
                                <th>Phone</th>
                                <th>Username</th>
                                <th>Trips</th>
                                <th>Last Trip</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                        {searchTerm ? `No passengers matching "${searchTerm}".` : 'No passengers yet.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((p) => (
                                    <tr key={p.id}>
                                        <td>
                                            <div className="driver-name-cell">
                                                <div className="table-avatar">
                                                    {(p.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                {p.name || '—'}
                                            </div>
                                        </td>
                                        <td>{p.corporateId || '—'}</td>
                                        <td>{p.phoneNumber || '—'}</td>
                                        <td style={{ color: '#666', fontSize: '0.88rem' }}>{p.username || '—'}</td>
                                        <td>
                                            <span className="status-badge" style={{ background: '#f0f0f0', color: '#555' }}>
                                                {p.tripCount ?? 0}
                                            </span>
                                        </td>
                                        <td style={{ color: '#888', fontSize: '0.85rem' }}>
                                            {p.lastTripAt ? new Date(p.lastTripAt).toLocaleDateString() : '—'}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-icon edit"
                                                    title="Edit"
                                                    onClick={() => handleEdit(p)}
                                                >
                                                    <FiEdit2 />
                                                </button>
                                                <button
                                                    className="btn-icon delete"
                                                    title="Delete"
                                                    onClick={() => handleDelete(p.id)}
                                                >
                                                    <FiTrash2 />
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

            {/* ── Modal ── */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{isEditMode ? 'Edit Passenger' : 'Add New Passenger'}</h3>
                            <button className="close-button" onClick={() => setShowModal(false)}>
                                &times;
                            </button>
                        </div>

                        {formError && <div className="error-message">{formError}</div>}

                        <form onSubmit={handleSubmit}>
                            {/* Name */}
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-control"
                                    placeholder="Alice Smith"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    maxLength={100}
                                    required
                                />
                            </div>

                            {/* Username */}
                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    className="form-control"
                                    placeholder="alice"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    minLength={3}
                                    maxLength={50}
                                    required
                                />
                            </div>

                            {/* Password — required on create, optional on edit */}
                            <div className="form-group">
                                <label>
                                    Password
                                    {isEditMode && (
                                        <span style={{ fontWeight: 400, color: '#888', marginLeft: 6, fontSize: '0.78rem' }}>
                                            (leave blank to keep current)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    className="form-control"
                                    placeholder={isEditMode ? 'Leave blank to keep unchanged' : 'Min 8 characters'}
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    minLength={isEditMode ? 0 : 8}
                                    required={!isEditMode}
                                />
                            </div>

                            {/* Phone */}
                            <div className="form-group">
                                <label>Phone Number <span style={{ color: '#888', fontSize: '0.78rem' }}>(E.164 format)</span></label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    className="form-control"
                                    placeholder="+911234567890"
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            {/* Corporate ID */}
                            <div className="form-group">
                                <label>Employee / Corporate ID</label>
                                <input
                                    type="text"
                                    name="corporateId"
                                    className="form-control"
                                    placeholder="EMP-001"
                                    value={formData.corporateId}
                                    onChange={handleInputChange}
                                    maxLength={100}
                                    required
                                />
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? 'Saving…' : isEditMode ? 'Update Passenger' : 'Create Passenger'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyPassengers;
