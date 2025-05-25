// src/store/reviewStore.ts
import { create } from 'zustand';
import {
  ClassTeacherInfo,
  StudentWithDetails,
  ReviewDocument,
  TeacherDocument,
  SectionDocument,
  FacultyDocument,
} from 'types/review';
import {
  databases,
  Query,
  ID as AppwriteID,
  account,
  // getCurrentUserEmail, // classTeacherInfo.email is used
  APPWRITE_DATABASE_ID,
  TEACHERS_COLLECTION_ID,
  SECTIONS_COLLECTION_ID,
  STUDENTS_COLLECTION_ID,
  FACULTIES_COLLECTION_ID,
  REVIEWS_COLLECTION_ID,
} from '~/utils/appwrite';
import { createNotificationEntry, getTomorrowDateString, NotificationData } from '~/utils/notification';

type ReviewFormData = {
  type: string;
  description: string;
  rating?: string;
  reviewDate: string; // AD Date string (YYYY-MM-DD)
};


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
    selectStudent: (student: StudentWithDetails | null) => Promise<void>;
    fetchReviewsForSelectedStudent: () => Promise<void>;

    openDrawer: (mode: 'add' | 'edit', review?: ReviewDocument) => void;
    closeDrawer: () => void;
    // submitReview: (reviewData: Omit<ReviewDocument, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions' | 'teacherId' | 'studentId' | 'sectionId'>) => Promise<boolean>;
    submitReview: (reviewData: ReviewFormData) => Promise<boolean>; // Updated type
    openDeletePopover: (review: ReviewDocument) => void;
    closeDeletePopover: () => void;
    confirmDeleteReview: () => Promise<boolean>;
    
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
        set({ isInitializing: true, error: null, submitReviewError: null });
        try {
          // const userEmail = await getCurrentUserEmail(); // Using classTeacherInfo.email instead after fetching teacher
          const appwriteUser = await account.get(); // Get current Appwrite user
          
          // Find teacher by email (current Appwrite user's email)
          const teacherResponse = await databases.listDocuments<TeacherDocument>(
            APPWRITE_DATABASE_ID,
            TEACHERS_COLLECTION_ID,
            [Query.equal('email', appwriteUser.email), Query.limit(1)]
          );
  
          if (teacherResponse.documents.length === 0) {
            set({ isClassTeacher: false, isInitializing: false, error: "Access Denied: You are not registered as a teacher." });
            return;
          }
          const teacher = teacherResponse.documents[0];
  
          const sectionsResponse = await databases.listDocuments<SectionDocument>(
            APPWRITE_DATABASE_ID,
            SECTIONS_COLLECTION_ID,
            [Query.equal('class_teacher', teacher.id)] 
          );
  
          if (sectionsResponse.documents.length === 0) {
            set({ isClassTeacher: false, isInitializing: false, error: "Access Denied: You are not assigned as a class teacher to any section." });
            return;
          }
          
          const managedSectionsData = sectionsResponse.documents.map(sec => ({
              id: sec.$id,
              name: sec.name,
              className: sec.class,
              facultyId: sec.facultyId, 
          }));
  
          const uniqueFacultyCustomIds = [...new Set(managedSectionsData.map(sec => sec.facultyId).filter(Boolean))];
          let managedFacultiesData: Array<{ id: string; name: string }> = [];
  
          if (uniqueFacultyCustomIds.length > 0) {
              const facultyDocsPromises = uniqueFacultyCustomIds.map(customFid => 
                  databases.listDocuments<FacultyDocument>(
                      APPWRITE_DATABASE_ID, 
                      FACULTIES_COLLECTION_ID, 
                      [Query.equal('id', customFid), Query.limit(1)]
                  )
              );
              const facultyResults = await Promise.all(facultyDocsPromises);
              managedFacultiesData = facultyResults.flatMap(res => 
                  res.documents.length > 0 ? [{ id: res.documents[0].id, name: res.documents[0].name }] : []
              ).filter(f => f.id && f.name);
          }
          
          set({
            isClassTeacher: true,
            classTeacherInfo: {
              appwriteUserId: appwriteUser.$id,
              teacherCustomId: teacher.id,
              name: teacher.name,
              email: teacher.email, // Storing teacher's email for notification sender
              managedSections: managedSectionsData,
              managedFaculties: managedFacultiesData,
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
      set({ error: null }); 
      
      if (!classTeacherInfo || classTeacherInfo.managedSections.length === 0) {
        set({ searchedStudents: [], isLoadingStudents: false, error: "Not authorized or no sections managed." });
        return;
      }
      
      const trimmedSearchTerm = studentSearchTerm.trim();
      if (!trimmedSearchTerm) {
        set({ searchedStudents: [], selectedStudent: null, isLoadingStudents: false });
        return;
      }

      set({ isLoadingStudents: true });
      try {
        const managedClassNames = [...new Set(classTeacherInfo.managedSections.map(s => s.className))];
        const managedFacultyIds = [...new Set(classTeacherInfo.managedSections.map(s => s.facultyId).filter(Boolean))]; // Filter out undefined/null facultyIds
        const managedSectionNames = classTeacherInfo.managedSections.map(s => s.name);

        const studentQueries: string[] = [
            Query.equal('class', managedClassNames),
            // Only add facultyId query if there are managed faculty IDs
            ...(managedFacultyIds.length > 0 ? [Query.equal('facultyId', managedFacultyIds)] : []),
            Query.search('name', trimmedSearchTerm)
        ];

        const studentDocsResponse = await databases.listDocuments<StudentDocument>(
          APPWRITE_DATABASE_ID,
          STUDENTS_COLLECTION_ID,
          studentQueries
        );
        
        const filteredStudentsBySectionName = studentDocsResponse.documents.filter(student => {
            return managedSectionNames.includes(student.section); // student.section is name
        });
        
        const studentsWithDetails: StudentWithDetails[] = await Promise.all(
          filteredStudentsBySectionName.map(async (student) => {
            let facultyName = 'N/A';
            if (student.facultyId) {
              try {
                const facultyResponse = await databases.listDocuments<FacultyDocument>(
                  APPWRITE_DATABASE_ID,
                  FACULTIES_COLLECTION_ID,
                  [Query.equal('id', student.facultyId), Query.limit(1)]
                );
                if (facultyResponse.documents.length > 0) {
                  facultyName = facultyResponse.documents[0].name;
                } else {
                  facultyName = `ID ${student.facultyId} (Not Found)`;
                }
              } catch (err) { 
                facultyName = 'Error fetching faculty';
              }
            }
            return { ...student, facultyName, sectionName: student.section };
          })
        );
        
        set({ searchedStudents: studentsWithDetails, isLoadingStudents: false });

      } catch (e: any) {
        console.error("Student search error in store:", e);
        set({ 
            searchedStudents: [], 
            isLoadingStudents: false, 
            error: e.message || "Failed to search students. Please check console for details." 
        });
      }
    },

    selectStudent: async (student) => {
      set({ selectedStudent: student, reviews: [], isLoadingReviews: false, error: null });
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
          REVIEWS_COLLECTION_ID,
          [
            Query.equal('studentId', selectedStudent.$id),
            Query.orderDesc('reviewDate')
          ]
        );
        set({ reviews: reviewDocs.documents, isLoadingReviews: false });
      } catch (e: any) {
        console.error("Fetch reviews error:", e);
        set({ reviews: [], isLoadingReviews: false, error: e.message || "Failed to fetch reviews." });
      }
    },

    openDrawer: (mode, review) => {
      set({ 
        isDrawerOpen: true, 
        drawerMode: mode, 
        reviewToEdit: mode === 'edit' ? review : null, 
        submitReviewError: null
      });
    },
    closeDrawer: () => {
      set({ isDrawerOpen: false, reviewToEdit: null, submitReviewError: null });
    },

    submitReview: async (reviewDataFromForm) => { // reviewDataFromForm now contains AD date
      const { classTeacherInfo, selectedStudent, drawerMode, reviewToEdit } = get();
      if (!classTeacherInfo || !selectedStudent) {
        set({ submitReviewError: "Critical error: Teacher or student context lost." });
        return false;
      }

      set({ isSubmittingReview: true, submitReviewError: null });

      let studentSectionDocId: string | undefined = undefined;
      // ... (logic to find studentSectionDocId remains the same)
      if (selectedStudent.section && selectedStudent.class && selectedStudent.facultyId) {
          const targetSection = classTeacherInfo.managedSections.find(
              ms => ms.name === selectedStudent.section &&
                    ms.className === selectedStudent.class &&
                    ms.facultyId === selectedStudent.facultyId
          );
          if (targetSection) {
              studentSectionDocId = targetSection.id;
          }
      }
      
      if (!studentSectionDocId) {
        console.error(
            "SubmitReview Error: Could not determine the Section Document ID for the student's section.",
            "Student's details:", { name: selectedStudent.section, class: selectedStudent.class, facultyId: selectedStudent.facultyId }
        );
        set({ 
            isSubmittingReview: false, 
            submitReviewError: "Could not link review to a specific section document. Student's section details might be ambiguous or not managed by you." 
        });
        return false;
      }


      // reviewDataFromForm has: type, description, rating, reviewDate (AD format)
      // academicYear is removed
      const dbReviewPayload = {
        ...reviewDataFromForm,
        studentId: selectedStudent.$id,
        teacherId: classTeacherInfo.teacherCustomId,
        sectionId: studentSectionDocId,
      };

      try {
        let createdOrUpdatedReviewDocument: ReviewDocument | null = null;

        if (drawerMode === 'add') {
          createdOrUpdatedReviewDocument = await databases.createDocument<ReviewDocument>(
            APPWRITE_DATABASE_ID,
            REVIEWS_COLLECTION_ID,
            AppwriteID.unique(),
            dbReviewPayload
          );
        } else if (drawerMode === 'edit' && reviewToEdit) {
          createdOrUpdatedReviewDocument = await databases.updateDocument<ReviewDocument>(
            APPWRITE_DATABASE_ID,
            REVIEWS_COLLECTION_ID,
            reviewToEdit.$id,
            dbReviewPayload 
          );
        }
        
        set({ isSubmittingReview: false, isDrawerOpen: false, reviewToEdit: null });
        await get().actions.fetchReviewsForSelectedStudent();

        if (drawerMode === 'add' && createdOrUpdatedReviewDocument) {
          try {
            const senderEmail = classTeacherInfo.email; 
            if (!senderEmail) {
                console.warn("Notification not sent: Sender email (teacher's email) could not be determined from classTeacherInfo.");
            } else {
                const notificationPayload: NotificationData = {
                    title: `New Review Added for ${selectedStudent.name}`,
                    // Use reviewDataFromForm.reviewDate which is AD
                    msg: `A new performance review for "${reviewDataFromForm.type}" has been added for ${selectedStudent.name} by teacher ${classTeacherInfo.name}. Review Date: ${new Date(reviewDataFromForm.reviewDate).toLocaleDateString()}.`,
                    to: [`id:${selectedStudent.$id}`], 
                    valid: getTomorrowDateString(),
                    sender: senderEmail,
                };
                await createNotificationEntry(notificationPayload);
                console.log("Notification scheduled successfully for new review.");
            }
          } catch (notificationError) {
            console.error("Failed to send notification for new review:", notificationError);
          }
        }
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
        await get().actions.fetchReviewsForSelectedStudent();
        return true;
      } catch (e: any) {
        console.error("Delete review error:", e);
        set({ 
            isDeletingReview: false, 
            error: e.message || "Failed to delete review." 
        });
        return false;
      }
    },
    clearErrors: () => set({ error: null, submitReviewError: null }),
  },
}));