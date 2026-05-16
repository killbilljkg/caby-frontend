import React from 'react';
import { FiGrid, FiMap, FiUsers, FiUserCheck, FiClock, FiLogOut } from 'react-icons/fi';
import '../App.css';

const Sidebar = ({ activePage, onNavigate, username, onLogout }) => {
    const tabs = [
        { key: 'dashboard',     label: 'Dashboard',    icon: <FiGrid /> },
        { key: 'live-tracking', label: 'Live Tracking', icon: <FiMap /> },
        { key: 'drivers',       label: 'Drivers',       icon: <FiUsers /> },
        { key: 'assign-driver', label: 'Assign Driver', icon: <FiUserCheck /> },
        { key: 'history',       label: 'History',       icon: <FiClock /> },
    ];

    // Derive initials for avatar from username
    const initials = username
        ? username.slice(0, 2).toUpperCase()
        : 'A';

    return (
        <header className="top-nav">
            <div className="top-nav-brand">
                <span className="brand-dot" />
                <span className="brand-name">Caby Admin</span>
            </div>
            <nav className="top-nav-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`top-nav-tab ${activePage === tab.key ? 'active' : ''}`}
                        onClick={() => onNavigate(tab.key)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </nav>
            <div className="top-nav-user">
                <div className="avatar" title={username || 'Admin'}>{initials}</div>
                {username && <span className="nav-username">{username}</span>}
                {onLogout && (
                    <button
                        id="nav-logout-btn"
                        className="nav-logout-btn"
                        onClick={onLogout}
                        title="Sign out"
                    >
                        <FiLogOut />
                        Logout
                    </button>
                )}
            </div>
        </header>
    );
};

export default Sidebar;

