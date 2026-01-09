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
    const [ws, setWs] = useState(null);

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
                setLocation(formattedData);
                setPath((prevPath) => [...prevPath, formattedData]);
            }
        });

        newWs.onopen = () => setStatus('Connected');
        newWs.onclose = () => {
            setStatus('Disconnected');
            setWs(null);
        };

        setWs(newWs);
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
            case 'home':
            default:
                return (
                    <>
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
                        <main className="map-wrapper">
                            <MapComponent location={location} path={path} />
                        </main>
                    </>
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
