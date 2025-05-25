import React from 'react';
import { Card, CardHeader, CardBody, CardFooter, Chip, Button } from '@heroui/react';
import ActionButton from '../../../../common/ActionButton'; // Assuming path
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { LessonPlan, useLessonPlanStore } from '~/store/lessonPlanStore';

interface LessonPlanCardProps {
  plan: LessonPlan;
  onEdit: (plan: LessonPlan) => void;
  onDelete: (planId: string) => void;
  onViewDetails: (plan: LessonPlan) => void;
}

const statusColors: Record<string, "success" | "warning" | "primary" | "default"> = {
    planned: "primary",
    completed: "success",
    "partially-completed": "warning",
};

const LessonPlanCard: React.FC<LessonPlanCardProps> = ({ plan, onEdit, onDelete, onViewDetails }) => {
  const { assignedContexts } = useLessonPlanStore();

  const context = assignedContexts.find(c => 
    c.facultyId === plan.facultyId && 
    c.class === plan.class && 
    c.sectionId === plan.sectionId && 
    c.subject === plan.subject
  );

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex justify-between items-start pb-2">
        <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800">{plan.title}</h3>
            <p className="text-xs text-gray-500">
                {context ? `${context.facultyName} - ${context.class} - ${context.sectionName}` : 'Context N/A'}
            </p>
            <p className="text-xs text-gray-500">Subject: {plan.subject}</p>
        </div>
        <Chip color={statusColors[plan.status] || "default"} size="sm" variant="flat">
            {plan.status.replace('-', ' ')}
        </Chip>
      </CardHeader>
      <CardBody className="py-2">
        <p className="text-sm text-gray-600 line-clamp-2 mb-1">{plan.description}</p>
        <p className="text-xs text-gray-500">Date (BS): {plan.lessonDateBS}</p>
        <p className="text-xs text-gray-500">Est. Periods: {plan.estimatedPeriods}</p>
      </CardBody>
      <CardFooter className="flex justify-end gap-2 pt-2">
        <ActionButton icon={<EyeIcon className="h-4 w-4" />} onClick={() => onViewDetails(plan)} color="blue" />
        <ActionButton icon={<PencilIcon className="h-4 w-4" />} onClick={() => onEdit(plan)} color="orange" />
        <ActionButton icon={<TrashIcon className="h-4 w-4" />} onClick={() => onDelete(plan.$id)} color="red" />
      </CardFooter>
    </Card>
  );
};

export default LessonPlanCard;