import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getToken } from '../services/authService';
import '../App.css';

const API_URL = 'https://api-caby.story-labs.in/api/v1/cab-admin/packages';

const EMPTY_CREATE = { type: '', baseFare: '', perKmRate: '' };
const EMPTY_EDIT   = { baseFare: '', perKmRate: '' };

const fmt = (n) => (n != null ? Number(n).toFixed(2) : '—');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

const Packages = () => {
    const readHeaders  = { 'Authorization': `Bearer ${getToken()}` };
    const writeHeaders = { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };

    const [packages,   setPackages]   = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [showModal,  setShowModal]  = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId,  setEditingId]  = useState(null);
    const [formData,   setFormData]   = useState(EMPTY_CREATE);
    const [submitting, setSubmitting] = useState(false);
    const [formError,  setFormError]  = useState('');

    useEffect(() => { fetchPackages(); }, []);

    /* ── Fetch ── */
    const fetchPackages = async () => {
        setLoading(true);
        try {
            const res = await fetch(API_URL, { headers: readHeaders });
            if (!res.ok) throw new Error('Failed to fetch packages');
            const data = await res.json();
            setPackages(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    /* ── Filter ── */
    const filtered = packages.filter(p =>
        (p.type && p.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    /* ── Modals ── */
    const openAddModal = () => {
        setIsEditMode(false);
        setEditingId(null);
        setFormData(EMPTY_CREATE);
        setFormError('');
        setShowModal(true);
    };

    const openEditModal = (pkg) => {
        setIsEditMode(true);
        setEditingId(pkg.id);
        setFormData({ baseFare: pkg.baseFare ?? '', perKmRate: pkg.perKmRate ?? '' });
        setFormError('');
        setShowModal(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    /* ── Submit ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError('');

        try {
            const url    = isEditMode ? `${API_URL}/${editingId}` : API_URL;
            const method = isEditMode ? 'PUT' : 'POST';

            const payload = isEditMode
                ? { baseFare: Number(formData.baseFare), perKmRate: Number(formData.perKmRate) }
                : { type: formData.type.trim(), baseFare: Number(formData.baseFare), perKmRate: Number(formData.perKmRate) };

            const res = await fetch(url, {
                method,
                headers: writeHeaders,
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `Failed to ${isEditMode ? 'update' : 'create'} package`);
            }

            toast.success(`Package ${isEditMode ? 'updated' : 'created'} successfully!`);
            setShowModal(false);
            fetchPackages();
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Delete ── */
    const handleDelete = async (id) => {
        if (!window.confirm('Delete this package type? This cannot be undone.')) return;
        try {
            const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: readHeaders });
            if (!res.ok && res.status !== 204) throw new Error('Failed to delete package');
            setPackages(prev => prev.filter(p => p.id !== id));
            toast.success('Package deleted');
        } catch (err) {
            toast.error(err.message);
        }
    };

    /* ─────────────────────────────── Render ─────────────────────────────── */
    return (
        <div className="page-container drivers-page">
            <header className="page-header">
                <h2>Packages</h2>
                <div className="actions-header">
                    <div className="search-container">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search by type or name…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary" onClick={openAddModal}>
                        + Add Package
                    </button>
                </div>
            </header>

            <div className="table-wrapper" style={{ background: 'transparent', border: 'none' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                        Loading packages…
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Name</th>
                                <th>Duration (hrs)</th>
                                <th>Distance Limit (km)</th>
                                <th>Base Fare (₹)</th>
                                <th>Per km (₹)</th>
                                <th>Created</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                                        {searchTerm ? `No packages matching "${searchTerm}".` : 'No packages yet.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((pkg) => (
                                    <tr key={pkg.id}>
                                        <td>
                                            <div className="driver-name-cell">
                                                <div className="table-avatar" style={{ background: '#111', color: '#fff', fontSize: '0.7rem' }}>
                                                    {(pkg.type || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{pkg.type || '—'}</span>
                                            </div>
                                        </td>
                                        <td>{pkg.name || '—'}</td>
                                        <td>{pkg.durationHours ?? '—'}</td>
                                        <td>{pkg.distanceLimitKm ?? '—'}</td>
                                        <td>
                                            <span style={{ fontWeight: 600, color: '#111' }}>₹{fmt(pkg.baseFare)}</span>
                                        </td>
                                        <td>₹{fmt(pkg.perKmRate)}</td>
                                        <td style={{ color: '#888', fontSize: '0.83rem' }}>{fmtDate(pkg.createdAt)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-icon edit"
                                                    title="Edit fares"
                                                    onClick={() => openEditModal(pkg)}
                                                >
                                                    <FiEdit2 />
                                                </button>
                                                <button
                                                    className="btn-icon delete"
                                                    title="Delete"
                                                    onClick={() => handleDelete(pkg.id)}
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
                            <h3>{isEditMode ? 'Edit Package Fares' : 'Add Package Type'}</h3>
                            <button className="close-button" onClick={() => setShowModal(false)}>&times;</button>
                        </div>

                        {formError && <div className="error-message">{formError}</div>}

                        <form onSubmit={handleSubmit}>
                            {/* Type — only on create */}
                            {!isEditMode && (
                                <div className="form-group">
                                    <label>Package Type</label>
                                    <input
                                        type="text"
                                        name="type"
                                        className="form-control"
                                        placeholder='e.g. DAILY, HOURLY, MONTHLY'
                                        value={formData.type}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            )}

                            {/* Base Fare */}
                            <div className="form-group">
                                <label>Base Fare (₹)</label>
                                <input
                                    type="number"
                                    name="baseFare"
                                    className="form-control"
                                    placeholder="0.00"
                                    min="0.01"
                                    step="0.01"
                                    value={formData.baseFare}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Per km Rate */}
                            <div className="form-group">
                                <label>Per km Rate (₹)</label>
                                <input
                                    type="number"
                                    name="perKmRate"
                                    className="form-control"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    value={formData.perKmRate}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? 'Saving…' : isEditMode ? 'Update Package' : 'Create Package'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Packages;
