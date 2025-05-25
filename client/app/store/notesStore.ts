// src/store/notesStore.ts
import { create } from 'zustand';
import {
  databases,
  storage,
  ID,
  Query,
  account,
  APPWRITE_DATABASE_ID,
  FACULTIES_COLLECTION_ID,
  SECTIONS_COLLECTION_ID,
  NOTES_COLLECTION_ID as ACTUAL_NOTES_COLLECTION_ID, // Renamed to avoid conflict with local const
  STUDENTS_COLLECTION_ID,
} from '~/utils/appwrite';
import type { Note, NoteDocument, Faculty, Section, AppwriteUser, FileUpload } from 'types/notes';
// Assume a StudentProfile type
export interface StudentProfile extends AppwriteUser { // Or your specific Student document type from coll-student
  // Assuming these fields exist in your coll-student
  facultyId: string;
  class: string; // Matches className in notes
  sectionId: string; // Matches sectionId in notes
  stdEmail: string; // The email used to look up the student
  name: string; // Student's name
  // other student fields...
}


// Ensure these are defined in your .env file
const NOTES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_NOTES_COLLECTION_ID; // This is fine
const NOTES_BUCKET_ID = import.meta.env.VITE_APPWRITE_NOTES_BUCKET_ID;

interface NotesState {
  notes: Note[];
  studentNotes: Note[]; // New: For notes specific to the student
  faculties: Faculty[];
  sections: Section[];
  currentUser: AppwriteUser | null;
  currentStudentProfile: StudentProfile | null; // New: For logged-in student's profile
  isLoading: boolean;
  isStudentDataLoading: boolean; // New: For student-specific loading
  isFormLoading: boolean;
  isFetchingFilters: boolean;
  error: string | null;
  studentPageError: string | null; // New: For errors on student page

  searchTerm: string;
  studentSearchTerm: string; // New: For student page search

  filterFacultyId: string | null;
  filterClass: string | null;
  filterSectionId: string | null;

  isNoteFormOpen: boolean;
  editingNote: Note | null;

  fetchCurrentUser: () => Promise<void>;
  fetchCurrentStudentProfile: () => Promise<void>; // New
  fetchFaculties: () => Promise<void>;
  fetchSections: (facultyId?: string | null, className?: string | null) => Promise<void>;
  fetchNotes: () => Promise<void>; // For general notes page
  fetchNotesForStudent: () => Promise<void>; // New

  addNote: (noteData: any, filesToUpload: File[]) => Promise<void>;
  updateNote: (noteId: string, noteData: any, filesToAdd: File[], fileIdsToRemove: string[], originalFileNamesToRemove: string[], originalFileMimeTypesToRemove: string[]) => Promise<void>;
  deleteNote: (noteId: string, fileIds: string[]) => Promise<void>;

  setSearchTerm: (term: string) => void;
  setStudentSearchTerm: (term: string) => void; // New

  setFilterFacultyId: (id: string | null) => void;
  setFilterClass: (className: string | null) => void;
  setFilterSectionId: (id: string | null) => void;

  openNoteForm: (note?: Note) => void;
  closeNoteForm: () => void;

  getFilteredNotes: () => Note[];
  getFilteredStudentNotes: () => Note[]; // New
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  studentNotes: [], // Init
  faculties: [],
  sections: [],
  currentUser: null,
  currentStudentProfile: null, // Init
  isLoading: false,
  isStudentDataLoading: false, // Init
  isFormLoading: false,
  isFetchingFilters: false,
  error: null,
  studentPageError: null, // Init

  searchTerm: '',
  studentSearchTerm: '', // Init

  filterFacultyId: null,
  filterClass: null,
  filterSectionId: null,

  isNoteFormOpen: false,
  editingNote: null,

  fetchCurrentUser: async () => {
    if (get().currentUser) return; // Avoid refetch if already loaded
    set({ isLoading: true });
    try {
      const user = await account.get();
      set({ currentUser: user as AppwriteUser, isLoading: false });
    } catch (error) {
      console.error('Error fetching current user:', error);
      set({ error: 'Failed to fetch user details.', isLoading: false });
    }
  },

  fetchCurrentStudentProfile: async () => {
    const { currentUser } = get();
    if (!currentUser || !currentUser.email) {
      set({ studentPageError: 'User not logged in or email not available.', isStudentDataLoading: false });
      return;
    }
    if (!STUDENTS_COLLECTION_ID) {
      set({ studentPageError: 'Students collection ID not configured.', isStudentDataLoading: false });
      return;
    }

    set({ isStudentDataLoading: true, studentPageError: null, currentStudentProfile: null });
    try {
      const response = await databases.listDocuments<StudentProfile>(
        APPWRITE_DATABASE_ID,
        STUDENTS_COLLECTION_ID,
        [
          Query.equal('stdEmail', currentUser.email), // Assuming 'stdEmail' is the attribute name
          Query.limit(1)
        ]
      );

      if (response.documents.length > 0) {
        set({ currentStudentProfile: response.documents[0], isStudentDataLoading: false });
        get().fetchNotesForStudent(); // Fetch notes once profile is loaded
      } else {
        set({ studentPageError: 'Student profile not found for the logged-in user.', isStudentDataLoading: false });
      }
    } catch (error: any) {
      console.error('Error fetching student profile:', error);
      set({ studentPageError: `Failed to fetch student profile: ${error.message}`, isStudentDataLoading: false });
    }
  },

  fetchFaculties: async () => { /* ... no change ... */ 
    set({ isFetchingFilters: true, error: null });
    try {
      const response = await databases.listDocuments<Faculty>(
        APPWRITE_DATABASE_ID,
        FACULTIES_COLLECTION_ID,
        [Query.limit(100)]
      );
      set({ faculties: response.documents });
    } catch (error) {
      console.error('Error fetching faculties:', error);
      set({ error: 'Failed to fetch faculties.' });
    } finally {
      set({ isFetchingFilters: false });
    }
  },
  fetchSections: async (facultyId?: string | null, className?: string | null) => { /* ... no change ... */ 
    if (!facultyId || !className) {
      set({ sections: [] });
      return;
    }
    set({ isFetchingFilters: true, error: null });
    try {
      const queries = [
        Query.equal('facultyId', facultyId),
        Query.equal('class', className),
        Query.limit(100),
      ];
      const response = await databases.listDocuments<Section>(
        APPWRITE_DATABASE_ID,
        SECTIONS_COLLECTION_ID,
        queries
      );
      set({ sections: response.documents });
    } catch (error) {
      console.error('Error fetching sections:', error);
      set({ error: 'Failed to fetch sections.' });
    } finally {
      set({ isFetchingFilters: false });
    }
  },

  fetchNotes: async () => { /* ... for general notes page, no change ... */ 
    set({ isLoading: true, error: null });
    try {
      const queries: string[] = [Query.orderDesc('$createdAt')]; 
      const { filterFacultyId, filterClass, filterSectionId } = get();

      if (filterFacultyId) queries.push(Query.equal('facultyId', filterFacultyId));
      if (filterClass) queries.push(Query.equal('className', filterClass));
      if (filterSectionId) queries.push(Query.equal('sectionId', filterSectionId));
      
      queries.push(Query.limit(100));


      if (!NOTES_COLLECTION_ID) {
        throw new Error("VITE_APPWRITE_NOTES_COLLECTION_ID is not defined.");
      }

      const response = await databases.listDocuments<Note>(
        APPWRITE_DATABASE_ID,
        NOTES_COLLECTION_ID,
        queries
      );
      set({ notes: response.documents });
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      set({ error: `Failed to fetch notes: ${error.message}` });
    } finally {
      set({ isLoading: false });
    }
  },

  // src/store/notesStore.ts

  fetchNotesForStudent: async () => {
    const { currentStudentProfile } = get();

    if (!currentStudentProfile) {
      set({ studentPageError: 'Cannot fetch notes: Student profile not loaded.', studentNotes: [], isStudentDataLoading: false });
      return;
    }
    if (!NOTES_COLLECTION_ID) {
      set({ studentPageError: 'Notes collection ID not configured.', studentNotes: [], isStudentDataLoading: false });
      return;
    }
    if (!currentStudentProfile.facultyId) { // Faculty is essential for this strategy
        console.warn("[fetchNotesForStudent] Student profile is missing 'facultyId'. Cannot fetch faculty-specific notes.");
        set({ studentNotes: [], isStudentDataLoading: false, studentPageError: "Your faculty information is missing." });
        return;
    }

    set({ isStudentDataLoading: true, studentPageError: null });
    try {
      const queries: string[] = [
        Query.orderDesc('$createdAt'),
        Query.limit(200), // Fetch a bit more if client-filtering
        Query.equal('facultyId', currentStudentProfile.facultyId) // Main filter
      ];

      console.log("[fetchNotesForStudent] Executing with queries:", queries);

      const response = await databases.listDocuments<Note>(
        APPWRITE_DATABASE_ID,
        NOTES_COLLECTION_ID,
        queries
      );

      // Client-side filtering for class and section specificity
      const studentClass = currentStudentProfile.class;
      const studentSectionId = currentStudentProfile.sectionId;

      const relevantNotes = response.documents.filter(note => {
        const noteMatchesClass = !note.className || note.className === studentClass; // Note is for all classes in faculty OR matches student's class
        const noteMatchesSection = !note.sectionId || note.sectionId === studentSectionId; // Note is for all sections in class OR matches student's section

        // A note is relevant if:
        // 1. It's for the student's faculty.
        // 2. AND ( (It has no class specified OR its class matches student's class)
        // 3. AND (It has no section specified OR its section matches student's section) )

        // More precise logic:
        // If student has class and section:
        //  - Note must match faculty.
        //  - Note's class must be null OR match student's class.
        //  - Note's section must be null OR match student's section.

        // If student has class but no section (shouldn't happen if section depends on class):
        //  - Note must match faculty.
        //  - Note's class must be null OR match student's class.
        //  - Note's section should ideally be null.

        let isMatch = true; // Starts true, potentially falsified by mismatches

        // Check class: If note has a class, it must match student's class (if student has one).
        // If note has no class, it's considered a match at the class level (faculty-wide).
        if (note.className && studentClass && note.className !== studentClass) {
            isMatch = false;
        }
        // If note has a class, but student doesn't (unlikely scenario, but for completeness)
        // this note wouldn't be relevant unless it's a faculty-wide note (note.className is null).
        // The above condition handles this implicitly.

        // Check section: Only if the class level was a match.
        // If note has a section, it must match student's section (if student has one).
        // If note has no section, it's considered a match at the section level (class-wide or faculty-wide).
        if (isMatch && note.sectionId && studentSectionId && note.sectionId !== studentSectionId) {
            isMatch = false;
        }
        // If a note specifies a section, but the student isn't in any particular section (studentSectionId is null),
        // then that specific note is not for them unless their class also doesn't match (handled above).
        // Or, if a note specifies a section, but student's class didn't match (isMatch is already false), we don't care.


        // Filter further: if a note specifies a class, but the student does not have that class, it's not a match.
        if (studentClass && note.className && note.className !== studentClass) {
            return false;
        }
        // Filter further: if a note specifies a section, but the student does not have that section (and class matched or note had no class), it's not a match.
        if (studentSectionId && note.sectionId && note.sectionId !== studentSectionId) {
            // This only applies if the class was a match or the note was faculty-wide
            if (studentClass && note.className && note.className === studentClass || !note.className) {
                 return false;
            }
        }
        return true; // If it passes all above, it's a potential match based on hierarchy
      });


      const finalFilteredNotes = response.documents.filter(note => {
        // Must match faculty (already done by query)

        // Case 1: Note is for specific faculty, class, and section
        if (note.facultyId === currentStudentProfile.facultyId &&
            note.className === currentStudentProfile.class &&
            note.sectionId === currentStudentProfile.sectionId) {
          return true;
        }

        // Case 2: Note is for specific faculty and class (general to all sections in that class)
        if (note.facultyId === currentStudentProfile.facultyId &&
            note.className === currentStudentProfile.class &&
            (!note.sectionId || note.sectionId === '')) { // Note has no section specified
          return true;
        }

        // Case 3: Note is for specific faculty only (general to all classes and sections in that faculty)
        if (note.facultyId === currentStudentProfile.facultyId &&
            (!note.className || note.className === '') &&
            (!note.sectionId || note.sectionId === '')) { // Note has no class and no section specified
          return true;
        }
        
        return false; // Does not fit any of the desired patterns
      });


      set({ studentNotes: finalFilteredNotes, isStudentDataLoading: false });
    } catch (error: any) {
      console.error('Error fetching notes for student:', error);
      set({ studentPageError: `Failed to fetch notes: ${error.message}`, isStudentDataLoading: false, studentNotes: [] });
    }
  },


  addNote: async (noteData, filesToUpload) => { /* ... no change, keep for admin/teacher side ... */ 
        const { currentUser } = get(); 
    if (!currentUser) {
      set({ error: 'User not logged in.' });
      return;
    }
    if (!NOTES_COLLECTION_ID || !NOTES_BUCKET_ID) {
        set({ error: "Notes Collection ID or Bucket ID is not configured." });
        return;
    }

    set({ isFormLoading: true, error: null });
    try {
      const uploadedFileIds: string[] = [];
      const uploadedFileNames: string[] = [];
      const uploadedFileMimeTypes: string[] = [];

      for (const file of filesToUpload) {
        const fileResponse = await storage.createFile(
          NOTES_BUCKET_ID,
          ID.unique(),
          file
        );
        uploadedFileIds.push(fileResponse.$id);
        uploadedFileNames.push(file.name);
        uploadedFileMimeTypes.push(file.type);
      }

      const finalNoteData: NoteDocument = {
        ...noteData,
        fileIds: uploadedFileIds,
        fileNames: uploadedFileNames,
        fileMimeTypes: uploadedFileMimeTypes,
        uploadedById: currentUser.$id,
        uploaderEmail: currentUser.email, 
      };
      
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        NOTES_COLLECTION_ID,
        ID.unique(),
        finalNoteData
      );

      set({ isNoteFormOpen: false, editingNote: null });
      get().fetchNotes(); 
    } catch (error: any) {
      console.error('Error adding note:', error);
      if (error.message && error.message.includes("Invalid `permissions` param")) {
          set({ error: `Failed to add note: A permissions issue occurred. Please check your Appwrite collection/bucket permissions. Original error: ${error.message}` });
      } else {
          set({ error: `Failed to add note: ${error.message}` });
      }
    } finally {
      set({ isFormLoading: false });
    }
  },
  updateNote: async (noteId, noteData, filesToAdd, fileIdsToRemove, originalFileNamesToRemove, originalFileMimeTypesToRemove) => { /* ... no change ... */
    const { currentUser, notes } = get();
    if (!currentUser) {
      set({ error: 'User not logged in.' });
      return;
    }
     if (!NOTES_COLLECTION_ID || !NOTES_BUCKET_ID) {
        set({ error: "Notes Collection ID or Bucket ID is not configured." });
        return;
    }

    set({ isFormLoading: true, error: null });
    try {
      const existingNote = notes.find(n => n.$id === noteId);
      if (!existingNote) throw new Error("Note not found for updating.");

      for (const fileId of fileIdsToRemove) {
        await storage.deleteFile(NOTES_BUCKET_ID, fileId);
      }

      const newUploadedFileIds: string[] = [];
      const newUploadedFileNames: string[] = [];
      const newUploadedFileMimeTypes: string[] = [];

      for (const file of filesToAdd) {
        const fileResponse = await storage.createFile(
          NOTES_BUCKET_ID,
          ID.unique(),
          file
        );
        newUploadedFileIds.push(fileResponse.$id);
        newUploadedFileNames.push(file.name);
        newUploadedFileMimeTypes.push(file.type);
      }

      const updatedFileIds = existingNote.fileIds
        .filter(id => !fileIdsToRemove.includes(id))
        .concat(newUploadedFileIds);
      
      const updatedFileNames = existingNote.fileNames
        .filter(name => !originalFileNamesToRemove.includes(name))
        .concat(newUploadedFileNames);

      const updatedFileMimeTypes = existingNote.fileMimeTypes
        .filter(type => !originalFileMimeTypesToRemove.some((removedType, index) => type === removedType && existingNote.fileNames[existingNote.fileMimeTypes.indexOf(type)] === originalFileNamesToRemove[index]))
        .concat(newUploadedFileMimeTypes);


      const finalNoteData = {
        ...noteData,
        fileIds: updatedFileIds,
        fileNames: updatedFileNames,
        fileMimeTypes: updatedFileMimeTypes,
      };

      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        NOTES_COLLECTION_ID,
        noteId,
        finalNoteData
      );
      set({ isNoteFormOpen: false, editingNote: null });
      get().fetchNotes(); 
    } catch (error: any) {
      console.error('Error updating note:', error);
      set({ error: `Failed to update note: ${error.message}` });
    } finally {
      set({ isFormLoading: false });
    }
   },
  deleteNote: async (noteId, fileIds) => { /* ... no change ... */
    if (!NOTES_COLLECTION_ID || !NOTES_BUCKET_ID) {
        set({ error: "Notes Collection ID or Bucket ID is not configured." });
        return;
    }
    set({ isLoading: true, error: null }); 
    try {
      for (const fileId of fileIds) {
        try {
          await storage.deleteFile(NOTES_BUCKET_ID, fileId);
        } catch (fileError) {
          console.error(`Failed to delete file ${fileId}:`, fileError);
        }
      }

      await databases.deleteDocument(APPWRITE_DATABASE_ID, NOTES_COLLECTION_ID, noteId);
      get().fetchNotes(); 
    } catch (error: any)
    {
      console.error('Error deleting note:', error);
      set({ error: `Failed to delete note: ${error.message}` });
    } finally {
      set({ isLoading: false });
    }
   },

  setSearchTerm: (term) => set({ searchTerm: term }),
  setStudentSearchTerm: (term) => set({ studentSearchTerm: term }), // New

  setFilterFacultyId: (id) => { /* ... no change ... */ 
    set({ filterFacultyId: id, filterClass: null, filterSectionId: null, sections: [] });
    if (id) get().fetchNotes(); else get().fetchNotes();
  },
  setFilterClass: (className) => { /* ... no change ... */ 
    set({ filterClass: className, filterSectionId: null, sections: [] });
    if (className) {
      get().fetchSections(get().filterFacultyId, className);
    }
    get().fetchNotes();
  },
  setFilterSectionId: (id) => { /* ... no change ... */ 
    set({ filterSectionId: id });
    get().fetchNotes();
  },

  openNoteForm: (note) => set({ isNoteFormOpen: true, editingNote: note || null, error: null }),
  closeNoteForm: () => set({ isNoteFormOpen: false, editingNote: null, error: null }),

  getFilteredNotes: () => { /* ... for general notes page, no change ... */ 
    const { notes, searchTerm } = get();
    if (!searchTerm.trim()) {
      return notes;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return notes.filter(note =>
      note.title.toLowerCase().includes(lowerSearchTerm) ||
      (note.description && note.description.toLowerCase().includes(lowerSearchTerm)) ||
      (note.subject && note.subject.toLowerCase().includes(lowerSearchTerm)) ||
      (note.facultyName && note.facultyName.toLowerCase().includes(lowerSearchTerm)) ||
      (note.className && note.className.toLowerCase().includes(lowerSearchTerm)) ||
      (note.sectionName && note.sectionName.toLowerCase().includes(lowerSearchTerm)) ||
      (note.uploaderEmail && note.uploaderEmail.toLowerCase().includes(lowerSearchTerm))
    );
  },
  getFilteredStudentNotes: () => {
    const { studentNotes, studentSearchTerm } = get();
    if (!studentSearchTerm.trim()) {
      return studentNotes;
    }
    const lowerSearchTerm = studentSearchTerm.toLowerCase();
    // Filter logic for student notes - can be similar to getFilteredNotes
    return studentNotes.filter(note =>
      note.title.toLowerCase().includes(lowerSearchTerm) ||
      (note.description && note.description.toLowerCase().includes(lowerSearchTerm)) ||
      (note.subject && note.subject.toLowerCase().includes(lowerSearchTerm)) ||
      (note.facultyName && note.facultyName.toLowerCase().includes(lowerSearchTerm)) || // Uploader's faculty
      (note.uploaderEmail && note.uploaderEmail.toLowerCase().includes(lowerSearchTerm))
      // No need to filter by student's class/section/faculty here as notes are already pre-filtered
    );
  },
}));