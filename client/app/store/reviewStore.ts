// src/store/reviewStore.ts (Create this file)
import { create } from 'zustand';
import {
  ClassTeacherInfo,
  StudentWithDetails,
  ReviewDocument,
  TeacherDocument,
  SectionDocument,
  FacultyDocument,
  Review,
  StudentDocument,
} from 'types/review';
import {
  databases,
  Query,
  ID,
  getCurrentUserEmail,
  APPWRITE_DATABASE_ID,
  TEACHERS_COLLECTION_ID, // Assuming you have this constant, similar to FACULTIES_COLLECTION_ID
  SECTIONS_COLLECTION_ID,
  STUDENTS_COLLECTION_ID,
  FACULTIES_COLLECTION_ID,
  REVIEWS_COLLECTION_ID,
  account,
} from '~/utils/appwrite';
import { Models } from 'appwrite';

// Make sure TEACHERS_COLLECTION_ID is defined in appwrite.ts and .env
// export const TEACHERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_TEACHER_COLLECTION_ID;

interface ReviewState {
  isInitializing: boolean;
  isClassTeacher: boolean;
  classTeacherInfo: ClassTeacherInfo | null;
  error: string | null;

  studentSearchTerm: string;
  searchedStudents: StudentWithDetails[];
  isLoadingStudents: boolean;
  selectedStudent: StudentWithDetails | null;

  reviews: ReviewDocument[];
  isLoadingReviews: boolean;

  isDrawerOpen: boolean;
  drawerMode: 'add' | 'edit';
  reviewToEdit: ReviewDocument | null;
  isSubmittingReview: boolean;
  submitReviewError: string | null;

  isDeletePopoverOpen: boolean;
  reviewToDelete: ReviewDocument | null;
  isDeletingReview: boolean;

  actions: {
    checkAuthAndLoadTeacherInfo: () => Promise<void>;
    setStudentSearchTerm: (term: string) => void;
    searchStudents: () => Promise<void>;
    selectStudent: (student: StudentWithDetails | null) => Promise<void>; // Also fetches reviews
    fetchReviewsForSelectedStudent: () => Promise<void>;

    openDrawer: (mode: 'add' | 'edit', review?: ReviewDocument) => void;
    closeDrawer: () => void;
    submitReview: (reviewData: Omit<Review, 'teacherId' | 'studentId' | 'sectionId'>) => Promise<boolean>; // Returns true on success

    openDeletePopover: (review: ReviewDocument) => void;
    closeDeletePopover: () => void;
    confirmDeleteReview: () => Promise<boolean>; // Returns true on success
    
    clearErrors: () => void;
  };
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  isInitializing: true,
  isClassTeacher: false,
  classTeacherInfo: null,
  error: null,

  studentSearchTerm: '',
  searchedStudents: [],
  isLoadingStudents: false,
  selectedStudent: null,

  reviews: [],
  isLoadingReviews: false,

  isDrawerOpen: false,
  drawerMode: 'add',
  reviewToEdit: null,
  isSubmittingReview: false,
  submitReviewError: null,

  isDeletePopoverOpen: false,
  reviewToDelete: null,
  isDeletingReview: false,

  actions: {
    checkAuthAndLoadTeacherInfo: async () => {
      set({ isInitializing: true, error: null });
      try {
        const userEmail = await getCurrentUserEmail();
        if (!userEmail) {
          set({ isClassTeacher: false, isInitializing: false, error: "Could not get current user email." });
          return;
        }

        const appwriteUser = await account.get(); // To get Appwrite User $id

        // 1. Find teacher by email
        const teacherResponse = await databases.listDocuments<TeacherDocument>(
          APPWRITE_DATABASE_ID,
          TEACHERS_COLLECTION_ID, // Ensure this ID is correct and available
          [Query.equal('email', userEmail), Query.limit(1)]
        );

        if (teacherResponse.documents.length === 0) {
          set({ isClassTeacher: false, isInitializing: false, error: "Access Denied: You are not registered as a teacher." });
          return;
        }
        const teacher = teacherResponse.documents[0];

        // 2. Find sections where this teacher is the class_teacher
        //    `class_teacher` stores the custom `id` of the teacher
        const sectionsResponse = await databases.listDocuments<SectionDocument>(
          APPWRITE_DATABASE_ID,
          SECTIONS_COLLECTION_ID,
          [Query.equal('class_teacher', teacher.id)] // teacher.id is the custom id
        );

        if (sectionsResponse.documents.length === 0) {
          set({ isClassTeacher: false, isInitializing: false, error: "Access Denied: You are not assigned as a class teacher to any section." });
          return;
        }
        
        const managedSections = sectionsResponse.documents.map(sec => ({
            id: sec.$id, // section document $id
            name: sec.name,
            className: sec.class,
        }));

        set({
          isClassTeacher: true,
          classTeacherInfo: {
            appwriteUserId: appwriteUser.$id,
            teacherCustomId: teacher.id,
            name: teacher.name,
            email: teacher.email,
            managedSections: managedSections,
          },
          isInitializing: false,
        });
      } catch (e: any) {
        console.error("Auth check error:", e);
        set({ isClassTeacher: false, isInitializing: false, error: e.message || "An error occurred during authentication." });
      }
    },

    setStudentSearchTerm: (term) => set({ studentSearchTerm: term }),

    searchStudents: async () => {
      const { classTeacherInfo, studentSearchTerm } = get();
      if (!classTeacherInfo || classTeacherInfo.managedSections.length === 0) {
        set({ searchedStudents: [], error: "Not authorized or no sections managed." });
        return;
      }
      if (!studentSearchTerm.trim()) {
        set({ searchedStudents: [] });
        return;
      }

      set({ isLoadingStudents: true, error: null });
      try {
        const sectionIds = classTeacherInfo.managedSections.map(s => s.id);
        const queries: string[] = [
            Query.equal('section', sectionIds), // Filter by sections class teacher manages
        ];
        // Add search query for student name - Appwrite search works on indexed string attributes
        // Assuming 'name' is indexed for search or using Query.search()
        // For more robust search, consider creating a dedicated search index or using functions.
        // Simple name search:
        if (studentSearchTerm.length > 0) {
             // Using `Query.search("name", studentSearchTerm)` might be better if 'name' is full-text indexed
             // For startsWith or contains, ensure 'name' is appropriately indexed for such queries.
             // Let's try a general search on 'name' which is common.
            queries.push(Query.search('name', studentSearchTerm));
        }


        const studentDocs = await databases.listDocuments<StudentDocument>(
          APPWRITE_DATABASE_ID,
          STUDENTS_COLLECTION_ID,
          queries
        );
        
        // Enhance student data with faculty and section names
        const studentsWithDetails: StudentWithDetails[] = await Promise.all(
          studentDocs.documents.map(async (student) => {
            let facultyName = 'N/A';
            let sectionName = 'N/A';

            if (student.facultyId) {
              try {
                const facultyDoc = await databases.getDocument<FacultyDocument>(
                  APPWRITE_DATABASE_ID,
                  FACULTIES_COLLECTION_ID,
                  student.facultyId
                );
                facultyName = facultyDoc.name;
              } catch (err) { console.warn(`Failed to fetch faculty ${student.facultyId}`, err); }
            }
            if (student.section) { // student.section is section $id
              try {
                const sectionDoc = await databases.getDocument<SectionDocument>(
                  APPWRITE_DATABASE_ID,
                  SECTIONS_COLLECTION_ID,
                  student.section
                );
                sectionName = sectionDoc.name;
              } catch (err) { console.warn(`Failed to fetch section ${student.section}`, err); }
            }
            return { ...student, facultyName, sectionName };
          })
        );

        set({ searchedStudents: studentsWithDetails, isLoadingStudents: false });
      } catch (e: any) {
        console.error("Student search error:", e);
        set({ searchedStudents: [], isLoadingStudents: false, error: e.message || "Failed to search students." });
      }
    },

    selectStudent: async (student) => {
      set({ selectedStudent: student, reviews: [], isLoadingReviews: false });
      if (student) {
        await get().actions.fetchReviewsForSelectedStudent();
      }
    },

    fetchReviewsForSelectedStudent: async () => {
      const { selectedStudent, classTeacherInfo } = get();
      if (!selectedStudent || !classTeacherInfo) return;

      set({ isLoadingReviews: true, error: null });
      try {
        const reviewDocs = await databases.listDocuments<ReviewDocument>(
          APPWRITE_DATABASE_ID,
          REVIEWS_COLLECTION_ID, // Ensure this is defined
          [
            Query.equal('studentId', selectedStudent.$id),
            // Query.equal('teacherId', classTeacherInfo.teacherCustomId), // Optionally filter by current teacher if needed
            Query.orderDesc('reviewDate') // Show newest first
          ]
        );
        set({ reviews: reviewDocs.documents, isLoadingReviews: false });
      } catch (e: any) {
        console.error("Fetch reviews error:", e);
        set({ reviews: [], isLoadingReviews: false, error: e.message || "Failed to fetch reviews." });
      }
    },

    openDrawer: (mode, review) => {
      set({ isDrawerOpen: true, drawerMode: mode, reviewToEdit: mode === 'edit' ? review : null, submitReviewError: null });
    },
    closeDrawer: () => {
      set({ isDrawerOpen: false, reviewToEdit: null });
    },

    submitReview: async (reviewData) => {
      const { classTeacherInfo, selectedStudent, drawerMode, reviewToEdit } = get();
      if (!classTeacherInfo || !selectedStudent) {
        set({ submitReviewError: "No teacher or student selected." });
        return false;
      }

      set({ isSubmittingReview: true, submitReviewError: null });

      const payload: Review = {
        ...reviewData,
        studentId: selectedStudent.$id,
        teacherId: classTeacherInfo.teacherCustomId, // Custom teacher ID
        sectionId: selectedStudent.section, // student.section is section $id
      };

      try {
        if (drawerMode === 'add') {
          await databases.createDocument(
            APPWRITE_DATABASE_ID,
            REVIEWS_COLLECTION_ID,
            ID.unique(),
            payload,
            // Permissions: Creator gets full control. Others in teacher's team/role might get read.
            // For simplicity, let's rely on collection-level read for other authorized teachers,
            // and document-level for creator.
            // [
            //   Permission.read(Role.user(classTeacherInfo.appwriteUserId)),
            //   Permission.update(Role.user(classTeacherInfo.appwriteUserId)),
            //   Permission.delete(Role.user(classTeacherInfo.appwriteUserId)),
            //   // Permission.read(Role.team('class-teachers-of-' + selectedStudent.section)) // Example more complex permission
            // ]
          );
        } else if (drawerMode === 'edit' && reviewToEdit) {
          await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            REVIEWS_COLLECTION_ID,
            reviewToEdit.$id,
            payload
          );
        }
        set({ isSubmittingReview: false, isDrawerOpen: false });
        await get().actions.fetchReviewsForSelectedStudent(); // Refresh list
        return true;
      } catch (e: any) {
        console.error("Submit review error:", e);
        set({ isSubmittingReview: false, submitReviewError: e.message || "Failed to submit review." });
        return false;
      }
    },

    openDeletePopover: (review) => {
      set({ isDeletePopoverOpen: true, reviewToDelete: review });
    },
    closeDeletePopover: () => {
      set({ isDeletePopoverOpen: false, reviewToDelete: null });
    },
    confirmDeleteReview: async () => {
      const { reviewToDelete } = get();
      if (!reviewToDelete) return false;

      set({ isDeletingReview: true });
      try {
        await databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          REVIEWS_COLLECTION_ID,
          reviewToDelete.$id
        );
        set({ isDeletingReview: false, isDeletePopoverOpen: false, reviewToDelete: null });
        await get().actions.fetchReviewsForSelectedStudent(); // Refresh list
        return true;
      } catch (e: any) {
        console.error("Delete review error:", e);
        set({ isDeletingReview: false, error: e.message || "Failed to delete review." });
        return false;
      }
    },
    clearErrors: () => set({ error: null, submitReviewError: null }),
  },
}));