import React, { useState, useEffect } from 'react';
import { account, databases, Query } from '~/utils/appwrite';
import { Models } from 'appwrite';

interface Student {
  id: string;
  name: string;
  class: string;
  facultyId: string;
  section: string;
  stdEmail: string;
  parentId: string;
}

interface Faculty {
  id: string;
  name: string;
  classes: string[];
}

interface Parent {
    id: string;
    name: string;
    email: string;
    contact: string[];
    students: string[];
}

const StudentComponent: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [parent, setParent] = useState<Parent | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
  const STUDENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID || '';
  const FACULTY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_FACULTY_COLLECTION_ID || '';
  const PARENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID || '';

  useEffect(() => {
    const getCurrentUserEmail = async () => {
      try {
        const user: Models.User<Models.Preferences> = await account.get();
        setUserEmail(user.email);
      } catch (error) {
        console.error("Failed to get current account:", error);
      }
    };

    getCurrentUserEmail();
  }, []);

  useEffect(() => {
    const fetchStudentDataByEmail = async () => {
      if (!userEmail) return;

      try {
        const studentList = await databases.listDocuments(
          DATABASE_ID,
          STUDENT_COLLECTION_ID,
          [Query.equal('stdEmail', userEmail)] // Search by student email
        );

        if (studentList.documents.length > 0) {
          const studentDocument = studentList.documents[0]; // Assuming one student per email

          const typedStudent: Student = {
            id: studentDocument.$id,
            name: studentDocument.name,
            class: studentDocument.class,
            facultyId: studentDocument.facultyId,
            section: studentDocument.section,
            stdEmail: studentDocument.stdEmail,
            parentId: studentDocument.parentId,
          };

          setStudent(typedStudent);
          getFacultyDetails(typedStudent.facultyId);
          getParentDetails(typedStudent.parentId); // Fetch parent details
        } else {
          console.log("No student found with this email:", userEmail);
          setStudent(null);
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
        setStudent(null);
      }
    };

    fetchStudentDataByEmail();
  }, [userEmail]);

  const getFacultyDetails = async (facultyId: string) => {
    if (!facultyId) return;

    try {
      const facultyDocument = await databases.getDocument(
        DATABASE_ID,
        FACULTY_COLLECTION_ID,
        facultyId
      );

      const typedFaculty: Faculty = {
        id: facultyDocument.$id,
        name: facultyDocument.name,
        classes: facultyDocument.classes,
      };
      setFaculty(typedFaculty);
    } catch (error) {
      console.error('Error fetching faculty data:', error);
      setFaculty(null);
    }
  };

    const getParentDetails = async (parentId: string) => {
        if (!parentId) return;

        try {
            const parentDocument = await databases.getDocument(
                DATABASE_ID,
                PARENT_COLLECTION_ID,
                parentId
            );

            const typedParent: Parent = {
                id: parentDocument.$id,
                name: parentDocument.name,
                email: parentDocument.email,
                contact: parentDocument.contact,
                students: parentDocument.students,
            };
            setParent(typedParent);
        } catch (error) {
            console.error('Error fetching faculty data:', error);
            setParent(null);
        }
    };

  if (!student) {
    return <p>Loading student data...</p>; // Or display an error message
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Student Details</h1>
      <p>Name: {student.name}</p>
      <p>Class: {student.class}</p>
      <p>Section: {student.section}</p>
      <p>Email: {student.stdEmail}</p>
      <p>Parent: {parent ? parent.name : "Not Found"}</p>
      <p>Faculty: {faculty ? faculty.name : "Not Found"}</p>
    </div>
  );
};

export default StudentComponent;