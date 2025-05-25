// src/components/routine/RoutineCard.tsx
import React from 'react';
import { Card, CardHeader, CardBody, CardFooter, Divider, Chip } from '@heroui/react'; // Assuming these are from HeroUI or similar
import ActionButton from '../../../../common/ActionButton'; // Adjust path
import { PencilIcon, TrashIcon } from '@heroicons/react/24/solid';
import { DisplayRoutine, PeriodItemDisplay, BreakItemDisplay } from 'types/routine';

interface RoutineCardProps {
  routine: DisplayRoutine;
  onEdit: (routine: DisplayRoutine) => void;
  onDelete: (routine: DisplayRoutine) => void;
}

const RoutineCard: React.FC<RoutineCardProps> = ({ routine, onEdit, onDelete }) => {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex justify-between items-center p-4 bg-gray-50">
        <div>
            <h4 className="text-lg font-semibold text-gray-800">
                {routine.sectionName}
            </h4>
            <p className="text text-gray-500">
                {routine.facultyName} - Class {routine.class}
            </p>
        </div>
        <div className="flex space-x-2">
          <ActionButton icon={<PencilIcon className="h-5 w-5" />} onClick={() => onEdit(routine)} color="orange" />
          <ActionButton icon={<TrashIcon className="h-5 w-5" />} onClick={() => onDelete(routine)} color="red" />
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {routine.descDisplay && routine.descDisplay.length > 0 ? (
          routine.descDisplay.map((item, index) => (
            <div key={item.id || index} className="p-3 border rounded-md bg-white">
              <div className="flex justify-between items-start">
               

               <div className=' flex gap-4'>
                <p className="font-medium text-indigo-600 capitalize">
                  {index + 1}.
                </p>

                {item.type === 'period' && (
                <div className=" text text-gray-600 space-y-0.5">
                  <p><span className="font-semibold">Subject:</span> {item.subject}</p>
                  <p><span className="font-semibold">Teacher:</span> {item.teacherName}</p>
                </div>
              )}
              {item.type === 'break' && (
                <div className=" text font-semibold text-gray-600">
                  <p> {item.name}</p>
                </div>
              )}
              
</div>

                <Chip size="md" variant="flat" color="default" className="text">
                  {item.fromTime} - {item.toTime}
                </Chip>
              </div>
              
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No periods or breaks defined for this routine.</p>
        )}
      </CardBody>
      {/* Optional Footer
      <Divider />
      <CardFooter className="p-2 text-xs text-gray-400">
        Last updated: {new Date(routine.$updatedAt).toLocaleDateString()}
      </CardFooter> */}
    </Card>
  );
};

export default RoutineCard;