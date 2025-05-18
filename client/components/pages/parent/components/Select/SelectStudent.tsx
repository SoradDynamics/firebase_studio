// src/components/parent/SelectStudentComponent.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Student, Parent } from 'types/models';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { useSelectedStudent } from '../../contexts/SelectedStudentContext'; // Import context hook
import { databases, Query, account } from '~/utils/appwrite'; // Assuming appwrite utils

// Appwrite config (can be moved to a central config or env)
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID as string;
const STUDENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID as string;
const PARENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID as string;

interface SelectStudentComponentProps {
  // Props like label, placeholder can still be passed if needed for specific instances
  label?: string;
  placeholder?: string;
}

const SelectStudentComponent: React.FC<SelectStudentComponentProps> = ({
  label = "Select Student:",
  placeholder = "Select a student...",
}) => {
  const { selectedStudentId, setSelectedStudentId } = useSelectedStudent(); // Use context
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // const [parent, setParent] = useState<Parent | null>(null); // If needed for welcome message etc.

  const fetchStudentsForCurrentUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await account.get(); // Get current logged-in user
      if (!user || !user.email) {
        setError("User not logged in or email not available.");
        setIsLoading(false);
        return;
      }

      // Fetch parent document based on current user's email
      const parentResponse = await databases.listDocuments<Parent>(
        DATABASE_ID,
        PARENT_COLLECTION_ID,
        [Query.equal('email', user.email), Query.limit(1)]
      );

      if (parentResponse.documents.length === 0) {
        setError("No parent record found for the logged-in user.");
        setStudents([]);
        setIsLoading(false);
        return;
      }
      const currentParent = parentResponse.documents[0];
      // setParent(currentParent); // If you need parent info here

      // Fetch students for this parent
      if (currentParent.$id) {
        const studentResponse = await databases.listDocuments<Student>(
          DATABASE_ID,
          STUDENT_COLLECTION_ID,
          [Query.equal('parentId', currentParent.$id), Query.orderAsc('name')]
        );
        const fetchedStudents = studentResponse.documents;
        setStudents(fetchedStudents);

        // Logic to set initial selected student from context or default
        const currentPersistedId = localStorage.getItem('lastSelectedStudentId_global'); // Use the global key
        if (currentPersistedId && fetchedStudents.some(s => s.$id === currentPersistedId)) {
            if(selectedStudentId !== currentPersistedId) { // Sync context if it's out of sync
                setSelectedStudentId(currentPersistedId);
            }
        } else if (fetchedStudents.length > 0) {
          // If context doesn't have a valid selection for these students, update it
          if (!selectedStudentId || !fetchedStudents.some(s => s.$id === selectedStudentId)) {
            setSelectedStudentId(fetchedStudents[0].$id);
          }
        } else {
          setSelectedStudentId(null); // No students, so clear selection
        }
      } else {
        setError("Parent ID missing.");
        setStudents([]);
      }
    } catch (err: any) {
      console.error("Error fetching students:", err);
      setError(err.message || "Failed to load students.");
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [setSelectedStudentId, selectedStudentId]); // Added selectedStudentId to ensure re-check if context changes externally

  useEffect(() => {
    fetchStudentsForCurrentUser();
  }, [fetchStudentsForCurrentUser]);


  const handleSelectionChange = (studentIdValue: string | null) => {
    setSelectedStudentId(studentIdValue); // Update context
  };

  if (isLoading) {
    return (
      <div className="w-full animate-pulse">
        <div className="h-5 bg-gray-300 rounded w-1/3 mb-2"></div>
        <div className="h-12 bg-gray-300 rounded-md w-full"></div>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-sm">Error: {error}</p>;
  }

  const hasStudents = students && students.length > 0;

  return (
    <div className="flex items-center mb-9 gap-6 p-4 bg-white rounded-lg shadow-md border border-gray-200"> 
      <label htmlFor="student-select-component" className="block text-gray-700 text-xl font-semibold whitespace-nowrap">
      {label}
      </label>
      <div className="relative flex-1 max-w-[300px]">
      <select
        id="student-select-component"
        value={selectedStudentId || ''}
        onChange={(e) => handleSelectionChange(e.target.value || null)}
        disabled={!hasStudents || isLoading}
        className={`
        w-full pl-4 pr-10 py-3 text-base
        border border-gray-300 bg-white text-gray-800
        rounded-lg shadow-sm transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        appearance-none
        ${!hasStudents || isLoading ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}
        ${selectedStudentId ? '' : 'text-gray-500'}
        `}
      >
        <option value="" disabled className="text-gray-400">
        {placeholder}
        </option>
        {hasStudents ? (
        students.map((student) => (
          <option key={student.$id} value={student.$id} className="text-gray-800">
          {student.name}
          </option>
        ))
        ) : (
        <option value="" disabled className="text-gray-400">
          No students available for this parent
        </option>
        )}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
        <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
      </div>
      </div>
      {!hasStudents && !isLoading && (
      <p className="text-sm text-gray-500">No students linked to your account.</p>
      )}
    </div>
  );
};

export default SelectStudentComponent;