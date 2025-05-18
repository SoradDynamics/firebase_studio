import React from 'react';
import { Button, Select, SelectItem, Input, Textarea } from "@heroui/react";
// Assuming Input and Textarea are available from @heroui/react.
// If not, replace with standard HTML <input> and <textarea> styled with Tailwind.

import Popover from '../../../../common/Popover'; // Adjust path if Popover.tsx is elsewhere
import { useLeaveFormStore, LeavePeriod } from '~/store/leaveStore'; // Adjust path
import {
  databases,
  account,
  ID,
  Query,
} from '~/utils/appwrite'; // Adjust path

import { format } from 'date-fns';
import NepaliDate from 'nepali-date-converter';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const NOTIFY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_NOTIFY_COLLECTION_ID;
const STUDENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID;
const PARENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID;

// --- Helper Types & Constants ---
interface StudentInfo {
  id: string;                         // Student's Appwrite document ID ($id)
  name: string;
  appwriteParentDocId: string | null; // Appwrite document ID of the parent record (from student.parentId)
  parentCustomId: string | null;      // The custom 'id' field from the parent's document
  currentLeaves: string[];            // Array of JSON strings representing leave objects
}

const leavePeriodOptions = [
  { key: "today", label: "Today" },
  { key: "halfDay", label: "Half Day" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "dateRange", label: "Date Range" },
];

// --- Date Helper Functions ---
const getCurrentBsDate = (): string => new NepaliDate().format('YYYY-MM-DD');
const getTomorrowBsDate = (): string => new NepaliDate(new Date(Date.now() + 86400000)).format('YYYY-MM-DD');
const getTomorrowAdDate = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return format(tomorrow, 'yyyy-MM-dd');
};

const LeaveForm: React.FC = () => {
  const {
    title, setTitle,
    reason, setReason,
    leavePeriod, setLeavePeriod,
    fromDateBS, setFromDateBS,
    toDateBS, setToDateBS,
    isPopoverOpen, openPopover, closePopover,
    isSubmitting, setSubmitting,
    resetForm,
  } = useLeaveFormStore();

  const [studentInfo, setStudentInfo] = React.useState<StudentInfo | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = React.useState(true);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchStudentData = async () => {
      setIsLoadingStudent(true);
      setFormError(null);
      try {
        const userAccount = await account.get();
        const studentDocs = await databases.listDocuments(
          DATABASE_ID,
          STUDENT_COLLECTION_ID,
          [Query.equal('stdEmail', userAccount.email)]
        );

        if (studentDocs.documents.length > 0) {
          const studentData = studentDocs.documents[0] as any; // Cast or define proper type
          console.log("Fetched studentData raw:", studentData);

          const leavesFromDB: any[] = studentData.leave || [];
          const validLeaveStrings: string[] = leavesFromDB.map(l => {
            if (typeof l === 'string') return l;
            if (typeof l === 'object' && l !== null) {
                console.warn("Found object in leave array from DB, attempting to stringify:", l);
                try { return JSON.stringify(l); } catch (e) { console.error("Could not stringify leave object from DB:", l, e); return ""; }
            }
            if (l !== null && l !== undefined && typeof l !== 'string') {
                console.warn(`Found non-string/non-object leave item from DB: ${l}, type: ${typeof l}. Attempting to convert to string.`);
                return String(l);
            }
            return "";
          }).filter(s => s !== "");

          let fetchedParentCustomId: string | null = null;
          const appwriteParentDocIdFromStudent = studentData.parentId || null;
          console.log("Appwrite Parent Document ID from student record:", appwriteParentDocIdFromStudent);


          if (appwriteParentDocIdFromStudent && typeof appwriteParentDocIdFromStudent === 'string' && appwriteParentDocIdFromStudent.trim() !== '') {
            try {
              console.log(`Fetching parent document with Appwrite ID: ${appwriteParentDocIdFromStudent} from collection: ${PARENT_COLLECTION_ID}`);
              const parentDoc = await databases.getDocument(DATABASE_ID, PARENT_COLLECTION_ID, appwriteParentDocIdFromStudent);
              
              // IMPORTANT: Check the actual field name for the custom ID in your parent collection.
              // Assuming it is literally 'id'. If it's 'parent_id' or something else, change parentDoc.id accordingly.
              if (parentDoc && parentDoc.id && typeof parentDoc.id === 'string') {
                fetchedParentCustomId = parentDoc.id;
                console.log("Fetched parent's custom ID:", fetchedParentCustomId);
              } else {
                console.warn(`Parent document ${appwriteParentDocIdFromStudent} fetched, but custom 'id' field is missing, not a string, or empty. Parent doc content:`, parentDoc);
              }
            } catch (parentError: any) {
              console.error(`Failed to fetch parent document (${appwriteParentDocIdFromStudent}) to get custom ID:`, parentError);
              if (parentError.code === 404) {
                console.warn(`Parent document with ID ${appwriteParentDocIdFromStudent} not found.`);
              }
              // Decide if this is a critical error that should prevent form submission
              // For now, parentCustomId will remain null, and notification might not be sent.
            }
          } else {
              console.log("No valid Appwrite Parent Document ID found in student record, or it's not a string. Cannot fetch parent's custom ID.");
          }

          setStudentInfo({
            id: studentData.$id, // Student's Appwrite document ID
            name: studentData.name,
            appwriteParentDocId: appwriteParentDocIdFromStudent,
            parentCustomId: fetchedParentCustomId,
            currentLeaves: validLeaveStrings,
          });

        } else {
          console.error("Student profile not found for logged-in user:", userAccount.email);
          setFormError("Student profile not found. Leave application unavailable.");
        }
      } catch (error: any) {
        console.error("Failed to fetch student or parent data:", error);
        setFormError(`Failed to load required data: ${error.message || 'Unknown error'}. Please try again.`);
      } finally {
        setIsLoadingStudent(false);
      }
    };
    fetchStudentData();
  }, []);

  const handleApplyClick = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !reason.trim() || !leavePeriod) {
      setFormError("Please fill in Title, Reason, and select a Leave Period.");
      return;
    }
    if (leavePeriod === 'dateRange') {
      if (!fromDateBS.trim() || !toDateBS.trim()) {
        setFormError("For 'Date Range', please provide From and To dates (BS).");
        return;
      }
      try {
        const from = new NepaliDate(fromDateBS);
        const to = new NepaliDate(toDateBS);
        if (from.getTime() > to.getTime()) {
          setFormError("From Date (BS) cannot be after To Date (BS).");
          return;
        }
        // Basic YYYY-MM-DD regex check, can be more robust
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(fromDateBS) || !dateRegex.test(toDateBS)) {
            setFormError("Date format must be YYYY-MM-DD for Bikram Sambat dates.");
            return;
        }

      } catch (err) {
        setFormError("Invalid Bikram Sambat date format or value. Please use YYYY-MM-DD.");
        return;
      }
    }
    openPopover();
  };

  const handleConfirmLeave = async () => {
    if (!studentInfo || !studentInfo.id) {
      setFormError("Student information or ID is missing. Cannot submit.");
      closePopover(); // Close popover as submission can't proceed
      return;
    }

    setSubmitting(true);
    setFormError(null);

    let leaveEntryObject: any;
    let leaveEntryString: string;
    let updatedLeaveStrings: string[] = [];
    let notificationPayload: any;

    try {
      leaveEntryObject = {
        leaveId: ID.unique(),
        title,
        reason,
        periodType: leavePeriod,
        appliedAt: new Date().toISOString(),
        status: "pending",
      };

      switch (leavePeriod) {
        case 'today': leaveEntryObject.date = getCurrentBsDate(); break;
        case 'halfDay': leaveEntryObject.date = getCurrentBsDate(); break;
        case 'tomorrow': leaveEntryObject.date = getTomorrowBsDate(); break;
        case 'dateRange':
          leaveEntryObject.fromDate = fromDateBS;
          leaveEntryObject.toDate = toDateBS;
          break;
        default: throw new Error("Invalid leave period selected for submission.");
      }

      leaveEntryString = JSON.stringify(leaveEntryObject);
      const currentLeaveStrings = studentInfo.currentLeaves.filter(l => typeof l === 'string');
      updatedLeaveStrings = [...currentLeaveStrings, leaveEntryString];

      console.log("Attempting to update student document with leave strings:", { leave: updatedLeaveStrings });
      await databases.updateDocument(DATABASE_ID, STUDENT_COLLECTION_ID, studentInfo.id, {
        leave: updatedLeaveStrings,
      });
      console.log("Student document updated successfully.");

      if (studentInfo.parentCustomId && typeof studentInfo.parentCustomId === 'string' && studentInfo.parentCustomId.trim() !== '') {
        notificationPayload = {
          title: "Leave Application",
          msg: `${studentInfo.name} has applied for leave.`,
          to: [`id:${studentInfo.parentCustomId}`], // Adding 'id:' prefix to parent's custom ID
          valid: getTomorrowAdDate(),
          sender: String(studentInfo.id),
          date: format(new Date(), 'yyyy-MM-dd HH:mm:ss'), // Max 19 chars
        };
        console.log("Attempting to create notification with payload:", notificationPayload);
        await databases.createDocument(
          DATABASE_ID,
          NOTIFY_COLLECTION_ID,
          ID.unique(),
          notificationPayload
        );
        console.log("Notification created successfully.");
      } else {
        console.warn("Skipping notification: Parent's custom ID is missing or not a valid string. StudentInfo:", studentInfo);
      }

      resetForm(); // This will close popover and reset submitting state
      setStudentInfo(prev => prev ? {...prev, currentLeaves: updatedLeaveStrings} : null);
      // Optionally, add a success toast/message here

    } catch (error: any) {
      console.error("---------------- ERROR SUBMITTING LEAVE ----------------");
      console.error("Error Code:", error.code);
      console.error("Error Message:", error.message);
      console.error("Error Type (Appwrite Specific):", error.type);
      console.error("Full Error Object:", JSON.stringify(error, null, 2)); // Stringify for better console view
      if (error.response) {
          console.error("Error Response from Server:", JSON.stringify(error.response, null, 2));
      }
      console.error("--- Data that might have caused the error ---");
      console.error("Student Info at time of error:", JSON.stringify(studentInfo, null, 2));
      console.error("Original Leave Entry Object (before stringify):", JSON.stringify(leaveEntryObject, null, 2));
      console.error("Stringified Leave Array for student collection (payload):", JSON.stringify({ leave: updatedLeaveStrings }, null, 2));
      if (notificationPayload) {
          console.error("Notification Payload (for notify collection):", JSON.stringify(notificationPayload, null, 2));
      }

      let userFriendlyMessage = `Submission failed: ${error.message || "Unknown error"}`;
      if (error.code) userFriendlyMessage += ` (Code: ${error.code})`;
      if (error.type) userFriendlyMessage += ` (Type: ${error.type})`;
      setFormError(userFriendlyMessage);
      // Keep popover open if an error occurs during submission so user sees the message
    } finally {
      // setSubmitting(false) is handled by resetForm on success, or here if error occurs before resetForm
      if (formError) { // If an error was set
        setSubmitting(false);
      }
    }
  };

  if (isLoadingStudent) {
    return <div className="p-6 text-center text-gray-600">Loading student information...</div>;
  }

  if (!studentInfo && formError && !isLoadingStudent) {
     return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="p-4 text-red-700 bg-red-100 border border-red-400 rounded-md">
          <h3 className="font-semibold">Error Loading Data</h3>
          <p>{formError}</p>
        </div>
      </div>
     );
  }
  if (!studentInfo) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center text-red-600">
        Could not load student data. The form is unavailable. Please try refreshing or contact support.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-white shadow-lg rounded-lg border border-gray-200">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 pb-4 border-b border-gray-200">Apply for Leave</h2>
      <form onSubmit={handleApplyClick} className="space-y-6">
        <div>
          <Input
            label="Title"
            placeholder="e.g., Sick Leave, Urgent Work"
            value={title}
            onValueChange={setTitle} // Assumes HeroUI uses this, else use onChange
            maxLength={20}
            isRequired
            fullWidth
            variant="bordered"
            description={`${title.length}/20 characters`}
          />
        </div>

        <div>
          <Textarea
            label="Reason / For"
            placeholder="Briefly explain the reason for your leave"
            value={reason}
            onValueChange={setReason} // Assumes HeroUI uses this
            maxLength={40}
            isRequired
            fullWidth
            variant="bordered"
            minRows={3}
            description={`${reason.length}/40 characters`}
          />
        </div>

        <div>
          <Select
            label="Leave Period"
            placeholder="Select leave duration"
            selectedKeys={leavePeriod ? [leavePeriod] : []}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys as Set<React.Key>)[0]; // React.Key for broader type
              setLeavePeriod(selectedKey as LeavePeriod || '');
            }}
            isRequired
            fullWidth
            variant="bordered"
          >
            {leavePeriodOptions.map((option) => (
              <SelectItem key={option.key} value={option.key} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
        </div>

        {leavePeriod === 'dateRange' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="From Date (BS)"
                placeholder="YYYY-MM-DD"
                value={fromDateBS}
                onValueChange={setFromDateBS}
                isRequired={leavePeriod === 'dateRange'}
                fullWidth
                variant="bordered"
                description="Bikram Sambat format"
              />
            </div>
            <div>
              <Input
                label="To Date (BS)"
                placeholder="YYYY-MM-DD"
                value={toDateBS}
                onValueChange={setToDateBS}
                isRequired={leavePeriod === 'dateRange'}
                fullWidth
                variant="bordered"
                description="Bikram Sambat format"
              />
            </div>
          </div>
        )}

        {formError && !isPopoverOpen && ( // Show form error only if popover is not open (popover has its own error display space)
          <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md" role="alert">
            <strong className="font-semibold">Error: </strong>{formError}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            color="primary"
            variant="solid"
            size="lg"
            isDisabled={isSubmitting} // Disable if popover is processing
          >
            Apply for Leave
          </Button>
        </div>
      </form>

      <Popover
        isOpen={isPopoverOpen}
        onClose={() => {
            if (!isSubmitting) closePopover();
        }}
        onConfirm={handleConfirmLeave}
        title={<span className="text-indigo-700 font-semibold">Confirm Leave Application</span>}
        content={
            <div className="space-y-3">
                <p className="text-gray-700">Please review your leave details before confirming:</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-md">
                    <li><strong>Title:</strong> {title || <span className="italic text-gray-400">Not set</span>}</li>
                    <li><strong>Reason:</strong> {reason || <span className="italic text-gray-400">Not set</span>}</li>
                    <li><strong>Period:</strong> {leavePeriodOptions.find(o => o.key === leavePeriod)?.label || <span className="italic text-gray-400">Not selected</span>}</li>
                    {leavePeriod === 'dateRange' && (
                        <>
                            <li><strong>From (BS):</strong> {fromDateBS || <span className="italic text-gray-400">Not set</span>}</li>
                            <li><strong>To (BS):</strong> {toDateBS || <span className="italic text-gray-400">Not set</span>}</li>
                        </>
                    )}
                </ul>
                {formError && isPopoverOpen && ( // Show submission error within popover
                    <div className="p-2 text-xs text-red-700 bg-red-100 border border-red-300 rounded-md">
                        <strong className="font-semibold">Error: </strong>{formError}
                    </div>
                )}
                <p className="mt-3 text-gray-700">Are you sure you want to submit this application?</p>
            </div>
        }
        isConfirmLoading={isSubmitting}
      />
    </div>
  );
};

export default LeaveForm;