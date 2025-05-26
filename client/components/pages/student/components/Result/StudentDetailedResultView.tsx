// src/features/student-results/components/StudentDetailedResultView.tsx
import React, { useMemo } from 'react';
import { ProcessedSubjectResult, ExamResultSummary, Exam } from 'types/studentResult.types'; // GpaInfo is part of types
import { Chip, Card, CardBody, CardHeader, Spinner } from '@heroui/react';
import { CheckCircleIcon, XCircleIcon, MinusCircleIcon, InformationCircleIcon, AcademicCapIcon } from '@heroicons/react/24/solid';
import ResponsiveTable, { ColumnDefinition } from '../../../../common/ResponsiveTable';

interface StudentDetailedResultViewProps {
  exam: Exam;
  processedResults: ProcessedSubjectResult[];
  summary: ExamResultSummary | null;
  studentName: string;
  isLoading: boolean;
}

const getStatusChip = (status?: ProcessedSubjectResult['subjectGpaStatus'] | ProcessedSubjectResult['subjectMarksStatus'], isAbsentOverride = false) => {
  const commonClasses = "font-medium px-2 py-0.5 text-xs"; // Adjusted size
  if (isAbsentOverride || status === 'Absent') return <Chip size="sm" color="warning" variant="flat" startContent={<MinusCircleIcon className="h-3.5 w-3.5" />} className={commonClasses}>Absent</Chip>;
  if (!status || status === 'N/A') return <Chip size="sm" color="default" variant="flat" className={commonClasses}>-</Chip>;
  if (status === 'Passed') return <Chip size="sm" color="success" variant="flat" startContent={<CheckCircleIcon className="h-3.5 w-3.5" />} className={commonClasses}>Passed</Chip>;
  if (status === 'Failed' || status === 'NG') return <Chip size="sm" color="danger" variant="flat" startContent={<XCircleIcon className="h-3.5 w-3.5" />} className={commonClasses}>{status}</Chip>; // Show NG or Failed
  return <Chip size="sm" color="default" variant="flat" className={commonClasses}>{status}</Chip>;
};

const MarksInfoCell: React.FC<{ fm: number | null; pm: number | null; label?: string }> = ({ fm, pm, label }) => (
  <div className="text-center text-xs text-gray-600 dark:text-gray-400 leading-tight">
    {label && <div className="font-medium text-gray-500 dark:text-gray-300">{label}</div>}
    <div>FM: {fm ?? '-'}</div>
    <div>PM: {pm ?? '-'}</div>
  </div>
);

const ObtainedCell: React.FC<{ value: number | null | undefined; grade?: ProcessedSubjectResult['theoryGpa']; isGpa: boolean; isAbsent?: boolean }> = ({ value, grade, isGpa, isAbsent }) => {
  if (isAbsent) {
    return <span className="font-semibold text-sm text-yellow-600 dark:text-yellow-400">ABS</span>;
  }
  if (isGpa) {
    return <span className={`font-semibold text-sm ${grade?.grade === "NG" || grade?.grade === "ABS" ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-gray-100"}`}>{grade?.grade ?? '-'}</span>;
  }
  return <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{value ?? '-'}</span>;
};


const StudentDetailedResultView: React.FC<StudentDetailedResultViewProps> = ({ exam, processedResults, summary, studentName, isLoading }) => {
  const isGpa = exam.isGpa;
  const hasAnyPractical = useMemo(() => processedResults.some(r => r.hasPractical), [processedResults]);

  const tableColumns = useMemo((): ColumnDefinition<ProcessedSubjectResult>[] => {
    const cols: ColumnDefinition<ProcessedSubjectResult>[] = [
      { 
        key: 'subjectName',
        header: 'Subject',
        cell: (row) => <span className="font-medium text-gray-800 dark:text-gray-100">{row.subjectName}</span>,
        headerClassName: 'text-left sticky left-0 bg-gray-100 dark:bg-gray-800 z-10 pl-4 pr-2 py-3.5 w-2/6 md:w-3/12',
        cellClassName: 'text-left sticky left-0 bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-850 z-10 pl-4 pr-2 py-3 align-middle',
      },
      { 
        key: 'theoryInfo',
        header: 'Theory (FM/PM)',
        cell: (row) => <MarksInfoCell fm={row.theoryFM} pm={row.theoryPM} />,
        headerClassName: 'text-center py-3.5',
        cellClassName: 'text-center py-3 align-middle',
      },
      { 
        key: 'theoryObtained',
        header: isGpa ? 'TH Grade' : 'TH Marks',
        cell: (row) => <ObtainedCell value={row.theoryMarksObtained} grade={row.theoryGpa} isGpa={isGpa} isAbsent={row.isAbsent} />,
        headerClassName: 'text-center py-3.5',
        cellClassName: 'text-center py-3 align-middle',
      },
    ];

    if (hasAnyPractical) {
      cols.push({ 
        key: 'practicalInfo',
        header: 'Practical (FM/PM)',
        cell: (row) => row.hasPractical ? <MarksInfoCell fm={row.practicalFM} pm={row.practicalPM} /> : <span className="text-gray-400 dark:text-gray-500">-</span>,
        headerClassName: 'text-center py-3.5',
        cellClassName: 'text-center py-3 align-middle',
      });
      cols.push({ 
        key: 'practicalObtained',
        header: isGpa ? 'PR Grade' : 'PR Marks',
        cell: (row) => row.hasPractical ? <ObtainedCell value={row.practicalMarksObtained} grade={row.practicalGpa} isGpa={isGpa} isAbsent={row.isAbsent} /> : <span className="text-gray-400 dark:text-gray-500">-</span>,
        headerClassName: 'text-center py-3.5',
        cellClassName: 'text-center py-3 align-middle',
      });
    }

    if (isGpa) {
      cols.push({
        key: 'subjectOverallGradeDisplay',
        header: 'Subject Grade',
        cell: (row) => {
          if (row.isAbsent) {
            return <ObtainedCell isGpa={true} isAbsent={true} />; 
          }
          return (
            <span className={`font-semibold text-sm ${row.subjectOverallLetterGrade === "NG" || row.subjectOverallLetterGrade === "ABS" ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-gray-100"}`}>
              {row.subjectOverallLetterGrade ?? '-'}
            </span>
          );
        },
        headerClassName: 'text-center py-3.5',
        cellClassName: 'text-center py-3 align-middle',
      });
    } else { 
      cols.push({
        key: 'totalMarks',
        header: 'Total Marks',
        cell: (row) => (
          <div className="text-center">
            {row.isAbsent ? (
              <ObtainedCell isGpa={false} isAbsent={true} />
            ) : (
              <>
                <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{row.subjectTotalMarksObtained ?? '-'}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400"> / {row.subjectFullMarks}</span>
              </>
            )}
          </div>
        ),
        headerClassName: 'text-center py-3.5',
        cellClassName: 'text-center py-3 align-middle',
      });
    }

    cols.push({
      key: 'result',
      header: 'Result',
      cell: (row) => getStatusChip(isGpa ? row.subjectGpaStatus : row.subjectMarksStatus, row.isAbsent),
      headerClassName: 'text-center py-3.5',
      cellClassName: 'text-center py-3 align-middle',
    });

    return cols;
  }, [isGpa, hasAnyPractical]);
  
  if (isLoading) { 
    return (
      <div className="flex justify-center items-center h-64 py-10">
        <Spinner color="primary" size="lg" label="Loading Detailed Results..." />
      </div>
    );
  }

  if (!summary || (processedResults.length === 0 && !isLoading)) {
    return (
      <Card className="shadow-lg dark:bg-gray-800">
        <CardBody className="p-10 text-center">
          <InformationCircleIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-2">No Result Details</p>
          <p className="text-gray-500 dark:text-gray-400">
            Detailed marks for this examination are not yet available or not applicable.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-xl dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex-grow">
                    <h2 className="text-xl sm:text-2xl font-semibold text-indigo-700 dark:text-indigo-400">{exam.title}</h2>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-3">
                        <span>Student: <strong>{studentName}</strong></span>
                        <span>Exam Type: <strong>{exam.type}</strong></span>
                    </div>
                </div>
                <Chip 
                    color={summary.overallResultStatus === 'Passed' ? 'success' : summary.overallResultStatus === 'Failed' ? 'danger' : 'warning'}
                    variant="flat"
                    size="lg"
                    className="font-semibold px-3 py-1.5"
                    startContent={
                        summary.overallResultStatus === 'Passed' ? <CheckCircleIcon className="h-5 w-5"/> : 
                        summary.overallResultStatus === 'Failed' ? <XCircleIcon className="h-5 w-5"/> :
                        <MinusCircleIcon className="h-5 w-5"/>
                    }
                >
                    Overall: {summary.overallResultStatus}
                </Chip>
            </div>
        </CardHeader>
        <CardBody className="p-0">
          <ResponsiveTable
            columns={tableColumns}
            data={processedResults}
            isLoading={isLoading}
            ariaLabel={`Detailed results for ${exam.title}`}
            tableClassName="min-w-full" 
            headerRowClassName="bg-gray-100 dark:bg-gray-800" // Removed border here, handled by TH
            bodyRowClassName={(row, rowIndex) => `group ${rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-850'}`}
          />
        </CardBody>
      </Card>
      
      <Card className="shadow-xl dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-750 p-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center">
              <AcademicCapIcon className="h-6 w-6 mr-2 text-indigo-600 dark:text-indigo-400"/>
              Exam Summary
            </h3>
        </CardHeader>
        <CardBody className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
                { 
                    label: isGpa ? 'Final GPA' : 'Grand Total', 
                    value: isGpa ? (summary.finalGpa?.toFixed(2) ?? 'N/A') : `${summary.grandTotalMarks ?? 'N/A'} / ${summary.totalFullMarks ?? 'N/A'}`,
                    color: isGpa ? 'blue' : 'green'
                },
                ...(!isGpa ? [{ 
                    label: 'Overall Percentage', 
                    value: `${summary.totalPercentage?.toFixed(2) ?? 'N/A'}%`,
                    color: 'teal' 
                }] : []),
                { 
                    label: 'Final Result', 
                    value: summary.overallResultStatus,
                    color: summary.overallResultStatus === 'Passed' ? 'green' : summary.overallResultStatus === 'Failed' ? 'red' : 'yellow'
                }
            ].map(item => (
                <div key={item.label} className={`p-4 rounded-lg shadow-md bg-${item.color}-50 dark:bg-${item.color}-900/30 border border-${item.color}-200 dark:border-${item.color}-700`}>
                    <p className={`text-sm font-medium text-${item.color}-700 dark:text-${item.color}-300`}>{item.label}</p>
                    <p className={`text-2xl font-bold mt-1 text-${item.color}-600 dark:text-${item.color}-400`}>{item.value}</p>
                </div>
            ))}
        </CardBody>
      </Card>
    </div>
  );
};

export default StudentDetailedResultView;