// src/components/attendance/AttendanceDetails.tsx
import React from 'react';
import { ProcessedLeave } from 'types/attendance';
import { CalendarData } from 'types/calendar';
import { convertAdToBs, getNepaliMonthName, normalizeToYYYYMMDD } from '~/utils/dateUtils';
import { Card, CardBody, CardHeader, Badge } from "@heroui/react"; // Assuming HeroUI has these
import { CalendarDaysIcon, XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'; // Example icons


interface AttendanceDetailsProps {
  currentBsYear: string;
  currentBsMonth: number;
  absentDatesAD: string[]; 
  allProcessedApprovedLeaves: ProcessedLeave[];
  bsCalendarDataForMonth: CalendarData | null;
}

const AttendanceDetails: React.FC<AttendanceDetailsProps> = ({
  currentBsYear,
  currentBsMonth,
  absentDatesAD,
  allProcessedApprovedLeaves,
  bsCalendarDataForMonth,
}) => {
  if (!bsCalendarDataForMonth) {
    return (
        <Card className="shadow-xl animate-pulse">
            <CardHeader><div className="h-6 bg-slate-200 rounded w-3/4"></div></CardHeader>
            <CardBody className="p-6 space-y-4">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            </CardBody>
        </Card>
    );
  }

  const currentMonthNepaliName = getNepaliMonthName(currentBsMonth);

  let monthStartAD: string | null = null;
  let monthEndAD: string | null = null;

  const monthDataViewed = bsCalendarDataForMonth?.[currentBsYear]?.find(m => m.month === currentBsMonth);
  if (monthDataViewed && monthDataViewed.days.length > 0) {
    const firstDayEN = monthDataViewed.days[0].en;
    const lastDayEN = monthDataViewed.days[monthDataViewed.days.length - 1].en;
    monthStartAD = normalizeToYYYYMMDD(firstDayEN);
    monthEndAD = normalizeToYYYYMMDD(lastDayEN);
  }

  const filteredAbsencesInBSForMonth: string[] = [];
  if (monthStartAD && monthEndAD) {
    const startTs = new Date(monthStartAD).getTime();
    const endTs = new Date(monthEndAD).getTime();
    absentDatesAD.forEach(adDate => {
      const currentAdNorm = normalizeToYYYYMMDD(adDate);
      if (currentAdNorm) {
        const dateTs = new Date(currentAdNorm).getTime();
        if (dateTs >= startTs && dateTs <= endTs) {
            const bsDate = convertAdToBs(currentAdNorm);
            if (bsDate) filteredAbsencesInBSForMonth.push(bsDate);
        }
      }
    });
  }
  filteredAbsencesInBSForMonth.sort();

  const filteredLeavesInMonth: ProcessedLeave[] = [];
  if (monthStartAD && monthEndAD && allProcessedApprovedLeaves) {
    const startTs = new Date(monthStartAD).getTime();
    const endTs = new Date(monthEndAD).getTime();

    allProcessedApprovedLeaves.forEach(leave => {
        const bsDatesForThisLeaveInCurrentMonth: string[] = [];
        let leaveOverlapsCurrentMonth = false;
        leave.adDates.forEach(adDateOfLeave => {
            const normalizedAdDate = normalizeToYYYYMMDD(adDateOfLeave);
            if (!normalizedAdDate) return;
            const dateTs = new Date(normalizedAdDate).getTime();
            if (dateTs >= startTs && dateTs <= endTs) {
                leaveOverlapsCurrentMonth = true;
                const correspondingBsDate = convertAdToBs(normalizedAdDate);
                if (correspondingBsDate) bsDatesForThisLeaveInCurrentMonth.push(correspondingBsDate);
            }
        });
        if (leaveOverlapsCurrentMonth && bsDatesForThisLeaveInCurrentMonth.length > 0) {
            const uniqueSortedBsDates = Array.from(new Set(bsDatesForThisLeaveInCurrentMonth)).sort();
            filteredLeavesInMonth.push({ ...leave, bsDatesDisplay: uniqueSortedBsDates });
        }
    });
  }
  
  return (
    <Card className="shadow-xl h-full"> {/* Ensure card takes available height if needed */}
        <CardHeader className="bg-slate-50 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-700 p-4">
                Report: {currentMonthNepaliName} {currentBsYear}
            </h2>
        </CardHeader>
        <CardBody className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]"> {/* Adjust max-h */}
            {/* Absences Section */}
            {filteredAbsencesInBSForMonth.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center">
                        <XCircleIcon className="h-6 w-6 mr-2" />
                        Absences
                    </h3>
                    <div className="space-y-2">
                        {filteredAbsencesInBSForMonth.map((bsDate, index) => (
                            <div key={`absent-${index}`} className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center">
                                <CalendarDaysIcon className="h-5 w-5 mr-2 text-red-500 flex-shrink-0" />
                                Marked absent on: <strong className="ml-1">{bsDate}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Approved Leaves Section */}
            {filteredLeavesInMonth.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-orange-600 mb-3 flex items-center">
                        <CheckCircleIcon className="h-6 w-6 mr-2" />
                        Approved Leaves
                    </h3>
                    <div className="space-y-4">
                        {filteredLeavesInMonth.map((leave) => (
                            <Card key={leave.leaveId} className="bg-orange-50 border border-orange-200 shadow-md">
                                <CardBody className="p-4">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-semibold text-orange-800 text-md">{leave.title}</h4>
                                      
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">Applied: {new Date(leave.appliedAt).toLocaleDateString()}</p>
                                    
                                    <p className="text-sm text-slate-700 mb-1">
                                        <strong className="font-medium">Reason:</strong> {leave.reason}
                                    </p>
                                    <p className="text-sm text-slate-700">
                                        <strong className="font-medium">Dates (BS):</strong> {leave.bsDatesDisplay.join(', ')}
                                    </p>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {filteredAbsencesInBSForMonth.length === 0 && filteredLeavesInMonth.length === 0 && (
                <div className="text-center py-10">
                    <CalendarDaysIcon className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-500">No absences or approved leaves recorded for this month.</p>
                </div>
            )}
        </CardBody>
    </Card>
  );
};

export default AttendanceDetails;