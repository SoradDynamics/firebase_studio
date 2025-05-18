// src/components/Calendar.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CalendarData, MonthData, DayData } from "types/calendar";
import Table from "./Table";
import Events from "./Events";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css"; // Keep if using perfect-scrollbar elsewhere, otherwise check usage
import { databases, Query } from "~/utils/appwrite";
import { Toaster } from "react-hot-toast"; // <-- Import Toaster
import { Spinner } from "@heroui/react";

const API_BASE_URL = import.meta.env.VITE_SERVER_URL;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_CALENDAR_COLLECTION_ID;

// --- Helper Functions ---
const nepaliMonthNames = [
  "बैशाख",
  "जेठ",
  "असार",
  "श्रावण",
  "भाद्र",
  "आश्विन",
  "कार्तिक",
  "मंसिर",
  "पौष",
  "माघ",
  "फाल्गुन",
  "चैत्र",
];
const getNepaliMonthName = (monthNumber: number): string =>
  nepaliMonthNames[monthNumber - 1] || "Unknown";

const getGregorianInfo = (days: DayData[] = []): string => {
  if (!days || days.length === 0) return "";
  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  if (!firstDay?.en || !lastDay?.en) return "AD Info Unavailable";
  try {
    // Use a simple approach that doesn't rely heavily on locale string formatting issues
    const startDateStr = firstDay.en.split("/"); // "YYYY/M/D"
    const endDateStr = lastDay.en.split("/"); // "YYYY/M/D"

    const startMonthName = new Date(
      parseInt(startDateStr[0]),
      parseInt(startDateStr[1]) - 1,
      parseInt(startDateStr[2])
    ).toLocaleString("en-US", { month: "short" });
    const endMonthName = new Date(
      parseInt(endDateStr[0]),
      parseInt(endDateStr[1]) - 1,
      parseInt(endDateStr[2])
    ).toLocaleString("en-US", { month: "short" });
    const startYear = startDateStr[0];
    const endYear = endDateStr[0];

    if (startYear === endYear) {
      return startMonthName === endMonthName
        ? `${startMonthName} ${startYear}`
        : `${startMonthName}/${endMonthName} ${startYear}`;
    } else {
      return `${startMonthName} ${startYear} / ${endMonthName} ${endYear}`;
    }
  } catch (e) {
    console.error(
      "Error formatting Gregorian info:",
      firstDay.en,
      lastDay.en,
      e
    );
    // Fallback using string splitting if Date object fails
    const startParts = firstDay.en?.split("/") ?? [];
    const endParts = lastDay.en?.split("/") ?? [];
    if (startParts.length >= 2 && endParts.length >= 2) {
      return `AD: ${startParts[1]}/${startParts[0]} - ${endParts[1]}/${endParts[0]}`;
    }
    return "AD Info Error";
  }
};

const findNepaliDateForGregorian = (
  data: CalendarData,
  gregorianDateString: string // Expects "YYYY/M/D"
): { year: string; month: number } | null => {
  if (!data || !gregorianDateString) return null;

  let normalizedInputTime: number | null = null;
  try {
    const inputDate = new Date(gregorianDateString);
    inputDate.setHours(0, 0, 0, 0);
    normalizedInputTime = inputDate.getTime();
  } catch {
    console.error(
      "Could not parse input gregorianDateString in findNepaliDateForGregorian:",
      gregorianDateString
    );
    return null;
  }

  if (normalizedInputTime === null) return null; // Could not parse input date

  for (const year in data) {
    if (data.hasOwnProperty(year)) {
      const months = data[year];
      for (const monthData of months) {
        const foundDay = monthData.days?.find((day) => {
          if (!day.en) return false;
          try {
            const dayDate = new Date(day.en);
            dayDate.setHours(0, 0, 0, 0);
            // Compare timestamps for accuracy
            return dayDate.getTime() === normalizedInputTime;
          } catch {
            // Ignore days with invalid date formats
            // console.warn("Could not parse day.en in findNepaliDateForGregorian:", day.en);
            return false;
          }
        });
        if (foundDay) {
          return { year: year, month: monthData.month };
        }
      }
    }
  }
  return null; // Not found
};
// --- End Helper Functions ---

const Calendar: React.FC = () => {
  // --- State Variables ---
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [currentBsYear, setCurrentBsYear] = useState<string | null>(null);
  const [currentBsMonth, setCurrentBsMonth] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1020);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]); // Consider defining a stricter type

  // --- Functions ---
  const fetchCalendarEvents = useCallback(async () => {
    // console.log("Fetching calendar events..."); // Optional logging
    try {
      const eventsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.limit(150)] // Increased limit slightly, consider pagination for > 100s of events
      );
      setCalendarEvents(eventsResponse.documents);
      // console.log("Fetched calendar events:", eventsResponse.documents.length);
    } catch (appwriteError: any) {
      console.error(
        "Error fetching calendar events from Appwrite:",
        appwriteError
      );
      // Use toast for fetch errors as well? Or keep the main error state?
      // toast.error(`Failed to fetch events: ${appwriteError.message}`);
      setError(
        `Failed to fetch calendar events. Please try refreshing. Details: ${appwriteError.message}`
      );
    }
  }, []); // No dependencies needed here

  // --- Effects ---
  useEffect(() => {
    const fetchData = async () => {
    //   console.log("Initiating data fetch...");
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Calendar Data (JSON)
        const calendarApiUrl = `${API_BASE_URL}/api/calendar`;
        // console.log("Fetching calendar data from:", calendarApiUrl);
        const calendarResponse = await fetch(calendarApiUrl);
        if (!calendarResponse.ok) {
          let backendErrorMsg = `HTTP error! Status: ${calendarResponse.status}`;
          try {
            const errorData = await calendarResponse.json();
            backendErrorMsg += ` - ${
              errorData.message || "No backend message."
            }`;
          } catch {
            backendErrorMsg += ` - ${calendarResponse.statusText}`;
          }
          throw new Error(backendErrorMsg);
        }
        const data: CalendarData = await calendarResponse.json();
        setCalendarData(data);
        // console.log("Fetched calendar JSON data successfully.");

        const years = Object.keys(data || {}).sort(
          (a, b) => parseInt(a) - parseInt(b)
        );
        setAvailableYears(years);

        if (years.length > 0) {
          const today = new Date();
          // Format MUST match the format in your calendar JSON's 'en' field (YYYY/M/D)
          const todayEnString = `${today.getFullYear()}/${
            today.getMonth() + 1
          }/${today.getDate()}`;
          // console.log("Today's Gregorian date string (for lookup):", todayEnString);

          const todaysNepaliDate = findNepaliDateForGregorian(
            data,
            todayEnString
          );
          let initialYear: string;
          let initialMonth: number;

          if (todaysNepaliDate && years.includes(todaysNepaliDate.year)) {
            initialYear = todaysNepaliDate.year;
            initialMonth = todaysNepaliDate.month;
            // console.log("Found today's Nepali date:", todaysNepaliDate);
          } else {
            console.warn(
              `Today's Gregorian date (${todayEnString}) not found in calendar data or year missing. Falling back to latest available year/month.`
            );
            initialYear = years[years.length - 1]; // Fallback to latest year
            const monthsInFallbackYear = data[initialYear] || [];
            if (monthsInFallbackYear.length > 0) {
              initialMonth = monthsInFallbackYear[0].month; // Fallback to first month of latest year
            } else {
              // This case should be rare if data structure is consistent
              setError(
                "Could not determine an initial month for the calendar. The latest year has no months."
              );
              console.error("Fallback year has no month data:", initialYear);
              setLoading(false);
              return;
            }
          }
          setCurrentBsYear(initialYear);
          setCurrentBsMonth(initialMonth);
          // console.log("Set initial BS Year:", initialYear, "Month:", initialMonth);
        } else {
          setError("No calendar years found in the data.");
          console.error("Calendar data fetched but contained no years.");
        }

        // 2. Fetch Calendar Events from Appwrite AFTER setting initial date
        await fetchCalendarEvents();
      } catch (err: any) {
        console.error("Error during initial data fetch:", err);
        let errorMessage = "Failed to load calendar data.";
        if (err instanceof Error) {
          errorMessage += ` Details: ${err.message}`;
        }
        if (err.message?.toLowerCase().includes("failed to fetch")) {
          errorMessage += " Is the backend server running or accessible?";
        } else if (err.message?.toLowerCase().includes("http error")) {
          errorMessage += " Problem communicating with the backend.";
        } else if (err instanceof SyntaxError) {
          errorMessage += " Received invalid data format from the backend.";
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
        // console.log("Initial data fetch process finished.");
      }
    };
    fetchData();
    // Run only once on mount. fetchCalendarEvents is stable due to useCallback.
  }, [fetchCalendarEvents]);

  // Effect for handling window resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1020);
    checkMobile(); // Initial check
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile); // Cleanup listener
  }, []);

  // Memoized calculation for current month's data
  const currentMonthData: MonthData | undefined = useMemo(() => {
    if (!calendarData || !currentBsYear || currentBsMonth === null)
      return undefined;
    // console.log(`Memo: Getting month data for ${currentBsYear}-${currentBsMonth}`);
    return calendarData?.[currentBsYear]?.find(
      (m) => m.month === currentBsMonth
    );
  }, [calendarData, currentBsYear, currentBsMonth]);

  // Memoized calculation for navigation button availability
  const { canGoPrev, canGoNext } = useMemo(() => {
    if (!calendarData || !currentBsYear || currentBsMonth === null) {
      return { canGoPrev: false, canGoNext: false };
    }
    const getAdjacentMonth = (direction: "prev" | "next"): boolean => {
      let targetMonth =
        direction === "prev" ? currentBsMonth - 1 : currentBsMonth + 1;
      let targetYear = currentBsYear;
      if (targetMonth < 1) {
        targetMonth = 12;
        targetYear = (parseInt(currentBsYear, 10) - 1).toString();
      } else if (targetMonth > 12) {
        targetMonth = 1;
        targetYear = (parseInt(currentBsYear, 10) + 1).toString();
      }
      // Check if the target year and month exist in the data
      return (
        calendarData[targetYear]?.some((m) => m.month === targetMonth) ?? false
      );
    };
    // console.log("Memo: Calculating canGoPrev/canGoNext");
    return {
      canGoPrev: getAdjacentMonth("prev"),
      canGoNext: getAdjacentMonth("next"),
    };
  }, [calendarData, currentBsYear, currentBsMonth]);

  // Memoized Nepali month name
  const bsMonthName = useMemo(
    () =>
      currentBsMonth !== null ? getNepaliMonthName(currentBsMonth) : "...", // Use '...' instead of 'Loading...'
    [currentBsMonth]
  );

  // Memoized Gregorian date range info string
  const gregorianInfo = useMemo(
    () => getGregorianInfo(currentMonthData?.days),
    [currentMonthData]
  );

  // Memoized filtering of events for the current view
  const filteredCalendarEvents = useMemo(() => {
    if (!calendarEvents || !currentMonthData?.days) {
      // console.log("FilteredEvents: Skipping - No events or no current month days.");
      return [];
    }

    const currentMonthDays = currentMonthData.days; // Use the full day objects
    // console.log("FilteredEvents: Days in current view:", currentMonthDays.map(d=>d.en));

    return calendarEvents.filter((event) => {
      // Basic validation of event structure
      if (
        !event ||
        !event.$id ||
        !event.dates ||
        !Array.isArray(event.dates) ||
        event.dates.length === 0 ||
        !event.dates[0]
      ) {
        // console.warn(`FilteredEvents: Skipping event with invalid structure or dates:`, event);
        return false;
      }

      try {
        // --- Normalize event dates (assuming AD format like "YYYY-MM-DD" or "YYYY/M/D") ---
        const eventStartDate = new Date(event.dates[0]);
        eventStartDate.setHours(0, 0, 0, 0); // Normalize start date to midnight

        let eventEndDate;
        // Use the second date if it exists and is valid, otherwise treat as single-day
        if (event.dates.length > 1 && event.dates[1]) {
          eventEndDate = new Date(event.dates[1]);
        } else {
          eventEndDate = new Date(event.dates[0]); // Single day event
        }
        eventEndDate.setHours(0, 0, 0, 0); // Normalize end date to midnight

        // Quick check: If event ends before the first day of the month or starts after the last day, skip
        const firstDayOfMonth = currentMonthDays[0]?.en;
        const lastDayOfMonth =
          currentMonthDays[currentMonthDays.length - 1]?.en;
        if (firstDayOfMonth && lastDayOfMonth) {
          try {
            const firstDayDate = new Date(firstDayOfMonth);
            firstDayDate.setHours(0, 0, 0, 0);
            const lastDayDate = new Date(lastDayOfMonth);
            lastDayDate.setHours(0, 0, 0, 0);
            if (
              eventEndDate.getTime() < firstDayDate.getTime() ||
              eventStartDate.getTime() > lastDayDate.getTime()
            ) {
              // console.log(`FilteredEvents: Event ${event.$id} (${event.name}) is outside month range, skipping.`);
              return false;
            }
          } catch (rangeCheckError) {
            console.warn("Error during month range pre-check", rangeCheckError);
            // Proceed without pre-check if dates are invalid
          }
        }

        // --- Check against current month's days ---
        for (const day of currentMonthDays) {
          if (!day.en) continue; // Skip if day has no 'en' date

          try {
            const dayDate = new Date(day.en);
            dayDate.setHours(0, 0, 0, 0); // Normalize day's date to midnight

            // Compare timestamps
            if (
              dayDate.getTime() >= eventStartDate.getTime() &&
              dayDate.getTime() <= eventEndDate.getTime()
            ) {
              // console.log(`FilteredEvents: Match! Event ${event.$id} (${event.name}) includes day ${day.en}`);
              return true; // Found a match in the current month, include the event
            }
          } catch (dayParseError) {
            console.error(
              `FilteredEvents: Error parsing or normalizing day date string: "${day.en}"`,
              dayParseError
            );
            // Continue checking other days for this event
          }
        }

        // console.log(`FilteredEvents: No match found in current month for event ${event.$id} (${event.name})`);
        return false; // No day in the current month matched the event range
      } catch (eventDateError) {
        console.error(
          `FilteredEvents: Error parsing event date for event ${event.$id}:`,
          event.dates,
          eventDateError
        );
        return false; // Skip event if its date(s) are invalid
      }
    });
  }, [calendarEvents, currentMonthData]);

  // --- Event Handlers ---
  const handleYearChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newYear = event.target.value;
      // console.log("Year changed to:", newYear);
      setCurrentBsYear(newYear);
      // Reset month if the current month doesn't exist in the new year
      if (currentBsMonth === null) return;
      const monthsInNewYear = calendarData?.[newYear] || [];
      if (!monthsInNewYear.some((m) => m.month === currentBsMonth)) {
        const fallbackMonth =
          monthsInNewYear.length > 0 ? monthsInNewYear[0].month : null;
        // console.log("Current month", currentBsMonth, "not in new year, resetting to:", fallbackMonth);
        setCurrentBsMonth(fallbackMonth);
      }
    },
    [calendarData, currentBsMonth]
  );

  const handleMonthChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newMonth = parseInt(event.target.value, 10);
      // console.log("Month changed to:", newMonth);
      setCurrentBsMonth(newMonth);
    },
    []
  );

  const handlePrevMonth = useCallback(() => {
    if (!calendarData || !currentBsYear || currentBsMonth === null) return;
    let targetMonth = currentBsMonth - 1;
    let targetYear = currentBsYear;
    if (targetMonth < 1) {
      targetMonth = 12;
      targetYear = (parseInt(currentBsYear, 10) - 1).toString();
    }

    if (calendarData?.[targetYear]?.some((m) => m.month === targetMonth)) {
      // console.log("Going to previous month:", targetYear, targetMonth);
      setCurrentBsYear(targetYear);
      setCurrentBsMonth(targetMonth);
    } else {
      console.warn(
        "Cannot go to previous month (data missing):",
        targetYear,
        targetMonth
      );
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
      // console.log("Going to next month:", targetYear, targetMonth);
      setCurrentBsYear(targetYear);
      setCurrentBsMonth(targetMonth);
    } else {
      console.warn(
        "Cannot go to next month (data missing):",
        targetYear,
        targetMonth
      );
    }
  }, [currentBsMonth, currentBsYear, calendarData]);

  // --- Render Logic ---

  // Loading State
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl animate-pulse"><Spinner color="primary" size="lg" label="Loading Calendar..." /></div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen p-4">
        {/* Add Toaster here too, so errors during loading are shown */}
        {/* <Toaster position="top-center" /> */}
        <div className="p-6 text-red-700 bg-red-100 border border-red-400 rounded max-w-lg text-center whitespace-pre-wrap shadow-lg">
          <h3 className="font-bold text-lg mb-2">Error Loading Calendar</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No Data State (after loading, but data is missing/empty)
  if (
    !calendarData ||
    availableYears.length === 0 ||
    !currentBsYear ||
    currentBsMonth === null
  ) {
    console.error(
      "Render condition failed: Missing calendarData, years, current year, or current month.",
      { calendarData, availableYears, currentBsYear, currentBsMonth }
    );
    return (
      <div className="flex justify-center items-center h-screen p-4">
        {/* <Toaster position="top-center" /> */}
        <div className="p-6 text-yellow-800 bg-yellow-100 border border-yellow-400 rounded max-w-lg text-center whitespace-pre-wrap shadow-lg">
          <h3 className="font-bold text-lg mb-2">Calendar Data Unavailable</h3>
          <p>
            Could not display the calendar. Required data might be missing or
            incomplete.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // --- Props for Child Components ---
  const today = new Date();
  // Ensure format matches DayData.en (e.g., "YYYY/M/D")
  const todayString = `${today.getFullYear()}/${
    today.getMonth() + 1
  }/${today.getDate()}`;

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
    todayString,
    calendarEvents, // Pass ALL fetched calendar events to Table for highlighting
    onEventSaved: fetchCalendarEvents, // Pass fetchCalendarEvents to Table
  };

  const eventsProps = {
    bsMonthName,
    calendarEvents: filteredCalendarEvents,
    onDataChange: fetchCalendarEvents, // <-- PASS THE FUNCTION HERE
  };

  // --- Component Structure ---
  const NoMonthDataMessage = () => (
    <div className="text-center p-6 sm:p-10 bg-yellow-100 border border-yellow-400 rounded shadow-md w-full mt-4">
      {`No calendar data available for ${bsMonthName} ${currentBsYear}. Please select another month or year.`}
    </div>
  );

  // Main Render
  return (
    <>
      {/* --- Toast Notification Container --- */}
      {/* <Toaster
                position="top-center"
                reverseOrder={false}
                gutter={8}
                toastOptions={{
                    className: '', // Can add global classes here
                    duration: 4000, // Default duration
                    style: {
                        background: '#333',
                        color: '#fff',
                        fontSize: '14px',
                    },
                    success: {
                        duration: 3000,
                        // theme: { primary: 'green', secondary: 'white', }, // Optional theme
                        iconTheme: { primary: '#10B981', secondary: '#fff' }, // Green check
                    },
                    error: {
                        duration: 5000,
                        iconTheme: { primary: '#EF4444', secondary: '#fff' }, // Red cross
                    },
                }}
            /> */}
      {/* --- Main Calendar Layout --- */}
      <div className="flex flex-1 w-full h-full ">
        {isMobile ? (
          <div className=" bg-gray-100 flex-1 rounded-lg sm:p-3">
            {" "}
            {/* Lighter bg, reduced padding */}
            <PerfectScrollbar >
              <div className="flex-1 rounded-lg overflow-y-auto">
                {" "}
                {/* Simplified rounding */}
                <Table {...tableProps} />
                <div className="mt-5">
                  {" "}
                  {/* Slightly reduced margin */}
                  {currentMonthData ? (
                    <Events {...eventsProps} />
                  ) : (
                    <NoMonthDataMessage />
                  )}
                </div>
              </div>
            </PerfectScrollbar>
          </div>
        ) : (
          <div className="flex w-full gap-4 p-3">
            {" "}
            {/* Adjusted gap/padding */}
            {/* Left Panel: Controls + Table */}
            <div className="flex flex-col items-center bg-gray-100 rounded-lg shadow-md overflow-hidden max-w-[60%]">
              {" "}
              {/* Set max-width, use white bg */}
              {/* <div className='flex-1 overflow-y-auto'> Allow table area to scroll if needed */}
              {/* <div className='p-3 bg-gray-100 border-b border-gray-100'>  */}
              <Table {...tableProps} />
              {/* </div> */}
              {/* </div> */}
            </div>
            {/* Right Panel: Events */}
            <div className="flex-1 bg-gray-100 rounded-lg shadow-md overflow-y-auto p-4">
              {currentMonthData ? (
                <Events {...eventsProps} /> 
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
