import React from 'react';
import { AdminLessonPlanView } from '~/store/adminLessonPlanStore';
import { EyeIcon, UserCircleIcon, BookOpenIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Chip, Badge } from '@heroui/react';

interface AdminLessonPlanRowProps {
  plan: AdminLessonPlanView;
  onViewDetails: (plan: AdminLessonPlanView) => void;
}

const statusColors: Record<string, "success" | "warning" | "primary" | "default" | "danger"> = {
    planned: "primary",
    completed: "success",
    "partially-completed": "warning",
};

const AdminLessonPlanRow: React.FC<AdminLessonPlanRowProps> = ({ plan, onViewDetails }) => {
  return (
    <tr 
        onClick={() => onViewDetails(plan)} 
        className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
    >
      <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">{plan.title}</td>
      <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{plan.teacherName}</td>
      <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{plan.subject}</td>
      <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
        {plan.facultyName} / {plan.class} / {plan.sectionName}
      </td>
      <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
        <div className="flex items-center">
          <CalendarDaysIcon className="h-4 w-4 mr-1 text-gray-400"/>
          {plan.lessonDateBS}
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-center">
        {plan.status && (
          <Chip color={statusColors[plan.status] || "default"} size="sm" variant="flat">
            {plan.status.charAt(0).toUpperCase() + plan.status.slice(1).replace('-', ' ')}
          </Chip>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-center">
        {plan.isPublic ? (
            <Badge color="success" variant="dot" size="sm">Public</Badge>
        ) : (
            <Badge color="default" variant="dot" size="sm">Private</Badge>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-gray-500 text-center">
        <button 
          onClick={(e) => { e.stopPropagation(); onViewDetails(plan); }}
          className="text-indigo-600 hover:text-indigo-800 transition-colors"
          title="View Details"
        >
          <EyeIcon className="h-5 w-5"/>
        </button>
      </td>
    </tr>
  );
};

export default AdminLessonPlanRow;