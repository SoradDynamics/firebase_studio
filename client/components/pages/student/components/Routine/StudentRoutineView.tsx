// src/components/student/StudentRoutineView.tsx
import React from 'react';
import { Card, CardHeader, CardBody, Chip } from '@heroui/react';
import { DisplayRoutine } from '~/types/routine';
import { CalendarDaysIcon, ClockIcon, UserGroupIcon, BookOpenIcon } from '@heroicons/react/24/outline';

interface StudentRoutineViewProps {
  routine: DisplayRoutine | null;
  studentName?: string | null; // Optional: To personalize the header
}

const StudentRoutineView: React.FC<StudentRoutineViewProps> = ({ routine, studentName }) => {
  if (!routine) {
    return (
      <Card className="shadow-lg w-full max-w-2xl mx-auto my-8">
        <CardHeader className="font-semibold text-gray-700 p-4">
          {studentName ? `${studentName}'s Routine` : "Class Routine"}
        </CardHeader>
        <CardBody className="p-6 text-center">
          <CalendarDaysIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Your class routine is not available at the moment.</p>
          <p className="text-xs text-gray-400 mt-2">Please check back later or contact administration.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl w-full max-w-2xl mx-auto my-8">
      <CardHeader className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center gap-3">
            <CalendarDaysIcon className="w-7 h-7" />
            <div>
                <h3 className="text-xl font-bold">
                    Class Routine
                </h3>
                <p className="text-xs opacity-90">
                    {routine.sectionName && routine.class ? `${routine.sectionName} - ${routine.class}` : 'Your Section'}
                    {routine.facultyName ? ` (${routine.facultyName})` : ''}
                </p>
            </div>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {routine.descDisplay && routine.descDisplay.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {routine.descDisplay.map((item, index) => (
              <li key={item.id || index} className="p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex justify-between items-start mb-1.5">
                  <p className="font-medium text-md text-indigo-700 capitalize">
                    {index + 1}. {item.type === 'period' ? item.subject : item.name}
                  </p>
                  <Chip size="sm" variant="flat" color="default" className="text-xs px-2 py-0.5">
                    <ClockIcon className="w-3 h-3 inline mr-1" /> {item.fromTime} - {item.toTime}
                  </Chip>
                </div>
                {item.type === 'period' && (
                  <div className="text-xs text-gray-600 space-y-0.5 pl-1">
                    <p className="flex items-center gap-1.5">
                        <BookOpenIcon className="w-3.5 h-3.5 text-gray-400"/> 
                        <span className="font-semibold">Type:</span> Period
                    </p>
                    <p className="flex items-center gap-1.5">
                        <UserGroupIcon className="w-3.5 h-3.5 text-gray-400"/> 
                        <span className="font-semibold">Teacher:</span> {item.teacherName || 'N/A'}
                    </p>
                  </div>
                )}
                {item.type === 'break' && (
                  <div className="text-xs text-gray-600 pl-1">
                     <p className="flex items-center gap-1.5">
                        <BookOpenIcon className="w-3.5 h-3.5 text-gray-400"/> 
                        <span className="font-semibold">Type:</span> Break - {item.name}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center">
            <CalendarDaysIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500">No periods or breaks defined in the routine for your section.</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default StudentRoutineView;