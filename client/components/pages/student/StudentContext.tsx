// StudentDataContext.tsx
import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    ReactNode,
  } from 'react';
  import { account, databases, Query } from '~/utils/appwrite'; // Adjust path as needed
  import { Models } from 'appwrite';
  
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
    name: string;
  }
  
  interface StudentDataContextProps {
    parent: Parent | null;
    students: Student[];
    selectedStudentId: string | null;
    selectedStudent: Student | null;
    studentOptions: StudentOption[];
    handleStudentChange: (studentId: string) => void;
  }
  
  const StudentDataContext = createContext<StudentDataContextProps | undefined>(
    undefined
  );
  
  interface StudentDataProviderProps {
    children: ReactNode;
  }
  
  export const StudentDataProvider: React.FC<StudentDataProviderProps> = ({
    children,
  }) => {
    const [parent, setParent] = useState<Parent | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
      null
    );
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
    const [userEmail, setUserEmail] = useState<string | null>(null);
  
    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
    const PARENT_COLLECTION_ID =
      import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID || '';
    const STUDENT_COLLECTION_ID =
      import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID || '';
  
    useEffect(() => {
      const getCurrentUserEmail = async () => {
        try {
          const user: Models.User<Models.Preferences> = await account.get();
          setUserEmail(user.email);
        } catch (error) {
          console.error('Failed to get current account:', error);
        }
      };
  
      getCurrentUserEmail();
    }, []);
  
    useEffect(() => {
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
  
              setStudents(studentDetails);
              setSelectedStudentId(studentDetails[0].id);
  
              const options: StudentOption[] = studentDetails.map((student) => ({
                id: student.id,
                name: student.name,
              }));
              setStudentOptions(options);
            }
          } else {
            console.log('No parent found with this email:', userEmail);
            setParent(null);
          }
        } catch (error) {
          console.error('Error fetching parent data:', error);
          setParent(null);
        }
      };
  
      fetchParentDataByEmail();
    }, [userEmail]);
  
    useEffect(() => {
      const fetchStudentData = async () => {
        if (parent && parent.students && selectedStudentId) {
          try {
            const selected = students.find(
              (student) => student.id === selectedStudentId
            );
            setSelectedStudent(selected || null);
          } catch (error) {
            console.error('Error fetching student data:', error);
          }
        }
      };
  
      if (parent) {
        fetchStudentData();
      }
    }, [parent, selectedStudentId, students]);
  
    const handleStudentChange = (studentId: string) => {
      setSelectedStudentId(studentId);
    };
  
    const value: StudentDataContextProps = {
      parent,
      students,
      selectedStudentId,
      selectedStudent,
      studentOptions,
      handleStudentChange,
    };
  
    return (
      <StudentDataContext.Provider value={value}>
        {children}
      </StudentDataContext.Provider>
    );
  };
  
  export const useStudentData = () => {
    const context = useContext(StudentDataContext);
    if (!context) {
      throw new Error(
        'useStudentData must be used within a StudentDataProvider'
      );
    }
    return context;
  };