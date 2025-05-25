// src/store/adminReviewStore.ts (NEW FILE)
import { create } from 'zustand';
import {
  FacultyDocument,
  SectionDocument,
  StudentWithDetails, // Re-use from previous type definitions
  ReviewDocument,
  // TeacherDocument, // Only needed if displaying specific teacher info for review, can be fetched on demand
} from 'types/review';
import {
  databases,
  Query,
  ID as AppwriteID,
  account, // For getting admin's email if needed for "sender" in notifications
  APPWRITE_DATABASE_ID,
  FACULTIES_COLLECTION_ID,
  SECTIONS_COLLECTION_ID,
  STUDENTS_COLLECTION_ID,
  REVIEWS_COLLECTION_ID,
  TEACHERS_COLLECTION_ID, // For fetching teacher name for review display
} from '~/utils/appwrite';
import { createNotificationEntry, getTomorrowDateString, NotificationData } from '~/utils/notification'; // For notifications

// Re-using ReviewWithDetails from studentSelfReviewStore or define here
export interface AdminReviewWithDetails extends ReviewDocument {
  teacherName?: string; // Name of the teacher who gave the review
  // sectionName is already part of ReviewDocument if sectionId is stored, can be resolved
}

// Type for the data passed from ReviewForm to submitReview action
type ReviewFormData = {
    type: string;
    description: string;
    rating?: string;
    reviewDate: string; // AD Date string (YYYY-MM-DD)
    // teacherId will be set by admin if they are adding, or use existing if editing
    // For admin adding, we might need a way to select a teacher or assign it to a generic "Admin"
};


interface AdminReviewState {
  // Filters
  faculties: FacultyDocument[];
  selectedFacultyId: string | null;
  classesForFaculty: string[]; // Unique class names for the selected faculty
  selectedClass: string | null;
  sectionsForClass: SectionDocument[];
  selectedSectionId: string | null; // $id of the section
  
  // Student Search & List
  studentSearchTerm: string;
  students: StudentWithDetails[];
  selectedStudent: StudentWithDetails | null;
  
  // Reviews
  reviews: AdminReviewWithDetails[];
  
  // UI & Loading States
  isLoadingFilters: boolean; // For faculties, classes, sections
  isLoadingStudents: boolean;
  isLoadingReviews: boolean;
  isDrawerOpen: boolean;
  drawerMode: 'add' | 'edit';
  reviewToEdit: AdminReviewWithDetails | null;
  isSubmittingReview: boolean;
  isDeletePopoverOpen: boolean;
  reviewToDelete: AdminReviewWithDetails | null;
  isDeletingReview: boolean;
  
  // Errors
  filterError: string | null;
  studentError: string | null;
  reviewError: string | null;
  submitReviewError: string | null;

  adminEmail: string | null; // To store admin's email for notifications

  actions: {
    initializeAdminPage: () => Promise<void>; // Fetches initial data like faculties & admin email
    
    // Filter actions
    selectFaculty: (facultyId: string | null) => Promise<void>;
    selectClass: (className: string | null) => Promise<void>;
    selectSection: (sectionId: string | null) => Promise<void>; // Takes section $id
    
    // Student actions
    setStudentSearchTerm: (term: string) => void;
    fetchStudents: () => Promise<void>; // Fetches based on current filters & search term
    selectStudent: (student: StudentWithDetails | null) => Promise<void>;
    
    // Review actions
    fetchReviewsForSelectedStudent: () => Promise<void>;
    openReviewDrawer: (mode: 'add' | 'edit', review?: AdminReviewWithDetails) => void;
    closeReviewDrawer: () => void;
    submitReview: (reviewData: ReviewFormData, teacherCustomIdForNewReview?: string) => Promise<boolean>; // teacherId needed for new reviews by admin
    openDeletePopover: (review: AdminReviewWithDetails) => void;
    closeDeletePopover: () => void;
    confirmDeleteReview: () => Promise<boolean>;
    
    clearAllErrors: () => void;
  };
}

export const useAdminReviewStore = create<AdminReviewState>((set, get) => ({
  faculties: [],
  selectedFacultyId: null,
  classesForFaculty: [],
  selectedClass: null,
  sectionsForClass: [],
  selectedSectionId: null,
  studentSearchTerm: '',
  students: [],
  selectedStudent: null,
  reviews: [],
  isLoadingFilters: true,
  isLoadingStudents: false,
  isLoadingReviews: false,
  isDrawerOpen: false,
  drawerMode: 'add',
  reviewToEdit: null,
  isSubmittingReview: false,
  isDeletePopoverOpen: false,
  reviewToDelete: null,
  isDeletingReview: false,
  filterError: null,
  studentError: null,
  reviewError: null,
  submitReviewError: null,
  adminEmail: null,

  actions: {
    initializeAdminPage: async () => {
        set({ isLoadingFilters: true, filterError: null });
        try {
            const adminUser = await account.get();
            set({ adminEmail: adminUser.email });

            const facultyResponse = await databases.listDocuments<FacultyDocument>(
                APPWRITE_DATABASE_ID,
                FACULTIES_COLLECTION_ID,
                [Query.orderAsc('name')]
            );
            set({ faculties: facultyResponse.documents, isLoadingFilters: false });
        } catch (error: any) {
            console.error("Error initializing admin page:", error);
            set({ isLoadingFilters: false, filterError: "Failed to load initial filter data." });
        }
    },

    selectFaculty: async (facultyId) => {
        set({ 
            selectedFacultyId: facultyId, 
            selectedClass: null, 
            classesForFaculty: [], 
            selectedSectionId: null, 
            sectionsForClass: [],
            students: [], selectedStudent: null, reviews: [], // Clear downstream selections
            isLoadingFilters: true, filterError: null 
        });
        if (facultyId) {
            try {
                // In coll-faculty, classes[] stores class names. We just need the names.
                // For simplicity, we assume the faculty document directly has the class names.
                // If 'classes' is an array of IDs referring to another collection, this needs adjustment.
                const facultyDoc = await databases.getDocument<FacultyDocument>(
                    APPWRITE_DATABASE_ID,
                    FACULTIES_COLLECTION_ID,
                    facultyId
                );
                // Assuming facultyDoc.classes is string[] of class names like ["1", "2", "Nursery"]
                const uniqueClasses = facultyDoc.classes ? [...new Set(facultyDoc.classes)].sort() : [];
                set({ classesForFaculty: uniqueClasses, isLoadingFilters: false });
            } catch (error: any) {
                console.error("Error fetching classes for faculty:", error);
                set({ isLoadingFilters: false, filterError: "Failed to load classes for selected faculty." });
            }
        } else {
            set({ isLoadingFilters: false }); // No faculty selected, nothing to load
        }
        await get().actions.fetchStudents(); // Fetch students based on new faculty selection (or lack thereof)
    },

    selectClass: async (className) => {
        // ... (existing logic for setting selectedClass, clearing section, fetching sections)
        set({ 
            selectedClass: className, 
            selectedSectionId: null, // $id of section
            sectionsForClass: [],
            students: [], selectedStudent: null, reviews: [],
            isLoadingFilters: !!className, 
            filterError: null 
        });
        const { selectedFacultyId } = get();

        if (className && selectedFacultyId) {
            // ... (fetch sectionsForClass as before, these are SectionDocument[])
            try {
                const sectionResponse = await databases.listDocuments<SectionDocument>(
                    APPWRITE_DATABASE_ID,
                    SECTIONS_COLLECTION_ID,
                    [
                        Query.equal('facultyId', selectedFacultyId),
                        Query.equal('class', className),
                        Query.orderAsc('name')
                    ]
                );
                set({ sectionsForClass: sectionResponse.documents, isLoadingFilters: false });
            } catch (error: any) { /* ... error handling ... */ }
        } else {
             set({ isLoadingFilters: false });
        }
        // Call fetchStudents, it will use the new state
        await get().actions.fetchStudents(); 
    },

    selectSection: async (sectionDocId: string | null) => { // This receives the SECTION DOCUMENT $ID
        set({ 
            selectedSectionId: sectionDocId, // Store the $id
            students: [], selectedStudent: null, reviews: [], 
        });
        await get().actions.fetchStudents();
    },

    setStudentSearchTerm: (term) => {
        set({ studentSearchTerm: term });
        // Optionally trigger debounced search here if desired, or rely on a search button
    },

    fetchStudents: async () => {
        const { selectedFacultyId, selectedClass, selectedSectionId, studentSearchTerm, sectionsForClass } = get();
        
        const hasFiltersOtherThanSectionName = selectedFacultyId || selectedClass;
        const hasSearchTerm = studentSearchTerm.trim() !== '';
        let selectedSectionName: string | undefined = undefined;

        if (selectedSectionId) { // If a section $id is selected
            const foundSection = sectionsForClass.find(s => s.$id === selectedSectionId);
            if (foundSection) {
                selectedSectionName = foundSection.name;
            } else {
                console.warn(`Could not find section name for selectedSectionId: ${selectedSectionId}. Section filter might not work correctly.`);
                // Proceed without section name filter or show an error? For now, proceed without.
            }
        }
        
        // Only fetch if at least one filter (faculty, class, or a resolved section NAME) is applied OR if there's a search term.
        if (!hasFiltersOtherThanSectionName && !selectedSectionName && !hasSearchTerm) {
            set({ students: [], selectedStudent: null, reviews: [], isLoadingStudents: false, studentError: null });
            return;
        }

        set({ isLoadingStudents: true, studentError: null, selectedStudent: null, reviews: [] });

        const queries: string[] = [];
        if (selectedFacultyId) queries.push(Query.equal('facultyId', selectedFacultyId)); // student.facultyId is custom ID
        if (selectedClass) queries.push(Query.equal('class', selectedClass));       // student.class is name
        
        // CORRECTED SECTION FILTERING:
        if (selectedSectionName) {
            queries.push(Query.equal('section', selectedSectionName)); // student.section is NAME
        }
        
        if (hasSearchTerm) {
            queries.push(Query.search('name', studentSearchTerm.trim()));
        }
        queries.push(Query.orderAsc('name'));
        // queries.push(Query.limit(50)); // Consider for performance

        console.log("Admin FetchStudents: Executing with queries:", queries);

        try {
            const studentDocs = await databases.listDocuments<StudentDocument>(
                APPWRITE_DATABASE_ID,
                STUDENTS_COLLECTION_ID,
                queries 
            );
            
            const studentsWithDetails: StudentWithDetails[] = await Promise.all( /* ... same enhancement logic ... */ 
                studentDocs.documents.map(async (student) => {
                  let facultyName = 'N/A';
                  let currentStudentSectionName = student.section; // student.section is already the name
      
                  if (student.facultyId) {
                    try {
                      const facultyDoc = await databases.listDocuments<FacultyDocument>(
                        APPWRITE_DATABASE_ID, FACULTIES_COLLECTION_ID,
                        [Query.equal('id', student.facultyId), Query.limit(1)]
                      );
                      if (facultyDoc.documents.length > 0) facultyName = facultyDoc.documents[0].name;
                    } catch (err) { /* console.warn */ }
                  }
                  // No need to fetch section name again for display if student.section is the name
                  return { ...student, facultyName, sectionName: currentStudentSectionName };
                })
              );

            set({ students: studentsWithDetails, isLoadingStudents: false });
        } catch (error: any) {
            console.error("Error fetching students:", error);
            set({ isLoadingStudents: false, studentError: "Failed to load students based on criteria." });
        }
    },


    selectStudent: async (student) => {
        set({ selectedStudent: student, reviews: [], reviewError: null });
        if (student) {
            await get().actions.fetchReviewsForSelectedStudent();
        }
    },

    fetchReviewsForSelectedStudent: async () => {
        const { selectedStudent } = get();
        if (!selectedStudent) return;
        set({ isLoadingReviews: true, reviewError: null });
        try {
            const reviewDocs = await databases.listDocuments<ReviewDocument>(
                APPWRITE_DATABASE_ID,
                REVIEWS_COLLECTION_ID,
                [Query.equal('studentId', selectedStudent.$id), Query.orderDesc('reviewDate')]
            );

            const reviewsWithDetails: AdminReviewWithDetails[] = await Promise.all(
                reviewDocs.documents.map(async (review) => {
                  let teacherName = 'N/A';
                  if (review.teacherId) { // teacherId is custom ID
                    try {
                      const teacherRes = await databases.listDocuments<TeacherDocument>(
                          APPWRITE_DATABASE_ID, TEACHERS_COLLECTION_ID,
                          [Query.equal('id', review.teacherId), Query.limit(1)]
                      );
                      if(teacherRes.documents.length > 0) teacherName = teacherRes.documents[0].name;
                    } catch (e) { console.warn(`Failed to fetch teacher ${review.teacherId}`, e); }
                  }
                  return { ...review, teacherName };
                })
              );
            set({ reviews: reviewsWithDetails, isLoadingReviews: false });
        } catch (error: any) {
            console.error("Error fetching reviews:", error);
            set({ isLoadingReviews: false, reviewError: "Failed to load reviews for the selected student." });
        }
    },

    openReviewDrawer: (mode, review) => {
        set({ isDrawerOpen: true, drawerMode: mode, reviewToEdit: mode === 'edit' ? review : null, submitReviewError: null });
    },
    closeReviewDrawer: () => {
        set({ isDrawerOpen: false, reviewToEdit: null, submitReviewError: null });
    },

    submitReview: async (reviewDataFromForm, teacherCustomIdForNewReview) => {
        const { selectedStudent, drawerMode, reviewToEdit, adminEmail, sectionsForClass, selectedClass, selectedFacultyId } = get(); // Added sectionsForClass, selectedClass, selectedFacultyId
        if (!selectedStudent) { /* ... error ... */ return false; }
        
        // Determine sectionId for the review document (MUST BE $ID)
        let reviewSectionDocId: string | undefined;

        // If student.section is the name, we need to find the corresponding section document's $id
        // selectedStudent.section contains the name of the section the student is in.
        // selectedStudent.class contains the class name.
        // selectedStudent.facultyId contains the custom faculty ID.
        // We need to find a section document that matches these to get its $id for the review.

        // Try to find the section from the already fetched sectionsForClass (if class filter is active)
        if (selectedStudent.section && selectedClass && selectedStudent.class === selectedClass) {
            const sectionInCurrentList = sectionsForClass.find(s => s.name === selectedStudent.section && s.class === selectedStudent.class && s.facultyId === selectedStudent.facultyId);
            if (sectionInCurrentList) {
                reviewSectionDocId = sectionInCurrentList.$id;
            }
        }

        // If not found in current list (e.g., no class filter, or student from different class shown due to search)
        // We MUST query to get the section $id based on student's section name, class, and faculty.
        if (!reviewSectionDocId && selectedStudent.section && selectedStudent.class && selectedStudent.facultyId) {
            console.log(`Admin submitReview: Attempting to find section $id for student's section: ${selectedStudent.section}, class: ${selectedStudent.class}, faculty: ${selectedStudent.facultyId}`);
            try {
                const sectionQuery = await databases.listDocuments<SectionDocument>(
                    APPWRITE_DATABASE_ID,
                    SECTIONS_COLLECTION_ID,
                    [
                        Query.equal("name", selectedStudent.section),
                        Query.equal("class", selectedStudent.class),
                        Query.equal("facultyId", selectedStudent.facultyId), // student.facultyId is custom ID
                        Query.limit(1)
                    ]
                );
                if (sectionQuery.documents.length > 0) {
                    reviewSectionDocId = sectionQuery.documents[0].$id;
                    console.log("Admin submitReview: Found section $id:", reviewSectionDocId);
                } else {
                     console.warn("Admin submitReview: Could not find matching section document for student's section details.");
                }
            } catch (e) {
                console.error("Admin submitReview: Error querying for section $id:", e);
            }
        }
        
        if (!reviewSectionDocId) {
            set({ isSubmittingReview: false, submitReviewError: "Could not determine the specific section document for this student's review. Please ensure student data is accurate." });
            return false;
        }

        // ... (rest of submitReview logic using reviewSectionDocId for dbReviewPayload.sectionId)
        let finalTeacherId: string | undefined;
        // ... (determine finalTeacherId as before) ...
        if (drawerMode === 'add') {
            if (!teacherCustomIdForNewReview) {
                 set({ submitReviewError: "Teacher must be specified for new reviews added by admin." });
                 return false;
            }
            finalTeacherId = teacherCustomIdForNewReview;
        } else if (reviewToEdit) {
            finalTeacherId = reviewToEdit.teacherId;
        }

        if (!finalTeacherId) {
            set({ submitReviewError: "Teacher ID could not be determined for the review." });
            return false;
        }


        set({ isSubmittingReview: true, submitReviewError: null });
        const dbReviewPayload = {
            ...reviewDataFromForm,
            studentId: selectedStudent.$id,
            teacherId: finalTeacherId, 
            sectionId: reviewSectionDocId, // Use the resolved section DOCUMENT $ID
        };
        // ... (try/catch for creating/updating document and notification) ...
        try {
            let createdOrUpdatedReviewDoc: ReviewDocument | null = null;
            if (drawerMode === 'add') {
                createdOrUpdatedReviewDoc = await databases.createDocument<ReviewDocument>(
                    APPWRITE_DATABASE_ID, REVIEWS_COLLECTION_ID, AppwriteID.unique(), dbReviewPayload
                );
            } else if (reviewToEdit) {
                createdOrUpdatedReviewDoc = await databases.updateDocument<ReviewDocument>(
                    APPWRITE_DATABASE_ID, REVIEWS_COLLECTION_ID, reviewToEdit.$id, dbReviewPayload
                );
            }

            set({ isSubmittingReview: false, isDrawerOpen: false, reviewToEdit: null });
            await get().actions.fetchReviewsForSelectedStudent(); 

            if (drawerMode === 'add' && createdOrUpdatedReviewDoc && adminEmail) {
                try {
                    const notificationPayload: NotificationData = {
                        title: `New Review Added by Admin for ${selectedStudent.name}`,
                        msg: `A new performance review for "${reviewDataFromForm.type}" has been added for ${selectedStudent.name} by an Administrator. Review Date: ${new Date(reviewDataFromForm.reviewDate).toLocaleDateString()}.`,
                        to: [`id:${selectedStudent.id}`], 
                        valid: getTomorrowDateString(),
                        sender: adminEmail,
                    };
                    await createNotificationEntry(notificationPayload);
                } catch (notificationError) {
                    console.error("Admin: Failed to send notification for new review:", notificationError);
                }
            }
            return true;
        } catch (error: any) {
            console.error("Admin: Submit review error:", error);
            set({ isSubmittingReview: false, submitReviewError: error.message || "Failed to submit review." });
            return false;
        }

    },

    openDeletePopover: (review) => set({ isDeletePopoverOpen: true, reviewToDelete: review }),
    closeDeletePopover: () => set({ isDeletePopoverOpen: false, reviewToDelete: null }),
    confirmDeleteReview: async () => {
        const { reviewToDelete } = get();
        if (!reviewToDelete) return false;
        set({ isDeletingReview: true });
        try {
            await databases.deleteDocument(APPWRITE_DATABASE_ID, REVIEWS_COLLECTION_ID, reviewToDelete.$id);
            set({ isDeletingReview: false, isDeletePopoverOpen: false, reviewToDelete: null });
            await get().actions.fetchReviewsForSelectedStudent(); // Refresh
            return true;
        } catch (error: any) {
            console.error("Admin: Delete review error:", error);
            set({ isDeletingReview: false, reviewError: error.message || "Failed to delete review." });
            return false;
        }
    },
    clearAllErrors: () => set({ filterError: null, studentError: null, reviewError: null, submitReviewError: null}),
  }
}));