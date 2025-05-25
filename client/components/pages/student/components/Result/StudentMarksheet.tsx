// src/components/student/StudentMarksheet.tsx
import React from 'react';
import { Exam, MarkEntryDocument, StudentDocument, SubjectDetail } from 'types/result';
import { Card, CardBody, CardHeader, Chip, Divider } from '@heroui/react';
import { UserCircleIcon, AcademicCapIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

interface StudentMarksheetProps {
  exam: Exam;
  student: StudentDocument;
  marks: MarkEntryDocument[]; // Marks for this student and this exam
}

const StudentMarksheet: React.FC<StudentMarksheetProps> = ({ exam, student, marks }) => {
  const getSubjectMarkEntry = (subjectName: string): MarkEntryDocument | undefined => {
    return marks.find(mark => mark.subjectName === subjectName);
  };

  const calculateSubjectTotal = (subject: SubjectDetail, markEntry?: MarkEntryDocument): { obtained: number | null, full: number } => {
    const theoryFM = Number(subject.theoryFM);
    const practicalFM = subject.hasPractical ? Number(subject.practicalFM) : 0;
    const full = theoryFM + practicalFM;

    if (markEntry?.isAbsent) return { obtained: null, full };

    const theoryObt = markEntry?.theoryMarksObtained ?? 0;
    const practicalObt = subject.hasPractical ? (markEntry?.practicalMarksObtained ?? 0) : 0;
    return { obtained: theoryObt + practicalObt, full };
  };

  const getStatus = (subject: SubjectDetail, markEntry?: MarkEntryDocument): string => {
    if (markEntry?.isAbsent) return 'Absent';
    if (!markEntry) return 'N/A';

    const theoryPM = Number(subject.theoryPM);
    const practicalPM = subject.hasPractical ? Number(subject.practicalPM) : 0;

    let pass = true;
    if ((markEntry.theoryMarksObtained ?? -1) < theoryPM) pass = false;
    if (subject.hasPractical && (markEntry.practicalMarksObtained ?? -1) < practicalPM) pass = false;

    return pass ? 'Pass' : 'Fail';
  };

  const overall = exam.subjectDetails.reduce(
    (acc, subject) => {
      const markEntry = getSubjectMarkEntry(subject.name);
      const subjectTotals = calculateSubjectTotal(subject, markEntry);
      if (subjectTotals.obtained !== null && !markEntry?.isAbsent) {
        acc.totalObtained += subjectTotals.obtained;
      }
      acc.totalFullMarks += subjectTotals.full;
      if (markEntry?.isAbsent) acc.absentSubjects++;
      return acc;
    },
    { totalObtained: 0, totalFullMarks: 0, absentSubjects: 0 }
  );

  const overallPercentage = overall.totalFullMarks > 0
    ? (overall.totalObtained / overall.totalFullMarks) * 100
    : 0;

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden my-8">
      <CardHeader className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex items-center space-x-3">
          <AcademicCapIcon className="h-10 w-10" />
          <div>
            <h2 className="text-2xl font-bold">{exam.title} - Marksheet</h2>
            <p className="text-sm opacity-90">{exam.type}</p>
          </div>
        </div>
      </CardHeader>
      <CardBody className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 p-4 bg-indigo-50 rounded-lg">
            <UserCircleIcon className="h-8 w-8 text-indigo-500" />
            <div>
              <p className="text-sm text-gray-500">Student Name</p>
              <p className="font-semibold text-gray-800">{student.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
            <ClipboardDocumentListIcon className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-gray-500">Class & Section</p>
              <p className="font-semibold text-gray-800">{student.class} - {student.section}</p> {/* Assuming these are displayable names/IDs */}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Theory (Obt/Full)</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Practical (Obt/Full)</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total (Obt/Full)</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exam.subjectDetails.map((subject) => {
                const markEntry = getSubjectMarkEntry(subject.name);
                const subjectTotal = calculateSubjectTotal(subject, markEntry);
                const status = getStatus(subject, markEntry);
                return (
                  <tr key={subject.name} className={markEntry?.isAbsent ? 'bg-red-50' : (status === 'Fail' ? 'bg-orange-50' : '')}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subject.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                      {markEntry?.isAbsent ? 'AB' : `${markEntry?.theoryMarksObtained ?? '-'}/${subject.theoryFM}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                      {subject.hasPractical
                        ? (markEntry?.isAbsent ? 'AB' : `${markEntry?.practicalMarksObtained ?? '-'}/${subject.practicalFM}`)
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center font-semibold">
                      {markEntry?.isAbsent ? 'AB' : `${subjectTotal.obtained ?? '-'}/${subjectTotal.full}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <Chip
                        size="sm"
                        color={markEntry?.isAbsent ? 'danger' : (status === 'Pass' ? 'success' : (status === 'Fail' ? 'warning' : 'default'))}
                        variant="flat"
                      >
                        {status}
                      </Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Divider className="my-8" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div>
                <p className="text-sm text-gray-500">Total Marks Obtained</p>
                <p className="text-2xl font-bold text-indigo-600">{overall.totalObtained}</p>
            </div>
            <div>
                <p className="text-sm text-gray-500">Total Full Marks</p>
                <p className="text-2xl font-bold text-gray-700">{overall.totalFullMarks}</p>
            </div>
            <div>
                <p className="text-sm text-gray-500">Overall Percentage</p>
                <p className="text-2xl font-bold text-green-600">
                    {overall.absentSubjects === exam.subjectDetails.length ? 'AB' : `${overallPercentage.toFixed(2)}%`}
                </p>
            </div>
        </div>
        {overall.absentSubjects > 0 && (
            <p className="text-center text-sm text-red-600 mt-4">
                Absent in {overall.absentSubjects} subject(s).
            </p>
        )}
      </CardBody>
    </Card>
  );
};

export default StudentMarksheet;