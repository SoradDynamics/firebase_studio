// ~/store/sectionStore.ts
import { create } from "zustand";
import { databases } from "~/utils/appwrite";
// import { Faculty } from "types"; // Import Faculty interface if needed

export interface Section {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  id?: string; // Optional id, if you want to manage ids manually
  name: string;
  class: string;
  facultyId: string;
  subjects?: string[]; // Optional subjects array
}

interface SectionState {
  sectionData: Section[];
  isLoading: boolean;
  error: string | null;
  fetchSectionData: () => Promise<void>;
  addSectionData: (section: Omit<Section, "$id" | "$createdAt" | "$updatedAt" | "id">) => Promise<void>; // Removed id from Omit
  updateSectionData: (section: Section) => Promise<void>;
  deleteSectionData: (sectionId: string) => Promise<void>;
}

export const useSectionStore = create<SectionState>((set) => ({
  sectionData: [],
  isLoading: false,
  error: null,
  fetchSectionData: async () => {
    set({ isLoading: true, error: null });
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const sectionCollectionId = import.meta.env.VITE_APPWRITE_SECTION_COLLECTION_ID!;

      if (!databaseId || !sectionCollectionId) {
        throw new Error(
          "Database and Section Collection IDs are not defined in environment variables."
        );
      }

      const response = await databases.listDocuments(
        databaseId,
        sectionCollectionId
      );

      const sections = response.documents as unknown as Section[];
      set({ sectionData: sections, isLoading: false });
    } catch (error: any) {
      console.error("Error fetching section data:", error);
      set({
        error: error.message || "Failed to fetch section data",
        isLoading: false,
      });
    }
  },
  addSectionData: async (section) => {
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const sectionCollectionId = import.meta.env.VITE_APPWRITE_SECTION_COLLECTION_ID!;

      if (!databaseId || !sectionCollectionId) {
        throw new Error(
          "Database and Section Collection IDs are not defined in environment variables."
        );
      }

      const newDocument = await databases.createDocument(
        databaseId,
        sectionCollectionId,
        ID.unique(), // Appwrite ID.unique() for auto-generated IDs
        section
      );

      const addedSection: Section = newDocument as unknown as Section;
      set((state) => ({
        sectionData: [...state.sectionData, addedSection],
      }));
    } catch (error: any) {
      console.error("Error adding section data:", error);
      throw error;
    }
  },
  updateSectionData: async (section) => {
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const sectionCollectionId = import.meta.env.VITE_APPWRITE_SECTION_COLLECTION_ID!;

      if (!databaseId || !sectionCollectionId) {
        throw new Error(
          "Database and Section Collection IDs are not defined in environment variables."
        );
      }

      await databases.updateDocument(
        databaseId,
        sectionCollectionId,
        section.$id,
        {
          name: section.name,
          class: section.class,
          facultyId: section.facultyId,
          subjects: section.subjects, // If you are managing subjects
        }
      );

      set((state) => ({
        sectionData: state.sectionData.map((s) =>
          s.$id === section.$id ? section : s
        ),
      }));
    } catch (error: any) {
      console.error("Error updating section data:", error);
      throw error;
    }
  },
  deleteSectionData: async (sectionId) => {
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const sectionCollectionId = import.meta.env.VITE_APPWRITE_SECTION_COLLECTION_ID!;

      if (!databaseId || !sectionCollectionId) {
        throw new Error(
          "Database and Section Collection IDs are not defined in environment variables."
        );
      }

      await databases.deleteDocument(
        databaseId,
        sectionCollectionId,
        sectionId
      );

      set((state) => ({
        sectionData: state.sectionData.filter(
          (section) => section.$id !== sectionId
        ),
      }));
    } catch (error: any) {
      console.error("Error deleting section data:", error);
      throw error;
    }
  },
}));

import { ID } from 'appwrite'; // Import ID from appwrite