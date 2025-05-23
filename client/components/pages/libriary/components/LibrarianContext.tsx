// ~/components/LibrarianContext.tsx (or app/components/LibrarianContext.tsx or a dedicated contexts/ folder)

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Models } from 'appwrite'; // Import Models directly from the appwrite package
import { account } from '~/utils/appwrite'; // Adjust path to your Appwrite utility for 'account' and 'databases'

// 1. Define the shape of your Librarian data
export interface Librarian {
    id: string; // Typically Appwrite User ID or a document ID from a 'librarians' collection
    name: string;
    email: string; // Usually from the Appwrite account
    employeeId?: string;
    department?: string;
    profilePictureUrl?: string; // Optional: if you store profile pictures
    // Add other librarian-specific fields as needed
}

// 2. Define the context type
export interface LibrarianContextType {
    librarianData: Librarian | null;
    loading: boolean;
    error: Error | string | null; // Can be Error object or a string message
    refetchLibrarianData: () => Promise<void>; // Function to manually refetch data
}

// 3. Create the context with a default undefined value
const LibrarianContext = createContext<LibrarianContextType | undefined>(undefined);

// 4. Create a provider component
interface LibrarianDataProviderProps {
    children: ReactNode;
}

export const LibrarianDataProvider: React.FC<LibrarianDataProviderProps> = ({ children }) => {
    const [librarianData, setLibrarianData] = useState<Librarian | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | string | null>(null);

    const fetchLibrarianData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Step A: Get the currently authenticated Appwrite user
            const currentUser: Models.User<Models.Preferences> = await account.get();

            if (!currentUser) {
                throw new Error("No authenticated user found.");
            }

            // Step B: Fetch librarian-specific details.
            // OPTION 1: User's name/email IS the librarian data (simple case)
            // OPTION 2: Fetch from a 'librarians' collection using currentUser.$id (more common)

            /*
            // UNCOMMENT AND ADAPT THIS BLOCK FOR ACTUAL APPWRITE INTEGRATION
            // Make sure you have 'databases' imported from your Appwrite utility
            // and your DATABASE_ID and LIBRARIANS_COLLECTION_ID are defined.

            import { databases, LIBRARIANS_COLLECTION_ID, DATABASE_ID } from '~/utils/appwrite'; // Adjust path
            import { Query } from 'appwrite'; // Query is also imported directly

            const response = await databases.listDocuments<Models.Document & LibrarianCustomAttributes>( // Type the document if you have custom attributes
                DATABASE_ID,
                LIBRARIANS_COLLECTION_ID,
                [
                    Query.equal('userId', currentUser.$id), // Assuming 'userId' field in your collection
                    Query.limit(1)
                ]
            );

            // Define an interface for your specific document attributes if not already part of Librarian interface
            // interface LibrarianCustomAttributes {
            //   userId: string;
            //   employeeId?: string;
            //   department?: string;
            //   // other fields from your Appwrite collection document
            // }


            if (response.documents.length > 0) {
                const specificLibrarianData = response.documents[0]; // This is Models.Document
                setLibrarianData({
                    id: currentUser.$id,
                    name: currentUser.name || specificLibrarianData.name || "Librarian", // specificLibrarianData.name assumes 'name' is an attribute
                    email: currentUser.email,
                    employeeId: specificLibrarianData.employeeId, // Access custom attributes
                    department: specificLibrarianData.department,
                    // map other fields...
                });
            } else {
                console.warn(`No specific librarian profile found for user ID: ${currentUser.$id}. Using basic Appwrite user info.`);
                setLibrarianData({
                    id: currentUser.$id,
                    name: currentUser.name || "Librarian User",
                    email: currentUser.email,
                });
            }
            */

            // --- SIMULATED DATA FETCH (Remove this block when using actual Appwrite) ---
            console.log("Simulating librarian data fetch for user:", currentUser.email);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
            setLibrarianData({
                id: currentUser.$id,
                name: currentUser.name || `Librarian ${currentUser.email.split('@')[0]}`,
                email: currentUser.email,
                employeeId: "EMP" + Math.floor(Math.random() * 10000),
                department: "General Library Services",
            });
            // --- END SIMULATED DATA FETCH ---

        } catch (err: any) {
            console.error("Failed to fetch librarian data:", err);
            setError(err.message || "An unknown error occurred while fetching librarian data.");
            setLibrarianData(null); // Clear data on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLibrarianData();
    }, []); // Fetch data on component mount

    return (
        <LibrarianContext.Provider value={{ librarianData, loading, error, refetchLibrarianData: fetchLibrarianData }}>
            {children}
        </LibrarianContext.Provider>
    );
};

// 5. Create a custom hook to use the Librarian context
export const useLibrarianData = (): LibrarianContextType => {
    const context = useContext(LibrarianContext);
    if (context === undefined) {
        throw new Error('useLibrarianData must be used within a LibrarianDataProvider');
    }
    return context;
};