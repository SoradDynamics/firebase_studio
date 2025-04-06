// src/components/MapDisplay.tsx
import React, { useEffect, useRef, useMemo, useState } from 'react'; // Add useState
// Import Leaflet type only initially, load dynamically if possible (or handle check)
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Import server optionaly or check window before using
// import ReactDOMServer from 'react-dom/server'; // May need conditional import or usage

// --- Define DriverIcon directly inside MapDisplay ---
interface DriverIconProps {
    color?: string; size?: number | string; className?: string;
}
const DriverIcon: React.FC<DriverIconProps> = ({
    color = 'currentColor', size = 24, className = '',
}) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={1.5} stroke={color} style={{ width: size, height: size }}
            className={className}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
    );
};
// --- End of inline DriverIcon definition ---


// LocationData Interface
export interface LocationData {
    id: string; latitude: number; longitude: number; driverName?: string;
    timestamp?: string; route?: string; email?: string;
}

interface MapDisplayProps {
    locations: LocationData[];
    colors: { [id: string]: string };
    center?: [number, number]; zoom?: number; currentDriverId?: string; fitBounds?: boolean;
}

// Store Leaflet related variables that need to be client-side only
let Leaflet: typeof L | null = null;
let DefaultIcon: L.Icon | null = null;
let ReactDOMServer: typeof import('react-dom/server') | null = null;


const MapDisplay: React.FC<MapDisplayProps> = ({
    locations, colors, center = [20.5937, 78.9629], zoom = 5,
    currentDriverId, fitBounds = false,
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<{ [key: string]: L.Marker }>({});
    // State to track if client-side environment is ready
    const [isClient, setIsClient] = useState(false);

    // --- Load Leaflet and related client-side modules only on mount ---
    useEffect(() => {
        setIsClient(true); // Indicate client environment is ready

        // Dynamically import Leaflet and ReactDOMServer only on the client
        Promise.all([
             import('leaflet'),
             import('react-dom/server'),
             import('leaflet/dist/images/marker-icon-2x.png'),
             import('leaflet/dist/images/marker-icon.png'),
             import('leaflet/dist/images/marker-shadow.png'),
        ]).then(([LModule, RDServer, iconRetinaUrl, iconUrl, shadowUrl]) => {
            Leaflet = LModule.default; // Assign the default export
            ReactDOMServer = RDServer; // Assign the full module

            // Configure the default icon *after* Leaflet is loaded
            DefaultIcon = Leaflet.icon({
                iconRetinaUrl: iconRetinaUrl.default,
                iconUrl: iconUrl.default,
                shadowUrl: shadowUrl.default,
                iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
                tooltipAnchor: [16, -28], shadowSize: [41, 41],
            });

            // Force a re-render now that Leaflet is loaded, if needed,
            // though the map init useEffect should handle it.

        }).catch(error => {
            console.error("Failed to load Leaflet or ReactDOMServer:", error);
            // Handle error state if necessary
        });

    }, []); // Run only once on mount


    // --- Function to create custom DivIcon ---
    // This function now relies on Leaflet and ReactDOMServer being loaded
    const createDriverDivIcon = (color: string): L.DivIcon | null => {
        // Ensure both Leaflet and ReactDOMServer are loaded
        if (!Leaflet || !ReactDOMServer || !isClient) {
             return null; // Cannot create icon yet
        }
        try {
            const iconHtml = ReactDOMServer.renderToString(
                <DriverIcon color={color} size={30} />
            );
            return Leaflet.divIcon({
                html: iconHtml, className: '', iconSize: [30, 30],
                iconAnchor: [15, 30], popupAnchor: [0, -30]
            });
        } catch (error) {
            console.error("Error rendering icon for Leaflet:", error);
            return null; // Return null or a fallback if rendering fails
        }
    };

    const locationMap = useMemo(() => {
        const map = new Map<string, LocationData>();
        locations.forEach(loc => map.set(loc.id, loc));
        return map;
    }, [locations]);

    // Initialize Map (only runs on client after Leaflet is loaded)
    useEffect(() => {
        // Ensure we are on client, Leaflet is loaded, container exists, and map not yet created
        if (!isClient || !Leaflet || !mapContainerRef.current || mapRef.current) {
            return;
        }

        console.log("Initializing Leaflet Map...");
        mapRef.current = Leaflet.map(mapContainerRef.current).setView(center, zoom);
        Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(mapRef.current);

        // Cleanup function
        return () => {
            console.log("Removing Leaflet Map...");
            mapRef.current?.remove();
            mapRef.current = null;
            markersRef.current = {};
        };
    }, [isClient, center, zoom]); // Depend on isClient flag

    // --- Update Markers ---
    useEffect(() => {
        // Ensure client, Leaflet, DefaultIcon, map instance, and ReactDOMServer are ready
        if (!isClient || !Leaflet || !DefaultIcon || !mapRef.current || !ReactDOMServer) {
             // console.log("Map/Deps not ready for marker update", {isClient, Leaflet, DefaultIcon, mapExists: !!mapRef.current, ReactDOMServer});
            return;
        }

        const map = mapRef.current;
        const currentMarkers = markersRef.current;
        const displayedMarkerIds = new Set(Object.keys(currentMarkers));
        const bounds = Leaflet.latLngBounds([]);

        locationMap.forEach((location, id) => {
            const { latitude, longitude, driverName, timestamp } = location;
            if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
                console.warn(`Invalid coordinates for location ID ${id}`); return;
            }
            const latLng: L.LatLngTuple = [latitude, longitude];
            const popupContent = `<b>${driverName || `Driver ${id.substring(0, 6)}`}</b><br/>${timestamp ? `Last Seen: ${new Date(timestamp).toLocaleString()}` : ''}${currentDriverId === id ? '<br/><i>(You)</i>' : ''}`;

            const driverColor = colors[id];
            const customIcon = driverColor ? createDriverDivIcon(driverColor) : null;
            const markerIcon = customIcon || DefaultIcon; // Use custom if available, else default

            if (currentMarkers[id]) {
                currentMarkers[id].setLatLng(latLng).setPopupContent(popupContent).setIcon(markerIcon);
            } else {
                const marker = Leaflet.marker(latLng, { icon: markerIcon }).addTo(map).bindPopup(popupContent);
                currentMarkers[id] = marker;
            }
            displayedMarkerIds.delete(id);
            if (fitBounds) bounds.extend(latLng);
        });

        displayedMarkerIds.forEach((idToRemove) => {
            if (currentMarkers[idToRemove]) { map.removeLayer(currentMarkers[idToRemove]); delete currentMarkers[idToRemove]; }
        });

        if (fitBounds && bounds.isValid() && locationMap.size > 0) {
             map.fitBounds(bounds, { padding: [50, 50] });
        } else if (locationMap.size === 1 && fitBounds) {
            locationMap.forEach(loc => map.setView([loc.latitude, loc.longitude], 15));
        }
    }, [isClient, locationMap, currentDriverId, fitBounds, colors]); // Depend on isClient flag and other props

    // Render only the container div initially
    // Map initialization happens in useEffect after client check
    return (
        <div ref={mapContainerRef} className="h-full w-full bg-gray-300">
            {!isClient && ( // Optional: Show loading indicator until client is confirmed
                <div className="absolute inset-0 flex items-center justify-center bg-gray-300 bg-opacity-50">
                   Loading Map...
                </div>
            )}
        </div>
    );
};

export default MapDisplay;