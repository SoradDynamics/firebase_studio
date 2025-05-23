// src/pages/student/MyRoutinePage.tsx
import React, { useEffect } from 'react';
import { useStudentRoutineStore } from '~/store/studentRoutineStore';
import StudentRoutineView from './StudentRoutineView';
import { Spinner } from '@heroui/react'; 

const MyRoutinePage: React.FC = () => {
  const {
    studentName,
    studentRoutine,
    isLoading,
    error,
    fetchStudentRoutine,
  } = useStudentRoutineStore();

  useEffect(() => {
    fetchStudentRoutine();
  }, [fetchStudentRoutine]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <Spinner label="Loading your routine..." color="primary" size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-red-50 p-4 text-center">
        <h2 className="text-xl font-semibold text-red-700 mb-2">Oops! Could not load your routine.</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={fetchStudentRoutine}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <header className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
          {studentName ? `Hello, ${studentName}!` : "My Routine"}
        </h1>
        <p className="text-md text-gray-500 mt-1">Here is your class schedule.</p>
      </header>
      
      <StudentRoutineView routine={studentRoutine} studentName={studentName} />
    </div>
  );
};

export default MyRoutinePage;