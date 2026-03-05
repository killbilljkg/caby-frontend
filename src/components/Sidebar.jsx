import React from 'react';
import { FiMap, FiUsers, FiUserCheck, FiClock } from 'react-icons/fi';
import '../App.css';

const Sidebar = ({ activePage, onNavigate }) => {
    const tabs = [
        { key: 'live-tracking', label: 'Live Tracking', icon: <FiMap /> },
        { key: 'drivers', label: 'Drivers', icon: <FiUsers /> },
        { key: 'assign-driver', label: 'Assign Driver', icon: <FiUserCheck /> },
        { key: 'history', label: 'History', icon: <FiClock /> },
    ];

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
                <div className="avatar">A</div>
                <span>Admin</span>
            </div>
        </header>
    );
};

export default Sidebar;
