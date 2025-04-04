// ~/store/sectionStore.ts
import { create } from "zustand";
import { databases } from "~/utils/appwrite";

interface Section {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  id: string;
  name: string;
  subjects: string[];
  class: string; // Class name as string, referencing Faculty.classes
  facultyId?: string; // Optional: Explicitly store faculty ID for relation (for filtering later if needed)
}

interface SectionState {
  sectionData: Section[];
  isLoading: boolean;
  error: string | null;
  fetchSectionData: () => Promise<void>;
  updateSectionData: (section: Section) => Promise<void>;
  deleteSectionData: (sectionId: string) => Promise<void>;
  addSectionData: (
    section: Omit<Section, "$id" | "$createdAt" | "$updatedAt">
  ) => Promise<void>;
}

export const useSectionStore = create<SectionState>((set, get) => ({
  sectionData: [],
  isLoading: false,
  error: null,
  fetchSectionData: async () => {
    set({ isLoading: true, error: null });
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const sectionCollectionId = import.meta.env
        .VITE_APPWRITE_SECTION_COLLECTION_ID!; // Make sure you have this env variable

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
  updateSectionData: async (section) => {
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const sectionCollectionId = import.meta.env
        .VITE_APPWRITE_SECTION_COLLECTION_ID!;

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
          subjects: section.subjects,
          class: section.class,
          facultyId: section.facultyId, // Include facultyId in update
          id: section.id,
        }
      );

      set((state) => ({
        sectionData: state.sectionData.map((s) =>
          s.$id === section.$id ? section : s
        ),
      }));
    } catch (error: any) {
      console.error("Error updating section data in Appwrite:", error);
      throw error;
    }
  },
  deleteSectionData: async (sectionId) => {
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const sectionCollectionId = import.meta.env
        .VITE_APPWRITE_SECTION_COLLECTION_ID!;

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
      console.error("Error deleting section data in Appwrite:", error);
      throw error;
    }
  },
  addSectionData: async (section) => {
    try {
      const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
      const sectionCollectionId = import.meta.env
        .VITE_APPWRITE_SECTION_COLLECTION_ID!;

      if (!databaseId || !sectionCollectionId) {
        throw new Error(
          "Database and Section Collection IDs are not defined in environment variables."
        );
      }

      const newDocument = await databases.createDocument(
        databaseId,
        sectionCollectionId,
        "unique()",
        section
      );

      const addedSection: Section = newDocument as unknown as Section;

      set((state) => ({
        sectionData: [...state.sectionData, addedSection],
      }));
    } catch (error: any) {
      console.error("Error adding section data in Appwrite:", error);
      throw error;
    }
  },
}));
