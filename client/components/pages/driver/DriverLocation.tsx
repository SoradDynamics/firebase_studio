// src/components/DriverComponent.tsx
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense, useMemo } from 'react';
import client, { databases, account, iD, Query } from '~/utils/appwrite';
// Import LocationData type from MapDisplay (assuming it's exported there)
import { LocationData } from './MapDisplay';
import { Models } from 'appwrite';

// --- Define DriverIcon directly inside DriverComponent (for the List) ---
interface DriverIconProps {
    color?: string; size?: number | string; className?: string;
}
const DriverIconList: React.FC<DriverIconProps> = ({ // Renamed to avoid conflict if imported elsewhere
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
// --- End of inline DriverIconList definition ---


// --- Define generateColorFromId directly inside DriverComponent ---
function generateColorFromId(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit integer
    }
    const hue = Math.abs(hash) % 360; // Hue (0-359)
    const saturation = 70; // Keep saturation high for vibrancy
    const lightness = 50; // Keep lightness balanced
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
// --- End of inline generateColorFromId definition ---


// Dynamically import the MapDisplay component (assumed to handle its own client-side checks now)
const LazyMapDisplay = lazy(() => import('./MapDisplay'));

// Environment variables from .env file
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_DRIVER_COLLECTION_ID; // Should match 'coll-drivers'

// Type for the Appwrite document structure in 'coll-drivers'
type DriverDoc = Models.Document & {
    driverId: string; // Appwrite User $id
    driverName: string;
    latitude: string;   // Stored as string
    longitude: string;  // Stored as string
    timestamp: string;  // ISO String
    route?: string;     // Optional route field
    email: string;      // Email used for lookup
};

// Main Driver Component
const DriverComponent: React.FC = () => {
    // State specific to the driver user
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserAppwriteId, setCurrentUserAppwriteId] = useState<string | null>(null);
    const [driverDocId, setDriverDocId] = useState<string | null>(null); // $id of the document in 'coll-drivers'

    // General component state
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("Initializing...");
    const [allLocations, setAllLocations] = useState<LocationData[]>([]); // For map & list (map needs numbers)
    const [driverColors, setDriverColors] = useState<{ [id: string]: string }>({}); // State for colors {docId: color}

    // Refs for managing side effects and DOM interaction
    const watchIdRef = useRef<number | null>(null); // Geolocation watch ID
    const isUpdatingRef = useRef<boolean>(false); // Prevent concurrent Appwrite updates
    const isMountedRef = useRef<boolean>(true); // Track component mount status

     // --- Helper to update colors map state ---
     const updateDriverColors = useCallback((locations: LocationData[]) => {
        setDriverColors(prevColors => {
            let updated = false;
            const newColors = { ...prevColors };
            locations.forEach(loc => {
                if (loc.id && !newColors[loc.id]) { // Check if ID exists and color not already generated
                    newColors[loc.id] = generateColorFromId(loc.id); // Use inline function
                    updated = true;
                }
            });
            // Only update state if changes occurred to prevent unnecessary re-renders
            return updated ? newColors : prevColors;
        });
    }, []); // No external dependencies for the helper logic itself

    // --- Mount/Unmount Effect ---
    useEffect(() => {
        isMountedRef.current = true;
        // Cleanup function: clear geolocation watch when component unmounts
        return () => {
            isMountedRef.current = false;
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                console.log("Cleared geolocation watch on unmount:", watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, []); // Run only once on mount

    // --- 1. Get Current Logged-In Driver's Info ---
    useEffect(() => {
        const fetchUser = async () => {
            if (!isMountedRef.current) return;
            setStatus("Fetching driver identity...");
            setError(null);
            try {
                const user = await account.get();
                if (isMountedRef.current) {
                    if (!user.email) {
                        throw new Error("Logged-in user is missing an email address.");
                    }
                    setCurrentUserEmail(user.email);
                    setCurrentUserAppwriteId(user.$id);
                    setCurrentUserName(user.name || `Driver ${user.$id.substring(0, 6)}`);
                    setStatus("Driver identity confirmed. Locating driver document...");
                }
            } catch (err: any) {
                console.error("Failed to get current user:", err);
                 if (isMountedRef.current) {
                    setError(`Could not get driver identity: ${err.message || 'Please ensure you are logged in.'}`);
                    setStatus("Error");
                 }
            }
        };
        fetchUser();
    }, []); // Run once on mount

    // --- 2. Find Driver Document using Email ---
    const findDriverDocumentByEmail = useCallback(async (email: string, expectedName: string) => {
        if (!email || !isMountedRef.current) return;
        setError(null);
        setStatus(`Searching for document linked to ${email}...`);
        try {
            // Query Appwrite database
            const response = await databases.listDocuments<DriverDoc>(
                DATABASE_ID,
                COLLECTION_ID,
                [
                    Query.equal('email', email), // Ensure you have an index on 'email' in Appwrite
                    Query.limit(1)              // We expect only one document per email
                ]
            );

            if (response.documents.length > 0) {
                if (!isMountedRef.current) return; // Check mount status after async call
                const driverDoc = response.documents[0];
                setDriverDocId(driverDoc.$id); // Store the found document's Appwrite $id
                setStatus("Driver document found. Starting tracking.");
                console.log("Found driver document:", driverDoc.$id, "for email:", email);

                // Optional: Update name in the document if it differs from current auth user name
                if (driverDoc.driverName !== expectedName) {
                    console.log(`Updating driver name in document ${driverDoc.$id}...`);
                    await databases.updateDocument(DATABASE_ID, COLLECTION_ID, driverDoc.$id, { driverName: expectedName });
                    // This assumes the logged-in user has UPDATE permission on this specific document
                }
            } else {
                // Handle case where the driver's document doesn't exist in the collection
                console.error(`No document found in collection '${COLLECTION_ID}' for email: ${email}`);
                 if (isMountedRef.current) {
                    setError(`Configuration error: No driver document found for your email (${email}). Please create one or contact support.`);
                    setStatus("Error - Document Not Found");
                 }
            }
        } catch (err: any) {
            console.error("Error finding driver document by email:", err);
             if (isMountedRef.current) {
                setError(`Error finding driver document: ${err.message || 'Database query failed'}`);
                setStatus("Error");
             }
        }
    // Depend on DB/Collection IDs as they are part of the query
    }, [DATABASE_ID, COLLECTION_ID]);

    // Effect to trigger the document search once user email is available
    useEffect(() => {
        if (currentUserEmail && currentUserName && !driverDocId) {
            findDriverDocumentByEmail(currentUserEmail, currentUserName);
        }
    }, [currentUserEmail, currentUserName, driverDocId, findDriverDocumentByEmail]);

    // --- 3. Update Location in the Found Appwrite Document ---
    const updateLocationInAppwrite = useCallback(async (latitude: number, longitude: number) => {
        // Check prerequisites for update
        if (!driverDocId || !isMountedRef.current || isUpdatingRef.current) {
            return;
        }
        isUpdatingRef.current = true; // Set lock to prevent concurrent updates
        try {
            // Prepare data, converting numbers to strings as per schema
            const dataToUpdate = {
                latitude: latitude.toString(),
                longitude: longitude.toString(),
                timestamp: new Date().toISOString(),
                // Optionally update driverId if it needs to be kept in sync
                // driverId: currentUserAppwriteId,
            };

            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID,
                driverDocId, // Use the specific $id of the document found earlier
                dataToUpdate
            );

            if (isMountedRef.current) {
                // Update status, but don't overwrite a more specific Geolocation error
                setStatus(prev => prev.startsWith("Geolocation Error") ? prev : `Location Updated: ${new Date().toLocaleTimeString()}`);
            }
        } catch (err: any) {
            console.error(`Failed to update location in document ${driverDocId}:`, err);
             if (isMountedRef.current) {
                setError(`Sync Error: ${err.message || 'Could not update location in database'}`);
                // Optionally set a different status like "Sync Failed"
                // setStatus("Error - Sync Failed");
             }
        } finally {
            isUpdatingRef.current = false; // Release lock
        }
    // Depend on the document ID and potentially the user's Appwrite ID if updating that field
    }, [driverDocId, DATABASE_ID, COLLECTION_ID, currentUserAppwriteId]);

    // --- 4. Start Geolocation Tracking ---
    useEffect(() => {
        // Wait for the driver document ID to be found and ensure browser support
        if (!driverDocId || !navigator.geolocation) {
            if (!navigator.geolocation && driverDocId && isMountedRef.current) { // Only show error if doc ID was found but geo is missing
                setError("Geolocation is not supported by this browser.");
                setStatus("Error - Geolocation Not Supported");
            }
            return;
        }

        // Clear any previous watch before starting a new one
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        // Geolocation success callback
        const successCallback: PositionCallback = (position) => {
            if (!isMountedRef.current) return; // Check mount status
            const { latitude, longitude } = position.coords; // These are numbers
            setError(null); // Clear previous geolocation errors on success
            setStatus("Tracking active..."); // Update status

            // Send location (numbers) to Appwrite update function (handles string conversion)
            updateLocationInAppwrite(latitude, longitude);

            // Prepare data for local state update (map & list) - uses numbers
            // You might need to fetch/know the current driver's 'route' here if it should be in the list item
            const selfLocationData: LocationData = {
                id: driverDocId!, // Assert non-null as we checked it above
                latitude: latitude,
                longitude: longitude,
                timestamp: new Date().toISOString(),
                driverName: currentUserName,
                // route: currentDriverRoute, // Add route if available
                email: currentUserEmail || undefined // Include email if needed
            };

             // Update local 'allLocations' state immediately for responsiveness
             setAllLocations(prev => {
                 const idx = prev.findIndex(loc => loc.id === driverDocId);
                 if (idx > -1) { // Update existing entry for self
                     const updated = [...prev]; updated[idx] = selfLocationData; return updated;
                 } else { // Add self if not present (should be rare if fetch worked)
                     return [...prev, selfLocationData];
                 }
             });

             // Ensure color map includes self after location update
             updateDriverColors([selfLocationData]);
        };

        // Geolocation error callback
        const errorCallback: PositionErrorCallback = (error) => {
            if (!isMountedRef.current) return;
            console.error("Geolocation error:", error);
            let message = `Geolocation Error: ${error.message} (Code: ${error.code})`;
             switch (error.code) {
                 case error.PERMISSION_DENIED: message = "Geolocation permission denied."; break;
                 case error.POSITION_UNAVAILABLE: message = "Location information is unavailable."; break;
                 case error.TIMEOUT: message = "Geolocation request timed out."; break;
             }
            setError(message);
            setStatus("Geolocation Error");
        };

        // Geolocation options
        const options: PositionOptions = {
            enableHighAccuracy: true,
            timeout: 15000, // Max time to wait for a position
            maximumAge: 5000, // Accept cached position younger than 5s
        };

        // Start watching position
        setStatus("Attempting to start location watch...");
        try {
            watchIdRef.current = navigator.geolocation.watchPosition(successCallback, errorCallback, options);
            console.log("Started geolocation watch:", watchIdRef.current);
             if (isMountedRef.current) setStatus("Location watch active.");
        } catch (err) {
             if (isMountedRef.current) {
                console.error("Could not start watchPosition:", err);
                setError("Failed to start native location tracking.");
                setStatus("Error");
             }
        }
        // Cleanup is handled by the main mount/unmount useEffect
    // Re-run if the document ID changes, or the update function reference changes, or user name changes
    }, [driverDocId, updateLocationInAppwrite, currentUserName, currentUserEmail, updateDriverColors]);

    // --- 5. Fetch Initial & Subscribe to All Locations ---
    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        // Helper to parse string coords from DB doc to numbers for LocationData
        const parseAndValidateLocation = (doc: DriverDoc): LocationData | null => {
            const lat = parseFloat(doc.latitude);
            const lon = parseFloat(doc.longitude);
            // Validate numbers before creating the object
            if (isNaN(lat) || isNaN(lon)) {
                console.warn(`Invalid coordinates in DB doc ${doc.$id}: lat='${doc.latitude}', lon='${doc.longitude}'. Skipping.`);
                return null;
            }
            return {
                id: doc.$id, // Use document $id as unique key
                latitude: lat,
                longitude: lon,
                driverName: doc.driverName,
                timestamp: doc.timestamp,
                route: doc.route, // Include route from DB
                email: doc.email // Include email from DB
            };
        };

        const fetchAndSubscribe = async () => {
            if (!isMountedRef.current) return;
            // Update status message carefully
            setStatus(prev => prev.includes("active") || prev.includes("found") ? `${prev} Fetching locations...` : "Fetching locations...");
            setError(null);
            try {
                // Fetch initial list of all driver documents
                const response = await databases.listDocuments<DriverDoc>(DATABASE_ID, COLLECTION_ID);
                 if (!isMountedRef.current) return;

                // Parse and validate initial data
                const initialValidLocations: LocationData[] = response.documents
                    .map(parseAndValidateLocation)
                    .filter((loc:any): loc is LocationData => loc !== null); // Filter out any nulls from parsing errors

                setAllLocations(initialValidLocations); // Set the initial state for map/list
                updateDriverColors(initialValidLocations); // Generate initial colors for all valid locations

                setStatus(prev => prev.includes("active") ? prev : "Subscribing to updates..."); // Adjust status

                // Subscribe to real-time updates
                unsubscribe = client.subscribe(
                    `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents`,
                    (response:any) => {
                        if (!isMountedRef.current) return; // Check mount status inside async callback
                        const changedDoc = response.payload as DriverDoc;
                        const locationId = changedDoc.$id;
                        const event = response.events[0]; // Check the first event type

                        let processedLocation: LocationData | null = null;
                        // Parse only if it's a create or update event
                        if (event.includes('.create') || event.includes('.update')) {
                            processedLocation = parseAndValidateLocation(changedDoc);
                        }

                        // Update the locations state based on the event
                        setAllLocations(prev => {
                            let newState = prev;
                            if (event.includes('.delete')) {
                                newState = prev.filter(loc => loc.id !== locationId);
                                // Optional: remove color from map if driver is deleted
                                // setDriverColors(clr => { const next = {...clr}; delete next[locationId]; return next; });
                            } else if (processedLocation) { // Only update/add if parsing was successful
                                const idx = prev.findIndex(loc => loc.id === locationId);
                                if (idx > -1) { // Update existing
                                     newState = [...prev]; newState[idx] = processedLocation;
                                } else { // Add new
                                    newState = [...prev, processedLocation];
                                }
                            }
                            return newState; // Return the potentially updated state
                        });

                         // Update colors map AFTER locations state has potentially changed
                        if (processedLocation) {
                             updateDriverColors([processedLocation]); // Ensure color exists for new/updated driver
                        }
                    }
                );
                console.log(`Subscribed to Appwrite Realtime for '${COLLECTION_ID}'.`);
                // Set final status, respecting tracking/error states
                 setStatus(prev => prev.includes("active") || prev.includes("Error") ? prev : "Live updates enabled.");

            } catch (err: any) {
                console.error("Error fetching initial locations or subscribing:", err);
                 if (isMountedRef.current) {
                    setError(`Load/Subscribe Error: ${err.message}`);
                    setStatus("Error");
                 }
            }
        };

        fetchAndSubscribe(); // Execute the fetch and subscribe logic

        // Cleanup function for the effect
        return () => {
            if (unsubscribe) {
                console.log("Unsubscribing from Appwrite Realtime.");
                unsubscribe(); // Call the unsubscribe function returned by client.subscribe
            }
        };
    // Depend on DB/Collection IDs and the color update helper function
    }, [DATABASE_ID, COLLECTION_ID, updateDriverColors]);

    // --- Fallback UI for Suspense ---
    const MapLoadingFallback = () => (
        <div className="h-full w-full flex items-center justify-center bg-gray-200 animate-pulse">
            <p className="text-gray-500">Loading Map...</p>
        </div>
    );

    // --- Memoize sorted list for performance ---
    const sortedDrivers = useMemo(() => [...allLocations].sort((a, b) =>
        (a.driverName || '').localeCompare(b.driverName || '')
    ), [allLocations]);

    // --- Component Render ---
    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-100">
             {/* Driver List Panel */}
             <div className="w-full md:w-72 lg:w-80 p-3 bg-gray-50 border-r border-gray-200 overflow-y-auto flex-shrink-0 shadow-md md:shadow-none">
                 {/* Header section */}
                 <div className="p-3 bg-blue-100 border border-blue-200 shadow-sm mb-4 rounded-md">
                    <h2 className="text-lg font-semibold text-gray-800 mb-1">Driver Info</h2>
                    {currentUserName && <p className="text-sm text-gray-700 break-words">Driver: <span className="font-medium">{currentUserName}</span></p>}
                    {currentUserEmail && <p className="text-xs text-gray-600 break-words">Email: {currentUserEmail}</p>}
                    {driverDocId && <p className="text-xs text-gray-500 mt-1">Tracking Doc: <span className="font-mono text-xs">{driverDocId}</span></p>}
                    <p className="text-sm mt-2">Status: <span className={`font-semibold ${error ? 'text-red-600' : status.includes('Error') ? 'text-red-600' : status.includes('active') ? 'text-green-600' : 'text-blue-600'}`}>{status}</span></p>
                    {error && <p className="text-red-700 bg-red-100 p-2 rounded text-xs mt-2 border border-red-200">Error: {error}</p>}
                 </div>

                 {/* Driver List Section */}
                 <div className="bg-white shadow rounded-lg overflow-hidden">
                     <h3 className="text-md font-semibold p-3 bg-gray-100 border-b border-gray-200">Active Drivers</h3>
                     {sortedDrivers.length === 0 ? (
                         <div className="p-4 text-center text-sm text-gray-500">No other drivers currently active or available.</div>
                     ) : (
                         <ul className="divide-y divide-gray-200 max-h-[calc(100vh-280px)] overflow-y-auto"> {/* Adjust max-h dynamically or fixed */}
                             {sortedDrivers.map((driver) => (
                                 <li
                                     key={driver.id} // Use document $id as key
                                     className={`p-3 flex items-center space-x-3 transition-colors duration-150 ease-in-out hover:bg-gray-50 ${
                                         // Highlight the current logged-in driver in the list
                                         driver.id === driverDocId ? 'bg-blue-50 border-l-4 border-blue-500 font-medium' : ''
                                     }`}
                                 >
                                     {/* Use inline DriverIconList definition */}
                                     <div className="flex-shrink-0">
                                        <DriverIconList color={driverColors[driver.id] || 'gray'} size={20} />
                                     </div>
                                     {/* Driver details */}
                                     <div className="flex-1 min-w-0">
                                         <p className="text-sm text-gray-900 truncate" title={driver.driverName}>
                                             {driver.driverName || `Driver ${driver.id.substring(0,6)}`}
                                             {driver.id === driverDocId && <span className="text-xs text-blue-700 font-normal"> (You)</span>}
                                         </p>
                                         {driver.route && (
                                             <p className="text-xs text-gray-500 truncate" title={`Route: ${driver.route}`}>
                                                 Route: {driver.route}
                                             </p>
                                         )}
                                          {/* Optionally display email or last seen time */}
                                         {/* <p className="text-xs text-gray-400 truncate">{driver.email}</p> */}
                                         {/* <p className="text-xs text-gray-400 truncate">Seen: {driver.timestamp ? new Date(driver.timestamp).toLocaleTimeString() : 'N/A'}</p> */}
                                     </div>
                                 </li>
                             ))}
                         </ul>
                     )}
                 </div>
             </div>

            {/* Map Area */}
            <div className="flex-grow bg-gray-300 relative"> {/* Map takes remaining space */}
                <Suspense fallback={<MapLoadingFallback />}>
                    {/* Render the Map, passing locations (with numbers) and colors */}
                    <LazyMapDisplay
                        locations={allLocations}
                        colors={driverColors}
                        currentDriverId={driverDocId || undefined} // Highlight self on map
                        fitBounds={true} // Zoom map to fit markers initially
                    />
                </Suspense>
            </div>
        </div>
    );
};

export default DriverComponent;