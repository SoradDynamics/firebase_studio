
//DashboardContent.tsx
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
const DashboardContent: React.FC = () => {
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
        <p>loading</p>
      )}
    </div>
  );
};

export default DashboardContent;