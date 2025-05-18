// @/client/components/pages/common/Calendaar/Details.tsx
import React, { useMemo } from 'react';
import { LeaveRecord } from 'types/student'; // Your types
import { convertAdToBs, convertBsToAdDateObject } from '~/utils/dateConverter'; // Your utils

interface DetailsProps {
  studentId: string;
  currentBsMonthName: string;
  currentBsYear: string | null; // Can be null initially
  allAbsentDatesAD: string[]; // All AD absent dates for the student (YYYY-MM-DD)
  allApprovedLeaveRecords: LeaveRecord[]; // All approved leave records for the student
  currentMonthViewAdDates: string[]; // Array of AD dates ("YYYY/M/D") visible in the current calendar month
}

const Details: React.FC<DetailsProps> = ({
  studentId, // Keep for context or future use
  currentBsMonthName,
  currentBsYear,
  allAbsentDatesAD,
  allApprovedLeaveRecords,
  currentMonthViewAdDates,
}) => {

  const { absencesForDisplay, leavesForDisplay } = useMemo(() => {
    if (currentMonthViewAdDates.length === 0) {
      return { absencesForDisplay: [], leavesForDisplay: [] };
    }

    // Create a Set of normalized (YYYY-MM-DD) AD dates for the current month view for efficient lookup
    const monthViewAdDatesSet = new Set<string>();
    currentMonthViewAdDates.forEach(adDateStr => {
        try {
            const dateObj = new Date(adDateStr); // Handles YYYY/M/D
            if (!isNaN(dateObj.getTime())) {
                monthViewAdDatesSet.add(
                    `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
                );
            }
        } catch (e) { console.warn("Error parsing month view AD date in Details:", adDateStr, e); }
    });


    const filteredAbsences: string[] = []; // Store AD dates
    allAbsentDatesAD.forEach(adAbsenceDate => { // Assuming adAbsenceDate is already YYYY-MM-DD
      if (monthViewAdDatesSet.has(adAbsenceDate)) {
        filteredAbsences.push(adAbsenceDate);
      }
    });

    const filteredLeaves: LeaveRecord[] = [];
    allApprovedLeaveRecords.forEach(leave => {
      let overlaps = false;
      if (leave.periodType === 'dateRange' && leave.fromDate && leave.toDate) {
        const leaveStartAdObj = convertBsToAdDateObject(leave.fromDate);
        const leaveEndAdObj = convertBsToAdDateObject(leave.toDate);

        if (leaveStartAdObj && leaveEndAdObj) {
          let currentAdDate = new Date(leaveStartAdObj.getTime());
          while(currentAdDate.getTime() <= leaveEndAdObj.getTime()){
            const currentAdDateStr = `${currentAdDate.getFullYear()}-${String(currentAdDate.getMonth() + 1).padStart(2, '0')}-${String(currentAdDate.getDate()).padStart(2, '0')}`;
            if(monthViewAdDatesSet.has(currentAdDateStr)){
              overlaps = true;
              break;
            }
            currentAdDate.setDate(currentAdDate.getDate() + 1);
          }
        }
      } else if (leave.date) { // Single day leave
        const singleLeaveAdObj = convertBsToAdDateObject(leave.date);
        if (singleLeaveAdObj) {
           const singleLeaveAdStr = `${singleLeaveAdObj.getFullYear()}-${String(singleLeaveAdObj.getMonth() + 1).padStart(2, '0')}-${String(singleLeaveAdObj.getDate()).padStart(2, '0')}`;
           if (monthViewAdDatesSet.has(singleLeaveAdStr)) {
            overlaps = true;
           }
        }
      }
      if(overlaps) {
        filteredLeaves.push(leave);
      }
    });
    // Sort absences by date (AD) before converting to BS for display
    filteredAbsences.sort((a,b) => new Date(a).getTime() - new Date(b).getTime());

    return { 
        absencesForDisplay: filteredAbsences.map(adDate => convertAdToBs(adDate)), 
        leavesForDisplay: filteredLeaves 
    };

  }, [allAbsentDatesAD, allApprovedLeaveRecords, currentMonthViewAdDates]);

  if (!currentBsYear) { // Or a more robust check for initial loading state
    return (
      <div className="p-4 text-gray-600 text-center">
        Loading details...
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 pt-3 rounded-md flex flex-col h-full">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 border-b-2 pb-2">
        Attendance for {currentBsMonthName} {currentBsYear}
      </h2>

      <div className="overflow-y-auto flex-grow space-y-6">
        {absencesForDisplay.length === 0 && leavesForDisplay.length === 0 ? (
          <p className="text-gray-500">No absences or approved leaves for this student in {currentBsMonthName} {currentBsYear}.</p>
        ) : (
          <>
            {absencesForDisplay.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold text-red-700 mb-2">Absent Dates (BS)</h3>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  {absencesForDisplay.map((bsDate, index) => (
                    <li key={`absent-${index}`} className="text-gray-700">
                      {bsDate || "Invalid Date"}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {leavesForDisplay.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold text-orange-600 mb-2">Approved Leaves</h3>
                <div className="space-y-4">
                  {leavesForDisplay.map((leave) => (
                    <div key={leave.leaveId} className="p-3 border rounded-md shadow-sm bg-orange-50">
                      <strong className="block text-gray-800">{leave.title || "N/A"}</strong>
                      <p className="text-sm text-gray-600 mt-1">Reason: {leave.reason || "N/A"}</p>
                      <p className="text-sm text-gray-600">
                        Period: <span className="capitalize">{leave.periodType === "dateRange" ? "Date Range" : "Single Day"}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Date(s) (BS):{' '}
                        {leave.periodType === 'dateRange'
                          ? `${leave.fromDate || "N/A"} to ${leave.toDate || "N/A"}`
                          : leave.date || "N/A"}
                      </p>
                       <p className="text-xs text-gray-500 mt-1">
                        Applied: {new Date(leave.appliedAt).toLocaleDateString()}
                       </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Details;