import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import Drivers from './components/Drivers';
import { connectWebSocket } from './services/socket';
import './App.css';

function App() {
    const [activePage, setActivePage] = useState('home'); // 'home' | 'drivers'
    const [location, setLocation] = useState(null);
    const [path, setPath] = useState([]);
    const [status, setStatus] = useState('Disconnected');
    const [socketUrl, setSocketUrl] = useState('wss://caby-api.story-labs.in/ws/admin');
    const [activeDrivers, setActiveDrivers] = useState({}); // { [driverId]: { ...data } }
    const [ws, setWs] = useState(null);
    const [selectedDriverId, setSelectedDriverId] = useState(null);
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
                // DEBUG: Log incoming data
                // console.log("WS Data Received:", data);

                const formattedData = { ...data, lat, lng };

                // Map snake_case to camelCase
                const driverId = data.driver_id || data.driverId;
                const tripId = data.trip_id || data.tripId;

                // Update map ONLY if this data belongs to the selected driver
                if (selectedDriverIdRef.current && driverId === selectedDriverIdRef.current) {
                    setLocation(formattedData);
                    setPath((prevPath) => [...prevPath, formattedData]);
                } else if (!selectedDriverIdRef.current) {
                    // Optional: If no driver selected, maybe update location/path for global view?
                    // For now, let's keep the previous behavior or just pause map updates until selected
                    // The previous behavior was Global. Let's keep it global if nothing selected.
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
            const auditData = await response.json();

            // Extract locations and map to path format
            const history = (auditData.locations || []).map(loc => ({
                lat: loc.latitude,
                lng: loc.longitude,
                timestamp: loc.timestamp,
                speed: loc.speed
            }));

            // Filter out invalid points
            const validHistory = history.filter(p => p.lat !== undefined && p.lng !== undefined && p.lat !== 0 && p.lng !== 0);

            if (validHistory.length > 0) {
                setPath(validHistory);
                setLocation(validHistory[validHistory.length - 1]);
            }

            // Identify driver ID from the audit data if possible, or from activeDrivers state
            // auditData.trip.driverId is likely available based on user sample
            const driverId = auditData.trip?.driverId;
            if (driverId) {
                setSelectedDriverId(driverId);
            }

        } catch (error) {
            console.error(error);
            alert("Error fetching audit details");
        }
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
                return (
                    <div className="page-container uncentered">
                        <header className="page-header">
                            <h2>Dashboard</h2>
                        </header>
                        <div className="dashboard-content">
                            <div className="card">
                                <h3>Welcome back, Admin</h3>
                                <p>Select "Live Tracking" to view vehicle locations or "Drivers" to manage your fleet.</p>
                            </div>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h4>Total Drivers</h4>
                                    <p className="stat-value">5</p>
                                </div>
                                <div className="stat-card">
                                    <h4>Active Vehicles</h4>
                                    <p className="stat-value">2</p>
                                </div>
                                <div className="stat-card">
                                    <h4>Pending Reports</h4>
                                    <p className="stat-value">0</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
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
