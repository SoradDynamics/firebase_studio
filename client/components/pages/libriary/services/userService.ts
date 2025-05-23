// src/services/userService.ts
import { databases, Query, ID as AppwriteID } from '~/utils/appwrite'; // Use AppwriteID to avoid conflict if you use 'ID' elsewhere
import { 
    APPWRITE_DATABASE_ID, 
    STUDENTS_COLLECTION_ID, 
    TEACHERS_COLLECTION_ID,
    FACULTIES_COLLECTION_ID // Added for fetching faculties
} from '../constants/appwriteIds';
import type { Document as AppwriteDocument } from 'types/appwrite'; // Renamed to avoid conflict
import type { LibraryUser, UserType } from 'types/library'; // Your custom types
import type { Models } from 'appwrite'; // For Models.Document

// Specific document types for clarity
interface StudentAppwriteDoc extends Models.Document {
  id: string; // Your custom unique ID
  name: string;
  stdEmail?: string;
  class?: string;
  facultyId?: string;
  isLibraryMember?: boolean;
  // Add any other fields from your coll-student schema
}

interface TeacherAppwriteDoc extends Models.Document {
  id: string; // Your custom unique ID
  name: string;
  email?: string;
  isLibraryMember?: boolean;
  // Add any other fields from your coll-teacher schema
}

/**
 * Searches for users (students or teachers) by name or custom ID.
 * Intended for general user selection and membership management.
 */
export const searchUsers = async (
  searchTerm: string, 
  userType: UserType,
  limit: number = 25
): Promise<LibraryUser[]> => {
  const collectionId = userType === 'student' ? STUDENTS_COLLECTION_ID : TEACHERS_COLLECTION_ID;
  
  if (!collectionId) {
    console.error(`searchUsers: Collection ID for ${userType} is not defined.`);
    return [];
  }
  if (!APPWRITE_DATABASE_ID) {
    console.error(`searchUsers: Appwrite Database ID is not defined.`);
    return [];
  }

  try {
    const queries = [Query.limit(limit)];
    if (searchTerm.trim()) {
        // Search by name OR custom 'id' field
        queries.push(Query.or([
            Query.search('name', searchTerm),
            Query.search('id', searchTerm) 
        ]));
    } else {
        // If no search term, fetch recent users or based on other criteria
        queries.push(Query.orderDesc('$createdAt')); // Example: fetch most recently created
    }


    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      collectionId,
      queries
    );

    if (userType === 'student') {
      return response.documents.map((doc): LibraryUser => {
        const studentDoc = doc as StudentAppwriteDoc;
        return {
          $id: studentDoc.$id, // Appwrite document ID
          id: studentDoc.id,   // Your custom ID
          name: studentDoc.name,
          email: studentDoc.stdEmail,
          type: 'student',
          class: studentDoc.class,
          facultyId: studentDoc.facultyId,
          isLibraryMember: studentDoc.isLibraryMember || false,
        };
      });
    } else {
      return response.documents.map((doc): LibraryUser => {
        const teacherDoc = doc as TeacherAppwriteDoc;
        return {
          $id: teacherDoc.$id, // Appwrite document ID
          id: teacherDoc.id,   // Your custom ID
          name: teacherDoc.name,
          email: teacherDoc.email,
          type: 'teacher',
          isLibraryMember: teacherDoc.isLibraryMember || false,
        };
      });
    }
  } catch (error) {
    console.error(`Error searching ${userType}s:`, error);
    // throw error; // Or return empty array depending on desired error handling
    return [];
  }
};

/**
 * Fetches a single user by their Appwrite Document ID.
 */
export const getUserByAppwriteId = async (
  appwriteDocId: string,
  userType: UserType
): Promise<LibraryUser | null> => {
  const collectionId = userType === 'student' ? STUDENTS_COLLECTION_ID : TEACHERS_COLLECTION_ID;
  if (!collectionId || !APPWRITE_DATABASE_ID) {
    console.error(`getUserByAppwriteId: Collection or DB ID missing for ${userType}`);
    return null;
  }

  try {
    const doc = await databases.getDocument(APPWRITE_DATABASE_ID, collectionId, appwriteDocId);
    if (userType === 'student') {
      const studentDoc = doc as StudentAppwriteDoc;
      return {
        $id: studentDoc.$id, id: studentDoc.id, name: studentDoc.name, email: studentDoc.stdEmail,
        type: 'student', class: studentDoc.class, facultyId: studentDoc.facultyId,
        isLibraryMember: studentDoc.isLibraryMember || false,
      };
    } else {
      const teacherDoc = doc as TeacherAppwriteDoc;
      return {
        $id: teacherDoc.$id, id: teacherDoc.id, name: teacherDoc.name, email: teacherDoc.email,
        type: 'teacher', isLibraryMember: teacherDoc.isLibraryMember || false,
      };
    }
  } catch (error) {
    // Appwrite throws error if document not found, which can be normal
    if ((error as any).code !== 404) {
        console.error(`Error fetching ${userType} by Appwrite ID ${appwriteDocId}:`, error);
    }
    return null;
  }
};

/**
 * Fetches a single user by their custom unique ID (e.g., admission_no, employee_id).
 */
export const getUserByCustomId = async (
  customId: string,
  userType: UserType
): Promise<LibraryUser | null> => {
  const collectionId = userType === 'student' ? STUDENTS_COLLECTION_ID : TEACHERS_COLLECTION_ID;
   if (!collectionId || !APPWRITE_DATABASE_ID) {
      console.error(`getUserByCustomId: Collection or DB ID missing for ${userType}`);
      return null;
  }
  try {
    const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        collectionId,
        [Query.equal('id', customId), Query.limit(1)] // 'id' is your custom field name
    );

    if (response.documents.length > 0) {
        const doc = response.documents[0];
        // Map to LibraryUser (similar to getUserByAppwriteId)
        if (userType === 'student') {
            const studentDoc = doc as StudentAppwriteDoc;
            return {
                $id: studentDoc.$id, id: studentDoc.id, name: studentDoc.name, email: studentDoc.stdEmail,
                type: 'student', class: studentDoc.class, facultyId: studentDoc.facultyId,
                isLibraryMember: studentDoc.isLibraryMember || false,
            };
        } else {
            const teacherDoc = doc as TeacherAppwriteDoc;
            return {
                $id: teacherDoc.$id, id: teacherDoc.id, name: teacherDoc.name, email: teacherDoc.email,
                type: 'teacher', isLibraryMember: teacherDoc.isLibraryMember || false,
            };
        }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ${userType} by custom ID ${customId}:`, error);
    return null;
  }
};


/**
 * Updates the library membership status of a user.
 */
export const updateUserLibraryMembershipStatus = async (
  userAppwriteId: string, // Appwrite $id of the student/teacher document
  userType: UserType, // To determine collectionId
  isMember: boolean
): Promise<Models.Document> => {
  const collectionId = userType === 'student' ? STUDENTS_COLLECTION_ID : TEACHERS_COLLECTION_ID;
  if (!collectionId || !APPWRITE_DATABASE_ID) {
    throw new Error(`updateUserLibraryMembershipStatus: Collection or DB ID missing for ${userType}`);
  }

  return databases.updateDocument(
    APPWRITE_DATABASE_ID,
    collectionId,
    userAppwriteId,
    { isLibraryMember: isMember } // Attribute name in your DB
  );
};

/**
 * Fetches all faculties.
 */
export const fetchFaculties = async (): Promise<{ id: string; name: string }[]> => {
    if (!FACULTIES_COLLECTION_ID || !APPWRITE_DATABASE_ID) {
        console.error("fetchFaculties: Faculty Collection or DB ID is not defined.");
        return [];
    }
    try {
        const response = await databases.listDocuments(APPWRITE_DATABASE_ID, FACULTIES_COLLECTION_ID);
        // Ensure you are mapping $id from Appwrite and name attribute correctly
        return response.documents.map(doc => ({ id: doc.$id, name: doc.name as string }));
    } catch (error) {
        console.error("Error fetching faculties:", error);
        return [];
    }
};