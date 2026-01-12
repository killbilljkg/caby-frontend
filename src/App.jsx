import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import Drivers from './components/Drivers';
import History from './components/History';
import AssignDriver from './components/AssignDriver';
import { connectWebSocket } from './services/socket';
import './App.css';

function App() {
    const [activePage, setActivePage] = useState('live-tracking'); // 'live-tracking' | 'drivers' | 'history' | 'assign-driver'
    const [location, setLocation] = useState(null);
    const [path, setPath] = useState([]);
    const [status, setStatus] = useState('Disconnected');
    const [socketUrl, setSocketUrl] = useState('wss://caby-api.story-labs.in/ws/admin');
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

        const newWs = connectWebSocket(socketUrl, (data) => {
            // Map external API data (latitude/longitude) to internal format (lat/lng)
            const lat = data.lat !== undefined ? data.lat : data.latitude;
            const lng = data.lng !== undefined ? data.lng : data.longitude;

            if (lat !== undefined && lng !== undefined) {
                const formattedData = { ...data, lat, lng };

                // Map snake_case to camelCase
                const driverId = data.driver_id || data.driverId;
                const tripId = data.trip_id || data.tripId;

                // Update map ONLY if this data belongs to the selected driver
                if (selectedDriverIdRef.current && driverId === selectedDriverIdRef.current) {
                    setLocation(formattedData);
                    setPath((prevPath) => [...prevPath, formattedData]);
                } else if (!selectedDriverIdRef.current) {
                    setLocation(formattedData);
                    setPath((prevPath) => [...prevPath, formattedData]);
                }

                // Update active drivers list
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
            console.error('WebSocket Error:', err);
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
            const response = await fetch(`http://16.170.219.54:8081/api/v1/audits/${tripId}`);
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

    useEffect(() => {
        // Auto-connect on mount (optional, or wait for user)
        handleConnect();

        return () => {
            if (ws) ws.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    const renderContent = () => {
        switch (activePage) {
            case 'drivers':
                return <Drivers />;
            case 'history':
                return <History onSelectTrip={handleHistoryClick} />;
            case 'assign-driver':
                return <AssignDriver />;
            case 'trip-detail':
                return (
                    <div className="trip-detail-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <header className="page-header" style={{ padding: '1rem', marginBottom: 0, borderBottom: '1px solid #333' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <button className="btn-secondary" onClick={() => setActivePage('history')}>
                                    ← Back
                                </button>
                                <h2>Trip Details</h2>
                            </div>
                        </header>

                        <div style={{ flex: 1, position: 'relative' }}>
                            <MapComponent location={location} path={path} />

                            {tripSummary && (
                                <div className="trip-summary-panel">
                                    <div className="summary-grid">
                                        <div className="summary-item">
                                            <label>Passenger</label>
                                            <span>{tripSummary.passengerName || 'N/A'}</span>
                                            <span style={{ fontSize: '0.8rem', color: '#888' }}>{tripSummary.passengerPhoneNumber}</span>
                                        </div>
                                        <div className="summary-item">
                                            <label>Status</label>
                                            <span className="status-badge" style={{
                                                backgroundColor: tripSummary.status === 'START' ? '#dcfce7' : '#2a2a2a',
                                                color: tripSummary.status === 'START' ? '#166534' : '#fff',
                                                border: '1px solid #444'
                                            }}>
                                                {tripSummary.status || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="summary-item">
                                            <label>Driver ID</label>
                                            <span style={{ fontSize: '0.9rem' }}>{tripSummary.driverId}</span>
                                        </div>
                                        <div className="summary-item">
                                            <label>Trip ID</label>
                                            <span style={{ fontSize: '0.9rem' }}>{tripSummary.id}</span>
                                        </div>

                                        <div className="summary-item">
                                            <label>From</label>
                                            <span>{tripSummary.fromLocation || 'N/A'}</span>
                                            <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                                {tripSummary.startTime ? new Date(tripSummary.startTime).toLocaleString() : ''}
                                            </span>
                                        </div>
                                        <div className="summary-item">
                                            <label>To</label>
                                            <span>{tripSummary.toLocation || 'N/A'}</span>
                                            <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                                {tripSummary.endTime ? new Date(tripSummary.endTime).toLocaleString() : ''}
                                            </span>
                                        </div>
                                        <div className="summary-item">
                                            <label>Dist. (Corp)</label>
                                            <span>{tripSummary.totalDistanceCorporate || 0} km</span>
                                        </div>
                                        <div className="summary-item">
                                            <label>Dist. (Owner)</label>
                                            <span>{tripSummary.totalDistanceOwner || 0} km</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'live-tracking':
                return (
                    <div className="live-tracking-container" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                        <aside className="active-drivers-sidebar" style={{ width: '300px', backgroundColor: '#1a1a1a', borderRight: '1px solid #333', overflowY: 'auto', padding: '1rem' }}>
                            <h3>Active Drivers</h3>
                            <div className="drivers-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {Object.values(activeDrivers).length === 0 ? (
                                    <p style={{ color: '#666' }}>No active drivers data received yet.</p>
                                ) : (
                                    Object.values(activeDrivers).map((driver) => (
                                        <div
                                            key={driver.driverId}
                                            className="driver-card"
                                            onClick={() => handleDriverClick(driver.tripId)}
                                            style={{
                                                backgroundColor: '#2a2a2a',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                border: '1px solid #444'
                                            }}
                                        >
                                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Driver ID: {driver.driverId}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Trip ID: {driver.tripId || 'N/A'}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#646cff', marginTop: '6px' }}>
                                                {driver.status || 'Live'} • {driver.speed ? `${driver.speed} km/h` : ''}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </aside>
                        <div className="map-view-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <header className="app-header">
                                <h1>Real-time Location Tracker</h1>
                                <div className="controls">
                                    <input
                                        type="text"
                                        value={socketUrl}
                                        onChange={(e) => setSocketUrl(e.target.value)}
                                        placeholder="ws://localhost:8081"
                                        disabled={status === 'Connected'}
                                    />
                                    <button onClick={handleConnect}>
                                        {status === 'Connected' ? 'Disconnect' : 'Connect'}
                                    </button>
                                </div>
                                <div className={`status-indicator ${status.toLowerCase()}`}>
                                    {status}
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

    return (
        <div className="app-root">
            <Sidebar activePage={activePage} onNavigate={setActivePage} />
            <div className="main-content">
                {renderContent()}
            </div>
        </div>
    );
}

export default App;
