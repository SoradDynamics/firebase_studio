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
import { TeacherData } from 'types/notification';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TEACHER_COLLECTION_ID = import.meta.env.VITE_APPWRITE_TEACHER_COLLECTION_ID; // Optional

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
    setLoading(true);
    setError(null);
    console.log("TeacherContext: fetchTeacherData called");

    try {
      const user = await account.get();
      console.log("TeacherContext: Logged in Appwrite User:", user.$id, user.labels);

      if (!user?.$id) {
        console.log("TeacherContext: No user logged in.");
        setTeacherData(null);
        setLoading(false);
        return;
      }

      if (!user.labels || !user.labels.includes('teacher')) {
        console.log("TeacherContext: User does not have 'teacher' label. Not a teacher.", user.labels);
        setTeacherData(null);
        setLoading(false);
        return;
      }
      console.log("TeacherContext: User has 'teacher' label. Proceeding...");


      let baseTeacherInfo: Partial<TeacherData> = {
        id: user.$id,
        name: user.name || "Teacher User",
        email: user.email,
        labels: user.labels || [],
        $id: user.$id, // Default $id to user.$id if no collection doc
      };
      let detailsFromCollection: Partial<TeacherData> = {};

      if (TEACHER_COLLECTION_ID && DATABASE_ID) {
        console.log(`TeacherContext: Attempting to fetch from coll-teacher (${TEACHER_COLLECTION_ID}) for user ${user.$id}`);
        try {
          const response = await databases.listDocuments(
            DATABASE_ID,
            TEACHER_COLLECTION_ID,
            [Query.equal('id', user.$id), Query.limit(1)] // Assuming 'id' in coll-teacher stores Appwrite User ID
          );
          if (response.documents.length > 0) {
            const teacherDoc = response.documents[0];
            console.log("TeacherContext: Found document in coll-teacher:", teacherDoc);
            detailsFromCollection = {
              ...(teacherDoc as Omit<TeacherData, 'id' | 'labels' | 'email' | 'name'>), // Cast carefully
              $id: teacherDoc.$id, // Use the actual document ID from coll-teacher
              // Potentially override name/email if they are more accurate in coll-teacher
              name: teacherDoc.name || baseTeacherInfo.name,
              email: teacherDoc.email || baseTeacherInfo.email,
            };
          } else {
            console.warn(`TeacherContext: No document in coll-teacher for user ID: ${user.$id}. Using auth info.`);
          }
        } catch (collectionError) {
          console.error(`TeacherContext: Error fetching from coll-teacher:`, collectionError);
          // Not treating as fatal, will fall back to auth info
        }
      } else {
        console.log("TeacherContext: VITE_APPWRITE_TEACHER_COLLECTION_ID not set or DATABASE_ID missing. Using auth info only.");
      }

      const combinedData: TeacherData = {
        id: user.$id, // CRITICAL: This is the Appwrite Auth User ID
        labels: user.labels || [],
        name: (detailsFromCollection.name || baseTeacherInfo.name) as string,
        email: detailsFromCollection.email || baseTeacherInfo.email,
        $id: (detailsFromCollection.$id || baseTeacherInfo.$id) as string,
        facultyId: detailsFromCollection.facultyId,
        assignedClasses: detailsFromCollection.assignedClasses,
        subjects: detailsFromCollection.subjects,
      };

      console.log("TeacherContext: Final teacherData being set:", combinedData);
      setTeacherData(combinedData);

    } catch (err: any) {
      console.error('TeacherProvider: Error in fetchTeacherData:', err);
      setError(err);
      setTeacherData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  return (
    <TeacherContext.Provider value={{ teacherData, loading, error, refetchTeacherData }}>
      {children}
    </TeacherContext.Provider>
  );
};

export const useTeacherData = (): TeacherContextType => {
  const context = useContext(TeacherContext);
  if (context === undefined) {
    // This can happen if a component tries to use this context when it's not applicable.
    // NotificationContext will handle it by not finding teacherData.
    // console.warn("useTeacherData called outside TeacherProvider. This might be expected.");
    return { teacherData: null, loading: true, error: null, refetchTeacherData: async () => {} };
  }
  return context;
};