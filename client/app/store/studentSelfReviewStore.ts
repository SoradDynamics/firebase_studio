// src/store/studentSelfReviewStore.ts
import { create } from 'zustand';
import { ReviewDocument, StudentDocument, TeacherDocument, SectionDocument } from 'types/review';
import { databases, Query, account, APPWRITE_DATABASE_ID, STUDENTS_COLLECTION_ID, REVIEWS_COLLECTION_ID, TEACHERS_COLLECTION_ID, SECTIONS_COLLECTION_ID } from '~/utils/appwrite';

export interface ReviewWithDetails extends ReviewDocument {
  teacherName?: string;
  sectionName?: string;
}

interface StudentSelfReviewState {
  isLoading: boolean;
  error: string | null;
  studentProfile: StudentDocument | null;
  reviews: ReviewWithDetails[];
  
  actions: {
    fetchStudentReviews: () => Promise<void>;
  };
}

export const useStudentSelfReviewStore = create<StudentSelfReviewState>((set, get) => ({
  isLoading: true,
  error: null,
  studentProfile: null,
  reviews: [],

  actions: {
    fetchStudentReviews: async () => {
      set({ isLoading: true, error: null });
      try {
        const appwriteUser = await account.get(); // Get logged-in Appwrite user

        // 1. Find the student document linked to this Appwrite user's email
        //    USING 'stdEmail' from coll-student to match appwriteUser.email
        console.log(`Fetching student profile for email: ${appwriteUser.email}`);
        const studentResponse = await databases.listDocuments<StudentDocument>(
          APPWRITE_DATABASE_ID,
          STUDENTS_COLLECTION_ID,
          [Query.equal('stdEmail', appwriteUser.email), Query.limit(1)] // Corrected query
        );

        if (studentResponse.documents.length === 0) {
          console.warn(`No student profile found for email: ${appwriteUser.email}`);
          set({ isLoading: false, error: "Your student profile could not be found with the logged-in email. Please contact administration.", studentProfile: null, reviews: [] });
          return;
        }
        const studentDoc = studentResponse.documents[0];
        console.log("Student profile found:", studentDoc);
        set({ studentProfile: studentDoc });

        // 2. Fetch reviews for this student (studentDoc.$id)
        console.log(`Fetching reviews for student ID: ${studentDoc.$id}`);
        const reviewDocs = await databases.listDocuments<ReviewDocument>(
          APPWRITE_DATABASE_ID,
          REVIEWS_COLLECTION_ID,
          [
            Query.equal('studentId', studentDoc.$id),
            Query.orderDesc('reviewDate')
          ]
        );
        console.log(`Found ${reviewDocs.total} reviews for student ${studentDoc.$id}`);

        // 3. Enhance reviews with teacher and section names
        const reviewsWithDetails: ReviewWithDetails[] = await Promise.all(
          reviewDocs.documents.map(async (review) => {
            let teacherName = 'N/A';
            let sectionNameAtReviewTime = 'N/A';

            if (review.teacherId) { // teacherId is custom 'id' from coll-teacher
              try {
                const teacherRes = await databases.listDocuments<TeacherDocument>(
                    APPWRITE_DATABASE_ID,
                    TEACHERS_COLLECTION_ID,
                    [Query.equal('id', review.teacherId), Query.limit(1)]
                );
                if(teacherRes.documents.length > 0) {
                    teacherName = teacherRes.documents[0].name;
                } else {
                  console.warn(`Teacher not found with custom ID: ${review.teacherId} for review ${review.$id}`);
                }
              } catch (e) { console.warn(`Failed to fetch teacher ${review.teacherId} for review ${review.$id}`, e); }
            }

            if (review.sectionId) { // sectionId is document $id from coll-section
                try {
                    const sectionDoc = await databases.getDocument<SectionDocument>(
                        APPWRITE_DATABASE_ID,
                        SECTIONS_COLLECTION_ID,
                        review.sectionId
                    );
                    sectionNameAtReviewTime = sectionDoc.name;
                } catch (e) { console.warn(`Failed to fetch section ${review.sectionId} for review ${review.$id}`, e); }
            }

            return { ...review, teacherName, sectionName: sectionNameAtReviewTime };
          })
        );

        set({ reviews: reviewsWithDetails, isLoading: false });

      } catch (err: any) {
        console.error("Error fetching student reviews:", err);
        if (err.response) {
            console.error("Appwrite error response:", err.response);
        }
        set({ isLoading: false, error: err.message || "An error occurred while fetching your reviews.", reviews: [] });
      }
    },
  },
}));