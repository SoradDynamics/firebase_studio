// src/pages/admin/ApproveLeavePage.tsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Button, Input } from '@heroui/react';
import { ArrowDownTrayIcon, XCircleIcon as CancelIcon, ArrowPathIcon as RefreshIcon } from '@heroicons/react/24/outline';

import useLeaveApprovalStore from '~/store/teacherleaveApprovalStore';
import {
  getAllStudents,
  getAllFaculties,
  getAllSections, // Fetches all sections from DB for admin/general use
  getTeacherByEmail,
  getSectionsByClassTeacherCustomId, // Fetches sections based on teacher's custom ID
  updateStudentLeaveData,
  createNotification,
  getCurrentUserEmail
} from './appwriteService'; // Assuming this path is correct relative to your project structure
import LeaveRequestCard from '../../../common/LeaveApprove/LeaveRequestCard';
import SearchBar from '../../../common/SearchBar';
import Popover from '../../../common/PopoverRed';
import ActionButton from '../../../../common/ActionButton'; // Assuming this path is correct
import CustomSelect, { SelectOption } from '../../../common/CustomSelect';
import { StudentDocument, Leave, ModifiedLeave, NotificationPayload, TeacherDocument, SectionDocument } from 'types';

const ApproveLeavePage: React.FC = () => {
  const {
    currentUserRole,
    teacherDetails,
    // teacherAssignedSectionIds, // This is now primarily for the store to know $ids. Student query uses custom IDs.
    teacherAssignedSectionsData, // Used for displaying assigned sections & for filter dropdowns
    displayableLeaveRequests,
    totalProcessedLeavesCount,
    currentlyDisplayedCount,
    modifiedLeaves,
    isLoading,
    isFetchingMore,
    error,
    filters,
    faculties, // Scoped by store based on role
    sections,  // Scoped by store based on role (these are teacher's assigned sections for teacher role)
    classes,   // Scoped by store based on role
    setError,
    setInitialData,
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
  const [isApplyingChanges, setIsApplyingChanges] = useState(false); // Local state for apply/refresh button visual

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
    if (isRefresh) {
      setIsApplyingChanges(true);
    } else {
      if (!useLeaveApprovalStore.getState().isLoading) { // Ensure store loading is active for initial fetch
        useLeaveApprovalStore.getState().setLoading(true);
      }
    }
    setError(null); // Clear previous errors
    console.log('[ApproveLeavePage.fetchData] Starting data fetch...');

    try {
      const userEmail = await getCurrentUserEmail();
      let teacherDoc: TeacherDocument | null = null;
      let sectionValuesForStudentQuery: string[] = []; // Stores CUSTOM section IDs if that's what student.section uses
      let fetchedSectionsForTeacher: SectionDocument[] = []; // Full section docs for teacher
      let studentsForStore: StudentDocument[];

      if (userEmail) {
        teacherDoc = await getTeacherByEmail(userEmail);
        console.log('[ApproveLeavePage.fetchData] Teacher Document:', teacherDoc ? { customId: teacherDoc.id, name: teacherDoc.name, email: teacherDoc.email, appwriteId: teacherDoc.$id } : null);

        if (teacherDoc && teacherDoc.id) { // Teacher exists and has a custom ID
          fetchedSectionsForTeacher = await getSectionsByClassTeacherCustomId(teacherDoc.id);
          console.log('[ApproveLeavePage.fetchData] Sections linked to teacher (by custom teacher ID):', fetchedSectionsForTeacher.map(s => ({ name: s.name, customSectionId: s.id, appwriteSectionId: s.$id, class_teacher_attr: s.class_teacher })));

          if (fetchedSectionsForTeacher.length > 0) {
            // **** IMPORTANT ASSUMPTION: coll-student.section stores the CUSTOM ID of the section (coll-section.id) ****
            // If coll-student.section stores coll-section.$id (Appwrite ID), use .map(s => s.$id) instead.
            sectionValuesForStudentQuery = fetchedSectionsForTeacher.map(s => s.id); // Using custom section ID (from coll-section.id)
            console.log('[ApproveLeavePage.fetchData] Using these CUSTOM section IDs (from coll-section.id) for student query:', sectionValuesForStudentQuery);
          } else {
            console.log('[ApproveLeavePge.fetchData] Teacher is assigned to 0 sections based on custom ID link.');
            // sectionValuesForStudentQuery remains empty, getAllStudents will correctly return []
          }
          
          studentsForStore = await getAllStudents(sectionValuesForStudentQuery);
          console.log('[ApproveLeavePage.fetchData] Students fetched for teacher (querying student.section with custom section IDs):', studentsForStore.map(s => ({ name: s.name, student_section_attr: s.section })));

        } else { 
            if (teacherDoc && !teacherDoc.id) {
                console.warn(`[ApproveLeavePage.fetchData] Teacher ${userEmail} found, but missing custom 'id' attribute needed for section linking. Treating as admin.`);
            } else if (!teacherDoc) {
                console.log(`[ApproveLeavePage.fetchData] No teacher document found for email ${userEmail}. Treating as admin.`);
            }
            studentsForStore = await getAllStudents(); // No specific section values (undefined), so fetch all for admin
            console.log('[ApproveLeavePage.fetchData] Fetched all students (admin context or issue with teacher data):', studentsForStore.length);
        }
      } else { 
        console.log('[ApproveLeavePage.fetchData] No user email found. Fetching all students.');
        studentsForStore = await getAllStudents(); // Undefined sectionValuesForStudentQuery fetches all
      }
      
      const [allFacultiesFromDB, allSectionsFromDBGlobal] = await Promise.all([
        getAllFaculties(),
        getAllSections(), // Fetch all sections globally for admin context / potential general use for filters
      ]);
      
      setInitialData({
        students: studentsForStore,
        allFacultiesFromDB,
        allSectionsFromDB: allSectionsFromDBGlobal,
        userEmail,
        teacherDoc,
        // For the store, teacherAssignedSectionIds will store the Appwrite $ids of the sections.
        // The actual student filtering was done using the correct ID type (custom or $id based on your student.section).
        assignedSectionIdsForTeacher: fetchedSectionsForTeacher.map(s => s.$id), 
        assignedSectionsDataForTeacher: fetchedSectionsForTeacher, // Full section data for display & UI logic
      });
      console.log('[ApproveLeavePage.fetchData] Data setting to store complete.');

    } catch (err) {
        console.error("[ApproveLeavePage.fetchData] Error fetching initial data:", err);
        setError(`Failed to load data: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (isRefresh) setIsApplyingChanges(false);
      // setLoading(false) is now primarily handled by store's setInitialData or setError
      console.log('[ApproveLeavePage.fetchData] Fetch data process finished.');
    }
  }, [setError, setInitialData]); // Dependencies for useCallback

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Initial fetch and when fetchData itself changes (which it won't unless deps change)

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
    const notificationsToSend: NotificationPayload[] = [];
    
    const senderEmail = useLeaveApprovalStore.getState().currentUserEmail || 
                        (teacherDetails ? teacherDetails.email : 'admin@example.com');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const currentScopedStudents = useLeaveApprovalStore.getState().allStudents; // This list is already scoped

    for (const modifiedLeave of modifiedLeaves.values()) {
      let studentDocEntry = studentsToUpdate.get(modifiedLeave.studentId);
      if (!studentDocEntry) {
        const originalStudentDoc = currentScopedStudents.find(s => s.$id === modifiedLeave.studentId);
        if (originalStudentDoc) {
          const copiedDoc = JSON.parse(JSON.stringify(originalStudentDoc));
          studentDocEntry = { doc: copiedDoc, newLeaveArray: [...copiedDoc.leave] };
          studentsToUpdate.set(modifiedLeave.studentId, studentDocEntry);
        } else {
          console.error(`Student ${modifiedLeave.studentId} not found in current scoped students for leave ${modifiedLeave.leaveId}`);
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
          if (modifiedLeave.status === 'rejected') {
            leaveObj.rejectionReason = modifiedLeave.rejectionReason;
            leaveObj.rejectedAt = modifiedLeave.rejectedAt || new Date().toISOString();
          } else {
            delete leaveObj.rejectionReason;
            delete leaveObj.rejectedAt;
          }
          studentDocEntry.newLeaveArray[leaveIndex] = JSON.stringify(leaveObj);

          notificationsToSend.push({
            title: `Leave application ${modifiedLeave.status}`,
            msg: `Your leave request for "${modifiedLeave.title}" (${modifiedLeave.periodType === 'today' ? modifiedLeave.date : `${modifiedLeave.fromDate} to ${modifiedLeave.toDate}`}) has been ${modifiedLeave.status}.` +
                 (modifiedLeave.status === 'rejected' && modifiedLeave.rejectionReason ? ` Reason: ${modifiedLeave.rejectionReason}` : ''),
            to: modifiedLeave.studentId,
            valid: tomorrowStr,
            sender: senderEmail,
            date: new Date().toISOString(),
          });
        } catch (e) { console.error("Error processing leave for update:", modifiedLeave.leaveId, e); errorCount++; }
      } else { console.warn(`Leave ${modifiedLeave.leaveId} not found in student ${modifiedLeave.studentId}'s leave array for update.`); }
    }

    for (const [studentId, { newLeaveArray }] of studentsToUpdate.entries()) {
      try {
        await updateStudentLeaveData(studentId, newLeaveArray);
        successCount++;
      } catch (e) { console.error(`Failed to update student ${studentId}`, e); errorCount++; }
    }
    
    for (const notification of notificationsToSend) {
        try { await createNotification(notification); }
        catch (e) { console.error(`Failed to send notification to ${notification.to}`, e); }
    }

    if (errorCount > 0) setError(`Applied ${successCount} changes with ${errorCount} errors.`);
    else alert(`Successfully applied ${successCount} changes.`);

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
      if (dateA_BS > dateB_BS) return -1;
      if (dateA_BS < dateB_BS) return 1;
      return 0;
    });
  }, [displayableLeaveRequests]);
  
  // Options for filter dropdowns, derived from scoped data in the store
  const facultyOptions: SelectOption[] = useMemo(() => 
    faculties.map(f => ({ id: f.$id, name: f.name })), 
    [faculties]
  );
  
  const classOptions: SelectOption[] = useMemo(() => 
    classes.map(c => ({ id: c, name: c })),
    [classes]
  );

  const sectionOptions: SelectOption[] = useMemo(() => 
    sections // `sections` from store is already scoped (teacher's assigned sections or all for admin)
      .filter(sec => !filters.class || sec.class === filters.class) // Further filter by selected class if any
      .map(sec => ({ id: sec.$id, name: `${sec.name} (Class ${sec.class})` })),
    [sections, filters.class]
  );

  const pageTitle = currentUserRole === 'teacher' && teacherDetails
    ? `${teacherDetails.name}'s Class Leave Approvals` 
    : "Leave Approval Dashboard";

  // Message indicating which sections the teacher is managing
  const assignedSectionsMessage = useMemo(() => {
    if (currentUserRole === 'teacher' && teacherAssignedSectionsData && teacherAssignedSectionsData.length > 0) {
      const sectionNames = teacherAssignedSectionsData.map(sec => `${sec.name} (Class ${sec.class})`).join(', ');
      return `Managing sections: ${sectionNames}`;
    }
    return null;
  }, [currentUserRole, teacherAssignedSectionsData]);

  // Message to display when no leave requests are found/visible
  const noRequestsMessageText = useMemo(() => {
    if (isLoading) return null; // Don't show "no requests" while initially loading

    if (currentUserRole === 'teacher') {
      if (!teacherDetails || !teacherDetails.id) { // teacherDoc.id is the custom teacher ID
        return "Teacher information incomplete. Cannot determine assigned sections.";
      }
      // teacherAssignedSectionsData comes from sections found by custom teacher ID.
      if (teacherAssignedSectionsData.length === 0) { 
        return "You are not currently assigned as a class teacher to any sections.";
      }
      // If sections are assigned, but no students were found for those sections (allStudents in store is empty)
      if (useLeaveApprovalStore.getState().allStudents.length === 0 && teacherAssignedSectionsData.length > 0) {
        return "No students found in your assigned sections.";
      }
      // If students exist, but no leave requests match current filters or exist at all for them
       if (displayableLeaveRequests.length === 0) {
         return "No leave requests found for your assigned sections matching current filters.";
       }
    }
    // For admin, or if teacher has leaves but current filters yield none:
    if (displayableLeaveRequests.length === 0) {
        return "No leave requests found.";
    }
    return null; // Return null if there are leaves to display or still loading
  }, [currentUserRole, teacherDetails, teacherAssignedSectionsData, displayableLeaveRequests.length, isLoading]);

  // Sub-message for guidance when no requests are shown
  const noRequestsSubMessageText = useMemo(() => {
    const currentNoRequestsMessage = noRequestsMessageText; 
    if (currentNoRequestsMessage) { // Only show sub-message if there's a main noRequestsMessage
      if (currentUserRole === 'teacher' && 
          ( // Conditions where admin help might be needed for a teacher
           !teacherDetails || !teacherDetails.id || 
           teacherAssignedSectionsData.length === 0 || 
           (useLeaveApprovalStore.getState().allStudents.length === 0 && teacherAssignedSectionsData.length > 0)
          )
         ) {
        return "Please contact an administrator if you believe this is an error.";
      }
      // General sub-message if no leaves are displayed after filters, or for admin
      if (displayableLeaveRequests.length === 0) {
         return "Try adjusting your filters or check back later.";
      }
    }
    return null;
  }, [noRequestsMessageText, currentUserRole, teacherDetails, teacherAssignedSectionsData, displayableLeaveRequests.length]);


  if (isLoading) {
    return <div className="p-6 text-center text-lg font-semibold text-gray-700">Loading leave requests...</div>;
  }
  if (error && !isApplyingChanges) { // Show error prominently if not in the middle of applying changes
    return (
        <div className="p-6 text-center text-red-600">
            <p className="text-lg mb-2">Error: {error}</p>
            <Button color="danger" variant="ghost" onPress={() => fetchData(true)}>Retry Loading Data</Button>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-100 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-1 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">{pageTitle}</h1>
        <ActionButton
            icon={<RefreshIcon className="h-5 w-5"/>}
            onClick={handleRefresh}
            color="blue"
            isIconOnly={true}
            buttonText="Refresh Data"
            disabled={isApplyingChanges || isLoading} // Disable if busy
        />
      </div>
      {/* Assigned Sections Info for Teacher */}
      {assignedSectionsMessage && (
        <div className="mb-4 p-3 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-lg shadow">
          {assignedSectionsMessage}
        </div>
      )}

      {/* Filters Section */}
      <div className="mb-6 p-4 bg-white shadow-md rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <SearchBar
          placeholder="Search leave title, reason, student..."
          value={filters.searchText}
          onValueChange={(value) => setFilter('searchText', value)}
          className="lg:col-span-2"
          inputClassName="text-sm"
        />
        <CustomSelect
          label="Filter by Faculty"
          placeholder="All Faculties"
          options={facultyOptions}
          value={filters.facultyId}
          onChange={(selectedId) => setFilter('facultyId', selectedId)}
          className="w-full"
          size="md"
          disabled={facultyOptions.length === 0}
        />
        <CustomSelect
          label="Filter by Class"
          placeholder="All Classes"
          options={classOptions}
          value={filters.class}
          onChange={(selectedId) => setFilter('class', selectedId)}
          className="w-full"
          size="md"
          disabled={classOptions.length === 0}
        />
        <CustomSelect
          label="Filter by Section"
          placeholder="All Sections"
          options={sectionOptions} // These are from the store, already scoped for teacher
          value={filters.section} // This will be a section $id
          onChange={(selectedId) => setFilter('section', selectedId)}
          className="w-full"
          size="md"
          disabled={sectionOptions.length === 0}
        />
      </div>
      
      {/* "No Leave Requests" Message Area */}
      {noRequestsMessageText && !isFetchingMore && groupedLeaves.length === 0 && (
        <div className="text-center text-gray-500 py-10 bg-white shadow rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 mx-auto mb-4 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.131.094 1.976 1.057 1.976 2.192V7.5m0 4.5h.008m-1.008 0H7.5a2.25 2.25 0 0 0-2.25 2.25v.75c0 1.108.892 2.006 1.996 2.006H12c1.104 0 1.996-.898 1.996-2.006v-.75a2.25 2.25 0 0 0-2.25-2.25H7.5m8.25-4.5h.008M12 10.5h.008m-3.75 0h.008m0 0h.008m2.742 0H12m4.5 0h.008m-1.008 0H12a2.25 2.25 0 0 0-2.25 2.25v.75M7.5 10.5h.008M12 7.5h.008m2.242 0H12m0 0h.008M12 7.5a2.25 2.25 0 0 0-2.25 2.25v.75" />
            </svg>
            <p className="text-xl">{noRequestsMessageText}</p>
            {noRequestsSubMessageText && <p className="text-sm">{noRequestsSubMessageText}</p>}
        </div>
      )}

      {/* Leave Requests List */}
      {groupedLeaves.map(([bsDateString, leavesInGroup]) => (
        <div key={bsDateString} className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4 pb-2 border-b-2 border-indigo-600">
            {bsDateString}
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
                        originalStatus={modifiedVersion?.originalStatus}
                    />
                );
            })}
          </div>
        </div>
      ))}

      {/* Load More Button & Indicator */}
      {currentlyDisplayedCount < totalProcessedLeavesCount && !isFetchingMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          <Button variant="ghost" color="primary" onPress={loadMoreLeaves} isLoading={isFetchingMore}>
            Load More ({totalProcessedLeavesCount - currentlyDisplayedCount} remaining)
          </Button>
        </div>
      )}
      {isFetchingMore && (
        <div className="text-center py-8 text-gray-600 font-semibold">Loading more requests...</div>
      )}

      {/* Pending Changes Bar */}
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

      {/* Popovers */}
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
        isConfirmLoading={false} // This popover's confirm doesn't have its own loading state
      />
    </div>
  );
};

export default ApproveLeavePage;