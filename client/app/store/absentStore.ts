// ~/store/absentStore.ts
import { create } from "zustand";
import { Student } from "./studentStore";
import { adToBs } from "@sbmdkl/nepali-date-converter";

// Helper to format a Date object to YYYY-MM-DD string
const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is 0-indexed
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Modified convertAdToBsDate with more logging
const convertAdToBsDate = (adDate: string): string | null => {
    console.log(`[absentStore/convertAdToBsDate] INPUT AD Date for BS conversion: "${adDate}"`); // LOG INPUT
    if (!adDate || !adDate.trim()) {
        console.warn("[absentStore/convertAdToBsDate] Received empty or invalid adDate input for BS conversion:", adDate);
        return null;
    }
    try {
        if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(adDate)) {
            console.warn(`[absentStore/convertAdToBsDate] Input AD date "${adDate}" might not be in expected YYYY-MM-DD format for BS conversion.`);
        }
        const bsDate = adToBs(adDate);
        console.log(`[absentStore/convertAdToBsDate] OUTPUT BS Date after conversion from AD "${adDate}": "${bsDate}"`); // LOG OUTPUT
        return bsDate;
    } catch (error: any) {
        console.error(`[absentStore/convertAdToBsDate] Error converting AD "${adDate}" to BS:`, error.message, error);
        return null;
    }
};

export interface StudentUpdateData {
    name?: string;
    class?: string;
    facultyId?: string;
    section?: string;
    parentId?: string;
    absent?: string[];
}

export interface NotificationPayload {
    title: string;
    msg: string;
    to: string[];
    valid: string | null; // Yesterday's date (AD, YYYY-MM-DD string)
    sender: string;
    date: string; // Today's date (when notification is created, AD, YYYY-MM-DD string)
}

interface AbsentState {
    markAbsent: (
        studentDocId: string,
        dateOfAbsence: string,
        studentData: Student[],
        updateStudentData: (studentDocId: string, dataToUpdate: StudentUpdateData) => Promise<Student | undefined>,
        createNotification: (notificationData: NotificationPayload) => Promise<any>,
        currentUserLabel: string
    ) => Promise<void>;
}

export const useAbsentStore = create<AbsentState>((set, get) => ({
    markAbsent: async (
        studentDocId,
        dateOfAbsence,
        studentData,
        updateStudentData,
        createNotification,
        currentUserLabel
    ) => {
        console.log(`[absentStore] MARKABSENT_START: studentDocId=${studentDocId}, dateOfAbsence="${dateOfAbsence}", user=${currentUserLabel}`); // LOG 1

        try {
            const student = studentData.find((s) => s.$id === studentDocId);

            if (!student) {
                console.warn(`[absentStore] Student with document ID ${studentDocId} not found. Aborting.`);
                return;
            }

            if (!student.id) {
                console.error(`[absentStore] Student object (doc ID: ${studentDocId}) is MISSING the custom 'id' field. Student data snapshot:`, { $id: student.$id, name: student.name });
                throw new Error(`Student data for doc ID ${studentDocId} is missing the custom 'id' property.`);
            }
            const customStudentId = student.id;
            const absentArray = student.absent ? [...student.absent] : [];

            if (!absentArray.includes(dateOfAbsence)) {
                console.log(`[absentStore] Student (docId: ${studentDocId}) not yet marked absent for AD date "${dateOfAbsence}". Proceeding to update student record...`);
                absentArray.push(dateOfAbsence);

                await updateStudentData(student.$id, { absent: absentArray });
                console.log(`[absentStore] Student record updated for AD date "${dateOfAbsence}".`);

                console.log(`[absentStore] Preparing notification. Date of Absence (AD) for message: "${dateOfAbsence}"`); // LOG 2

                try {
                    const bsDateOfAbsence = convertAdToBsDate(dateOfAbsence); // This will log input/output
                    console.log(`[absentStore] Calculated bsDateOfAbsence for message: "${bsDateOfAbsence}" (derived from AD: "${dateOfAbsence}")`); // LOG 3

                    const todayAdDateStringForNotificationDateField = formatDateToYYYYMMDD(new Date());
                    const yesterdayDateObject = new Date();
                    yesterdayDateObject.setDate(yesterdayDateObject.getDate() + 1); //named as yesterday but this is today date
                    const validDateStringForNotification = formatDateToYYYYMMDD(yesterdayDateObject);

                    if (!currentUserLabel || currentUserLabel === 'Loading...' || currentUserLabel === 'System_Error') {
                        console.error("[absentStore] currentUserLabel is invalid for notification.", currentUserLabel);
                        throw new Error("Sender information (currentUserLabel) is invalid for notification.");
                    }

                    const notificationMessage = bsDateOfAbsence
                        ? `Your student is absent today [${dateOfAbsence} (AD)].`    ///bsDateOfAbsence instead of ad
                        : `Your student is absent on ${dateOfAbsence} (AD). (BS conversion failed)`;
                    console.log(`[absentStore] Constructed notificationMessage: "${notificationMessage}"`); // LOG 4

                    const notificationPayload: NotificationPayload = {
                        title: "Absent Notification",
                        msg: notificationMessage,
                        to: [`id:${customStudentId}`],
                        valid: validDateStringForNotification,
                        sender: currentUserLabel,
                        date: todayAdDateStringForNotificationDateField,
                    };

                    console.log("[absentStore] FINAL Notification payload to be sent:", JSON.stringify(notificationPayload, null, 2)); // LOG 5
                    await createNotification(notificationPayload);
                    console.log(`[absentStore] Notification created successfully for student custom ID: ${customStudentId}.`);

                } catch (notificationError) {
                    console.error(`[absentStore] ERROR creating notification for student custom ID ${customStudentId}:`, notificationError);
                    throw notificationError;
                }
            } else {
                console.log(`[absentStore] Student (docId: ${studentDocId}) already marked absent on AD date "${dateOfAbsence}". No new update or notification needed.`);
            }
        } catch (error) {
            console.error(`[absentStore] OVERALL error in markAbsent process for student document ${studentDocId}:`, error);
            throw error;
        }
    },
}));