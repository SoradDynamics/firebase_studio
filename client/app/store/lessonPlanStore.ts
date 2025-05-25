import { create } from 'zustand';
import {
  databases,
  Query,
  ID,
  APPWRITE_DATABASE_ID,
  ROUTINE_COLLECTION_ID,
  FACULTIES_COLLECTION_ID,
  SECTIONS_COLLECTION_ID,
  STUDENTS_COLLECTION_ID,
  LESSON_PLAN_COLLECTION_ID,
  LESSON_STUDENT_REVIEW_COLLECTION_ID,
  TEACHERS_COLLECTION_ID,
  account,
} from '~/utils/appwrite';
import { SelectOption } from '../../components/pages/common/CustomSelect'; // Adjust path

// --- Types ---
export interface TeacherContext {
  facultyId: string;
  facultyName: string;
  class: string;
  sectionId: string;
  sectionName: string;
  subject: string;
}

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
  overallClassRating?: number; // <<< CHANGED: Added this line
}
export type LessonPlanFormData = Omit<LessonPlan, '$id' | '$createdAt' | '$updatedAt' | 'teacherId'>;

export interface StudentReview {
  $id: string;
  $createdAt?: string;
  lessonPlanId: string;
  studentId: string;
  studentName?: string;
  teacherId: string;
  rating: number;
  comment: string;
}
export type StudentReviewFormData = Omit<StudentReview, '$id' | '$createdAt' | 'teacherId' | 'studentName'>;

export interface Student {
  $id: string;
  name: string;
  // Add other relevant student fields if needed, e.g., rollNo
}

interface LessonPlanState {
  teacherProfile: { id: string; name: string; email: string } | null;
  isLoadingTeacherProfile: boolean;
  fetchTeacherProfile: () => Promise<void>;

  assignedContexts: TeacherContext[];
  fetchAssignedContexts: () => Promise<void>;
  isLoadingContexts: boolean;

  lessonPlans: LessonPlan[];
  fetchLessonPlans: () => Promise<void>;
  isLoadingLessonPlans: boolean;
  selectedLessonPlan: LessonPlan | null;
  selectLessonPlan: (plan: LessonPlan | null) => void;

  addLessonPlan: (planData: LessonPlanFormData) => Promise<boolean>;
  updateLessonPlan: (planId: string, planData: Partial<LessonPlanFormData>) => Promise<boolean>;
  deleteLessonPlan: (planId: string) => Promise<boolean>;
  isSubmittingLessonPlan: boolean;

  currentFilters: {
    facultyId?: string | null;
    class?: string | null;
    sectionId?: string | null;
    subject?: string | null;
    searchText?: string | null; 
    status?: string | null;
  };
  setFilter: (filterName: keyof LessonPlanState['currentFilters'], value: string | null) => void;
  clearFilters: () => void;

  studentReviews: StudentReview[];
  fetchStudentReviews: (lessonPlanId: string) => Promise<void>;
  isLoadingStudentReviews: boolean;
  addStudentReview: (reviewData: StudentReviewFormData) => Promise<boolean>;
  updateStudentReview: (reviewId: string, reviewData: Partial<StudentReviewFormData>) => Promise<boolean>;
  deleteStudentReview: (reviewId: string) => Promise<boolean>;
  isSubmittingStudentReview: boolean;

  studentsForReview: Student[];
  fetchStudentsForSection: (lessonPlanSectionId: string, lessonPlanFacultyId: string, lessonPlanClass: string) => Promise<void>;
  isLoadingStudentsForReview: boolean;

  error: string | null;
  setError: (message: string | null) => void;
}

const parseRoutineDesc = (descStringArray: string[] | undefined, routineDocId: string): Array<any> => {
  let allParsedItems: any[] = [];
  if (!Array.isArray(descStringArray)) {
    // console.warn(`[parseRoutineDesc for ${routineDocId}] descStringArray is not an array or is undefined:`, descStringArray);
    return [];
  }
  descStringArray.forEach((jsonString, index) => {
    try {
      const parsedJson = JSON.parse(jsonString);
      if (parsedJson && typeof parsedJson === 'object') {
        if (Array.isArray(parsedJson)) {
            allParsedItems = allParsedItems.concat(parsedJson);
        } else {
            allParsedItems = allParsedItems.concat([parsedJson]); 
            // console.log(`[parseRoutineDesc for ${routineDocId}] Parsed single object at index ${index}, wrapped in array:`, [parsedJson]);
        }
      } else {
        // console.warn(`[parseRoutineDesc for ${routineDocId}] Parsed JSON from string at index ${index} is not a valid object or array:`, parsedJson);
      }
    } catch (e) {
      // console.error(`[parseRoutineDesc for ${routineDocId}] Failed to parse JSON string at index ${index}:`, jsonString, e);
    }
  });
  return allParsedItems;
};

export const useLessonPlanStore = create<LessonPlanState>((set, get) => ({
  teacherProfile: null,
  isLoadingTeacherProfile: false,
  fetchTeacherProfile: async () => {
    set({ isLoadingTeacherProfile: true, error: null });
    try {
      const user = await account.get();
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        TEACHERS_COLLECTION_ID,
        [Query.equal('email', user.email), Query.limit(1)]
      );
      if (response.documents.length > 0) {
        const teacherDoc = response.documents[0] as any; 
        set({ teacherProfile: { id: teacherDoc.$id, name: teacherDoc.name, email: teacherDoc.email }, isLoadingTeacherProfile: false });
        get().fetchAssignedContexts();
      } else {
        set({ error: `Teacher profile not found for email: ${user.email}. Ensure a teacher document exists with this email.`, isLoadingTeacherProfile: false });
      }
    } catch (error: any) {
      set({ error: error.message || "Failed to load teacher data.", isLoadingTeacherProfile: false });
    }
  },

  assignedContexts: [],
  isLoadingContexts: false,
  fetchAssignedContexts: async () => {
    const teacherProfile = get().teacherProfile;
    if (!teacherProfile || !teacherProfile.id) {
      return;
    }
    const teacherId = teacherProfile.id;
    set({ isLoadingContexts: true, error: null, assignedContexts: [] });
    try {
      const routineResponse = await databases.listDocuments(APPWRITE_DATABASE_ID, ROUTINE_COLLECTION_ID);
      const tempContexts: Omit<TeacherContext, 'facultyName' | 'sectionName'>[] = [];
      const uniqueContextKeys = new Set<string>();

      for (const doc of routineResponse.documents) {
        const routineItems = parseRoutineDesc(doc.desc as string[] | undefined, doc.$id);
        for (const item of routineItems) {
          if (item.type === 'period') {
            if (item.teacherId && String(item.teacherId).trim() === String(teacherId).trim()) {
              const contextKey = `${doc.faculty}-${doc.class}-${doc.section}-${item.subject}`;
              if (!uniqueContextKeys.has(contextKey)) {
                uniqueContextKeys.add(contextKey);
                tempContexts.push({
                  facultyId: String(doc.faculty),
                  class: String(doc.class),
                  sectionId: String(doc.section),
                  subject: String(item.subject),
                });
              }
            }
          }
        }
      }

      if (tempContexts.length === 0) {
        set({ assignedContexts: [], isLoadingContexts: false });
        return;
      }

      const facultyIds = [...new Set(tempContexts.map(c => c.facultyId))];
      const sectionIds = [...new Set(tempContexts.map(c => c.sectionId))];

      const facultyPromises = facultyIds.map(id => databases.getDocument(APPWRITE_DATABASE_ID, FACULTIES_COLLECTION_ID, id).catch(() => null));
      const sectionPromises = sectionIds.map(id => databases.getDocument(APPWRITE_DATABASE_ID, SECTIONS_COLLECTION_ID, id).catch(() => null));

      const facultyDocs = (await Promise.all(facultyPromises)).filter(Boolean) as any[];
      const sectionDocs = (await Promise.all(sectionPromises)).filter(Boolean) as any[];

      const facultyMap = new Map(facultyDocs.map(f => [f!.$id, f!.name]));
      const sectionMap = new Map(sectionDocs.map(s => [s!.$id, s!.name]));

      const finalContexts: TeacherContext[] = tempContexts.map(tc => ({
        ...tc,
        facultyName: facultyMap.get(tc.facultyId) || `Faculty (${tc.facultyId.slice(-4)})`,
        sectionName: sectionMap.get(tc.sectionId) || `Section (${tc.sectionId.slice(-4)})`,
      }));
      
      set({ assignedContexts: finalContexts, isLoadingContexts: false });
      if (finalContexts.length > 0) {
        get().fetchLessonPlans();
      }
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch assigned contexts", isLoadingContexts: false });
    }
  },

  lessonPlans: [],
  isLoadingLessonPlans: false,
  selectedLessonPlan: null,
  selectLessonPlan: (plan) => set({ selectedLessonPlan: plan, error: null }),

  fetchLessonPlans: async () => {
    const teacherId = get().teacherProfile?.id;
    if (!teacherId) return;
    const assignedContexts = get().assignedContexts;
    if (assignedContexts.length === 0 && !get().isLoadingContexts) {
        set({ lessonPlans: [], isLoadingLessonPlans: false });
        return;
    }
    set({ isLoadingLessonPlans: true, error: null });
    try {
      const queries = [Query.equal('teacherId', teacherId), Query.orderDesc('$createdAt')];
      const { facultyId, class: className, sectionId, subject, searchText, status } = get().currentFilters;

      if (facultyId) queries.push(Query.equal('facultyId', facultyId));
      if (className) queries.push(Query.equal('class', className));
      if (sectionId) queries.push(Query.equal('sectionId', sectionId));
      if (subject) queries.push(Query.equal('subject', subject));
      if (status) queries.push(Query.equal('status', status));
      if (searchText) queries.push(Query.search('title', searchText));

      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        LESSON_PLAN_COLLECTION_ID,
        queries
      );
      set({ lessonPlans: response.documents as LessonPlan[], isLoadingLessonPlans: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch lesson plans", isLoadingLessonPlans: false });
    }
  },
  
  isSubmittingLessonPlan: false,
  addLessonPlan: async (planData) => {
    const teacherId = get().teacherProfile?.id;
    if (!teacherId) {
      set({ error: "Teacher not identified." });
      return false;
    }
    set({ isSubmittingLessonPlan: true, error: null });
    try {
      const dataToSave = { ...planData, teacherId };
      // console.log("[addLessonPlan] Data being sent to Appwrite:", JSON.stringify(dataToSave, null, 2)); 
      // console.log("[addLessonPlan] Target Collection ID:", LESSON_PLAN_COLLECTION_ID);
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        LESSON_PLAN_COLLECTION_ID,
        ID.unique(),
        dataToSave
      );
      set({ isSubmittingLessonPlan: false });
      get().fetchLessonPlans();
      return true;
    } catch (error: any) {
      // console.error("Error adding lesson plan:", error);
      // console.error("Raw Appwrite Error Object (addLessonPlan):", error); 
      set({ error: error.message || "Failed to add lesson plan", isSubmittingLessonPlan: false });
      return false;
    }
  },

  updateLessonPlan: async (planId, planData) => {
    set({ isSubmittingLessonPlan: true, error: null });
    try {
      // console.log("[updateLessonPlan] Data being sent to Appwrite for ID " + planId + ":", JSON.stringify(planData, null, 2));
      // console.log("[updateLessonPlan] Target Collection ID:", LESSON_PLAN_COLLECTION_ID);
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        LESSON_PLAN_COLLECTION_ID,
        planId,
        planData
      );
      set({ isSubmittingLessonPlan: false, selectedLessonPlan: null }); // Clear selection after update
      get().fetchLessonPlans(); // Refetch list
      // Optionally, refetch the specific plan if you want to update the detailed view immediately without closing it
      // const updatedPlan = await databases.getDocument(APPWRITE_DATABASE_ID, LESSON_PLAN_COLLECTION_ID, planId);
      // set({ selectedLessonPlan: updatedPlan as LessonPlan });
      return true;
    } catch (error: any) {
      // console.error("Error updating lesson plan:", error);
      // console.error("Raw Appwrite Error Object (updateLessonPlan):", error);
      set({ error: error.message || "Failed to update lesson plan", isSubmittingLessonPlan: false });
      return false;
    }
  },

  deleteLessonPlan: async (planId) => {
    set({ isSubmittingLessonPlan: true, error: null });
    try {
      await databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        LESSON_PLAN_COLLECTION_ID,
        planId
      );
      set({ isSubmittingLessonPlan: false, selectedLessonPlan: null });
      get().fetchLessonPlans();
      return true;
    } catch (error:any) {
      set({ error: error.message || "Failed to delete lesson plan", isSubmittingLessonPlan: false });
      return false;
    }
  },

  currentFilters: { facultyId: null, class: null, sectionId: null, subject: null, searchText: null, status: null },
  setFilter: (filterName, value) => {
    set(state => ({
      currentFilters: { ...state.currentFilters, [filterName]: value },
      error: null,
    }));
    get().fetchLessonPlans();
  },
  clearFilters: () => {
    set({ currentFilters: { facultyId: null, class: null, sectionId: null, subject: null, searchText: null, status: null }, error: null });
    get().fetchLessonPlans();
  },

  studentReviews: [],
  isLoadingStudentReviews: false,
  fetchStudentReviews: async (lessonPlanId) => {
    set({ isLoadingStudentReviews: true, error: null });
    try {
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        LESSON_STUDENT_REVIEW_COLLECTION_ID,
        [Query.equal('lessonPlanId', lessonPlanId), Query.orderDesc('$createdAt')]
      );
      const reviewsWithStudentNames = await Promise.all(
        response.documents.map(async (reviewDoc) => {
          try {
            const studentDoc = await databases.getDocument(APPWRITE_DATABASE_ID, STUDENTS_COLLECTION_ID, (reviewDoc as any).studentId) as any;
            return { ...reviewDoc, studentName: studentDoc.name } as StudentReview;
          } catch (e) {
            return { ...reviewDoc, studentName: "Unknown Student" } as StudentReview;
          }
        })
      );
      set({ studentReviews: reviewsWithStudentNames, isLoadingStudentReviews: false });
    } catch (error:any) {
      set({ error: error.message || "Failed to fetch student reviews", isLoadingStudentReviews: false });
    }
  },

  isSubmittingStudentReview: false,
  addStudentReview: async (reviewData) => {
    const teacherId = get().teacherProfile?.id;
    if (!teacherId) {
      set({ error: "Teacher not identified."});
      return false;
    }
    set({ isSubmittingStudentReview: true, error: null });
    try {
      const dataToSave = { ...reviewData, teacherId };
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        LESSON_STUDENT_REVIEW_COLLECTION_ID,
        ID.unique(),
        dataToSave
      );
      set({ isSubmittingStudentReview: false });
      get().fetchStudentReviews(reviewData.lessonPlanId);
      return true;
    } catch (error:any) {
      set({ error: error.message || "Failed to add student review", isSubmittingStudentReview: false });
      return false;
    }
  },
  
  updateStudentReview: async (reviewId, reviewData) => {
    set({ isSubmittingStudentReview: true, error: null });
    try {
        await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            LESSON_STUDENT_REVIEW_COLLECTION_ID,
            reviewId,
            reviewData
        );
        set({ isSubmittingStudentReview: false });
        if (get().selectedLessonPlan?.$id) {
            get().fetchStudentReviews(get().selectedLessonPlan!.$id!);
        }
        return true;
    } catch (error: any) {
        set({ error: error.message || "Failed to update student review", isSubmittingStudentReview: false });
        return false;
    }
  },

  deleteStudentReview: async (reviewId) => {
      set({ isSubmittingStudentReview: true, error: null });
      try {
          await databases.deleteDocument(
              APPWRITE_DATABASE_ID,
              LESSON_STUDENT_REVIEW_COLLECTION_ID,
              reviewId
          );
          set({ isSubmittingStudentReview: false });
          if (get().selectedLessonPlan?.$id) {
              get().fetchStudentReviews(get().selectedLessonPlan!.$id!);
          }
          return true;
      } catch (error: any) {
          set({ error: error.message || "Failed to delete student review", isSubmittingStudentReview: false });
          return false;
      }
  },

  studentsForReview: [],
  isLoadingStudentsForReview: false,
  fetchStudentsForSection: async (lessonPlanSectionId: string, lessonPlanFacultyId: string, lessonPlanClass: string) => {
    set({ isLoadingStudentsForReview: true, error: null, studentsForReview: [] });
    // console.log(`[fetchStudentsForSection] For Lesson Plan - SectionID: ${lessonPlanSectionId}, FacultyID: ${lessonPlanFacultyId}, Class: ${lessonPlanClass}`);
    try {
      let sectionName: string | null = null;
      try {
        // console.log(`[fetchStudentsForSection] Fetching section document with ID: ${lessonPlanSectionId}`);
        const sectionDoc = await databases.getDocument(
          APPWRITE_DATABASE_ID,
          SECTIONS_COLLECTION_ID,
          lessonPlanSectionId
        );
        sectionName = (sectionDoc as any).name;
        if (!sectionName) {
            // console.error(`[fetchStudentsForSection] Section document ${lessonPlanSectionId} found, but 'name' attribute is missing or empty.`);
            set({ isLoadingStudentsForReview: false, error: "Could not retrieve section name." });
            return;
        }
        // console.log(`[fetchStudentsForSection] Found section name: "${sectionName}" for ID ${lessonPlanSectionId}`);
      } catch (error: any) {
        // console.error(`[fetchStudentsForSection] Error fetching section document ${lessonPlanSectionId}:`, error);
        set({ isLoadingStudentsForReview: false, error: "Failed to fetch section details to find students." });
        return;
      }

      const studentQueries = [
        Query.equal('section', sectionName),
        Query.equal('facultyId', lessonPlanFacultyId),
        Query.equal('class', lessonPlanClass),
        Query.orderAsc('name')
      ];

      // console.log(`[fetchStudentsForSection] Fetching students with queries:`, JSON.stringify(studentQueries));
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        STUDENTS_COLLECTION_ID,
        studentQueries
      );
      // console.log(`[fetchStudentsForSection] Found ${response.documents.length} students matching criteria.`);
      set({ studentsForReview: response.documents as Student[], isLoadingStudentsForReview: false });

    } catch (error: any) {
      // console.error("[fetchStudentsForSection] Overall error:", error);
      // console.error("Raw Appwrite Error (fetchStudentsForSection):", error);
      set({ error: error.message || "Failed to fetch students for section", isLoadingStudentsForReview: false });
    }
  },

  error: null,
  setError: (message) => set({ error: message }),
}));

export const getUniqueFilterOptions = (
  contexts: TeacherContext[],
  key: 'facultyId' | 'class' | 'sectionId' | 'subject',
  parentFilters?: { facultyId?: string | null; class?: string | null; sectionId?: string | null; }
): SelectOption[] => {
  let relevantContexts = contexts;
  if (parentFilters?.facultyId) {
    relevantContexts = relevantContexts.filter(c => c.facultyId === parentFilters.facultyId);
  }
  if (parentFilters?.class && (key === 'sectionId' || key === 'subject')) {
    relevantContexts = relevantContexts.filter(c => c.class === parentFilters.class);
  }
  if (parentFilters?.sectionId && key === 'subject') {
    relevantContexts = relevantContexts.filter(c => c.sectionId === parentFilters.sectionId);
  }

  const uniqueValues = new Map<string, string>();
  relevantContexts.forEach(context => {
    let idVal: string;
    let nameVal: string;
    switch (key) {
      case 'facultyId': idVal = context.facultyId; nameVal = context.facultyName; break;
      case 'class': idVal = context.class; nameVal = context.class; break;
      case 'sectionId': idVal = context.sectionId; nameVal = context.sectionName; break;
      case 'subject': idVal = context.subject; nameVal = context.subject; break;
      default: return;
    }
    if (!uniqueValues.has(idVal)) {
      uniqueValues.set(idVal, nameVal);
    }
  });
  return Array.from(uniqueValues, ([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name));
};