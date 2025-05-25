import React, { useEffect, useState } from 'react';
import { Spinner, Button } from '@heroui/react'; // Assuming Button might be needed for actions
import { useAdminLessonPlanStore } from '~/store/adminLessonPlanStore';
import AdminLessonPlanFilters from './AdminLessonPlanFilters';
import AdminLessonPlanRow from './AdminLessonPlanRow';
import AdminLessonPlanDetailModal from './AdminLessonPlanDetailModal';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
// If you use cards instead of table rows:
// import StudentLessonPlanCard from '~/features/student-lesson-view/components/StudentLessonPlanCard'; 

const AdminLessonPlansPage: React.FC = () => {
  const {
    lessonPlans, isLoadingLessonPlans, fetchLessonPlans,
    selectedLessonPlan, selectLessonPlan,
    fetchFilterData, isLoadingFilterData,
    error, setError,
  } = useAdminLessonPlanStore();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchFilterData().then(() => {
        fetchLessonPlans();
    });
  }, [fetchFilterData, fetchLessonPlans]);


  useEffect(() => {
    return () => { setError(null); };
  }, [setError, selectedLessonPlan]);

  const handleViewDetails = (plan: any) => { // Use AdminLessonPlanView type
    selectLessonPlan(plan);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    selectLessonPlan(null); // Clear selection when modal closes
  };
  
  const isLoading = isLoadingLessonPlans || isLoadingFilterData;

  return (
    <div className="p-4 md:p-6 bg-gray-100 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin - Lesson Plan Management</h1>
        <p className="text-gray-600">View, filter, and manage all lesson plans.</p>
      </header>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
          Error: {error} <button onClick={() => setError(null)} className="float-right font-bold">X</button>
        </div>
      )}

      <AdminLessonPlanFilters />

      {isLoading && !lessonPlans.length && ( // Show spinner only if no data yet
        <div className="flex justify-center items-center py-20">
          <Spinner label="Loading lesson plans and filter data..." size="lg" />
        </div>
      )}

      {!isLoading && lessonPlans.length === 0 && (
        <div className="text-center text-gray-500 py-16 bg-white rounded-lg shadow">
          <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400 mb-3"/>
          <h3 className="text-xl font-medium">No Lesson Plans Found</h3>
          <p className="text-sm">Try adjusting your filters or there might be no lesson plans created yet.</p>
        </div>
      )}

      {!isLoadingLessonPlans && lessonPlans.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th scope="col" className="py-3.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher</th>
                <th scope="col" className="py-3.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                <th scope="col" className="py-3.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Class Context</th>
                <th scope="col" className="py-3.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date (BS)</th>
                <th scope="col" className="py-3.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="py-3.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Visibility</th>
                <th scope="col" className="py-3.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lessonPlans.map((plan) => (
                <AdminLessonPlanRow
                  key={plan.$id}
                  plan={plan}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Detail Modal/Drawer */}
      <AdminLessonPlanDetailModal
        plan={selectedLessonPlan}
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
      />
    </div>
  );
};

export default AdminLessonPlansPage;