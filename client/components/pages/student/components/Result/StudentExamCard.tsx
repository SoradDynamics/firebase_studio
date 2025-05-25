// src/components/student/StudentExamCard.tsx
import React from 'react';
import { Exam } from 'types/result';
import { Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { CalendarDaysIcon, DocumentTextIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

interface StudentExamCardProps {
  exam: Exam;
  onSelect: (exam: Exam) => void;
}

const StudentExamCard: React.FC<StudentExamCardProps> = ({ exam, onSelect }) => {
  const getStatusChipColor = (status?: Exam['status']): "primary" | "success" | "warning" | "default" => {
    switch (status) {
      case 'ResultsPublished': return 'success';
      case 'Ongoing': return 'primary';
      case 'Upcoming': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Card
      isPressable
      onPress={() => onSelect(exam)}
      className="w-full bg-white shadow-lg rounded-xl overflow-hidden transition-all duration-300 ease-in-out hover:shadow-2xl hover:scale-[1.02] border border-gray-200"
    >
      <CardHeader className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 truncate" title={exam.title}>
            {exam.title}
          </h3>
          {exam.status && (
            <Chip size="sm" color={getStatusChipColor(exam.status)} variant="flat">
              {exam.status === 'ResultsPublished' ? 'Results Out' : exam.status}
            </Chip>
          )}
        </div>
        <p className="text-xs text-indigo-600 font-medium mt-1">{exam.type}</p>
      </CardHeader>
      <CardBody className="p-5 space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-500" />
          <span>Subjects: {exam.subjectDetails.length}</span>
        </div>
        {exam.examStartDate && (
          <div className="flex items-center text-sm text-gray-600">
            <CalendarDaysIcon className="h-5 w-5 mr-2 text-green-500" />
            <span>Date: {new Date(exam.examStartDate).toLocaleDateString()}</span>
          </div>
        )}
        {exam.status === 'ResultsPublished' && (
           <div className="flex items-center text-sm text-green-600 font-medium">
            <CheckBadgeIcon className="h-5 w-5 mr-2" />
            <span>View Your Marksheet</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default StudentExamCard;