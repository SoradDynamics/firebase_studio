// src/components/Calendar/Table.tsx
import React from "react";
import { DayData, MonthData, CalendarData } from "types/calendar"; // Make sure types/calendar.ts is defined
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { Button } from "@heroui/react";
import { normalizeToYYYYMMDD } from "~/utils/dateUtils";
import { nepaliMonthNames as globalNepaliMonthNames } from "~/utils/dateUtils"; // Use from dateUtils

const nepaliDaysOfWeek = [
  "आइतवार", "सोमवार", "मंगलवार", "बुधवार", "बिहीवार", "शुक्रवार", "शनिवार",
];

interface StudentAttendanceTableProps {
  currentMonthData: MonthData | undefined;
  bsMonthName: string;
  bsYear: string;
  gregorianInfo: string;
  availableYears: string[];
  currentBsYear: string | null;
  currentBsMonth: number | null;
  onYearChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onMonthChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  calendarData: CalendarData | null;
  todayStringAD: string; // AD "YYYY/M/D" (from new Date()...) used for 'isToday'
  absentDatesAD: string[]; // Array of AD "YYYY-MM-DD"
  approvedLeaveDatesAD: string[]; // Array of AD "YYYY-MM-DD"
}

const Table: React.FC<StudentAttendanceTableProps> = ({
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
  todayStringAD,
  absentDatesAD,
  approvedLeaveDatesAD,
}) => {
  const renderTableGrid = () => {
    if (!currentMonthData || !currentMonthData.days || currentMonthData.days.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          No day data to display for this month.
        </div>
      );
    }

    const { days } = currentMonthData;
    const firstDayOfWeekData = days[0]?.dayOfWeek;
    let firstDayIndex = firstDayOfWeekData && firstDayOfWeekData >= 1 && firstDayOfWeekData <= 7 ? firstDayOfWeekData - 1 : 0;

    const leadingEmptyCells = Array(firstDayIndex).fill(null);
    const allCellsData = [...leadingEmptyCells, ...days];
    const totalCells = allCellsData.length;
    const trailingEmptyCellsCount = (7 - (totalCells % 7)) % 7;
    const trailingEmptyCells = Array(trailingEmptyCellsCount).fill(null);
    const gridCells = [...allCellsData, ...trailingEmptyCells];

    return (
      <div className="bg-white rounded-b shadow-md font-sans">
        <table className="table-fixed border-collapse w-full">
          <thead>
            <tr className="bg-blue-500">
              {nepaliDaysOfWeek.map((dayName) => (
                <th
                  key={dayName}
                  className={`text-white p-2 text-center text-sm sm:text-base font-normal border border-blue-400`}
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
                        return (
                          <td
                            key={`${rowIndex}-${cellIndex}-empty`}
                            className="border border-gray-200 h-20 sm:h-[5.5rem] w-[14.28%] bg-gray-50"
                          >
                            <div className="h-full"></div>
                          </td>
                        );
                      }

                      const isToday = day.en === todayStringAD;
                      const isSaturday = day.dayOfWeek === 7;
                      
                      const normalizedCellDateAD = normalizeToYYYYMMDD(day.en); // day.en is YYYY/M/D
                      
                      let isAbsent = false;
                      let isApprovedLeave = false;

                      if (normalizedCellDateAD) {
                        isAbsent = absentDatesAD.includes(normalizedCellDateAD);
                        isApprovedLeave = approvedLeaveDatesAD.includes(normalizedCellDateAD);
                      }
                      
                      const todayHighlightClasses = isToday ? "border-2 border-orange-400" : "border border-gray-200";
                      const saturdayTextClass = isSaturday ? "text-red-600" : "";
                      
                      let dayNumberStyle = isToday ? "text-orange-600 font-bold" : saturdayTextClass || "text-gray-800";
                      // Optional: Override color if absent/leave and not today
                      // if (isAbsent && !isToday) dayNumberStyle = "text-red-700";
                      // else if (isApprovedLeave && !isToday && !isAbsent) dayNumberStyle = "text-orange-700";

                      return (
                        <td
                          key={`${rowIndex}-${cellIndex}-${day.day}`}
                          className={`${todayHighlightClasses} bg-white h-20 sm:h-[5.5rem] w-[14.28%] align-top p-1 transition-colors duration-150 relative`}
                        >
                          <div className={`flex flex-col h-full text-left text-xs sm:text-sm`}>
                            <div className={`${saturdayTextClass} text-right text-gray-500 pr-1 truncate`}>
                              {day.tithi || ""}
                            </div>
                            <div className="flex-grow flex items-center justify-center">
                              <span className={`text-lg sm:text-2xl ${dayNumberStyle}`}>
                                {day.day} {/* Nepali day number */}
                              </span>
                            </div>
                            <div className={`${saturdayTextClass} text-right font-medium text-blue-700 mb-1 pr-1`}>
                              {day.en?.split("/")[2] || ""} {/* English day number */}
                            </div>
                          </div>
                          <div className="absolute bottom-1.5 right-1.5 flex space-x-1.5">
                            {isAbsent && (
                                <div title="Absent" className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-md"></div>
                            )}
                            {isApprovedLeave && (
                                <div title="Approved Leave" className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-md"></div>
                            )}
                          </div>
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

  const selectBaseClasses =
    "block w-full appearance-none rounded-md border-0 py-1.5 sm:py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 text-sm sm:text-base sm:leading-6 disabled:bg-gray-100 disabled:cursor-not-allowed";
  const selectArrowWrapper =
    "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2";
  const selectArrowIcon = "h-5 w-5 text-gray-400";

  return (
    <div className="w-full sm:px-0">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center items-center mb-4 py-3 px-2 rounded-t-md bg-gray-100">
 
        {/* <div className="flex gap-2 sm:gap-4 justify-center items-center"> */}
            <Button
                onClick={onPrevMonth}
                disabled={!canGoPrev}
                aria-label="Previous Month"
                color="secondary"
                variant="flat"
                isIconOnly
            >
                <ChevronLeftIcon className="h-6 w-6" aria-hidden="true" />
            </Button>
            <div className="relative">
                <select
                    id="year-select"
                    value={currentBsYear ?? ""}
                    onChange={onYearChange}
                    className={selectBaseClasses + " min-w-[80px]"}
                    aria-label="Select Year"
                    disabled={!currentBsYear || !availableYears.length}
                >
                    {availableYears.map((year) => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
                <div className={selectArrowWrapper}>
                    <svg className={selectArrowIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.24a.75.75 0 011.06 0L10 14.148l2.7-2.908a.75.75 0 111.06 1.06l-3.25 3.5a.75.75 0 01-1.06 0l-3.25-3.5a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
            <div className="relative">
                <select
                    id="month-select"
                    value={currentBsMonth ?? ""}
                    onChange={onMonthChange}
                    className={selectBaseClasses + " min-w-[100px]"}
                    aria-label="Select Month"
                    disabled={!currentBsMonth || !currentBsYear || !calendarData}
                >
                    {globalNepaliMonthNames.map((name, index) => {
                        const monthNum = index + 1;
                        const monthExistsInData = calendarData?.[currentBsYear ?? ""]?.some((m) => m.month === monthNum) ?? false;
                        return (
                            <option key={monthNum} value={monthNum} disabled={!monthExistsInData} className={!monthExistsInData ? "text-gray-400 italic" : ""}>
                                {name} {!monthExistsInData && currentBsYear ? " (N/A)" : ""}
                            </option>
                        );
                    })}
                </select>
                <div className={selectArrowWrapper}>
                     <svg className={selectArrowIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.24a.75.75 0 011.06 0L10 14.148l2.7-2.908a.75.75 0 111.06 1.06l-3.25 3.5a.75.75 0 01-1.06 0l-3.25-3.5a.75.75 0 010-1.06z" clipRule="evenodd" />
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
                <ChevronRightIcon className="h-6 w-6" aria-hidden="true" />
            </Button>
        {/* </div> */}
      </div>
      <div className="flex-col text-white p-0 sm:px-0 flex justify-between items-center rounded-t-md -mt-4 relative pt-4">
        <div className="bg-orange-500 rounded-t-md w-full p-3 flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold">{`${bsMonthName} ${bsYear}`}</h2>
          <span className="text-xs sm:text-sm">{gregorianInfo}</span>
        </div>
        {renderTableGrid()}
      </div>
    </div>
  );
};

export default Table;