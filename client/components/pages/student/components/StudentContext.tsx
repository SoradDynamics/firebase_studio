// ~/components/StudentContext.tsx (VERIFY THIS PATH AND CONTENT)

import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    ReactNode,
    useCallback
  } from 'react';
  import { account, databases, Query } from '~/utils/appwrite'; // Adjust path if needed
  import { Models } from 'appwrite';
  import { StudentData } from 'types/notification'; // Adjust path if needed
  
  // --- Appwrite Config from .env ---
  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const STUDENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID;
  // --- End Appwrite Config ---
  
  // --- Define the Context Data Shape ---
  // ***** THIS LINE MUST START WITH 'export' *****
  export interface StudentContextType {
    studentData: StudentData | null;
    loading: boolean;
    error: Error | null;
    refetchStudentData: () => Promise<void>;
  }
  // --- End Context Data Shape ---
  
  // --- Create the Context ---
  const StudentContext = createContext<StudentContextType | undefined>(undefined);
  // --- End Context Creation ---
  
  
  // --- Create the Provider Component ---
  export const StudentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [studentData, setStudentData] = useState<StudentData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
  
    const fetchStudentData = useCallback(async () => {
      if (!DATABASE_ID || !STUDENT_COLLECTION_ID) {
        console.error("StudentContext Error: Database ID or Student Collection ID missing from .env");
        setError(new Error("Application configuration error (Student Context)."));
        setStudentData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const user = await account.get();
        if (!user?.$id) {
          setStudentData(null);
        } else {
          const response = await databases.listDocuments(
            DATABASE_ID,
            STUDENT_COLLECTION_ID,
            [Query.equal('id', user.$id), Query.limit(1)]
          );
          if (response.documents.length === 0) {
            console.warn(`StudentProvider: No student document found for user ID: ${user.$id}.`);
            setStudentData(null);
          } else {
            const studentDoc = response.documents[0] as unknown as Omit<StudentData, 'labels' | '$id'> & {$id: string};
            const combinedData: StudentData = {
              ...studentDoc, id: user.$id, labels: user.labels || [], $id: studentDoc.$id
            };
            setStudentData(combinedData);
          }
        }
      } catch (err: any) {
        console.error('StudentProvider: Error fetching student data:', err);
        setError(err);
        setStudentData(null);
      } finally {
        setLoading(false);
      }
    }, []);
  
    useEffect(() => { fetchStudentData(); }, [fetchStudentData]);
  
    const contextValue: StudentContextType = {
      studentData, loading, error, refetchStudentData: fetchStudentData
    };
  
    return (
      <StudentContext.Provider value={contextValue}>
        {children}
      </StudentContext.Provider>
    );
  };
  // --- End Provider Component ---
  
  
  // --- Create the Hook to Use the Context ---
  // ***** THIS HOOK MUST BE EXPORTED *****
  export const useStudentData = (): StudentContextType => {
    const context = useContext(StudentContext);
    if (context === undefined) {
      throw new Error('useStudentData must be used within a StudentProvider');
    }
    return context;
  };
  // --- End Hook ---