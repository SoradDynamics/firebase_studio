// @/client/components/pages/common/Calendaar/Table.tsx
import React from "react";
import { DayData, MonthData, CalendarData } from "types/calendar";
import { AttendanceMark } from "types/student"; // Your new type
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { Button } from "@heroui/react";

const nepaliMonthNames = [ /* ... same ... */ ];
const nepaliDaysOfWeek = [ /* ... same ... */ ];

interface ExtendedTableProps {
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
  todayString: string; // AD "YYYY/M/D"
  attendanceMarks: AttendanceMark[]; // NEW: Receive attendance marks
  // onEventSaved?: () => void; // Keep if needed, or remove
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
  todayString, // This is "YYYY/M/D"
  attendanceMarks,
}) => {

  // Helper to normalize day.en (YYYY/M/D) to YYYY-MM-DD for consistent comparison
  // with attendanceMark.adDate (which we ensure is YYYY-MM-DD)
  const normalizeEnDateToYyyyMmDd = (enDate: string): string | null => {
    if (!enDate) return null;
    try {
        const dateObj = new Date(enDate); // Handles YYYY/M/D
        if (isNaN(dateObj.getTime())) return null;
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    } catch {
        return null;
    }
  }


  const renderTableGrid = () => {
    if (!currentMonthData || !currentMonthData.days || currentMonthData.days.length === 0) {
      return <div className="p-4 text-center text-gray-500">No day data.</div>;
    }
    const { days } = currentMonthData;
    const firstDayOfWeekData = days[0]?.dayOfWeek;
    let firstDayIndex = firstDayOfWeekData && firstDayOfWeekData >= 1 && firstDayOfWeekData <= 7 ? firstDayOfWeekData - 1 : 0;
    const leadingEmptyCells = Array(firstDayIndex).fill(null);
    const allCellsData = [...leadingEmptyCells, ...days];
    const trailingEmptyCellsCount = (7 - (allCellsData.length % 7)) % 7;
    const trailingEmptyCells = Array(trailingEmptyCellsCount).fill(null);
    const gridCells = [...allCellsData, ...trailingEmptyCells];

    return (
      <div className=" bg-white rounded-b shadow-md font-sans">
        <table className=" table-fixed border-collapse w-full ">
          <thead>{/* ... same thead ... */}</thead>
          <tbody>
            {Array.from({ length: Math.ceil(gridCells.length / 7) }).map(
              (_, rowIndex) => (
                <tr key={rowIndex} className="text-center">
                  {gridCells
                    .slice(rowIndex * 7, rowIndex * 7 + 7)
                    .map((day: DayData | null, cellIndex) => {
                      if (!day) {
                        return (
                          <td key={`${rowIndex}-${cellIndex}-empty`} className="border border-gray-200 h-20 sm:h-[5.5rem] w-[14.28%] bg-gray-50">
                            <div className="h-full"></div>
                          </td>
                        );
                      }

                      const isToday = day.en === todayString; // todayString is YYYY/M/D
                      const isSaturday = day.dayOfWeek === 7;
                      
                      // NEW: Check for attendance marks for this day
                      const dayAdNormalized = normalizeEnDateToYyyyMmDd(day.en!); // day.en is YYYY/M/D
                      const marksForThisDay = dayAdNormalized ? attendanceMarks.filter(mark => mark.adDate === dayAdNormalized) : [];
                      const isAbsent = marksForThisDay.some(m => m.type === 'absent');
                      const isLeave = marksForThisDay.some(m => m.type === 'leave');

                      // Remove old cellBackgroundColor logic or adapt. Circles are primary.
                      // const cellBackgroundColor = isHolidayEventDay ? "bg-red-200" : "bg-blue-200";
                      
                      const todayHighlightClasses = isToday ? "border-2 border-orange-400 relative" : "border border-gray-200";
                      const saturdayTextClass = isSaturday ? "text-red-600" : "";
                      const cellBgClass = "bg-white"; // Default, can be overridden if general holidays are still a thing
                      const dayNumberStyle = isToday ? "text-orange-600 font-bold" : saturdayTextClass || "text-gray-800";

                      return (
                        <td
                          key={`${rowIndex}-${cellIndex}-${day.day}`}
                          className={`${todayHighlightClasses} ${cellBgClass} h-20 sm:h-[5.5rem] w-[14.28%] align-top p-1 transition-colors duration-150 relative`} // Added relative for circle positioning
                        >
                          <div className="flex flex-col h-full text-left text-xs sm:text-sm">
                            <div className={`${saturdayTextClass} text-right text-gray-500 pr-1 truncate`}>{day.tithi || ""}</div>
                            <div className="flex-grow flex items-center justify-center">
                              <span className={`text-lg sm:text-2xl ${dayNumberStyle}`}>{day.day}</span>
                            </div>
                            <div className={`${saturdayTextClass} text-right font-medium text-blue-700 mb-1 pr-1`}>
                              {day.en?.split("/")[2] || ""}
                            </div>
                          </div>
                          {/* Attendance Markers */}
                          {(isAbsent || isLeave) && (
                            <div className="absolute bottom-1 right-1 flex space-x-1 items-center p-0.5">
                              {isAbsent && <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm" title="Absent"></div>}
                              {isLeave && <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-sm" title="Leave"></div>}
                            </div>
                          )}
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

  const selectBaseClasses = "block w-full appearance-none rounded-md border-0 py-1.5 sm:py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 text-sm sm:text-base sm:leading-6 disabled:bg-gray-100 disabled:cursor-not-allowed";
  const selectArrowWrapper = "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2";
  const selectArrowIcon = "h-5 w-5 text-gray-400";

  return (
    <div className="w-full sm:px-0">
      <div className="flex gap-2 sm:gap-16 justify-center mb-4 py-3 rounded-t-md bg-gray-100">
          {/* Controls: Year/Month Select, Prev/Next Buttons ... same as before ... */}
      </div>
      <div className="flex-col text-white p-0 sm:p-3 flex justify-between items-center rounded-t-md -mt-4 relative pt-4">
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