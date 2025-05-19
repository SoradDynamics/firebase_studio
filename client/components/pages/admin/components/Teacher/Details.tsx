// src/Academic/Teacher/Details.tsx
import React from "react";
import { Button } from "@heroui/react";
import { Teacher } from 'types/teacher';
import {
    UserCircleIcon, EnvelopeIcon, BookOpenIcon, AcademicCapIcon, HashtagIcon,
    CalendarDaysIcon, ClockIcon, IdentificationIcon
} from '@heroicons/react/24/outline';

interface DetailsProps {
  teacher: Teacher | null;
  onBack?: () => void;
}

const formatDateTime = (isoString: string | undefined | null): string => {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch (e) { return 'Invalid Date'; }
};

const DetailItem: React.FC<{ icon?: React.ReactNode; label: string; value: React.ReactNode | string | number | string[] | null | undefined }> = ({ icon, label, value }) => {
  let displayValue: React.ReactNode = <span className="text-gray-500 italic">N/A</span>;
  if (Array.isArray(value)) {
    displayValue = value.length > 0 ? value.join(', ') : <span className="text-gray-500 italic">N/A</span>;
  } else if (value !== null && value !== undefined && value !== '') {
    displayValue = String(value);
  }

  return (
    <div className="flex items-start space-x-2 py-2">
      {icon && <div className="flex-shrink-0 w-5 h-5 text-gray-500 mt-0.5">{icon}</div>}
      <div className="flex-1">
        <dt className="text-sm font-medium text-gray-600">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 break-words">{displayValue}</dd>
      </div>
    </div>
  );
};

const Details: React.FC<DetailsProps> = ({ teacher, onBack }) => {
  if (!teacher) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-gray-500 italic">No teacher selected.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 flex flex-col h-full space-y-6 bg-gray-100 rounded-xl shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-800 leading-tight">
          Teacher Details
        </h2>
        {onBack && (
          <Button onPress={onBack} color="secondary" variant="flat" size="sm">
            Back to List
          </Button>
        )}
      </div>

      <div className="space-y-3">
         <h3 className="text-lg font-medium text-gray-700 mb-2 border-b border-gray-100 pb-1">
            <UserCircleIcon className="w-6 h-6 inline-block mr-2 align-text-bottom text-primary-500" />
            {teacher.name}
         </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          <DetailItem icon={<IdentificationIcon className="w-5 h-5" />} label="Teacher ID (Custom)" value={teacher.id} />
          <DetailItem icon={<EnvelopeIcon className="w-5 h-5" />} label="Email" value={teacher.email} />
          <DetailItem icon={<BookOpenIcon className="w-5 h-5" />} label="Subject(s)" value={teacher.subject} />
          <DetailItem icon={<HashtagIcon className="w-5 h-5" />} label="Level(s)" value={teacher.level} />
          <DetailItem icon={<AcademicCapIcon className="w-5 h-5" />} label="Qualification" value={teacher.qualification} />
          {/* Fields removed from display: base_salary, salary, assignemnts, notes */}
        </dl>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-base font-medium text-gray-700 mb-2">System Information</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          <DetailItem icon={<IdentificationIcon className="w-5 h-5" />} label="Document ID (System)" value={teacher.$id} />
          <DetailItem icon={<UserCircleIcon className="w-5 h-5" />} label="Auth User ID" value={teacher.authUserId} />
          <DetailItem icon={<CalendarDaysIcon className="w-5 h-5" />} label="Record Created" value={formatDateTime(teacher.$createdAt)} />
          <DetailItem icon={<ClockIcon className="w-5 h-5" />} label="Record Last Updated" value={formatDateTime(teacher.$updatedAt)} />
        </dl>
      </div>
    </div>
  );
};

export default Details;