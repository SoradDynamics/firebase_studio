import React from 'react';
import { Button, Chip, Badge } from '@heroui/react';
import { ArrowLeftIcon, EyeIcon, UserCircleIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { StudentLessonPlan } from '~/store/studentLesson'; // Or from your shared types
import { StarRating } from '../../../../common/StarRating'; // Assuming path is correct

interface StudentLessonPlanDetailViewProps {
  plan: StudentLessonPlan;
  onBack: () => void;
}

const statusColors: Record<string, "success" | "warning" | "primary" | "default"> = {
    planned: "primary",
    completed: "success",
    "partially-completed": "warning",
};

const StudentLessonPlanDetailView: React.FC<StudentLessonPlanDetailViewProps> = ({ plan, onBack }) => {

  const DetailItem: React.FC<{ label: string; value?: string | number | string[] | null; children?: React.ReactNode }> = ({ label, value, children }) => {
    if (!children && (value === null || value === undefined || (Array.isArray(value) && value.length === 0))) return null;
    return (
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {children ? (
            <div className="text-gray-700 mt-0.5">{children}</div>
        ) : Array.isArray(value) ? (
          <ul className="list-disc list-inside pl-1 text-gray-700">
            {value.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        ) : (
          <p className="text-gray-700">{String(value)}</p>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <Button variant="light" onClick={onBack} startContent={<ArrowLeftIcon className="h-5 w-5" />}>
          Back to Lesson Plans
        </Button>
        <Badge color="success" variant="flat" size="sm" className="flex items-center">
            <EyeIcon className="h-4 w-4 mr-1" /> Public Lesson Plan
        </Badge>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-1">{plan.title}</h2>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-sm text-gray-600">
        {plan.status && (
            <Chip color={statusColors[plan.status] || "default"} size="md" variant="flat" className="mr-2">
                {plan.status.replace('-', ' ')}
            </Chip>
        )}
        <span>{plan.facultyName || 'Faculty N/A'} - Class {plan.class} - Section {plan.sectionName || 'N/A'}</span>
        <span className="flex items-center"><BookOpenIcon className="h-4 w-4 mr-1 text-gray-500"/>Subject: {plan.subject}</span>
        <span className="flex items-center"><UserCircleIcon className="h-4 w-4 mr-1 text-gray-500"/>Teacher: {plan.teacherName || 'N/A'}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
        <DetailItem label="Lesson Date (B.S.)" value={plan.lessonDateBS} />
        <DetailItem label="Estimated Periods" value={plan.estimatedPeriods} />
         {plan.overallClassRating && plan.overallClassRating > 0 && (
            <DetailItem label="Overall Class Rating">
                <StarRating rating={plan.overallClassRating} max={5} size={20} color="#22c55e" />
            </DetailItem>
         )}
         {plan.actualPeriodsTaken && <DetailItem label="Actual Periods Taken" value={plan.actualPeriodsTaken} />}
        
        <div className="md:col-span-2 mt-2"><DetailItem label="Description" value={plan.description} /></div>
        <DetailItem label="Learning Objectives" value={plan.learningObjectives} />
        <DetailItem label="Teaching Materials" value={plan.teachingMaterials} />
        <DetailItem label="Assessment Methods" value={plan.assessmentMethods} />
        {plan.teacherReflection && (
            <div className="md:col-span-2"><DetailItem label="Teacher's Reflection" value={plan.teacherReflection} /></div>
        )}
      </div>

      {/* Student reviews could be displayed here if they are also made public, but that's a separate feature */}
      {/* For now, this view focuses on the lesson plan content itself. */}
    </div>
  );
};

export default StudentLessonPlanDetailView;