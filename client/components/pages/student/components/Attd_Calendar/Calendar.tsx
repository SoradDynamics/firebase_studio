// @/client/components/pages/common/Calendaar/Calendar.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CalendarData, MonthData, DayData } from "types/calendar"; // Ensure DayData is exported
import { StudentDocument, LeaveRecord, AttendanceMark } from "types/student"; // Your new types
import Table from "./Table";
// import Events from "./Events"; // REMOVE THIS
import Details from "./Details"; // ADD THIS
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import { databases, Query } from "~/utils/appwrite"; // Assuming appwrite utils are correctly set up
import { Toaster } from "react-hot-toast";
import { Spinner } from "@heroui/react";
import { convertBsToAd, getAdDatesInRange } from "~/utils/dateConverter"; // Your new utils

const API_BASE_URL = import.meta.env.VITE_SERVER_URL;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID_STUDENT = "coll-student"; // Assuming this is your student collection ID

// --- Helper Functions (Keep existing ones if still relevant like nepaliMonthNames, getNepaliMonthName, etc.) ---
const nepaliMonthNames = [
  "बैशाख", "जेठ", "असार", "श्रावण", "भाद्र", "आश्विन",
  "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुन", "चैत्र",
];
const getNepaliMonthName = (monthNumber: number): string => nepaliMonthNames[monthNumber - 1] || "Unknown";

const getGregorianInfo = (days: DayData[] = []): string => {
  if (!days || days.length === 0) return "";
  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  if (!firstDay?.en || !lastDay?.en) return "AD Info Unavailable";
  try {
    const startDateStr = firstDay.en.split("/");
    const endDateStr = lastDay.en.split("/");
    const startMonthName = new Date(parseInt(startDateStr[0]), parseInt(startDateStr[1]) - 1, parseInt(startDateStr[2])).toLocaleString("en-US", { month: "short" });
    const endMonthName = new Date(parseInt(endDateStr[0]), parseInt(endDateStr[1]) - 1, parseInt(endDateStr[2])).toLocaleString("en-US", { month: "short" });
    const startYear = startDateStr[0];
    const endYear = endDateStr[0];
    if (startYear === endYear) {
      return startMonthName === endMonthName ? `${startMonthName} ${startYear}` : `${startMonthName}/${endMonthName} ${startYear}`;
    } else {
      return `${startMonthName} ${startYear} / ${endMonthName} ${endYear}`;
    }
  } catch (e) {
    console.error("Error formatting Gregorian info:", firstDay.en, lastDay.en, e);
    return "AD Info Error";
  }
};

const findNepaliDateForGregorian = (data: CalendarData, gregorianDateString: string): { year: string; month: number } | null => {
  if (!data || !gregorianDateString) return null;
  let normalizedInputTime: number | null = null;
  try {
    const inputDate = new Date(gregorianDateString); // YYYY/M/D from calendar JSON
    inputDate.setHours(0, 0, 0, 0);
    normalizedInputTime = inputDate.getTime();
  } catch { return null; }

  if (normalizedInputTime === null) return null;

  for (const year in data) {
    if (data.hasOwnProperty(year)) {
      const months = data[year];
      for (const monthData of months) {
        const foundDay = monthData.days?.find((day) => {
          if (!day.en) return false;
          try {
            const dayDate = new Date(day.en);
            dayDate.setHours(0, 0, 0, 0);
            return dayDate.getTime() === normalizedInputTime;
          } catch { return false; }
        });
        if (foundDay) return { year: year, month: monthData.month };
      }
    }
  }
  return null;
};
// --- End Helper Functions ---

interface CalendarPageProps {
  studentId: string; // This is now a required prop
}

const Calendar: React.FC<CalendarPageProps> = ({ studentId }) => {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [currentBsYear, setCurrentBsYear] = useState<string | null>(null);
  const [currentBsMonth, setCurrentBsMonth] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1020);

  // NEW State for student attendance
  const [studentDoc, setStudentDoc] = useState<StudentDocument | null>(null);
  const [allAttendanceMarks, setAllAttendanceMarks] = useState<AttendanceMark[]>([]);
  const [processedApprovedLeaves, setProcessedApprovedLeaves] = useState<LeaveRecord[]>([]);


  const fetchStudentAttendanceData = useCallback(async () => {
    if (!studentId) {
      setError("Student ID is required to fetch attendance data.");
      console.error("Student ID not provided to Calendar component.");
      return;
    }
    // console.log(`Fetching attendance for student: ${studentId}`);
    try {
      const studentDocument = (await databases.getDocument(
        DATABASE_ID,
        COLLECTION_ID_STUDENT,
        studentId
      )) as StudentDocument;
      setStudentDoc(studentDocument);

      const marks: AttendanceMark[] = [];
      const approvedLeaves: LeaveRecord[] = [];

      // Process Absences (stored in AD)
      (studentDocument.absent || []).forEach((absentAdDate) => {
        if (absentAdDate && typeof absentAdDate === 'string') { // Ensure it's a valid string
            marks.push({ adDate: absentAdDate, type: "absent", originalRecord: { date: absentAdDate } });
        } else {
            console.warn("Invalid absent date found:", absentAdDate);
        }
      });

      // Process Leaves (JSON strings, dates are BS)
      (studentDocument.leave || []).forEach((leaveJson) => {
        try {
          const leaveRecord: LeaveRecord = JSON.parse(leaveJson);
          if (leaveRecord.status === "approved") {
            approvedLeaves.push(leaveRecord); // For Details.tsx

            if (leaveRecord.periodType === "dateRange" && leaveRecord.fromDate && leaveRecord.toDate) {
              const adFrom = convertBsToAd(leaveRecord.fromDate);
              const adTo = convertBsToAd(leaveRecord.toDate);
              if (adFrom && adTo) {
                const datesInRange = getAdDatesInRange(adFrom, adTo);
                datesInRange.forEach((adDate) => {
                  marks.push({ adDate, type: "leave", originalRecord: leaveRecord });
                });
              } else {
                console.warn("Could not convert date range for leave:", leaveRecord.leaveId, {from: leaveRecord.fromDate, to: leaveRecord.toDate});
              }
            } else if (leaveRecord.date) { // Single day leave
              const adDate = convertBsToAd(leaveRecord.date);
              if (adDate) {
                marks.push({ adDate, type: "leave", originalRecord: leaveRecord });
              } else {
                 console.warn("Could not convert single leave date:", leaveRecord.leaveId, {date: leaveRecord.date});
              }
            }
          }
        } catch (e) {
          console.error("Error parsing leave JSON:", leaveJson, e);
        }
      });
      setAllAttendanceMarks(marks);
      setProcessedApprovedLeaves(approvedLeaves);
      // console.log("Processed attendance marks:", marks.length, "Approved leaves:", approvedLeaves.length);

    } catch (appwriteError: any) {
      console.error("Error fetching student attendance data from Appwrite:", appwriteError);
      setError(`Failed to fetch student attendance. Details: ${appwriteError.message}`);
    }
  }, [studentId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Calendar Data (JSON)
        const calendarApiUrl = `${API_BASE_URL}/api/calendar`;
        const calendarResponse = await fetch(calendarApiUrl);
        if (!calendarResponse.ok) throw new Error(`HTTP error! Status: ${calendarResponse.status}`);
        const data: CalendarData = await calendarResponse.json();
        setCalendarData(data);

        const years = Object.keys(data || {}).sort((a, b) => parseInt(a) - parseInt(b));
        setAvailableYears(years);

        if (years.length > 0) {
          const today = new Date();
          const todayEnString = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
          const todaysNepaliDate = findNepaliDateForGregorian(data, todayEnString);
          let initialYear: string = years[years.length -1]; // fallback
          let initialMonth: number = data[initialYear]?.[0]?.month || 1; //fallback

          if (todaysNepaliDate && years.includes(todaysNepaliDate.year)) {
            initialYear = todaysNepaliDate.year;
            initialMonth = todaysNepaliDate.month;
          } else {
             console.warn(`Today's Gregorian date (${todayEnString}) not found in calendar data. Falling back.`);
          }
          setCurrentBsYear(initialYear);
          setCurrentBsMonth(initialMonth);
        } else {
          setError("No calendar years found in the data.");
        }

        // 2. Fetch Student Attendance Data (depends on studentId prop)
        if (studentId) { // Only fetch if studentId is available
            await fetchStudentAttendanceData();
        } else {
            console.warn("Student ID not available on initial load, skipping attendance fetch.");
            // Potentially set an error or a state indicating student selection is needed
        }

      } catch (err: any) {
        console.error("Error during initial data fetch:", err);
        setError(`Failed to load calendar data. Details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId, fetchStudentAttendanceData]); // Add studentId and fetchStudentAttendanceData to dependency array

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1020);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const currentMonthData: MonthData | undefined = useMemo(() => {
    if (!calendarData || !currentBsYear || currentBsMonth === null) return undefined;
    return calendarData?.[currentBsYear]?.find((m) => m.month === currentBsMonth);
  }, [calendarData, currentBsYear, currentBsMonth]);

  const { canGoPrev, canGoNext } = useMemo(() => {
    if (!calendarData || !currentBsYear || currentBsMonth === null) {
      return { canGoPrev: false, canGoNext: false };
    }
    const getAdjacentMonth = (direction: "prev" | "next"): boolean => {
      let targetMonth = direction === "prev" ? currentBsMonth - 1 : currentBsMonth + 1;
      let targetYear = currentBsYear;
      if (targetMonth < 1) {
        targetMonth = 12;
        targetYear = (parseInt(currentBsYear, 10) - 1).toString();
      } else if (targetMonth > 12) {
        targetMonth = 1;
        targetYear = (parseInt(currentBsYear, 10) + 1).toString();
      }
      return calendarData[targetYear]?.some((m) => m.month === targetMonth) ?? false;
    };
    return { canGoPrev: getAdjacentMonth("prev"), canGoNext: getAdjacentMonth("next") };
  }, [calendarData, currentBsYear, currentBsMonth]);

  const bsMonthName = useMemo(() => (currentBsMonth !== null ? getNepaliMonthName(currentBsMonth) : "..."), [currentBsMonth]);
  const gregorianInfo = useMemo(() => getGregorianInfo(currentMonthData?.days), [currentMonthData]);

  // Filter attendance marks for the current calendar view (month) to pass to Table.tsx
  const attendanceMarksForCurrentTable = useMemo(() => {
    if (!currentMonthData?.days || allAttendanceMarks.length === 0) return [];

    const monthViewAdDates = new Set<string>();
    currentMonthData.days.forEach(day => {
        if (day.en) {
            // Normalize day.en (YYYY/M/D) to YYYY-MM-DD for comparison
            try {
                const dateObj = new Date(day.en);
                const normalizedEnDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                monthViewAdDates.add(normalizedEnDate);
            } catch (e) {
                console.warn("Could not parse day.en for filtering marks:", day.en);
            }
        }
    });
    
    return allAttendanceMarks.filter(mark => monthViewAdDates.has(mark.adDate));
  }, [allAttendanceMarks, currentMonthData]);


  const handleYearChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = event.target.value;
    setCurrentBsYear(newYear);
    if (currentBsMonth === null) return;
    const monthsInNewYear = calendarData?.[newYear] || [];
    if (!monthsInNewYear.some((m) => m.month === currentBsMonth)) {
      setCurrentBsMonth(monthsInNewYear.length > 0 ? monthsInNewYear[0].month : null);
    }
  }, [calendarData, currentBsMonth]);

  const handleMonthChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentBsMonth(parseInt(event.target.value, 10));
  }, []);

  const handlePrevMonth = useCallback(() => { /* ... same as before ... */ }, [currentBsMonth, currentBsYear, calendarData]);
  const handleNextMonth = useCallback(() => { /* ... same as before ... */ }, [currentBsMonth, currentBsYear, calendarData]);


  if (loading) { /* ... same as before ... */ }
  if (error) { /* ... same as before ... */ }
  if (!calendarData || availableYears.length === 0 || !currentBsYear || currentBsMonth === null) {
     /* ... same as before ... */
     // Add a check for studentId if it's essential before rendering
     if (!studentId && !loading) { // Check after loading is false
        return (
            <div className="flex justify-center items-center h-screen p-4">
                 <div className="p-6 text-blue-700 bg-blue-100 border border-blue-400 rounded max-w-lg text-center shadow-lg">
                    <h3 className="font-bold text-lg mb-2">Student Not Selected</h3>
                    <p>Please select a student to view their attendance calendar.</p>
                </div>
            </div>
        );
     }
     // ... existing no data message ...
  }


  const today = new Date();
  const todayString = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`; // YYYY/M/D for Table's today highlight

  const tableProps = {
    currentMonthData,
    bsMonthName,
    bsYear: currentBsYear,
    gregorianInfo,
    availableYears,
    currentBsYear,
    currentBsMonth,
    onYearChange: handleYearChange,
    onMonthChange: handleMonthChange,
    onPrevMonth: handlePrevMonth,
    onNextMonth: handleNextMonth,
    canGoPrev,
    canGoNext,
    calendarData, // Keep if Table uses it directly for month existence checks
    todayString, // AD "YYYY/M/D" for highlighting today cell
    attendanceMarks: attendanceMarksForCurrentTable, // NEW: Pass processed marks
    // calendarEvents: [], // REMOVE: Or adapt if you still have global calendar events from JSON
    // onEventSaved: fetchStudentAttendanceData, // RENAME: If Table had actions, now it would refetch student data
  };

  // Props for Details.tsx
  const detailsProps = {
    studentId,
    currentBsMonthName: bsMonthName,
    currentBsYear: currentBsYear, // Ensure this is not null
    // Pass ALL absent AD dates and ALL approved leave records for the student
    // Details.tsx will filter them for the current month view internally
    allAbsentDatesAD: studentDoc?.absent || [],
    allApprovedLeaveRecords: processedApprovedLeaves,
    currentMonthViewAdDates: currentMonthData?.days.map(d => d.en).filter(Boolean) as string[] || [], // AD YYYY/M/D
  };

  const NoMonthDataMessage = () => ( /* ... same as before ... */ );

  return (
    <>
      {/* <Toaster /> */}
      <div className="flex flex-1 w-full h-full ">
        {isMobile ? (
          <div className=" bg-gray-100 flex-1 rounded-lg sm:p-3">
            <PerfectScrollbar>
              <div className="flex-1 rounded-lg overflow-y-auto">
                <Table {...tableProps} />
                <div className="mt-5">
                  {currentMonthData && studentDoc ? ( // Check studentDoc too
                    <Details {...detailsProps} />
                  ) : (
                    <NoMonthDataMessage />
                  )}
                </div>
              </div>
            </PerfectScrollbar>
          </div>
        ) : (
          <div className="flex w-full gap-4 p-3">
            <div className="flex flex-col items-center bg-gray-100 rounded-lg shadow-md overflow-hidden max-w-[60%]">
              <Table {...tableProps} />
            </div>
            <div className="flex-1 bg-gray-100 rounded-lg shadow-md overflow-y-auto p-4">
              {currentMonthData && studentDoc ? ( // Check studentDoc too
                <Details {...detailsProps} />
              ) : (
                <NoMonthDataMessage />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Calendar;