// src/components/MapDisplay.tsx
import React, { useEffect, useRef, useMemo, useState } from 'react';
import type L from 'leaflet'; // Import Leaflet type
import 'leaflet/dist/leaflet.css';

interface DriverIconProps { color?: string; size?: number | string; className?: string; }
const DriverIcon: React.FC<DriverIconProps> = ({ color = 'currentColor', size = 24, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={color} style={{ width: size, height: size }} className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
);

export interface LocationData { id: string; latitude: number; longitude: number; driverName?: string; timestamp?: string; route?: string; email?: string; }
interface MapDisplayProps { locations: LocationData[]; colors: { [id: string]: string }; center?: [number, number]; zoom?: number; currentDriverId?: string; fitBounds?: boolean; }

let Leaflet: typeof L | null = null;
let DefaultIcon: L.Icon | null = null;
let ReactDOMServer: typeof import('react-dom/server') | null = null;

const MapDisplay: React.FC<MapDisplayProps> = ({ locations, colors, center = [20.5937, 78.9629], zoom = 5, currentDriverId, fitBounds = false }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<{ [key: string]: L.Marker }>({});
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        console.log("MapDisplay: Component mounted, attempting to load Leaflet.");

        Promise.all([
            import('leaflet'),
            import('react-dom/server'),
            import('leaflet/dist/images/marker-icon-2x.png'),
            import('leaflet/dist/images/marker-icon.png'),
            import('leaflet/dist/images/marker-shadow.png'),
        ]).then(([LModule, RDServer, iconRetinaUrl, iconUrl, shadowUrl]) => {
            console.log("MapDisplay: Leaflet and ReactDOMServer loaded successfully.");
            Leaflet = LModule.default;
            ReactDOMServer = RDServer;

            DefaultIcon = Leaflet.icon({
                iconRetinaUrl: iconRetinaUrl.default,
                iconUrl: iconUrl.default,
                shadowUrl: shadowUrl.default,
                iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
                tooltipAnchor: [16, -28], shadowSize: [41, 41],
            });

            // Force a re-render if needed after Leaflet is loaded (though the map init useEffect should handle it)
        }).catch(error => {
            console.error("MapDisplay: Failed to load Leaflet or ReactDOMServer:", error);
        });
    }, []);

    const createDriverDivIcon = (color: string): L.DivIcon | null => {
        if (!Leaflet || !ReactDOMServer || !isClient) {
            console.warn("MapDisplay: Cannot create DriverDivIcon - Leaflet/ReactDOMServer not loaded.");
            return null;
        }
        try {
            const iconHtml = ReactDOMServer.renderToString(<DriverIcon color={color} size={30} />);
            return Leaflet.divIcon({ html: iconHtml, className: '', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30] });
        } catch (error) {
            console.error("MapDisplay: Error rendering icon for Leaflet:", error);
            return null;
        }
    };

    const locationMap = useMemo(() => {
        const map = new Map<string, LocationData>();
        locations.forEach(loc => map.set(loc.id, loc));
        return map;
    }, [locations]);

    useEffect(() => {
        if (!isClient || !Leaflet || !mapContainerRef.current || mapRef.current) {
            // console.log("MapDisplay: Map initialization skipped - dependencies not ready:", { isClient, Leaflet, mapContainerRef: !!mapContainerRef.current, mapRef: !!mapRef.current });
            return;
        }

        console.log("MapDisplay: Initializing Leaflet Map...");
        const map = Leaflet.map(mapContainerRef.current).setView(center, zoom);
        mapRef.current = map; // Store the map instance in the ref

        Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(map);

        return () => {
            console.log("MapDisplay: Removing Leaflet Map...");
            mapRef.current?.remove();
            mapRef.current = null;
            markersRef.current = {};
        };
    }, [isClient, center, zoom]);

    useEffect(() => {
        if (!isClient || !Leaflet || !DefaultIcon || !mapRef.current || !ReactDOMServer) {
            return;
        }

        const map = mapRef.current;
        const currentMarkers = markersRef.current;
        const displayedMarkerIds = new Set(Object.keys(currentMarkers));
        const bounds = Leaflet.latLngBounds([]);

        locationMap.forEach((location, id) => {
            const { latitude, longitude, driverName, timestamp } = location;
            if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
                console.warn(`MapDisplay: Invalid coordinates for location ID ${id}`);
                return;
            }
            const latLng: L.LatLngTuple = [latitude, longitude];
            const popupContent = `<b>${driverName || `Driver ${id.substring(0, 6)}`}</b><br/>${timestamp ? `Last Seen: ${new Date(timestamp).toLocaleString()}` : ''}${currentDriverId === id ? '<br/><i>(You)</i>' : ''}`;

            const driverColor = colors[id];
            const customIcon = driverColor ? createDriverDivIcon(driverColor) : null;
            const markerIcon = customIcon || DefaultIcon;

            if (currentMarkers[id] && markerIcon) {
                currentMarkers[id].setLatLng(latLng).setPopupContent(popupContent).setIcon(markerIcon);
            } else if (Leaflet && markerIcon) {
                const marker = Leaflet.marker(latLng, { icon: markerIcon }).addTo(map).bindPopup(popupContent);
                currentMarkers[id] = marker;
            }
            displayedMarkerIds.delete(id);
            if (fitBounds) bounds.extend(latLng);
        });

        displayedMarkerIds.forEach((idToRemove) => {
            if (currentMarkers[idToRemove]) {
                map.removeLayer(currentMarkers[idToRemove]);
                delete currentMarkers[idToRemove];
            }
        });

        if (fitBounds && bounds.isValid() && locationMap.size > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (locationMap.size === 1 && fitBounds) {
            locationMap.forEach(loc => map.setView([loc.latitude, loc.longitude], 15));
        }
    }, [isClient, locationMap, currentDriverId, fitBounds, colors]);

    useEffect(() => {
        if (currentDriverId && Leaflet && mapRef.current) {
            const driverLocation = locationMap.get(currentDriverId);
            if (driverLocation) {
                mapRef.current.flyTo([driverLocation.latitude, driverLocation.longitude], 15);
            }
        }
    }, [currentDriverId, locationMap, Leaflet]);

    const zoomToCurrentLocation = () => {
        if (currentDriverId && Leaflet && mapRef.current) {
            const driverLocation = locationMap.get(currentDriverId);
            if (driverLocation) {
                mapRef.current.flyTo([driverLocation.latitude, driverLocation.longitude], 15);
            }
        }
    };

    return (
        <div ref={mapContainerRef} className="h-full w-full bg-gray-300 relative">
            {!isClient && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-300 bg-opacity-50">
                    Loading Map...
                </div>
            )}
            {isClient && Leaflet && mapRef.current && (
                <button className="absolute top-2 left-2 bg-white bg-opacity-75 hover:bg-opacity-90 text-gray-700 rounded p-2 shadow-md z-10" onClick={zoomToCurrentLocation}>
                    Zoom to Current Location
                </button>
            )}
        </div>
    );
};

export default MapDisplay;