// src/components/MapDisplay.tsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type L from 'leaflet'; // Import Leaflet type
import 'leaflet/dist/leaflet.css';


interface DriverIconProps { color?: string; size?: number | string; className?: string; }
const DriverIcon: React.FC<DriverIconProps> = ({ color = 'currentColor', size = 24, className = '' }) => (
<svg
  xmlns="http://www.w3.org/2000/svg"
  fill={color}
  stroke="black"
  strokeWidth="1.2"
  viewBox="0 0 24 24"
  style={{ width: size, height: size }}
  className={className}
>
  <path
    fillRule="evenodd"
    d="M12 2.25c-4.28 0-7.75 3.47-7.75 7.75 0 6.21 7.17 11.27 7.48 11.47a.75.75 0 0 0 .54.03c.31-.1 7.48-5.26 7.48-11.5 0-4.28-3.47-7.75-7.75-7.75Zm0 10.5a2.75 2.75 0 1 1 0-5.5 2.75 2.75 0 0 1 0 5.5Z"
    clipRule="evenodd"
  />
</svg>

  
);

export interface LocationData { id: string; latitude: number; longitude: number; driverName?: string; timestamp?: string; route?: string; email?: string; }
interface MapDisplayProps { locations: LocationData[]; colors: { [id: string]: string }; center?: [number, number]; zoom?: number; currentDriverId?: string; fitBounds?: boolean; }

let Leaflet: typeof L | null = null;
let ReactDOMServer: typeof import('react-dom/server') | null = null;
let DefaultIcon: L.Icon | null = null;

const MapDisplay: React.FC<MapDisplayProps> = ({ locations, colors, center = [20.5937, 78.9629], zoom = 5, currentDriverId, fitBounds = false }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<{ [key: string]: L.Marker }>({});
    const [leafletReady, setLeafletReady] = useState(false); // Track Leaflet loading
    const [RDServerReady, setRDServerReady] = useState(false);
    const [defaultIconReady, setDefaultIconReady] = useState(false); // Track DefaultIcon readiness

    useEffect(() => {

        const loadLeaflet = async () => {
            try {
                const [LModule, RDServer, iconRetinaUrl, iconUrl, shadowUrl] = await Promise.all([
                    import('leaflet'),
                    import('react-dom/server'),
                    import('leaflet/dist/images/marker-icon-2x.png'),
                    import('leaflet/dist/images/marker-icon.png'),
                    import('leaflet/dist/images/marker-shadow.png'),
                ]);

                Leaflet = LModule.default;
                ReactDOMServer = RDServer;

                DefaultIcon = Leaflet.icon({
                    iconRetinaUrl: iconRetinaUrl.default,
                    iconUrl: iconUrl.default,
                    shadowUrl: shadowUrl.default,
                    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
                    tooltipAnchor: [16, -28], shadowSize: [41, 41],
                });

                // Setting ready state
                setLeafletReady(true);
                setRDServerReady(true);
                setDefaultIconReady(true); // Set DefaultIcon readiness
                console.log("MapDisplay: Leaflet and ReactDOMServer loaded successfully.");

            } catch (error) {
                console.error("MapDisplay: Failed to load Leaflet or ReactDOMServer:", error);
            }
        };

        loadLeaflet();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            markersRef.current = {};
        };
    }, []);

    const createDriverDivIcon = useCallback((color: string): L.DivIcon | null => {
        if (!Leaflet || !ReactDOMServer || !RDServerReady) {
            console.warn("MapDisplay: Cannot create DriverDivIcon - Leaflet/ReactDOMServer not loaded.");
            return null;
        }
        try {
            const iconHtml = ReactDOMServer.renderToString(<DriverIcon color={color} size={60} />);
            return Leaflet.divIcon({ html: iconHtml, className: '', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30] });
        } catch (error) {
            console.error("MapDisplay: Error rendering icon for Leaflet:", error);
            return null;
        }
    }, [RDServerReady]);

    const locationMap = useMemo(() => {
        const map = new Map<string, LocationData>();
        locations.forEach(loc => map.set(loc.id, loc));
        return map;
    }, [locations]);

    useEffect(() => {
        if (!leafletReady || !mapContainerRef.current || mapRef.current) {
            return; // Leaflet not ready or map already initialized
        }

        console.log("MapDisplay: Initializing Leaflet Map...");
        let map: L.Map | null = null; // Temporary variable
        try {
            if (!Leaflet) {
                throw new Error('Leaflet is not initialized');
            }
            map = Leaflet.map(mapContainerRef.current).setView(center, zoom);
            mapRef.current = map; // Store the map instance in the ref

            Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
            }).addTo(map);

        } catch (error) {
            console.error("Error initializing map:", error);
            return;
        }
    }, [leafletReady, center, zoom]);

    useEffect(() => {
        if (!leafletReady || !defaultIconReady || !mapRef.current || !ReactDOMServer) {
            return;
        }

        if (!Leaflet) return;

        const map = mapRef.current;
        const currentMarkers = markersRef.current;
        const displayedMarkerIds = new Set(Object.keys(currentMarkers));
        const bounds = Leaflet.latLngBounds([]);
        let hasValidLocations = false;  // Flag to check for valid locations

        locationMap.forEach((location, id) => {
            const { latitude, longitude, driverName, timestamp } = location;
            if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
                console.warn(`MapDisplay: Invalid coordinates for location ID ${id}`);
                return;
            }
            const latLng: L.LatLngTuple = [latitude, longitude];
            const popupContent = `<b>${driverName || `Driver ${id.substring(0, 6)}`}</b><br/>${timestamp ? `Last Seen: ${new Date(timestamp).toLocaleString()}` : ''}${currentDriverId === id ? '<br/><i>(You)</i>' : ''}`;

            const driverColor = colors[id];
            const customIcon = createDriverDivIcon(driverColor);
            const markerIcon = customIcon || DefaultIcon;

            if (currentMarkers[id] && markerIcon) {
                currentMarkers[id].setLatLng(latLng).setPopupContent(popupContent).setIcon(markerIcon);
            } else if (Leaflet && markerIcon) {
                const marker = Leaflet.marker(latLng, { icon: markerIcon }).addTo(map).bindPopup(popupContent);
                currentMarkers[id] = marker;
            }
            displayedMarkerIds.delete(id);
            bounds.extend(latLng);  // Extend bounds for valid locations
            hasValidLocations = true;

        });

        displayedMarkerIds.forEach((idToRemove) => {
            if (currentMarkers[idToRemove]) {
                map.removeLayer(currentMarkers[idToRemove]);
                delete currentMarkers[idToRemove];
            }
        });

        if (fitBounds && hasValidLocations && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (fitBounds && locationMap.size === 1) {
            locationMap.forEach(loc => map.setView([loc.latitude, loc.longitude], 15));
        }
    }, [leafletReady, defaultIconReady, locationMap, currentDriverId, fitBounds, colors, createDriverDivIcon]);

    useEffect(() => {
        if (currentDriverId && leafletReady && mapRef.current) {
            const driverLocation = locationMap.get(currentDriverId);
            if (driverLocation) {
                mapRef.current.flyTo([driverLocation.latitude, driverLocation.longitude], 15);
            }
        }
    }, [currentDriverId, locationMap, leafletReady]);

    const zoomToCurrentLocation = () => {
        if (currentDriverId && leafletReady && mapRef.current) {
            const driverLocation = locationMap.get(currentDriverId);
            if (driverLocation) {
                mapRef.current.flyTo([driverLocation.latitude, driverLocation.longitude], 15);
            }
        }
    };

    return (
        <div ref={mapContainerRef} className="h-full w-full bg-gray-300 relative">
            {!leafletReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-300 bg-opacity-50">
                    Loading Map...
                </div>
            )}
            {leafletReady && mapRef.current && (
                <button className="absolute top-2 left-2 bg-white bg-opacity-75 hover:bg-opacity-90 text-gray-700 rounded p-2 shadow-md z-10" onClick={zoomToCurrentLocation}>
                    Zoom to Current Location
                </button>
            )}
        </div>
    );
};

export default MapDisplay;