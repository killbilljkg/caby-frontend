import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon missing
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Car icon
const carIcon = L.icon({
    iconUrl: '/car.png',
    iconSize: [40, 40], // Adjusted size for car
    iconAnchor: [20, 20], // Center of the icon
    popupAnchor: [0, -20]
});

// Component to recenter map when location changes or fit bounds to path
function RecenterMap({ location, path }) {
    const map = useMap();

    useEffect(() => {
        if (path && path.length > 0) {
            const bounds = L.latLngBounds(path.map(p => [p.lat, p.lng]));
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        } else if (location && location.lat !== undefined && location.lng !== undefined) {
            map.setView([location.lat, location.lng]);
        }
    }, [location, path, map]);

    return null;
}

const MapComponent = ({ location, path }) => {
    const center = (location && location.lat !== undefined && location.lng !== undefined)
        ? [location.lat, location.lng]
        : [51.505, -0.09];

    // Helper to get event index
    const getEventIndex = (type) => path.findIndex(p => p.event_type === type);

    const startIndex = getEventIndex('START');
    const pickupIndex = getEventIndex('PICKUP');
    const dropoffIndex = getEventIndex('DROPOFF');
    const endIndex = getEventIndex('END');

    // Segments
    const segments = [];

    // 1. Start -> Pickup (Blue)
    // If START exists, start from there. Otherwise start from 0.
    // Go until PICKUP if it exists, otherwise go to end of path.
    let seg1Start = startIndex !== -1 ? startIndex : 0;
    let seg1End = pickupIndex !== -1 ? pickupIndex : path.length - 1;

    // Only add if we have points and logic holds (path could be empty or before start)
    if (path.length > 0) {
        segments.push({
            positions: path.slice(seg1Start, seg1End + 1)
                .filter(p => p.lat !== undefined && p.lng !== undefined)
                .map(p => [p.lat, p.lng]),
            color: 'blue'
        });
    }

    // 2. Pickup -> Dropoff (Red)
    if (pickupIndex !== -1) {
        let seg2End = dropoffIndex !== -1 ? dropoffIndex : path.length - 1;
        segments.push({
            positions: path.slice(pickupIndex, seg2End + 1)
                .filter(p => p.lat !== undefined && p.lng !== undefined)
                .map(p => [p.lat, p.lng]),
            color: 'red'
        });
    }

    // 3. Dropoff -> End (Blue)
    if (dropoffIndex !== -1) {
        let seg3End = endIndex !== -1 ? endIndex : path.length - 1;
        segments.push({
            positions: path.slice(dropoffIndex, seg3End + 1)
                .filter(p => p.lat !== undefined && p.lng !== undefined)
                .map(p => [p.lat, p.lng]),
            color: 'blue'
        });
    }

    const getEventColor = (type) => {
        switch (type) {
            case 'START': return 'green';
            case 'PICKUP': return 'blue';
            case 'DROPOFF': return 'red';
            case 'END': return 'black';
            default: return 'gray';
        }
    };

    return (
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {location && location.lat !== undefined && location.lng !== undefined && (
                <>
                    <Marker position={[location.lat, location.lng]} icon={carIcon}>
                        <Popup>
                            Current Location <br />
                            Lat: {location.lat.toFixed(4)} <br />
                            Lng: {location.lng.toFixed(4)}
                        </Popup>
                    </Marker>
                    <RecenterMap location={location} path={path} />
                </>
            )}

            {/* Render Segments */}
            {segments.map((seg, i) => (
                seg.positions.length > 1 && (
                    <Polyline key={`seg-${i}`} positions={seg.positions} color={seg.color} />
                )
            ))}

            {/* Render Event Markers */}
            {path.map((point, index) => (
                point.event_type && point.lat !== undefined && point.lng !== undefined ? (
                    <CircleMarker
                        key={`event-${index}`}
                        center={[point.lat, point.lng]}
                        pathOptions={{ color: getEventColor(point.event_type), fillColor: getEventColor(point.event_type), fillOpacity: 0.8 }}
                        radius={6}
                    >
                        <Popup>
                            Event: {point.event_type} <br />
                            Lat: {point.lat.toFixed(4)} <br />
                            Lng: {point.lng.toFixed(4)}
                        </Popup>
                    </CircleMarker>
                ) : null
            ))}
        </MapContainer>
    );
};

export default MapComponent;
