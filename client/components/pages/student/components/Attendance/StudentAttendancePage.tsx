// src/pages/student/StudentAttendancePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { databases, account, Query, APPWRITE_DATABASE_ID, STUDENTS_COLLECTION_ID } from '~/utils/appwrite';
import StudentAttendanceCalendar from './StudentAttendanceCalendar';
import AttendanceDetails from './AttendanceDetails';
import { StudentData, ProcessedLeave, LeaveData } from 'types/attendance';
import { CalendarData } from 'types/calendar';
import { convertBsToAd, convertAdToBs, getDatesInRangeAD, normalizeToYYYYMMDD } from '~/utils/dateUtils';
import { Spinner, Card, CardBody } from "@heroui/react"; // Assuming HeroUI has Card components
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast'; // For displaying toast notifications

const StudentAttendancePage: React.FC = () => {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [allAbsentDatesAD, setAllAbsentDatesAD] = useState<string[]>([]);
  const [allApprovedLeaveDatesAD, setAllApprovedLeaveDatesAD] = useState<string[]>([]);
  const [allProcessedApprovedLeaves, setAllProcessedApprovedLeaves] = useState<ProcessedLeave[]>([]);
  
  const [currentVisibleBsYear, setCurrentVisibleBsYear] = useState<string | null>(null);
  const [currentVisibleBsMonth, setCurrentVisibleBsMonth] = useState<number | null>(null);
  const [bsCalendarJsonForCurrentView, setBsCalendarJsonForCurrentView] = useState<CalendarData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      setLoading(true);
      setError(null);
      try {
        const currentUser = await account.get();
        if (!currentUser.email) throw new Error("User session not found. Please log in.");
        
        const studentResponse = await databases.listDocuments(
          APPWRITE_DATABASE_ID, STUDENTS_COLLECTION_ID,
          [Query.equal('stdEmail', currentUser.email), Query.limit(1)]
        );

        if (studentResponse.documents.length === 0) throw new Error("Student record not found.");
        
        const studentData = studentResponse.documents[0] as StudentData;
        setStudent(studentData);

        const absences = studentData.absent?.map(d => normalizeToYYYYMMDD(d)).filter(d => d !== null) as string[] || [];
        setAllAbsentDatesAD(absences);

        const approvedLeavesList: ProcessedLeave[] = [];
        const collectiveLeaveAdDatesForCalendar: string[] = [];

        if (studentData.leave && Array.isArray(studentData.leave)) {
            studentData.leave.forEach(leaveString => {
                let parsedLeave: LeaveData | null = null;
                try { parsedLeave = JSON.parse(leaveString as any) as LeaveData; } 
                catch (e) { console.error("Failed to parse leave string:", leaveString, e); return; }

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

      } catch (err: any) {
        setError(err.message || "An unknown error occurred.");
        toast.error(err.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, []);

  const handleCalendarViewChange = useCallback((bsYear: string, bsMonth: number, bsCalendarJson: CalendarData | null) => {
    setCurrentVisibleBsYear(bsYear);
    setCurrentVisibleBsMonth(bsMonth);
    setBsCalendarJsonForCurrentView(bsCalendarJson);
  }, []);

  if (loading && !student) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-4">
        <Spinner color="primary" size="lg" />
        <p className="mt-4 text-lg text-gray-700">Loading Your Attendance Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-4">
        <Card className="w-full max-w-md bg-red-50 shadow-xl">
            <CardBody className="p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-semibold text-red-700 mb-2">Oops! Something went wrong.</h3>
                <p className="text-red-600">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                >
                    Try Reloading
                </button>
            </CardBody>
        </Card>
      </div>
    );
  }

  if (!student) {
    return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-4">
            <p className="text-center text-xl text-gray-600">No student data found. Please ensure you are logged in correctly.</p>
        </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <div className="h-full bg-gradient-to-br from-slate-100 to-sky-100 p-4 sm:p-6 lg:p-8">
        <header className="mb-8 text-center">
          <h1 className="text-2xl  font-bold text-slate-800">
            My Attendance Overview
          </h1>
          <p className="text-slate-600 text-sm">Welcome, {student.name}. View your attendance and leave records.</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Calendar Section */}
          <div className="lg:w-7/12 xl:w-8/12"> {/* Adjust width ratio as needed */}
            <Card className="shadow-2xl overflow-hidden">
              <CardBody className="p-0 sm:p-2"> {/* Calendar might have its own padding */}
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
                  <p>Select a month on the calendar to view details.</p>
                  {loading && <Spinner color="secondary" size="md" className="mt-4" />}
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentAttendancePage;