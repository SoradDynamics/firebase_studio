// src/store/parentStore.ts
import { create } from 'zustand';
import {
  databases,
  Query,
  APPWRITE_DATABASE_ID,
  NOTES_COLLECTION_ID,
  STUDENTS_COLLECTION_ID,
} from '~/utils/appwrite';
import type { Note, StudentProfileForNotes } from 'types/notes';

interface ParentState {
  selectedStudentIdForNotes: string | null;
  selectedStudentProfile: StudentProfileForNotes | null;
  selectedStudentNotes: Note[];
  isLoadingProfile: boolean;
  isLoadingNotes: boolean;
  error: string | null;
  searchTerm: string;

  setSelectedStudentIdForNotes: (studentId: string | null) => void;
  fetchSelectedStudentProfile: (studentId: string) => Promise<void>;
  fetchNotesForSelectedStudent: () => Promise<void>;
  setSearchTerm: (term: string) => void;
  getFilteredNotes: () => Note[];
  clearParentViewData: () => void;
}

export const useParentStore = create<ParentState>((set, get) => ({
  selectedStudentIdForNotes: null,
  selectedStudentProfile: null,
  selectedStudentNotes: [],
  isLoadingProfile: false,
  isLoadingNotes: false,
  error: null,
  searchTerm: '',

  setSelectedStudentIdForNotes: (studentId) => {
    set({
      selectedStudentIdForNotes: studentId,
      selectedStudentProfile: null,
      selectedStudentNotes: [],
      searchTerm: '',
      error: null,
      isLoadingProfile: !!studentId, // Start loading profile if studentId is present
      isLoadingNotes: false,
    });
    if (studentId) {
      get().fetchSelectedStudentProfile(studentId);
    }
  },

  fetchSelectedStudentProfile: async (studentId: string) => {
    if (!STUDENTS_COLLECTION_ID) {
      set({ error: 'Students collection ID not configured.', isLoadingProfile: false });
      return;
    }
    set({ isLoadingProfile: true, error: null, selectedStudentProfile: null }); // Ensure profile is cleared before fetch
    try {
      const studentDoc = await databases.getDocument<StudentProfileForNotes>(
        APPWRITE_DATABASE_ID,
        STUDENTS_COLLECTION_ID,
        studentId
      );
      set({ selectedStudentProfile: studentDoc, isLoadingProfile: false });
      get().fetchNotesForSelectedStudent();
    } catch (err: any) {
      console.error('Error fetching profile for selected student:', err);
      set({ error: `Failed to load details for selected student: ${err.message}`, isLoadingProfile: false });
    }
  },

  fetchNotesForSelectedStudent: async () => {
    const { selectedStudentProfile } = get();

    if (!selectedStudentProfile) {
      set({ error: 'Cannot fetch notes: Selected student profile not loaded.', selectedStudentNotes: [], isLoadingNotes: false });
      return;
    }
    if (!NOTES_COLLECTION_ID) {
      set({ error: 'Notes collection ID not configured.', selectedStudentNotes: [], isLoadingNotes: false });
      return;
    }
    // This check is crucial: if facultyId is missing from the selected student's profile,
    // we cannot apply the primary filter.
    if (!selectedStudentProfile.facultyId) {
        console.warn("[ParentStore] Selected student profile is missing 'facultyId'. Cannot fetch faculty-specific notes effectively.");
        set({ selectedStudentNotes: [], isLoadingNotes: false, error: "Selected student's faculty information is missing." });
        return;
    }

    set({ isLoadingNotes: true, error: null });
    try {
      // Primary query: Fetch notes based on the selected student's facultyId
      const queries: string[] = [
        Query.orderDesc('$createdAt'),
        Query.limit(200), // Fetch a bit more for client-side filtering
        Query.equal('facultyId', selectedStudentProfile.facultyId)
      ];
      
      console.log("[ParentStore] Fetching notes for selected student (Faculty Query):", queries);
      const response = await databases.listDocuments<Note>(
        APPWRITE_DATABASE_ID,
        NOTES_COLLECTION_ID,
        queries
      );

      // Client-side filtering for class and section specificity relative to the selected student
      const studentClass = selectedStudentProfile.class;
      const studentSectionId = selectedStudentProfile.sectionId;

      const finalFilteredNotes = response.documents.filter(note => {
        // Note must belong to the student's faculty (already handled by the server-side query)

        // Case 1: Note is for specific faculty, class, and section
        // Matches if note's F, C, S all match student's F, C, S
        if (note.className === studentClass && note.sectionId === studentSectionId) {
          return true;
        }

        // Case 2: Note is for specific faculty and class (general to all sections in that class)
        // Matches if note's F, C match student's F, C AND note has no specific sectionId
        if (note.className === studentClass && (!note.sectionId || note.sectionId === '')) {
          return true;
        }

        // Case 3: Note is for specific faculty only (general to all classes and sections in that faculty)
        // Matches if note's F matches student's F AND note has no specific className AND no specific sectionId
        if ((!note.className || note.className === '') && (!note.sectionId || note.sectionId === '')) {
          return true;
        }
        
        return false; // Does not fit any of the desired patterns for this student
      });

      set({ selectedStudentNotes: finalFilteredNotes, isLoadingNotes: false });
    } catch (err: any) {
      console.error('Error fetching notes for selected student (parent view):', err);
      set({ error: `Failed to fetch notes: ${err.message}`, isLoadingNotes: false, selectedStudentNotes: [] });
    }
  },

  setSearchTerm: (term: string) => set({ searchTerm: term }),

  getFilteredNotes: () => {
    const { selectedStudentNotes, searchTerm } = get();
    if (!searchTerm.trim()) {
      return selectedStudentNotes;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return selectedStudentNotes.filter(note =>
      note.title.toLowerCase().includes(lowerSearchTerm) ||
      (note.description && note.description.toLowerCase().includes(lowerSearchTerm)) ||
      (note.subject && note.subject.toLowerCase().includes(lowerSearchTerm)) ||
      (note.facultyName && note.facultyName.toLowerCase().includes(lowerSearchTerm)) ||
      (note.uploaderEmail && note.uploaderEmail.toLowerCase().includes(lowerSearchTerm))
    );
  },

  clearParentViewData: () => {
    set({
        selectedStudentIdForNotes: null,
        selectedStudentProfile: null,
        selectedStudentNotes: [],
        searchTerm: '',
        error: null,
        isLoadingProfile: false,
        isLoadingNotes: false,
    });
  },
}));