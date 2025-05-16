// ~/store/absentStore.ts
import { create } from "zustand";
import { Student } from "./studentStore"; // Ensure Student interface has 'id' (custom) and '$id' (Appwrite)
import { adToBs } from "@sbmdkl/nepali-date-converter";

// Helper to convert AD date string (YYYY-MM-DD) to BS date string (YYYY-MM-DD)
const convertAdToBsDate = (adDate: string): string | null => {
    if (!adDate || !adDate.trim()) {
        console.warn("[absentStore/convertAdToBsDate] Received empty or invalid adDate input:", adDate);
        return null;
    }
    try {
        if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(adDate)) {
            console.warn(`[absentStore/convertAdToBsDate] Input AD date "${adDate}" is not in YYYY-MM-DD format.`);
            return null;
        }
        const bsDate = adToBs(adDate);
        return bsDate;
    } catch (error: any) {
        console.error(`[absentStore/convertAdToBsDate] Error converting AD "${adDate}" to BS:`, error.message, error);
        return null;
    }
};

// Helper to format a Date object to YYYY-MM-DD string
const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is 0-indexed
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};


export interface StudentUpdateData {
    name?: string;
    class?: string;
    facultyId?: string;
    section?: string;
    parentId?: string;
    absent?: string[];
}

// Interface for the notification document payload for 'coll-notify'
export interface NotificationPayload {
    title: string;
    msg: string;
    to: string[]; // This will contain ["id:CUSTOM_STUDENT_ID"]
    valid: string | null; // <<< MODIFIED: Will store tomorrow's AD date as YYYY-MM-DD string, or null
    sender: string; // Label of the currently logged-in user
    date: string; // Today's date in AD (YYYY-MM-DD string)
}

// Defines the state and actions of the absentStore
interface AbsentState {
    markAbsent: (
        studentDocId: string, // Appwrite document ID ($id) of the student
        dateOfAbsence: string, // The AD date (YYYY-MM-DD) for which the student is being marked absent
        studentData: Student[], // Current list of all students (passed in, each object must have 'id' and '$id')
        updateStudentData: (
            studentDocId: string,
            dataToUpdate: StudentUpdateData
        ) => Promise<Student | undefined>, // Function to persist student update
        createNotification: (
            notificationData: NotificationPayload
        ) => Promise<any>, // Function to create the notification document
        currentUserLabel: string // Label/name of the user performing the action
    ) => Promise<void>;
}

export const useAbsentStore = create<AbsentState>((set, get) => ({
    markAbsent: async (
        studentDocId, // Appwrite document ID ($id)
        dateOfAbsence,
        studentData,
        updateStudentData,
        createNotification,
        currentUserLabel
    ) => {
        console.log(`[absentStore] Initiating markAbsent for student document ${studentDocId} on ${dateOfAbsence}. User: ${currentUserLabel}`);

        try {
            const student = studentData.find((s) => s.$id === studentDocId);

            if (!student) {
                console.warn(`[absentStore] Student with document ID ${studentDocId} not found. Aborting.`);
                return;
            }

            if (!student.id) {
                console.error(`[absentStore] Student object (doc ID: ${studentDocId}) is MISSING the custom 'id' field. Cannot create notification correctly. Student data snapshot:`, { $id: student.$id, name: student.name });
                throw new Error(`Student data for doc ID ${studentDocId} is missing the custom 'id' property. Ensure 'studentStore' fetches and provides this field.`);
            }
            const customStudentId = student.id;

            const absentArray = student.absent ? [...student.absent] : [];

            if (!absentArray.includes(dateOfAbsence)) {
                console.log(`[absentStore] Student (doc ID: ${studentDocId}, custom ID: ${customStudentId}) NOT yet marked absent on ${dateOfAbsence}. Proceeding to update student record...`);
                absentArray.push(dateOfAbsence);

                await updateStudentData(student.$id, { absent: absentArray });
                console.log(`[absentStore] Student (doc ID: ${student.$id}) record updated successfully with new absence date: ${dateOfAbsence}.`);

                console.log(`[absentStore] Proceeding to create notification for custom student ID: ${customStudentId}.`);
                try {
                    const bsDateOfAbsence = convertAdToBsDate(dateOfAbsence);
                    const todayAdDateString = formatDateToYYYYMMDD(new Date()); // Today's date as YYYY-MM-DD string

                    // --- Calculate Tomorrow's AD Date and Format as YYYY-MM-DD string ---
                    const tomorrowDateObject = new Date(); // Starts as today
                    tomorrowDateObject.setDate(tomorrowDateObject.getDate() + 1); // Sets it to tomorrow
                    const validUntilDateString = formatDateToYYYYMMDD(tomorrowDateObject); // Format as YYYY-MM-DD
                    // --- End Calculate Tomorrow's AD Date ---

                    if (!currentUserLabel || currentUserLabel === 'Loading...') {
                        console.error("[absentStore] currentUserLabel is missing or invalid. Cannot create notification with proper sender.", currentUserLabel);
                        throw new Error("Sender information (currentUserLabel) is missing or invalid for notification.");
                    }

                    const notificationMessage = bsDateOfAbsence
                        ? `Your student is absent on ${bsDateOfAbsence} (BS).`
                        : `Your student is absent on ${dateOfAbsence} (AD). (BS conversion failed or not applicable)`;

                    const notificationPayload: NotificationPayload = {
                        title: "Absent Notification",
                        msg: notificationMessage,
                        to: [`id:${customStudentId}`],
                        valid: validUntilDateString, // <<< SAVING TOMORROW'S DATE AS YYYY-MM-DD STRING
                        sender: currentUserLabel,
                        date: todayAdDateString, // Today's date as YYYY-MM-DD string for 'date' field
                    };

                    console.log("[absentStore] Notification payload prepared:", JSON.stringify(notificationPayload, null, 2));
                    console.log("[absentStore] Calling the provided createNotification function...");

                    await createNotification(notificationPayload);

                    console.log(`[absentStore] Notification successfully created in coll-notify for custom student ID: ${customStudentId}.`);

                } catch (notificationError) {
                    console.error(`[absentStore] CRITICAL ERROR creating notification in coll-notify for custom student ID ${customStudentId}:`, notificationError);
                    throw notificationError;
                }
            } else {
                console.log(`[absentStore] Student (doc ID: ${studentDocId}, custom ID: ${customStudentId}) already marked absent on ${dateOfAbsence}. No new update or notification needed.`);
            }
        } catch (error) {
            console.error(`[absentStore] Overall error in markAbsent process for student document ${studentDocId}:`, error);
            throw error;
        }
    },
}));