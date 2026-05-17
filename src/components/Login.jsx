import React, { useState } from 'react';
import { login, loginCompanyAdmin } from '../services/authService';
import { FiUser, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiBriefcase } from 'react-icons/fi';

const TABS = [
    { id: 'admin',         label: 'Admin',         icon: <FiUser size={14} /> },
    { id: 'company-admin', label: 'Company Admin',  icon: <FiBriefcase size={14} /> },
];

const Login = ({ onLogin }) => {
    const [activeTab,    setActiveTab]    = useState('admin');
    const [username,     setUsername]     = useState('');
    const [password,     setPassword]     = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState('');

    const switchTab = (tab) => {
        if (tab === activeTab) return;
        setActiveTab(tab);
        setUsername('');
        setPassword('');
        setError('');
        setShowPassword(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password.');
            return;
        }

        setLoading(true);
        try {
            const fn   = activeTab === 'admin' ? login : loginCompanyAdmin;
            const data = await fn(username.trim(), password);
            onLogin(data);
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const subtitle = activeTab === 'admin'
        ? 'Sign in to your admin dashboard'
        : 'Sign in to your company dashboard';

    return (
        <div className="login-root">
            {/* Animated background blobs */}
            <div className="login-blob login-blob--1" />
            <div className="login-blob login-blob--2" />
            <div className="login-blob login-blob--3" />

            <div className="login-card">
                {/* Brand */}
                <div className="login-brand">
                    <div className="login-logo">
                        <span className="login-logo-dot" />
                    </div>
                    <span className="login-brand-name">Caby Admin</span>
                </div>

                {/* Tabs */}
                <div className="login-tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            className={`login-tab${activeTab === tab.id ? ' login-tab--active' : ''}`}
                            onClick={() => switchTab(tab.id)}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="login-heading">
                    <h1 className="login-title">Welcome back</h1>
                    <p className="login-subtitle">{subtitle}</p>
                </div>

                {error && (
                    <div className="login-error" role="alert">
                        <FiAlertCircle className="login-error-icon" />
                        <span>{error}</span>
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    {/* Username */}
                    <div className="login-field">
                        <label htmlFor="login-username" className="login-label">Username</label>
                        <div className="login-input-wrapper">
                            <FiUser className="login-input-icon" />
                            <input
                                id="login-username"
                                type="text"
                                className="login-input"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                autoFocus
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="login-field">
                        <label htmlFor="login-password" className="login-label">Password</label>
                        <div className="login-input-wrapper">
                            <FiLock className="login-input-icon" />
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                className="login-input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="login-toggle-pw"
                                onClick={() => setShowPassword(v => !v)}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>

                    <button
                        id="login-submit-btn"
                        type="submit"
                        className={`login-btn${loading ? ' login-btn--loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="login-spinner" />
                                Signing in…
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <p className="login-footer-note">
                    Secured with RS256-signed JWT authentication
                </p>
            </div>
        </div>
    );
};

export default Login;
