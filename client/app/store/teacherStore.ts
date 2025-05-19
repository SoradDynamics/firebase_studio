// src/store/teacherStore.ts
import { create } from 'zustand';
import { databases } from '~/utils/appwrite';
import { ID } from 'appwrite';
import { Teacher } from 'types/teacher';

// --- Environment Variables ---
const API_BASE_URL = import.meta.env.VITE_SERVER_URL;
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TEACHER_COLLECTION_ID = import.meta.env.VITE_APPWRITE_TEACHER_COLLECTION_ID;

if (!API_BASE_URL) {
    console.error("FATAL ERROR: VITE_SERVER_URL is not defined in .env");
}
if (!APPWRITE_DATABASE_ID) {
    console.error("FATAL ERROR: VITE_APPWRITE_DATABASE_ID is not defined in .env");
}
if (!TEACHER_COLLECTION_ID) {
    console.error("FATAL ERROR: VITE_APPWRITE_TEACHER_COLLECTION_ID is not defined in .env");
}

const AUTH_API_URL = `${API_BASE_URL}/api/users/auth`;

// --- Helper Types ---
export interface TeacherFormData {
    name: string;
    subject: string[];
    level: string[];
    qualification: string;
    email: string;
}

interface SignupResponse {
    success: boolean;
    message: string;
    userId?: string;
    email?: string;
    name?: string;
    labels?: string[];
}

interface DeleteResponse {
    success: boolean;
    message: string;
}

// --- Zustand Store Definition ---
interface TeacherState {
    teacherData: Teacher[];
    isLoading: boolean;
    isFetching: boolean;
    error: string | null;
    fetchTeachersData: () => Promise<void>;
    updateTeacherData: (teacherUpdateData: Pick<Teacher, '$id' | 'name' | 'subject' | 'level' | 'qualification' | 'email'>) => Promise<void>;
    deleteTeacherData: (teacherDocId: string) => Promise<void>;
    addTeacherData: (teacherFormData: TeacherFormData) => Promise<Teacher | null>;
}

const generateTemporaryPassword = (): string => {
    console.warn("SECURITY WARNING: Using insecure temporary password generation!");
    return `TempPass_${Math.random().toString(36).slice(-8)}`;
};

export const useTeacherStore = create<TeacherState>((set, get) => ({
    teacherData: [],
    isLoading: false,
    isFetching: false,
    error: null,

    fetchTeachersData: async () => {
        if (!APPWRITE_DATABASE_ID || !TEACHER_COLLECTION_ID) {
            set({ isFetching: false, error: "Appwrite Database/Teacher Collection ID missing." });
            return;
        }
        set({ isFetching: true, error: null });
        try {
            const response = await databases.listDocuments(
                APPWRITE_DATABASE_ID,
                TEACHER_COLLECTION_ID
            );
            const teachers = response.documents as unknown as Teacher[];
            set({ teacherData: teachers, isFetching: false });
        } catch (error: any) {
            console.error('Error fetching teachers data:', error);
            const errorMsg = error.message || 'Failed to fetch teachers data';
            set({ error: errorMsg, isFetching: false });
        }
    },

    updateTeacherData: async (teacherUpdateData) => {
        if (!APPWRITE_DATABASE_ID || !TEACHER_COLLECTION_ID) {
            const errorMsg = "Appwrite Database/Teacher Collection ID missing for update.";
            set({ isLoading: false, error: errorMsg });
            throw new Error(errorMsg);
        }
        set({ isLoading: true, error: null });
        try {
            const updatePayload = {
                name: teacherUpdateData.name,
                subject: teacherUpdateData.subject,
                level: teacherUpdateData.level,
                qualification: teacherUpdateData.qualification,
                email: teacherUpdateData.email,
            };

            const updatedDocument = await databases.updateDocument(
                APPWRITE_DATABASE_ID,
                TEACHER_COLLECTION_ID,
                teacherUpdateData.$id,
                updatePayload
            );
            const updatedTeacher = updatedDocument as unknown as Teacher;
            set((state) => ({
                teacherData: state.teacherData.map((t) =>
                    t.$id === updatedTeacher.$id ? { ...t, ...updatedTeacher } : t
                ),
                isLoading: false,
            }));
        } catch (error: any) {
            console.error('Error updating teacher document:', error);
            const errorMsg = error.message || 'Failed to update teacher document';
            set({ error: errorMsg, isLoading: false });
            throw error;
        }
    },

    deleteTeacherData: async (teacherDocId) => {
        console.log(`[deleteTeacherData] Initiating delete for document ID: ${teacherDocId}`);

        if (!API_BASE_URL || !APPWRITE_DATABASE_ID || !TEACHER_COLLECTION_ID) {
             const errorMsg = "Config missing for teacher deletion (URL/Database/Collection ID).";
             console.error("[deleteTeacherData]", errorMsg);
             set({ isLoading: false, error: errorMsg });
             throw new Error(errorMsg);
        }
        set({ isLoading: true, error: null });
        let authUserIdToDelete: string | null | undefined = null;

        try {
            // 1. Find teacher in state to get authUserId
            const teacherToDelete = get().teacherData.find(t => t.$id === teacherDocId);

            if (teacherToDelete) {
                console.log("[deleteTeacherData] Found teacher in state:", JSON.parse(JSON.stringify(teacherToDelete))); // Deep copy for logging
                authUserIdToDelete = teacherToDelete.authUserId;
                if (!authUserIdToDelete) {
                    console.warn(`[deleteTeacherData] authUserId is missing or empty on teacher object for doc ID: ${teacherDocId}. Teacher object:`, teacherToDelete);
                }
            } else {
                console.warn(`[deleteTeacherData] Teacher document ${teacherDocId} not found in local state. Cannot get authUserId directly.`);
                // Optionally, you could try to fetch the document here to get the authUserId if not in local state,
                // but that adds complexity. For now, we rely on it being in the local state.
            }

            console.log(`[deleteTeacherData] authUserId to delete from Auth: ${authUserIdToDelete}`);

            // 2. Delete Auth User via Backend (if authUserId exists)
            if (authUserIdToDelete) {
                const deleteAuthUserUrl = `${AUTH_API_URL}/${authUserIdToDelete}`;
                console.log(`[deleteTeacherData] Attempting to delete auth user via backend: ${deleteAuthUserUrl}`);
                try {
                    const response = await fetch(deleteAuthUserUrl, {
                        method: 'DELETE',
                    });
                    const deleteResultText = await response.text(); // Get text first for better debugging
                    console.log(`[deleteTeacherData] Backend response status for auth delete: ${response.status}`);
                    console.log(`[deleteTeacherData] Backend response text for auth delete: ${deleteResultText}`);

                    let deleteResult: DeleteResponse;
                    try {
                        deleteResult = JSON.parse(deleteResultText);
                    } catch (e) {
                        console.error("[deleteTeacherData] Failed to parse backend JSON response for auth delete:", e);
                        // If parsing fails, but status was ok, it's an issue. If status was bad, it's expected.
                        if (!response.ok) {
                             throw new Error(`Auth user deletion failed with status ${response.status}. Response: ${deleteResultText}`);
                        }
                        // If it was OK but not valid JSON, treat as failure
                        deleteResult = { success: false, message: "Invalid JSON response from backend" };
                    }


                    if (!response.ok || !deleteResult.success) {
                        console.warn(`[deleteTeacherData] Backend failed to delete auth user ${authUserIdToDelete}. Message: ${deleteResult.message || `HTTP ${response.status}`}. Full response:`, deleteResult);
                        // Do not throw here, proceed to delete the DB document anyway, but log the auth failure.
                        // set({ error: `Failed to delete associated auth user: ${deleteResult.message || 'Unknown backend error'}` }); // Optional: set a non-blocking error
                    } else {
                        console.log(`[deleteTeacherData] Successfully deleted auth user ${authUserIdToDelete} via backend.`);
                    }
                } catch (authDeleteError: any) {
                     console.warn(`[deleteTeacherData] Network or other error during auth user deletion for ${authUserIdToDelete}:`, authDeleteError);
                     // Log and continue to DB deletion
                }
            } else {
                 console.log(`[deleteTeacherData] No authUserId found or teacher not in state for document ${teacherDocId}. Skipping backend auth user deletion.`);
            }

            // 3. Delete Teacher Document from Appwrite Database
            console.log(`[deleteTeacherData] Attempting to delete teacher document from DB: ${teacherDocId}`);
            await databases.deleteDocument(
                APPWRITE_DATABASE_ID,
                TEACHER_COLLECTION_ID,
                teacherDocId
            );
            console.log(`[deleteTeacherData] Successfully deleted teacher document from DB: ${teacherDocId}`);

            // 4. Update Frontend State
            set((state) => ({
                teacherData: state.teacherData.filter((teacher) => teacher.$id !== teacherDocId),
                isLoading: false,
            }));
            console.log(`[deleteTeacherData] Successfully updated frontend state.`);

        } catch (error: any) {
            // This catch block primarily catches errors from databases.deleteDocument or fatal errors in the process
            console.error('[deleteTeacherData] Error during overall teacher deletion process:', error);
            const errorMsg = error.message || 'Failed to delete teacher';
            set({ error: errorMsg, isLoading: false });
            throw error; // Re-throw for component handling
        }
    },

    addTeacherData: async (teacherFormData) => {
        if (!API_BASE_URL || !APPWRITE_DATABASE_ID || !TEACHER_COLLECTION_ID) {
             const errorMsg = "Config missing for adding teacher.";
             set({ isLoading: false, error: errorMsg });
             throw new Error(errorMsg);
        }
        set({ isLoading: true, error: null });
        let createdAuthUserId: string | null = null;

        try {
            const tempPassword = generateTemporaryPassword();
            const signupPayload = {
                email: teacherFormData.email,
                password: tempPassword,
                name: teacherFormData.name,
                labels: ['teacher']
            };

            const signupResponse = await fetch(`${AUTH_API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signupPayload),
            });
            const signupResult: SignupResponse = await signupResponse.json();

            if (!signupResponse.ok || !signupResult.success || !signupResult.userId) {
                throw new Error(`Auth user creation failed: ${signupResult.message || `HTTP ${signupResponse.status}`}`);
            }
            createdAuthUserId = signupResult.userId;

            const addDocumentPayload = {
                id: ID.unique(),
                name: teacherFormData.name,
                subject: teacherFormData.subject,
                level: teacherFormData.level,
                qualification: teacherFormData.qualification,
                email: teacherFormData.email,
                authUserId: createdAuthUserId,
                // Ensure base_salary, salary, assignemnts, notes are optional in Appwrite or have defaults
                // if they are required. Otherwise, provide default empty values here:
                // base_salary: "", // Example if required and string
                // salary: [], // Example if required and string array
                // assignemnts: [], // Example
                // notes: [], // Example
            };

            const newDocument = await databases.createDocument(
                APPWRITE_DATABASE_ID,
                TEACHER_COLLECTION_ID,
                ID.unique(),
                addDocumentPayload
            );
            const addedTeacher = newDocument as unknown as Teacher;

            set((state) => ({
                teacherData: [...state.teacherData, addedTeacher],
                isLoading: false,
            }));
            return addedTeacher;

        } catch (error: any) {
            console.error('Error during teacher creation process:', error);
            if (createdAuthUserId && error.message && !error.message.includes('Auth user creation failed')) {
                 console.warn(`DB document creation failed for teacher after auth user ${createdAuthUserId} was created. Attempting rollback.`);
                 try {
                     await fetch(`${AUTH_API_URL}/${createdAuthUserId}`, { method: 'DELETE' });
                 } catch (rollbackError: any) {
                     console.error(`FAILED TO ROLLBACK auth user ${createdAuthUserId}:`, rollbackError);
                 }
            }
            const errorMsg = error.message || 'Failed to add teacher';
            set({ error: errorMsg, isLoading: false });
            return null;
        }
    },
}));