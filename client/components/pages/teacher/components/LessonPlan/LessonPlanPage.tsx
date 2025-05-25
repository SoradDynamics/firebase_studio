import React, { useEffect, useRef } from 'react';
import { Button, Spinner } from '@heroui/react';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useLessonPlanStore } from '~/store/lessonPlanStore';
import LessonPlanFilters from './LessonPlanFilters';
import LessonPlanCard from './LessonPlanCard';
import { Drawer } from '../../../../common/Drawer'; // Adjust path
import LessonPlanForm from './LessonPlanForm';
import LessonPlanDetailView from './LessonPlanDetailView';
import Popover from '../../../../common/Popover'; // Adjust path

const LessonPlanPage: React.FC = () => {
  const {
    fetchTeacherInfoAndAssignments,
    loadLessonPlans,
    isLoadingAssignments,
    isLoadingLessonPlans,
    lessonPlans,
    error,
    isDrawerOpen,
    drawerMode,
    closeDrawer,
    openDrawer,
    isDeleteModalOpen,
    closeDeleteModal,
    confirmDeleteLessonPlan,
    isSubmitting,
    filters,
    teacherInfo, // Get teacherInfo to check if assignments are loaded
  } = useLessonPlanStore();

  const initialLoadDone = useRef(false); // To prevent useEffect from running multiple times due to state changes it causes

  useEffect(() => {
    // This effect handles the initial fetching of teacher assignments and subsequent lesson plans.
    // It should ideally run once, or when essential dependencies for fetching change.
    if (!initialLoadDone.current) {
      const init = async () => {
        // Fetch assignments first
        await fetchTeacherInfoAndAssignments();
        // After assignments are fetched, teacherInfo should be available.
        // Then load lesson plans. The loadLessonPlans function itself checks for teacherInfo.
        // This ensures loadLessonPlans runs with the necessary context.
        loadLessonPlans();
      };
      init();
      initialLoadDone.current = true;
    }
  }, [fetchTeacherInfoAndAssignments, loadLessonPlans]); // Keep dependencies, Zustand actions are stable.

  const handleAddLessonPlan = () => {
    if (!filters.facultyId || !filters.className || !filters.sectionId || !filters.subject) {
        alert("Please select Faculty, Class, Section, and Subject from the filters before adding a new lesson plan.");
        return;
    }
    openDrawer('add');
  };

  const getDrawerTitle = () => {
    if (drawerMode === 'add') return 'Create New Lesson Plan';
    if (drawerMode === 'edit') return 'Edit Lesson Plan';
    if (drawerMode === 'view') return 'Lesson Plan Details';
    return 'Lesson Plan';
  };

  const handleRetryLoad = () => {
    initialLoadDone.current = false; // Allow re-running the effect
    // Manually trigger the functions again if the effect doesn't re-run as expected
    // (though changing initialLoadDone.current and having the dependencies should work)
    fetchTeacherInfoAndAssignments().then(() => loadLessonPlans());
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">My Lesson Plans</h1>
        <Button color="primary" onPress={handleAddLessonPlan} startContent={<PlusIcon className="h-5 w-5"/>}>
          Add Lesson Plan
        </Button>
      </div>

      <LessonPlanFilters />

      {isLoadingAssignments && (
        <div className="flex justify-center items-center py-10">
          <Spinner label="Loading your teaching assignments..." />
        </div>
      )}

      {/* Show error only if not loading assignments (to avoid showing error during initial load) */}
      {error && !isLoadingAssignments && (
        <div className="text-center py-10 text-red-500 bg-red-50 p-4 rounded-md">
            <p className="font-semibold">An Error Occurred</p>
            <p>{error}</p>
            <Button color="danger" variant="ghost" onPress={handleRetryLoad} className="mt-2">
                Try Reloading
            </Button>
        </div>
      )}

      {/* Show lesson plan content only if assignments are loaded and no error */}
      {!isLoadingAssignments && !error && teacherInfo && ( // Ensure teacherInfo is present, meaning assignments attempt is done
        isLoadingLessonPlans ? (
          <div className="flex justify-center items-center py-10">
            <Spinner label="Loading lesson plans..." />
          </div>
        ) : lessonPlans.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>No lesson plans found matching your criteria.</p>
            <p>Try adjusting filters or create a new lesson plan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessonPlans.map(lp => (
              <LessonPlanCard key={lp.$id} lessonPlan={lp} />
            ))}
          </div>
        )
      )}
      {/* Case where assignments might have loaded but no teacherInfo (should not happen if logic is correct) */}
       {!isLoadingAssignments && !error && !teacherInfo && (
         <div className="text-center py-10 text-gray-500">
            <p>Could not load teacher information. Please try reloading.</p>
             <Button color="default" variant="ghost" onPress={handleRetryLoad} className="mt-2">
                Reload
            </Button>
        </div>
       )}


      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={getDrawerTitle()}
        size={drawerMode === 'view' ? 'lg' : 'xl'}
      >
        <Drawer.Header>{getDrawerTitle()}</Drawer.Header>
        <Drawer.Body>
          {drawerMode === 'view' ? <LessonPlanDetailView /> : <LessonPlanForm />}
        </Drawer.Body>
      </Drawer>

      <Popover
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteLessonPlan}
        title="Confirm Deletion"
        content="Are you sure you want to delete this lesson plan? This action cannot be undone."
        isConfirmLoading={isSubmitting}
      />
    </div>
  );
};

export default LessonPlanPage;