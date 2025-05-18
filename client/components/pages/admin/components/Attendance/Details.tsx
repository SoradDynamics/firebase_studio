// src/components/Calendar/Details.tsx
import React from "react";
import NepaliDate from 'nepali-date-converter';
import { LeaveRecord, StudentAttendanceData } from "types/student";
import { Spinner } from "@heroui/react";

interface DetailsProps {
  bsMonthName: string;
  currentBsYear: string | null;
  currentBsMonth: number | null;
  studentFullAttendance: StudentAttendanceData | null; // Renamed and using full type
  isLoading: boolean;
  error: string | null;
}

const nepaliMonthNamesFull = [ "बैशाख", "जेठ", "असार", "श्रावण", "भाद्र", "आश्विन", "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुन", "चैत्र"];

// AD (YYYY-MM-DD or YYYY/M/D) to BS (YYYY-MM-DD)
const convertAdToBsString = (adDateStr: string | null): string | null => {
  if (!adDateStr) return null;
  let normalizedAd = adDateStr;
  if (adDateStr.includes('/')) {
    const p = adDateStr.split('/');
    if (p.length === 3) normalizedAd = `${p[0]}-${String(p[1]).padStart(2, '0')}-${String(p[2]).padStart(2, '0')}`;
    else { console.warn(`AD->BS: Invalid AD (slash): ${adDateStr}`); return null; }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedAd)) {
    console.warn(`AD->BS: Invalid AD format: ${normalizedAd}. Expected YYYY-MM-DD.`); return null;
  }
  try {
    const [y, m, d] = normalizedAd.split("-").map(Number);
    const jsDate = new Date(y, m - 1, d);
    if (isNaN(jsDate.getTime())) { console.warn(`AD->BS: Invalid JS Date from AD: ${normalizedAd}`); return null; }
    const nepDate = new NepaliDate(jsDate);
    return `${nepDate.getYear()}-${String(nepDate.getMonth() + 1).padStart(2, '0')}-${String(nepDate.getDate()).padStart(2, '0')}`;
  } catch (e) { console.error(`AD->BS Error for "${normalizedAd}":`, e); return null; }
};

const formatBsDateForDisplay = (bsDateStr: string | null): string => {
    if (!bsDateStr) return "N/A";
    try {
        const [y, mS, dS] = bsDateStr.split("-");
        const m = parseInt(mS); const d = parseInt(dS);
        if (m < 1 || m > 12 || isNaN(m) || isNaN(d) || isNaN(parseInt(y))) return "Invalid Date Parts";
        return `${nepaliMonthNamesFull[m - 1]} ${d}, ${y}`;
    } catch (e) { console.error("FormatBS Error:", bsDateStr, e); return "Date Format Error"; }
};

const getLeaveBsDatesFormatted = (leave: LeaveRecord): string => {
    if (leave.date) return formatBsDateForDisplay(leave.date);
    if (leave.fromDate && leave.toDate) return `${formatBsDateForDisplay(leave.fromDate)} to ${formatBsDateForDisplay(leave.toDate)}`;
    return "Date N/A";
};

const Details: React.FC<DetailsProps> = ({
  bsMonthName, currentBsYear, currentBsMonth, studentFullAttendance, isLoading, error,
}) => {
  if (isLoading) return ( <div className="p-6 flex flex-col h-full items-center justify-center"> <Spinner label="Loading attendance..." size="md" /> </div> );
  if (error) return ( <div className="p-6 flex flex-col h-full text-red-600 bg-red-50 items-center justify-center"> <p className="font-semibold">Error:</p> <p className="text-sm">{error}</p> </div> );
  if (!studentFullAttendance) return ( <div className="p-6 flex flex-col h-full text-gray-600 items-center justify-center"> {currentBsYear && currentBsMonth ? `No attendance data for ${bsMonthName} ${currentBsYear}.` : "Loading..."} </div> );

  const { absentADDates, approvedLeaveRecords } = studentFullAttendance as any;

  const absentDatesInMonthBS = absentADDates
    .map((adDate:any) => {
      const bsDate = convertAdToBsString(adDate);
      if (!bsDate || !currentBsYear || currentBsMonth === null) return null;
      const [y, m] = bsDate.split("-").map(Number);
      return (y === parseInt(currentBsYear) && m === currentBsMonth) ? bsDate : null;
    })
    .filter((d:any) => d !== null)
    .sort((a:any, b:any) => parseInt(a!.split("-")[2]) - parseInt(b!.split("-")[2])) as string[];

  const approvedLeavesInMonth = approvedLeaveRecords.filter((leave: { date: string | number | Date | undefined; fromDate: string | number | Date | undefined; toDate: string | number | Date | undefined; }) => {
    if (!currentBsYear || currentBsMonth === null) return false;
    const targetBsYearNum = parseInt(currentBsYear);
    const currentMonthNp = new NepaliDate(targetBsYearNum, currentBsMonth - 1, 1);
    const daysInCurrentMonth = currentMonthNp.getMonthDays();
    const currentMonthStartJs = currentMonthNp.toJsDate();
    const currentMonthEndJs = new NepaliDate(targetBsYearNum, currentBsMonth - 1, daysInCurrentMonth).toJsDate();
    currentMonthEndJs.setHours(23,59,59,999); // Ensure end of day for comparison

    try {
      if (leave.date) {
        const leaveDateNp = new NepaliDate(leave.date);
        const leaveDateJs = leaveDateNp.toJsDate();
        return leaveDateJs >= currentMonthStartJs && leaveDateJs <= currentMonthEndJs;
      } else if (leave.fromDate && leave.toDate) {
        const fromDateNp = new NepaliDate(leave.fromDate);
        const toDateNp = new NepaliDate(leave.toDate);
        const fromDateJs = fromDateNp.toJsDate();
        let toDateJs = toDateNp.toJsDate();
        toDateJs.setHours(23,59,59,999); // Ensure end of day

        return fromDateJs <= currentMonthEndJs && toDateJs >= currentMonthStartJs;
      }
    } catch(e) { console.error("Error filtering leave for month:", leave, e); }
    return false;
  });

  const hasAbsences = absentDatesInMonthBS.length > 0;
  const hasApprovedLeaves = approvedLeavesInMonth.length > 0;

  return (
    <div className="px-4 sm:px-6 pt-3 rounded-md flex flex-col h-full">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 border-b-2 pb-2">
        Details: {bsMonthName} {currentBsYear}
      </h2>
      {!hasAbsences && !hasApprovedLeaves && !isLoading && (
         <div className="flex-grow flex items-center justify-center text-gray-500">No records for this month.</div>
      )}
      <div className="flex flex-col gap-y-6 overflow-y-auto flex-grow pb-4">
        {hasAbsences && (
        <div>
            <h3 className="text-xl font-semibold text-red-600 mb-2">Absent Days</h3>
            <ul className="list-none pl-0 space-y-1.5">
            {absentDatesInMonthBS.map((bsDate, idx) => (
                <li key={`abs-${idx}`} className="bg-red-50 text-gray-700 p-2 rounded-md text-sm">{formatBsDateForDisplay(bsDate)}</li>
            ))}
            </ul>
        </div>
        )}
        {hasApprovedLeaves && (
        <div className={hasAbsences ? "mt-5" : ""}>
            <h3 className="text-xl font-semibold text-green-700 mb-2">Approved Leaves</h3>
            <ul className="list-none pl-0 space-y-3">
            {approvedLeavesInMonth.map((leave:any, idx:any) => (
                <li key={leave.leaveId || `leave-${idx}`} className="bg-green-50 p-3 rounded-md shadow-sm">
                    <p className="font-medium text-base text-green-800">{leave.title || "N/A"}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Date(s): {getLeaveBsDatesFormatted(leave)}</p>
                    {leave.reason && <p className="text-xs text-gray-600 mt-1">Reason: {leave.reason}</p>}
                    <p className="text-xs text-gray-500 mt-1">Type: <span className="capitalize">{leave.periodType?.replace("dateRange", "Date Range") || "N/A"}</span></p>
                </li>
            ))}
            </ul>
        </div>
        )}
      </div>
    </div>
  );
};
export default Details;