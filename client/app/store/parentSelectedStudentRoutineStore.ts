// src/stores/parentSelectedStudentRoutineStore.ts
import { create } from 'zustand';
import {
  databases,
  APPWRITE_DATABASE_ID,
  STUDENTS_COLLECTION_ID,
  SECTIONS_COLLECTION_ID,
  ROUTINE_COLLECTION_ID,
  TEACHERS_COLLECTION_ID,
  FACULTIES_COLLECTION_ID,
  Query,
} from '~/utils/appwrite'; // Adjust path if your appwrite.ts is elsewhere
import { Student } from 'types/models'; // Assuming your Student type is here
import {
  RoutineDocument,
  DisplayRoutine,
  RoutineDescItem,
  PeriodItemDisplay,
  BreakItemDisplay,
  TeacherDoc,
  FacultyDoc,
  SectionDoc,
} from 'types/routine'; // Adjust path to your routine types
import { nanoid } from 'nanoid';

interface ParentSelectedStudentRoutineState {
  selectedStudentDetails: Student | null; // To store the name for display
  studentRoutine: DisplayRoutine | null;
  teachers: TeacherDoc[];
  facultyNameCache: string | null;
  sectionNameCache: string | null; // This will be student's section name
  classNameCache: string | null;

  isLoading: boolean;
  error: string | null;

  fetchRoutineForSelectedStudent: (studentId: string | null) => Promise<void>;
  _fetchFullStudentDetails: (studentId: string) => Promise<Student | null>;
  _fetchSectionDocumentId: (student: Student) => Promise<string | null>;
  _fetchSupportingDataForRoutineDisplay: (student: Student) => Promise<void>;
  _parseRoutineDescArrayOfStrings: (descStrings: string[]) => RoutineDescItem[]; // Assuming desc is array of strings
  _enrichRoutine: (routineDoc: RoutineDocument | null) => DisplayRoutine | null;
  clearRoutine: () => void;
}

export const useParentSelectedStudentRoutineStore = create<ParentSelectedStudentRoutineState>((set, get) => ({
  selectedStudentDetails: null,
  studentRoutine: null,
  teachers: [],
  facultyNameCache: null,
  sectionNameCache: null,
  classNameCache: null,

  isLoading: false,
  error: null,

  clearRoutine: () => {
    set({
        studentRoutine: null,
        selectedStudentDetails: null,
        facultyNameCache: null,
        sectionNameCache: null,
        classNameCache: null,
        error: null,
        isLoading: false, // Also reset loading
    });
  },

  _fetchFullStudentDetails: async (studentId: string): Promise<Student | null> => {
    try {
      const studentDoc = await databases.getDocument<Student>(
        APPWRITE_DATABASE_ID,
        STUDENTS_COLLECTION_ID,
        studentId
      );
      return studentDoc;
    } catch (error) {
      console.error(`Error fetching details for student ID ${studentId} (parent view):`, error);
      throw new Error(`Failed to load details for the selected student.`); // This error will be caught by the calling function
    }
  },

  _fetchSectionDocumentId: async (student: Student): Promise<string | null> => {
    if (!student.facultyId || !student.class || !student.section) {
        console.warn("Selected student data incomplete (facultyId, class name, or section name). Cannot find section document ID.");
        return null;
    }
    try {
        const sectionQueryResponse = await databases.listDocuments<SectionDoc>(
            APPWRITE_DATABASE_ID,
            SECTIONS_COLLECTION_ID,
            [
                Query.equal("facultyId", student.facultyId),
                Query.equal("class", student.class),      // student.class is class name
                Query.equal("name", student.section),   // student.section is section name
                Query.limit(1)
            ]
        );
        if (sectionQueryResponse.total > 0) {
            return sectionQueryResponse.documents[0].$id;
        } else {
            console.warn(`No section document found for student: ${student.name} (facultyId: ${student.facultyId}, class: ${student.class}, sectionName: ${student.section})`);
            return null;
        }
    } catch (error) {
        console.error("Error fetching section document ID (parent view):", error);
        throw error;
    }
  },

  _fetchSupportingDataForRoutineDisplay: async (student: Student) => {
    // Fetch teachers
    try {
      const teacherResponse = await databases.listDocuments<TeacherDoc>(APPWRITE_DATABASE_ID, TEACHERS_COLLECTION_ID, [Query.limit(200)]);
      set({ teachers: teacherResponse.documents });
    } catch (error) {
      console.warn("Warning: Error fetching teachers (parent view):", error);
    }

    let facultyName = 'N/A';
    if (student.facultyId) {
      try {
        const facultyDoc = await databases.getDocument<FacultyDoc>(APPWRITE_DATABASE_ID, FACULTIES_COLLECTION_ID, student.facultyId);
        facultyName = facultyDoc.name;
      } catch (e: any) {
        console.warn(`Warning: Could not fetch faculty (ID: ${student.facultyId}) for student ${student.name}. ${e.message}`);
      }
    }
    
    set({ 
        facultyNameCache: facultyName, 
        sectionNameCache: student.section, // Section NAME from student record
        classNameCache: student.class     // Class NAME from student record
    });
  },
  
  _parseRoutineDescArrayOfStrings: (descStrings: string[]): RoutineDescItem[] => {
    // This matches the logic from the student's own routine page,
    // assuming coll-routine.desc is an array of JSON strings.
    if (!Array.isArray(descStrings)) return [];
    let parsedDescItems: RoutineDescItem[] = [];
    try {
        parsedDescItems = descStrings.map((itemStr: string) => {
            const parsedItem = JSON.parse(itemStr);
            return { id: nanoid(), ...parsedItem };
        });
    } catch (e) {
        console.error("Failed to parse 'desc' item string for routine (parent view):", descStrings, e);
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
      sectionName: sectionNameCache || 'N/A', // This is the section *name*
      class: classNameCache || routineDoc.class || 'N/A', // This is the class *name*
      descDisplay: descItems.map(item => {
        if (item.type === 'period') {
          const teacher = teachers.find(t => t.$id === item.teacherId);
          return { ...item, teacherName: teacher?.name || 'N/A' } as PeriodItemDisplay;
        }
        return item as BreakItemDisplay;
      }),
    };
  },

  fetchRoutineForSelectedStudent: async (studentId: string | null) => {
    if (!studentId) {
      get().clearRoutine(); // Clear previous data if no student is selected
      return;
    }
    set({ isLoading: true, error: null, studentRoutine: null, selectedStudentDetails: null }); // Reset for new fetch

    try {
      // Step 1: Fetch full details of the selected student
      const studentDetails = await get()._fetchFullStudentDetails(studentId);
      if (!studentDetails) {
          set({ isLoading: false, error: "Selected student's details could not be found." });
          return;
      }
      set({ selectedStudentDetails: studentDetails });
      
      // Step 2: Fetch supporting data like teacher names, faculty name for display
      await get()._fetchSupportingDataForRoutineDisplay(studentDetails); 

      // Step 3: Get the Section Document ID using student's facultyId, class name, and section name
      const sectionDocumentId = await get()._fetchSectionDocumentId(studentDetails);

      if (!sectionDocumentId) {
        set({ 
            isLoading: false, 
            studentRoutine: null, 
            error: `Could not find specific section details for ${studentDetails.name}. Routine cannot be displayed.` 
        });
        return;
      }

      // Step 4: Fetch routine using the obtained sectionDocumentId
      const routineResponse = await databases.listDocuments<RoutineDocument>(
        APPWRITE_DATABASE_ID,
        ROUTINE_COLLECTION_ID,
        [Query.equal('section', sectionDocumentId), Query.limit(1)] // Query by section ID
      );

      if (routineResponse.total > 0) {
        let rawRoutineDoc = routineResponse.documents[0];
        
        // --- `desc` parsing (ensure one option is active and matches your DB schema for coll-routine.desc) ---
        // This example assumes `desc` is an array of JSON strings
        if (Array.isArray(rawRoutineDoc.desc) && rawRoutineDoc.desc.length > 0 && typeof rawRoutineDoc.desc[0] === 'string') {
            rawRoutineDoc.desc = get()._parseRoutineDescArrayOfStrings(rawRoutineDoc.desc as unknown as string[]);
        } else if (Array.isArray(rawRoutineDoc.desc)) { // If already array of objects from Appwrite
            rawRoutineDoc.desc = rawRoutineDoc.desc.map((item: any) => ({ id: item.id || nanoid(), ...item }));
        } else { // Fallback for null or unexpected format
            rawRoutineDoc.desc = [];
        }
        // --- End `desc` parsing ---

        const enrichedRoutine = get()._enrichRoutine(rawRoutineDoc);
        set({ studentRoutine: enrichedRoutine });
      } else {
        console.log(`No routine document found for ${studentDetails.name} (section ID: ${sectionDocumentId})`);
        set({ studentRoutine: null, error: `Routine is not available for ${studentDetails.name}.` });
      }
      set({ isLoading: false });
    } catch (err: any) {
      console.error(`Error fetching routine for student ID ${studentId} (parent view):`, err);
      set({ error: err.message || `An error occurred while fetching routine for the selected student.`, isLoading: false });
    }
  },
}));