import React from 'react';
import { Exam } from '../../types/appwrite.types';
import { Card, CardBody, CardHeader, Chip } from '@heroui/react'; // Assuming HeroUI imports
import { UsersIcon, BookOpenIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

interface ExamCardProps {
  exam: Exam;
  entryPercentage: number | null | undefined;
  onSelect: (exam: Exam) => void;
  isSelected: boolean;
  facultyNames: string[];
}

const ExamCard: React.FC<ExamCardProps> = ({ exam, entryPercentage, onSelect, isSelected, facultyNames }) => {
  const currentPercentage: number | null = entryPercentage === undefined ? null : entryPercentage;

  const getPercentageColor = (percentage: number | null): "primary" | "success" | "warning" | "default" | "danger" => {
    if (percentage === null) return "warning";
    if (percentage === -2) return "danger";
    if (percentage === -1) return "default";
    if (percentage >= 95) return "success";
    if (percentage >= 50) return "primary";
    return "default";
  };

  const getPercentageText = (percentage: number | null): string => {
    if (percentage === null) return "Calculating...";
    if (percentage === -1) return "N/A";
    if (percentage === -2) return "Error";
    return `${percentage.toFixed(0)}% Entered`;
  };

  const percentageValueForBar = currentPercentage !== null && currentPercentage >= 0 ? currentPercentage : 0;
  const percentageColor = getPercentageColor(currentPercentage);
  const percentageText = getPercentageText(currentPercentage);

  return (
    <Card
      isPressable
      onPress={() => onSelect(exam)}
      className={`w-full bg-white shadow-lg rounded-xl overflow-hidden transition-all duration-300 ease-in-out hover:shadow-2xl hover:scale-[1.02] ${
        isSelected ? 'ring-4 ring-indigo-500 ring-offset-2' : 'border border-gray-200'
      }`}
    >
      <CardHeader className="p-5 border-b border-gray-100 bg-gray-50">
        <div className="flex justify-between items-start w-full">
          <h4 className="font-bold text-lg text-gray-900 truncate mr-2" title={exam.title}>{exam.title}</h4>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
            {exam.isPublished && (
              <Chip size="sm" color={exam.isGpa ? "success" : "primary"} variant="flat">
                {exam.isGpa ? "Published (GPA)" : "Published (Marks)"}
              </Chip>
            )}
            <Chip size="sm" color="secondary" variant="flat">{exam.type}</Chip>
          </div>
        </div>
        {exam.desc && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{exam.desc}</p>}
      </CardHeader>
      <CardBody className="p-5 space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <AcademicCapIcon className="h-5 w-5 mr-2 text-indigo-500" />
          <span>Classes: <span className="font-medium text-gray-800">{exam.class.join(', ')}</span></span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <UsersIcon className="h-5 w-5 mr-2 text-teal-500" />
          <span>Faculties: <span className="font-medium text-gray-800">{facultyNames.length > 0 ? facultyNames.join(', ') : 'All'}</span></span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <BookOpenIcon className="h-5 w-5 mr-2 text-orange-500" />
          <span>Subjects: <span className="font-medium text-gray-800">{exam.subjectDetails.length}</span></span>
        </div>

        <div className="pt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-500">Entry Progress</span>
            <Chip size="sm" color={percentageColor} variant="bordered">
              {percentageText}
            </Chip>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            {currentPercentage === null ? (
              <div
                className="bg-yellow-400 h-2.5 rounded-full animate-pulse"
                style={{ width: '100%' }}
              ></div>
            ) : currentPercentage >= 0 ? (
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  percentageColor === 'success' ? 'bg-green-600' :
                  percentageColor === 'primary' ? 'bg-blue-600' :
                  'bg-gray-400'
                }`}
                style={{ width: `${percentageValueForBar}%` }}
              ></div>
            ) : (
              <div
                className={`h-2.5 rounded-full ${
                  currentPercentage === -2 ? 'bg-red-500' : 'bg-gray-300'
                }`}
                 style={{ width: '100%' }}
              ></div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default ExamCard;