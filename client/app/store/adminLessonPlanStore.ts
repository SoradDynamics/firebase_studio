import { create } from 'zustand';
import {
  databases,
  Query,
  APPWRITE_DATABASE_ID,
  LESSON_PLAN_COLLECTION_ID,
  TEACHERS_COLLECTION_ID,
  FACULTIES_COLLECTION_ID,
  SECTIONS_COLLECTION_ID,
  STUDENTS_COLLECTION_ID, // To get student names for reviews
  LESSON_STUDENT_REVIEW_COLLECTION_ID,
} from '~/utils/appwrite'; // Ensure all IDs are exported

// Assuming types from a shared file or defined here
// If you have src/types/lessonPlanTypes.ts:
// import { LessonPlan, StudentReview, Student, TeacherProfile, Faculty, Section } from '~/types/lessonPlanTypes';
// For SelectOption
// import { SelectOption } from '~/components/common/CustomSelect';


// --- START TYPE DEFINITIONS (can be moved to a shared types file) ---
export interface TeacherProfile {
  $id: string;
  name: string;
  email?: string; // Optional, if needed
}

export interface Faculty {
  $id: string;
  name: string;
  classes?: string[]; // Array of class names/identifiers
}

export interface Section {
  $id: string;
  name: string; // Section name (e.g., "A", "B")
  class: string; // Class identifier (e.g., "10", "11A")
  facultyId: string;
  subjects?: string[];
}

export interface LessonPlan {
  $id: string; $createdAt?: string; $updatedAt?: string; teacherId: string; facultyId: string; class: string;
  sectionId: string; subject: string; title: string; description: string; lessonDateBS: string;
  estimatedPeriods: number; actualPeriodsTaken?: number; status: 'planned' | 'completed' | 'partially-completed';
  teacherReflection?: string; learningObjectives?: string[]; teachingMaterials?: string[];
  assessmentMethods?: string[]; overallClassRating?: number; isPublic?: boolean;
}

export interface Student {
  $id: string;
  name: string;
}

export interface StudentReview {
  $id: string; $createdAt?: string; lessonPlanId: string; studentId: string;
  studentName?: string; // For display
  teacherId: string; // Teacher who wrote the student review
  rating: number; comment: string;
}
// --- END TYPE DEFINITIONS ---


export interface AdminLessonPlanView extends LessonPlan {
  teacherName?: string;
  facultyName?: string;
  sectionName?: string;
}

export interface AdminStudentReviewView extends StudentReview {
    // studentName is already in StudentReview, teacherWhoReviewedName could be added if different from lesson plan teacher
}


interface AdminLessonPlanState {
  lessonPlans: AdminLessonPlanView[];
  isLoadingLessonPlans: boolean;
  fetchLessonPlans: () => Promise<void>;

  selectedLessonPlan: AdminLessonPlanView | null;
  selectLessonPlan: (plan: AdminLessonPlanView | null) => void;
  
  // For detail view
  studentReviewsForSelectedPlan: AdminStudentReviewView[];
  isLoadingStudentReviews: boolean;
  fetchStudentReviewsForPlan: (lessonPlanId: string) => Promise<void>;

  // Data for filters
  allTeachers: TeacherProfile[];
  allFaculties: Faculty[];
  allSections: Section[]; // Might need to fetch dynamically based on faculty/class
  allClasses: string[]; // Derived from faculties or sections
  allSubjects: string[]; // Derived from fetched lesson plans or sections
  isLoadingFilterData: boolean;
  fetchFilterData: () => Promise<void>;

  currentFilters: {
    facultyId?: string | null;
    class?: string | null;
    sectionId?: string | null;
    subject?: string | null;
    teacherId?: string | null;
    status?: string | null;
    isPublic?: boolean | null; // Filter by public status
    searchText?: string | null;
  };
  setFilter: (filterName: keyof AdminLessonPlanState['currentFilters'], value: string | boolean | null) => void;
  clearFilters: () => void;

  error: string | null;
  setError: (message: string | null) => void;
}

// Helper to get unique values for filter dropdowns
const getUniqueValues = (items: any[], key: string): string[] => {
    return [...new Set(items.map(item => item[key]).filter(Boolean))].sort() as string[];
};
const getUniqueSelectOptions = (items: any[], idKey: string, nameKey: string): {id: string, name: string}[] => {
    const map = new Map<string, string>();
    items.forEach(item => {
        if (item[idKey] && item[nameKey] && !map.has(item[idKey])) {
            map.set(item[idKey], item[nameKey]);
        }
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
};


export const useAdminLessonPlanStore = create<AdminLessonPlanState>((set, get) => ({
  lessonPlans: [],
  isLoadingLessonPlans: false,
  selectedLessonPlan: null,
  studentReviewsForSelectedPlan: [],
  isLoadingStudentReviews: false,

  allTeachers: [],
  allFaculties: [],
  allSections: [],
  allClasses: [],
  allSubjects: [],
  isLoadingFilterData: false,

  currentFilters: { facultyId: null, class: null, sectionId: null, subject: null, teacherId: null, status: null, isPublic: null, searchText: null },
  error: null,

  fetchFilterData: async () => {
    set({ isLoadingFilterData: true });
    try {
      const [teachersRes, facultiesRes, sectionsRes] = await Promise.all([
        databases.listDocuments(APPWRITE_DATABASE_ID, TEACHERS_COLLECTION_ID, [Query.limit(500), Query.orderAsc('name')]),
        databases.listDocuments(APPWRITE_DATABASE_ID, FACULTIES_COLLECTION_ID, [Query.limit(100), Query.orderAsc('name')]),
        databases.listDocuments(APPWRITE_DATABASE_ID, SECTIONS_COLLECTION_ID, [Query.limit(1000)]), // Fetch all sections initially
      ]);

      const faculties = facultiesRes.documents as Faculty[];
      const sections = sectionsRes.documents as Section[];

      const classesFromFaculties = new Set<string>();
      faculties.forEach(f => f.classes?.forEach(c => classesFromFaculties.add(c)));
      
      const classesFromSections = new Set<string>();
      sections.forEach(s => classesFromSections.add(s.class));

      const allClasses = [...new Set([...classesFromFaculties, ...classesFromSections])].sort();
      
      // Subjects can be derived from all lesson plans once fetched, or from sections if available on section schema
      // For now, we'll populate subjects after lesson plans are fetched.

      set({
        allTeachers: teachersRes.documents as TeacherProfile[],
        allFaculties: faculties,
        allSections: sections,
        allClasses: allClasses,
        isLoadingFilterData: false,
      });
    } catch (err: any) {
      console.error("Error fetching filter data:", err);
      set({ error: "Failed to load filter options.", isLoadingFilterData: false });
    }
  },

  fetchLessonPlans: async () => {
    set({ isLoadingLessonPlans: true, error: null });
    try {
      const queries: string[] = [Query.orderDesc('$createdAt')]; // Default order
      const { facultyId, class: className, sectionId, subject, teacherId, status, isPublic, searchText } = get().currentFilters;

      if (facultyId) queries.push(Query.equal('facultyId', facultyId));
      if (className) queries.push(Query.equal('class', className));
      if (sectionId) queries.push(Query.equal('sectionId', sectionId));
      if (subject) queries.push(Query.equal('subject', subject));
      if (teacherId) queries.push(Query.equal('teacherId', teacherId));
      if (status) queries.push(Query.equal('status', status));
      if (isPublic !== null && isPublic !== undefined) queries.push(Query.equal('isPublic', isPublic));
      if (searchText) queries.push(Query.search('title', searchText));
      // Add more Query.search for other text fields if needed, e.g., description

      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        LESSON_PLAN_COLLECTION_ID,
        queries
      );

      // Enrich with names
      const teachersMap = new Map(get().allTeachers.map(t => [t.$id, t.name]));
      const facultiesMap = new Map(get().allFaculties.map(f => [f.$id, f.name]));
      const sectionsMap = new Map(get().allSections.map(s => [s.$id, s.name]));


      const enrichedPlans = response.documents.map((planDoc: any) => ({
        ...planDoc,
        teacherName: teachersMap.get(planDoc.teacherId) || 'Unknown Teacher',
        facultyName: facultiesMap.get(planDoc.facultyId) || 'Unknown Faculty',
        sectionName: sectionsMap.get(planDoc.sectionId) || 'Unknown Section',
      })) as AdminLessonPlanView[];

      set({ lessonPlans: enrichedPlans, isLoadingLessonPlans: false });

      // Update available subjects from fetched plans if not already comprehensive
      if (get().allSubjects.length === 0 || subject === null) { // Only update if not specifically filtered by subject
        const subjectsFromPlans = getUniqueValues(enrichedPlans, 'subject');
        set({ allSubjects: subjectsFromPlans });
      }

    } catch (err: any) {
      console.error("Error fetching lesson plans:", err);
      set({ error: "Failed to load lesson plans.", isLoadingLessonPlans: false });
    }
  },

  selectLessonPlan: (plan) => {
    set({ selectedLessonPlan: plan, studentReviewsForSelectedPlan: [], error: null });
    if (plan && plan.$id) {
      get().fetchStudentReviewsForPlan(plan.$id);
    }
  },

  fetchStudentReviewsForPlan: async (lessonPlanId) => {
    set({ isLoadingStudentReviews: true });
    try {
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        LESSON_STUDENT_REVIEW_COLLECTION_ID,
        [Query.equal('lessonPlanId', lessonPlanId), Query.orderAsc('$createdAt'), Query.limit(100)] // Limit reviews per plan for performance
      );

      const studentIds = response.documents.map((doc: any) => doc.studentId);
      let studentsMap = new Map<string, string>();

      if (studentIds.length > 0) {
        // Fetch student names in batches if many, or one by one if few.
        // For simplicity, fetching one by one here. For >25 students, batching is better.
        const studentDocsPromises = studentIds.map(id => 
            databases.getDocument(APPWRITE_DATABASE_ID, STUDENTS_COLLECTION_ID, id).catch(() => null)
        );
        const studentDocs = (await Promise.all(studentDocsPromises)).filter(Boolean) as Student[];
        studentsMap = new Map(studentDocs.map(s => [s.$id, s.name]));
      }
      
      const reviewsWithStudentNames = response.documents.map((reviewDoc: any) => ({
        ...reviewDoc,
        studentName: studentsMap.get(reviewDoc.studentId) || "Unknown Student",
      })) as AdminStudentReviewView[];

      set({ studentReviewsForSelectedPlan: reviewsWithStudentNames, isLoadingStudentReviews: false });
    } catch (err: any) {
      console.error(`Error fetching student reviews for plan ${lessonPlanId}:`, err);
      set({ error: "Failed to load student reviews.", isLoadingStudentReviews: false });
    }
  },

  setFilter: (filterName, value) => {
    set(state => {
        const newFilters = { ...state.currentFilters, [filterName]: value };
        // Reset dependent filters if a parent filter changes
        if (filterName === 'facultyId') {
            newFilters.class = null;
            newFilters.sectionId = null;
        } else if (filterName === 'class') {
            newFilters.sectionId = null;
        }
        return { currentFilters: newFilters, error: null };
    });
    get().fetchLessonPlans();
  },
  clearFilters: () => {
    set({ currentFilters: { facultyId: null, class: null, sectionId: null, subject: null, teacherId: null, status: null, isPublic: null, searchText: null }, error: null });
    get().fetchLessonPlans();
  },
  setError: (message) => set({ error: message }),
}));