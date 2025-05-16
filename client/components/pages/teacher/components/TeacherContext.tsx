// ~/teacher/components/TeacherContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { account, databases, Query } from '~/utils/appwrite'; // Adjust path if needed
import { TeacherData } from 'types/notification'; // Adjust path if needed

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TEACHER_COLLECTION_ID = import.meta.env.VITE_APPWRITE_TEACHER_COLLECTION_ID;

export interface TeacherContextType {
  teacherData: TeacherData | null;
  loading: boolean;
  error: Error | null;
  refetchTeacherData: () => Promise<void>; // This is the function to call for refetching
}

const TeacherContext = createContext<TeacherContextType | undefined>(undefined);

export const TeacherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Renamed to internalFetchTeacherData to avoid confusion with the exported refetchTeacherData
  const internalFetchTeacherData = useCallback(async () => {
    console.log('TeacherContext: Attempting to fetch teacher data...');
    if (!DATABASE_ID || !TEACHER_COLLECTION_ID) {
      console.error("TeacherContext Error: Appwrite config IDs missing (DATABASE_ID or TEACHER_COLLECTION_ID).");
      setError(new Error("Application configuration error (Teacher Context)."));
      setTeacherData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await account.get();
      console.log('TeacherContext: Current Appwrite user:', user);

      if (!user?.$id) {
        console.log('TeacherContext: No logged-in user.');
        setTeacherData(null);
        setLoading(false);
        return;
      }

      if (!user.labels || !user.labels.includes('teacher')) {
        console.warn(`TeacherContext: User ${user.$id} (Email: ${user.email}) does NOT have 'teacher' label. Labels:`, user.labels);
        setTeacherData(null);
        setLoading(false);
        return;
      }
      console.log(`TeacherContext: User ${user.$id} has 'teacher' label.`);

      // Query coll-teacher. Assumes 'id' field in coll-teacher stores the Appwrite User ID.
      // If it's user.$id directly, or another field like 'userId', adjust Query.equal.
      const teacherResponse = await databases.listDocuments(
        DATABASE_ID,
        TEACHER_COLLECTION_ID,
        [Query.equal('id', user.$id), Query.limit(1)]
      );
      console.log('TeacherContext: Response from coll-teacher query:', teacherResponse);

      if (teacherResponse.documents.length === 0) {
        console.warn(`TeacherContext: No document found in coll-teacher for user ID: ${user.$id} (who has 'teacher' label). Ensure 'id' field in coll-teacher matches Appwrite User ID, or that a record exists.`);
        // If a teacher only needs the 'teacher' label and no specific data from coll-teacher for notifications,
        // you could potentially create a minimal TeacherData object here:
        // setTeacherData({
        //   $id: user.$id, // Using user.$id as a fallback document ID
        //   id: user.$id,    // Appwrite User ID
        //   name: user.name || 'Teacher',
        //   email: user.email,
        //   labels: user.labels,
        // });
        // setLoading(false);
        // return;
        setTeacherData(null); // Current behavior: requires a document in coll-teacher
        setLoading(false);
        return;
      }

      const teacherDoc = teacherResponse.documents[0] as unknown as Omit<TeacherData, 'labels' | 'id'> & { $id: string, id: string /* field from collection */ };
      console.log('TeacherContext: Found teacher document in coll-teacher:', teacherDoc);

      const combinedData: TeacherData = {
        ...teacherDoc, // Spread fields from coll-teacher (name, email, facultyId, assignedClasses etc.)
        $id: teacherDoc.$id, // Document ID from coll-teacher
        id: user.$id,       // Appwrite User ID from Auth (THIS IS THE ONE TO USE FOR 'id:' TARGETS)
        labels: user.labels || [],
        name: teacherDoc.name || user.name, // Prioritize name from teacherDoc if available
        email: teacherDoc.email || user.email, // Prioritize email from teacherDoc if available
        facultyId: (teacherDoc as any).facultyId, // Example: ensure these exist in your coll-teacher schema
        assignedClasses: (teacherDoc as any).assignedClasses, // Example
      };
      setTeacherData(combinedData);
      console.log('TeacherContext: Successfully set teacherData:', combinedData);

    } catch (err: any) {
      console.error('TeacherContext: Error fetching teacher data:', err);
      setError(err);
      setTeacherData(null);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed if DATABASE_ID and TEACHER_COLLECTION_ID are constants

  useEffect(() => {
    internalFetchTeacherData();
  }, [internalFetchTeacherData]);

  // This is the function exposed via context for manual refetching
  const refetchTeacherData = useCallback(async () => {
    await internalFetchTeacherData();
  }, [internalFetchTeacherData]);

  const contextValue: TeacherContextType = {
    teacherData,
    loading,
    error,
    refetchTeacherData, // Make sure this is passed in the value
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
    // This can happen if the hook is used outside the provider.
    // NotificationContext should handle this by seeing no teacherData.
    console.warn('useTeacherData used outside of TeacherProvider. Returning default empty state.');
    return { teacherData: null, loading: false, error: null, refetchTeacherData: async () => {} };
  }
  return context;
};