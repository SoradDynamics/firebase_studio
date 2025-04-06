// src/components/DriverComponent.tsx
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense, useMemo } from 'react';
import client, { databases, account, iD, Query } from '~/utils/appwrite';
import { LocationData, CurrentUserLocation } from './MapDisplay'; // Import types
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

const LazyMapDisplay = lazy(() => import('./MapDisplay'));

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_DRIVER_COLLECTION_ID;

type DriverDoc = Models.Document & { driverId: string; driverName: string; latitude: string; longitude: string; timestamp: string; route?: string; email: string; };

const DriverComponent: React.FC = () => {
    // State
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserAppwriteId, setCurrentUserAppwriteId] = useState<string | null>(null);
    const [driverDocId, setDriverDocId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("Initializing...");
    const [allLocations, setAllLocations] = useState<LocationData[]>([]);
    const [driverColors, setDriverColors] = useState<{ [id: string]: string }>({});
    const [driverCurrentLocation, setDriverCurrentLocation] = useState<CurrentUserLocation>(null);

    // Refs
    const watchIdRef = useRef<number | null>(null);
    const isUpdatingRef = useRef<boolean>(false);
    const isMountedRef = useRef<boolean>(true);
    const mapRef = useRef<L.Map | null>(null); // Ref for Leaflet map instance

    // --- Callback to update driver colors map ---
    const updateDriverColors = useCallback((locationsToUpdate: LocationData[]) => {
        setDriverColors(prevColors => {
            let needsUpdate = false;
            const newColors = { ...prevColors };
            locationsToUpdate.forEach(loc => {
                if (loc && loc.id && !newColors[loc.id]) {
                    newColors[loc.id] = generateColorFromId(loc.id);
                    needsUpdate = true;
                }
            });
            return needsUpdate ? newColors : prevColors;
        });
    }, []);

    // --- Effect for Mount/Unmount and Geolocation Cleanup ---
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; console.log("Driver geolocation watch cleared."); }
        };
    }, []);

    // --- Effect 1: Get Current Driver Info ---
    useEffect(() => {
        const fetchUser = async () => {
            if (!isMountedRef.current) return;
            setStatus("Fetching identity..."); setError(null);
            try {
                const user = await account.get();
                if (!isMountedRef.current) return;
                if (!user.email) throw new Error("Logged-in user missing email.");
                setCurrentUserEmail(user.email);
                setCurrentUserAppwriteId(user.$id);
                setCurrentUserName(user.name || `Driver ${user.$id.substring(0, 6)}`);
                setStatus("Identity OK. Locating document...");
            } catch (err: any) {
                console.error("Failed to get current user:", err);
                if (isMountedRef.current) { setError(`Identity Error: ${err.message || 'Login required?'}`); setStatus("Error - Identity"); }
            }
        };
        fetchUser();
    }, []);

    // --- Effect 2: Find Driver Document by Email ---
    const findDriverDocumentByEmail = useCallback(async (email: string, expectedName: string) => {
         if (!email || !isMountedRef.current) return;
         setStatus(`Searching document for ${email}...`); setError(null);
        try {
            const response = await databases.listDocuments<DriverDoc>(DATABASE_ID, COLLECTION_ID, [Query.equal('email', email), Query.limit(1)]);
            if (!isMountedRef.current) return;
            if (response.documents.length > 0) {
                const driverDoc = response.documents[0];
                setDriverDocId(driverDoc.$id);
                setStatus("Document found. Starting tracking.");
                console.log(`Found driver document: ${driverDoc.$id}`);
                if (driverDoc.driverName !== expectedName) { await databases.updateDocument(DATABASE_ID, COLLECTION_ID, driverDoc.$id, { driverName: expectedName }); }
            } else {
                console.error(`No document found in '${COLLECTION_ID}' for email: ${email}`);
                if (isMountedRef.current) { setError(`Config Error: No document for ${email}.`); setStatus("Error - Document Not Found"); }
            }
        } catch (err: any) {
            console.error("Error finding driver document:", err);
            if (isMountedRef.current) { setError(`DB Error: ${err.message || 'Failed to find document'}`); setStatus("Error - DB Search"); }
        }
    }, [DATABASE_ID, COLLECTION_ID]);

    useEffect(() => { if (currentUserEmail && currentUserName && !driverDocId) { findDriverDocumentByEmail(currentUserEmail, currentUserName); } }, [currentUserEmail, currentUserName, driverDocId, findDriverDocumentByEmail]);

    // --- Effect 3: Update Location in Appwrite ---
    const updateLocationInAppwrite = useCallback(async (latitude: number, longitude: number) => {
         if (!driverDocId || !isMountedRef.current || isUpdatingRef.current) return;
         isUpdatingRef.current = true;
        try {
            const dataToUpdate = { latitude: latitude.toString(), longitude: longitude.toString(), timestamp: new Date().toISOString() };
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID, driverDocId, dataToUpdate);
            if (isMountedRef.current) setStatus(prev => prev.startsWith("Geolocation Error") ? prev : `Location Updated: ${new Date().toLocaleTimeString()}`);
        } catch (err: any) {
            console.error(`Failed to update Appwrite doc ${driverDocId}:`, err);
            if (isMountedRef.current) setError(`Sync Error: ${err.message || 'Update failed'}`);
        } finally { isUpdatingRef.current = false; }
    }, [driverDocId, DATABASE_ID, COLLECTION_ID]);

    // --- Effect 4: Start Driver's Geolocation Tracking ---
    useEffect(() => {
        if (!driverDocId || !navigator.geolocation) return;
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);

        const successCallback: PositionCallback = (position) => {
            if (!isMountedRef.current) return;
            const { latitude, longitude } = position.coords;
            setError(null); setStatus("Tracking active...");
            updateLocationInAppwrite(latitude, longitude);

            const currentLoc = { latitude, longitude };
            setDriverCurrentLocation(currentLoc); // Update own location state

            const selfLocationData: LocationData = { id: driverDocId!, latitude, longitude, timestamp: new Date().toISOString(), driverName: currentUserName, email: currentUserEmail || undefined, /* route: ... */ };
            // Update allLocations state correctly
            setAllLocations(prev => {
                const idx = prev.findIndex(loc => loc.id === driverDocId);
                if (idx > -1) { const updated = [...prev]; updated[idx] = selfLocationData; return updated; }
                else { return [...prev, selfLocationData]; }
            });
            updateDriverColors([selfLocationData]); // Update colors
        };

        const errorCallback: PositionErrorCallback = (error) => {
             if (!isMountedRef.current) return;
             setDriverCurrentLocation(null); // Clear own location on error
             console.error("Driver Geolocation error:", error);
             let message = `Geolocation Error: ${error.message} (Code ${error.code})`;
             if (error.code === 1) message = "Geolocation permission denied.";
             if (error.code === 2) message = "Position unavailable (e.g., no signal).";
             if (error.code === 3) message = "Geolocation request timed out.";
             setError(message);
             setStatus("Geolocation Error");
        };

        const options: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 };

        setStatus("Starting location watch...");
        try {
            watchIdRef.current = navigator.geolocation.watchPosition(successCallback, errorCallback, options);
            if (isMountedRef.current) setStatus("Location watch active.");
            console.log("Started driver watch:", watchIdRef.current);
        } catch (err) {
            console.error("Error starting driver watch:", err);
            if (isMountedRef.current) { setError("Failed to start location tracking."); setStatus("Error - Watch Start"); }
        }
    }, [driverDocId, updateLocationInAppwrite, currentUserName, currentUserEmail, updateDriverColors]);

    // --- Effect 5: Fetch Initial & Subscribe to All Driver Locations ---
    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        // Ensure route and email are parsed
        const parseAndValidateLocation = (doc: DriverDoc): LocationData | null => {
            const lat = parseFloat(doc.latitude); const lon = parseFloat(doc.longitude);
            if (isNaN(lat) || isNaN(lon)) { console.warn(`Invalid coords in fetched doc ${doc.$id}.`); return null; }
            return { id: doc.$id, latitude: lat, longitude: lon, driverName: doc.driverName, timestamp: doc.timestamp, route: doc.route, email: doc.email };
        };

        const fetchAndSubscribe = async () => {
            if (!isMountedRef.current) return;
            setStatus(prev => prev.includes("active") || prev.includes("found") ? `${prev} Fetching locations...` : "Fetching locations...");
            setError(null);
            try {
                const response = await databases.listDocuments<DriverDoc>(DATABASE_ID, COLLECTION_ID);
                if (!isMountedRef.current) return;
                const initialValidLocations: LocationData[] = response.documents.map(parseAndValidateLocation).filter((loc): loc is LocationData => loc !== null);
                setAllLocations(initialValidLocations);
                updateDriverColors(initialValidLocations);
                setStatus(prev => prev.includes("active") ? prev : "Subscribing...");

                const channel = `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents`;
                console.log("Driver subscribing to channel:", channel);
                unsubscribe = client.subscribe(channel, (response) => {
                    if (!isMountedRef.current) return;
                    const changedDoc = response.payload as DriverDoc; const locationId = changedDoc.$id; const event = response.events[0];
                    let processedLocation: LocationData | null = null;
                    if (event.includes('.create') || event.includes('.update')) processedLocation = parseAndValidateLocation(changedDoc);

                    // Update allLocations state
                    setAllLocations(prev => {
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
                console.log(`Driver subscription successful for '${COLLECTION_ID}'.`);
                setStatus(prev => prev.includes("active") || prev.includes("Error") ? prev : "Live updates enabled.");

            } catch (err: any) {
                console.error("Driver Error fetching/subscribing:", err);
                if (err.code === 1003) setError(`Subscription Failed: Invalid channel/permissions? (DB: ${DATABASE_ID}, Coll: ${COLLECTION_ID})`);
                else setError(`Load/Subscribe Error: ${err.message}`);
                if (isMountedRef.current) setStatus("Error - Subscription");
            }
        };
        fetchAndSubscribe();
        return () => { if (unsubscribe) { unsubscribe(); console.log("Driver subscription closed."); } };
    }, [DATABASE_ID, COLLECTION_ID, updateDriverColors]);

    // --- Fallback UI for Lazy Map ---
    const MapLoadingFallback = () => (
        <div className="h-full w-full flex items-center justify-center bg-gray-200 animate-pulse">
             <p className="text-gray-500 font-medium">Loading Map...</p>
        </div>
    );

    // --- Memoized Sorted Driver List ---
    const sortedDrivers = useMemo(() => [...allLocations].sort((a, b) => (a?.driverName || '').localeCompare(b?.driverName || '')), [allLocations]);

    // --- "Zoom to Me" Handler ---
    const handleZoomToSelf = () => {
        if (driverCurrentLocation && mapRef.current) {
            mapRef.current.setView([driverCurrentLocation.latitude, driverCurrentLocation.longitude], 16);
        } else if (!driverCurrentLocation) {
            setError("Your current location is not available yet.");
            setTimeout(() => setError(null), 3000);
        }
    };

    // --- Render UI ---
    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-100">
             {/* Left Panel */}
             <div className="w-full md:w-72 lg:w-80 p-3 border-b md:border-b-0 md:border-r border-gray-300 overflow-y-auto flex-shrink-0 bg-white shadow-lg md:shadow-none">
                 {/* Driver Info Box */}
                 <div className="p-3 bg-blue-50 border border-blue-200 mb-4 rounded-md shadow-sm">
                     <h2 className="text-base font-semibold text-blue-800 mb-1">Driver Info</h2>
                     {currentUserName && <p className="text-xs text-gray-700">Name: <span className="font-medium">{currentUserName}</span></p>}
                     {currentUserEmail && <p className="text-xs text-gray-600">Email: {currentUserEmail}</p>}
                     {driverDocId && <p className="text-xs text-gray-500 mt-1">Tracking Doc ID: {driverDocId.substring(0, 8)}...</p>}
                     <p className="text-xs mt-1">Status: <span className={`font-medium ${error ? 'text-red-700' : status.includes('Error') ? 'text-red-700' : status.includes('active') ? 'text-green-700' : 'text-blue-700'}`}>{status}</span></p>
                     {error && <p className="text-red-700 bg-red-100 p-1.5 rounded text-xs mt-1.5 font-medium">Error: {error}</p>}
                 </div>
                 {/* Active Drivers List */}
                 <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                     <h3 className="text-sm font-semibold p-2 bg-gray-50 border-b border-gray-200 text-gray-700 sticky top-0">Active Drivers</h3>
                     {sortedDrivers.length === 0 ? ( <div className="p-4 text-center text-gray-400 text-sm">No other drivers visible.</div> ) : (
                         <ul className="divide-y divide-gray-200 max-h-[calc(100vh-280px)] md:max-h-[calc(100vh-240px)] overflow-y-auto">
                             {sortedDrivers.map((driver) => (
                                 <li key={driver.id} className={`p-2.5 flex items-center space-x-2 hover:bg-gray-50 transition-colors duration-150 ${driver.id === driverDocId ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}>
                                     <div className="flex-shrink-0 pt-0.5"><DriverIcon color={driverColors[driver.id] || '#888888'} size={18} /></div>
                                     <div className="flex-1 min-w-0">
                                         <p className={`text-xs font-medium text-gray-900 truncate ${driver.id === driverDocId ? 'font-bold' : ''}`}>
                                             {driver.driverName || `Driver ${driver.id.substring(0,6)}`}
                                             {driver.id === driverDocId && <span className="text-blue-600 font-normal"> (You)</span>}
                                         </p>
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
                        locations={allLocations}
                        colors={driverColors}
                        currentUserLocation={driverCurrentLocation}
                        mapRefProp={mapRef} // Pass ref down
                        currentDriverId={driverDocId || undefined}
                        fitBounds={!driverCurrentLocation} // Only fit initially if own location unknown
                    />
                </Suspense>
                {/* Zoom Button */}
                 <button onClick={handleZoomToSelf} disabled={!driverCurrentLocation} className="absolute bottom-4 right-4 z-[1000] bg-white p-2 rounded-full shadow-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Zoom to my location">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0-3-3m3 3 3-3m-8.25 6a4.5 4.5 0 0 1-1.41-8.775 4.5 4.5 0 0 1 8.775 0 4.5 4.5 0 0 1-1.41 8.775H5.25Z" />
                     </svg>
                 </button>
            </div>
        </div>
    );
};

export default DriverComponent;