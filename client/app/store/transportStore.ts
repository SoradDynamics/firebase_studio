// src/store/transportStore.ts
import { create } from 'zustand';
import { databases } from '~/utils/appwrite'; // Ensure databases is correctly exported from your utils
import { ID } from 'appwrite';
import { Driver } from 'types'; // Ensure Driver type includes 'authUserId?: string | null'

// --- Environment Variables ---
const API_BASE_URL = import.meta.env.VITE_SERVER_URL;
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const DRIVER_COLLECTION_ID = import.meta.env.VITE_APPWRITE_DRIVER_COLLECTION_ID; // Using the exact name from .env

if (!API_BASE_URL) {
    console.error("FATAL ERROR: VITE_SERVER_URL is not defined in .env");
    // Optional: throw new Error("Missing VITE_SERVER_URL");
}
if (!APPWRITE_DATABASE_ID) {
    console.error("FATAL ERROR: VITE_APPWRITE_DATABASE_ID is not defined in .env");
}
if (!DRIVER_COLLECTION_ID) {
    console.error("FATAL ERROR: VITE_APPWRITE_DRIVER_COLLECTION_ID is not defined in .env");
}

// Construct the specific API endpoint for user authentication
const AUTH_API_URL = `${API_BASE_URL}/api/users/auth`;

// --- Helper Types ---

// Data structure expected by the add form/component
interface DriverFormData {
    driverName: string;
    route: string;
    email: string;
    // Password is generated temporarily, not collected from form
}

// Expected structure of the backend signup response
interface SignupResponse {
    success: boolean;
    message: string;
    userId?: string; // Appwrite Auth User ID ($id)
    email?: string;
    name?: string;
    labels?: string[];
}

// Expected structure of the backend delete response
interface DeleteResponse {
    success: boolean;
    message: string;
}

// --- Zustand Store Definition ---
interface TransportState {
    driverData: Driver[];
    isLoading: boolean; // General loading state for mutations (add/update/delete)
    isFetching: boolean; // Specific loading state for fetching data
    error: string | null;
    fetchDriversData: () => Promise<void>;
    updateDriverData: (driver: Driver) => Promise<void>; // Updates only DB document
    deleteDriverData: (driverDocId: string) => Promise<void>; // Deletes Auth User + DB Document
    addDriverData: (driverFormData: DriverFormData) => Promise<Driver | null>; // Creates Auth User + DB Document, returns added driver or null on error
}


// --- !!! SECURITY WARNING - Placeholder Only !!! ---
// Generating passwords on the frontend is highly insecure for production.
// Replace this with a secure mechanism like invite emails or admin-set temporary passwords.
const generateTemporaryPassword = (): string => {
    console.warn("SECURITY WARNING: Using insecure temporary password generation!");
    return `TempPass_${Math.random().toString(36).slice(-8)}`;
};
// --- !!! END SECURITY WARNING !!! ---


export const useTransportStore = create<TransportState>((set, get) => ({
    driverData: [],
    isLoading: false,
    isFetching: false,
    error: null,

    // --- Fetch Driver Documents ---
    fetchDriversData: async () => {
        if (!APPWRITE_DATABASE_ID || !DRIVER_COLLECTION_ID) {
            set({ isFetching: false, error: "Appwrite Database/Collection ID missing in config." });
            return;
        }
        set({ isFetching: true, error: null });
        try {
            const response = await databases.listDocuments(
                APPWRITE_DATABASE_ID,
                DRIVER_COLLECTION_ID
            );
            const drivers = response.documents as unknown as Driver[];
            set({ driverData: drivers, isFetching: false });
        } catch (error: any) {
            console.error('Error fetching drivers data:', error);
            const errorMsg = error.message || 'Failed to fetch drivers data';
            set({ error: errorMsg, isFetching: false });
        }
    },

    // --- Update Driver Document (Database Only) ---
    updateDriverData: async (driver) => {
        if (!APPWRITE_DATABASE_ID || !DRIVER_COLLECTION_ID) {
            set({ isLoading: false, error: "Appwrite Database/Collection ID missing in config." });
            throw new Error("Appwrite Database/Collection ID missing in config.");
        }
        // Note: This only updates the DB document, not the associated Auth user's details (name/email).
        set({ isLoading: true, error: null });
        try {
            const updatePayload = {
                driverName: driver.driverName,
                route: driver.route,
                email: driver.email,
                // Ensure driverId and authUserId are NOT included unless intentionally updating them
            };

            const updatedDocument = await databases.updateDocument(
                APPWRITE_DATABASE_ID,
                DRIVER_COLLECTION_ID,
                driver.$id, // Appwrite Document ID
                updatePayload
            );
            const updatedDriver = updatedDocument as unknown as Driver;
            set((state) => ({
                driverData: state.driverData.map((d) =>
                    d.$id === updatedDriver.$id ? updatedDriver : d
                ),
                isLoading: false,
            }));
        } catch (error: any) {
            console.error('Error updating driver document:', error);
            const errorMsg = error.message || 'Failed to update driver document';
            set({ error: errorMsg, isLoading: false });
            throw error; // Re-throw for component handling
        }
    },

    // --- Delete Driver (Auth User + Database Document) ---
    deleteDriverData: async (driverDocId) => {
        if (!API_BASE_URL || !APPWRITE_DATABASE_ID || !DRIVER_COLLECTION_ID) {
             const errorMsg = "URL/Database/Collection ID missing in config for deletion.";
             set({ isLoading: false, error: errorMsg });
             throw new Error(errorMsg);
        }
        set({ isLoading: true, error: null });
        let authUserIdToDelete: string | null | undefined = null;

        try {
            // 1. Find driver in state to get authUserId
            const driverToDelete = get().driverData.find(d => d.$id === driverDocId);
            if (!driverToDelete) {
                // If not found in state, maybe try fetching it? Or just proceed to DB delete.
                // For simplicity, we'll proceed, but log a warning.
                console.warn(`Driver document ${driverDocId} not found in local state for auth ID lookup.`);
                // throw new Error("Driver document not found in local state.");
            } else {
                authUserIdToDelete = driverToDelete.authUserId;
            }


            // 2. Delete Auth User via Backend (if authUserId exists)
            if (authUserIdToDelete) {
                // console.log(`Attempting to delete auth user via backend: ${authUserIdToDelete}`);
                try {
                    const response = await fetch(`${AUTH_API_URL}/${authUserIdToDelete}`, {
                        method: 'DELETE',
                    });
                    const deleteResult: DeleteResponse = await response.json();

                    if (!response.ok || !deleteResult.success) {
                        // Log the failure but don't stop the DB deletion process
                        console.warn(`Backend failed to delete auth user ${authUserIdToDelete}: ${deleteResult.message || response.statusText}`);
                        // Optionally set a specific error state here if needed
                        // set({ error: `Failed to delete associated auth user: ${deleteResult.message}` });
                    } else {
                        // console.log(`Successfully deleted auth user ${authUserIdToDelete} via backend.`);
                    }
                } catch (authDeleteError: any) {
                     console.warn(`Network or other error deleting auth user ${authUserIdToDelete} via backend:`, authDeleteError);
                     // Log and continue
                }
            } else {
                //  console.log(`No authUserId found for document ${driverDocId} or document not in state. Skipping backend auth user deletion.`);
            }

            // 3. Delete Driver Document from Appwrite Database
            // console.log(`Attempting to delete driver document: ${driverDocId}`);
            await databases.deleteDocument(
                APPWRITE_DATABASE_ID,
                DRIVER_COLLECTION_ID,
                driverDocId
            );
            // console.log(`Successfully deleted driver document: ${driverDocId}`);

            // 4. Update Frontend State
            set((state) => ({
                driverData: state.driverData.filter((driver) => driver.$id !== driverDocId),
                isLoading: false,
            }));

        } catch (error: any) {
            // This catch block primarily catches errors from databases.deleteDocument
            console.error('Error during driver deletion process (likely DB delete):', error);
            const errorMsg = error.message || 'Failed to delete driver document';
            set({ error: errorMsg, isLoading: false });
            throw error; // Re-throw for component handling
        }
    },

    // --- Add Driver (Auth User + Database Document) ---
    addDriverData: async (driverFormData) => {
        if (!API_BASE_URL || !APPWRITE_DATABASE_ID || !DRIVER_COLLECTION_ID) {
             const errorMsg = "URL/Database/Collection ID missing in config for adding driver.";
             set({ isLoading: false, error: errorMsg });
             throw new Error(errorMsg);
        }
        set({ isLoading: true, error: null });
        let createdAuthUserId: string | null = null; // To store the ID for potential rollback

        try {
            // 1. Create Auth User via Backend API
            const tempPassword = generateTemporaryPassword();
            const signupPayload = {
                email: driverFormData.email,
                password: tempPassword,
                name: driverFormData.driverName,
                labels: ['driver'] // Specify label for drivers
            };

            // console.log(`Attempting signup via backend for: ${driverFormData.email}`);
            const signupResponse = await fetch(`${AUTH_API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signupPayload),
            });

            const signupResult: SignupResponse = await signupResponse.json();

            if (!signupResponse.ok || !signupResult.success || !signupResult.userId) {
                // Throw specific error from backend if available
                throw new Error(`Auth user creation failed: ${signupResult.message || `HTTP ${signupResponse.status}`}`);
            }
            createdAuthUserId = signupResult.userId;
            // console.log(`Successfully created auth user via backend: ${createdAuthUserId} for ${driverFormData.email}`);

            // 2. Create Driver Document in Appwrite Database
            const addDocumentPayload = {
                driverName: driverFormData.driverName,
                route: driverFormData.route,
                email: driverFormData.email,
                driverId: ID.unique(), // Specific ID for the driver data itself
                authUserId: createdAuthUserId, // Link to the Auth User ID
                // other fields like latitude, longitude will be undefined/null initially
            };

            // console.log(`Attempting to create driver document for: ${driverFormData.email}`);
            // console.log('Payload for createDocument:', JSON.stringify(addDocumentPayload, null, 2)); // Log payload

            const newDocument = await databases.createDocument(
                APPWRITE_DATABASE_ID,
                DRIVER_COLLECTION_ID,
                ID.unique(), // Appwrite Document ID ($id)
                addDocumentPayload
            );
            // console.log(`Successfully created driver document: ${newDocument.$id}`);
            const addedDriver = newDocument as unknown as Driver;

            // 3. Update Frontend State
            set((state) => ({
                driverData: [...state.driverData, addedDriver],
                isLoading: false,
            }));
            return addedDriver; // Return the newly added driver object

        } catch (error: any) {
            console.error('Error during driver creation process:', error);

            // --- Rollback Auth User Creation if DB Insert Failed ---
            if (createdAuthUserId && error.message && !error.message.includes('Auth user creation failed')) {
                 console.warn(`Database document creation failed after auth user ${createdAuthUserId} was created. Attempting rollback of auth user.`);
                 try {
                     const rollbackResponse = await fetch(`${AUTH_API_URL}/${createdAuthUserId}`, { method: 'DELETE' });
                     const rollbackResult: DeleteResponse = await rollbackResponse.json();
                     if (rollbackResponse.ok && rollbackResult.success) {
                        //  console.log(`Successfully rolled back (deleted) auth user ${createdAuthUserId}.`);
                     } else {
                         console.error(`FAILED TO ROLLBACK auth user ${createdAuthUserId}: ${rollbackResult.message || `HTTP ${rollbackResponse.status}`}`);
                         // Log this critical state - manual cleanup might be needed
                     }
                 } catch (rollbackError: any) {
                     console.error(`Network or other error during auth user ${createdAuthUserId} rollback:`, rollbackError);
                 }
            }

            const errorMsg = error.message || 'Failed to add driver';
            set({ error: errorMsg, isLoading: false });
            // Do not return the driver object on error
            // throw error; // Re-throw error for component handling
             return null; // Indicate failure to the caller
        }
    },

}));