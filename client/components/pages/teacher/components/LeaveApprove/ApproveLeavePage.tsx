// src/pages/admin/ApproveLeavePage.tsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Button, Input } from '@heroui/react';
import { ArrowDownTrayIcon, XCircleIcon as CancelIcon, ArrowPathIcon as RefreshIcon } from '@heroicons/react/24/outline';
import { createNotificationEntry, getTomorrowDateString, NotificationData } from '~/utils/notification'; // Adjust path if necessary

import useLeaveApprovalStore from '~/store/teacherleaveApprovalStore';
import {
  getAllStudents,
  getAllFaculties,
  getAllSections,
  updateStudentLeaveData,
  createNotification,
  getTeacherByEmail,
  getSectionsByClassTeacherId,
  getStudentsBySectionDetails, // Updated function name
} from './appwriteService';
import { getCurrentUserEmail } from '~/utils/appwrite';

import LeaveRequestCard from '../../../common/LeaveApprove/LeaveRequestCard';
import SearchBar from '../../../common/SearchBar';
import Popover from '../../../common/PopoverRed';
import ActionButton from '../../../../common/ActionButton';
import CustomSelect, { SelectOption } from '../../../common/CustomSelect';
import { StudentDocument, Leave, ModifiedLeave, NotificationPayload, TeacherDocument, SectionDocument } from 'types';

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
    faculties, // From store: Array of FacultyDocument
    sections,  // From store: Array of SectionDocument (scoped for teacher)
    classes,   // From store: Array of class name strings
    currentUserRole,
    teacherAssignedSectionIds, // From store: Array of teacher's section $IDs
    allStudents, // From store: Array of StudentDocument (scoped for teacher)
    setLoading,
    setError,
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
    leaveId: '', studentId: '', isOpen: false,
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
    const isStoreInitiallyEmpty = !useLeaveApprovalStore.getState().allStudents.length;
    const isInitialLoad = isStoreInitiallyEmpty && !isRefresh;

    if (isInitialLoad) setLoading(true);
    else if (isRefresh) setIsApplyingChanges(true);
    setError(null);
    console.log("[FetchData] Starting data fetch (v3 - student.section is name)...");

    try {
        const userEmail = await getCurrentUserEmail();
        console.log("[FetchData] Current user email:", userEmail);
        if (!userEmail) {
            setError("Unable to identify current user. Please log in again.");
            if (isInitialLoad) setLoading(false); if (isRefresh) setIsApplyingChanges(false);
            return;
        }

        let teacherDoc: TeacherDocument | null = null;
        let sectionsDataForTeacherUiFilter: SectionDocument[] = []; // Full SectionDocument objects where teacher is class_teacher
        let studentSectionNamesForQuery: string[] = [];
        let studentFacultyIdsForQuery: string[] = []; // faculty $IDs from teacher's assigned sections
        let studentClassNamesForQuery: string[] = [];   // class names from teacher's assigned sections

        let studentsData: StudentDocument[] = [];
        let isTeacherContext = false;

        try {
            teacherDoc = await getTeacherByEmail(userEmail);
            console.log("[FetchData] Teacher document by email:", teacherDoc ? {name: teacherDoc.name, id: teacherDoc.id, $id: teacherDoc.$id} : null);
        } catch (e) { console.warn("[FetchData] Error fetching teacher by email:", e); teacherDoc = null; }

        if (teacherDoc && teacherDoc.id) { // teacherDoc.id is the custom ID
            console.log(`[FetchData] Teacher identified: ${teacherDoc.name}, Custom Teacher ID: ${teacherDoc.id}`);
            try {
                const teacherRawSections = await getSectionsByClassTeacherId(teacherDoc.id); // Fetches SectionDocument[]
                console.log("[FetchData] Raw sections where teacher is class_teacher:", teacherRawSections.length);

                if (teacherRawSections && teacherRawSections.length > 0) {
                    isTeacherContext = true;
                    sectionsDataForTeacherUiFilter = teacherRawSections; // These are SectionDocument objects

                    studentSectionNamesForQuery = teacherRawSections.map(sec => sec.name).filter(Boolean);
                    studentFacultyIdsForQuery = [...new Set(teacherRawSections.map(sec => sec.facultyId).filter(Boolean))];
                    studentClassNamesForQuery = [...new Set(teacherRawSections.map(sec => sec.class).filter(Boolean))];

                    console.log("[FetchData] Details for student query (derived from teacher's sections):");
                    console.log("  Section Names:", studentSectionNamesForQuery);
                    console.log("  Faculty $IDs:", studentFacultyIdsForQuery);
                    console.log("  Class Names:", studentClassNamesForQuery);

                    if (studentSectionNamesForQuery.length > 0) {
                        studentsData = await getStudentsBySectionDetails(
                            studentSectionNamesForQuery,
                            studentFacultyIdsForQuery.length > 0 ? studentFacultyIdsForQuery : undefined,
                            studentClassNamesForQuery.length > 0 ? studentClassNamesForQuery : undefined
                        );
                        console.log(`[FetchData] STUDENTS MATCHED for teacher: ${studentsData.length} students.`);
                        if (studentsData.length > 0 && studentsData.length < 3) {
                             console.log("[FetchData] Sample matched students for teacher:", studentsData.map(s => ({ name: s.name, section: s.section, facultyId: s.facultyId, class: s.class })));
                        }
                    } else {
                        console.log("[FetchData] Teacher is class teacher, but no section names derived. No students fetched this way.");
                        studentsData = [];
                    }
                } else {
                    console.log("[FetchData] Teacher found, but not assigned as class_teacher to any sections.");
                    studentsData = []; // No students if not class teacher of any section
                    if (teacherDoc) isTeacherContext = true; // Still a teacher, just has no sections to manage leaves for
                }
            } catch (sectionError) {
                console.error("[FetchData] Error during teacher's section/student data retrieval:", sectionError);
                studentsData = [];
                if (teacherDoc) isTeacherContext = true; // Error occurred, but context is still teacher
            }
        } else {
             console.log("[FetchData] No teacher document found for this email or teacher lacks custom 'id'. Assuming admin role for data fetching.");
        }

        // Fallback to admin if not a teacher context with specific sections or if user is not a teacher
        if (!isTeacherContext && !teacherDoc) { // Only if definitely not a teacher (or teacher not found for email)
            console.log("[FetchData] Admin path: Fetching all students.");
            studentsData = await getAllStudents();
            console.log(`[FetchData] Admin Path: Total students fetched: ${studentsData.length}`);
        }
        
        const [allFacultiesFromDB, allSectionsFromDB] = await Promise.all([
            getAllFaculties(),
            getAllSections(),
        ]);
        console.log(`[FetchData] Total faculties from DB: ${allFacultiesFromDB.length}, Total sections from DB: ${allSectionsFromDB.length}`);
        
        useLeaveApprovalStore.getState().setInitialData({
            students: studentsData, // Scoped for teachers, or all for admins
            allFacultiesFromDB,
            allSectionsFromDB,
            userEmail,
            teacherDoc: teacherDoc,
            assignedSectionIdsForTeacher: sectionsDataForTeacherUiFilter.map(s => s.$id), // Store $IDs of teacher's sections
            assignedSectionsDataForTeacher: sectionsDataForTeacherUiFilter, // Store full SectionDocument objects
        });

    } catch (err) {
        console.error("[FetchData] Overall error in fetchData pipeline:", err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data.';
        setError(errorMessage);
    } finally {
        if (isInitialLoad) setLoading(false);
        if (isRefresh) setIsApplyingChanges(false);
        console.log("[FetchData] Data fetch process complete.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLoading, setError]); // Store's setInitialData handles the rest

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    if (hasPendingChanges()) {
        if (!window.confirm("You have unsaved changes. Are you sure you want to refresh and discard them?")) return;
        resetModifications();
    }
    fetchData(true);
  };

  const handleApprove = (leaveId: string, studentId: string) => updateLeaveStatus(leaveId, studentId, 'approved');
  const handleRequestReject = (leaveId: string, studentId: string) => {
    setRejectionReasonPrompt({ leaveId, studentId, isOpen: true });
    setCurrentRejectionReason(getLeaveById(leaveId)?.rejectionReason || '');
  };
  const confirmReject = () => {
    if (!rejectionReasonPrompt.leaveId || !currentRejectionReason.trim()) {
        alert("Rejection reason cannot be empty."); return;
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

    const studentsToUpdate = new Map<string, { doc: StudentDocument, newLeaveArray: string[] }>();
    // const notificationsToSend: NotificationPayload[] = []; // Old type, replace with NotificationData from new service
    const notificationPayloads: NotificationData[] = []; // Using the new type

    const loggedInUserEmail = await getCurrentUserEmail(); // Get email once
    if (!loggedInUserEmail) {
        console.error("[ApplyChanges] Could not get logged-in user email for notification sender.");
        // Decide if this is a critical error. For now, we'll proceed but sender might be missing.
        // Or, set a default sender: const senderEmail = loggedInUserEmail || 'system@example.com';
        setError("Could not identify current user for sending notifications. Please try again.");
        setIsApplyingChanges(false);
        return;
    }
    const senderEmail = loggedInUserEmail;

    const roleName = useLeaveApprovalStore.getState().currentUserRole === 'teacher'
        ? (useLeaveApprovalStore.getState().teacherDetails?.name || 'Class Teacher')
        : 'Admin';
    const allStudentsFromStore = useLeaveApprovalStore.getState().allStudents;

    const tomorrowStr = getTomorrowDateString(); // Get tomorrow's date string

    for (const modifiedLeave of modifiedLeaves.values()) {
      let studentEntry = studentsToUpdate.get(modifiedLeave.studentId);
      if (!studentEntry) {
        const originalStudent = allStudentsFromStore.find(s => s.$id === modifiedLeave.studentId);
        if (originalStudent) {
          const copiedDoc = JSON.parse(JSON.stringify(originalStudent));
          studentEntry = { doc: copiedDoc, newLeaveArray: [...copiedDoc.leave] };
          studentsToUpdate.set(modifiedLeave.studentId, studentEntry);
        } else {
          console.error(`[ApplyChanges] Student ${modifiedLeave.studentId} not found in store for leave ${modifiedLeave.leaveId}.`);
          errorCount++;
          continue;
        }
      }

      const leaveIdx = studentEntry.newLeaveArray.findIndex(lStr => {
        try { return JSON.parse(lStr).leaveId === modifiedLeave.leaveId; }
        catch { return false; }
      });

      if (leaveIdx !== -1) {
        try {
            const leaveObj = JSON.parse(studentEntry.newLeaveArray[leaveIdx]);
            leaveObj.status = modifiedLeave.status;

            if (modifiedLeave.status === 'rejected') {
                leaveObj.rejectionReason = modifiedLeave.rejectionReason;
                leaveObj.rejectedAt = modifiedLeave.rejectedAt || new Date().toISOString();
                leaveObj.rejectedBy = roleName;
                delete leaveObj.approvedAt; delete leaveObj.approvedBy;
            } else if (modifiedLeave.status === 'approved') {
                delete leaveObj.rejectionReason; delete leaveObj.rejectedAt; delete leaveObj.rejectedBy;
                leaveObj.approvedAt = modifiedLeave.approvedAt || new Date().toISOString();
                leaveObj.approvedBy = roleName;
            } else {
                delete leaveObj.rejectionReason; delete leaveObj.rejectedAt; delete leaveObj.rejectedBy;
                delete leaveObj.approvedAt; delete leaveObj.approvedBy;
            }
            studentEntry.newLeaveArray[leaveIdx] = JSON.stringify(leaveObj);

            // Prepare notification data
            const notificationTitle = `Leave application ${modifiedLeave.status}`;
            const notificationMsg = `Your leave request for "${modifiedLeave.title}" (${modifiedLeave.periodType === 'today' ? modifiedLeave.date : `${modifiedLeave.fromDate} to ${modifiedLeave.toDate}`}) has been ${modifiedLeave.status}${roleName ? ` by ${roleName}` : ''}.` +
                                  (modifiedLeave.status === 'rejected' && modifiedLeave.rejectionReason ? ` Reason: ${modifiedLeave.rejectionReason}` : '');
            
            // As per your schema, `to` is an array. We are sending to one student per leave status change.
            // This assumes modifiedLeave.studentId is the Appwrite User ID or the Student Document $ID
            // that your notification system targets.
            // If you need the "id:..." prefix, construct it here:
            // const targetStudentIdentifier = `id:${modifiedLeave.studentId}`;
            const targetStudentIdentifier = modifiedLeave.studentId; // Assuming it's the direct ID

            notificationPayloads.push({
                title: notificationTitle,
                msg: notificationMsg,
                to: [`id:${targetStudentIdentifier}`], // Array containing the student's ID
                valid: tomorrowStr,
                sender: senderEmail,
                // date: new Date().toISOString(), // The service can add this if needed, or Appwrite's $createdAt can be used
            });

        } catch (e) {
            console.error(`[ApplyChanges] Error processing leave for update (student: ${modifiedLeave.studentId}, leaveId: ${modifiedLeave.leaveId}):`, e);
            errorCount++;
        }
      } else {
          console.warn(`[ApplyChanges] Leave ${modifiedLeave.leaveId} not found in student ${modifiedLeave.studentId}'s current leave array for update.`);
      }
    }

    // Perform database updates for student leave arrays
    const updatePromises = Array.from(studentsToUpdate.entries()).map(
      async ([studentId, { newLeaveArray }]) => {
        try {
          await updateStudentLeaveData(studentId, newLeaveArray);
          successCount++;
        } catch (e) {
          console.error(`[ApplyChanges] Failed to update student ${studentId} in DB:`, e);
          errorCount++;
        }
      }
    );
    await Promise.all(updatePromises);

    // Send notifications using the new service
    console.log(`[ApplyChanges] Preparing to send ${notificationPayloads.length} notifications.`);
    const notificationPromises = notificationPayloads.map(payload =>
      createNotificationEntry(payload).catch(e => { // Use createNotificationEntry
        // Log the error but don't let one failed notification stop others or count as a main error
        console.error(`[ApplyChanges] Failed to send notification for title "${payload.title}" to "${payload.to.join(', ')}":`, e);
        // You might want a separate counter for notification failures if it's important to report
      })
    );
    await Promise.all(notificationPromises);

    if (errorCount > 0) {
      setError(`Applied ${successCount} leave changes successfully, but ${errorCount} errors occurred with student data updates. Check console.`);
    } else if (successCount > 0) {
      alert(`Successfully applied ${successCount} leave changes. Notifications sent.`);
    } else {
      alert("No leave changes were applied. This might indicate an issue or no actual modifications were made.");
    }

    clearModifications();
    await fetchData(true);

    setIsApplyingChanges(false);
  };

  const groupedLeaves = useMemo(() => { /* ... same as before ... */
    const groups: { [bsDateKey: string]: Leave[] } = {};
    displayableLeaveRequests.forEach(leave => {
      const bsDateKey = leave.periodType === 'today' ? leave.date : leave.fromDate;
      if (!bsDateKey) { console.warn("Leave missing date/fromDate:", leave); return; }
      if (!groups[bsDateKey]) groups[bsDateKey] = [];
      groups[bsDateKey].push(leave);
    });
    return Object.entries(groups).sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime());
  }, [displayableLeaveRequests]);

  const facultyOptions: SelectOption[] = useMemo(() => faculties.map(f => ({ id: f.$id, name: f.name })), [faculties]);
  const classOptions: SelectOption[] = useMemo(() => classes.map(c => ({ id: c, name: c })), [classes]);
  // `sections` from store are SectionDocument objects (scoped for teacher). UI filter needs $id.
  const sectionOptions: SelectOption[] = useMemo(() =>
    sections
      .filter(secDoc => !filters.class || secDoc.class === filters.class)
      .map(secDoc => ({ id: secDoc.$id, name: `${secDoc.name} (Class ${secDoc.class})` })),
    [sections, filters.class]
  );

  const pageTitle = currentUserRole === 'teacher' ? "Leave Approval (My Sections)" : "Leave Approval Dashboard";

  if (isLoading && displayableLeaveRequests.length === 0 && !error) {
    return <div className="p-6 text-center text-lg font-semibold">Loading leave requests...</div>;
  }
  if (error && !isApplyingChanges) {
    return <div className="p-6 text-center text-red-600"><p>Error: {error}</p><Button onPress={() => fetchData(true)}>Retry</Button></div>;
  }

  return (
    <div className="p-4 md:p-6 bg-gray-100 min-h-screen pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">{pageTitle}</h1>
        <ActionButton icon={<RefreshIcon className="h-5 w-5"/>} onClick={handleRefresh} color="blue" isIconOnly buttonText="Refresh" disabled={isApplyingChanges || isLoading}/>
      </div>

      <div className="mb-6 p-4 bg-white shadow-md rounded-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
        <SearchBar placeholder="Search..." value={filters.searchText} onValueChange={v => setFilter('searchText', v)} className="w-full" />
        <CustomSelect label="Faculty" placeholder="All Faculties" options={facultyOptions} value={filters.facultyId} onChange={v => setFilter('facultyId', v as string | null)} className="w-full" isDisabled={currentUserRole === 'teacher' && faculties.length <=1}/>
        <CustomSelect label="Class" placeholder="All Classes" options={classOptions} value={filters.class} onChange={v => setFilter('class', v as string | null)} className="w-full" isDisabled={currentUserRole === 'teacher' && classes.length <=1}/>
        <CustomSelect label="Section" placeholder="All Sections" options={sectionOptions} value={filters.section} onChange={v => setFilter('section', v as string | null)} className="w-full" isDisabled={(currentUserRole === 'teacher' && sections.length <=1) || sectionOptions.length === 0}/>
      </div>

      {(isLoading && displayableLeaveRequests.length > 0 && !isApplyingChanges) && <div className="text-center p-4">Loading...</div>}

      {groupedLeaves.length === 0 && !isLoading && !isFetchingMore && (
        <div className="text-center text-gray-500 py-10 bg-white shadow rounded-lg">
            {/* SVG Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 mx-auto mb-4 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.131.094 1.976 1.057 1.976 2.192V7.5m0 4.5h.008m-1.008 0H7.5a2.25 2.25 0 0 0-2.25 2.25v.75c0 1.108.892 2.006 1.996 2.006H12c1.104 0 1.996-.898 1.996-2.006v-.75a2.25 2.25 0 0 0-2.25-2.25H7.5m8.25-4.5h.008M12 10.5h.008m-3.75 0h.008m0 0h.008m2.742 0H12m4.5 0h.008m-1.008 0H12a2.25 2.25 0 0 0-2.25 2.25v.75M7.5 10.5h.008M12 7.5h.008m2.242 0H12m0 0h.008M12 7.5a2.25 2.25 0 0 0-2.25 2.25v.75" />
            </svg>
            <p className="text-xl">No leave requests found.</p>
            <p className="text-sm">Try adjusting filters or check back later.</p>
            {currentUserRole === 'teacher' && teacherAssignedSectionIds.length === 0 && (
                <p className="text-sm mt-2 text-orange-600">You are not currently assigned as a class teacher to any section.</p>
            )}
            {currentUserRole === 'teacher' && teacherAssignedSectionIds.length > 0 && allStudents.length === 0 && (
                <p className="text-sm mt-2 text-orange-600">You are assigned to sections, but no students were found in them based on current criteria, or data is inaccessible.</p>
            )}
            {allStudents.length > 0 && displayableLeaveRequests.length === 0 && (
                <p className="text-sm mt-2 text-orange-600">Students found, but no leave applications match current filters or none exist.</p>
            )}
        </div>
      )}

      {groupedLeaves.map(([dateKey, leaves]) => (
        <div key={dateKey} className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4 pb-2 border-b-2 border-indigo-600">{dateKey || "Unspecified Date"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {leaves.map(l => {
              const mod = modifiedLeaves.get(l.leaveId);
              const dispL = mod || l;
              return <LeaveRequestCard key={dispL.leaveId + (mod ? '-mod' : '')} leave={dispL} onApprove={() => handleApprove(dispL.leaveId, dispL.studentId)} onReject={() => handleRequestReject(dispL.leaveId, dispL.studentId)} isModified={!!mod} originalStatus={mod?.originalStatus || l.status}/>;
            })}
          </div>
        </div>
      ))}

      {currentlyDisplayedCount < totalProcessedLeavesCount && !isFetchingMore && !isLoading && (
        <div ref={loadMoreRef} className="flex justify-center py-8"><Button variant="ghost" color="primary" onPress={loadMoreLeaves} isLoading={isFetchingMore}>Load More</Button></div>
      )}
      {isFetchingMore && <div className="text-center py-8 font-semibold">Loading more...</div>}

      {hasPendingChanges() && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-4 border-t shadow-lg flex flex-col sm:flex-row justify-end gap-3 z-30">
          <Button variant="bordered" onPress={resetModifications} startContent={<CancelIcon className="h-5"/>} isDisabled={isApplyingChanges}>Cancel ({modifiedLeaves.size})</Button>
          <Button color="primary" onPress={() => setIsConfirmPopoverOpen(true)} startContent={<ArrowDownTrayIcon className="h-5"/>} isLoading={isApplyingChanges} isDisabled={isApplyingChanges}>Apply ({modifiedLeaves.size}) Changes</Button>
        </div>
      )}

      <Popover isOpen={isConfirmPopoverOpen} onClose={() => setIsConfirmPopoverOpen(false)} onConfirm={handleApplyChanges} title="Confirm Changes" content={`Apply ${modifiedLeaves.size} change(s)?`} isConfirmLoading={isApplyingChanges}/>
      <Popover isOpen={rejectionReasonPrompt.isOpen} onClose={() => setRejectionReasonPrompt(p => ({...p, isOpen: false}))} onConfirm={confirmReject} title="Rejection Reason"
        content={<Input label="Reason" placeholder="Enter reason" value={currentRejectionReason} onValueChange={setCurrentRejectionReason} fullWidth autoFocus isRequired />}
      />
    </div>
  );
};

export default ApproveLeavePage;