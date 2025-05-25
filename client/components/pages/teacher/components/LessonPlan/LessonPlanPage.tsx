import React, { useEffect, useState } from 'react';
import { Button, Spinner } from '@heroui/react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useLessonPlanStore, LessonPlan } from '~/store/lessonPlanStore';
import LessonPlanFilters from './LessonPlanFilters';
import LessonPlanCard from './LessonPlanCard';
import LessonPlanForm from './LessonPlanForm';
import LessonPlanDetailView from './LessonPlanDetailView';
import Popover from '../../../../common/Popover'; // Assuming path

const LessonPlanPage: React.FC = () => {
  const {
    teacherProfile, fetchTeacherProfile, isLoadingTeacherProfile,
    assignedContexts, isLoadingContexts,
    lessonPlans, isLoadingLessonPlans,
    selectedLessonPlan, selectLessonPlan,
    deleteLessonPlan, isSubmittingLessonPlan,
    error, setError,
  } = useLessonPlanStore();

  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [lessonPlanToEdit, setLessonPlanToEdit] = useState<LessonPlan | null>(null);
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);
  const [lessonPlanIdToDelete, setLessonPlanIdToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchTeacherProfile();
  }, [fetchTeacherProfile]);

  // Clear error when component unmounts or selected plan changes
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, [setError, selectedLessonPlan]);


  const handleAddLessonPlan = () => {
    setLessonPlanToEdit(null);
    setIsFormDrawerOpen(true);
    setError(null);
  };

  const handleEditLessonPlan = (plan: LessonPlan) => {
    setLessonPlanToEdit(plan);
    setIsFormDrawerOpen(true);
    setError(null);
  };

  const handleDeleteRequest = (planId: string) => {
    setLessonPlanIdToDelete(planId);
    setIsDeletePopoverOpen(true);
    setError(null);
  };

  const confirmDeleteLessonPlan = async () => {
    if (lessonPlanIdToDelete) {
      const success = await deleteLessonPlan(lessonPlanIdToDelete);
      if(success) {
        setIsDeletePopoverOpen(false);
        setLessonPlanIdToDelete(null);
        if (selectedLessonPlan?.$id === lessonPlanIdToDelete) {
          selectLessonPlan(null); // Clear detail view if deleted item was shown
        }
      }
    }
  };

  const handleViewDetails = (plan: LessonPlan) => {
    selectLessonPlan(plan);
    setError(null);
  };

  const handleBackFromDetails = () => {
    selectLessonPlan(null);
  };

  if (isLoadingTeacherProfile || (teacherProfile && isLoadingContexts && assignedContexts.length === 0)) {
    return <div className="flex justify-center items-center h-screen"><Spinner label="Loading teacher data..." size="lg" /></div>;
  }

  if (!teacherProfile) {
    return <div className="p-6 text-center text-red-600">Error: Teacher profile could not be loaded. {error}</div>;
  }
  
  if (assignedContexts.length === 0 && !isLoadingContexts) {
    return (
        <div className="p-6 text-center">
            <h1 className="text-2xl font-semibold mb-4">Lesson Plans</h1>
            <p className="text-gray-600">
                You are not currently assigned to any classes/subjects in the routine.
                Please contact an administrator if you believe this is an error.
            </p>
        </div>
    );
  }


  return (
    <div className="p-4 md:p-6">
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
          </span>
        </div>
      )}

      {selectedLessonPlan ? (
        <LessonPlanDetailView
          plan={selectedLessonPlan}
          onBack={handleBackFromDetails}
          onEdit={handleEditLessonPlan}
          onDeleteRequest={handleDeleteRequest}
        />
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">My Lesson Plans</h1>
            <Button color="primary" onClick={handleAddLessonPlan} startContent={<PlusIcon className="h-5 w-5" />}>
              Add Lesson Plan
            </Button>
          </div>

          <LessonPlanFilters />

          {isLoadingLessonPlans && <div className="flex justify-center p-10"><Spinner label="Loading lesson plans..." /></div>}
          
          {!isLoadingLessonPlans && lessonPlans.length === 0 && (
            <p className="text-center text-gray-500 py-10">No lesson plans found matching your criteria. Try adjusting filters or adding a new one.</p>
          )}

          {!isLoadingLessonPlans && lessonPlans.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessonPlans.map((plan) => (
                <LessonPlanCard
                  key={plan.$id}
                  plan={plan}
                  onEdit={handleEditLessonPlan}
                  onDelete={handleDeleteRequest}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </>
      )}

      <LessonPlanForm
        isOpen={isFormDrawerOpen}
        onClose={() => setIsFormDrawerOpen(false)}
        lessonPlanToEdit={lessonPlanToEdit}
      />

      <Popover
        isOpen={isDeletePopoverOpen}
        onClose={() => setIsDeletePopoverOpen(false)}
        onConfirm={confirmDeleteLessonPlan}
        title="Confirm Deletion"
        content="Are you sure you want to delete this lesson plan? This action cannot be undone."
        isConfirmLoading={isSubmittingLessonPlan}
      />
    </div>
  );
};

export default LessonPlanPage;