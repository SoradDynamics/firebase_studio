// ~/store/studentStore.ts
import { create } from "zustand";
import { databases, iD } from "~/utils/appwrite";
import { ID, Query } from "appwrite";
import { useParentStore } from "./parentStore"; // Import parent store

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// Define the structure of a Student document from Appwrite
export interface Student {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  id: string; // Appwrite User ID
  name: string;
  class: string;
  facultyId: string;
  section: string;
  parentId: string; // Parent Document ID
  stdEmail: string;
  absent?: string[];
  $collectionId: string;
  $databaseId: string;
  $permissions: string[];
}

// --- FIX: Export the type ---
// Define type for data payload for student update
export type StudentUpdateData = Partial<Pick<Student, 'name' | 'class' | 'facultyId' | 'section' | 'parentId'>>;
 
// Define the state structure and actions for the Zustand store
interface StudentState {
  studentData: Student[];
  isLoading: boolean;
  error: string | null;
  fetchStudentData: () => Promise<void>;
  addStudentData: (
      studentInputData: Omit<Student, "$id" | "$createdAt" | "$updatedAt" | "$collectionId" | "$databaseId" | "$permissions">,
      studentUserId: string
    ) => Promise<Student | null>;
  updateStudentData: (
      studentDocId: string,
      dataToUpdate: StudentUpdateData // Use the exported type
  ) => Promise<Student | null>;
  deleteStudentData: (studentDocId: string) => Promise<void>;
}

export const useStudentStore = create<StudentState>((set, get) => ({
  studentData: [],
  isLoading: false,
  error: null,

  // --- fetchStudentData (no change) ---
  fetchStudentData: async () => {
    set({ isLoading: true, error: null });
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const studentCollectionId = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID!;
      if (!databaseId || !studentCollectionId) throw new Error("Student Store: DB/Collection ID missing.");

      const response = await databases.listDocuments(databaseId, studentCollectionId, [Query.limit(5000)]);
      const students = response.documents as unknown as Student[];
      set({ studentData: students, isLoading: false });
      // console.log("Student Store: Fetched student data.");
    } catch (error: any) {
      // console.error("Student Store: Error fetching student data:", error);
      set({ error: error.message || "Failed to fetch students", isLoading: false });
    }
  },

  // --- addStudentData (no change) ---
  addStudentData: async (studentInput, studentUserId) => {
    set({ isLoading: true, error: null });
    try {
        const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
        const studentCollectionId = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID!;
        if (!databaseId || !studentCollectionId) throw new Error("Student Store: DB/Collection ID missing.");

        const dataToSave = { ...studentInput, id: studentUserId };
        const newStudentDoc = await databases.createDocument(databaseId, studentCollectionId, ID.unique(), dataToSave);
        const addedStudent = newStudentDoc as unknown as Student;

        set((state) => ({ studentData: [...state.studentData, addedStudent], isLoading: false }));
        // console.log("Student Store: Student document created:", addedStudent.$id);
        return addedStudent;
    } catch (error: any) {
        console.error("Student Store: Error adding student data:", error);
        set({ error: error.message || "Failed to add student document", isLoading: false });
        return null;
    }
  },

  // --- updateStudentData (no change) ---
  updateStudentData: async (studentDocId, dataToUpdate) => {
     set({ error: null });
     try {
        const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
        const studentCollectionId = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID!;
        if (!databaseId || !studentCollectionId) throw new Error("Student Store: DB/Collection ID missing.");
        if (Object.keys(dataToUpdate).length === 0) {
             console.warn("Student Store: updateStudentData called with empty data.");
             return get().studentData.find(s => s.$id === studentDocId) || null;
        }

        const updatedDoc = await databases.updateDocument(databaseId, studentCollectionId, studentDocId, dataToUpdate);
        const updatedStudent = updatedDoc as unknown as Student;

        set((state) => ({ studentData: state.studentData.map((s) => s.$id === studentDocId ? updatedStudent : s) }));
        // console.log(`Student Store: Updated student document ${studentDocId}.`);
        return updatedStudent;
     } catch (error: any) {
        console.error(`Student Store: Error updating student document ${studentDocId}:`, error);
        set({ error: error.message || "Failed to update student details" });
        throw error;
     }
  },

  // --- deleteStudentData (no change) ---
  deleteStudentData: async (studentDocId) => {
    // console.log(`Student Store: Initiating deletion for student ${studentDocId}`);
    set({ error: null });

    const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
    const studentCollectionId = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID!;
    if (!databaseId || !studentCollectionId) {
        const msg = "Student Store Error: Missing DB/Collection ID configuration.";
        console.error(msg); set({ error: msg }); throw new Error(msg);
    }

    let studentUserId: string | null = null;
    let parentDocId: string | null = null;
    const originalStudentState = get().studentData.find(s => s.$id === studentDocId);

    try {
        // console.log(`Student Store: Fetching student document ${studentDocId} for IDs.`);
        const studentDoc = originalStudentState ?? await databases.getDocument(databaseId, studentCollectionId, studentDocId);
        studentUserId = studentDoc.id;
        parentDocId = studentDoc.parentId;
        // console.log(`Student Store: Found Student ${studentDocId}, UserID=${studentUserId}, ParentDocID=${parentDocId}`);
        if (!studentUserId || !parentDocId) throw new Error(`Student document ${studentDocId} data is incomplete.`);

        // console.log(`Student Store: Calling parent store handler for parent ${parentDocId}`);
        const parentHandled = await useParentStore.getState().handleParentOnStudentDelete(parentDocId, studentDocId);
        if (!parentHandled) throw new Error(`Student Store: Parent store failed to handle parent ${parentDocId}.`);
        // console.log(`Student Store: Parent store handler completed for ${parentDocId}.`);

        // console.log(`Student Store: Deleting Student Document ${studentDocId}`);
        await databases.deleteDocument(databaseId, studentCollectionId, studentDocId);
        // console.log(`Student Store: Deleted Student Document ${studentDocId}.`);

        // console.log(`Student Store: Requesting backend to delete Student User ${studentUserId}`);
        const response = await fetch(`${SERVER_URL}/api/users/delete/${studentUserId}`, { method: 'DELETE' });
        if (!response.ok) {
            const errData = await response.json().catch(()=>({}));
            // console.warn(`Student Store: Backend failed to delete student user ${studentUserId} (Status: ${response.status}): ${errData.message || 'Unknown'}`);
        } else { 
          // console.log(`Student Store: Backend deleted Student User ${studentUserId}.`);
         }

        set((state) => ({ studentData: state.studentData.filter((s) => s.$id !== studentDocId) }));
        // console.log(`Student Store: Removed student ${studentDocId} from local state.`);

    } catch (error: any) {
        console.error(`Student Store: Error during deletion process for student ${studentDocId}:`, error);
        let errorMessage = `Failed to delete student ${studentDocId}.`;
         if (error.code === 404) {
             errorMessage = `Student document ${studentDocId} not found.`; console.warn(errorMessage);
             set((state) => ({ studentData: state.studentData.filter((s) => s.$id !== studentDocId) }));
         } else if (error.message) { errorMessage = error.message; }
        set({ error: errorMessage }); throw new Error(errorMessage);
    }
  },
}));