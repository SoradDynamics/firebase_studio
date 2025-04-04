// ~/store/parentStore.ts
import { create } from "zustand";
import { databases, iD } from "~/utils/appwrite";
import { ID, Query } from "appwrite";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// Define the structure of a Parent document from Appwrite
export interface Parent {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  id: string; // Appwrite User ID
  name: string;
  email: string;
  contact: string[];
  students: string[]; // Array of student document IDs
  $collectionId: string;
  $databaseId: string;
  $permissions: string[];
}

// --- FIX: Export the type ---
// Define the type for data payload when updating parent's own details
export type ParentDetailsUpdateData = Partial<Pick<Parent, 'name' | 'email' | 'contact'>>;

// Define the state structure and actions for the Zustand store
interface ParentState {
  parentData: Parent[];
  isLoading: boolean;
  error: string | null;
  fetchParentData: () => Promise<void>;
  addParentData: (
    parentInputData: Omit<Parent, "$id" | "$createdAt" | "$updatedAt" | "students" | "$collectionId" | "$databaseId" | "$permissions">,
    parentUserId: string
  ) => Promise<Parent | null>;
  updateParentData: (
    parentDocId: string,
    studentDocIdToAdd: string
  ) => Promise<Parent | null>;
  updateParentDetails: (
      parentDocId: string,
      dataToUpdate: ParentDetailsUpdateData // Use the exported type
  ) => Promise<Parent | null>;
  handleParentOnStudentDelete: (
      parentDocId: string,
      studentDocIdToRemove: string
    ) => Promise<boolean>;
}

export const useParentStore = create<ParentState>((set, get) => ({
  parentData: [],
  isLoading: false,
  error: null,

  // --- fetchParentData (no change) ---
  fetchParentData: async () => {
    set({ isLoading: true, error: null });
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const parentCollectionId = import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID!;
      if (!databaseId || !parentCollectionId) throw new Error("Parent Store: DB/Collection ID missing.");

      const response = await databases.listDocuments(databaseId, parentCollectionId, [Query.limit(5000)]);
      const parents = response.documents as unknown as Parent[];
      set({ parentData: parents, isLoading: false });
      // console.log("Parent Store: Fetched parent data.");
    } catch (error: any) {
      console.error("Parent Store: Error fetching parent data:", error);
      set({ error: error.message || "Failed to fetch parents", isLoading: false });
    }
  },

  // --- addParentData (no change) ---
  addParentData: async (parentInput, parentUserId) => {
    set({ isLoading: true, error: null });
    try {
        const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
        const parentCollectionId = import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID!;
        if (!databaseId || !parentCollectionId) throw new Error("Parent Store: DB/Collection ID missing.");

        const dataToSave = { ...parentInput, id: parentUserId, students: [] };
        const newParentDoc = await databases.createDocument(databaseId, parentCollectionId, ID.unique(), dataToSave);
        const addedParent = newParentDoc as unknown as Parent;

        set((state) => ({ parentData: [...state.parentData, addedParent], isLoading: false }));
        // console.log("Parent Store: Parent document created:", addedParent.$id);
        return addedParent;
    } catch (error: any) {
        console.error("Parent Store: Error adding parent data:", error);
        set({ error: error.message || "Failed to add parent document", isLoading: false });
        return null;
    }
  },

  // --- updateParentData (no change) ---
  updateParentData: async (parentDocId, studentDocIdToAdd) => {
     set({ error: null });
     try {
        const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
        const parentCollectionId = import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID!;
         if (!databaseId || !parentCollectionId) throw new Error("Parent Store: DB/Collection ID missing.");

        const currentParentDoc = await databases.getDocument(databaseId, parentCollectionId, parentDocId);
        const currentParent = currentParentDoc as unknown as Parent;
        const currentStudents = Array.isArray(currentParent.students) ? currentParent.students : [];
        if (currentStudents.includes(studentDocIdToAdd)) {
            console.warn(`Parent Store: Student ${studentDocIdToAdd} already in parent ${parentDocId}'s list.`);
            return get().parentData.find(p => p.$id === parentDocId) || null;
        }

        const updatedStudents = [...currentStudents, studentDocIdToAdd];
        const updatedParentDoc = await databases.updateDocument(databaseId, parentCollectionId, parentDocId, { students: updatedStudents });
        const updatedParent = updatedParentDoc as unknown as Parent;

        set((state) => ({ parentData: state.parentData.map((p) => p.$id === parentDocId ? updatedParent : p) }));
        // console.log(`Parent Store: Added student ${studentDocIdToAdd} to parent ${parentDocId}.`);
        return updatedParent;
    } catch (error: any) {
        console.error(`Parent Store: Error updating parent ${parentDocId} students array:`, error);
        set({ error: error.message || "Failed to update parent students array" });
         return null;
    }
  },

  // --- updateParentDetails (no change) ---
  updateParentDetails: async (parentDocId, dataToUpdate) => {
    set({ error: null });
     try {
        const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
        const parentCollectionId = import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID!;
        if (!databaseId || !parentCollectionId) throw new Error("Parent Store: DB/Collection ID missing.");
        if (Object.keys(dataToUpdate).length === 0) {
             console.warn("Parent Store: updateParentDetails called with empty data.");
             return get().parentData.find(p => p.$id === parentDocId) || null;
        }

        const updatedDoc = await databases.updateDocument(databaseId, parentCollectionId, parentDocId, dataToUpdate);
        const updatedParent = updatedDoc as unknown as Parent;

        set((state) => ({ parentData: state.parentData.map((p) => p.$id === parentDocId ? updatedParent : p) }));
        // console.log(`Parent Store: Updated details for parent ${parentDocId}.`);
        return updatedParent;
    } catch (error: any) {
        console.error(`Parent Store: Error updating parent details for ${parentDocId}:`, error);
        set({ error: error.message || "Failed to update parent details" });
        throw error;
    }
  },

  // --- handleParentOnStudentDelete (no change) ---
  handleParentOnStudentDelete: async (parentDocId, studentDocIdToRemove) => {
    // console.log(`Parent Store: Handling deletion of student ${studentDocIdToRemove} linked to parent ${parentDocId}`);
    set({ error: null });

    const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
    const parentCollectionId = import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID!;
    if (!databaseId || !parentCollectionId) {
        console.error("Parent Store Error: Missing DB/Collection ID configuration.");
        set({ error: "Server configuration error (Parent Store)." }); return false;
    }

    try {
        // console.log(`Parent Store: Fetching parent document ${parentDocId}`);
        const parentDoc = await databases.getDocument(databaseId, parentCollectionId, parentDocId);
        const parent = parentDoc as unknown as Parent;
        const parentUserId = parent.id;
        const currentStudents = Array.isArray(parent.students) ? parent.students : [];
        // console.log(`Parent Store: Found Parent ${parentDocId}, UserID=${parentUserId}, Students=${currentStudents.length}`);
        if (!currentStudents.includes(studentDocIdToRemove)) {
             console.warn(`Parent Store: Parent ${parentDocId} list does not contain student ${studentDocIdToRemove}. Assuming handled.`); return true;
        }

        if (currentStudents.length === 1) {
            // console.log(`Parent Store: Parent ${parentDocId} has only student ${studentDocIdToRemove}. Deleting parent document...`);
            await databases.deleteDocument(databaseId, parentCollectionId, parentDocId);
            // console.log(`Parent Store: Deleted Parent Document ${parentDocId}.`);
            if (parentUserId) {
                //  console.log(`Parent Store: Requesting backend to delete Parent User ${parentUserId}`);
                 const response = await fetch(`${SERVER_URL}/api/users/delete/${parentUserId}`, { method: 'DELETE' });
                 if (!response.ok) {
                    const errData = await response.json().catch(()=>({}));
                    console.warn(`Parent Store: Backend failed to delete parent user ${parentUserId}: ${errData.message || 'Unknown'}`);
                 } else { 
                  // console.log(`Parent Store: Backend deleted Parent User ${parentUserId}.`);
                 }
            } else { console.warn(`Parent Store: Cannot delete Parent User for ${parentDocId}, User ID missing.`); }
            set((state) => ({ parentData: state.parentData.filter((p) => p.$id !== parentDocId) }));
            // console.log(`Parent Store: Removed parent ${parentDocId} from local state.`);
        } else {
            // console.log(`Parent Store: Parent ${parentDocId} has other students. Removing ${studentDocIdToRemove} from list...`);
            const updatedStudents = currentStudents.filter(id => id !== studentDocIdToRemove);
            const updatedParentDoc = await databases.updateDocument(databaseId, parentCollectionId, parentDocId, { students: updatedStudents });
            const updatedParent = updatedParentDoc as unknown as Parent;
            // console.log(`Parent Store: Updated Parent Document ${parentDocId}. New count: ${updatedStudents.length}`);
            set((state) => ({ parentData: state.parentData.map((p) => p.$id === parentDocId ? updatedParent : p) }));
            //  console.log(`Parent Store: Updated parent ${parentDocId} in local state.`);
        }
        return true;
    } catch (error: any) {
        console.error(`Parent Store: Error handling parent logic (Parent: ${parentDocId}, Student: ${studentDocIdToRemove}):`, error);
        let errorMessage = "Failed to handle parent update/deletion.";
        if (error.code === 404) {
             errorMessage = `Parent document ${parentDocId} not found.`; console.warn(errorMessage);
             set((state) => ({ parentData: state.parentData.filter((p) => p.$id !== parentDocId) })); return true;
        } else if (error.message) { errorMessage = error.message; }
        set({ error: errorMessage }); return false;
    }
  },
}));