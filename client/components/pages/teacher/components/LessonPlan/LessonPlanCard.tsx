import React from 'react';
import { Card, CardHeader, CardBody, CardFooter, Divider, Button as NextUIButton } from '@heroui/react'; // Assuming heroUI is NextUI v2 like
import { EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { LessonPlan } from 'types/lesson_plan';
import { useLessonPlanStore } from '~/store/lessonPlanStore';
import ActionButton from '../../../../common/ActionButton'; // Adjust path

interface LessonPlanCardProps {
  lessonPlan: LessonPlan;
}

const LessonPlanCard: React.FC<LessonPlanCardProps> = ({ lessonPlan }) => {
  const { openDrawer, openDeleteModal } = useLessonPlanStore(state => ({
    openDrawer: state.openDrawer,
    openDeleteModal: state.openDeleteModal,
  }));

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex gap-3 px-4 py-3">
        <div className="flex flex-col">
          <p className="text-md font-semibold">{lessonPlan.title}</p>
          <p className="text-sm text-gray-500">
            {lessonPlan.subject} - {lessonPlan.className} (Sec: {lessonPlan.sectionId.slice(-4)}) {/* Assuming section name isn't readily available here, show part of ID or fetch name */}
          </p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="px-4 py-3">
        <p className="text-sm text-gray-600 mb-1">
            <strong>Date (BS):</strong> {lessonPlan.lessonDateBS}
        </p>
        <p className="text-sm text-gray-600 mb-1">
            <strong>Status:</strong> <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${lessonPlan.status === 'Completed' ? 'bg-green-100 text-green-700' : lessonPlan.status === 'Planned' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{lessonPlan.status}</span>
        </p>
        <p className="text-sm text-gray-600 truncate">
            <strong>Desc:</strong> {lessonPlan.description}
        </p>
      </CardBody>
      <Divider />
      <CardFooter className="px-4 py-3 flex justify-end gap-2">
        <ActionButton
          icon={<EyeIcon className="h-5 w-5" />}
          onClick={() => openDrawer('view', lessonPlan)}
          color="blue"
          isIconOnly
        />
        <ActionButton
          icon={<PencilIcon className="h-5 w-5" />}
          onClick={() => openDrawer('edit', lessonPlan)}
          color="orange"
          isIconOnly
        />
        <ActionButton
          icon={<TrashIcon className="h-5 w-5" />}
          onClick={() => lessonPlan.$id && openDeleteModal(lessonPlan.$id)}
          color="red"
          isIconOnly
        />
      </CardFooter>
    </Card>
  );
};

export default LessonPlanCard;