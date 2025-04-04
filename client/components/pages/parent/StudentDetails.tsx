import React from 'react';

interface Student {
    id: string;
    name: string;
    class: string;
    facultyId: string;
    section: string;
    stdEmail: string;
    parentId: string;
  }

interface StudentDetailsProps {
    student:Student
}

const StudentDetails: React.FC<StudentDetailsProps> = ({ student }) => {
    return (
        <div className="bg-white shadow-md rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Student Information</h3>
            <p><strong>Name:</strong> {student.name}</p>
            <p><strong>Class:</strong> {student.class}</p>
            <p><strong>Section:</strong> {student.section}</p>
            <p><strong>Email:</strong> {student.stdEmail}</p>
        </div>
    );
};

export default StudentDetails;