import { create } from 'zustand';
import {
  databases,
  Query,
  APPWRITE_DATABASE_ID,
  LESSON_PLAN_COLLECTION_ID,
  STUDENTS_COLLECTION_ID,
  TEACHERS_COLLECTION_ID, // To fetch teacher names
  FACULTIES_COLLECTION_ID, // To fetch faculty names
  SECTIONS_COLLECTION_ID, // To fetch section names
  account,
  LESSON_STUDENT_REVIEW_COLLECTION_ID,
} from '~/utils/appwrite'; // Assuming all necessary IDs are exported from appwrite.ts

// Import LessonPlan type, or define it if it's not shared easily
// For this example, let's assume you might have a shared types file or redefine it for clarity
// If you have src/types/lessonPlanTypes.ts:
// import { LessonPlan, Student } from '~/types/lessonPlanTypes';

// If not, let's define them here (can be slightly different from teacher's view if needed)
export interface StudentLessonPlan extends Omit<LessonPlan, 'teacherId'> { // Omit teacherId if you plan to fetch teacher name separately
  teacherName?: string; // For display
  facultyName?: string; // For display
  sectionName?: string; // For display

  myReviewRating?: number;
  myReviewComment?: string;
  myReviewDate?: string; // Optional: date of their review
}

export interface StudentProfile {
  $id: string;
  name: string;
  class: string;      // Class identifier e.g., "10"
  facultyId: string;  // Faculty document ID
  section: string;    // Section NAME e.g., "A"
  stdEmail: string;
  // parentId if needed later
}

interface StudentViewState {
  studentProfile: StudentProfile | null;
  isLoadingStudentProfile: boolean;
  fetchStudentProfile: () => Promise<void>;

  publicLessonPlans: StudentLessonPlan[];
  isLoadingLessonPlans: boolean;
  fetchPublicLessonPlans: () => Promise<void>;
  
  selectedLessonPlan: StudentLessonPlan | null;
  selectLessonPlan: (plan: StudentLessonPlan | null) => void;

  // Filters for students (optional, can be simpler than teacher's)
  currentFilters: {
    subject?: string | null;
    searchText?: string | null; // For title search
    teacherId?: string | null; // If students can filter by teacher
  };
  setFilter: (filterName: keyof StudentViewState['currentFilters'], value: string | null) => void;
  clearFilters: () => void;

  // For filter dropdowns
  availableSubjects: string[];
  availableTeachers: { id: string, name: string }[];


  error: string | null;
  setError: (message: string | null) => void;
}

export const useStudentViewStore = create<StudentViewState>((set, get) => ({
  studentProfile: null,
  isLoadingStudentProfile: false,
  fetchStudentProfile: async () => {
    set({ isLoadingStudentProfile: true, error: null });
    try {
      const user = await account.get(); // Get currently logged-in Appwrite user
      // Assuming student's email is stored in Appwrite user account and matches 'stdEmail' in coll-student
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        STUDENTS_COLLECTION_ID,
        [Query.equal('stdEmail', user.email), Query.limit(1)]
      );

      if (response.documents.length > 0) {
        const studentDoc = response.documents[0] as StudentProfile; // Cast or ensure type
        set({ studentProfile: studentDoc, isLoadingStudentProfile: false });
        get().fetchPublicLessonPlans(); // Fetch plans after profile is loaded
      } else {
        console.error(`Student profile not found for email: ${user.email}`);
        set({ error: "Student profile not found. Please contact support.", isLoadingStudentProfile: false });
      }
    } catch (error: any) {
      console.error("Error fetching student profile:", error);
      set({ error: error.message || "Failed to load your profile.", isLoadingStudentProfile: false });
    }
  },

  
  publicLessonPlans: [],
  isLoadingLessonPlans: false,
  fetchPublicLessonPlans: async () => {
    const profile = get().studentProfile;
    if (!profile) {
      set({ error: "Cannot fetch lesson plans without student profile.", isLoadingLessonPlans: false });
      return;
    }
    set({ isLoadingLessonPlans: true, error: null, publicLessonPlans: [] });

    try {
      const queries: string[] = [
        Query.equal('isPublic', true),
        Query.equal('facultyId', profile.facultyId),
        Query.equal('class', profile.class),
      ];

      let studentSectionId: string | null = null;
      try {
        const sectionResponse = await databases.listDocuments(
            APPWRITE_DATABASE_ID, SECTIONS_COLLECTION_ID,
            [
                Query.equal("name", profile.section),
                Query.equal("class", profile.class),
                Query.equal("facultyId", profile.facultyId),
                Query.limit(1)
            ]
        );
        if (sectionResponse.documents.length > 0) {
            studentSectionId = sectionResponse.documents[0].$id;
            queries.push(Query.equal('sectionId', studentSectionId));
        } else {
            console.warn(`Could not find section ID for section: ${profile.section}, class: ${profile.class}, faculty: ${profile.facultyId}.`);
        }
      } catch (sectionError) {
        console.error("Error fetching student's section ID:", sectionError);
      }

      const { subject, searchText, teacherId } = get().currentFilters;
      if (subject) queries.push(Query.equal('subject', subject));
      if (teacherId) queries.push(Query.equal('teacherId', teacherId));
      if (searchText) queries.push(Query.search('title', searchText));
      queries.push(Query.orderDesc('$createdAt'));

      const lessonPlanResponse = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        LESSON_PLAN_COLLECTION_ID,
        queries
      );

      const plansWithDetails = await Promise.all(
        lessonPlanResponse.documents.map(async (planDoc: any) => {
            let teacherName = 'N/A';
            let facultyName = 'N/A';
            let sectionNameValue = 'N/A';
            let myReviewRating: number | undefined = undefined;
            let myReviewComment: string | undefined = undefined;
            let myReviewDate: string | undefined = undefined;  

          try {
            if (planDoc.teacherId) {
              const teacherDoc = await databases.getDocument(APPWRITE_DATABASE_ID, TEACHERS_COLLECTION_ID, planDoc.teacherId);
              teacherName = (teacherDoc as any).name || 'N/A';
            }
            if (planDoc.facultyId) {
                const facultyDoc = await databases.getDocument(APPWRITE_DATABASE_ID, FACULTIES_COLLECTION_ID, planDoc.facultyId);
                facultyName = (facultyDoc as any).name || 'N/A';
            }
            if (planDoc.sectionId) {
                const sectionDoc = await databases.getDocument(APPWRITE_DATABASE_ID, SECTIONS_COLLECTION_ID, planDoc.sectionId);
                sectionNameValue = (sectionDoc as any).name || 'N/A';
            }

            // --- Fetch student-specific review for this lesson plan ---
            if (profile.$id && planDoc.$id) {
              const reviewResponse = await databases.listDocuments(
                APPWRITE_DATABASE_ID,
                LESSON_STUDENT_REVIEW_COLLECTION_ID,
                [
                  Query.equal('lessonPlanId', planDoc.$id),
                  Query.equal('studentId', profile.$id), // Logged-in student's ID
                  Query.limit(1) // Should only be one review per student per lesson plan
                ]
              );
              if (reviewResponse.documents.length > 0) {
                const reviewDoc = reviewResponse.documents[0] as any; // Cast or define type
                myReviewRating = reviewDoc.rating;
                myReviewComment = reviewDoc.comment;
                myReviewDate = reviewDoc.$createdAt;
              }
            }
            // --- End fetch student-specific review ---

          } catch (enrichError) {
            console.warn(`Error enriching lesson plan ${planDoc.$id}:`, enrichError);
          }
          return { 
            ...planDoc, 
            teacherName, 
            facultyName, 
            sectionName: sectionNameValue,
            myReviewRating, // Add review data
            myReviewComment,
            myReviewDate,
          } as StudentLessonPlan;
        })
      );
      
      set({ publicLessonPlans: plansWithDetails, isLoadingLessonPlans: false });
      
      const uniqueSubjects = [...new Set(plansWithDetails.map(p => p.subject))].filter(Boolean);
      const uniqueTeachers = plansWithDetails.reduce((acc, p) => {
        if (p.teacherId && p.teacherName && !acc.find(t => t.id === p.teacherId)) {
          acc.push({ id: p.teacherId, name: p.teacherName });
        }
        return acc;
      }, [] as { id: string, name: string }[]);

      set({ availableSubjects: uniqueSubjects as string[], availableTeachers: uniqueTeachers });

    } catch (error: any) {
      console.error("Error fetching public lesson plans:", error);
      set({ error: error.message || "Failed to load lesson plans.", isLoadingLessonPlans: false });
    }
  },

  selectedLessonPlan: null,
  selectLessonPlan: (plan) => set({ selectedLessonPlan: plan, error: null }),

  currentFilters: { subject: null, searchText: null, teacherId: null },
  setFilter: (filterName, value) => {
    set(state => ({
      currentFilters: { ...state.currentFilters, [filterName]: value },
      error: null,
    }));
    get().fetchPublicLessonPlans();
  },
  clearFilters: () => {
    set({ currentFilters: { subject: null, searchText: null, teacherId: null }, error: null });
    get().fetchPublicLessonPlans();
  },
  availableSubjects: [],
  availableTeachers: [],
  error: null,
  setError: (message) => set({ error: message }),
}));

// Re-export LessonPlan type if not from a shared file
export interface LessonPlan {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  teacherId: string;
  facultyId: string;
  class: string;
  sectionId: string;
  subject: string;
  title: string;
  description: string;
  lessonDateBS: string;
  estimatedPeriods: number;
  actualPeriodsTaken?: number;
  status: 'planned' | 'completed' | 'partially-completed';
  teacherReflection?: string;
  learningObjectives?: string[];
  teachingMaterials?: string[];
  assessmentMethods?: string[];
  overallClassRating?: number;
  isPublic?: boolean;
}