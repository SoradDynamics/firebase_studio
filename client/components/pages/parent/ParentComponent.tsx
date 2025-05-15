import React, { useState, useEffect } from 'react';
import { Select, SelectItem } from '@heroui/react';
import { account, databases, Query } from '~/utils/appwrite'; // Import database ID
import { Models } from 'appwrite';
import StudentDetails from './StudentDetails';
import ParentNotification from './components/ParentNotification';

interface Parent {
  id: string;
  name: string;
  email: string;
  contact: string[];
  students: string[];
}

interface Student {
  id: string;
  name: string;
  class: string;
  facultyId: string;
  section: string;
  stdEmail: string;
  parentId: string;
}

interface StudentOption {
  id: string;
  name: string; // Student's name to display in the select
}

const ParentComponent: React.FC = () => {
  const [parent, setParent] = useState<Parent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]); // Use StudentOption
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Appwrite Configuration (Use your environment variables and collection/database IDs)
    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
    const PARENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID || '';
    const STUDENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID || '';

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
    // Fetch Parent Data by Email
    const fetchParentDataByEmail = async () => {
      if (!userEmail) return;

      try {
        const parentList = await databases.listDocuments(
          DATABASE_ID,
          PARENT_COLLECTION_ID,
          [Query.equal('email', userEmail)]
        );

        if (parentList.documents.length > 0) {
          const parentDocument = parentList.documents[0];

          const typedParent: Parent = {
            id: parentDocument.$id,
            name: parentDocument.name,
            email: parentDocument.email,
            contact: parentDocument.contact,
            students: parentDocument.students,
          };
          setParent(typedParent);

          // Fetch Student Details for the Select Options
          if (typedParent.students && typedParent.students.length > 0) {
            const studentDetails: Student[] = await Promise.all(
              typedParent.students.map(async (studentId) => {
                const studentDocument = await databases.getDocument(
                  DATABASE_ID,
                  STUDENT_COLLECTION_ID,
                  studentId
                );
                return {
                  id: studentDocument.$id,
                  name: studentDocument.name,
                  class: studentDocument.class,
                  facultyId: studentDocument.facultyId,
                  section: studentDocument.section,
                  stdEmail: studentDocument.stdEmail,
                  parentId: studentDocument.parentId,
                };
              })
            );

            setStudents(studentDetails); // Store the student details
            //Set the selected student id
            setSelectedStudentId(studentDetails[0].id)
            // Transform student details into StudentOption array
            const options: StudentOption[] = studentDetails.map((student) => ({
              id: student.id,
              name: student.name,
            }));
            setStudentOptions(options); // Set StudentOptions with Names
            // setOptions(typedParent.students.map((item) => ({name:item, id:item}))) //this is previous code
          }
        } else {
          console.log("No parent found with this email:", userEmail);
          setParent(null);
        }
      } catch (error) {
        console.error("Error fetching parent data:", error);
        setParent(null);
      }
    };

    fetchParentDataByEmail();
  }, [userEmail]);

  useEffect(() => {
    // Fetch Students Data (only runs if parent and selectedStudentId are available)
    const fetchStudentData = async () => {
      if (parent && parent.students && selectedStudentId) { //added selectedStudentId check
        try {
          // Find the selected student by ID in the already fetched students
          const selected = students.find(student => student.id === selectedStudentId);
          setSelectedStudent(selected || null); // Use null if no student is found.
        } catch (error) {
          console.error('Error fetching student data:', error);
        }
      }
    };

    if (parent) {
      fetchStudentData();
    }

  }, [parent, selectedStudentId, students]); // Include students in dependency array

  const handleStudentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const studentId = event.target.value;
    setSelectedStudentId(studentId);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Parent Dashboard</h1>

      {parent ? (
        <div>
          <p>Welcome, {parent.name}!</p>
          <p>Email: {parent.email}</p>

          {/* Student Selector */}
          <div className="mb-4">
            <label htmlFor="studentSelect" className="block text-sm font-medium text-gray-700">
              Select Student:
            </label>

            <Select
              className="max-w-xs"
              items={studentOptions} // Use studentOptions
              label="Select Student"
              placeholder="Select a student"
              onChange={handleStudentChange}
              value={selectedStudentId ?? ''}
            >
              {(student) => (
                <SelectItem key={student.id}>
                  {student.name}
                </SelectItem>
              )}
            </Select>
          </div>

          {/* Student Details Section */}
          {selectedStudent ? (
            <div>
              <h2 className="text-lg font-semibold mb-2">Student Details:</h2>
              <StudentDetails student={selectedStudent} />
            </div>
          ) : (
            <p>No student selected.</p>
          )}
           <ParentNotification />
        </div>
      ) : (
        <p>Loading parent data...</p>
      )}
    </div>
  );
};

export default ParentComponent;
