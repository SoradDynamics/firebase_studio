// ~/parent/components/ParentContext.tsx
import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    ReactNode,
    useCallback,
  } from 'react';
  import { account, databases, Query } from '~/utils/appwrite';
  import { ParentData, ChildStudentDetails, StudentData } from 'types/notification'; // Adjust path if types are elsewhere
  
  // --- Appwrite Config from .env ---
  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const PARENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID; // Add this to your .env
  const STUDENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID;
  // --- End Appwrite Config ---
  
  export interface ParentContextType {
    parentData: ParentData | null;
    loading: boolean;
    error: Error | null;
    refetchParentData: () => Promise<void>;
  }
  
  const ParentContext = createContext<ParentContextType | undefined>(undefined);
  
  export const ParentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [parentData, setParentData] = useState<ParentData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
  
    const fetchParentData = useCallback(async () => {
      if (!DATABASE_ID || !PARENT_COLLECTION_ID || !STUDENT_COLLECTION_ID) {
        console.error("ParentContext Error: Appwrite config IDs missing from .env");
        setError(new Error("Application configuration error (Parent Context)."));
        setParentData(null);
        setLoading(false);
        return;
      }
  
      setLoading(true);
      setError(null);
  
      try {
        const user = await account.get();
        if (!user?.$id) {
          setParentData(null); // No logged-in user
          setLoading(false);
          return;
        }
  
        // 1. Fetch Parent Document
        const parentResponse = await databases.listDocuments(
          DATABASE_ID,
          PARENT_COLLECTION_ID,
          [Query.equal('id', user.$id), Query.limit(1)]
        );
  
        if (parentResponse.documents.length === 0) {
          // console.warn(`ParentProvider: No parent document found for user ID: ${user.$id}. This user might not be a parent.`);
          setParentData(null);
          setLoading(false);
          return;
        }
  
        const parentDoc = parentResponse.documents[0] as unknown as Omit<ParentData, 'labels' | 'childrenDetails' | '$id'> & { $id: string; students: string[] };
  
        // 2. Fetch Details for Each Child Student
        const childrenDetails: ChildStudentDetails[] = [];
        if (parentDoc.students && parentDoc.students.length > 0) {
          // Fetch student documents in batches or individually
          // For simplicity, fetching one by one. Consider batching for many students.
          for (const studentDocId of parentDoc.students) {
            try {
              const studentRes = await databases.getDocument(
                DATABASE_ID,
                STUDENT_COLLECTION_ID,
                studentDocId
              );
              // Ensure the student document has the 'id' field which is the student's Appwrite User ID
              const studentDetails = studentRes as unknown as Omit<StudentData, 'labels' | '$id'> & {$id: string};
              if (studentDetails && studentDetails.id) { // studentDetails.id is the User ID
                childrenDetails.push({
                  $docId: studentDetails.$id, // Student's document ID
                  userId: studentDetails.id,   // Student's Appwrite User ID
                  name: studentDetails.name,
                  class: studentDetails.class,
                  section: studentDetails.section,
                  facultyId: studentDetails.facultyId,
                });
              } else {
                console.warn(`ParentProvider: Student document ${studentDocId} missing 'id' (UserID) field or not found.`);
              }
            } catch (studentFetchError) {
              console.error(`ParentProvider: Error fetching student document ${studentDocId}:`, studentFetchError);
              // Optionally, add a placeholder or skip this child
            }
          }
        }
  
        const combinedData: ParentData = {
          ...parentDoc,
          id: user.$id, // Parent's Appwrite User ID
          labels: user.labels || [],
          childrenDetails: childrenDetails,
          // students: parentDoc.students, // Already part of parentDoc
        };
        setParentData(combinedData);
  
      } catch (err: any) {
        console.error('ParentProvider: Error fetching parent data:', err);
        setError(err);
        setParentData(null);
      } finally {
        setLoading(false);
      }
    }, []);
  
    useEffect(() => {
      fetchParentData();
    }, [fetchParentData]);
  
    const contextValue: ParentContextType = {
      parentData,
      loading,
      error,
      refetchParentData: fetchParentData,
    };
  
    return (
      <ParentContext.Provider value={contextValue}>
        {children}
      </ParentContext.Provider>
    );
  };
  
  export const useParentData = (): ParentContextType => {
    const context = useContext(ParentContext);
    if (context === undefined) {
      // This error is expected if useParentData is used outside a ParentProvider.
      // NotificationContext will handle this gracefully.
      // console.warn('useParentData must be used within a ParentProvider. Returning default empty state.');
      return { parentData: null, loading: false, error: null, refetchParentData: async () => {} };
      // throw new Error('useParentData must be used within a ParentProvider');
    }
    return context;
  };