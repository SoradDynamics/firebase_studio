// ~/Attendance/Details.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useStudentStore, StudentUpdateData, Student } from "~/store/studentStore"; // Import Student type
import { useFacultyStore } from "~/store/facultyStore";
import { Button } from "@heroui/react";
import Popover from "../common/Popover"; // Adjust path if needed
import { useAbsentStore, NotificationPayload } from "~/store/absentStore";

// Import Appwrite client, IDs, and utilities (adjust path as needed)
import { account, databases, ID} from "~/utils/appwrite"; // Assuming this path

interface DetailsProps {
    studentIds: string[]; // These are expected to be Appwrite document IDs ($id)
    onBack?: () => void;
}

// Define the Appwrite notification creation function
// This function is passed to the absentStore
const createAppwriteNotification = async (data: NotificationPayload): Promise<any> => {

    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID as string;
    const NOTIFICATIONS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_NOTIFY_COLLECTION_ID as string;

    console.log("[Details.tsx/createAppwriteNotification] Attempting to create document in coll-notify with data:", JSON.stringify(data, null, 2));
    console.log(`[Details.tsx/createAppwriteNotification] Using DB_ID: ${DATABASE_ID}, COLL_ID: ${NOTIFICATIONS_COLLECTION_ID}`);

    if (!DATABASE_ID || !NOTIFICATIONS_COLLECTION_ID || DATABASE_ID === 'YOUR_DATABASE_ID_PLACEHOLDER' || DATABASE_ID === undefined) {
        console.error("[Details.tsx/createAppwriteNotification] Database ID or Collection ID is not configured correctly!");
        throw new Error("Appwrite service is not configured with database/collection IDs for notifications.");
    }
    if (!data.sender) {
        console.error("[Details.tsx/createAppwriteNotification] Sender field is missing in notification payload.");
        throw new Error("Sender field is required for notification payload.");
    }

    try {
        const response = await databases.createDocument(
            DATABASE_ID,
            NOTIFICATIONS_COLLECTION_ID,
            ID.unique(), // Appwrite generates a unique ID
            data
        );
        console.log("[Details.tsx/createAppwriteNotification] Successfully created document in coll-notify:", response);
        return response;
    } catch (error: any) {
        console.error("[Details.tsx/createAppwriteNotification] Appwrite Error: Failed to create document in coll-notify.");
        console.error("[Details.tsx/createAppwriteNotification] Error Code:", error.code);
        console.error("[Details.tsx/createAppwriteNotification] Error Message:", error.message);
        console.error("[Details.tsx/createAppwriteNotification] Full Error Object:", error);
        throw error; // Re-throw so absentStore and confirmSaveAttendance can catch it
    }
};

// Helper type for the details displayed in the UI
interface StudentDisplayDetail {
    name: string;
    faculty: string;
    class: string;
    section: string;
    docId: string; // Appwrite document ID ($id)
    customId?: string; // Student's custom ID (from student.id)
}

const Details: React.FC<DetailsProps> = ({ studentIds, onBack }) => {
    const { studentData, updateStudentData } = useStudentStore();
    const { facultyData } = useFacultyStore();
    const [selectedStudentDetails, setSelectedStudentDetails] = useState<StudentDisplayDetail[]>([]);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const { markAbsent } = useAbsentStore();

    const [currentUserLabel, setCurrentUserLabel] = useState<string>('Loading...');

    // Fetch current user's label (name)
    const fetchCurrentUserLabel = useCallback(async () => {
        try {
            const user = await account.get();
            setCurrentUserLabel(user.name || 'Unknown Sender');
        } catch (error) {
            console.error("Error fetching current user label:", error);
            setCurrentUserLabel('System_Error'); // Fallback on error, make it distinct
            setSaveError("Could not fetch user information. Notifications might use a default sender or fail if sender is required.");
        }
    }, []);

    useEffect(() => {
        fetchCurrentUserLabel();
    }, [fetchCurrentUserLabel]);

    useEffect(() => {
        // Prepare details for display, ensuring we have the Appwrite $id
        const details: StudentDisplayDetail[] = studentData
            .filter((student: Student) => studentIds.includes(student.$id)) // Filter by Appwrite $id
            .map((student: Student) => {
                const faculty = facultyData.find((f) => f.$id === student.facultyId);
                return {
                    name: student.name,
                    faculty: faculty ? faculty.name : "N/A",
                    class: student.class,
                    section: student.section,
                    docId: student.$id, // This is the Appwrite document ID
                    customId: student.id, // Store the custom ID if needed for UI or direct use
                };
            });
        setSelectedStudentDetails(details);
    }, [studentIds, studentData, facultyData]);

    const handleOpenSavePopover = () => {
        if (currentUserLabel === 'Loading...') {
            setSaveError("User information is still loading. Please wait and try again.");
            setIsPopoverOpen(false);
            return;
        }
         if (currentUserLabel === 'System_Error') {
            setSaveError("Cannot save: User information could not be fetched. Please try reloading or contact support.");
            setIsPopoverOpen(false);
            return;
        }
        setSaveError(null); // Clear previous errors before opening
        setIsPopoverOpen(true);
    };

    const confirmSaveAttendance = async () => {
        setIsSaving(true);
        setSaveError(null);
        let operationsFailed = 0;
        let accumulatedErrors = "";

        try {
            const today = new Date().toISOString().slice(0, 10); // AD Date

            if (currentUserLabel === 'Loading...' || currentUserLabel === 'System_Error' || !currentUserLabel) {
                 const errorMsg = "Critical: Current user information is not available. Cannot proceed with marking absent and notifying.";
                 console.error(errorMsg);
                 setSaveError(errorMsg);
                 setIsSaving(false);
                 setIsPopoverOpen(false); // Close popover on critical failure
                 return;
            }

            for (const studentDetail of selectedStudentDetails) {
                // studentDetail.docId is the Appwrite Document ID ($id)
                console.log(`[Details.tsx] Processing student doc ID: ${studentDetail.docId} (Custom ID: ${studentDetail.customId || 'N/A'}) for date: ${today}`);
                try {
                    await markAbsent(
                        studentDetail.docId,    // Pass Appwrite Document ID ($id)
                        today,
                        studentData,            // Full studentData array from studentStore
                        updateStudentData,      // Update function from studentStore
                        createAppwriteNotification, // Appwrite function defined in this file
                        currentUserLabel        // Fetched current user label
                    );
                    console.log(`[Details.tsx] Successfully processed absence for student doc ID: ${studentDetail.docId}`);
                } catch (error: any) {
                    operationsFailed++;
                    const studentNameForError = studentDetail.name || `Doc ID: ${studentDetail.docId}`;
                    const errorMessage = `Failed for ${studentNameForError}: ${error.message || "Unknown error"}`;
                    console.error(`[Details.tsx] Error processing absence for ${studentNameForError}:`, error);
                    accumulatedErrors += (accumulatedErrors ? "\n" : "") + errorMessage;
                }
            }

            if (operationsFailed > 0) {
                setSaveError(accumulatedErrors);
                console.warn(`[Details.tsx] ${operationsFailed} student(s) failed during attendance saving. Check errors.`);
            } else {
                console.log("[Details.tsx] All attendance marked and notifications processed successfully!");
                // Optionally, show a success toast/message to the user here
            }

        } catch (error: any) { // Catch any unexpected errors from the loop itself or pre-loop logic
            console.error("[Details.tsx] General error during confirmSaveAttendance:", error);
            setSaveError(error.message || "An unexpected error occurred while saving attendance.");
        } finally {
            setIsSaving(false);
            // Keep popover open if there were errors, otherwise close it.
            // Or always close: setIsPopoverOpen(false);
            if (operationsFailed === 0 && !saveError) { // Only close if everything was successful
                setIsPopoverOpen(false);
            }
        }
    };

    return (
        <div className="px-6 pt-3 rounded-md flex flex-col h-full">
            {onBack && (
                <div className="mb-6">
                    <Button onPress={onBack} color="secondary" variant="flat">
                        Back to List
                    </Button>
                </div>
            )}

            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 pb-2">
                Attendance Details
            </h2>

            {selectedStudentDetails.length > 0 ? (
                <ul className="list-disc list-inside pl-5">
                    {selectedStudentDetails.map((student, index) => (
                        <li key={index} className="text-gray-700 mb-2">
                            {student.name} - Faculty: {student.faculty}, Class: {student.class}, Section: {student.section}
                            {/* You can display student.docId or student.customId here for debugging if needed */}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-600 italic">No students selected.</p>
            )}

            <div className="mt-auto pt-4"> {/* Added pt-4 for spacing */}
                <Button
                    color="primary"
                    onPress={handleOpenSavePopover}
                    isDisabled={isSaving || currentUserLabel === 'Loading...' || selectedStudentDetails.length === 0}
                >
                    {isSaving ? "Saving..." : "Save Attendance"}
                </Button>
            </div>
            <Popover
                isOpen={isPopoverOpen}
                onClose={() => { if (!isSaving) setIsPopoverOpen(false); }} // Prevent closing while saving
                onConfirm={confirmSaveAttendance}
                title="Confirm Save"
                content={
                    <>
                        Are you sure you want to mark the selected student(s) as absent for today?
                        <br /><br />
                        <p className="text-red-500 font-medium flex gap-3 items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="yellow" viewBox="0 0 24 24" strokeWidth={1.5} stroke="red" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                            This action cannot be undone. <br /> Re-check before confirm.
                        </p>
                        {saveError && <pre className="text-red-500 mt-2 whitespace-pre-wrap text-sm">{saveError}</pre>}
                    </>
                }
                isConfirmLoading={isSaving}
            />
        </div>
    );
};

export default Details;