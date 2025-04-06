// src/components/StudentComponent.tsx
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense, useMemo } from 'react';
import client, { databases } from '~/utils/appwrite';
import { LocationData, CurrentUserLocation } from '../../driver/MapDisplay'; // Adjust path if needed
import { Models } from 'appwrite';
import L from 'leaflet'; // Import Leaflet type for mapRef

// --- Define DriverIcon directly ---
interface DriverIconProps { color?: string; size?: number | string; className?: string; }
const DriverIcon: React.FC<DriverIconProps> = ({ color = 'currentColor', size = 24, className = '' }) => (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={color} style={{ width: size, height: size }} className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
);
// --- End of inline DriverIcon definition ---

// --- Define generateColorFromId directly ---
function generateColorFromId(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) { hash = id.charCodeAt(i) + ((hash << 5) - hash); hash = hash & hash; }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
}
// --- End of inline generateColorFromId definition ---

// Dynamically import MapDisplay - ADJUST PATH IF NEEDED
const LazyMapDisplay = lazy(() => import('../../driver/MapDisplay'));

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_DRIVER_COLLECTION_ID;

type DriverDoc = Models.Document & { driverId: string; driverName: string; latitude: string; longitude: string; timestamp: string; route?: string; email: string; };

const StudentComponent: React.FC = () => {
    // State
    const [locations, setLocations] = useState<LocationData[]>([]); // Driver locations
    const [driverColors, setDriverColors] = useState<{ [id: string]: string }>({}); // Driver colors
    const [studentCurrentLocation, setStudentCurrentLocation] = useState<CurrentUserLocation>(null); // Student's own location
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("Initializing...");

    // Refs
    const isMountedRef = useRef<boolean>(true);
    const studentWatchIdRef = useRef<number | null>(null); // Student's geolocation watch
    const mapRef = useRef<L.Map | null>(null); // Ref for Leaflet map instance

    // --- Callback to update driver colors map ---
    const updateDriverColors = useCallback((locationsToUpdate: LocationData[]) => {
        setDriverColors(prevColors => {
            let needsUpdate = false;
            const newColors = { ...prevColors };
            locationsToUpdate.forEach(loc => {
                if (loc && loc.id && !newColors[loc.id]) { newColors[loc.id] = generateColorFromId(loc.id); needsUpdate = true; }
            });
            return needsUpdate ? newColors : prevColors;
        });
    }, []);

    // --- Effect for Mount/Unmount and Student Geolocation Cleanup ---
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (studentWatchIdRef.current !== null) { navigator.geolocation.clearWatch(studentWatchIdRef.current); studentWatchIdRef.current = null; console.log("Student geolocation watch cleared."); }
        };
    }, []);

     // --- Effect for Student's Own Geolocation ---
     useEffect(() => {
        if (!navigator.geolocation) {
            if (isMountedRef.current && !error?.includes("Geolocation API")) { setError("Geolocation API not supported."); setStatus("Error - No Geolocation API"); }
             return;
        }
        if (studentWatchIdRef.current !== null) navigator.geolocation.clearWatch(studentWatchIdRef.current);

        const successCallback: PositionCallback = (position) => {
            if (!isMountedRef.current) return;
            const { latitude, longitude } = position.coords;
            setStudentCurrentLocation({ latitude, longitude });
            if (error?.startsWith("Your Location Error") || error?.startsWith("Permission denied")) setError(null);
        };
        const errorCallback: PositionErrorCallback = (error) => {
            if (!isMountedRef.current) return;
            setStudentCurrentLocation(null);
            console.error("Student Geolocation error:", error);
            let message = `Your Location Error: ${error.message} (Code ${error.code})`;
            if (error.code === 1) message = "Permission denied for your location.";
            if (!status.includes('Error - Subscription') && !status.includes('Error - Load')) { setError(message); } // Avoid overwriting driver load errors
        };
        const options: PositionOptions = { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 };

        try {
            console.log("Attempting to start student location watch...");
            studentWatchIdRef.current = navigator.geolocation.watchPosition(successCallback, errorCallback, options);
            console.log("Started student watch:", studentWatchIdRef.current);
        } catch (err) {
            console.error("Error starting student watch:", err);
             if (isMountedRef.current && !status.includes('Error - Subscription')) { setError("Failed to get your location."); }
        }
    }, [error, status]); // Dependencies to re-check permissions/errors

    // --- Effect to Fetch Drivers & Subscribe ---
    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        // Ensure route and email are parsed
        const parseAndValidateLocation = (doc: DriverDoc): LocationData | null => {
            const lat = parseFloat(doc.latitude); const lon = parseFloat(doc.longitude);
            if (isNaN(lat) || isNaN(lon)) { console.warn(`Student View: Invalid coords in doc ${doc.$id}.`); return null; }
            return { id: doc.$id, latitude: lat, longitude: lon, driverName: doc.driverName, timestamp: doc.timestamp, route: doc.route, email: doc.email };
        };

        const fetchAndSubscribe = async () => {
            if (!isMountedRef.current) return;
            setStatus("Fetching drivers..."); setError(null);
            try {
                const response = await databases.listDocuments<DriverDoc>(DATABASE_ID, COLLECTION_ID);
                if (!isMountedRef.current) return;
                const initialValidLocations: LocationData[] = response.documents.map(parseAndValidateLocation).filter((loc): loc is LocationData => loc !== null);
                setLocations(initialValidLocations);
                updateDriverColors(initialValidLocations);
                setStatus("Drivers loaded. Subscribing...");

                const channel = `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents`;
                console.log("Student subscribing to channel:", channel);
                unsubscribe = client.subscribe(channel, (response) => {
                    if (!isMountedRef.current) return;
                    const changedDoc = response.payload as DriverDoc; const locationId = changedDoc.$id; const event = response.events[0];
                    let processedLocation: LocationData | null = null;
                    if (event.includes('.create') || event.includes('.update')) processedLocation = parseAndValidateLocation(changedDoc);

                    // Update locations state
                    setLocations(prev => {
                        let newState = prev;
                        if (event.includes('.delete')) { newState = prev.filter(loc => loc && loc.id !== locationId); }
                        else if (processedLocation) {
                            const idx = prev.findIndex(loc => loc && loc.id === locationId);
                            if (idx > -1) { newState = [...prev]; newState[idx] = processedLocation; }
                            else { newState = [...prev, processedLocation]; }
                        }
                        return newState;
                    });

                    // Update colors map
                    if (processedLocation) updateDriverColors([processedLocation]);
                    else if (event.includes('.delete')) setDriverColors(c => { if (c[locationId]) { const n = { ...c }; delete n[locationId]; return n; } return c; });
                });
                console.log(`Student subscription successful for '${COLLECTION_ID}'.`);
                setStatus("Live updates enabled.");

            } catch (err: any) {
                console.error("Student Error fetching/subscribing:", err);
                if (err.code === 1003) setError(`Subscription Failed: Invalid channel/permissions? (DB: ${DATABASE_ID}, Coll: ${COLLECTION_ID})`);
                else setError(`Load/Subscribe Error: ${err.message}`);
                if (isMountedRef.current) setStatus("Error - Subscription");
            }
        };
        fetchAndSubscribe();
        return () => { if (unsubscribe) { unsubscribe(); console.log("Student subscription closed."); } };
    }, [DATABASE_ID, COLLECTION_ID, updateDriverColors]);

    // --- Fallback UI for Lazy Map ---
    const MapLoadingFallback = () => (
        <div className="h-full w-full flex items-center justify-center bg-gray-200 animate-pulse">
            <p className="text-gray-500 font-medium">Loading Map...</p>
        </div>
    );

    // --- Memoized Sorted Driver List ---
    const sortedDrivers = useMemo(() => [...locations].sort((a, b) => (a?.driverName || '').localeCompare(b?.driverName || '')), [locations]);

    // --- "Zoom to Me" Handler ---
    const handleZoomToSelf = () => {
        if (studentCurrentLocation && mapRef.current) {
            mapRef.current.setView([studentCurrentLocation.latitude, studentCurrentLocation.longitude], 16);
        } else if (!studentCurrentLocation) {
            setError("Your current location is not available yet.");
            setTimeout(() => setError(null), 3000);
        }
    };

    // --- Render UI ---
    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-100">
            {/* Left Panel: Info & List */}
            <div className="w-full md:w-72 lg:w-80 p-3 border-b md:border-b-0 md:border-r border-gray-300 overflow-y-auto flex-shrink-0 bg-white shadow-lg md:shadow-none">
                 {/* Student Info Box */}
                 <div className="p-3 bg-green-50 border border-green-200 mb-4 rounded-md shadow-sm">
                     <h2 className="text-base font-semibold text-green-800 mb-1">Student View</h2>
                     <p className="text-xs mt-1">Status: <span className={`font-medium ${error ? 'text-red-700' : status.includes('Error') ? 'text-red-700' : status.includes('enabled') ? 'text-green-700' : 'text-blue-700'}`}>{status}</span></p>
                     {error && <p className="text-red-700 bg-red-100 p-1.5 rounded text-xs mt-1.5 font-medium">Error: {error}</p>}
                 </div>
                 {/* Active Drivers List */}
                 <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                     <h3 className="text-sm font-semibold p-2 bg-gray-50 border-b border-gray-200 text-gray-700 sticky top-0">Active Drivers</h3>
                     {sortedDrivers.length === 0 ? ( <div className="p-4 text-center text-gray-400 text-sm">No drivers visible.</div> ) : (
                         <ul className="divide-y divide-gray-200 max-h-[calc(100vh-200px)] md:max-h-[calc(100vh-160px)] overflow-y-auto">
                             {sortedDrivers.map((driver) => (
                                 <li key={driver.id} className="p-2.5 flex items-center space-x-2 hover:bg-gray-50 transition-colors duration-150">
                                     <div className="flex-shrink-0 pt-0.5"><DriverIcon color={driverColors[driver.id] || '#888888'} size={18} /></div>
                                     <div className="flex-1 min-w-0">
                                         <p className="text-xs font-medium text-gray-900 truncate">{driver.driverName || `Driver ${driver.id.substring(0,6)}`}</p>
                                         {driver.route && (<p className="text-xs text-gray-500 truncate">Route: {driver.route}</p>)}
                                     </div>
                                 </li>
                             ))}
                         </ul>
                     )}
                 </div>
            </div>

            {/* Right Panel: Map Area */}
            <div className="flex-grow bg-gray-300 relative">
                <Suspense fallback={<MapLoadingFallback />}>
                    <LazyMapDisplay
                        locations={locations} // Driver locations
                        colors={driverColors} // Driver colors
                        currentUserLocation={studentCurrentLocation} // Student's own location
                        mapRefProp={mapRef} // Pass ref for map instance
                        fitBounds={!studentCurrentLocation} // Fit drivers only if student location unknown
                        // No currentDriverId highlighting needed
                    />
                </Suspense>
                {/* Zoom to Me Button */}
                 <button onClick={handleZoomToSelf} disabled={!studentCurrentLocation} className="absolute bottom-4 right-4 z-[1000] bg-white p-2 rounded-full shadow-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Zoom to my location">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0-3-3m3 3 3-3m-8.25 6a4.5 4.5 0 0 1-1.41-8.775 4.5 4.5 0 0 1 8.775 0 4.5 4.5 0 0 1-1.41 8.775H5.25Z" />
                     </svg>
                 </button>
            </div>
        </div>
    );
};

export default StudentComponent;