import React, { useEffect } from 'react';
import { Spinner } from '@heroui/react';
import { useSelectedStudent } from '../../contexts/SelectedStudentContext'; // Path to your context
import { useParentViewStore } from '~/store/parentLesson'; // Path to your new store
import SelectStudentComponent from '../Select/SelectStudent'; // Path to your component
// import DisplayStudentComponent from '~/components/parent/DisplayStudentComponent'; // Optional: if you want to show full details

// Use the same card and detail view as student, or create parent-specific ones if needed
import StudentLessonPlanCard from '../../../student/components/LessonPlan/StudentLessonPlanCard'; // Reusing for now
import StudentLessonPlanDetailView from '../../../student/components/LessonPlan/StudentLessonPlanDetailView'; // Reusing for now
import StudentLessonPlanFilters from '../../../student/components/LessonPlan/StudentLessonPlanFilters'; // Reusing filters

const ParentLessonPlansPage: React.FC = () => {
  const { selectedStudentId } = useSelectedStudent();
  const {
    selectedStudentDetails, fetchSelectedStudentDetails, isLoadingStudentDetails,
    publicLessonPlans, isLoadingLessonPlans,
    currentLessonPlan, selectCurrentLessonPlan, // Renamed from studentViewStore
    error, setError,
    // Filters if you reuse StudentLessonPlanFilters directly
    // currentFilters, setFilter, clearFilters, 
  } = useParentViewStore();

  useEffect(() => {
    if (selectedStudentId) {
      fetchSelectedStudentDetails(selectedStudentId);
    } else {
      // Clear data if no student is selected
      // Zustand store handles clearing publicLessonPlans via fetchSelectedStudentDetails(null)
    }
  }, [selectedStudentId, fetchSelectedStudentDetails]);

  useEffect(() => {
    return () => { setError(null); };
  }, [setError, currentLessonPlan, selectedStudentId]);


  const handleViewDetails = (plan: any) => { // Use 'any' or ParentStudentLessonPlan
    selectCurrentLessonPlan(plan);
  };

  // Modify the StudentLessonPlanCard to accept ParentStudentLessonPlan type and use `childsReview...`
  // For now, we'll cast or adapt. Ideally, StudentLessonPlanCard is made generic or duplicated.
  const renderLessonPlanCard = (plan: ParentStudentLessonPlan) => (
    <StudentLessonPlanCard
        key={plan.$id}
        plan={{
            ...plan,
            // Mapping ParentStudentLessonPlan specific review fields to StudentLessonPlanCard expected fields
            myReviewRating: plan.childsReviewRating,
            myReviewComment: plan.childsReviewComment,
            myReviewDate: plan.childsReviewDate,
        }}
        onViewDetails={() => handleViewDetails(plan)}
    />
  );


  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Parent Dashboard</h1>
      <p className="text-gray-600 mb-6">View lesson plans for your children.</p>
      
      <SelectStudentComponent />

      {error && (
        <div className="my-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {selectedStudentId && isLoadingStudentDetails && (
        <div className="flex justify-center items-center py-10">
          <Spinner label={`Loading details for selected student...`} size="lg" />
        </div>
      )}

      {selectedStudentId && selectedStudentDetails && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-1">
            Lesson Plans for {selectedStudentDetails.name}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Class: {selectedStudentDetails.class}, Section: {selectedStudentDetails.section}
          </p>
          {/* Optional: Display full student details using your DisplayStudentComponent
          <div className="mb-8">
             <DisplayStudentComponent />
          </div>
          */}

          {currentLessonPlan ? (
            <StudentLessonPlanDetailView
              plan={{
                ...currentLessonPlan,
                // No review mapping needed here as DetailView doesn't show student-specific reviews
              }}
              onBack={() => selectCurrentLessonPlan(null)}
            />
          ) : (
            <>
              <StudentLessonPlanFilters /> {/* Reusing student filters, adapt if needed */}
              
              {isLoadingLessonPlans && (
                <div className="flex justify-center py-10"><Spinner label="Loading lesson plans..." /></div>
              )}
              {!isLoadingLessonPlans && publicLessonPlans.length === 0 && (
                <p className="text-center text-gray-500 py-10">
                  No public lesson plans found for {selectedStudentDetails.name}, or try adjusting filters.
                </p>
              )}
              {!isLoadingLessonPlans && publicLessonPlans.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publicLessonPlans.map(renderLessonPlanCard)}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {!selectedStudentId && (
         <div className="mt-8 p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center">
            <p className="text-lg text-gray-600">Please select a student to view their lesson plans.</p>
        </div>
      )}
    </div>
  );
};

export default ParentLessonPlansPage;