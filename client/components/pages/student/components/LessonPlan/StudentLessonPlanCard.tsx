// src/features/student-lesson-view/components/StudentLessonPlanCard.tsx
import React from 'react';
import { Card, CardHeader, CardBody, Chip, Badge } from '@heroui/react';
import { EyeIcon, UserCircleIcon, BookOpenIcon, ChatBubbleLeftEllipsisIcon, StarIcon as SolidStarIcon } from '@heroicons/react/24/solid'; // Using solid Star for rating
import { StarIcon as OutlineStarIcon } from '@heroicons/react/24/outline'; // Not used here, but good for empty state
import { StudentLessonPlan } from '~/store/studentLesson';
import { StarRating } from '../../../../common/StarRating'; // Import your StarRating component

interface StudentLessonPlanCardProps {
  plan: StudentLessonPlan;
  onViewDetails: (plan: StudentLessonPlan) => void;
}

const statusColors: Record<string, "success" | "warning" | "primary" | "default"> = {
    planned: "primary",
    completed: "success",
    "partially-completed": "warning",
};

const StudentLessonPlanCard: React.FC<StudentLessonPlanCardProps> = ({ plan, onViewDetails }) => {
  return (
    <Card 
        className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full"
    >
      <div onClick={() => onViewDetails(plan)} className="cursor-pointer flex-grow p-4"> {/* Added padding to div */}
        <CardHeader className="flex justify-between items-start pb-2 p-0"> {/* Removed CardHeader padding */}
          <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 group-hover:text-indigo-600">{plan.title}</h3>
              <p className="text-xs text-gray-500">
                  {plan.facultyName || 'Faculty N/A'} - Class {plan.class} - Section {plan.sectionName || 'N/A'}
              </p>
          </div>
          {plan.status && (
              <Chip color={statusColors[plan.status] || "default"} size="sm" variant="flat">
                  {plan.status.replace('-', ' ')}
              </Chip>
          )}
        </CardHeader>
        <CardBody className="py-2 space-y-1 p-0"> {/* Removed CardBody padding */}
          <p className="text-sm text-gray-600 line-clamp-2">{plan.description}</p>
          <div className="text-xs text-gray-500 flex items-center">
              <BookOpenIcon className="h-4 w-4 mr-1 text-gray-400"/> Subject: {plan.subject}
          </div>
          <div className="text-xs text-gray-500 flex items-center">
              <UserCircleIcon className="h-4 w-4 mr-1 text-gray-400"/> Teacher: {plan.teacherName || 'N/A'}
          </div>
          <div className="text-xs text-gray-500">Date (BS): {plan.lessonDateBS}</div>
        </CardBody>
      </div>

      {plan.myReviewRating !== undefined && (
        <div className="mt-auto p-3 border-t border-gray-200 bg-amber-50 rounded-b-lg">
          <h4 className="text-xs font-semibold text-amber-700 mb-1 flex items-center">
            <SolidStarIcon className="h-4 w-4 mr-1 text-amber-500" /> Your Feedback from Teacher:
          </h4>
          <div className="mb-1">
            <StarRating 
                rating={plan.myReviewRating} 
                max={5} 
                size={16} 
                color="#f59e0b" // amber-500 for filled stars
                readOnly={true} // <<< SET TO READ-ONLY FOR DISPLAY
            />
          </div>
          {plan.myReviewComment && (
            <p className="text-xs text-gray-600 italic line-clamp-2">"{plan.myReviewComment}"</p>
          )}
           {plan.myReviewDate && (
            <p className="text-xxs text-gray-400 mt-1">
              Reviewed on: {new Date(plan.myReviewDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
      {plan.myReviewRating === undefined && plan.isPublic && (
         <div className="mt-auto p-3 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-400 italic">No specific feedback yet for this lesson.</p>
         </div>
      )}
    </Card>
  );
};

export default StudentLessonPlanCard;