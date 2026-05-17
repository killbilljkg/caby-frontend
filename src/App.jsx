import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import Drivers from './components/Drivers';
import History from './components/History';
import AssignDriver from './components/AssignDriver';
import Dashboard from './components/Dashboard';
import CompanyDashboard from './components/CompanyDashboard';
import Login from './components/Login';
import { connectWebSocket } from './services/socket';
import { isAuthenticated as checkAuth, getUser, getToken, logout as authLogout } from './services/authService';
import './App.css';

function App() {
    // ── Auth state ──────────────────────────────────────────────
    const [authenticated, setAuthenticated] = useState(() => checkAuth());
    const [currentUser, setCurrentUser] = useState(() => getUser());

    const handleLogin = (data) => {
        setCurrentUser({ userId: data.userId, username: data.username, role: data.role || 'ADMIN' });
        setAuthenticated(true);
    };

    const handleLogout = () => {
        authLogout();
        setAuthenticated(false);
        setCurrentUser(null);
        // Reset dashboard state
        localStorage.setItem('caby_active_page', 'dashboard');
        setActivePage('dashboard');
        setPath([]);
        setLocation(null);
        setTripSummary(null);
        setSelectedDriverId(null);
        selectedDriverIdRef.current = null;
        if (ws) { ws.close(); setWs(null); }
    };
    // ────────────────────────────────────────────────────────────

    const [activePage, setActivePage] = useState(
        () => localStorage.getItem('caby_active_page') || 'dashboard'
    ); // 'dashboard' | 'live-tracking' | 'drivers' | 'history' | 'assign-driver'
    const [location, setLocation] = useState(null);
    const [path, setPath] = useState([]);
    const [status, setStatus] = useState('Disconnected');
    const [socketUrl, setSocketUrl] = useState('wss://caby-api-service-view-service.story-labs.in/ws/admin');
    const [activeDrivers, setActiveDrivers] = useState({}); // { [driverId]: { ...data } }
    const [ws, setWs] = useState(null);
    const [selectedDriverId, setSelectedDriverId] = useState(null);
    const [tripSummary, setTripSummary] = useState(null);
    const selectedDriverIdRef = React.useRef(null);

    // Sync ref with state
    useEffect(() => {
        selectedDriverIdRef.current = selectedDriverId;
    }, [selectedDriverId]);

    const handleConnect = () => {
        if (ws) {
            ws.close();
            setWs(null);
            return;
        }

        // Browsers cannot send custom headers on WebSocket connections;
        // pass the JWT token as a query parameter instead.
        const token = getToken();
        const urlWithToken = token
            ? `${socketUrl}?token=${encodeURIComponent(token)}`
            : socketUrl;

        const newWs = connectWebSocket(urlWithToken, (data) => {
            const lat = data.lat !== undefined ? data.lat : data.latitude;
            const lng = data.lng !== undefined ? data.lng : data.longitude;

            if (lat !== undefined && lng !== undefined) {
                const formattedData = { ...data, lat, lng };

                const driverId = data.driver_id || data.driverId;
                const tripId   = data.trip_id   || data.tripId;

                if (selectedDriverIdRef.current && driverId === selectedDriverIdRef.current) {
                    setLocation(formattedData);
                    setPath((prevPath) => [...prevPath, formattedData]);
                }

                if (driverId) {
                    setActiveDrivers(prev => ({
                        ...prev,
                        [driverId]: {
                            ...data,
                            driverId,
                            tripId,
                            lastUpdate: new Date().toISOString()
                        }
                    }));
                }
            }
        });

        newWs.onopen = () => setStatus('Connected');
        newWs.onclose = () => {
            setStatus('Disconnected');
            setWs(null);
        };
        newWs.onerror = (err) => {
            // Downgrade to warn — a WS failure is non-fatal
            console.warn('WebSocket connection failed:', err);
            setStatus('Error');
        };

        setWs(newWs);
    };

    const handleDriverClick = async (tripId) => {
        if (!tripId) {
            alert("No Trip ID available for this driver.");
            return;
        }
        try {
            const response = await fetch(`https://api-caby.story-labs.in/api/v1/audits/${tripId}`);
            if (!response.ok) throw new Error("Failed to fetch trip audits");
            let auditData = await response.json();
            console.log("Trip Detail Response:", auditData);

            // Handle case where API returns an array for single trip
            if (Array.isArray(auditData)) {
                auditData = auditData.length > 0 ? auditData[0] : {};
            }

            // 1. Prepare Path & Events
            const rawLocations = auditData.locations || [];
            const rawMilestones = auditData.milestones || [];

            // Map locations to standard format
            const pathPoints = rawLocations.map(loc => ({
                lat: loc.latitude,
                lng: loc.longitude,
                timestamp: loc.timestamp,
                speed: loc.speed
            }));

            // Map milestones to standard format
            const milestonePoints = rawMilestones.map(ms => ({
                lat: ms.latitude,
                lng: ms.longitude,
                timestamp: ms.timestamp,
                event_type: ms.eventType, // 'START', 'PICKUP', 'DROPOFF', 'END'
                ...ms
            }));

            // Combine and sort by timestamp
            const combinedPath = [...pathPoints, ...milestonePoints].sort((a, b) =>
                new Date(a.timestamp) - new Date(b.timestamp)
            );

            // Filter valid points
            const validPath = combinedPath.filter(p => p.lat !== undefined && p.lng !== undefined && p.lat !== 0 && p.lng !== 0);

            if (validPath.length > 0) {
                setPath(validPath);
                setLocation(validPath[validPath.length - 1]);
            }

            // 2. Trip Summary
            const tripObj = auditData.trip || {};

            setTripSummary({
                id: auditData.id || tripObj.id,
                driverId: auditData.driverId || tripObj.driverId,
                passengerName: auditData.passengerName || tripObj.passengerName, // Check root, then trip object
                passengerPhoneNumber: auditData.passengerPhoneNumber || tripObj.passengerPhoneNumber,
                fromLocation: auditData.fromLocation || tripObj.fromLocation,
                toLocation: auditData.toLocation || tripObj.toLocation,
                status: auditData.currentStatus || tripObj.currentStatus,
                startTime: auditData.startTime || tripObj.startTime,
                endTime: auditData.endTime || tripObj.endTime,
                totalDistanceCorporate: auditData.totalDistanceCorporate || 0,
                totalDistanceOwner: auditData.totalDistanceOwner || 0
            });

            // Identify driver ID for selection
            const finalDriverId = auditData.driverId || tripObj.driverId;
            if (finalDriverId) {
                setSelectedDriverId(finalDriverId);
            }

        } catch (error) {
            console.error(error);
            alert("Error fetching audit details");
        }
    };

    const handleHistoryClick = async (tripId) => {
        await handleDriverClick(tripId);
        setActivePage('trip-detail');
    };

    // If the app loads directly on live-tracking (e.g. page refresh), auto-connect
    useEffect(() => {
        if (activePage === 'live-tracking') {
            setTimeout(handleConnect, 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderContent = () => {
        switch (activePage) {
            case 'dashboard':
                return <Dashboard onNavigate={handleNavigation} />;
            case 'drivers':
                return <Drivers />;
            case 'history':
                return <History onSelectTrip={handleHistoryClick} />;
            case 'assign-driver':
                return <AssignDriver />;
            case 'trip-detail':
                return (
                    <div className="trip-detail-container">
                        {/* White side panel */}
                        <aside className="active-drivers-sidebar trip-detail-sidebar">
                            {/* Header */}
                            <div className="ads-header">
                                <button className="td-back-btn" onClick={() => setActivePage('history')}>
                                    ← Back
                                </button>
                                <span className="ads-title">Trip Details</span>
                            </div>

                            <div className="ads-list">
                                {tripSummary ? (
                                    <>
                                        {/* Passenger card */}
                                        <div className="ads-card ads-card--selected">
                                            <div className="ads-card-top">
                                                <span className="ads-driver-name">
                                                    {tripSummary.passengerName || 'Unknown Passenger'}
                                                </span>
                                                <span
                                                    className="ads-badge"
                                                    style={tripSummary.status === 'START'
                                                        ? { color: '#166534', borderColor: '#86efac', backgroundColor: '#dcfce7' }
                                                        : {}}
                                                >
                                                    {tripSummary.status || 'N/A'}
                                                </span>
                                            </div>
                                            {tripSummary.passengerPhoneNumber && (
                                                <div className="ads-card-row">
                                                    <span className="ads-icon">📞</span>
                                                    <span className="ads-text">{tripSummary.passengerPhoneNumber}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Driver card */}
                                        <div className="ads-card">
                                            <div className="ads-card-row">
                                                <span className="ads-icon">🧑‍✈️</span>
                                                <span className="ads-driver-name" style={{ fontSize: '0.95rem' }}>
                                                    Driver: {tripSummary.driverId || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="ads-card-row">
                                                <span className="ads-icon">🆔</span>
                                                <span className="ads-text">Trip: {tripSummary.id || 'N/A'}</span>
                                            </div>
                                        </div>

                                        {/* Route card */}
                                        <div className="ads-card">
                                            <div className="ads-card-row">
                                                <span className="ads-icon">📍</span>
                                                <span className="ads-text">
                                                    <strong style={{ color: '#333' }}>From: </strong>
                                                    {tripSummary.fromLocation || 'N/A'}
                                                </span>
                                            </div>
                                            {tripSummary.startTime && (
                                                <div className="ads-card-row" style={{ paddingLeft: 26 }}>
                                                    <span className="ads-text" style={{ color: '#999', fontSize: '0.8rem' }}>
                                                        {new Date(tripSummary.startTime).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="ads-card-row" style={{ marginTop: 6 }}>
                                                <span className="ads-icon">🏁</span>
                                                <span className="ads-text">
                                                    <strong style={{ color: '#333' }}>To: </strong>
                                                    {tripSummary.toLocation || 'N/A'}
                                                </span>
                                            </div>
                                            {tripSummary.endTime && (
                                                <div className="ads-card-row" style={{ paddingLeft: 26 }}>
                                                    <span className="ads-text" style={{ color: '#999', fontSize: '0.8rem' }}>
                                                        {new Date(tripSummary.endTime).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Distance card */}
                                        <div className="ads-card">
                                            <div className="ads-card-row">
                                                <span className="ads-icon">🛣️</span>
                                                <span className="ads-text">
                                                    <strong style={{ color: '#333' }}>Corp: </strong>
                                                    {tripSummary.totalDistanceCorporate || 0} km
                                                </span>
                                            </div>
                                            <div className="ads-card-row">
                                                <span className="ads-icon">📏</span>
                                                <span className="ads-text">
                                                    <strong style={{ color: '#333' }}>Owner: </strong>
                                                    {tripSummary.totalDistanceOwner || 0} km
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="ads-empty">No trip data available.</p>
                                )}
                            </div>
                        </aside>

                        {/* Map */}
                        <div className="trip-detail-map">
                            <MapComponent location={location} path={path} />
                        </div>
                    </div>
                );
            case 'live-tracking':
                return (
                    <div className="live-tracking-container" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                        <aside className="active-drivers-sidebar">
                            <div className="ads-header">
                                <span className="ads-title">Active Drivers</span>
                                <span className="ads-count">{Object.values(activeDrivers).length}</span>
                            </div>
                            <div className="ads-list">
                                {Object.values(activeDrivers).length === 0 ? (
                                    <p className="ads-empty">No active drivers yet.</p>
                                ) : (
                                    Object.values(activeDrivers).map((driver) => {
                                        const isSelected = selectedDriverId === driver.driverId;
                                        return (
                                            <div
                                                key={driver.driverId}
                                                className={`ads-card ${isSelected ? 'ads-card--selected' : ''}`}
                                                onClick={() => handleDriverClick(driver.tripId)}
                                            >
                                                <div className="ads-card-top">
                                                    <span className="ads-driver-name">
                                                        Driver&nbsp;{driver.driverId}
                                                    </span>
                                                    <span className="ads-badge">New</span>
                                                </div>
                                                <div className="ads-card-row">
                                                    <span className="ads-icon">📍</span>
                                                    <span className="ads-text">{driver.fromLocation || 'En Route'}</span>
                                                </div>
                                                <div className="ads-card-row">
                                                    <span className="ads-icon">🕐</span>
                                                    <span className="ads-text">
                                                        {driver.lastUpdate
                                                            ? new Date(driver.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                            : 'Live'}
                                                        {driver.speed ? ` • ${driver.speed} km/h` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </aside>
                        <div className="map-view-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <header className="app-header">
                                <h1>Real-time Location Tracker</h1>
                                <div className="controls">
                                    <div
                                        className={`led-button ${status.toLowerCase()}`}
                                        onClick={handleConnect}
                                        title={status === 'Connected' ? 'Connected (Click to Disconnect)' : 'Disconnected (Click to Connect)'}
                                    />
                                </div>
                            </header>
                            <main className="map-wrapper" style={{ flex: 1 }}>
                                <MapComponent location={location} path={path} />
                            </main>
                        </div>
                    </div>
                );
            case 'home':
            default:
                if (activePage !== 'live-tracking') {
                    // Default fallback
                    return (
                        <div className="live-tracking-container" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                            {/* Same as live-tracking but simplified for fallback. Actually reuse the logic or just set state on mount */}
                            <aside className="active-drivers-sidebar" style={{ width: '300px', backgroundColor: '#1a1a1a', borderRight: '1px solid #333', overflowY: 'auto', padding: '1rem' }}>
                                <h3>Active Drivers</h3>
                                <div className="drivers-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* Placeholder */}
                                    <p style={{ color: '#666' }}>Select a view from the sidebar.</p>
                                </div>
                            </aside>
                        </div>
                    )
                }
                return null;
        }
    };

    const handleNavigation = (page) => {
        if (page === 'live-tracking') {
            // Clear map state
            setPath([]);
            setLocation(null);
            setTripSummary(null);
            setSelectedDriverId(null);
            selectedDriverIdRef.current = null;
            // Connect WebSocket when entering live tracking
            if (!ws) setTimeout(handleConnect, 0);
        } else {
            // Disconnect WebSocket when leaving live tracking
            if (ws) {
                ws.close();
                setWs(null);
                setStatus('Disconnected');
            }
        }
        localStorage.setItem('caby_active_page', page);
        setActivePage(page);
    };

    // Show login page if not authenticated
    if (!authenticated) {
        return <Login onLogin={handleLogin} />;
    }

    // Company admin gets their own isolated layout
    if ((currentUser?.role || getUser()?.role) === 'COMPANY_ADMIN') {
        return <CompanyDashboard onLogout={handleLogout} />;
    }

    return (
        <div className="app-root app-root--top-nav">
            <Sidebar
                activePage={activePage}
                onNavigate={handleNavigation}
                username={currentUser?.username}
                onLogout={handleLogout}
            />
            <div className="main-content">
                {renderContent()}
            </div>
        </div>
    );
}

export default App;
