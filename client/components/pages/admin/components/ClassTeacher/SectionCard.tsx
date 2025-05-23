// src/components/admin/assign-class-teacher/SectionCard.tsx
import React from 'react';
import { EnrichedSection } from 'types';
import ActionButton from '../../../../common/ActionButton'; // Assuming path is correct
import { PencilSquareIcon, UserCircleIcon, AcademicCapIcon, BookOpenIcon, TagIcon } from '@heroicons/react/24/outline';

interface SectionCardProps {
  section: EnrichedSection;
  onChangeTeacher: (section: EnrichedSection) => void;
}

const SectionCard: React.FC<SectionCardProps> = ({ section, onChangeTeacher }) => {
  const hasClassTeacher = !!section.class_teacher;

  return (
    <div className={`bg-white shadow-lg rounded-lg p-6 border-l-4 ${hasClassTeacher ? 'border-green-500' : 'border-gray-300'} transition-shadow hover:shadow-xl`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-semibold text-gray-800">{section.name}</h3>
        {hasClassTeacher && (
          <span className="w-4 h-4 bg-green-500 rounded-full inline-block" title="Class Teacher Assigned"></span>
        )}
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <p className="flex items-center">
          <AcademicCapIcon className="w-5 h-5 mr-2 text-indigo-500" />
          <strong>Class:</strong> {section.class}
        </p>
        <p className="flex items-center">
          <TagIcon className="w-5 h-5 mr-2 text-purple-500" />
          <strong>Faculty:</strong> {section.facultyName || 'N/A'}
        </p>
        <p className="flex items-center">
          <UserCircleIcon className="w-5 h-5 mr-2 text-blue-500" />
          <strong>Class Teacher:</strong> {section.classTeacherName || <span className="text-gray-400 italic">Not Assigned</span>}
        </p>
        <p className="flex items-start">
          <BookOpenIcon className="w-5 h-5 mr-2 text-yellow-500 mt-0.5" />
          <div>
            <strong>Subjects:</strong>
            {section.subjects && section.subjects.length > 0 ? (
              <span className="ml-1">{section.subjects.join(', ')}</span>
            ) : (
              <span className="ml-1 text-gray-400 italic">No subjects listed</span>
            )}
          </div>
        </p>
        {/* No. of students omitted as discussed */}
      </div>

      <div className="mt-6 flex justify-end">
        <ActionButton
          icon={<PencilSquareIcon className="w-5 h-5" />}
          onClick={() => onChangeTeacher(section)}
          buttonText="Change Teacher"
          isIconOnly={false} // Show text
          color="blue"
        />
      </div>
    </div>
  );
};

export default SectionCard;