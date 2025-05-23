// src/services/appwriteService.ts
import {
    databases,
    Query,
    ID,
    APPWRITE_DATABASE_ID,
    STUDENTS_COLLECTION_ID,
    FACULTIES_COLLECTION_ID,
    SECTIONS_COLLECTION_ID,
    NOTIFICATIONS_COLLECTION_ID,
    getCurrentUserEmail,
  } from '~/utils/appwrite';
  import { StudentDocument, Leave, NotificationPayload, FacultyDocument, SectionDocument } from 'types/leave_approve';
  
  // Fetch all students (might need pagination for large datasets)
  export const getAllStudents = async (): Promise<StudentDocument[]> => {
    let students: StudentDocument[] = [];
    let offset = 0;
    const limit = 100; // Appwrite's max limit per query, adjust as needed
    let response;
  
    try {
      do {
        response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          STUDENTS_COLLECTION_ID,
          [Query.limit(limit), Query.offset(offset)]
        );
        students = students.concat(response.documents as StudentDocument[]);
        offset += limit;
      } while (response.documents.length >= limit);
      return students;
    } catch (error) {
      console.error("Error fetching students:", error);
      throw error;
    }
  };
  
  // Fetch all faculties
  export const getAllFaculties = async (): Promise<FacultyDocument[]> => {
      try {
          const response = await databases.listDocuments(
              APPWRITE_DATABASE_ID,
              FACULTIES_COLLECTION_ID,
              [Query.limit(100)] // Adjust if more than 100 faculties
          );
          return response.documents as FacultyDocument[];
      } catch (error) {
          console.error("Error fetching faculties:", error);
          throw error;
      }
  };
  
  // Fetch all sections
  export const getAllSections = async (): Promise<SectionDocument[]> => {
      try {
          const response = await databases.listDocuments(
              APPWRITE_DATABASE_ID,
              SECTIONS_COLLECTION_ID,
              [Query.limit(200)] // Adjust if more
          );
          return response.documents as SectionDocument[];
      } catch (error) {
          console.error("Error fetching sections:", error);
          throw error;
      }
  };
  
  
  // Update a student's leave array
  export const updateStudentLeaveData = async (studentId: string, updatedLeaveArray: string[]): Promise<StudentDocument> => {
    try {
      const response = await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        STUDENTS_COLLECTION_ID,
        studentId,
        { leave: updatedLeaveArray }
      );
      return response as StudentDocument;
    } catch (error) {
      console.error(`Error updating leave data for student ${studentId}:`, error);
      throw error;
    }
  };
  
  // Create a notification
  export const createNotification = async (payload: NotificationPayload): Promise<void> => {
    try {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        ID.unique(),
        payload
      );
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  };
  
  export { getCurrentUserEmail };