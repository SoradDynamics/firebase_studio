// src/components/parent/LeaveValidate.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSelectedStudent } from '../../contexts/SelectedStudentContext'; // Adjust path
import { Student, LeaveEntry, LeaveStatus } from 'types/models'; // Adjust path
import { databases, ID } from '~/utils/appwrite'; // Adjust path
import { Button, Textarea } from '@heroui/react';
import {
  CheckCircleIcon, XCircleIcon, ClockIcon, PaperAirplaneIcon, ArrowPathIcon,
  CalendarDaysIcon, ChatBubbleLeftEllipsisIcon, InformationCircleIcon,
} from '@heroicons/react/24/outline';
import Popover from '../../../../common/Popover'; // Adjust path
import ActionButton from '../../../../common/ActionButton'; // Adjust path
import PerfectScrollbar from 'react-perfect-scrollbar';

// Appwrite Collection IDs
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID as string;
const STUDENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID as string;
const NOTIFY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_NOTIFY_COLLECTION_ID as string;

// --- HELPER FUNCTIONS ---
const parseLeaveEntries = (leaveStrings: string[] | undefined): LeaveEntry[] => {
  if (!leaveStrings) return [];
  return leaveStrings.map(str => {
    try { return JSON.parse(str) as LeaveEntry; } catch (e) { console.error("LV: Failed to parse leave string:", str, e); return null; }
  }).filter(Boolean) as LeaveEntry[];
};

const getTomorrowAdDate = (): string => {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); return tomorrow.toISOString().split('T')[0];
};

const formatDateForNotification = (date: Date): string => {
    const year = date.getFullYear(); const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0'); const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0'); const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const formatDateUI = (dateString?: string, includeTime: boolean = false) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString; // BS Date
            throw new Error("Invalid date string");
        }
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; options.hour12 = true; }
        return date.toLocaleDateString(undefined, options);
    } catch (e) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString; // Fallback for BS Date
        console.error("Error formatting date for UI (LeaveValidate):", dateString, e);
    }
    return dateString;
};

const getStatusPillParentView = (status: LeaveStatus) => {
  let bgColor = 'bg-gray-100'; let textColor = 'text-gray-800'; let IconComponent = InformationCircleIcon;
  let text = status.charAt(0).toUpperCase() + status.slice(1);

  switch (status) {
    case 'pending':
      bgColor = 'bg-yellow-100'; textColor = 'text-yellow-700'; IconComponent = ClockIcon; text = "Awaiting Action";
      break;
    case 'validated':
      bgColor = 'bg-sky-100'; textColor = 'text-sky-700'; IconComponent = CheckCircleIcon; text = "You Validated";
      break;
    case 'rejected':
      bgColor = 'bg-red-100'; textColor = 'text-red-700'; IconComponent = XCircleIcon; text = "You Rejected";
      break;
    case 'approved':
      bgColor = 'bg-green-100'; textColor = 'text-green-700'; IconComponent = CheckCircleIcon; text = "Admin Approved";
      break;
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${bgColor} ${textColor} whitespace-nowrap`}>
      <IconComponent className={`h-4 w-4 mr-1.5`} />
      {text}
    </span>
  );
};
// --- END HELPER FUNCTIONS ---

interface ActionPopoverState {
  isOpen: boolean;
  leaveId: string | null;
  actionType: 'validate' | 'reject' | null;
  rejectionReason?: string;
}

const LeaveValidate: React.FC = () => {
  const { selectedStudentId } = useSelectedStudent();
  const [student, setStudent] = useState<Student | null>(null);
  const [leaveEntries, setLeaveEntries] = useState<LeaveEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [actionPopover, setActionPopover] = useState<ActionPopoverState>({
    isOpen: false, leaveId: null, actionType: null, rejectionReason: '',
  });

  const fetchStudentLeaveData = useCallback(async (showLoadingSpinner = true) => {
    if (!selectedStudentId) { setStudent(null); setLeaveEntries([]); setError(null); return; }
    if (showLoadingSpinner) setIsLoading(true); setError(null);
    try {
      const studentDoc = await databases.getDocument<Student>(DATABASE_ID, STUDENT_COLLECTION_ID, selectedStudentId);
      console.log("LV: Fetched Student Document:", studentDoc); // For debugging
      setStudent(studentDoc);
      const parsedEntries = parseLeaveEntries(studentDoc.leave);
      const relevantEntries = parsedEntries.filter(
        entry => ['pending', 'validated', 'rejected', 'approved'].includes(entry.status)
      ).sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
      setLeaveEntries(relevantEntries);
    } catch (err: any) { console.error("LV: Error fetching student data:", err); setError(err.message || "Failed to load applications."); setStudent(null); setLeaveEntries([]);
    } finally { if (showLoadingSpinner) setIsLoading(false); }
  }, [selectedStudentId]);

  useEffect(() => { fetchStudentLeaveData(); }, [fetchStudentLeaveData]);

  const handleReload = () => { fetchStudentLeaveData(true); };

  const createNotification = async (st: Student, title: string, act: 'validated' | 'rejected', reason?: string) => {
    const studentRecipientId = st.id; // CUSTOM ID from coll-student.id
    if (!studentRecipientId) { console.warn("LV: Student custom ID missing for notification.", st); return; }
    if (!NOTIFY_COLLECTION_ID) { console.warn("LV: Notify Collection ID missing (VITE_APPWRITE_NOTIFY_COLLECTION_ID)."); return; }
    if (!st.parentId) { console.warn("LV: Parent ID (sender) missing from student.", st); return; }

    let msg = `Your leave application for "${title}" has been ${act} by your parent.`;
    if (act === 'rejected' && reason) msg += ` Reason: ${reason}`;
    else if (act === 'rejected') msg += ` Please see details or contact them.`;

    const payload = { title: `Leave Application ${act.charAt(0).toUpperCase() + act.slice(1)}`, msg, to: [String(studentRecipientId)], valid: getTomorrowAdDate(), sender: String(st.parentId), date: formatDateForNotification(new Date()) };
    try {
      console.log("LV: Creating notification:", payload);
      await databases.createDocument(DATABASE_ID, NOTIFY_COLLECTION_ID, ID.unique(), payload);
      console.log(`LV: Notification for ${act} sent.`);
    } catch (e) { console.error(`LV: Failed to send ${act} notification:`, e); }
  };

  const handleLeaveAction = async () => {
    if (!student || !actionPopover.leaveId || !actionPopover.actionType) return;
    setIsUpdating(actionPopover.leaveId);
    const { leaveId, actionType, rejectionReason } = actionPopover;
    let originalEntry: LeaveEntry | undefined;

    const updatedStrings = (student.leave || []).map(s => {
      try {
        const entry = JSON.parse(s) as LeaveEntry;
        if (entry.leaveId === leaveId) {
          originalEntry = { ...entry };
          const updated: LeaveEntry = { ...entry };
          if (actionType === 'validate') { updated.status = 'validated'; updated.validatedAt = new Date().toISOString(); }
          else if (actionType === 'reject') {
            updated.status = 'rejected'; updated.rejectedAt = new Date().toISOString();
            if (rejectionReason?.trim()) updated.rejectionReason = rejectionReason.trim(); else delete updated.rejectionReason;
          }
          return JSON.stringify(updated);
        }
        return s;
      } catch (e) { console.error("LV: Error processing leave string:", e); return s; }
    });

    try {
      await databases.updateDocument(DATABASE_ID, STUDENT_COLLECTION_ID, student.$id, { leave: updatedStrings });
      const newParsed = parseLeaveEntries(updatedStrings);
      const newRelevant = newParsed.filter(e => ['pending', 'validated', 'rejected', 'approved'].includes(e.status)).sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
      setLeaveEntries(newRelevant);
      setStudent(prev => prev ? { ...prev, leave: updatedStrings } : null);
      if (originalEntry && student) { // Ensure student object is available
        if (actionType === 'validate') await createNotification(student, originalEntry.title, 'validated');
        else if (actionType === 'reject') await createNotification(student, originalEntry.title, 'rejected', rejectionReason?.trim());
      }
    } catch (e: any) { console.error(`LV: Failed to ${actionType} leave:`, e); setError(e.message || "Update failed.");
    } finally { setIsUpdating(null); closeActionPopover(); }
  };

  const openActionPopover = (leaveId: string, action: 'validate' | 'reject') => setActionPopover({ isOpen: true, leaveId, actionType: action, rejectionReason: '' });
  const closeActionPopover = () => setActionPopover({ isOpen: false, leaveId: null, actionType: null, rejectionReason: '' });

  // ---- RENDER LOGIC ----
  if (!selectedStudentId) {
    return (
      <div className="mt-6 p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center">
        <PaperAirplaneIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-3 text-lg font-medium text-gray-800">Validate Leave Applications</h3>
        <p className="mt-1.5 text-sm text-gray-600">
          Select a student to view and manage their leave applications.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center px-1 mb-6 gap-3">
        <h3 className="text-xl font-semibold text-slate-800">
          Leave Requests for {student?.name || '...'}
        </h3>
        <ActionButton
          icon={<ArrowPathIcon className="h-5 w-5" />} onClick={handleReload}
          isIconOnly={true}
        />
      </div>

      {isLoading && leaveEntries.length === 0 ? (
         <div className="animate-pulse space-y-6">
          {[...Array(2)].map((_, i) => ( <div key={i} className="bg-gray-200 p-6 rounded-xl shadow-lg h-72"></div> ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md shadow">
          <p><strong className="font-semibold">Error:</strong> {error}</p>
        </div>
      ) : leaveEntries.length === 0 && !isLoading ? (
         <div className="text-center py-16 sm:py-20 bg-white rounded-xl shadow-lg">
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
            <h3 className="mt-4 text-xl font-semibold text-slate-700">All Clear!</h3>
            <p className="mt-2 text-md text-slate-500">No actionable leave applications for {student?.name || 'this student'}.</p>
        </div>
      ) : (
        <PerfectScrollbar
          options={{ suppressScrollX: true, wheelSpeed: 0.5 }}
          className="pr-2 -mr-2"
          style={{ maxHeight: 'calc(100vh - 280px)', /* Adjust offset as needed */ }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {leaveEntries.map((leave) => (
              <div key={leave.leaveId} className={`bg-white rounded-xl shadow-xl hover:shadow-2xl transition-shadow duration-300 overflow-hidden flex flex-col group
                ${isUpdating === leave.leaveId ? 'opacity-60 cursor-wait' : 'opacity-100'}`}
              >
                <div className={`px-5 py-4 border-l-4 ${
                    leave.status === 'approved' ? 'border-green-500' :
                    leave.status === 'rejected' ? 'border-red-500' :
                    leave.status === 'validated' ? 'border-sky-500' :
                    leave.status === 'pending' ? 'border-yellow-500' :
                    'border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <h3 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors duration-200">
                      {leave.title}
                    </h3>
                    {getStatusPillParentView(leave.status)}
                  </div>
                </div>

                <div className="px-5 py-4 flex-grow space-y-3.5">
                  <div className="flex items-start">
                    <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Reason</span>
                      <p className="text-sm text-slate-700 leading-relaxed">{leave.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CalendarDaysIcon className="h-5 w-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Period</span>
                      <p className="text-sm text-slate-700">
                        {leave.periodType === 'dateRange'
                          ? `${(leave.fromDate)} to ${(leave.toDate)}`
                          : `${(leave.date)} ${leave.periodType === 'halfDay' ? '(Half Day)' : `(${leave.periodType.charAt(0).toUpperCase() + leave.periodType.slice(1)})`}`
                        }
                      </p>
                    </div>
                  </div>
                  
                  {leave.status === 'rejected' && leave.rejectionReason && (
                     <div className="mt-2 pt-2 border-t border-slate-100">
                       <div className="flex items-start">
                        <XCircleIcon className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="block text-xs font-medium text-red-500 uppercase tracking-wider">Your Rejection Reason</span>
                            <p className="text-sm text-red-700 leading-relaxed">{leave.rejectionReason}</p>
                        </div>
                      </div>
                    </div>
                  )}
                   {leave.status === 'validated' && leave.validatedAt && (
                     <div className="mt-2">
                        <p className="text-xs text-sky-600">
                            <span className="font-medium">You Validated:</span> {(leave.validatedAt, true)}
                        </p>
                     </div>
                   )}
                   {leave.status === 'approved' && leave.approvedAt && (
                     <div className="mt-2">
                        <p className="text-xs text-green-600">
                            <span className="font-medium">Admin Approved:</span> {(leave.approvedAt, true)}
                        </p>
                     </div>
                   )}
                </div>
                
                {leave.status === 'pending' && (
                  <div className="px-5 pt-3 pb-4 border-t border-slate-100 bg-slate-50">
                    <div className="flex flex-col sm:flex-row justify-end gap-2">
                      <Button
                        variant="flat" color="danger" size="sm"
                        onPress={() => openActionPopover(leave.leaveId, 'reject')}
                        isLoading={isUpdating === leave.leaveId && actionPopover.actionType === 'reject'}
                        isDisabled={!!isUpdating}
                        className="w-full sm:w-auto"
                      > <XCircleIcon className="h-4 w-4 mr-1.5"/> Reject </Button>
                      <Button
                        variant="solid" color="success" size="sm"
                        onPress={() => openActionPopover(leave.leaveId, 'validate')}
                        isLoading={isUpdating === leave.leaveId && actionPopover.actionType === 'validate'}
                        isDisabled={!!isUpdating}
                        className="w-full sm:w-auto"
                      > <CheckCircleIcon className="h-4 w-4 mr-1.5"/> Validate </Button>
                    </div>
                  </div>
                )}
                 <div className="bg-slate-100 px-5 py-2.5 text-xs text-slate-500 border-t border-slate-200 mt-auto">
                  Applied on: {(leave.appliedAt, true)}
                </div>
              </div>
            ))}
          </div>
        </PerfectScrollbar>
      )}
      <Popover
        isOpen={actionPopover.isOpen}
        onClose={closeActionPopover}
        onConfirm={handleLeaveAction}
        title={
          <span className={`font-semibold ${actionPopover.actionType === 'reject' ? 'text-red-600' : 'text-green-700'}`}>
            {actionPopover.actionType === 'reject' ? 'Confirm Rejection' : 'Confirm Validation'}
          </span>
        }
        content={
          <div>
            <p className="mb-3 text-gray-600">
              Are you sure you want to {actionPopover.actionType} this leave application?
            </p>
            {actionPopover.actionType === 'reject' && (
              <div>
                <Textarea
                  label="Reason for Rejection (Optional):"
                  value={actionPopover.rejectionReason}
                  onValueChange={(val) => setActionPopover(prev => ({ ...prev, rejectionReason: val }))}
                  placeholder="Enter reason..."
                  minRows={2}
                  fullWidth
                  variant="bordered"
                  className="mt-2"
                />
              </div>
            )}
          </div>
        }
        isConfirmLoading={!!isUpdating}
      />
    </div>
  );
};

export default LeaveValidate;