// src/components/parent/DisplayStudentComponent.tsx
import React, { useState, useEffect } from 'react';
import { Student } from 'types/models';
import { useSelectedStudent } from '../../contexts/SelectedStudentContext'; // Import context hook
import { databases } from '~/utils/appwrite'; // Appwrite utils
import {
  UserCircleIcon, AcademicCapIcon, IdentificationIcon, EnvelopeIcon,
  BuildingLibraryIcon, InformationCircleIcon, RectangleStackIcon,
} from '@heroicons/react/24/outline';

// Appwrite config
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID as string;
const STUDENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID as string;


// RecordItem sub-component (same as before)
const RecordItem: React.FC<{ icon: React.ElementType; label: string; value?: string | number | null; highlight?: boolean }> = ({
  icon: Icon, label, value, highlight = false,
}) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start space-x-3 py-3 sm:py-4">
      <Icon className={`h-6 w-6 flex-shrink-0 ${highlight ? 'text-indigo-600' : 'text-gray-500'} mt-0.5`} />
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <p className={`text-sm sm:text-base ${highlight ? 'font-semibold text-indigo-700' : 'text-gray-800'}`}>{value}</p>
      </div>
    </div>
  );
};


const DisplayStudentComponent: React.FC = () => {
  const { selectedStudentId } = useSelectedStudent(); // Get ID from context
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedStudentId) {
      setIsLoading(true);
      setError(null);
      databases.getDocument<Student>(DATABASE_ID, STUDENT_COLLECTION_ID, selectedStudentId)
        .then(response => {
          setStudent(response);
        })
        .catch(err => {
          console.error("Error fetching student details:", err);
          setError(err.message || "Failed to load student details.");
          setStudent(null); // Clear student data on error
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setStudent(null); // No student selected, so clear data
      setError(null); // Clear any previous errors
      setIsLoading(false);
    }
  }, [selectedStudentId]); // Re-fetch when selectedStudentId changes

  if (isLoading) {
    return ( // Simplified loading state for this component
      <div className="bg-white shadow-xl rounded-xl p-6 md:p-8 animate-pulse">
        <div className="h-8 bg-gray-300 rounded w-3/4 mb-6 mx-auto"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3 py-4">
            <div className="h-6 w-6 bg-gray-300 rounded-full mt-0.5"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
              <div className="h-5 bg-gray-300 rounded w-3/5"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-300 bg-red-50 rounded-lg text-red-700">
        <p className="font-semibold">Error loading student data:</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!selectedStudentId) {
    return (
      <div className="p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center">
        <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-3 text-lg font-medium text-gray-800">No Student Selected</h3>
        <p className="mt-1.5 text-sm text-gray-600">
          Please select a student to view their records.
        </p>
      </div>
    );
  }
  
  if (!student) { // Should be covered by !selectedStudentId or isLoading, but as a fallback
      return (
           <div className="p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center">
            <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-1.5 text-sm text-gray-600">
                Student data not available.
            </p>
            </div>
      );
  }


  // ... (The JSX for displaying student details remains the same as before)
  return (
    <div className="bg-white shadow-xl rounded-xl overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5">
          <div className="flex-shrink-0">
            <UserCircleIcon className="h-20 w-20 text-white opacity-90 rounded-full border-2 border-white/50" />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {student.name}
            </h2>
            <p className="text-sm text-indigo-200">
              Student Record Overview
            </p>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="p-6 md:p-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-3">
          Academic Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <RecordItem icon={AcademicCapIcon} label="Class Level" value={student.class} highlight />
          <RecordItem icon={RectangleStackIcon} label="Section" value={student.section} highlight />
          {student.facultyId && (
             <RecordItem icon={BuildingLibraryIcon} label="Faculty Affiliation ID" value={student.facultyId} />
          )}
          {student.stdEmail && (
            <RecordItem icon={EnvelopeIcon} label="Student Email" value={student.stdEmail} />
          )}
           <RecordItem icon={IdentificationIcon} label="Student ID (System)" value={student.$id} />
        </div>
      </div>

      {/* Footer/Actions - Optional */}
      <div className="bg-gray-50 px-6 py-4 text-right border-t border-gray-200">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150"
        >
          View Full Report (Coming Soon)
        </button>
      </div>
    </div>
  );
};

export default DisplayStudentComponent;