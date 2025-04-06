//StudentContent.tsx
import React from 'react';
import { useStudentData } from "../StudentContext";
interface Student {
  id: string;
  name: string;
  class: string;
  facultyId: string;
  section: string;
  stdEmail: string;
  parentId: string;
}
const StudentsContent: React.FC = () => {
  const { selectedStudent } = useStudentData();

  return (
    <div>
      {selectedStudent ? (
        <div>
          <h2>Student Details:</h2>
          <p>Name: {selectedStudent.name}</p>
          <p>Class: {selectedStudent.class}</p>
          <p>Email: {selectedStudent.stdEmail}</p>

          {/* Display other student details */}
        </div>
      ) : (
        <p>No student selected.</p>
      )}
    </div>
  );
};

export default StudentsContent;