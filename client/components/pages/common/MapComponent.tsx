// src/components/MapComponent.tsx
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense, useMemo } from 'react';
import client, { databases, account } from '~/utils/appwrite';
import { LocationData } from '../driver/MapDisplay';
import { Models } from 'appwrite';
import { FaChevronUp, FaChevronDown } from 'react-icons/fa';  // Import icons

// --- Define DriverIcon directly inside MapComponent (for the List) ---
interface DriverIconProps { color?: string; size?: number | string; className?: string; }
const DriverIconList: React.FC<DriverIconProps> = ({ color = 'currentColor', size = 24, className = '' }) => (
    <svg
  xmlns="http://www.w3.org/2000/svg"
  fill={color}
  stroke="black"
  strokeWidth="0.3"
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

// --- Define generateColorFromId directly inside MapComponent ---
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

// Dynamically import the MapDisplay component
const LazyMapDisplay = lazy(() => import('../driver/MapDisplay'));

// Environment variables from .env file
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_DRIVER_COLLECTION_ID;

type DriverDoc = Models.Document & {
    driverId: string; driverName: string; latitude: string; longitude: string;
    timestamp: string; route?: string; email: string;
};

const MapComponent: React.FC = () => {
    const [locations, setLocations] = useState<LocationData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("Initializing...");
    const [driverColors, setDriverColors] = useState<{ [id: string]: string }>({});
    const isMountedRef = useRef<boolean>(true);

    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [studentEmail, setStudentEmail] = useState<string | null>(null);
    const [studentLocationId, setStudentLocationId] = useState<string | null>(null);

    // NEW STATE: Controls the driver list panel visibility on small screens
    const [isDriverListExpanded, setIsDriverListExpanded] = useState(true); // Start expanded by default.

    const updateDriverColors = useCallback((locations: LocationData[]) => {
        setDriverColors(prevColors => {
            let updated = false;
            const newColors = { ...prevColors };
            locations.forEach(loc => {
                if (loc.id && !newColors[loc.id]) {
                    newColors[loc.id] = generateColorFromId(loc.id);
                    updated = true;
                }
            });
            return updated ? newColors : prevColors;
        });
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // 1. Fetch Student's own email
    useEffect(() => {
        const getStudentEmail = async () => {
            try {
                const user = await account.get();
                setStudentEmail(user.email); // Sets the email
            } catch (err: any) {
                console.error("Failed to get student account:", err);
                setError(`Could not get student identity: ${err.message || 'Please ensure you are logged in.'}`);
                setStatus("Error");
            }
        };
        getStudentEmail();
    }, []);

    // 2. Fetch Initial Locations & Subscribe to Realtime Updates
    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        const parseAndValidateLocation = (doc: DriverDoc): LocationData | null => {
            console.log("parseAndValidateLocation: Raw document from Appwrite:", doc); // DEBUG

            const lat = parseFloat(doc.latitude);
            const lon = parseFloat(doc.longitude);

            if (isNaN(lat) || isNaN(lon)) {
                console.warn(`(Student View) Invalid coordinates in DB doc ${doc.$id}. Skipping.`);
                return null;
            }

            const locationData: LocationData = {
                id: doc.$id,
                latitude: lat,
                longitude: lon,
                driverName: doc.driverName,
                timestamp: doc.timestamp,
                route: doc.route,
                email: doc.email
            };
            console.log("parseAndValidateLocation: Parsed location data:", locationData); // DEBUG
            return locationData;
        };

        const fetchAndSubscribe = async () => {
            if (!isMountedRef.current) return;
            setStatus("Fetching driver locations...");
            setError(null);

            try {
                const response = await databases.listDocuments<DriverDoc>(DATABASE_ID, COLLECTION_ID);
                if (!isMountedRef.current) return;

                const initialValidLocations: LocationData[] = response.documents
                    .map(parseAndValidateLocation)
                    .filter((loc): loc is LocationData => loc !== null);

                console.log("Initial Valid Locations:", initialValidLocations); // Debug

                setLocations(initialValidLocations);
                updateDriverColors(initialValidLocations);

                // 3. Find Student's Location ID
                const studentLocation = response.documents.find(doc => doc.email === studentEmail);
                if (studentLocation) {
                    setStudentLocationId(studentLocation.$id);
                    console.log("Student Location ID set:", studentLocation.$id);
                }

                setStatus("Locations loaded. Subscribing...");

                unsubscribe = client.subscribe(
                    `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents`,
                    (response) => {
                        if (!isMountedRef.current) return;
                        const changedDoc = response.payload as DriverDoc;
                        const locationId = changedDoc.$id;
                        const event = response.events[0];

                        let processedLocation: LocationData | null = null;
                        if (event.includes('.create') || event.includes('.update')) {
                            processedLocation = parseAndValidateLocation(changedDoc);
                        }

                        setLocations(prev => {
                            let newState = prev;
                            if (event.includes('.delete')) {
                                newState = prev.filter(loc => loc.id !== locationId);
                            } else if (processedLocation) {
                                const idx = prev.findIndex(loc => loc.id === locationId);
                                if (idx > -1) {
                                    newState = [...prev]; newState[idx] = processedLocation;
                                } else {
                                    newState = [...prev, processedLocation];
                                }
                            }
                            return newState;
                        });

                        updateDriverColors([processedLocation!]);

                        // 4. Update Student's Location ID
                        if (changedDoc.email === studentEmail) {
                            setStudentLocationId(changedDoc.$id);
                            console.log("Student Location ID updated:", changedDoc.$id);
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

        fetchAndSubscribe();

        return () => {
            if (unsubscribe) {
                console.log("(Student View) Unsubscribing from Appwrite Realtime.");
                unsubscribe();
            }
        };
    }, [DATABASE_ID, COLLECTION_ID, updateDriverColors, studentEmail]);

    const MapLoadingFallback = () => (
        <div className="h-full w-full flex items-center justify-center bg-gray-200 animate-pulse">
            <p className="text-gray-500">Loading Map...</p>
        </div>
    );

    const sortedDrivers = useMemo(() => [...locations].sort((a, b) =>
        (a.driverName || '').localeCompare(b.driverName || '')
    ), [locations]);

    const zoomToStudentLocation = () => {
        if (studentLocationId) {
            setSelectedDriverId(studentLocationId);
            console.log("Zoom to student location button clicked.  Setting selectedDriverId to:", studentLocationId);
        } else {
            console.warn("Student location ID is not available.  Cannot zoom.");
        }
    };

    const panelHeight = isDriverListExpanded ? 'h-84' : 'h-24'; // Define collapsed/expanded heights

    return (
        <div className="flex flex-col md:flex-row h-full bg-gray-100">
            {/* Driver List Panel */}
            <div className={`
                w-full md:w-72 lg:w-80  bg-gray-50 border-r border-gray-200 flex-shrink-0 shadow-md md:shadow-none
                transition-height duration-300 ease-in-out overflow-hidden sm:pr-2
                ${panelHeight} /* Set the height dynamically */
            `}>
                {/* Header section */}
                <div className="p-3 bg-green-100 border border-green-200 shadow-sm mb-4 rounded-md flex items-center justify-between">  {/* Flex container */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-1">Student View</h2>
                        {studentEmail && <p className="text-xs text-gray-600 break-words">Student Email: {studentEmail}</p>}
                        {studentLocationId && <p className="text-xs text-gray-500 mt-1">Student Location Id: <span className="font-mono text-xs">{studentLocationId}</span></p>}
                        <p className="text-sm mt-1">Status: <span className={`font-semibold ${error ? 'text-red-600' : status.includes('Error') ? 'text-red-600' : status.includes('enabled') ? 'text-green-600' : 'text-blue-600'}`}>{status}</span></p>
                        {error && <p className="text-red-700 bg-red-100 p-2 rounded text-xs mt-2 border border-red-200">Error: {error}</p>}
                    </div>

                    {/* Toggle Button */}
                    <button
                        className="p-2 rounded-full sm:hidden hover:bg-gray-300 focus:outline-none"  /* Circular button */
                        onClick={() => setIsDriverListExpanded(!isDriverListExpanded)}
                        aria-label={isDriverListExpanded ? 'Collapse Driver List' : 'Expand Driver List'} //Accessibility
                    >
                        {isDriverListExpanded ? (
                            <FaChevronUp className="text-gray-700" />
                        ) : (
                            <FaChevronDown className="text-gray-700" />
                        )}
                    </button>
                </div>

                {/* Driver List Section */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <h3 className="text-md font-semibold p-3 bg-gray-100 border-b border-gray-200">Active Drivers</h3>
                    {sortedDrivers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">No drivers currently available.</div>
                    ) : (
                        <ul className="divide-y divide-gray-200 max-h-[calc(100vh-220px)] overflow-y-auto">
                            {sortedDrivers.map((driver) => (
                                <li
                                    key={driver.id}
                                    className="p-3 flex items-center space-x-3 transition-colors duration-150 ease-in-out hover:bg-gray-50 cursor-pointer"
                                    onClick={() => setSelectedDriverId(driver.id)}
                                >
                                    <div className="flex-shrink-0">
                                        <DriverIconList color={driverColors[driver.id] || 'gray'} size={30} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 truncate" title={driver.driverName}>
                                            {driver.driverName || `Driver ${driver.id.substring(0, 6)}`}
                                        </p>
                                        {driver.route && (
                                            <p className="text-xs text-gray-500 truncate" title={`Route: ${driver.route}`}>
                                                Route: {driver.route}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-grow bg-gray-300 relative mt-3">
                <Suspense fallback={<MapLoadingFallback />}>
                    <LazyMapDisplay
                        locations={locations}
                        colors={driverColors}
                        currentDriverId={selectedDriverId ?? studentLocationId ?? undefined} // Try to zoom to select ID first.
                        fitBounds={true}
                    />
                </Suspense>
            </div>
        </div>
    );
};

export default MapComponent;