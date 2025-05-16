// ~/teacher/components/TeacherContext.tsx
import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    ReactNode,
    useCallback,
  } from 'react';
  import { account, databases, Query } from '~/utils/appwrite';
  import { TeacherData } from 'types/notification'; // Adjust path if types are elsewhere
  
  // --- Appwrite Config from .env ---
  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const TEACHER_COLLECTION_ID = import.meta.env.VITE_APPWRITE_TEACHER_COLLECTION_ID; // Add this to your .env
  // --- End Appwrite Config ---
  
  export interface TeacherContextType {
    teacherData: TeacherData | null;
    loading: boolean;
    error: Error | null;
    refetchTeacherData: () => Promise<void>;
  }
  
  const TeacherContext = createContext<TeacherContextType | undefined>(undefined);
  
  export const TeacherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
  
    const fetchTeacherData = useCallback(async () => {
      if (!DATABASE_ID || !TEACHER_COLLECTION_ID) {
        console.error("TeacherContext Error: Appwrite config IDs missing from .env (DATABASE_ID or TEACHER_COLLECTION_ID)");
        setError(new Error("Application configuration error (Teacher Context)."));
        setTeacherData(null);
        setLoading(false);
        return;
      }
  
      setLoading(true);
      setError(null);
  
      try {
        const user = await account.get();
        if (!user?.$id) {
          setTeacherData(null); // No logged-in user
          setLoading(false);
          return;
        }
  
        // Check if user has 'teacher' label
        if (!user.labels || !user.labels.includes('teacher')) {
          // console.warn(`TeacherProvider: User ${user.$id} does not have 'teacher' label.`);
          setTeacherData(null);
          setLoading(false);
          return;
        }
  
        // Fetch Teacher Document from coll-teacher
        // Assumes 'coll-teacher' has a field named 'id' that stores the Appwrite User ID.
        // If your schema is different (e.g., the document ID $id is the user ID, or another field like 'userId'), adjust the query.
        const teacherResponse = await databases.listDocuments(
          DATABASE_ID,
          TEACHER_COLLECTION_ID,
          [Query.equal('id', user.$id), Query.limit(1)] // Querying by the 'id' field in coll-teacher
        );
  
        if (teacherResponse.documents.length === 0) {
          // console.warn(`TeacherProvider: No teacher document found in coll-teacher for user ID: ${user.$id}. This user might have the 'teacher' label but no corresponding teacher record.`);
          // Optionally, you could create a minimal TeacherData object here if a label is enough
          // For now, strict: requires a document in coll-teacher
          setTeacherData(null);
          setLoading(false);
          return;
        }
  
        const teacherDoc = teacherResponse.documents[0] as unknown as Omit<TeacherData, 'labels' | 'id'> & { $id: string, id: string /* field from collection */ };
  
        const combinedData: TeacherData = {
          ...teacherDoc, // Spread fields from coll-teacher doc (name, email, facultyId, assignedClasses etc.)
          $id: teacherDoc.$id, // Document ID from coll-teacher
          id: user.$id,       // Appwrite User ID from Auth (ensure this is used for 'id:' targeting)
          labels: user.labels || [],
          // Ensure 'name' and 'email' are sourced correctly, either from teacherDoc or user object if preferred
          name: teacherDoc.name || user.name,
          email: teacherDoc.email || user.email,
        };
        setTeacherData(combinedData);
  
      } catch (err: any) {
        console.error('TeacherProvider: Error fetching teacher data:', err);
        setError(err);
        setTeacherData(null);
      } finally {
        setLoading(false);
      }
    }, []);
  
    useEffect(() => {
      fetchTeacherData();
    }, [fetchTeacherData]);
  
    const contextValue: TeacherContextType = {
      teacherData,
      loading,
      error,
      refetchTeacherData: fetchTeacherData,
    };
  
    return (
      <TeacherContext.Provider value={contextValue}>
        {children}
      </TeacherContext.Provider>
    );
  };
  
  export const useTeacherData = (): TeacherContextType => {
    const context = useContext(TeacherContext);
    if (context === undefined) {
      // This is acceptable if used in NotificationContext which checks for data presence
      return { teacherData: null, loading: false, error: null, refetchTeacherData: async () => {} };
    }
    return context;
  };