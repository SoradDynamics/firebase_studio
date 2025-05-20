// src/components/Calendar/StudentAttendanceCalendar.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CalendarData, MonthData, DayData } from "types/calendar"; // Ensure types/calendar.ts exists
import Table from "./Table";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import { Spinner } from "@heroui/react";
import { getNepaliMonthName as utilGetNepaliMonthName } from "~/utils/dateUtils";

const API_BASE_URL = import.meta.env.VITE_SERVER_URL;

// Helper Functions (copied from original Calendar.tsx, but ensure they use correct types)
const getNepaliMonthName = (monthNumber: number): string => utilGetNepaliMonthName(monthNumber);

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
    const [year, month, day] = gregorianDateString.split('/').map(Number);
    const inputDate = new Date(year, month - 1, day); // JS Date month is 0-indexed
    inputDate.setHours(0, 0, 0, 0);
    normalizedInputTime = inputDate.getTime();
  } catch(e) {
    console.error("Could not parse input gregorianDateString in findNepaliDateForGregorian:", gregorianDateString, e);
    return null;
  }
  if (normalizedInputTime === null) return null;

  for (const yearKey in data) {
    if (data.hasOwnProperty(yearKey)) {
      const months = data[yearKey];
      for (const monthData of months) {
        const foundDay = monthData.days?.find((dayItem) => {
          if (!dayItem.en) return false;
          try {
            const [dYear, dMonth, dDay] = dayItem.en.split('/').map(Number);
            const dayDate = new Date(dYear, dMonth - 1, dDay);
            dayDate.setHours(0, 0, 0, 0);
            return dayDate.getTime() === normalizedInputTime;
          } catch {
            return false;
          }
        });
        if (foundDay) {
          return { year: yearKey, month: monthData.month };
        }
      }
    }
  }
  return null;
};

interface StudentAttendanceCalendarProps {
    absentDatesAD: string[]; // YYYY-MM-DD
    approvedLeaveDatesAD: string[]; // YYYY-MM-DD
    onViewChange?: (bsYear: string, bsMonth: number, bsCalendarJson: CalendarData | null) => void;
}

const StudentAttendanceCalendar: React.FC<StudentAttendanceCalendarProps> = ({
    absentDatesAD,
    approvedLeaveDatesAD,
    onViewChange
}) => {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [currentBsYear, setCurrentBsYear] = useState<string | null>(null);
  const [currentBsMonth, setCurrentBsMonth] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1020);

  useEffect(() => {
    if (currentBsYear && currentBsMonth && onViewChange) {
        onViewChange(currentBsYear, currentBsMonth, calendarData);
    }
  }, [currentBsYear, currentBsMonth, calendarData, onViewChange]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const calendarApiUrl = `${API_BASE_URL}/api/calendar`;
        const calendarResponse = await fetch(calendarApiUrl);
        if (!calendarResponse.ok) {
          throw new Error(`HTTP error! Status: ${calendarResponse.status} - ${calendarResponse.statusText}`);
        }
        const data: CalendarData = await calendarResponse.json();
        setCalendarData(data);

        const years = Object.keys(data || {}).sort((a, b) => parseInt(a) - parseInt(b));
        setAvailableYears(years);

        if (years.length > 0) {
          const today = new Date();
          const todayEnString = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`; // YYYY/M/D
          const todaysNepaliDate = findNepaliDateForGregorian(data, todayEnString);
          
          let initialYear: string;
          let initialMonth: number;

          if (todaysNepaliDate && years.includes(todaysNepaliDate.year)) {
            initialYear = todaysNepaliDate.year;
            initialMonth = todaysNepaliDate.month;
          } else {
            console.warn(
              `Today's Gregorian date (${todayEnString}) not found in calendar data or year missing. Falling back to latest available year/month.`
            );
            initialYear = years[years.length - 1];
            const monthsInFallbackYear = data[initialYear] || [];
            initialMonth = monthsInFallbackYear.length > 0 ? monthsInFallbackYear[0].month : 1; // Fallback to first month
          }
          setCurrentBsYear(initialYear);
          setCurrentBsMonth(initialMonth);
        } else {
          setError("No calendar years found in the data.");
        }
      } catch (err: any) {
        console.error("Error during initial data fetch:", err);
        setError(`Failed to load calendar data. Details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
    return { canGoPrev: getAdjacentMonth("prev"), canGoNext: getAdjacentMonth("next")};
  }, [calendarData, currentBsYear, currentBsMonth]);

  const bsMonthName = useMemo(
    () => (currentBsMonth !== null ? getNepaliMonthName(currentBsMonth) : "..."),
    [currentBsMonth]
  );

  const gregorianInfo = useMemo(
    () => getGregorianInfo(currentMonthData?.days),
    [currentMonthData]
  );

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

  const handlePrevMonth = useCallback(() => {
    if (!calendarData || !currentBsYear || currentBsMonth === null) return;
    let targetMonth = currentBsMonth - 1;
    let targetYear = currentBsYear;
    if (targetMonth < 1) {
      targetMonth = 12;
      targetYear = (parseInt(currentBsYear, 10) - 1).toString();
    }
    if (calendarData?.[targetYear]?.some((m) => m.month === targetMonth)) {
      setCurrentBsYear(targetYear);
      setCurrentBsMonth(targetMonth);
    }
  }, [currentBsMonth, currentBsYear, calendarData]);

  const handleNextMonth = useCallback(() => {
    if (!calendarData || !currentBsYear || currentBsMonth === null) return;
    let targetMonth = currentBsMonth + 1;
    let targetYear = currentBsYear;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear = (parseInt(currentBsYear, 10) + 1).toString();
    }
    if (calendarData?.[targetYear]?.some((m) => m.month === targetMonth)) {
      setCurrentBsYear(targetYear);
      setCurrentBsMonth(targetMonth);
    }
  }, [currentBsMonth, currentBsYear, calendarData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner color="primary" size="lg" label="Loading Calendar..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-96 p-4">
        <div className="p-6 text-red-700 bg-red-100 border border-red-400 rounded max-w-lg text-center">
          <h3 className="font-bold text-lg mb-2">Error Loading Calendar</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!calendarData || availableYears.length === 0 || !currentBsYear || currentBsMonth === null) {
    return (
      <div className="flex justify-center items-center h-96 p-4">
        <div className="p-6 text-yellow-800 bg-yellow-100 border border-yellow-400 rounded max-w-lg text-center">
          <h3 className="font-bold text-lg mb-2">Calendar Data Unavailable</h3>
          <p>Could not display the calendar. Required data might be missing.</p>
        </div>
      </div>
    );
  }
  
  const today = new Date();
  const todayStringAD_YYYY_M_D = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

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
    calendarData,
    todayStringAD: todayStringAD_YYYY_M_D,
    absentDatesAD,
    approvedLeaveDatesAD,
  };

  const NoMonthDataMessage = () => (
    <div className="text-center p-6 bg-yellow-100 border border-yellow-400 rounded shadow-md w-full mt-4">
      {`No calendar data available for ${bsMonthName} ${currentBsYear}.`}
    </div>
  );

  return (
    <div className="flex flex-1 w-full h-full">
      <div className="bg-gray-50 flex-1 rounded-lg sm:p-3 w-full">
        <PerfectScrollbar options={{ wheelPropagation: false }}>
          <div className="rounded-lg overflow-y-auto">
            {currentMonthData ? (
              <Table {...tableProps} />
            ) : (
              <NoMonthDataMessage />
            )}
          </div>
        </PerfectScrollbar>
      </div>
    </div>
  );
};

export default StudentAttendanceCalendar;