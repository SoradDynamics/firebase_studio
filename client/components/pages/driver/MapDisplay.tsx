// src/components/MapDisplay.tsx
import React, { useEffect, useRef, useMemo, MutableRefObject } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ReactDOMServer from 'react-dom/server';

// --- Define DriverIcon directly inside MapDisplay ---
interface DriverIconProps { color?: string; size?: number | string; className?: string; }
const DriverIcon: React.FC<DriverIconProps> = ({ color = 'currentColor', size = 24, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={color} style={{ width: size, height: size }} className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
);
// --- End of inline DriverIcon definition ---

// Fix default Leaflet icon issue
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({ iconRetinaUrl, iconUrl, shadowUrl, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], tooltipAnchor: [16, -28], shadowSize: [41, 41] });

export interface LocationData { id: string; latitude: number; longitude: number; driverName?: string; timestamp?: string; route?: string; email?: string; }
export type CurrentUserLocation = { latitude: number; longitude: number } | null;

interface MapDisplayProps {
    locations: LocationData[];
    colors: { [id: string]: string };
    currentUserLocation: CurrentUserLocation;
    mapRefProp?: MutableRefObject<L.Map | null>;
    center?: [number, number];
    zoom?: number;
    currentDriverId?: string;
    fitBounds?: boolean;
}

const MapDisplay: React.FC<MapDisplayProps> = ({ locations, colors, currentUserLocation, mapRefProp, center = [20.5937, 78.9629], zoom = 5, currentDriverId, fitBounds = false }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const localMapRef = useRef<L.Map | null>(null);
    const driverMarkersRef = useRef<{ [key: string]: L.Marker }>({});
    const currentUserMarkerRef = useRef<L.CircleMarker | null>(null);

    const createDriverDivIcon = (color: string): L.DivIcon => {
        const iconHtml = ReactDOMServer.renderToString(<DriverIcon color={color} size={30} />);
        return L.divIcon({ html: iconHtml, className: '', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30] });
    };

    const locationMap = useMemo(() => {
        const map = new Map<string, LocationData>();
        locations.forEach(loc => loc && loc.id && map.set(loc.id, loc));
        return map;
    }, [locations]);

    useEffect(() => {
        if (mapContainerRef.current && !localMapRef.current) {
            const mapInstance = L.map(mapContainerRef.current).setView(center, zoom);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }).addTo(mapInstance);
            localMapRef.current = mapInstance;
            if (mapRefProp) mapRefProp.current = mapInstance;
        }
        return () => {
            if (mapRefProp) mapRefProp.current = null;
            localMapRef.current?.remove();
            localMapRef.current = null;
            driverMarkersRef.current = {};
            currentUserMarkerRef.current = null;
        };
    }, [center, zoom, mapRefProp]);

    useEffect(() => { // Update Driver Markers
        if (!localMapRef.current) return;
        const map = localMapRef.current;
        const currentMarkers = driverMarkersRef.current;
        const displayedMarkerIds = new Set(Object.keys(currentMarkers));
        const bounds = L.latLngBounds([]);

        locationMap.forEach((location, id) => {
            const { latitude, longitude, driverName, timestamp } = location;
            if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) { console.warn(`MapDisplay: Invalid coords for driver ${id}.`); return; }
            const latLng: L.LatLngTuple = [latitude, longitude];
            const popupContent = `<b>${driverName || `Driver ${id.substring(0, 6)}`}</b><br/>${timestamp ? `Last Seen: ${new Date(timestamp).toLocaleString()}` : ''}${currentDriverId === id ? '<br/><i>(You)</i>' : ''}`;
            const driverColor = colors[id];
            const markerIcon = driverColor ? createDriverDivIcon(driverColor) : DefaultIcon;

            if (currentMarkers[id]) {
                currentMarkers[id].setLatLng(latLng).setPopupContent(popupContent).setIcon(markerIcon);
            } else {
                currentMarkers[id] = L.marker(latLng, { icon: markerIcon }).addTo(map).bindPopup(popupContent);
            }
            displayedMarkerIds.delete(id);
            if (fitBounds) bounds.extend(latLng);
        });

        displayedMarkerIds.forEach((idToRemove) => { if (currentMarkers[idToRemove]) { map.removeLayer(currentMarkers[idToRemove]); delete currentMarkers[idToRemove]; } });

        // Adjust map view - use timeout to avoid race conditions on initial load
        const fitBoundsTimer = setTimeout(() => {
             if (!localMapRef.current) return; // Check map exists inside timeout
             if (fitBounds && bounds.isValid() && locationMap.size > 0) {
                 localMapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
             } else if (locationMap.size === 1 && fitBounds) {
                 locationMap.forEach(loc => localMapRef.current!.setView([loc.latitude, loc.longitude], 16));
             }
         }, 100);

         return () => clearTimeout(fitBoundsTimer); // Cleanup timer

    }, [locationMap, currentDriverId, fitBounds, colors]);

    useEffect(() => { // Update Current User Marker
        if (!localMapRef.current) return;
        const map = localMapRef.current;
        const markerOptions: L.CircleMarkerOptions = { radius: 7, fillColor: "#2563eb", color: "#ffffff", weight: 2, opacity: 1, fillOpacity: 0.9 };

        if (currentUserLocation) {
            const userLatLng: L.LatLngTuple = [currentUserLocation.latitude, currentUserLocation.longitude];
            if (currentUserMarkerRef.current) {
                currentUserMarkerRef.current.setLatLng(userLatLng);
            } else {
                currentUserMarkerRef.current = L.circleMarker(userLatLng, markerOptions).bindPopup("Your Location").addTo(map);
            }
        } else {
            if (currentUserMarkerRef.current) { map.removeLayer(currentUserMarkerRef.current); currentUserMarkerRef.current = null; }
        }
    }, [currentUserLocation]);

    return <div ref={mapContainerRef} className="h-full w-full bg-gray-300" />;
};

export default MapDisplay;