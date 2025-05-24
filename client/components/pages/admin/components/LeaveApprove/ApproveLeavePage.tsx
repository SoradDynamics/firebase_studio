// src/pages/admin/ApproveLeavePage.tsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Button, Input } from '@heroui/react';
import { ArrowDownTrayIcon, XCircleIcon as CancelIcon, ArrowPathIcon as RefreshIcon } from '@heroicons/react/24/outline';

import useLeaveApprovalStore from '~/store/leaveApprovalStore';
import {
  getAllStudents,
  getAllFaculties,
  getAllSections,
  updateStudentLeaveData,
  // createNotification, // No longer using this from appwriteService for this purpose
  // getCurrentUserEmail // We will import this directly from ~/utils/appwrite
} from './appwriteService'; // Assuming this path is correct

// Import getCurrentUserEmail directly
import { getCurrentUserEmail } from '~/utils/appwrite';

// Import the new notification service
import { createNotificationEntry, getTomorrowDateString, NotificationData } from '~/utils/notification'; // Adjust path if necessary

import LeaveRequestCard from '../../../common/LeaveApprove/LeaveRequestCard';
import SearchBar from '../../../common/SearchBar';
import Popover from '../../../common/PopoverRed';
import ActionButton from '../../../../common/ActionButton';
import CustomSelect, { SelectOption } from '../../../common/CustomSelect';
// Remove NotificationPayload from types import if it's only for the old system
import { StudentDocument, Leave, ModifiedLeave } from 'types';

const ApproveLeavePage: React.FC = () => {
  const {
    displayableLeaveRequests,
    totalProcessedLeavesCount,
    currentlyDisplayedCount,
    modifiedLeaves,
    isLoading,
    isFetchingMore,
    error,
    filters,
    faculties,
    sections,
    classes,
    setLoading,
    setError,
    initializeAllLeaveData, // This comes from the store
    setFilter,
    updateLeaveStatus,
    resetModifications,
    clearModifications,
    hasPendingChanges,
    getLeaveById,
    loadMoreLeaves,
  } = useLeaveApprovalStore();

  const [isConfirmPopoverOpen, setIsConfirmPopoverOpen] = useState(false);
  const [rejectionReasonPrompt, setRejectionReasonPrompt] = useState<{ leaveId: string; studentId: string; isOpen: boolean }>({
    leaveId: '',
    studentId: '',
    isOpen: false,
  });
  const [currentRejectionReason, setCurrentRejectionReason] = useState('');
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLElement | null) => {
    if (isLoading || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && currentlyDisplayedCount < totalProcessedLeavesCount) {
        loadMoreLeaves();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isFetchingMore, loadMoreLeaves, currentlyDisplayedCount, totalProcessedLeavesCount]);


  const fetchData = useCallback(async (isRefresh = false) => {
    const isInitialLoad = !useLeaveApprovalStore.getState().allStudents.length && !isRefresh;

    if (isInitialLoad) setLoading(true);
    else if (isRefresh) setIsApplyingChanges(true);
    setError(null);

    try {
      // For this Admin version, we fetch all data without teacher-specific logic
      const [studentsData, facultiesData, sectionsData] = await Promise.all([
        getAllStudents(),
        getAllFaculties(),
        getAllSections(),
      ]);

      // Get current user's email for the store, if needed by other parts or for consistency
      const userEmailForStore = await getCurrentUserEmail();

      useLeaveApprovalStore.getState().setInitialData({
        students: studentsData,
        allFacultiesFromDB: facultiesData,
        allSectionsFromDB: sectionsData,
        userEmail: userEmailForStore, // Pass email to store
        teacherDoc: null, // Admin context
        assignedSectionIdsForTeacher: [],
        assignedSectionsDataForTeacher: [],
      });
      // initializeAllLeaveData(); // This is called within setInitialData in the store
    } catch (err) {
      console.error("Error fetching data for Admin page:", err);
      setError('Failed to load admin data. Please try again.');
    } finally {
      if (isInitialLoad) setLoading(false);
      if (isRefresh) setIsApplyingChanges(false);
    }
  }, [setLoading, setError /* initializeAllLeaveData removed as it's in store */]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    if (hasPendingChanges()) {
        if (!window.confirm("You have unsaved changes. Are you sure you want to refresh and discard them?")) {
            return;
        }
        resetModifications();
    }
    fetchData(true);
  };

  const handleApprove = (leaveId: string, studentId: string) => {
    updateLeaveStatus(leaveId, studentId, 'approved');
  };

  const handleRequestReject = (leaveId: string, studentId: string) => {
    setRejectionReasonPrompt({ leaveId, studentId, isOpen: true });
    const currentLeave = getLeaveById(leaveId);
    setCurrentRejectionReason(currentLeave?.rejectionReason || '');
  };

  const confirmReject = () => {
    if (!rejectionReasonPrompt.leaveId) return;
    if (!currentRejectionReason.trim()) {
        alert("Rejection reason cannot be empty.");
        return;
    }
    updateLeaveStatus(rejectionReasonPrompt.leaveId, rejectionReasonPrompt.studentId, 'rejected', currentRejectionReason);
    setRejectionReasonPrompt({ leaveId: '', studentId: '', isOpen: false });
    setCurrentRejectionReason('');
  };

  const handleApplyChanges = async () => {
    setIsConfirmPopoverOpen(false);
    if (modifiedLeaves.size === 0) {
      alert("No changes to apply.");
      return;
    }
    setIsApplyingChanges(true);
    setError(null);

    let successCount = 0;
    let errorCount = 0;
    const studentsToUpdate: Map<string, { doc: StudentDocument, newLeaveArray: string[] }> = new Map();
    // Use NotificationData from the new service
    const notificationPayloads: NotificationData[] = [];

    const loggedInUserEmail = await getCurrentUserEmail();
    if (!loggedInUserEmail) {
        console.error("[AdminApplyChanges] Could not get logged-in user email for notification sender.");
        setError("Could not identify current user for sending notifications. Please try again.");
        setIsApplyingChanges(false);
        return;
    }
    const senderEmail = loggedInUserEmail; // Use this as the sender
    const adminRoleName = 'Admin'; // For admin page, sender is 'Admin'

    const tomorrowStr = getTomorrowDateString();
    const allStudentsInStore = useLeaveApprovalStore.getState().allStudents;

    for (const modifiedLeave of modifiedLeaves.values()) {
      let studentDocEntry = studentsToUpdate.get(modifiedLeave.studentId);
      if (!studentDocEntry) {
        const originalStudentDoc = allStudentsInStore.find(s => s.$id === modifiedLeave.studentId);
        if (originalStudentDoc) {
          const copiedDoc = JSON.parse(JSON.stringify(originalStudentDoc));
          studentDocEntry = { doc: copiedDoc, newLeaveArray: [...copiedDoc.leave] };
          studentsToUpdate.set(modifiedLeave.studentId, studentDocEntry);
        } else {
          console.error(`[AdminApplyChanges] Student ${modifiedLeave.studentId} not found for leave ${modifiedLeave.leaveId}`);
          errorCount++;
          continue;
        }
      }

      const leaveIndex = studentDocEntry.newLeaveArray.findIndex(leaveStr => {
        try { return JSON.parse(leaveStr).leaveId === modifiedLeave.leaveId; } catch { return false; }
      });

      if (leaveIndex !== -1) {
        try {
          const leaveObj = JSON.parse(studentDocEntry.newLeaveArray[leaveIndex]);
          leaveObj.status = modifiedLeave.status;
          // Add rejectedBy/approvedBy fields for admin actions
          if (modifiedLeave.status === 'rejected') {
            leaveObj.rejectionReason = modifiedLeave.rejectionReason;
            leaveObj.rejectedAt = modifiedLeave.rejectedAt || new Date().toISOString();
            leaveObj.rejectedBy = adminRoleName; // Admin rejected
            delete leaveObj.approvedAt; delete leaveObj.approvedBy;
          } else if (modifiedLeave.status === 'approved') {
            delete leaveObj.rejectionReason; delete leaveObj.rejectedAt; delete leaveObj.rejectedBy;
            leaveObj.approvedAt = modifiedLeave.approvedAt || new Date().toISOString();
            leaveObj.approvedBy = adminRoleName; // Admin approved
          } else { // e.g. pending
            delete leaveObj.rejectionReason; delete leaveObj.rejectedAt; delete leaveObj.rejectedBy;
            delete leaveObj.approvedAt; delete leaveObj.approvedBy;
          }
          studentDocEntry.newLeaveArray[leaveIndex] = JSON.stringify(leaveObj);

          // Prepare notification payload using NotificationData interface
          const notificationTitle = `Leave application ${modifiedLeave.status}`;
          const notificationMsg = `Your leave request for "${modifiedLeave.title}" (${modifiedLeave.periodType === 'today' ? modifiedLeave.date : `${modifiedLeave.fromDate} to ${modifiedLeave.toDate}`}) has been ${modifiedLeave.status} by Admin.` +
                                (modifiedLeave.status === 'rejected' && modifiedLeave.rejectionReason ? ` Reason: ${modifiedLeave.rejectionReason}` : '');
          
          const targetStudentIdentifier = modifiedLeave.studentId; // Student document $id

          notificationPayloads.push({
            title: notificationTitle,
            msg: notificationMsg,
            to: [targetStudentIdentifier], // Array of student ID(s)
            valid: tomorrowStr,
            sender: senderEmail, // Logged-in admin's email
          });
        } catch (e) {
          console.error("[AdminApplyChanges] Error processing leave for update:", modifiedLeave.leaveId, e);
          errorCount++;
        }
      } else {
        console.warn(`[AdminApplyChanges] Leave ${modifiedLeave.leaveId} not found in student ${modifiedLeave.studentId}'s leave array for update.`);
      }
    }

    // Update student documents
    const updatePromises = Array.from(studentsToUpdate.entries()).map(
      async ([studentId, { newLeaveArray }]) => {
        try {
          await updateStudentLeaveData(studentId, newLeaveArray);
          successCount++;
        } catch (e) {
          console.error(`[AdminApplyChanges] Failed to update student ${studentId}`, e);
          errorCount++;
        }
      }
    );
    await Promise.all(updatePromises);
    
    // Send notifications using the new service
    console.log(`[AdminApplyChanges] Preparing to send ${notificationPayloads.length} notifications.`);
    const notificationCreationPromises = notificationPayloads.map(payload =>
      createNotificationEntry(payload).catch(e => {
        console.error(`[AdminApplyChanges] Failed to send notification for title "${payload.title}" to "${payload.to.join(', ')}":`, e);
        // Optionally count notification errors separately or add to general errorCount
      })
    );
    await Promise.all(notificationCreationPromises);

    if (errorCount > 0) {
      setError(`Applied ${successCount} changes with ${errorCount} errors during student data update. Check console.`);
    } else if (successCount > 0) {
      alert(`Successfully applied ${successCount} changes. Notifications processed.`);
    } else {
       alert("No changes were applied. This might indicate an issue or no actual modifications were made.");
    }

    clearModifications();
    await fetchData(true); 

    setIsApplyingChanges(false);
  };

  const groupedLeaves = useMemo(() => {
    const groups: { [bsDateKey: string]: Leave[] } = {};
    displayableLeaveRequests.forEach(leave => {
      const bsDateKey = leave.periodType === 'today' ? leave.date : leave.fromDate;
      if (!bsDateKey) {
        console.warn("Leave object missing date/fromDate:", leave);
        return; 
      }
      if (!groups[bsDateKey]) {
        groups[bsDateKey] = [];
      }
      groups[bsDateKey].push(leave);
    });
    return Object.entries(groups).sort(([dateA_BS], [dateB_BS]) => {
      if (!dateA_BS) return 1; if (!dateB_BS) return -1; // Handle null/undefined dates
      if (dateA_BS > dateB_BS) return -1;
      if (dateA_BS < dateB_BS) return 1;
      return 0;
    });
  }, [displayableLeaveRequests]);
  
  const facultyOptions: SelectOption[] = useMemo(() => 
    faculties.map(f => ({ id: f.$id, name: f.name })), 
    [faculties]
  );
  
  const classOptions: SelectOption[] = useMemo(() => 
    classes.map(c => ({ id: c, name: c })),
    [classes]
  );

  // For Admin, sections filter is based on all sections in the store
  const sectionOptions: SelectOption[] = useMemo(() => 
    sections // `sections` from store should be all sections for admin
      .filter(sec => !filters.class || sec.class === filters.class)
      .map(sec => ({ id: sec.$id, name: `${sec.name} (Class ${sec.class})` })),
    [sections, filters.class]
  );


  if (isLoading && displayableLeaveRequests.length === 0 && !error) {
    return <div className="p-6 text-center text-lg font-semibold text-gray-700">Loading leave requests...</div>;
  }
  if (error && !isApplyingChanges) {
    return (
        <div className="p-6 text-center text-red-600">
            <p className="text-lg mb-2">Error: {error}</p>
            <Button color="danger" variant="ghost" onPress={() => fetchData(true)}>Retry Loading Data</Button>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-100 min-h-screen pb-24"> {/* Added padding-bottom */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Leave Approval Dashboard (Admin)</h1>
        <ActionButton
            icon={<RefreshIcon className="h-5 w-5"/>}
            onClick={handleRefresh}
            color="blue" // Consistent color
            isIconOnly={true}
            buttonText="Refresh Data"
            disabled={isApplyingChanges || isLoading}
        />
      </div>

      {/* Filters: Admin page typically has all filters enabled */}
      <div className="mb-6 p-4 items-end bg-white shadow-md rounded-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <SearchBar
          placeholder="Search leave title, reason, student..."
          value={filters.searchText}
          onValueChange={(value) => setFilter('searchText', value)}
          className="w-full" // Ensure it takes full width of its grid cell
          inputClassName="text-sm"
        />
        <CustomSelect
          label="Filter by Faculty"
          placeholder="All Faculties"
          options={facultyOptions}
          value={filters.facultyId}
          onChange={(selectedId) => setFilter('facultyId', selectedId as string | null)}
          className="w-full"
          size="md"
        />
        <CustomSelect
          label="Filter by Class"
          placeholder="All Classes"
          options={classOptions}
          value={filters.class}
          onChange={(selectedId) => setFilter('class', selectedId as string | null)}
          className="w-full"
          size="md"
        />
        {/* Admin can also filter by section */}
         <CustomSelect
          label="Filter by Section"
          placeholder="All Sections"
          options={sectionOptions}
          value={filters.section} // This will be section $id
          onChange={(selectedId) => setFilter('section', selectedId as string | null)}
          className="w-full"
          size="md"
          isDisabled={sectionOptions.length === 0} // Disable if no sections available after class filter
        />
      </div>

      {(isLoading && displayableLeaveRequests.length > 0 && !isApplyingChanges) && (
        <div className="text-center p-4 text-gray-600">Applying filters or loading initial view...</div>
      )}
      
      {groupedLeaves.length === 0 && !isLoading && !isFetchingMore && (
        <div className="text-center text-gray-500 py-10 bg-white shadow rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 mx-auto mb-4 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.131.094 1.976 1.057 1.976 2.192V7.5m0 4.5h.008m-1.008 0H7.5a2.25 2.25 0 0 0-2.25 2.25v.75c0 1.108.892 2.006 1.996 2.006H12c1.104 0 1.996-.898 1.996-2.006v-.75a2.25 2.25 0 0 0-2.25-2.25H7.5m8.25-4.5h.008M12 10.5h.008m-3.75 0h.008m0 0h.008m2.742 0H12m4.5 0h.008m-1.008 0H12a2.25 2.25 0 0 0-2.25 2.25v.75M7.5 10.5h.008M12 7.5h.008m2.242 0H12m0 0h.008M12 7.5a2.25 2.25 0 0 0-2.25 2.25v.75" />
            </svg>
            <p className="text-xl">No leave requests found.</p>
            <p className="text-sm">Try adjusting your filters or check back later.</p>
             {useLeaveApprovalStore.getState().allStudents.length > 0 && displayableLeaveRequests.length === 0 && (
                <p className="text-sm mt-2 text-orange-600">Students found, but no leave applications match current filters or exist.</p>
            )}
        </div>
      )}

      {groupedLeaves.map(([bsDateString, leavesInGroup]) => (
        <div key={bsDateString || 'unknown-date'} className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4 pb-2 border-b-2 border-indigo-600">
            {bsDateString || "Unspecified Date"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {leavesInGroup.map((leave) => {
                const modifiedVersion = modifiedLeaves.get(leave.leaveId);
                const displayLeave = modifiedVersion || leave;
                return (
                    <LeaveRequestCard
                        key={displayLeave.leaveId + '-' + (modifiedVersion ? 'mod-' : '') + displayLeave.status}
                        leave={displayLeave}
                        onApprove={() => handleApprove(displayLeave.leaveId, displayLeave.studentId)}
                        onReject={() => handleRequestReject(displayLeave.leaveId, displayLeave.studentId)}
                        isModified={!!modifiedVersion}
                        originalStatus={modifiedVersion?.originalStatus || leave.status}
                    />
                );
            })}
          </div>
        </div>
      ))}

      {currentlyDisplayedCount < totalProcessedLeavesCount && !isFetchingMore && !isLoading && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          <Button variant="ghost" color="primary" onPress={loadMoreLeaves} isLoading={isFetchingMore}>
            Load More ({totalProcessedLeavesCount - currentlyDisplayedCount} remaining)
          </Button>
        </div>
      )}
      {isFetchingMore && (
        <div className="text-center py-8 text-gray-600 font-semibold">Loading more requests...</div>
      )}

      {hasPendingChanges() && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-4 border-t border-gray-300 shadow-lg flex flex-col sm:flex-row justify-center sm:justify-end gap-3 z-30">
          <Button color="default" variant="bordered" onPress={() => { resetModifications(); }} startContent={<CancelIcon className="h-5 w-5"/>} isDisabled={isApplyingChanges} className="w-full sm:w-auto">
            Cancel Changes ({modifiedLeaves.size})
          </Button>
          <Button color="primary" variant="solid" onPress={() => setIsConfirmPopoverOpen(true)} startContent={<ArrowDownTrayIcon className="h-5 w-5"/>} isLoading={isApplyingChanges} isDisabled={isApplyingChanges} className="w-full sm:w-auto">
            {isApplyingChanges ? 'Applying...' : `Apply ${modifiedLeaves.size} Changes`}
          </Button>
        </div>
      )}

      <Popover
        isOpen={isConfirmPopoverOpen}
        onClose={() => setIsConfirmPopoverOpen(false)}
        onConfirm={handleApplyChanges}
        title="Confirm Changes"
        content={`Are you sure you want to apply ${modifiedLeaves.size} change(s) to leave statuses? This will update student records and send notifications.`}
        isConfirmLoading={isApplyingChanges}
      />
      <Popover
        isOpen={rejectionReasonPrompt.isOpen}
        onClose={() => setRejectionReasonPrompt({ ...rejectionReasonPrompt, isOpen: false })}
        onConfirm={confirmReject}
        title="Rejection Reason"
        content={
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Provide reason for rejecting leave for student <span className="font-semibold">{getLeaveById(rejectionReasonPrompt.leaveId)?.studentName}</span> regarding "<span className="font-semibold">{getLeaveById(rejectionReasonPrompt.leaveId)?.title}</span>".</p>
            <Input
              label="Rejection Reason"
              placeholder="Enter reason (e.g., insufficient details)"
              value={currentRejectionReason}
              onValueChange={setCurrentRejectionReason}
              fullWidth
              autoFocus
              isRequired
              className="mt-1"
            />
          </div>
        }
        isConfirmLoading={false}
      />
    </div>
  );
};

export default ApproveLeavePage;