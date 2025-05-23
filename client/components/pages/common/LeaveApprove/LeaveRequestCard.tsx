// src/components/leave/LeaveRequestCard.tsx
import React from 'react';
import { Leave } from 'types';
import ActionButton from '../../../common/ActionButton';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface LeaveRequestCardProps {
  leave: Leave;
  onApprove: () => void;
  onReject: () => void;
  isModified: boolean;
  originalStatus?: 'pending' | 'validated' | 'rejected' | 'approved';
}

const LeaveRequestCard: React.FC<LeaveRequestCardProps> = ({
  leave,
  onApprove,
  onReject,
  isModified,
  originalStatus,
}) => {
  const getStatusColor = (status: string) => {
    if (status === 'approved') return 'text-green-600 bg-green-100';
    if (status === 'rejected') return 'text-red-600 bg-red-100';
    if (status === 'pending') return 'text-yellow-600 bg-yellow-100';
    if (status === 'validated') return 'text-blue-600 bg-blue-100';
    return 'text-gray-600 bg-gray-100';
  };

  const displayDate = leave.periodType === 'today'
    ? leave.date
    : `${leave.fromDate} to ${leave.toDate}`;

  return (
    <div className="bg-white shadow-lg rounded-lg p-4 mb-4 border border-gray-200 hover:shadow-xl transition-shadow duration-200">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-800">{leave.title}</h3>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(leave.status)}`}>
          {leave.status.toUpperCase()}
          {isModified && originalStatus && leave.status !== originalStatus && (
            <span className="text-xs italic ml-1">(was {originalStatus})</span>
          )}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-1"><strong>Student:</strong> {leave.studentName} ({leave.studentClass} - {leave.studentSection})</p>
      <p className="text-sm text-gray-600 mb-1"><strong>Reason:</strong> {leave.reason}</p>
      <p className="text-sm text-gray-600 mb-1"><strong>Dates:</strong> {displayDate}</p>
      <p className="text-xs text-gray-500 mb-3">Applied: {new Date(leave.appliedAt).toLocaleString()}</p>
      {leave.status === 'rejected' && leave.rejectionReason && (
        <p className="text-sm text-red-500 bg-red-50 p-2 rounded mt-2">
          <strong>Rejection Reason:</strong> {leave.rejectionReason}
        </p>
      )}
      <div className="flex justify-end space-x-2 mt-3">
        {leave.status !== 'approved' && ( // Show approve if not already approved
            <ActionButton
                icon={<CheckCircleIcon className="h-5 w-5" />}
                onClick={onApprove}
                color="green"
                isIconOnly={false}
                buttonText="Approve"
            />
        )}
        {leave.status !== 'rejected' && ( // Show reject if not already rejected
            <ActionButton
                icon={<XCircleIcon className="h-5 w-5" />}
                onClick={onReject}
                color="red"
                isIconOnly={false}
                buttonText="Reject"
            />
        )}
      </div>
    </div>
  );
};

export default LeaveRequestCard;