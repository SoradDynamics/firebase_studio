import { create } from 'zustand';
import {
  databases,
  Query,
  APPWRITE_DATABASE_ID,
  LESSON_PLAN_COLLECTION_ID,
  STUDENTS_COLLECTION_ID, // To fetch details of the selected student
  TEACHERS_COLLECTION_ID,
  FACULTIES_COLLECTION_ID,
  SECTIONS_COLLECTION_ID,
  LESSON_STUDENT_REVIEW_COLLECTION_ID, // For student-specific reviews
  // PARENT_COLLECTION_ID is used in SelectStudentComponent, not directly here
} from '~/utils/appwrite';

// Assuming types are shared or defined (LessonPlan, StudentLessonPlan for parent)
// If you have src/types/lessonPlanTypes.ts:
// import { LessonPlan, Student } from '~/types/lessonPlanTypes';

// Copied from studentViewStore for consistency (can be moved to shared types)
export interface LessonPlan {
  $id: string; $createdAt?: string; $updatedAt?: string; teacherId: string; facultyId: string; class: string;
  sectionId: string; subject: string; title: string; description: string; lessonDateBS: string;
  estimatedPeriods: number; actualPeriodsTaken?: number; status: 'planned' | 'completed' | 'partially-completed';
  teacherReflection?: string; learningObjectives?: string[]; teachingMaterials?: string[];
  assessmentMethods?: string[]; overallClassRating?: number; isPublic?: boolean;
}

export interface ParentStudentLessonPlan extends Omit<LessonPlan, 'teacherId'> {
  teacherName?: string;
  facultyName?: string;
  sectionName?: string; // Name of the section for this lesson plan
  // Student-specific review data for the *selected child*
  childsReviewRating?: number;
  childsReviewComment?: string;
  childsReviewDate?: string;
}

export interface SelectedStudentDetails { // Details of the student selected by parent
  $id: string;
  name: string;
  class: string;
  facultyId: string;
  section: string; // Section NAME
}

interface ParentViewState {
  selectedStudentDetails: SelectedStudentDetails | null; // Details of the child selected by parent
  isLoadingStudentDetails: boolean; // For fetching details of the selected child
  fetchSelectedStudentDetails: (studentId: string) => Promise<SelectedStudentDetails | null>;

  publicLessonPlans: ParentStudentLessonPlan[];
  isLoadingLessonPlans: boolean;
  fetchPublicLessonPlansForStudent: (studentDetails: SelectedStudentDetails) => Promise<void>;
  
  currentLessonPlan: ParentStudentLessonPlan | null; // For detail view
  selectCurrentLessonPlan: (plan: ParentStudentLessonPlan | null) => void;

  // Optional filters for lesson plans
  currentFilters: { subject?: string | null; searchText?: string | null; teacherId?: string | null; };
  setFilter: (filterName: keyof ParentViewState['currentFilters'], value: string | null) => void;
  clearFilters: () => void;
  availableSubjects: string[];
  availableTeachers: { id: string, name: string }[];

  error: string | null;
  setError: (message: string | null) => void;
}

export const useParentViewStore = create<ParentViewState>((set, get) => ({
  selectedStudentDetails: null,
  isLoadingStudentDetails: false,
  fetchSelectedStudentDetails: async (studentId) => {
    if (!studentId) {
      set({ selectedStudentDetails: null, publicLessonPlans: [] }); // Clear plans if no student
      return null;
    }
    set({ isLoadingStudentDetails: true, error: null });
    try {
      const studentDoc = await databases.getDocument<SelectedStudentDetails>(
        APPWRITE_DATABASE_ID,
        STUDENTS_COLLECTION_ID,
        studentId
      );
      set({ selectedStudentDetails: studentDoc, isLoadingStudentDetails: false });
      get().fetchPublicLessonPlansForStudent(studentDoc); // Fetch plans for this student
      return studentDoc;
    } catch (error: any) {
      console.error(`Error fetching details for student ${studentId}:`, error);
      set({ error: `Failed to load details for student ${studentId}.`, isLoadingStudentDetails: false, selectedStudentDetails: null, publicLessonPlans: [] });
      return null;
    }
  },

  publicLessonPlans: [],
  isLoadingLessonPlans: false,
  fetchPublicLessonPlansForStudent: async (studentDetails) => {
    if (!studentDetails) {
      set({ publicLessonPlans: [], isLoadingLessonPlans: false });
      return;
    }
    set({ isLoadingLessonPlans: true, error: null, publicLessonPlans: [] });

    try {
      const queries: string[] = [
        Query.equal('isPublic', true),
        Query.equal('facultyId', studentDetails.facultyId),
        Query.equal('class', studentDetails.class),
      ];

      // Step 1: Find the sectionId for the student's section name, class, and faculty
      let studentSectionId: string | null = null;
      try {
        const sectionResponse = await databases.listDocuments(
            APPWRITE_DATABASE_ID, SECTIONS_COLLECTION_ID,
            [
                Query.equal("name", studentDetails.section),
                Query.equal("class", studentDetails.class),
                Query.equal("facultyId", studentDetails.facultyId),
                Query.limit(1)
            ]
        );
        if (sectionResponse.documents.length > 0) {
            studentSectionId = sectionResponse.documents[0].$id;
            queries.push(Query.equal('sectionId', studentSectionId));
        } else {
            console.warn(`Could not find section ID for student: ${studentDetails.name}, section: ${studentDetails.section}.`);
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
        APPWRITE_DATABASE_ID, LESSON_PLAN_COLLECTION_ID, queries
      );

      const plansWithDetails = await Promise.all(
        lessonPlanResponse.documents.map(async (planDoc: any) => {
          let teacherName = 'N/A', facultyName = 'N/A', sectionNameValue = 'N/A';
          let childsReviewRating: number | undefined, childsReviewComment: string | undefined, childsReviewDate: string | undefined;

          try {
            if (planDoc.teacherId) teacherName = ((await databases.getDocument(APPWRITE_DATABASE_ID, TEACHERS_COLLECTION_ID, planDoc.teacherId)) as any).name || 'N/A';
            if (planDoc.facultyId) facultyName = ((await databases.getDocument(APPWRITE_DATABASE_ID, FACULTIES_COLLECTION_ID, planDoc.facultyId)) as any).name || 'N/A';
            if (planDoc.sectionId) sectionNameValue = ((await databases.getDocument(APPWRITE_DATABASE_ID, SECTIONS_COLLECTION_ID, planDoc.sectionId)) as any).name || 'N/A';

            // Fetch review for the *selected child*
            const reviewResponse = await databases.listDocuments(
              APPWRITE_DATABASE_ID, LESSON_STUDENT_REVIEW_COLLECTION_ID,
              [
                Query.equal('lessonPlanId', planDoc.$id),
                Query.equal('studentId', studentDetails.$id), // Use ID of the selected student
                Query.limit(1)
              ]
            );
            if (reviewResponse.documents.length > 0) {
              const reviewDoc = reviewResponse.documents[0] as any;
              childsReviewRating = reviewDoc.rating;
              childsReviewComment = reviewDoc.comment;
              childsReviewDate = reviewDoc.$createdAt;
            }
          } catch (enrichError) { console.warn(`Error enriching LP ${planDoc.$id}:`, enrichError); }
          
          return { ...planDoc, teacherName, facultyName, sectionName: sectionNameValue,
                   childsReviewRating, childsReviewComment, childsReviewDate } as ParentStudentLessonPlan;
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
      console.error("Error fetching public lesson plans for student:", error);
      set({ error: error.message || "Failed to load lesson plans.", isLoadingLessonPlans: false });
    }
  },

  currentLessonPlan: null,
  selectCurrentLessonPlan: (plan) => set({ currentLessonPlan: plan, error: null }),

  currentFilters: { subject: null, searchText: null, teacherId: null },
  setFilter: (filterName, value) => {
    set(state => ({ currentFilters: { ...state.currentFilters, [filterName]: value }, error: null }));
    const student = get().selectedStudentDetails;
    if (student) get().fetchPublicLessonPlansForStudent(student);
  },
  clearFilters: () => {
    set({ currentFilters: { subject: null, searchText: null, teacherId: null }, error: null });
    const student = get().selectedStudentDetails;
    if (student) get().fetchPublicLessonPlansForStudent(student);
  },
  availableSubjects: [],
  availableTeachers: [],
  error: null,
  setError: (message) => set({ error: message }),
}));