// src/features/student-results/components/StudentExamResultCard.tsx
import React from 'react';
import { Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { ExamWithSummary } from 'types/studentResult.types';
import { DocumentTextIcon, ChartBarIcon, CheckCircleIcon, XCircleIcon, ClockIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface StudentExamResultCardProps {
  exam: ExamWithSummary;
  onSelect: (exam: ExamWithSummary) => void;
}

const StudentExamResultCard: React.FC<StudentExamResultCardProps> = ({ exam, onSelect }) => {
  const summary = exam.summaryForStudent;

  let statusColor: "success" | "danger" | "warning" | "primary" | "default" = "default";
  let statusText = "Status Unknown";
  let statusIcon = <InformationCircleIcon className="h-5 w-5 mr-1.5" />;

  if (summary) {
    statusText = summary.overallResultStatus;
    if (summary.overallResultStatus === 'Passed') {
      statusColor = "success";
      statusIcon = <CheckCircleIcon className="h-5 w-5 mr-1.5" />;
    } else if (summary.overallResultStatus === 'Failed') {
      statusColor = "danger";
      statusIcon = <XCircleIcon className="h-5 w-5 mr-1.5" />;
    } else if (summary.overallResultStatus === 'Awaited') {
      statusColor = "warning";
      statusIcon = <ClockIcon className="h-5 w-5 mr-1.5" />;
    } else { // Promoted or other
      statusColor = "primary"; // Or another appropriate color
    }
  } else { // Should ideally not happen if summary is always populated
    statusText = "Awaited";
    statusColor = "warning";
    statusIcon = <ClockIcon className="h-5 w-5 mr-1.5" />;
  }
  
  return (
    <Card
      isPressable
      onPress={() => onSelect(exam)}
      className="w-full bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-[1.02] border border-gray-200 dark:border-gray-700"
    >
      <CardHeader className="p-5 border-b border-gray-100 justify-between dark:border-gray-700">
        <h4 className="font-bold text-lg text-indigo-700 dark:text-indigo-400 truncate" title={exam.title}>{exam.title}</h4>
        <Chip size="sm" color="secondary" variant="flat" className="mt-1">{exam.type}</Chip>
      </CardHeader>
      <CardBody className="p-5 space-y-3">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          {exam.isGpa ? <ChartBarIcon className="h-5 w-5 mr-2 text-blue-500" /> : <DocumentTextIcon className="h-5 w-5 mr-2 text-green-500" />}
          <span>Format: <span className="font-medium text-gray-800 dark:text-gray-100">{exam.isGpa ? 'GPA System' : 'Marks System'}</span></span>
        </div>
        
        {summary && (
          <>
            {exam.isGpa && summary.finalGpa !== undefined && (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Final GPA: <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{summary.finalGpa.toFixed(2)}</span>
              </div>
            )}
            {!exam.isGpa && summary.totalPercentage !== undefined && (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Percentage: <span className="font-bold text-lg text-green-600 dark:text-green-400">{summary.totalPercentage.toFixed(2)}%</span>
              </div>
            )}
             <Chip color={statusColor} variant="light" size="md" className="mt-2 px-3 py-1">
                <div className="flex items-center">
                    {statusIcon}
                    <span>Result: {statusText}</span>
                </div>
            </Chip>
          </>
        )}
        {!summary && ( // Fallback if summary somehow isn't there
            <Chip color="warning" variant="light" size="md" className="mt-2 px-3 py-1">
                <ClockIcon className="h-5 w-5 mr-1.5" />
                Result: Awaited
            </Chip>
        )}
      </CardBody>
    </Card>
  );
};

export default StudentExamResultCard;