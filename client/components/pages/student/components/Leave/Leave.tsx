// src/pages/student/Leave.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { account, databases, Query } from '~/utils/appwrite'; // Adjust path
import { Student, LeaveEntry, LeaveStatus } from 'types/models'; // Adjust path
import {
  ClockIcon, CheckCircleIcon, XCircleIcon, CalendarDaysIcon, InformationCircleIcon,
  BriefcaseIcon, ChatBubbleLeftEllipsisIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { ArrowPathIcon as SolidArrowPathIcon } from '@heroicons/react/24/solid'; // For ActionButton icon
import ActionButton from '../../../../common/ActionButton'; // Adjust path
import PerfectScrollbar from 'react-perfect-scrollbar';

const  STUDENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;


// --- HELPER FUNCTIONS ---
const parseLeaveEntries = (leaveStrings: string[] | undefined): LeaveEntry[] => {
  if (!leaveStrings) return [];
  return leaveStrings.map(str => {
    try { return JSON.parse(str) as LeaveEntry; } catch (e) { console.error("SL: Failed to parse leave string:", str, e); return null; }
  }).filter(Boolean) as LeaveEntry[];
};

const formatDateUI = (dateString?: string, includeTime: boolean = false) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString; // BS Date
            throw new Error("Invalid date string");
        }
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; options.hour12 = true; }
        return date.toLocaleDateString(undefined, options);
    } catch (e) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString; // Fallback for BS Date
        console.error("Error formatting date for UI (StudentLeave):", dateString, e);
    }
    return dateString;
};

const getStatusPill = (status: LeaveStatus) => {
  let bgColor = 'bg-gray-100'; let textColor = 'text-gray-800'; let IconComponent = InformationCircleIcon;
  let text = status.charAt(0).toUpperCase() + status.slice(1);

  switch (status) {
    case 'pending':
      bgColor = 'bg-yellow-100'; textColor = 'text-yellow-700'; IconComponent = ClockIcon; text = "Pending Review";
      break;
    case 'validated':
      bgColor = 'bg-sky-100'; textColor = 'text-sky-700'; IconComponent = CheckCircleIcon; text = "Parent Validated";
      break;
    case 'rejected':
      bgColor = 'bg-red-100'; textColor = 'text-red-700'; IconComponent = XCircleIcon; text = "Rejected";
      break;
    case 'approved':
      bgColor = 'bg-green-100'; textColor = 'text-green-700'; IconComponent = ShieldCheckIcon; text = "Approved";
      break;
    case 'cancelled':
      bgColor = 'bg-slate-100'; textColor = 'text-slate-700'; IconComponent = XCircleIcon; text = "Cancelled";
      break;
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${bgColor} ${textColor} whitespace-nowrap`}>
      <IconComponent className={`h-4 w-4 mr-1.5`} />
      {text}
    </span>
  );
};
// --- END HELPER FUNCTIONS ---

const StudentLeavePage: React.FC = () => {
  const [leaveApplications, setLeaveApplications] = useState<LeaveEntry[]>([]);
  const [studentName, setStudentName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaveApplications = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setError(null);
    try {
      const userAccount = await account.get();
      if (!userAccount || !userAccount.email) { throw new Error("User not authenticated or email not available."); }

      const studentResponse = await databases.listDocuments<Student>(
        DATABASE_ID, STUDENT_COLLECTION_ID,
        [Query.equal('stdEmail', userAccount.email), Query.limit(1)]
      );

      if (studentResponse.documents.length > 0) {
        const studentData = studentResponse.documents[0];
        setStudentName(studentData.name);
        const parsedLeaves = parseLeaveEntries(studentData.leave)
          .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
        setLeaveApplications(parsedLeaves);
      } else {
        setError("No student profile found linked to your account."); setLeaveApplications([]);
      }
    } catch (err: any) {
      console.error("SL: Error fetching leave applications:", err);
      let errorMessage = "Failed to load leave applications.";
      if (err.message.includes("User not authenticated")) errorMessage = "Please log in.";
      else if (err.message.includes("Network request failed")) errorMessage = "Network error. Check connection.";
      setError(errorMessage); setLeaveApplications([]);
    } finally { if (showLoader) setIsLoading(false); }
  }, []);

  useEffect(() => { fetchLeaveApplications(); }, [fetchLeaveApplications]);

  const handleRefresh = () => { fetchLeaveApplications(true); };

  // ---- RENDER LOGIC ----
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-sky-100 min-h-screen py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
          <header className="mb-10">
            <div className="flex justify-between items-center py-4">
              <div className="h-8 bg-gray-300 rounded w-1/2 md:w-1/3"></div>
              <div className="h-10 w-24 bg-gray-300 rounded-lg"></div> {/* Placeholder for ActionButton */}
            </div>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 p-6 rounded-xl shadow-lg h-64">
                <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2 mb-3"></div>
                <div className="h-4 bg-gray-300 rounded w-full mb-3"></div>
                <div className="h-4 bg-gray-300 rounded w-5/6 mb-5"></div>
                <div className="h-8 bg-gray-300 rounded-full w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full ">
        <div className="container mx-auto p-4 sm:p-6 lg:px-8">
          <header className="mb-10">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center py-4 gap-4">
               <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">My Leave Applications</h1>
               <ActionButton
                  icon={<SolidArrowPathIcon className="h-5 w-5" />}
                  onClick={handleRefresh} isIconOnly={false}
                  buttonText="Refresh" 
                />
            </div>
          </header>
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-md" role="alert">
            <div className="flex">
              <div className="py-1"><InformationCircleIcon className="h-6 w-6 text-red-600 mr-3" /></div>
              <div>
                <p className="font-bold text-lg">Unable to Load Leaves</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full ">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-10">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center py-4 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">My Leave Applications</h1>
              {studentName && <p className="text-md text-slate-600 mt-1">Viewing applications for {studentName}</p>}
            </div>
            <ActionButton
              icon={<SolidArrowPathIcon className="h-5 w-5" />}
              onClick={handleRefresh}
            //   color="primary"
              isIconOnly={true}
              buttonText="Refresh"
            //   className="self-start sm:self-center"
            />
          </div>
        </header>

        {leaveApplications.length === 0 && !isLoading ? (
          <div className="text-center py-16 sm:py-20 bg-white rounded-xl shadow-lg">
            <BriefcaseIcon className="mx-auto h-16 w-16 text-slate-400" />
            <h3 className="mt-4 text-xl font-semibold text-slate-700">No Leave Applications Yet</h3>
            <p className="mt-2 text-md text-slate-500">It looks like you haven't applied for any leaves.</p>
            <p className="mt-1 text-sm text-slate-400">When you apply for leave, it will show up here.</p>
          </div>
        ) : (
          <PerfectScrollbar
            options={{ suppressScrollX: true, wheelSpeed: 0.5 }}
            className="pr-2 -mr-2"
            style={{ maxHeight: 'calc(100vh - 240px)', /* Adjust offset as needed */ }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
              {leaveApplications.map((leave) => (
                <div key={leave.leaveId} className="bg-white rounded-xl shadow-xl hover:shadow-2xl transition-shadow duration-300 overflow-hidden flex flex-col group">
                  <div className={`px-5 py-4 border-l-4 ${
                      leave.status === 'approved' ? 'border-green-500' :
                      leave.status === 'rejected' ? 'border-red-500' :
                      leave.status === 'validated' ? 'border-sky-500' :
                      leave.status === 'pending' ? 'border-yellow-500' :
                      'border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h3 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors duration-200">
                        {leave.title}
                      </h3>
                      {getStatusPill(leave.status)}
                    </div>
                  </div>

                  <div className="px-5 py-4 flex-grow space-y-3.5">
                    <div className="flex items-start">
                      <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Reason</span>
                        <p className="text-sm text-slate-700 leading-relaxed">{leave.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CalendarDaysIcon className="h-5 w-5 text-slate-400 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Period</span>
                        <p className="text-sm text-slate-700">
                          {leave.periodType === 'dateRange'
                            ? `${(leave.fromDate)} to ${(leave.toDate)}`
                            : `${(leave.date)} ${leave.periodType === 'halfDay' ? '(Half Day)' : `(${leave.periodType.charAt(0).toUpperCase() + leave.periodType.slice(1)})`}`
                          }
                        </p>
                      </div>
                    </div>
                    
                    {leave.status === 'rejected' && leave.rejectionReason && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-start">
                          <XCircleIcon className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                          <div>
                              <span className="block text-xs font-medium text-red-500 uppercase tracking-wider">Rejection Reason</span>
                              <p className="text-sm text-red-700 leading-relaxed">{leave.rejectionReason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {leave.status === 'validated' && leave.validatedAt && (
                      <div className="mt-2">
                          <p className="text-xs text-sky-600">
                              <span className="font-medium">Parent Validated:</span> {(leave.validatedAt, true)}
                          </p>
                      </div>
                    )}
                    {leave.status === 'approved' && leave.approvedAt && (
                      <div className="mt-2">
                          <p className="text-xs text-green-600">
                              <span className="font-medium">Admin Approved:</span> {(leave.approvedAt, true)}
                          </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 px-5 py-3 text-xs text-slate-500 border-t border-slate-200 mt-auto">
                    Applied on: {(leave.appliedAt, true)}
                  </div>
                </div>
              ))}
            </div>
          </PerfectScrollbar>
        )}
      </div>
    </div>
  );
};

export default StudentLeavePage;