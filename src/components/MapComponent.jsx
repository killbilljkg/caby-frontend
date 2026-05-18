import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const PALETTE = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#a855f7', '#14b8a6', '#eab308'];

export function colorForDriver(id) {
    let h = 2166136261 >>> 0;
    const s = String(id ?? '');
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return PALETTE[(h >>> 0) % PALETTE.length];
}

function bearing(lat1, lng1, lat2, lng2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;
    const f1 = toRad(lat1), f2 = toRad(lat2);
    const dl = toRad(lng2 - lng1);
    const y = Math.sin(dl) * Math.cos(f2);
    const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function carDivIcon({ color, heading = 0, selected = false, label = '', status = '' }) {
    const ring = selected ? `<div class="car-marker__ring" style="background:${color}33;border-color:${color}"></div>` : '';
    const labelHtml = (label || status)
        ? `<div class="car-marker__label" style="border-color:${color}"><span>${label}</span>${status ? `<em>${status}</em>` : ''}</div>`
        : '';
    // Top-down (overhead) car view. Front of car points UP at 0°; rotation handled by parent.
    return L.divIcon({
        html: `
            <div class="car-marker">
                ${ring}
                <div class="car-marker__svg" style="transform: rotate(${heading}deg);">
                    <svg viewBox="0 0 36 60" width="28" height="46" xmlns="http://www.w3.org/2000/svg">
                        <!-- side mirrors -->
                        <rect x="0" y="20" width="5" height="4" rx="1.2" fill="${color}" stroke="#111" stroke-width="0.8"/>
                        <rect x="31" y="20" width="5" height="4" rx="1.2" fill="${color}" stroke="#111" stroke-width="0.8"/>
                        <!-- wheels (front + rear, visible from above) -->
                        <rect x="2"  y="12" width="4" height="8"  rx="1.2" fill="#111"/>
                        <rect x="30" y="12" width="4" height="8"  rx="1.2" fill="#111"/>
                        <rect x="2"  y="40" width="4" height="8"  rx="1.2" fill="#111"/>
                        <rect x="30" y="40" width="4" height="8"  rx="1.2" fill="#111"/>
                        <!-- body -->
                        <rect x="5" y="4" width="26" height="52" rx="6" ry="7" fill="${color}" stroke="#111" stroke-width="1.2"/>
                        <!-- windshield (front, top) -->
                        <path d="M8 14 Q18 8 28 14 L26 22 Q18 19 10 22 Z" fill="#bfdbfe" stroke="#111" stroke-width="0.6" opacity="0.95"/>
                        <!-- rear window -->
                        <path d="M10 46 Q18 49 26 46 L28 54 Q18 56 8 54 Z" fill="#bfdbfe" stroke="#111" stroke-width="0.6" opacity="0.85"/>
                        <!-- roof seam -->
                        <line x1="18" y1="24" x2="18" y2="44" stroke="#111" stroke-width="0.4" opacity="0.4"/>
                        <!-- headlights (front - pointing up) -->
                        <rect x="8"  y="5" width="4" height="2" rx="0.8" fill="#fffbeb" stroke="#111" stroke-width="0.4"/>
                        <rect x="24" y="5" width="4" height="2" rx="0.8" fill="#fffbeb" stroke="#111" stroke-width="0.4"/>
                        <!-- tail lights (rear) -->
                        <rect x="8"  y="53" width="4" height="1.6" rx="0.6" fill="#dc2626" stroke="#111" stroke-width="0.3"/>
                        <rect x="24" y="53" width="4" height="1.6" rx="0.6" fill="#dc2626" stroke="#111" stroke-width="0.3"/>
                    </svg>
                </div>
                ${labelHtml}
            </div>`,
        className: 'car-divicon',
        iconSize: [28, 46],
        iconAnchor: [14, 23],
        popupAnchor: [0, -28],
    });
}

function FitMap({ drivers, path, selectedDriverId }) {
    const map = useMap();
    useEffect(() => {
        if (path && path.length > 1) {
            const pts = path.filter(p => p.lat != null && p.lng != null).map(p => [p.lat, p.lng]);
            if (pts.length) {
                const bounds = L.latLngBounds(pts);
                if (bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60] });
            }
            return;
        }
        if (!drivers || drivers.length === 0) return;
        const sel = selectedDriverId ? drivers.find(d => d.driverId === selectedDriverId) : null;
        if (sel && sel.lat != null) {
            map.setView([sel.lat, sel.lng], Math.max(map.getZoom(), 15));
            return;
        }
        const pts = drivers.filter(d => d.lat != null && d.lng != null).map(d => [d.lat, d.lng]);
        if (pts.length === 1) map.setView(pts[0], 15);
        else if (pts.length > 1) {
            const bounds = L.latLngBounds(pts);
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [80, 80] });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drivers?.length, selectedDriverId, path?.length]);
    return null;
}

function RecenterSingle({ location, path }) {
    const map = useMap();
    useEffect(() => {
        if (path && path.length > 0) {
            const bounds = L.latLngBounds(path.filter(p => p.lat != null && p.lng != null).map(p => [p.lat, p.lng]));
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
        } else if (location && location.lat != null) {
            map.setView([location.lat, location.lng]);
        }
    }, [location, path, map]);
    return null;
}

const fallbackCarIcon = L.icon({
    iconUrl: '/car.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
});

const MapComponent = ({ location, path = [], drivers = null, selectedDriverId = null, onDriverClick }) => {
    const initialCenter = useMemo(() => {
        if (location?.lat != null) return [location.lat, location.lng];
        if (drivers && drivers.length > 0 && drivers[0].lat != null) return [drivers[0].lat, drivers[0].lng];
        return [11.9823564, 75.3616223];
    }, [location, drivers]);

    const getEventIndex = (type) => path.findIndex(p => p.event_type === type);
    const startIndex = getEventIndex('START');
    const pickupIndex = getEventIndex('PICKUP');
    const dropoffIndex = getEventIndex('DROPOFF');
    const endIndex = getEventIndex('END');

    const segments = [];
    if (path.length > 0) {
        const s = startIndex !== -1 ? startIndex : 0;
        const e = pickupIndex !== -1 ? pickupIndex : path.length - 1;
        segments.push({
            positions: path.slice(s, e + 1).filter(p => p.lat != null && p.lng != null).map(p => [p.lat, p.lng]),
            color: 'blue',
        });
    }
    if (pickupIndex !== -1) {
        const e = dropoffIndex !== -1 ? dropoffIndex : path.length - 1;
        segments.push({
            positions: path.slice(pickupIndex, e + 1).filter(p => p.lat != null && p.lng != null).map(p => [p.lat, p.lng]),
            color: 'red',
        });
    }
    if (dropoffIndex !== -1) {
        const e = endIndex !== -1 ? endIndex : path.length - 1;
        segments.push({
            positions: path.slice(dropoffIndex, e + 1).filter(p => p.lat != null && p.lng != null).map(p => [p.lat, p.lng]),
            color: 'blue',
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

    const multiMode = Array.isArray(drivers);

    return (
        <MapContainer center={initialCenter} zoom={multiMode ? 13 : 15} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {multiMode ? (
                <>
                    {drivers.map((d) => {
                        if (d.lat == null || d.lng == null) return null;
                        const color = colorForDriver(d.driverId);
                        const heading = (d.heading != null)
                            ? d.heading
                            : (d.prevLat != null && d.prevLng != null && (d.prevLat !== d.lat || d.prevLng !== d.lng))
                                ? bearing(d.prevLat, d.prevLng, d.lat, d.lng)
                                : 0;
                        const isSel = selectedDriverId === d.driverId;
                        const statusText = d.status || (d.speed != null ? `${Math.round(d.speed)} km/h` : 'live');
                        return (
                            <Marker
                                key={d.driverId}
                                position={[d.lat, d.lng]}
                                icon={carDivIcon({
                                    color,
                                    heading,
                                    selected: isSel,
                                    label: d.driverName || `Driver ${d.driverId}`,
                                    status: statusText,
                                })}
                                eventHandlers={{ click: () => onDriverClick && onDriverClick(d) }}
                                zIndexOffset={isSel ? 1000 : 0}
                            >
                                <Tooltip direction="top" offset={[0, -28]} opacity={0.95}>
                                    <div style={{ minWidth: 140 }}>
                                        <div style={{ fontWeight: 700, color }}>{d.driverName || `Driver ${d.driverId}`}</div>
                                        <div style={{ fontSize: 12, color: '#555' }}>
                                            {d.vehicleNumber ? <>Vehicle: <b>{d.vehicleNumber}</b><br /></> : null}
                                            {d.status ? <>Status: <b>{d.status}</b><br /></> : null}
                                            {d.speed != null ? <>Speed: <b>{Math.round(d.speed)} km/h</b><br /></> : null}
                                        </div>
                                    </div>
                                </Tooltip>
                            </Marker>
                        );
                    })}
                    <FitMap drivers={drivers} path={path} selectedDriverId={selectedDriverId} />
                </>
            ) : (
                location && location.lat != null && (
                    <>
                        <Marker position={[location.lat, location.lng]} icon={fallbackCarIcon}>
                            <Popup>
                                Current Location <br />
                                Lat: {location.lat?.toFixed?.(4)} <br />
                                Lng: {location.lng?.toFixed?.(4)}
                            </Popup>
                        </Marker>
                        <RecenterSingle location={location} path={path} />
                    </>
                )
            )}

            {segments.map((seg, i) => (
                seg.positions.length > 1 && (
                    <Polyline key={`seg-${i}`} positions={seg.positions} color={seg.color} />
                )
            ))}

            {path.map((point, index) => (
                point.event_type && point.lat != null && point.lng != null ? (
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
