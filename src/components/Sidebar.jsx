import React, { useState } from 'react';
import { FiMap, FiUsers, FiUserCheck, FiClock, FiMenu, FiChevronLeft } from 'react-icons/fi';
import '../App.css';

const Sidebar = ({ activePage, onNavigate }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                {!isCollapsed && <h2>Caby Admin</h2>}
                <button className="sidebar-toggle" onClick={toggleSidebar}>
                    {isCollapsed ? <FiMenu /> : <FiChevronLeft />}
                </button>
            </div>
            <nav className="sidebar-menu">
                <ul>
                    <li
                        className={activePage === 'live-tracking' ? 'active' : ''}
                        onClick={() => onNavigate('live-tracking')}
                        title="Live Tracking"
                    >
                        <span className="icon"><FiMap /></span>
                        {!isCollapsed && <span className="label">Live Tracking</span>}
                    </li>
                    <li
                        className={activePage === 'drivers' ? 'active' : ''}
                        onClick={() => onNavigate('drivers')}
                        title="Drivers"
                    >
                        <span className="icon"><FiUsers /></span>
                        {!isCollapsed && <span className="label">Drivers</span>}
                    </li>
                    <li
                        className={activePage === 'assign-driver' ? 'active' : ''}
                        onClick={() => onNavigate('assign-driver')}
                        title="Assign Driver"
                    >
                        <span className="icon"><FiUserCheck /></span>
                        {!isCollapsed && <span className="label">Assign Driver</span>}
                    </li>
                    <li
                        className={activePage === 'history' ? 'active' : ''}
                        onClick={() => onNavigate('history')}
                        title="History"
                    >
                        <span className="icon"><FiClock /></span>
                        {!isCollapsed && <span className="label">History</span>}
                    </li>
                </ul>
            </nav>
            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="avatar">A</div>
                    {!isCollapsed && <span>Admin User</span>}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;


