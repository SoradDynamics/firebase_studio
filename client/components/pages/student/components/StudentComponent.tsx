// src/components/StudentComponent.tsx
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense, useMemo } from 'react';
import client, { databases } from '~/utils/appwrite';
// Import LocationData type from MapDisplay (it's exported there)
import { LocationData } from '../../driver/MapDisplay';
import { Models } from 'appwrite';

// --- Define DriverIcon directly inside StudentComponent (for the List) ---
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


// --- Define generateColorFromId directly inside StudentComponent ---
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


// Dynamically import the MapDisplay component
const LazyMapDisplay = lazy(() => import('../../driver/MapDisplay'));

// Environment variables from .env file
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_DRIVER_COLLECTION_ID; // Should match 'coll-drivers'

// Type for the Appwrite document structure in 'coll-drivers'
type DriverDoc = Models.Document & {
    driverId: string; driverName: string; latitude: string; longitude: string;
    timestamp: string; route?: string; email: string;
};

// Main Student Component
const StudentComponent: React.FC = () => {
    // State for student view
    const [locations, setLocations] = useState<LocationData[]>([]); // For map & list (map needs numbers)
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("Initializing...");
    const [driverColors, setDriverColors] = useState<{ [id: string]: string }>({}); // State for colors {docId: color}
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
            return updated ? newColors : prevColors; // Only update state if changed
        });
    }, []); // No external dependencies

    // --- Mount/Unmount Effect ---
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []); // Run only once on mount

    // --- Fetch Initial Locations & Subscribe to Realtime Updates ---
    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        // Helper to parse string coords from DB doc to numbers for LocationData
        const parseAndValidateLocation = (doc: DriverDoc): LocationData | null => {
            const lat = parseFloat(doc.latitude);
            const lon = parseFloat(doc.longitude);
            if (isNaN(lat) || isNaN(lon)) {
                console.warn(`(Student View) Invalid coordinates in DB doc ${doc.$id}. Skipping.`);
                return null;
            }
            return {
                id: doc.$id, latitude: lat, longitude: lon,
                driverName: doc.driverName, timestamp: doc.timestamp,
                route: doc.route, email: doc.email
            };
        };

        const fetchAndSubscribe = async () => {
            if (!isMountedRef.current) return;
            setStatus("Fetching driver locations...");
            setError(null); // Clear previous errors
            try {
                // Fetch initial list of all driver documents
                const response = await databases.listDocuments<DriverDoc>(DATABASE_ID, COLLECTION_ID);
                if (!isMountedRef.current) return; // Check mount status after async call

                // Parse and validate initial data
                const initialValidLocations: LocationData[] = response.documents
                    .map(parseAndValidateLocation)
                    .filter((loc): loc is LocationData => loc !== null);

                setLocations(initialValidLocations); // Set initial state for map/list
                updateDriverColors(initialValidLocations); // Generate initial colors

                setStatus("Locations loaded. Subscribing...");

                // Subscribe to real-time updates
                unsubscribe = client.subscribe(
                    `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents`,
                    (response) => {
                        if (!isMountedRef.current) return; // Check mount status inside callback
                        const changedDoc = response.payload as DriverDoc;
                        const locationId = changedDoc.$id;
                        const event = response.events[0];

                        let processedLocation: LocationData | null = null;
                        // Parse only if it's a create or update event
                        if (event.includes('.create') || event.includes('.update')) {
                            processedLocation = parseAndValidateLocation(changedDoc);
                        }

                        // Update the locations state based on the event
                        setLocations(prev => {
                            let newState = prev;
                            if (event.includes('.delete')) {
                                newState = prev.filter(loc => loc.id !== locationId);
                            } else if (processedLocation) { // Only update/add if parsing was successful
                                const idx = prev.findIndex(loc => loc.id === locationId);
                                if (idx > -1) { // Update existing
                                     newState = [...prev]; newState[idx] = processedLocation;
                                } else { // Add new
                                    newState = [...prev, processedLocation];
                                }
                            }
                            return newState;
                        });

                        // Update colors map AFTER locations state has potentially changed
                        if (processedLocation) {
                             updateDriverColors([processedLocation]); // Ensure color exists
                        }
                    }
                );
                console.log(`(Student View) Subscribed to Appwrite Realtime for '${COLLECTION_ID}'.`);
                setStatus("Live updates enabled.");

            } catch (err: any) {
                console.error("(Student View) Error fetching initial locations or subscribing:", err);
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
                console.log("(Student View) Unsubscribing from Appwrite Realtime.");
                unsubscribe(); // Call the unsubscribe function
            }
        };
    // Depend on DB/Collection IDs and the color update helper
    }, [DATABASE_ID, COLLECTION_ID, updateDriverColors]);

    // --- Fallback UI for Suspense ---
    const MapLoadingFallback = () => (
        <div className="h-full w-full flex items-center justify-center bg-gray-200 animate-pulse">
            <p className="text-gray-500">Loading Map...</p>
        </div>
    );

    // --- Memoize sorted list for performance ---
    const sortedDrivers = useMemo(() => [...locations].sort((a, b) =>
        (a.driverName || '').localeCompare(b.driverName || '')
    ), [locations]);

    // --- Component Render ---
    return (
         <div className="flex flex-col md:flex-row h-screen bg-gray-100">
             {/* Driver List Panel */}
             <div className="w-full md:w-72 lg:w-80 p-3 bg-gray-50 border-r border-gray-200 overflow-y-auto flex-shrink-0 shadow-md md:shadow-none">
                  {/* Header section */}
                  <div className="p-3 bg-green-100 border border-green-200 shadow-sm mb-4 rounded-md">
                     <h2 className="text-lg font-semibold text-gray-800 mb-1">Student View</h2>
                     <p className="text-sm mt-1">Status: <span className={`font-semibold ${error ? 'text-red-600' : status.includes('Error') ? 'text-red-600' : status.includes('enabled') ? 'text-green-600' : 'text-blue-600'}`}>{status}</span></p>
                     {error && <p className="text-red-700 bg-red-100 p-2 rounded text-xs mt-2 border border-red-200">Error: {error}</p>}
                 </div>

                 {/* Driver List Section */}
                 <div className="bg-white shadow rounded-lg overflow-hidden">
                      <h3 className="text-md font-semibold p-3 bg-gray-100 border-b border-gray-200">Active Drivers</h3>
                      {sortedDrivers.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">No drivers currently available.</div>
                      ) : (
                          <ul className="divide-y divide-gray-200 max-h-[calc(100vh-220px)] overflow-y-auto"> {/* Adjust max-h */}
                              {sortedDrivers.map((driver) => (
                                  <li
                                      key={driver.id} // Use document $id as key
                                      className="p-3 flex items-center space-x-3 transition-colors duration-150 ease-in-out hover:bg-gray-50"
                                  >
                                      {/* Use inline DriverIconList definition */}
                                      <div className="flex-shrink-0">
                                         <DriverIconList color={driverColors[driver.id] || 'gray'} size={20} />
                                      </div>
                                      {/* Driver details */}
                                      <div className="flex-1 min-w-0">
                                          <p className="text-sm text-gray-900 truncate" title={driver.driverName}>
                                              {driver.driverName || `Driver ${driver.id.substring(0,6)}`}
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
                        locations={locations}
                        colors={driverColors}
                        // No currentDriverId prop needed for student view
                        fitBounds={true} // Zoom map to fit markers initially
                    />
                </Suspense>
            </div>
        </div>
    );
};

export default StudentComponent;