// src/components/marks-entry/MarksEntryTable.tsx
import React from 'react';
import { StudentForMarksTable, SubjectDetail } from '../../types/appwrite.types';
import { Input, Checkbox, Button } from '@heroui/react'; // Assuming HeroUI components

interface MarksEntryTableProps {
  students: StudentForMarksTable[];
  subjectDetails: SubjectDetail | undefined;
  onMarksChange: (studentId: string, field: 'theory' | 'practical', value: string) => void;
  onAbsenceChange: (studentId: string, isAbsent: boolean) => void;
  onSaveChanges: () => void;
  onCancelChanges: () => void;
  isSaving: boolean;
  hasChanges: boolean;
}

const MarksEntryTable: React.FC<MarksEntryTableProps> = ({
  students,
  subjectDetails,
  onMarksChange,
  onAbsenceChange,
  onSaveChanges,
  onCancelChanges,
  isSaving,
  hasChanges,
}) => {
  if (!subjectDetails) {
    return <p className="text-center text-gray-500 py-4">Please select a subject to enter marks.</p>;
  }
  if (students.length === 0) {
    return <p className="text-center text-gray-500 py-4">No students found for the selected filters.</p>;
  }

  const thFM = Number(subjectDetails.theoryFM);
  const prFM = subjectDetails.hasPractical ? Number(subjectDetails.practicalFM) : null;

  return (
    <div className="mt-6">
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Theory Marks (FM: {thFM})
              </th>
              {subjectDetails.hasPractical && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Practical Marks (FM: {prFM})
                </th>
              )}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.$id} className={student.isModified ? 'bg-yellow-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Input
                    type="number"
                    placeholder={`0 - ${thFM}`}
                    value={student.theoryMarksInput}
                    onValueChange={(val) => onMarksChange(student.$id, 'theory', val)}
                    disabled={student.isAbsentInput || isSaving}
                    className="max-w-[120px]"
                    min="0"
                    max={thFM.toString()}
                  />
                </td>
                {subjectDetails.hasPractical && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Input
                      type="number"
                      placeholder={`0 - ${prFM}`}
                      value={student.practicalMarksInput}
                      onValueChange={(val) => onMarksChange(student.$id, 'practical', val)}
                      disabled={student.isAbsentInput || isSaving}
                      className="max-w-[120px]"
                      min="0"
                      max={prFM?.toString()}
                    />
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                    <input
                    type="checkbox"
                    checked={student.isAbsentInput}
                    onChange={(e) => onAbsenceChange(student.$id, e.target.checked)}
                    disabled={isSaving}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm text-gray-600">Mark Absent</label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex justify-end space-x-3">
        <Button variant="flat" color="default" onPress={onCancelChanges} isDisabled={isSaving || !hasChanges}>
          Cancel
        </Button>
        <Button color="primary" onPress={onSaveChanges} isLoading={isSaving} isDisabled={isSaving || !hasChanges}>
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default MarksEntryTable;