// src/store/parentStudentReviewStore.ts (NEW FILE)
import { create } from 'zustand';
import { ReviewDocument, TeacherDocument, SectionDocument } from 'types/review'; // StudentDocument not directly stored here
import { databases, Query, APPWRITE_DATABASE_ID, REVIEWS_COLLECTION_ID, TEACHERS_COLLECTION_ID, SECTIONS_COLLECTION_ID } from '~/utils/appwrite';

// Re-using ReviewWithDetails from studentSelfReviewStore, or define it here if preferred
export interface ReviewWithDetails extends ReviewDocument {
  teacherName?: string;
  sectionName?: string; // Section name from the review's sectionId
}

interface ParentStudentReviewState {
  isLoadingReviews: boolean;
  reviewsError: string | null;
  reviewsForSelectedStudent: ReviewWithDetails[];
  currentFetchingStudentId: string | null; // To avoid redundant fetches for the same student
  
  actions: {
    fetchReviewsForStudent: (studentId: string | null) => Promise<void>;
    clearReviews: () => void;
  };
}

export const useParentStudentReviewStore = create<ParentStudentReviewState>((set, get) => ({
  isLoadingReviews: false,
  reviewsError: null,
  reviewsForSelectedStudent: [],
  currentFetchingStudentId: null,

  actions: {
    fetchReviewsForStudent: async (studentId: string | null) => {
      if (!studentId) {
        set({ reviewsForSelectedStudent: [], isLoadingReviews: false, reviewsError: null, currentFetchingStudentId: null });
        return;
      }
      
      // Avoid re-fetching if already loading for this student or data is current
      if (get().isLoadingReviews && get().currentFetchingStudentId === studentId) return;
      // If reviews are already loaded for this student and not forcing a refresh, can also return early
      // For simplicity, we'll fetch unless isLoading. Add more sophisticated caching if needed.


      set({ isLoadingReviews: true, reviewsError: null, currentFetchingStudentId: studentId });
      try {
        console.log(`Parent View: Fetching reviews for student ID: ${studentId}`);
        const reviewDocs = await databases.listDocuments<ReviewDocument>(
          APPWRITE_DATABASE_ID,
          REVIEWS_COLLECTION_ID,
          [
            Query.equal('studentId', studentId), // Filter reviews by selected student's document ID
            Query.orderDesc('reviewDate')
          ]
        );
        console.log(`Parent View: Found ${reviewDocs.total} reviews for student ${studentId}`);

        const reviewsWithDetails: ReviewWithDetails[] = await Promise.all(
          reviewDocs.documents.map(async (review) => {
            let teacherName = 'N/A';
            let sectionNameAtReviewTime = 'N/A';

            if (review.teacherId) { // custom 'id' from coll-teacher
              try {
                const teacherRes = await databases.listDocuments<TeacherDocument>(
                    APPWRITE_DATABASE_ID,
                    TEACHERS_COLLECTION_ID,
                    [Query.equal('id', review.teacherId), Query.limit(1)]
                );
                if(teacherRes.documents.length > 0) {
                    teacherName = teacherRes.documents[0].name;
                }
              } catch (e) { console.warn(`Failed to fetch teacher ${review.teacherId}`, e); }
            }

            if (review.sectionId) { // document $id from coll-section
                try {
                    const sectionDoc = await databases.getDocument<SectionDocument>(
                        APPWRITE_DATABASE_ID,
                        SECTIONS_COLLECTION_ID,
                        review.sectionId
                    );
                    sectionNameAtReviewTime = sectionDoc.name;
                } catch (e) { console.warn(`Failed to fetch section ${review.sectionId}`, e); }
            }
            return { ...review, teacherName, sectionName: sectionNameAtReviewTime };
          })
        );

        set({ reviewsForSelectedStudent: reviewsWithDetails, isLoadingReviews: false, reviewsError: null, currentFetchingStudentId: studentId });

      } catch (err: any) {
        console.error("Parent View: Error fetching student reviews:", err);
        set({ isLoadingReviews: false, reviewsError: err.message || "An error occurred while fetching reviews.", reviewsForSelectedStudent: [] });
      }
    },
    clearReviews: () => {
        set({ reviewsForSelectedStudent: [], isLoadingReviews: false, reviewsError: null, currentFetchingStudentId: null });
    }
  },
}));