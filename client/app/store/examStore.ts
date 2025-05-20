// src/stores/examStore.ts
import { create } from 'zustand';
import { databases, Query, ID, APPWRITE_DATABASE_ID, EXAMS_COLLECTION_ID, FACULTIES_COLLECTION_ID, SECTIONS_COLLECTION_ID, STUDENTS_COLLECTION_ID, getCurrentUserEmail } from '~/utils/appwrite';
import { Exam, Faculty, Section, Student } from 'types/models'; // Import Student type

// Define the notification collection ID
// **REPLACE THIS WITH YOUR ACTUAL NOTIFICATION COLLECTION ID**
const YOUR_NOTIFICATION_COLLECTION_ID = import.meta.env.VITE_APPWRITE_NOTIFY_COLLECTION_ID || 'YOUR_NOTIFICATION_COLLECTION_ID_NOT_SET';
// Make sure VITE_APPWRITE_NOTIFICATION_COLLECTION_ID is in your .env file

interface ExamState {
    exams: Exam[];
    faculties: Faculty[];
    sections: Section[];
    loading: boolean;
    saving: boolean;
    deleting: boolean;
    error: string | null;
    // State for filtering/searching (client-side)
    filterFacultyId: string | null; // Using ID for dropdown value, map to names for filtering
    filterClass: string | null;     // Using Class Name for dropdown value
    searchTerm: string;
}

interface ExamActions {
    fetchFaculties: () => Promise<void>;
    fetchSections: () => Promise<void>;
    fetchExams: () => Promise<void>; // Fetches all (or paginated) exams
    // Updated Exam type in action signatures - Omit now reflects the *new* Exam schema
    addExam: (examData: Omit<Exam, '$id' | '$createdAt' | '$updatedAt' | '$permissions'>) => Promise<void>;
    updateExam: (examId: string, examData: Omit<Exam, '$id' | '$createdAt' | '$updatedAt' | '$permissions'>) => Promise<void>;
    deleteExam: (examId: string) => Promise<void>;
    setFilterFacultyId: (facultyId: string | null) => void;
    setFilterClass: (className: string | null) => void;
    setSearchTerm: (term: string) => void;
    setError: (message: string | null) => void;
}

// Helper to convert AD ISO date string to YYYY-MM-DD string PLUS ONE DAY
const convertAdIsoStringToYYYYMMDDStringPlusOneDay = (adIsoString: string | null): string | null => {
    if (!adIsoString) return null;
    try {
        const date = new Date(adIsoString);
        if (isNaN(date.getTime())) {
            console.error("Invalid date string provided for YYYY-MM-DD+1 conversion:", adIsoString);
            return null;
        }

        date.setDate(date.getDate() + 1);

        const year = date.getFullYear();
        const month = date.getMonth() + 1; // getMonth() is 0-indexed
        const day = date.getDate();

        const monthPadded = String(month).padStart(2, '0');
        const dayPadded = String(day).padStart(2, '0');

        return `${year}-${monthPadded}-${dayPadded}`;

    } catch (error) {
        console.error("Error converting AD ISO string +1 day to YYYY-MM-DD string:", error);
        return null;
    }
};

/**
 * Finds the values of the 'id' attribute from students who match the exam's faculty, class, and section criteria.
 * Handles the 'empty array' case in exam criteria (meaning 'all' for that criterion).
 * Correctly uses Query.equal for single values and Query.or for multiple values.
 *
 * @param exam The exam document with faculty[], class[], section[] (names/names/names)
 * @param allFaculties All faculty documents (needed to map exam faculty names to student facultyIds)
 * @returns Promise<string[]> An array of student 'id' attribute strings formatted as "id:..."
 */
const _findTargetStudentIds = async (exam: Exam, allFaculties: Faculty[]): Promise<string[]> => {
    const filterQueries: string[] = []; // Array to hold the string representations of queries
    const limit = 5000; // Increased limit - adjust as needed

    // 1. Filter by Faculty (if exam specifies faculties)
    if (exam.faculty && exam.faculty.length > 0) {
        const targetFacultyIds = allFaculties
            .filter(f => exam.faculty.includes(f.name))
            .map(f => f.$id); // Map faculty names to Faculty document $ids

        if (targetFacultyIds.length > 0) {
            if (targetFacultyIds.length === 1) {
                filterQueries.push(Query.equal('facultyId', targetFacultyIds[0]));
                console.log(`_findTargetStudentIds: Adding single faculty filter for ID: ${targetFacultyIds[0]}`);
            } else {
                filterQueries.push(Query.or(targetFacultyIds.map(id => Query.equal('facultyId', id))));
                 console.log(`_findTargetStudentIds: Adding OR faculty filter for IDs: ${targetFacultyIds.join(', ')}`);
            }
        } else {
             console.warn(`_findTargetStudentIds: Exam lists faculty names (${exam.faculty.join(', ')}) that do not match any existing faculties. No students will be found based on faculty.`);
             return []; // No students match this criteria based on faculty names not existing
        }
    } else {
         console.log("_findTargetStudentIds: Exam targets all faculties.");
    }

    // 2. Filter by Class (if exam specifies classes)
    if (exam.class && exam.class.length > 0) {
         if (exam.class.length === 1) {
             filterQueries.push(Query.equal('class', exam.class[0]));
             console.log(`_findTargetStudentIds: Adding single class filter for name: ${exam.class[0]}`);
         } else {
             filterQueries.push(Query.or(exam.class.map(name => Query.equal('class', name))));
             console.log(`_findTargetStudentIds: Adding OR class filter for names: ${exam.class.join(', ')}`);
         }
    } else {
        console.log("_findTargetStudentIds: Exam targets all classes.");
    }

    // 3. Filter by Section (if exam specifies sections)
    if (exam.section && exam.section.length > 0) {
        if (exam.section.length === 1) {
            filterQueries.push(Query.equal('section', exam.section[0]));
            console.log(`_findTargetStudentIds: Adding single section filter for name: ${exam.section[0]}`);
        } else {
            filterQueries.push(Query.or(exam.section.map(name => Query.equal('section', name))));
             console.log(`_findTargetStudentIds: Adding OR section filter for names: ${exam.section.join(', ')}`);
        }
    } else {
        console.log("_findTargetStudentIds: Exam targets all sections.");
    }

    // Construct the final query array
    const finalQuery: string[] = [Query.limit(limit)]; // Start with limit

    if (filterQueries.length > 0) {
         finalQuery.push(Query.and(filterQueries));
         console.log("_findTargetStudentIds: Combining filters with AND.");
    } else {
        console.log("_findTargetStudentIds: No specific filters applied, querying all students.");
    }

    try {
         console.log("_findTargetStudentIds: Final Appwrite Query String Array Sent:", finalQuery);
        const studentsResponse = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            STUDENTS_COLLECTION_ID,
            finalQuery
        );

        console.log(`_findTargetStudentIds: Found ${studentsResponse.documents.length} students matching criteria.`);
         if(studentsResponse.documents.length > 0) {
             console.log("_findTargetStudentIds: First student document found:", studentsResponse.documents[0]);
             console.log("_findTargetStudentIds: First student 'id' attribute value:", studentsResponse.documents[0].id);
         } else {
             console.log("_findTargetStudentIds: No students found for this criteria.");
         }

        // Extract and return the 'id' attribute value (string) of the matching students and format it
        // Ensure student.id is a non-empty string before formatting
        return studentsResponse.documents
            .filter(student => student.id && typeof student.id === 'string' && student.id.trim() !== '')
            .map(student => `id:${student.id}`); // <-- Format here

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
                APPWRITE_DATABASE_ID,
                FACULTIES_COLLECTION_ID,
                [Query.limit(100)]
            );
            set({ faculties: response.documents as Faculty[], loading: false });
        } catch (err: any) {
            console.error("Error fetching faculties:", err);
            set({ error: "Failed to fetch faculties: " + (err.message || 'Unknown error'), loading: false });
        }
    },

    fetchSections: async () => {
        set({ loading: true, error: null });
        try {
            const response = await databases.listDocuments(
                APPWRITE_DATABASE_ID,
                SECTIONS_COLLECTION_ID,
                [Query.limit(100)]
            );
            set({ sections: response.documents as Section[], loading: false });
        } catch (err: any) {
            console.error("Error fetching sections:", err);
            set({ error: "Failed to fetch sections: " + (err.message || 'Unknown error'), loading: false });
        }
    },

    fetchExams: async () => {
        set({ loading: true, error: null });
        try {
             // Fetch all exams (consider pagination for large datasets)
            const response = await databases.listDocuments(
                APPWRITE_DATABASE_ID,
                EXAMS_COLLECTION_ID,
                 [Query.limit(100)]
            );
            set({ exams: response.documents as Exam[], loading: false });
        } catch (err: any) {
            console.error("Error fetching exams:", err);
            set({ error: "Failed to fetch exams: " + (err.message || 'Unknown error'), loading: false });
        }
    },

    addExam: async (examData: Omit<Exam, '$id' | '$createdAt' | '$updatedAt' | '$permissions'>) => {
        set({ saving: true, error: null });
        try {
            // 1. Create the Exam document first
            // examData argument should contain the 'subjectDates' array based on the updated Exam type
            const newExamDocument = await databases.createDocument(
                APPWRITE_DATABASE_ID,
                EXAMS_COLLECTION_ID,
                ID.unique(),
                examData // This must match the new Exam schema (includes subjectDates)
            );

            console.log("Exam document created:", newExamDocument);

            // 2. Create the Notification document based on coll-notify schema
            if (YOUR_NOTIFICATION_COLLECTION_ID === 'YOUR_NOTIFICATION_COLLECTION_ID_NOT_SET') {
                 console.warn("YOUR_NOTIFICATION_COLLECTION_ID is not set. Skipping notification creation.");
             } else {
                 try {
                     // Determine the effective 'end date' for the exam based on the latest subject date
                     let effectiveEndDateIso: string | null = null;
                     if (newExamDocument.subjectDates && newExamDocument.subjectDates.length > 0) {
                         const adDates = newExamDocument.subjectDates.map(itemString => {
                             const parts = itemString.split('|');
                             if (parts.length === 2) {
                                 try { return new Date(parts[1]); } catch { return null; }
                             }
                             return null;
                         }).filter((d): d is Date => d !== null && !isNaN(d.getTime()));

                         if (adDates.length > 0) {
                             const latestDate = new Date(Math.max(...adDates.map(d => d.getTime())));
                             effectiveEndDateIso = latestDate.toISOString();
                         }
                     }

                     // Calculate the 'valid' date string using the effective end date
                     const validDateString = convertAdIsoStringToYYYYMMDDStringPlusOneDay(effectiveEndDateIso);

                     // Find target students (logic remains based on faculty, class, section)
                     if (get().faculties.length === 0) {
                         console.warn("Faculties not loaded in store. Attempting to fetch before finding target students.");
                         await get().fetchFaculties(); // Attempt to fetch if empty
                          if (get().faculties.length === 0) {
                            console.error("Failed to load faculties. Cannot find target students for notification.");
                         }
                     }
                      // Call _findTargetStudentIds with potentially updated faculties
                     const targetStudentIds = await _findTargetStudentIds(newExamDocument, get().faculties);


                     const senderEmail = await getCurrentUserEmail();

                     const notificationPayload = {
                        title: `New Exam Posted: ${newExamDocument.title}`, // Example title
                        msg: `Details for the upcoming exam "${newExamDocument.title}" are now available. Check your schedule for details and dates.`, // Example message
                        to: targetStudentIds, // Array of student 'id' attribute strings (formatted as "id:...")
                        valid: validDateString, // YYYY-MM-DD string +1 day from latest subject date
                        sender: senderEmail || 'Admin', // Sender email or default 'Admin'
                        date: new Date().toISOString(), // Notification creation date (ISO string)
                        // Add relatedExamId if you want to link notification back to exam
                        // relatedExamId: newExamDocument.$id, // Ensure this attribute exists in coll-notify schema (String)
                     };

                     console.log("Creating notification with payload:", notificationPayload);

                    // Create the notification document in coll-notify
                    const notificationDocument = await databases.createDocument(
                       APPWRITE_DATABASE_ID,
                       YOUR_NOTIFICATION_COLLECTION_ID,
                       ID.unique(),
                       notificationPayload
                    );
                     console.log("Notification document created:", notificationDocument);

                } catch (notificationError: any) {
                    console.error("Error creating exam notification:", notificationError);
                    // Log the error but allow the exam creation itself to be considered successful
                }
             }

            // Refetch exams to update the list in the UI
            await get().fetchExams();
            set({ saving: false });

        } catch (err: any) {
            console.error("Error adding exam:", err);
            set({ error: "Failed to add exam: " + (err.message || 'Unknown error'), saving: false });
            throw err;
        }
    },

    updateExam: async (examId: string, examData: Omit<Exam, '$id' | '$createdAt' | '$updatedAt' | '$permissions'>) => {
        set({ saving: true, error: null });
        try {
            // 1. Update the Exam document
            // examData here should contain the updated 'subjectDates' array
            const updatedExamDocument = await databases.updateDocument(
                APPWRITE_DATABASE_ID,
                EXAMS_COLLECTION_ID,
                examId,
                examData // This must match the new Exam schema
            );

            console.log("Exam document updated:", updatedExamDocument);

            // 2. Update/Create Notification document based on coll-notify schema
             if (YOUR_NOTIFICATION_COLLECTION_ID === 'YOUR_NOTIFICATION_COLLECTION_ID_NOT_SET') {
                 console.warn("YOUR_NOTIFICATION_COLLECTION_ID is not set. Skipping notification update.");
             } else {
                 try {
                     // Determine the effective 'end date' from updated subject dates
                     let effectiveEndDateIso: string | null = null;
                     if (updatedExamDocument.subjectDates && updatedExamDocument.subjectDates.length > 0) {
                          const adDates = updatedExamDocument.subjectDates.map((itemString:any) => {
                             const parts = itemString.split('|');
                             if (parts.length === 2) {
                                 try { return new Date(parts[1]); } catch { return null; }
                             }
                             return null;
                         }).filter((d:any): d is Date => d !== null && !isNaN(d.getTime()));

                         if (adDates.length > 0) {
                             const latestDate = new Date(Math.max(...adDates.map((d:any) => d.getTime())));
                             effectiveEndDateIso = latestDate.toISOString();
                         }
                     }

                     // Calculate the updated 'valid' date string
                     const validDateString = convertAdIsoStringToYYYYMMDDStringPlusOneDay(effectiveEndDateIso);


                      // Find target students based on UPDATED exam criteria
                     if (get().faculties.length === 0) {
                         console.warn("Faculties not loaded in store. Attempting to fetch before finding target students for update.");
                         await get().fetchFaculties(); // Attempt to fetch if empty
                          if (get().faculties.length === 0) {
                            console.error("Failed to load faculties. Cannot find target students for notification update.");
                         }
                     }
                     const targetStudentIds = await _findTargetStudentIds(updatedExamDocument, get().faculties);


                     const senderEmail = await getCurrentUserEmail();

                      const notificationPayload = {
                        title: `Exam Details Updated: ${updatedExamDocument.title}`, // Example title
                        msg: `Updates available for the exam "${updatedExamDocument.title}". Check your schedule for details and dates.`, // Example message
                        to: targetStudentIds, // Updated array of student 'id' attribute strings (formatted as "id:...")
                        valid: validDateString, // Updated YYYY-MM-DD string +1 day from latest subject date
                        sender: senderEmail || 'Admin', // Sender email or default 'Admin'
                        date: new Date().toISOString(), // Use update date
                         // relatedExamId: updatedExamDocument.$id, // If exists
                     };

                      console.log("Preparing notification update with payload:", notificationPayload);

                      // --- Implement logic to find and update the existing notification document ---
                      // This part is commented out as it depends on your notification schema and linking strategy.
                      // You need to query coll-notify to find the notification related to this examId
                      // (e.g., using a 'relatedExamId' attribute if you add one to coll-notify).
                      // Once found, use its $id in databases.updateDocument.

                      // Example placeholder structure (replace with your actual find/update logic):
                      // try {
                      //     const notifResponse = await databases.listDocuments(
                      //         APPWRITE_DATABASE_ID,
                      //         YOUR_NOTIFICATION_COLLECTION_ID,
                      //         [Query.equal('relatedExamId', updatedExamDocument.$id), Query.limit(1)] // Requires relatedExamId in coll-notify
                      //     );
                      //     const existingNotification = notifResponse.documents[0];
                      //
                      //     if (existingNotification) {
                      //          console.log(`Updating existing notification ${existingNotification.$id} for exam ${examId}`);
                      //          await databases.updateDocument(
                      //            APPWRITE_DATABASE_ID,
                      //            YOUR_NOTIFICATION_COLLECTION_ID,
                      //            existingNotification.$id,
                      //            notificationPayload
                      //          );
                      //         console.log("Notification document updated.");
                      //     } else {
                      //         console.warn(`No existing notification found for exam ${examId}. Consider creating a new one.`);
                      //         // Option: Create a new notification if none was found (requires relatedExamId)
                      //         // if (notificationPayload.hasOwnProperty('relatedExamId')) {
                      //         //      await databases.createDocument(APPWRITE_DATABASE_ID, YOUR_NOTIFICATION_COLLECTION_ID, ID.unique(), notificationPayload);
                      //         //      console.log("Created new notification after update.");
                      //         // }
                      //     }
                      // } catch (findAndUpdateErr) {
                      //      console.error("Error finding or updating notification for exam:", findAndUpdateErr);
                      //      // Log error, continue with exam update
                      // }
                       console.warn("Notification update logic not fully implemented (commented out). Skipping notification update.");

                 } catch (notificationError: any) {
                     console.error("Error updating exam notification:", notificationError);
                 }
             }

            await get().fetchExams();
            set({ saving: false });

        } catch (err: any) {
            console.error("Error updating exam:", err);
            set({ error: "Failed to update exam: " + (err.message || 'Unknown error'), saving: false });
            throw err;
        }
    },

    deleteExam: async (examId) => {
        set({ deleting: true, error: null });
        try {
            // Optional: Add logic here to delete the related notification document first
             if (YOUR_NOTIFICATION_COLLECTION_ID !== 'YOUR_NOTIFICATION_COLLECTION_ID_NOT_SET') {
                // If you have a 'relatedExamId' field in notifications:
                // try {
                //     const notifResponse = await databases.listDocuments(
                //         APPWRITE_DATABASE_ID,
                //         YOUR_NOTIFICATION_COLLECTION_ID,
                //         [Query.equal('relatedExamId', examId), Query.limit(1)] // Requires relatedExamId in coll-notify
                //     );
                //     const notificationToDelete = notifResponse.documents[0];
                //     if (notificationToDelete) {
                //         console.log(`Attempting to delete related notification ${notificationToDelete.$id} for exam ${examId}`);
                //         await databases.deleteDocument(APPWRITE_DATABASE_ID, YOUR_NOTIFICATION_COLLECTION_ID, notificationToDelete.$id);
                //         console.log(`Deleted related notification`);
                //     }
                // } catch (deleteNotifErr) {
                //      console.error("Error deleting related notification for exam:", deleteNotifErr);
                //      // Log error, continue with exam deletion
                // }
                 console.warn("Notification deletion logic not fully implemented (commented out). Skipping notification deletion.");
             }

            await databases.deleteDocument(
                APPWRITE_DATABASE_ID,
                EXAMS_COLLECTION_ID,
                examId
            );
            // Remove the exam from the state directly for faster UI update
            set((state) => ({
                exams: state.exams.filter(exam => exam.$id !== examId),
                deleting: false,
            }));

        } catch (err: any) {
            console.error("Error deleting exam:", err);
            set({ error: "Failed to delete exam: " + (err.message || 'Unknown error'), deleting: false });
            throw err;
        }
    },

    setFilterFacultyId: (facultyId) => set({ filterFacultyId: facultyId, filterClass: null }),
    setFilterClass: (className) => set({ filterClass: className }),
    setSearchTerm: (term) => set({ searchTerm: term }),
}));

export default useExamStore;