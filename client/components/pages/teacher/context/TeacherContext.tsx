// src/contexts/TeacherContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { account, databases, APPWRITE_DATABASE_ID, TEACHER_COLLECTION_ID } from '~/utils/appwrite'; // Base Appwrite utilities
import { Models, Query } from 'appwrite'; // Appwrite types

// --- Configuration ---
// IMPORTANT: Define your Appwrite Collection ID for teachers; // REPLACE 'teachers' with your actual collection ID for coll-teacher

// --- Interfaces ---

// Interface for the Appwrite User object
// Models.User<Models.Preferences> is the direct type from Appwrite SDK
interface AppwriteUser extends Models.User<Models.Preferences> {}

// Interface for your 'coll-teacher' document structure
// Add all relevant fields from your coll-teacher collection
export interface TeacherProfile extends Models.Document {
    // Assuming $id of this document IS the Appwrite User ID
    // If not, you might have a 'userId' field that links to AppwriteUser.$id
    name: string;
    email: string; // Often duplicated from AppwriteUser for convenience, or specific contact email
    subjects?: string[];
    levels?: string[]; // e.g., "Secondary", "Higher Secondary"
    qualification?: string;
    // Add any other fields specific to your teacher profile
}

interface TeacherContextType {
    appwriteUser: AppwriteUser | null;    // The raw Appwrite User object
    teacherProfile: TeacherProfile | null; // The document from your 'coll-teacher'
    isLoading: boolean;
    error: string | null;
    isTeacher: boolean; // Convenience flag
    refetchTeacherData: () => Promise<void>; // Function to manually refetch
}

// --- Context Definition ---
const TeacherContext = createContext<TeacherContextType | undefined>(undefined);

// --- Custom Hook for Consuming Context ---
export const useTeacher = (): TeacherContextType => {
    const context = useContext(TeacherContext);
    if (!context) {
        throw new Error('useTeacher must be used within a TeacherProvider');
    }
    return context;
};

// --- Provider Component ---
export const TeacherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [appwriteUser, setAppwriteUser] = useState<AppwriteUser | null>(null);
    const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isTeacher, setIsTeacher] = useState(false);

    const fetchTeacherData = useCallback(async () => {
        console.log("TeacherContext: Attempting to fetch teacher data...");
        setIsLoading(true);
        setError(null);
        setAppwriteUser(null);
        setTeacherProfile(null);
        setIsTeacher(false);

        try {
            if (!APPWRITE_DATABASE_ID || !TEACHER_COLLECTION_ID) {
                throw new Error("System Configuration Error: Database ID or Teacher Collection ID is not defined.");
            }

            // 1. Get the current Appwrite authenticated user
            const currentAppwriteUserSession = await account.get();
            console.log("TeacherContext: Current Appwrite user session:", currentAppwriteUserSession);
            setAppwriteUser(currentAppwriteUserSession);

            // 2. Check if the user is designated as a teacher (e.g., via labels or a role)
            // Adjust this condition based on how you identify teachers
            const userIsTeacher = currentAppwriteUserSession.labels.includes('teacher');
            // Alternatively, you might check a custom claim if using Appwrite Functions for roles

            if (userIsTeacher) {
                console.log(`TeacherContext: User ${currentAppwriteUserSession.$id} has 'teacher' label.`);
                setIsTeacher(true);

                // 3. Fetch the corresponding document from your 'coll-teacher'
                // Assuming the document $id in 'coll-teacher' is the same as the Appwrite User $id
                // If you have a different field (e.g., 'userId') in 'coll-teacher' that stores the Appwrite User $id,
                // change Query.equal('$id', ...) to Query.equal('userId', ...)
                const teacherProfileResponse = await databases.listDocuments<TeacherProfile>(
                    APPWRITE_DATABASE_ID,
                    TEACHER_COLLECTION_ID,
                    [Query.equal('$id', currentAppwriteUserSession.$id), Query.limit(1)]
                );

                console.log("TeacherContext: Response from coll-teacher query:", teacherProfileResponse);

                if (teacherProfileResponse.documents.length > 0) {
                    const profile = teacherProfileResponse.documents[0];
                    setTeacherProfile(profile);
                    console.log("TeacherContext: Successfully found and set teacherProfile:", profile);
                } else {
                    console.warn(`TeacherContext: No teacher profile document found in '${TEACHER_COLLECTION_ID}' for Appwrite User ID: ${currentAppwriteUserSession.$id}. The user has the 'teacher' label, but their profile is missing.`);
                    setError(`Teacher profile data not found. Please contact support if you are a registered teacher.`);
                    // setIsTeacher(false); // Optionally revoke teacher status if profile is crucial
                }
            } else {
                console.log(`TeacherContext: User ${currentAppwriteUserSession.$id} does not have 'teacher' label or is not recognized as a teacher.`);
                setError("Access Denied: You are not recognized as a teacher.");
                setIsTeacher(false);
            }
        } catch (e: any) {
            // Handle errors, including no active session (AppwriteError code 401)
            if (e?.code === 401 || (e instanceof Error && e.message.toLowerCase().includes('user (role: guests) missing scope (account)'))) {
                console.log("TeacherContext: No active user session or guest user trying to access account.");
                setError("You are not logged in. Please log in to access teacher features.");
            } else {
                const errorMsg = e instanceof Error ? e.message : "An unexpected error occurred while fetching teacher data.";
                console.error("TeacherContext: Error fetching teacher data:", e);
                setError(errorMsg);
            }
            setAppwriteUser(null);
            setTeacherProfile(null);
            setIsTeacher(false);
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array means this useCallback version is stable

    useEffect(() => {
        fetchTeacherData();
    }, [fetchTeacherData]); // fetchTeacherData is now stable due to useCallback

    return (
        <TeacherContext.Provider value={{ appwriteUser, teacherProfile, isLoading, error, isTeacher, refetchTeacherData: fetchTeacherData }}>
            {children}
        </TeacherContext.Provider>
    );
};