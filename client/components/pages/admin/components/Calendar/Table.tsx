// src/components/Calendar/Table.tsx
import React from "react";
import {
  DayData,
  MonthData,
  TableContainerProps,
  CalendarData,
} from "types/calendar"; // Make sure CalendarData is imported if used in props
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import Controls from "./Controls";
import { Button } from "@heroui/react";

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

const nepaliDaysOfWeek = [
  "आइतवार",
  "सोमवार",
  "मंगलवार",
  "बुधवार",
  "बिहीवार",
  "शुक्रवार",
  "शनिवार",
];
// const defaultHolidayColor = "#D90000"; // Not currently used

// Define a more specific type for calendar events if possible, otherwise use any[]
interface CalendarEvent {
  $id: string;
  name: string;
  dates: string[]; // Expecting an array of AD date strings like "YYYY/M/D" or "YYYY-MM-DD"
  holiday?: boolean;
  // Add other event properties if they exist
}

// Define the props for the Table component
interface ExtendedTableProps {
  currentMonthData: MonthData | undefined;
  bsMonthName: string;
  bsYear: string;
  gregorianInfo: string;
  availableYears: string[];
  currentBsYear: string | null; // Can be null initially
  currentBsMonth: number | null; // Can be null initially
  onYearChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onMonthChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  calendarData: CalendarData | null; // Can be null initially
  todayString: string; // e.g., "2024/3/15"
  calendarEvents: CalendarEvent[]; // Use the specific type or any[]
  onEventSaved: () => void;
}

const Table: React.FC<ExtendedTableProps> = ({
  currentMonthData,
  bsMonthName,
  bsYear,
  gregorianInfo,
  availableYears,
  currentBsYear,
  currentBsMonth,
  onYearChange,
  onMonthChange,
  onPrevMonth,
  onNextMonth,
  canGoPrev,
  canGoNext,
  calendarData,
  todayString,
  calendarEvents, // Receives ALL events from Calendar.tsx
  onEventSaved,
}) => {
  // **** START: Updated isDateInExtendedEventRange ****
  /**
   * Checks if a given date string falls within an event's date range.
   * Handles single-day events correctly by comparing normalized dates.
   * @param dateToCheck - The Gregorian date string of the calendar cell (e.g., "YYYY/M/D").
   * @param eventDates - An array of Gregorian date strings from the event (e.g., ["YYYY/M/D"] or ["YYYY/M/D", "YYYY/M/D"]).
   * @returns True if the date falls within the event range (inclusive), false otherwise.
   */
  const isDateInEventRange = (
    dateToCheck: string,
    eventDates: string[]
  ): boolean => {
    if (
      !dateToCheck ||
      !eventDates ||
      eventDates.length === 0 ||
      !eventDates[0]
    ) {
      // console.log("isDateInEventRange - Invalid input:", { dateToCheck, eventDates });
      return false;
    }

    // console.log(`isDateInEventRange - Checking: ${dateToCheck} against event dates: [${eventDates.join(', ')}]`);

    try {
      // --- Normalize all dates to midnight for consistent comparison ---
      const checkDate = new Date(dateToCheck);
      checkDate.setHours(0, 0, 0, 0);

      const startDate = new Date(eventDates[0]);
      startDate.setHours(0, 0, 0, 0);

      let endDate;
      // Use the second date if it exists and is valid, otherwise treat as single-day event
      if (eventDates.length > 1 && eventDates[1]) {
        endDate = new Date(eventDates[1]);
      } else {
        endDate = new Date(eventDates[0]); // Use start date for end date
      }
      endDate.setHours(0, 0, 0, 0);

      // console.log(`isDateInEventRange - Normalized Check: ${checkDate.toISOString()}, Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);

      // --- Compare timestamps ---
      const checkTime = checkDate.getTime();
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();

      // Ensure start date is not after end date (can happen with bad data)
      if (startTime > endTime) {
        console.warn(
          `isDateInEventRange - Event has start date after end date:`,
          eventDates
        );
        // Handle this case as needed - perhaps only check against start date?
        // return checkTime === startTime; // Option 1: Only match start date
        return false; // Option 2: Consider it invalid
      }

      const isInRange = checkTime >= startTime && checkTime <= endTime;
      // console.log(`isDateInEventRange - Result for ${dateToCheck}: ${isInRange}`);
      return isInRange;
    } catch (error) {
      console.error("Error comparing dates in isDateInEventRange:", error, {
        dateToCheck,
        eventDates,
      });
      return false;
    }
  };
  // **** END: Updated isDateInExtendedEventRange ****

  const renderTableGrid = () => {
    if (
      !currentMonthData ||
      !currentMonthData.days ||
      currentMonthData.days.length === 0
    ) {
      return (
        <div className="p-4 text-center text-gray-500">
          No day data to display.
        </div>
      );
    }

    const { days } = currentMonthData;
    const firstDayOfWeekData = days[0]?.dayOfWeek; // Handle case where days might be empty unexpectedly

    // Default to Sunday start if dayOfWeek is invalid or missing
    let firstDayIndex =
      firstDayOfWeekData && firstDayOfWeekData >= 1 && firstDayOfWeekData <= 7
        ? firstDayOfWeekData - 1
        : 0;

    const leadingEmptyCells = Array(firstDayIndex).fill(null);
    const allCellsData = [...leadingEmptyCells, ...days];
    const totalCells = allCellsData.length;
    const trailingEmptyCellsCount = (7 - (totalCells % 7)) % 7; // Ensure it's always 0-6
    const trailingEmptyCells = Array(trailingEmptyCellsCount).fill(null);
    const gridCells = [...allCellsData, ...trailingEmptyCells];

    return (
      <div className=" bg-white rounded-b shadow-md font-sans">
        <table className=" table-fixed border-collapse w-full ">
          {" "}
          {/* Added border-collapse */}
          <thead>
            <tr className="bg--100">
              {nepaliDaysOfWeek.map((dayName) => (
                <th
                  key={dayName}
                  // Consistent background, Saturday text color handled in cell
                  className={`bg-blue-500 text-white p-2 text-center text-sm sm:text-base font-normal border border-blue-400`}
                >
                  {dayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.ceil(gridCells.length / 7) }).map(
              (_, rowIndex) => (
                <tr key={rowIndex} className="text-center">
                  {gridCells
                    .slice(rowIndex * 7, rowIndex * 7 + 7)
                    .map((day: DayData | null, cellIndex) => {
                      if (!day) {
                        // Render empty cell
                        return (
                          <td
                            key={`${rowIndex}-${cellIndex}-empty`}
                            className="border border-gray-200 h-20 sm:h-[5.5rem] w-[14.28%] bg-gray-50"
                          >
                            <div className="h-full"></div>
                          </td>
                        );
                      }

                      // Day exists, proceed with rendering
                      const isToday = day.en === todayString;
                      const isSaturday = day.dayOfWeek === 7;
                      let cellBackgroundColor: string | undefined = undefined; // e.g., 'bg-red-200', 'bg-blue-200'
                      let isHolidayEventDay = false; // Track if the event making it colored is a holiday

                      // Check against calendar events
                      if (day.en) {
                        // Find the FIRST matching event to determine color
                        // You could modify this to prioritize holidays or handle overlaps differently
                        const matchingEvent = calendarEvents.find(
                          (event) => isDateInEventRange(day.en!, event.dates) // Use the updated range check
                        );

                        if (matchingEvent) {
                          // console.log(`Day ${day.en} matches event: ${matchingEvent.name} (Holiday: ${matchingEvent.holiday})`);
                          isHolidayEventDay = !!matchingEvent.holiday; // Use !! to convert to boolean
                          cellBackgroundColor = isHolidayEventDay
                            ? "bg-red-200"
                            : "bg-blue-200";
                        }
                      }

                      // Determine CSS classes
                      const todayHighlightClasses = isToday
                        ? "border-2 border-orange-400 relative" // Added relative for potential badges
                        : "border border-gray-200";
                      const saturdayTextClass = isSaturday
                        ? "text-red-600"
                        : ""; // Make Saturday text red
                      const cellBgClass = cellBackgroundColor || "bg-white"; // Default to white if no event matches
                      const dayNumberStyle = isToday
                        ? "text-orange-600 font-bold"
                        : saturdayTextClass || "text-gray-800"; // Today overrides Saturday color for the number

                      return (
                        <td
                          key={`${rowIndex}-${cellIndex}-${day.day}`}
                          className={`${todayHighlightClasses} ${cellBgClass} h-20 sm:h-[5.5rem] w-[14.28%] align-top p-1 transition-colors duration-150`}
                        >
                          <div
                            className={`flex flex-col h-full text-left text-xs sm:text-sm`}
                          >
                            {/* Tithi */}
                            <div
                              className={`${saturdayTextClass} text-right text-gray-500 pr-1 truncate`}
                            >
                              {day.tithi || ""}
                            </div>
                            {/* Nepali Day Number */}
                            <div className="flex-grow flex items-center justify-center">
                              <span
                                className={`text-lg sm:text-2xl ${dayNumberStyle}`}
                              >
                                {day.day}
                              </span>
                            </div>
                            {/* English Day Number */}
                            <div
                              className={`${saturdayTextClass} text-right font-medium text-blue-700 mb-1 pr-1`}
                            >
                              {day.en?.split("/")[2] || ""}
                            </div>
                          </div>
                          {/* Optional: Add a badge for today */}
                          {/* {isToday && <span className="absolute top-1 left-1 bg-orange-500 text-white text-[10px] px-1 rounded">Today</span>} */}
                        </td>
                      );
                    })}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // --- Control Styles (Copied from original for consistency) ---
  const selectBaseClasses =
    "block w-full appearance-none rounded-md border-0 py-1.5 sm:py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 text-sm sm:text-base sm:leading-6 disabled:bg-gray-100 disabled:cursor-not-allowed";
  const selectArrowWrapper =
    "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2";
  const selectArrowIcon = "h-5 w-5 text-gray-400";


  return (
    <div className="w-full sm:px-0  ">
      {" "}
      {/* Removed max-w-3xl to allow flexibility */}
      {/* Controls Section */}
      <div className="flex gap-2 sm:gap-16 justify-center mb-4 py-3 rounded-t-md bg-gray-100">
        {" "}
        {/* Added bg color */}
        <Controls onEventSaved={onEventSaved} />
        <div className="flex gap-4 justify-center items-center">
        <Button
          onClick={onPrevMonth}
          // className={`${buttonBaseClasses} ${primaryButtonClasses}`}
          disabled={!canGoPrev}
          aria-label="Previous Month"
          color="secondary"
          variant="flat"
                    isIconOnly
        >
          <ChevronLeftIcon className=" font- h-6 w-6" aria-hidden="true" />
          
        </Button>
        {/* Year Select */}
        <div className="relative">
          <select
            id="year-select"
            value={currentBsYear ?? ""}
            onChange={onYearChange}
            className={selectBaseClasses}
            aria-label="Select Year"
            disabled={!currentBsYear || !availableYears.length} // Disable if no year selected or no years available
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <div className={selectArrowWrapper}>
            <svg
              className={selectArrowIcon}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.24a.75.75 0 011.06 0L10 14.148l2.7-2.908a.75.75 0 111.06 1.06l-3.25 3.5a.75.75 0 01-1.06 0l-3.25-3.5a.75.75 0 010-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        {/* Month Select */}
        <div className="relative">
          <select
            id="month-select"
            value={currentBsMonth ?? ""}
            onChange={onMonthChange}
            className={selectBaseClasses}
            aria-label="Select Month"
            // Disable if no month/year selected or calendar data hasn't loaded
            disabled={!currentBsMonth || !currentBsYear || !calendarData}
          >
            {nepaliMonthNames.map((name, index) => {
              const monthNum = index + 1;
              // Check if the month exists in the data for the currently selected year
              const monthExistsInData =
                calendarData?.[currentBsYear ?? ""]?.some(
                  (m) => m.month === monthNum
                ) ?? false;

              return (
                <option
                  key={monthNum}
                  value={monthNum}
                  disabled={!monthExistsInData} // Disable if data for this month/year isn't available
                  className={!monthExistsInData ? "text-gray-400 italic" : ""} // Style unavailable months
                >
                  {name} {!monthExistsInData && currentBsYear ? " (N/A)" : ""}
                </option>
              );
            })}
          </select>
          <div className={selectArrowWrapper}>
            <svg
              className={selectArrowIcon}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.24a.75.75 0 011.06 0L10 14.148l2.7-2.908a.75.75 0 111.06 1.06l-3.25 3.5a.75.75 0 01-1.06 0l-3.25-3.5a.75.75 0 010-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        <Button
          onClick={onNextMonth}
          disabled={!canGoNext}
          aria-label="Next Month"
          color="secondary"
          variant="flat"
          isIconOnly
        >
          <ChevronRightIcon className=" font- h-6 w-6" aria-hidden="true" />
          
        </Button>
        </div>
      </div>
      {/* Month Header */}
      <div className="flex-col text-white p-0 sm:p-3 flex justify-between items-center rounded-t-md -mt-4 relative pt-4">
        {" "}
        {/* Make it overlap slightly */}
       <div className="bg-orange-500 rounded-t-md w-full p-3 flex justify-between items-center">
       <h2 className="text-lg sm:text-xl font-bold">{`${bsMonthName} ${bsYear}`}</h2>
        <span className="text-xs sm:text-sm">{gregorianInfo}</span>
  
       </div>
           {renderTableGrid()}
      </div>
      {/* Calendar Grid */}
    </div>
  );
};

export default Table;
