import React from 'react';
import '../App.css'; // We'll keep styles central or we could make Sidebar.css

const Sidebar = ({ activePage, onNavigate }) => {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>Caby Admin</h2>
            </div>
            <nav className="sidebar-menu">
                <ul>
                    <li
                        className={activePage === 'live-tracking' ? 'active' : ''}
                        onClick={() => onNavigate('live-tracking')}
                    >
                        <span className="icon">📡</span>
                        <span className="label">Live Tracking</span>
                    </li>
                    <li
                        className={activePage === 'drivers' ? 'active' : ''}
                        onClick={() => onNavigate('drivers')}
                    >
                        <span className="icon">👥</span>
                        <span className="label">Drivers</span>
                    </li>
                    <li
                        className={activePage === 'assign-driver' ? 'active' : ''}
                        onClick={() => onNavigate('assign-driver')}
                    >
                        <span className="icon">🚕</span>
                        <span className="label">Assign Driver</span>
                    </li>
                    <li
                        className={activePage === 'history' ? 'active' : ''}
                        onClick={() => onNavigate('history')}
                    >
                        <span className="icon">📜</span>
                        <span className="label">History</span>
                    </li>
                </ul>
            </nav>
            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="avatar">A</div>
                    <span>Admin User</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
