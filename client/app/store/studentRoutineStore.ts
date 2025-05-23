// src/stores/studentRoutineStore.ts
import { create } from 'zustand';
import {
  account,
  databases,
  APPWRITE_DATABASE_ID,
  STUDENTS_COLLECTION_ID,
  SECTIONS_COLLECTION_ID, // Needed to find section ID
  ROUTINE_COLLECTION_ID,
  TEACHERS_COLLECTION_ID,
  FACULTIES_COLLECTION_ID,
  Query,
} from '~/utils/appwrite';
import { StudentDocument } from 'types/student'; // student.section is section NAME
import {
  RoutineDocument,
  DisplayRoutine,
  RoutineDescItem,
  PeriodItemDisplay,
  BreakItemDisplay,
  TeacherDoc,
  FacultyDoc,
  SectionDoc, // Type for documents from coll-section
} from 'types/routine';
import { nanoid } from 'nanoid';

interface StudentRoutineState {
  studentName: string | null;
  // studentSectionId: string | null; // No longer directly storing this, it's intermediate
  studentRoutine: DisplayRoutine | null;
  teachers: TeacherDoc[];
  facultyNameCache: string | null;
  sectionNameCache: string | null; // This will be student.section (name)
  classNameCache: string | null;

  isLoading: boolean;
  error: string | null;

  fetchStudentRoutine: () => Promise<void>;
  _getLoggedInStudent: () => Promise<StudentDocument | null>;
  _fetchSectionDocumentId: (student: StudentDocument) => Promise<string | null>; // New helper
  _fetchSupportingDataForRoutineDisplay: (student: StudentDocument, sectionDoc: SectionDoc | null) => Promise<void>;
  _parseRoutineDesc: (descString: string) => RoutineDescItem[];
  _parseRoutineDescArrayOfStrings: (descStrings: string[]) => RoutineDescItem[];
  _enrichRoutine: (routineDoc: RoutineDocument | null) => DisplayRoutine | null;
}

export const useStudentRoutineStore = create<StudentRoutineState>((set, get) => ({
  studentName: null,
  studentRoutine: null,
  teachers: [],
  facultyNameCache: null,
  sectionNameCache: null,
  classNameCache: null,

  isLoading: false,
  error: null,

  _getLoggedInStudent: async (): Promise<StudentDocument | null> => {
    const user = await account.get();
    if (!user.email) {
      throw new Error("User email not found. Student might not be logged in properly.");
    }
    const studentResponse = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      STUDENTS_COLLECTION_ID,
      [Query.equal('stdEmail', user.email), Query.limit(1)]
    );
    if (studentResponse.total === 0) {
      throw new Error("Student profile not found for the logged-in user.");
    }
    return studentResponse.documents[0] as StudentDocument;
  },

  _fetchSectionDocumentId: async (student: StudentDocument): Promise<string | null> => {
    if (!student.facultyId || !student.class || !student.section) {
        console.warn("Student data missing facultyId, class name, or section name. Cannot find section document ID.");
        return null;
    }
    try {
        const sectionQueryResponse = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            SECTIONS_COLLECTION_ID,
            [
                Query.equal("facultyId", student.facultyId),
                Query.equal("class", student.class), // class name
                Query.equal("name", student.section), // section name
                Query.limit(1)
            ]
        );
        if (sectionQueryResponse.total > 0) {
            return sectionQueryResponse.documents[0].$id;
        } else {
            console.warn(`No section document found in coll-section for facultyId: ${student.facultyId}, class: ${student.class}, sectionName: ${student.section}`);
            return null;
        }
    } catch (error) {
        console.error("Error fetching section document ID:", error);
        throw error; // Re-throw to be caught by the main fetch function
    }
  },

  _fetchSupportingDataForRoutineDisplay: async (student: StudentDocument, sectionDoc: SectionDoc | null) => {
    // Fetch teachers
    try {
      const teacherResponse = await databases.listDocuments(APPWRITE_DATABASE_ID, TEACHERS_COLLECTION_ID, [Query.limit(200)]);
      set({ teachers: teacherResponse.documents as TeacherDoc[] });
    } catch (error) {
      console.warn("Warning: Error fetching teachers for student routine:", error);
    }

    let facultyName = 'N/A';
    // Fetch Faculty Name using student.facultyId
    if (student.facultyId) {
      try {
        const facultyDoc = await databases.getDocument(APPWRITE_DATABASE_ID, FACULTIES_COLLECTION_ID, student.facultyId) as FacultyDoc;
        facultyName = facultyDoc.name;
      } catch (e: any) {
        console.warn(`Warning: Could not fetch faculty with ID '${student.facultyId}'. ${e.message}`);
      }
    } else {
        console.warn("Warning: Student document is missing facultyId for faculty name lookup.");
    }
    
    set({ 
        facultyNameCache: facultyName, 
        sectionNameCache: student.section, // Use section name from student record
        classNameCache: student.class 
    });
  },
  
  _parseRoutineDesc: (descString: string): RoutineDescItem[] => {
    if (!descString || typeof descString !== 'string') return [];
    try {
      const parsed = JSON.parse(descString);
      return (Array.isArray(parsed) ? parsed : []).map((item: any) => ({ ...item, id: item.id || nanoid() }));
    } catch (e) {
      console.error("Failed to parse routine description string:", e);
      return [];
    }
  },

  _parseRoutineDescArrayOfStrings: (descStrings: string[]): RoutineDescItem[] => {
    if (!Array.isArray(descStrings)) return [];
    let parsedDescItems: RoutineDescItem[] = [];
    try {
        parsedDescItems = descStrings.map((itemStr: string) => {
            const parsedItem = JSON.parse(itemStr);
            return { id: nanoid(), ...parsedItem };
        });
    } catch (e) {
        console.error("Failed to parse 'desc' item string for routine:", descStrings, e);
    }
    return parsedDescItems;
  },

  _enrichRoutine: (routineDoc: RoutineDocument | null): DisplayRoutine | null => {
    if (!routineDoc) return null;
    const { teachers, facultyNameCache, sectionNameCache, classNameCache } = get();
    const descItems = Array.isArray(routineDoc.desc) ? routineDoc.desc : [];

    return {
      ...routineDoc,
      facultyName: facultyNameCache || 'N/A',
      sectionName: sectionNameCache || 'N/A', // This is now the section *name*
      class: classNameCache || routineDoc.class || 'N/A',
      descDisplay: descItems.map(item => {
        if (item.type === 'period') {
          const teacher = teachers.find(t => t.$id === item.teacherId);
          return { ...item, teacherName: teacher?.name || 'N/A' } as PeriodItemDisplay;
        }
        return item as BreakItemDisplay;
      }),
    };
  },

  fetchStudentRoutine: async () => {
    set({ isLoading: true, error: null, studentRoutine: null });
    try {
      const student = await get()._getLoggedInStudent();
      if (!student) {
          set({isLoading: false});
          return;
      }
      set({ studentName: student.name });
      
      // Call _fetchSupportingDataForRoutineDisplay early to get faculty name, etc.
      // It no longer needs sectionDoc as it uses student.section (name) for cache
      await get()._fetchSupportingDataForRoutineDisplay(student, null); 

      // Step 1: Get the Section Document ID
      const sectionDocumentId = await get()._fetchSectionDocumentId(student);

      if (!sectionDocumentId) {
        // Error/warning already logged in _fetchSectionDocumentId
        set({ 
            isLoading: false, 
            studentRoutine: null, 
            error: "Could not find your specific section details. Routine cannot be displayed." 
        });
        return;
      }

      // Step 2: Fetch routine using the obtained sectionDocumentId
      const routineResponse = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        ROUTINE_COLLECTION_ID,
        [Query.equal('section', sectionDocumentId), Query.limit(1)] // Query by section ID
      );

      if (routineResponse.total > 0) {
        let rawRoutineDoc = routineResponse.documents[0] as RoutineDocument;
        
        // --- `desc` parsing (ensure one option is active) ---
        if (Array.isArray(rawRoutineDoc.desc) && rawRoutineDoc.desc.length > 0 && typeof rawRoutineDoc.desc[0] === 'string') {
            rawRoutineDoc.desc = get()._parseRoutineDescArrayOfStrings(rawRoutineDoc.desc as unknown as string[]);
        } else if (Array.isArray(rawRoutineDoc.desc)) {
            rawRoutineDoc.desc = rawRoutineDoc.desc.map((item: any) => ({ id: item.id || nanoid(), ...item }));
        } else {
            rawRoutineDoc.desc = [];
        }
        // --- End `desc` parsing ---

        const enrichedRoutine = get()._enrichRoutine(rawRoutineDoc);
        set({ studentRoutine: enrichedRoutine });
      } else {
        console.log(`No routine document found in coll-routine for section ID: ${sectionDocumentId}`);
        set({ studentRoutine: null }); // No routine found for this section ID
      }
      set({ isLoading: false });
    } catch (err: any) {
      console.error("Error in fetchStudentRoutine main try-catch:", err);
      set({ error: err.message || "An error occurred while fetching your routine.", isLoading: false });
    }
  },
}));