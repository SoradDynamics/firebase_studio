// src/pages/parent/ParentAttendancePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { databases, Query, APPWRITE_DATABASE_ID, STUDENTS_COLLECTION_ID } from '~/utils/appwrite';
import StudentAttendanceCalendar from '../../../student/components/Attendance/StudentAttendanceCalendar'; // Re-used
import AttendanceDetails from '../../../student/components/Attendance/AttendanceDetails'; // Re-used
import SelectStudentComponent from '../Select/SelectStudent'; // Your component
import { useSelectedStudent } from '../../contexts/SelectedStudentContext'; // Your context hook
import { Student, ProcessedLeave, LeaveData } from 'types/attendance'; // Using attendance types, ensure Student type matches
import { CalendarData } from 'types/calendar';
import { convertBsToAd, convertAdToBs, getDatesInRangeAD, normalizeToYYYYMMDD } from '~/utils/dateUtils';
import { Spinner, Card, CardBody } from "@heroui/react";
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const ParentAttendancePage: React.FC = () => {
  const { selectedStudentId } = useSelectedStudent(); // Get selected student ID from context

  // State for the selected student's attendance data
  const [selectedStudentData, setSelectedStudentData] = useState<Student | null>(null);
  const [allAbsentDatesAD, setAllAbsentDatesAD] = useState<string[]>([]);
  const [allApprovedLeaveDatesAD, setAllApprovedLeaveDatesAD] = useState<string[]>([]);
  const [allProcessedApprovedLeaves, setAllProcessedApprovedLeaves] = useState<ProcessedLeave[]>([]);
  
  // State for calendar view
  const [currentVisibleBsYear, setCurrentVisibleBsYear] = useState<string | null>(null);
  const [currentVisibleBsMonth, setCurrentVisibleBsMonth] = useState<number | null>(null);
  const [bsCalendarJsonForCurrentView, setBsCalendarJsonForCurrentView] = useState<CalendarData | null>(null);

  const [loadingStudentAttendance, setLoadingStudentAttendance] = useState(false);
  const [studentAttendanceError, setStudentAttendanceError] = useState<string | null>(null);

  const fetchAttendanceForSelectedStudent = useCallback(async () => {
    if (!selectedStudentId) {
      // Clear data if no student is selected
      setSelectedStudentData(null);
      setAllAbsentDatesAD([]);
      setAllApprovedLeaveDatesAD([]);
      setAllProcessedApprovedLeaves([]);
      setStudentAttendanceError(null);
      return;
    }

    setLoadingStudentAttendance(true);
    setStudentAttendanceError(null);
    console.log(`[PARENT_ATTENDANCE] Fetching attendance for student ID: ${selectedStudentId}`);

    try {
      const studentDoc = await databases.getDocument<Student>(
        APPWRITE_DATABASE_ID,
        STUDENTS_COLLECTION_ID,
        selectedStudentId
      );
      setSelectedStudentData(studentDoc);
      console.log("[PARENT_ATTENDANCE] Selected student data:", JSON.stringify(studentDoc, null, 2));


      const absences = studentDoc.absent?.map(d => normalizeToYYYYMMDD(d)).filter(d => d !== null) as string[] || [];
      setAllAbsentDatesAD(absences);

      const approvedLeavesList: ProcessedLeave[] = [];
      const collectiveLeaveAdDatesForCalendar: string[] = [];

      if (studentDoc.leave && Array.isArray(studentDoc.leave)) {
        studentDoc.leave.forEach(leaveString => {
          let parsedLeave: LeaveData | null = null;
          try { parsedLeave = JSON.parse(leaveString) as LeaveData; } 
          catch (e) { console.error("[PARENT_ATTENDANCE] Failed to parse leave string:", leaveString, e); return; }

          if (parsedLeave && parsedLeave.status === 'approved') {
            const processedLeaveItem: ProcessedLeave = { ...parsedLeave, adDates: [], bsDatesDisplay: [] };
            let currentLeaveADs: string[] = [];
            let originalBsDatesForDisplay: string[] = [];

            if (parsedLeave.periodType === 'dateRange' && parsedLeave.fromDate && parsedLeave.toDate) {
              const fromAD = convertBsToAd(parsedLeave.fromDate);
              const toAD = convertBsToAd(parsedLeave.toDate);
              if (fromAD && toAD) {
                currentLeaveADs = getDatesInRangeAD(fromAD, toAD);
                originalBsDatesForDisplay = currentLeaveADs.map(ad => convertAdToBs(ad)).filter(bs => bs !== null) as string[];
              }
            } else if (parsedLeave.date) {
              const singleAD = convertBsToAd(parsedLeave.date);
              if (singleAD) {
                currentLeaveADs = [singleAD];
                originalBsDatesForDisplay = [parsedLeave.date];
              }
            }
            
            processedLeaveItem.adDates = currentLeaveADs.map(d => normalizeToYYYYMMDD(d)).filter(d => d !== null) as string[];
            processedLeaveItem.bsDatesDisplay = originalBsDatesForDisplay.map(d => normalizeToYYYYMMDD(d)).filter(d => d !== null) as string[];
            
            if (processedLeaveItem.adDates.length > 0) {
              approvedLeavesList.push(processedLeaveItem);
              collectiveLeaveAdDatesForCalendar.push(...processedLeaveItem.adDates);
            }
          }
        });
      }
      setAllProcessedApprovedLeaves(approvedLeavesList);
      setAllApprovedLeaveDatesAD(Array.from(new Set(collectiveLeaveAdDatesForCalendar)));
      console.log("[PARENT_ATTENDANCE] FINAL Processed Leaves for selected student:", JSON.stringify(approvedLeavesList, null, 2));
      console.log("[PARENT_ATTENDANCE] FINAL Approved Leave AD Dates for selected student:", JSON.stringify(Array.from(new Set(collectiveLeaveAdDatesForCalendar)), null, 2));


    } catch (err: any) {
      console.error(`[PARENT_ATTENDANCE] Error fetching attendance for student ${selectedStudentId}:`, err);
      setStudentAttendanceError(err.message || "Failed to load attendance data for the selected student.");
      toast.error(err.message || "Failed to load student's attendance.");
      // Clear data on error for this student
      setSelectedStudentData(null);
      setAllAbsentDatesAD([]);
      setAllApprovedLeaveDatesAD([]);
      setAllProcessedApprovedLeaves([]);
    } finally {
      setLoadingStudentAttendance(false);
    }
  }, [selectedStudentId]); // Dependency: re-fetch when selectedStudentId changes

  useEffect(() => {
    fetchAttendanceForSelectedStudent();
  }, [fetchAttendanceForSelectedStudent]);

  const handleCalendarViewChange = useCallback((bsYear: string, bsMonth: number, bsCalendarJson: CalendarData | null) => {
    setCurrentVisibleBsYear(bsYear);
    setCurrentVisibleBsMonth(bsMonth);
    setBsCalendarJsonForCurrentView(bsCalendarJson);
  }, []);

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <div className="h-full  p-4 sm:p-6 lg:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 text-center">
            Student Attendance Portal
          </h1>
          {/* <p className="text-slate-600 text-sm">Select a student to view their attendance records.</p> */}
        </header>

        {/* Student Selector - This uses your existing component */}
        <div className="mb-">
            <SelectStudentComponent />
        </div>

        {!selectedStudentId && (
            <Card className="shadow-xl">
                <CardBody className="p-8 text-center">
                    <InformationCircleIcon className="mx-auto h-16 w-16 text-blue-400 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700">No Student Selected</h3>
                    <p className="text-slate-500 mt-2">Please select one of your children from the dropdown above to view their attendance details.</p>
                </CardBody>
            </Card>
        )}

        {selectedStudentId && loadingStudentAttendance && (
            <div className="flex flex-col justify-center items-center py-10">
                <Spinner color="primary" size="lg" />
                <p className="mt-3 text-slate-600">Loading attendance for {selectedStudentData?.name || 'selected student'}...</p>
            </div>
        )}

        {selectedStudentId && studentAttendanceError && (
             <Card className="w-full bg-red-50 shadow-xl">
                <CardBody className="p-6 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-red-700 mb-1">Error Loading Attendance</h3>
                    <p className="text-red-600 text-sm">{studentAttendanceError}</p>
                </CardBody>
            </Card>
        )}

        {selectedStudentId && !loadingStudentAttendance && !studentAttendanceError && selectedStudentData && (
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* Calendar Section */}
                <div className="lg:w-7/12 xl:w-8/12">
                    <Card className="shadow-2xl overflow-hidden">
                    <CardBody className="p-0 sm:p-2">
                        <StudentAttendanceCalendar
                            absentDatesAD={allAbsentDatesAD}
                            approvedLeaveDatesAD={allApprovedLeaveDatesAD}
                            onViewChange={handleCalendarViewChange}
                        />
                    </CardBody>
                    </Card>
                </div>

                {/* Details Section */}
                <div className="lg:w-5/12 xl:w-4/12">
                    {currentVisibleBsYear && currentVisibleBsMonth && bsCalendarJsonForCurrentView ? (
                    <AttendanceDetails
                        currentBsYear={currentVisibleBsYear}
                        currentBsMonth={currentVisibleBsMonth}
                        absentDatesAD={allAbsentDatesAD} 
                        allProcessedApprovedLeaves={allProcessedApprovedLeaves} 
                        bsCalendarDataForMonth={bsCalendarJsonForCurrentView}
                    />
                    ) : (
                    <Card className="shadow-xl">
                        <CardBody className="p-6 text-center text-slate-500">
                        <p>Calendar is loading or month not selected.</p>
                        {/* Minor spinner if details depend on calendar interaction */}
                        </CardBody>
                    </Card>
                    )}
                </div>
            </div>
        )}
      </div>
    </>
  );
};

export default ParentAttendancePage;