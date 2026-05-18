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
import { colorForDriver } from './components/MapComponent';
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
    const [showLiveDetailPanel, setShowLiveDetailPanel] = useState(false);
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
                const tripId = data.trip_id || data.tripId;
                const driverName = data.driver_name || data.driverName;

                if (selectedDriverIdRef.current && driverId === selectedDriverIdRef.current) {
                    setLocation(formattedData);
                    setPath((prevPath) => [...prevPath, formattedData]);
                }

                // Update active drivers list, keeping previous position for heading calculation
                if (driverId) {
                    setActiveDrivers(prev => {
                        const previous = prev[driverId];
                        return {
                            ...prev,
                            [driverId]: {
                                ...data,
                                driverId,
                                tripId,
                                driverName: driverName || previous?.driverName,
                                vehicleNumber: previous?.vehicleNumber,
                                vehicleType: previous?.vehicleType,
                                lat,
                                lng,
                                prevLat: previous?.lat,
                                prevLng: previous?.lng,
                                lastUpdate: new Date().toISOString(),
                            },
                        };
                    });
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

            // 2. Trip Summary — supports both new structured response
            //    ({ trip, driver, passenger, ... }) and legacy flat shape.
            const tripObj = auditData.trip || {};
            const driverObj = auditData.driver || {};
            const passengerObj = auditData.passenger || {};

            setTripSummary({
                id: tripObj.id || auditData.id,
                driverId: driverObj.driverId || auditData.driverId || tripObj.driverId,
                driverName: driverObj.name || auditData.driverName,
                driverPhone: driverObj.phoneNumber || auditData.driverPhoneNumber,
                vehicleNumber: driverObj.vehicleNumber || auditData.vehicleNumber,
                vehicleType: driverObj.vehicleType || auditData.vehicleType,
                passengerId: passengerObj.passengerId || auditData.passengerId,
                passengerName: passengerObj.name || auditData.passengerName || tripObj.passengerName,
                passengerPhoneNumber: passengerObj.phoneNumber || auditData.passengerPhoneNumber || tripObj.passengerPhoneNumber,
                passengerCorporateId: passengerObj.corporateId || auditData.corporateId,
                fromLocation: tripObj.fromLocation || auditData.fromLocation,
                toLocation: tripObj.toLocation || auditData.toLocation,
                status: tripObj.currentStatus || auditData.currentStatus,
                startTime: tripObj.startTime || auditData.startTime,
                endTime: tripObj.endTime || auditData.endTime,
                totalDistanceCorporate: tripObj.totalDistanceCorporate ?? auditData.totalDistanceCorporate ?? 0,
                totalDistanceOwner: tripObj.totalDistanceOwner ?? auditData.totalDistanceOwner ?? 0,
                totalGpsDistanceKm: auditData.totalGpsDistanceKm ?? 0,
            });

            // Identify driver ID for selection
            const finalDriverId = driverObj.driverId || auditData.driverId || tripObj.driverId;
            if (finalDriverId) {
                setSelectedDriverId(finalDriverId);
            }

            // Fold driver name into the active-drivers map so map labels update.
            if (finalDriverId && driverObj.name) {
                setActiveDrivers(prev => ({
                    ...prev,
                    [finalDriverId]: {
                        ...(prev[finalDriverId] || { driverId: finalDriverId }),
                        driverName: driverObj.name,
                        vehicleNumber: driverObj.vehicleNumber,
                        vehicleType: driverObj.vehicleType,
                    },
                }));
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
                        <div className="trip-detail-map" style={{ position: 'relative', height: '100%', width: '100%' }}>
                            <button className="trip-back-pill" onClick={() => setActivePage('history')}>← Back</button>
                            <MapComponent location={location} path={path} />
                            {tripSummary && (
                                <div className="live-detail-panel">
                                    <div className="ldp-header" style={{ borderBottomColor: '#3b82f6' }}>
                                        <div>
                                            <div className="ldp-title">{tripSummary.passengerName || 'Trip Details'}</div>
                                            <div className="ldp-sub">{tripSummary.status || 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div className="ldp-body">
                                        <div className="ldp-divider" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>Driver</div>
                                        {tripSummary.driverName && <div className="ldp-row"><span>Name</span><b>{tripSummary.driverName}</b></div>}
                                        {tripSummary.driverPhone && <div className="ldp-row"><span>Phone</span><b>{tripSummary.driverPhone}</b></div>}
                                        {tripSummary.vehicleNumber && <div className="ldp-row"><span>Vehicle</span><b>{tripSummary.vehicleNumber}</b></div>}
                                        {tripSummary.vehicleType && <div className="ldp-row"><span>Type</span><b>{tripSummary.vehicleType}</b></div>}
                                        {!tripSummary.driverName && tripSummary.driverId && <div className="ldp-row"><span>Driver ID</span><b>{tripSummary.driverId}</b></div>}

                                        <div className="ldp-divider">Trip</div>
                                        {tripSummary.id && <div className="ldp-row"><span>Trip ID</span><b>{tripSummary.id}</b></div>}
                                        {tripSummary.fromLocation && <div className="ldp-row"><span>From</span><b>{tripSummary.fromLocation}</b></div>}
                                        {tripSummary.toLocation && <div className="ldp-row"><span>To</span><b>{tripSummary.toLocation}</b></div>}
                                        {tripSummary.startTime && <div className="ldp-row"><span>Started</span><b>{new Date(tripSummary.startTime).toLocaleString()}</b></div>}
                                        {tripSummary.endTime && <div className="ldp-row"><span>Ended</span><b>{new Date(tripSummary.endTime).toLocaleString()}</b></div>}
                                        {tripSummary.totalGpsDistanceKm != null && <div className="ldp-row"><span>GPS distance</span><b>{tripSummary.totalGpsDistanceKm.toFixed(2)} km</b></div>}
                                        {tripSummary.totalDistanceCorporate != null && <div className="ldp-row"><span>Corp</span><b>{tripSummary.totalDistanceCorporate} km</b></div>}
                                        {tripSummary.totalDistanceOwner != null && <div className="ldp-row"><span>Owner</span><b>{tripSummary.totalDistanceOwner} km</b></div>}

                                        {tripSummary.passengerName && (
                                            <>
                                                <div className="ldp-divider">Passenger</div>
                                                <div className="ldp-row"><span>Name</span><b>{tripSummary.passengerName}</b></div>
                                                {tripSummary.passengerPhoneNumber && <div className="ldp-row"><span>Phone</span><b>{tripSummary.passengerPhoneNumber}</b></div>}
                                                {tripSummary.passengerCorporateId && <div className="ldp-row"><span>Corp ID</span><b>{tripSummary.passengerCorporateId}</b></div>}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'live-tracking': {
                const driverList = Object.values(activeDrivers);
                const selectedDriver = selectedDriverId ? activeDrivers[selectedDriverId] : null;
                const onMarkerClick = (d) => {
                    setSelectedDriverId(d.driverId);
                    selectedDriverIdRef.current = d.driverId;
                    setShowLiveDetailPanel(true);
                    if (d.tripId) handleDriverClick(d.tripId);
                };
                return (
                    <div className="live-tracking-container" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                        <div className="map-view-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <div className="live-driver-pill">
                                <span className="ldp-dot-live" /> {driverList.length} active driver{driverList.length === 1 ? '' : 's'}
                            </div>
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
                            <main className="map-wrapper" style={{ flex: 1, position: 'relative' }}>
                                <MapComponent
                                    drivers={driverList}
                                    selectedDriverId={selectedDriverId}
                                    onDriverClick={onMarkerClick}
                                    path={selectedDriverId ? path : []}
                                />
                                {showLiveDetailPanel && selectedDriver && (
                                    <div className="live-detail-panel">
                                        <div className="ldp-header" style={{ borderBottomColor: colorForDriver(selectedDriver.driverId) }}>
                                            <div>
                                                <div className="ldp-title">
                                                    <span className="ads-dot" style={{ background: colorForDriver(selectedDriver.driverId) }} />
                                                    {selectedDriver.driverName || tripSummary?.driverName || `Driver ${selectedDriver.driverId}`}
                                                </div>
                                                <div className="ldp-sub">
                                                    {(tripSummary?.vehicleNumber || selectedDriver.vehicleNumber) ? `${tripSummary?.vehicleNumber || selectedDriver.vehicleNumber}${(tripSummary?.vehicleType || selectedDriver.vehicleType) ? ` · ${tripSummary?.vehicleType || selectedDriver.vehicleType}` : ''}` : (tripSummary?.status || selectedDriver.status || 'LIVE')}
                                                </div>
                                            </div>
                                            <button className="ldp-close" onClick={() => { setShowLiveDetailPanel(false); setSelectedDriverId(null); selectedDriverIdRef.current = null; setPath([]); setLocation(null); }}>×</button>
                                        </div>
                                        <div className="ldp-body">
                                            <div className="ldp-divider" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>Driver</div>
                                            {(tripSummary?.driverName || selectedDriver.driverName) && <div className="ldp-row"><span>Name</span><b>{tripSummary?.driverName || selectedDriver.driverName}</b></div>}
                                            {tripSummary?.driverPhone && <div className="ldp-row"><span>Phone</span><b>{tripSummary.driverPhone}</b></div>}
                                            {(tripSummary?.vehicleNumber || selectedDriver.vehicleNumber) && <div className="ldp-row"><span>Vehicle</span><b>{tripSummary?.vehicleNumber || selectedDriver.vehicleNumber}</b></div>}
                                            {(tripSummary?.vehicleType || selectedDriver.vehicleType) && <div className="ldp-row"><span>Type</span><b>{tripSummary?.vehicleType || selectedDriver.vehicleType}</b></div>}

                                            <div className="ldp-divider">Live</div>
                                            <div className="ldp-row"><span>Position</span><b>{selectedDriver.lat?.toFixed?.(5)}, {selectedDriver.lng?.toFixed?.(5)}</b></div>
                                            {selectedDriver.speed != null && <div className="ldp-row"><span>Speed</span><b>{Math.round(selectedDriver.speed)} km/h</b></div>}
                                            {selectedDriver.lastUpdate && <div className="ldp-row"><span>Last update</span><b>{new Date(selectedDriver.lastUpdate).toLocaleTimeString()}</b></div>}

                                            {tripSummary && (
                                                <>
                                                    <div className="ldp-divider">Trip</div>
                                                    {tripSummary.status && <div className="ldp-row"><span>Status</span><b>{tripSummary.status}</b></div>}
                                                    {tripSummary.fromLocation && <div className="ldp-row"><span>From</span><b>{tripSummary.fromLocation}</b></div>}
                                                    {tripSummary.toLocation && <div className="ldp-row"><span>To</span><b>{tripSummary.toLocation}</b></div>}
                                                    {tripSummary.startTime && <div className="ldp-row"><span>Started</span><b>{new Date(tripSummary.startTime).toLocaleString()}</b></div>}
                                                    {tripSummary.totalGpsDistanceKm != null && <div className="ldp-row"><span>Distance</span><b>{tripSummary.totalGpsDistanceKm.toFixed(2)} km</b></div>}
                                                </>
                                            )}

                                            {tripSummary?.passengerName && (
                                                <>
                                                    <div className="ldp-divider">Passenger</div>
                                                    <div className="ldp-row"><span>Name</span><b>{tripSummary.passengerName}</b></div>
                                                    {tripSummary.passengerPhoneNumber && <div className="ldp-row"><span>Phone</span><b>{tripSummary.passengerPhoneNumber}</b></div>}
                                                    {tripSummary.passengerCorporateId && <div className="ldp-row"><span>Corp ID</span><b>{tripSummary.passengerCorporateId}</b></div>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </main>
                        </div>
                    </div>
                );
            }
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
