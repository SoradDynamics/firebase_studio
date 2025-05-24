// src/stores/examStore.ts
import { create } from 'zustand';
import { databases, Query, ID, APPWRITE_DATABASE_ID, EXAMS_COLLECTION_ID, FACULTIES_COLLECTION_ID, SECTIONS_COLLECTION_ID, STUDENTS_COLLECTION_ID, getCurrentUserEmail } from '~/utils/appwrite';
import { Exam, Faculty, Section, SubjectDetail } from 'types/models';
// Import your notification utilities
import { createNotificationEntry, getTomorrowDateString, NotificationData } from '~/utils/notification';

// NOTIFICATIONS_COLLECTION_ID is now handled within notification.ts, so we don't need YOUR_NOTIFICATION_COLLECTION_ID here
// const YOUR_NOTIFICATION_COLLECTION_ID = import.meta.env.VITE_APPWRITE_NOTIFY_COLLECTION_ID || 'YOUR_NOTIFICATION_COLLECTION_ID_NOT_SET';


interface ExamState {
    exams: Exam[];
    faculties: Faculty[];
    sections: Section[];
    loading: boolean;
    saving: boolean;
    deleting: boolean;
    error: string | null;
    filterFacultyId: string | null;
    filterClass: string | null;
    searchTerm: string;
}

type ExamDataPayload = Omit<Exam, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$collectionId' | '$databaseId'>;

interface ExamActions {
    fetchFaculties: () => Promise<void>;
    fetchSections: () => Promise<void>;
    fetchExams: () => Promise<void>;
    addExam: (examData: ExamDataPayload) => Promise<void>;
    updateExam: (examId: string, examData: ExamDataPayload) => Promise<void>;
    deleteExam: (examId: string) => Promise<void>;
    setFilterFacultyId: (facultyId: string | null) => void;
    setFilterClass: (className: string | null) => void;
    setSearchTerm: (term: string) => void;
    setError: (message: string | null) => void;
}

// Helper to convert AD ISO date string to YYYY-MM-DD string PLUS ONE DAY from LATEST subject date for notification validity
// This is different from getTomorrowDateString which is just tomorrow from "today"
const getNotificationValidDateFromLatestSubject = (subjectDetails: SubjectDetail[] | undefined): string => {
    let latestExamDate: Date | null = null;
    if (subjectDetails && subjectDetails.length > 0) {
        const adDates = subjectDetails.map(detail => new Date(detail.date))
            .filter(d => !isNaN(d.getTime()));
        if (adDates.length > 0) {
            latestExamDate = new Date(Math.max(...adDates.map(d => d.getTime())));
        }
    }

    const validDate = latestExamDate ? new Date(latestExamDate) : new Date(); // Use latest exam date or today if no dates
    validDate.setDate(validDate.getDate() + 1); // Add one day
    return validDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
};


const _findTargetStudentIds = async (examDataForQuery: Pick<Exam, 'faculty' | 'class' | 'section'>, allFaculties: Faculty[]): Promise<string[]> => {
    const filterQueries: string[] = [];
    const limit = 5000; // Appwrite's max query limit per request (can be up to 5000)

    if (examDataForQuery.faculty && examDataForQuery.faculty.length > 0) {
        const targetFacultyIds = allFaculties
            .filter(f => examDataForQuery.faculty.includes(f.name))
            .map(f => f.$id);
        if (targetFacultyIds.length > 0) {
            filterQueries.push(Query.in('facultyId', targetFacultyIds));
        } else {
             console.warn("_findTargetStudentIds: No matching faculty IDs found for given faculty names.");
             return [];
        }
    }

    if (examDataForQuery.class && examDataForQuery.class.length > 0) {
        filterQueries.push(Query.in('class', examDataForQuery.class));
    }

    if (examDataForQuery.section && examDataForQuery.section.length > 0) {
        filterQueries.push(Query.in('section', examDataForQuery.section));
    }
    
    // If no specific filters, we might want to send to all students, or none.
    // Current logic: if filterQueries is empty, it will fetch all students (up to the limit).
    // Adjust if "all students" is not the desired outcome for an exam with no faculty/class/section criteria.
    if (filterQueries.length === 0 && (examDataForQuery.faculty?.length || examDataForQuery.class?.length || examDataForQuery.section?.length)) {
        // This case means specific criteria were given, but they resolved to empty filters (e.g., faculty name not found).
        // So, no students should match.
        console.warn("_findTargetStudentIds: Criteria given but resolved to no valid filters. Returning no students.");
        return [];
    }


    const finalQuery: string[] = [Query.limit(limit), ...filterQueries];

    try {
        const studentsResponse = await databases.listDocuments(
            APPWRITE_DATABASE_ID, STUDENTS_COLLECTION_ID, finalQuery
        );
        return studentsResponse.documents
            .filter(student => student.id && typeof student.id === 'string' && student.id.trim() !== '')
            .map(student => `id:${student.id}`); // Format as "id:STUDENT_DOC_ID"
    } catch (err: any) {
        console.error("_findTargetStudentIds: Error querying students:", err);
        return [];
    }
};

const useExamStore = create<ExamState & ExamActions>((set, get) => ({
    exams: [],
    faculties: [],
    sections: [],
    loading: false,
    saving: false,
    deleting: false,
    error: null,
    filterFacultyId: null,
    filterClass: null,
    searchTerm: '',

    setError: (message) => set({ error: message }),

    fetchFaculties: async () => {
        set({ loading: true, error: null });
        try {
            const response = await databases.listDocuments(
                APPWRITE_DATABASE_ID, FACULTIES_COLLECTION_ID, [Query.limit(100)]
            );
            set({ faculties: response.documents as Faculty[], loading: false });
        } catch (err: any) {
            set({ error: "Failed to fetch faculties: " + err.message, loading: false });
        }
    },

    fetchSections: async () => {
        set({ loading: true, error: null });
        try {
            const response = await databases.listDocuments(
                APPWRITE_DATABASE_ID, SECTIONS_COLLECTION_ID, [Query.limit(200)]
            );
            set({ sections: response.documents as Section[], loading: false });
        } catch (err: any) {
            set({ error: "Failed to fetch sections: " + err.message, loading: false });
        }
    },

    fetchExams: async () => {
        set({ loading: true, error: null });
        try {
            const response = await databases.listDocuments(
                APPWRITE_DATABASE_ID, EXAMS_COLLECTION_ID, [Query.orderDesc('$createdAt'), Query.limit(100)]
            );
            
            const parsedExams = response.documents.map(doc => {
                let subjectDetails: SubjectDetail[] = [];
                if (doc.subjectDetails_json && typeof doc.subjectDetails_json === 'string') {
                    try {
                        subjectDetails = JSON.parse(doc.subjectDetails_json);
                    } catch (e) {
                        console.error(`Failed to parse subjectDetails_json for exam ${doc.$id}:`, e);
                    }
                }
                const { subjectDetails_json, ...restOfDoc } = doc;
                return { ...restOfDoc, subjectDetails } as Exam;
            });
            set({ exams: parsedExams, loading: false });
        } catch (err: any) {
            console.error("Error fetching exams:", err);
            set({ error: "Failed to fetch exams: " + err.message, loading: false });
        }
    },

    addExam: async (examData: ExamDataPayload) => {
        set({ saving: true, error: null });
        try {
            const { subjectDetails, ...restOfExamData } = examData;
            const appwriteData = {
                ...restOfExamData,
                subjectDetails_json: JSON.stringify(subjectDetails || []),
            };

            const newExamDocFromAppwrite = await databases.createDocument(
                APPWRITE_DATABASE_ID, EXAMS_COLLECTION_ID, ID.unique(), appwriteData
            );

            // --- Create Notification using the service ---
            try {
                const senderEmail = await getCurrentUserEmail();
                if (!senderEmail) {
                    console.warn("[ExamStore] Could not get current user email for notification sender. Using 'System'.");
                }

                const queryDataForStudents = {
                    faculty: examData.faculty,
                    class: examData.class,
                    section: examData.section,
                };
                if (get().faculties.length === 0 && queryDataForStudents.faculty && queryDataForStudents.faculty.length > 0) {
                    // Fetch faculties only if needed for student targeting and not already loaded
                    await get().fetchFaculties();
                }
                const targetStudentIds = await _findTargetStudentIds(queryDataForStudents, get().faculties);

                if (targetStudentIds.length > 0) {
                    const notificationPayload: NotificationData = {
                        title: `New Exam Announced: ${examData.title}`,
                        msg: `A new exam "${examData.title}" has been scheduled. Please check the exam details and prepare accordingly.`,
                        to: targetStudentIds, // Already formatted as "id:STUDENT_DOC_ID" by _findTargetStudentIds
                        valid: getNotificationValidDateFromLatestSubject(examData.subjectDetails), // Use helper for validity date
                        sender: senderEmail || 'System',
                        // You can add more fields like 'type', 'relatedDocumentId' here if your coll-notify supports them
                        // type: 'exam_announcement',
                        // relatedDocumentId: newExamDocFromAppwrite.$id,
                    };
                    await createNotificationEntry(notificationPayload);
                    console.log("[ExamStore] Notification for new exam created successfully.");
                } else {
                    console.log("[ExamStore] No target students found for the new exam notification. Skipping notification.");
                }

            } catch (notificationError: any) {
                console.error("[ExamStore] Error creating exam notification via service:", notificationError);
                // Decide if this error should affect the overall 'saving' state or throw further
            }
            // --- End Notification Creation ---

            await get().fetchExams();
            set({ saving: false });
        } catch (err: any) {
            console.error("Error adding exam:", err);
            set({ error: "Failed to add exam: " + err.message, saving: false });
            throw err;
        }
    },

    updateExam: async (examId: string, examData: ExamDataPayload) => {
        set({ saving: true, error: null });
        try {
            const { subjectDetails, ...restOfExamData } = examData;
            const appwriteData = {
                ...restOfExamData,
                subjectDetails_json: JSON.stringify(subjectDetails || []),
            };

            const updatedExamDocFromAppwrite = await databases.updateDocument(
                APPWRITE_DATABASE_ID, EXAMS_COLLECTION_ID, examId, appwriteData
            );

            // --- Create/Update Notification for Exam Update ---
            try {
                const senderEmail = await getCurrentUserEmail();
                const queryDataForStudents = {
                    faculty: examData.faculty,
                    class: examData.class,
                    section: examData.section,
                };
                if (get().faculties.length === 0 && queryDataForStudents.faculty && queryDataForStudents.faculty.length > 0) {
                     await get().fetchFaculties();
                }
                const targetStudentIds = await _findTargetStudentIds(queryDataForStudents, get().faculties);

                if (targetStudentIds.length > 0) {
                    const notificationPayload: NotificationData = {
                        title: `Exam Updated: ${examData.title}`,
                        msg: `The details for the exam "${examData.title}" have been updated. Please review the changes.`,
                        to: targetStudentIds,
                        valid: getNotificationValidDateFromLatestSubject(examData.subjectDetails),
                        sender: senderEmail || 'System',
                        // type: 'exam_update',
                        // relatedDocumentId: updatedExamDocFromAppwrite.$id,
                    };
                    // TODO: Implement logic to find and update an existing notification or create a new one.
                    // For now, we'll just create a new one for simplicity.
                    // If you have a 'relatedExamId' on notifications, you'd query for it first.
                    await createNotificationEntry(notificationPayload);
                    console.log("[ExamStore] Notification for updated exam created successfully (as new).");
                } else {
                     console.log("[ExamStore] No target students found for the updated exam notification. Skipping notification.");
                }
            } catch (notificationError: any) {
                console.error("[ExamStore] Error creating/updating exam notification via service:", notificationError);
            }
            // --- End Notification Update ---

            await get().fetchExams();
            set({ saving: false });
        } catch (err: any) {
            console.error("Error updating exam:", err);
            set({ error: "Failed to update exam: " + err.message, saving: false });
            throw err;
        }
    },

    deleteExam: async (examId) => {
        set({ deleting: true, error: null });
        try {
            // --- Delete Related Notifications ---
            // This part requires a way to identify notifications related to this examId.
            // If you add a 'relatedDocumentId' (with examId) to your coll-notify:
            // try {
            //   const relatedNotifications = await databases.listDocuments(
            //     APPWRITE_DATABASE_ID,
            //     NOTIFICATIONS_COLLECTION_ID, // Make sure this constant is available or use the one from notification.ts import
            //     [Query.equal('relatedDocumentId', examId), Query.limit(100)] // Adjust limit
            //   );
            //   for (const notif of relatedNotifications.documents) {
            //     await databases.deleteDocument(APPWRITE_DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, notif.$id);
            //     console.log(`[ExamStore] Deleted related notification ${notif.$id} for exam ${examId}`);
            //   }
            // } catch (deleteNotifError) {
            //   console.error(`[ExamStore] Error deleting related notifications for exam ${examId}:`, deleteNotifError);
            // }
            console.warn("[ExamStore] Placeholder for deleting related notifications for exam:", examId);
            // --- End Delete Related Notifications ---

            await databases.deleteDocument(APPWRITE_DATABASE_ID, EXAMS_COLLECTION_ID, examId);
            set((state) => ({
                exams: state.exams.filter(exam => exam.$id !== examId),
                deleting: false,
            }));
        } catch (err: any) {
            console.error("Error deleting exam:", err);
            set({ error: "Failed to delete exam: " + err.message, deleting: false });
            throw err;
        }
    },

    setFilterFacultyId: (facultyId) => set({ filterFacultyId: facultyId, filterClass: null, searchTerm: '' }),
    setFilterClass: (className) => set({ filterClass: className, searchTerm: '' }),
    setSearchTerm: (term) => set({ searchTerm: term }),
}));

export default useExamStore;