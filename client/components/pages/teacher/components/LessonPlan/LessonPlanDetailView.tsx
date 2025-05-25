import React from 'react';
import { useLessonPlanStore } from '~/store/lessonPlanStore';
import { Button } from '@heroui/react';
import { PencilIcon } from '@heroicons/react/24/solid';

const DetailItem: React.FC<{ label: string; value?: string | number | string[] | null }> = ({ label, value }) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="mb-3">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      {Array.isArray(value) ? (
        <ul className="list-disc list-inside text-gray-700">
          {value.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      ) : (
        <p className="text-gray-700">{value}</p>
      )}
    </div>
  );
};

const LessonPlanDetailView: React.FC = () => {
  const { selectedLessonPlan, openDrawer, rawAssignments } = useLessonPlanStore(state => ({
    selectedLessonPlan: state.selectedLessonPlan,
    openDrawer: state.openDrawer,
    rawAssignments: state.rawAssignments,
  }));

  if (!selectedLessonPlan) return <p>No lesson plan selected.</p>;

  const faculty = rawAssignments.find(a => a.facultyId === selectedLessonPlan.facultyId);
  const section = rawAssignments.find(a => a.sectionId === selectedLessonPlan.sectionId);

  return (
    <div className="p-1 space-y-4">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-xl font-semibold text-gray-800">{selectedLessonPlan.title}</h2>
                <p className="text-sm text-gray-500">
                    {faculty?.facultyName || selectedLessonPlan.facultyId} - {selectedLessonPlan.className} - {section?.sectionName || selectedLessonPlan.sectionId} - {selectedLessonPlan.subject}
                </p>
            </div>
            <Button 
                variant="light" 
                color="primary"
                auto 
                onClick={() => openDrawer('edit', selectedLessonPlan)}
                icon={<PencilIcon className="h-5 w-5"/>}
            >
                Edit
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 border-t pt-4">
            <DetailItem label="Status" value={selectedLessonPlan.status} />
            <DetailItem label="Lesson Date (BS)" value={selectedLessonPlan.lessonDateBS} />
            <DetailItem label="Lesson Date (AD)" value={selectedLessonPlan.lessonDateAD ? new Date(selectedLessonPlan.lessonDateAD).toLocaleDateString() : 'N/A'} />
            <DetailItem label="Estimated Periods" value={selectedLessonPlan.estimatedPeriods} />
        </div>

        <DetailItem label="Description" value={selectedLessonPlan.description} />
        <DetailItem label="Learning Objectives" value={selectedLessonPlan.learningObjectives} />
        <DetailItem label="Topics Covered" value={selectedLessonPlan.topicsCovered} />
        <DetailItem label="Teaching Activities" value={selectedLessonPlan.teachingActivities} />
        <DetailItem label="Resources Needed" value={selectedLessonPlan.resourcesNeeded} />
        <DetailItem label="Assessment Methods" value={selectedLessonPlan.assessmentMethods} />
        <DetailItem label="Homework Assignment" value={selectedLessonPlan.homeworkAssignment} />

        {(selectedLessonPlan.status === 'Completed' || selectedLessonPlan.status === 'Partially Completed') && (
            <div className="border-t pt-4 mt-4">
                <h3 className="text-md font-semibold text-gray-700 mb-2">Completion Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    <DetailItem label="Actual Periods Taken" value={selectedLessonPlan.actualPeriodsTaken} />
                    <DetailItem label="Completion Date (AD)" value={selectedLessonPlan.completionDateAD ? new Date(selectedLessonPlan.completionDateAD).toLocaleDateString() : 'N/A'} />
                </div>
            </div>
        )}
        
        <DetailItem label="Teacher's Reflection" value={selectedLessonPlan.teacherReflection} />
        
        {/* Placeholder for Student Review Feature */}
        {/* 
        <div className="border-t pt-4 mt-4">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Student Reviews</h3>
            <p className="text-sm text-gray-500">Feature to review students for this lesson will be here.</p>
        </div> 
        */}
    </div>
  );
};

export default LessonPlanDetailView;