// src/pages/parent/ViewStudentRoutinePage.tsx
import React, { useEffect } from 'react';
import SelectStudentComponent from '../Select/SelectStudent'; // YOUR EXISTING COMPONENT
import StudentRoutineView from '../../../student/components/Routine/StudentRoutineView';         // REUSABLE COMPONENT
import { useSelectedStudent } from '../../contexts/SelectedStudentContext';        // YOUR EXISTING CONTEXT HOOK
import { useParentSelectedStudentRoutineStore } from '~/store/parentSelectedStudentRoutineStore'; // NEW STORE
import { Spinner } from '@heroui/react'; // Or your preferred Spinner component

const ViewStudentRoutinePage: React.FC = () => {
  const { selectedStudentId } = useSelectedStudent(); // From your context
  const {
    selectedStudentDetails, // To get student's name for the routine card header
    studentRoutine,
    isLoading,
    error,
    fetchRoutineForSelectedStudent,
    clearRoutine, // To clear data when no student is selected
  } = useParentSelectedStudentRoutineStore();

  useEffect(() => {
    if (selectedStudentId) {
      fetchRoutineForSelectedStudent(selectedStudentId);
    } else {
      // If no student is selected (e.g., parent deselects or logs in initially with no selection)
      clearRoutine();
    }
  // `fetchRoutineForSelectedStudent` and `clearRoutine` are stable, so `selectedStudentId` is the main dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [selectedStudentId]); 

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 lg:p-8">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center">
          Student's Class Routine
        </h1>
        <p className="text-center text-gray-600 mt-1">Select a student to view their schedule.</p>
      </header>

      {/* Your existing student selection component */}
      <div className="mb-6 md:mb-8 max-w-xl mx-auto">
        <SelectStudentComponent 
            label="Viewing Routine For:"
            placeholder="Choose your child..."
        />
      </div>
      

      <div className="mt-0"> {/* Removed redundant margin-top */}
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Spinner label="Loading routine..." color="primary" size="lg" />
          </div>
        )}

        {!isLoading && error && (
          <div className="max-w-2xl mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative text-center" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {!isLoading && !error && selectedStudentId && !studentRoutine && (
            // This handles the case where a student is selected, loading is done, no error, but routine is legitimately not found
             <StudentRoutineView routine={null} studentName={selectedStudentDetails?.name} />
        )}

        {!isLoading && !error && selectedStudentId && studentRoutine && (
          // Display routine if found
          <StudentRoutineView routine={studentRoutine} studentName={selectedStudentDetails?.name} />
        )}

        {!isLoading && !selectedStudentId && (
          // Prompt to select a student if none is selected
          <div className="max-w-2xl mx-auto p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center mt-6">
            {/* You can use an icon here from Heroicons if you like */}
            <h3 className="text-lg font-medium text-gray-800">No Student Selected</h3>
            <p className="mt-1.5 text-sm text-gray-600">
              Please select a student from the dropdown above to see their routine.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewStudentRoutinePage;