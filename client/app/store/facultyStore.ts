// ~/store/facultyStore.ts
import { create } from 'zustand';
import { databases } from '~/utils/appwrite';
import { Faculty } from 'types'; // Import Faculty interface

interface FacultyState {
  facultyData: Faculty[];
  isLoading: boolean;
  isFacultyLoading: boolean;
  error: string | null;
  fetchFacultyData: () => Promise<void>;
  updateFacultyData: (faculty: Faculty) => Promise<void>;
  deleteFacultyData: (facultyId: string) => Promise<void>;
  addFacultyData: (faculty: Omit<Faculty, '$id' | '$createdAt' | '$updatedAt'>) => Promise<void>;
}

export const useFacultyStore = create<FacultyState>((set, get) => ({
  facultyData: [],
  isLoading: false,
  isFacultyLoading: false,
  error: null,
  fetchFacultyData: async () => {
    set({ isLoading: true, isFacultyLoading: true, error: null });
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const facultyCollectionId = import.meta.env.VITE_APPWRITE_FACULTY_COLLECTION_ID!;

      if (!databaseId || !facultyCollectionId) {
        throw new Error("Database and Faculty Collection IDs are not defined in environment variables.");
      }

      const response = await databases.listDocuments(
        databaseId,
        facultyCollectionId
      );

      const facultyMembers = response.documents as unknown as Faculty[];
      set({ facultyData: facultyMembers, isLoading: false, isFacultyLoading: false });
    } catch (error: any) {
      console.error('Error fetching faculty data:', error);
      set({ error: error.message || 'Failed to fetch faculty data', isLoading: false, isFacultyLoading: false });
    }
  },
  updateFacultyData: async (faculty) => {
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const facultyCollectionId = import.meta.env.VITE_APPWRITE_FACULTY_COLLECTION_ID!;

      if (!databaseId || !facultyCollectionId) {
        throw new Error("Database and Faculty Collection IDs are not defined in environment variables.");
      }

      await databases.updateDocument(
        databaseId,
        facultyCollectionId,
        faculty.$id,
        {
          name: faculty.name,
          classes: faculty.classes,
          id: faculty.id,
        }
      );

      set((state) => ({
        facultyData: state.facultyData.map((f) =>
          f.$id === faculty.$id ? faculty : f
        ),
      }));


    } catch (error: any) {
      console.error('Error updating faculty data in Appwrite:', error);
      throw error;
    }
  },
  deleteFacultyData: async (facultyId) => {
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const facultyCollectionId = import.meta.env.VITE_APPWRITE_FACULTY_COLLECTION_ID!;

      if (!databaseId || !facultyCollectionId) {
        throw new Error("Database and Faculty Collection IDs are not defined in environment variables.");
      }

      await databases.deleteDocument(
        databaseId,
        facultyCollectionId,
        facultyId
      );

      set((state) => ({
        facultyData: state.facultyData.filter((faculty) => faculty.$id !== facultyId),
      }));


    } catch (error: any) {
      console.error('Error deleting faculty data in Appwrite:', error);
      throw error;
    }
  },
  addFacultyData: async (faculty) => {
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const facultyCollectionId = import.meta.env.VITE_APPWRITE_FACULTY_COLLECTION_ID!;

      if (!databaseId || !facultyCollectionId) {
        throw new Error("Database and Faculty Collection IDs are not defined in environment variables.");
      }

      const newDocument = await databases.createDocument(
        databaseId,
        facultyCollectionId,
        'unique()',
        faculty
      );

      const addedFaculty: Faculty = newDocument as unknown as Faculty;

      set((state) => ({
        facultyData: [...state.facultyData, addedFaculty],
      }));

    } catch (error: any) {
      console.error('Error adding faculty data in Appwrite:', error);
      throw error;
    }
  },
}));