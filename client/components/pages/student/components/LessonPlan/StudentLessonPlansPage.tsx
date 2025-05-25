import React, { useEffect } from 'react';
import { Spinner } from '@heroui/react';
import { useStudentViewStore } from '~/store/studentLesson';
import StudentLessonPlanCard from './StudentLessonPlanCard';
import StudentLessonPlanDetailView from './StudentLessonPlanDetailView';
import StudentLessonPlanFilters from './StudentLessonPlanFilters'; // Optional

const StudentLessonPlansPage: React.FC = () => {
  const {
    studentProfile, fetchStudentProfile, isLoadingStudentProfile,
    publicLessonPlans, isLoadingLessonPlans,
    selectedLessonPlan, selectLessonPlan,
    error, setError,
  } = useStudentViewStore();

  useEffect(() => {
    fetchStudentProfile(); // This will also trigger fetching lesson plans if profile loads
  }, [fetchStudentProfile]);

  useEffect(() => {
    // Clear error when component unmounts or selected plan changes
    return () => {
      setError(null);
    };
  }, [setError, selectedLessonPlan]);

  if (isLoadingStudentProfile) {
    return <div className="flex justify-center items-center h-screen"><Spinner label="Loading your profile..." size="lg" /></div>;
  }

  if (error && !studentProfile) { // Show critical error if profile failed to load
    return <div className="p-6 text-center text-red-600">Error: {error}</div>;
  }
  
  if (!studentProfile) {
    return <div className="p-6 text-center text-gray-600">Could not load student information.</div>;
  }


  return (
    <div className="p-4 md:p-6">
      {error && ( // Non-critical errors (e.g., during lesson plan fetch after profile load)
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
          </span>
        </div>
      )}

      {selectedLessonPlan ? (
        <StudentLessonPlanDetailView
          plan={selectedLessonPlan}
          onBack={() => selectLessonPlan(null)}
        />
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">
              Public Lesson Plans for {studentProfile.name}
            </h1>
            <p className="text-sm text-gray-600">
                Class: {studentProfile.class}, Section: {studentProfile.section}
            </p>
          </div>

          <StudentLessonPlanFilters /> {/* Optional filters */}

          {isLoadingLessonPlans && <div className="flex justify-center p-10"><Spinner label="Loading lesson plans..." /></div>}
          
          {!isLoadingLessonPlans && publicLessonPlans.length === 0 && (
            <p className="text-center text-gray-500 py-10">
                No public lesson plans found matching your class and section, or try adjusting filters.
            </p>
          )}

          {!isLoadingLessonPlans && publicLessonPlans.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicLessonPlans.map((plan) => (
                <StudentLessonPlanCard
                  key={plan.$id}
                  plan={plan}
                  onViewDetails={selectLessonPlan}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentLessonPlansPage;