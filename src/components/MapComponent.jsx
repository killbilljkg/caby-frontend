import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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

// Component to recenter map when location changes
function RecenterMap({ location }) {
    const map = useMap();
    useEffect(() => {
        if (location && location.lat !== undefined && location.lng !== undefined) {
            map.setView([location.lat, location.lng]);
        }
    }, [location, map]);
    return null;
}

const MapComponent = ({ location, path }) => {
    const center = (location && location.lat !== undefined && location.lng !== undefined)
        ? [location.lat, location.lng]
        : [51.505, -0.09];

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
                    <RecenterMap location={location} />
                </>
            )}
            {path.length > 1 && (
                <Polyline positions={path.filter(p => p.lat !== undefined && p.lng !== undefined).map(p => [p.lat, p.lng])} color="blue" />
            )}
        </MapContainer>
    );
};

export default MapComponent;
