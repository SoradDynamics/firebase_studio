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
  TEACHERS_COLLECTION_ID,
  getCurrentUserEmail as getCurrentUserEmailFromUtil,
} from '~/utils/appwrite';
import { StudentDocument, Leave, NotificationPayload, FacultyDocument, SectionDocument, TeacherDocument } from 'types';

export const getCurrentUserEmail = getCurrentUserEmailFromUtil;

export const getTeacherByEmail = async (email: string): Promise<TeacherDocument | null> => {
  if (!email) return null;
  try {
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      TEACHERS_COLLECTION_ID,
      [Query.equal('email', email), Query.limit(1)]
    );
    if (response.documents.length > 0) {
      return response.documents[0] as TeacherDocument;
    }
    return null;
  } catch (error) {
    console.error("Error fetching teacher by email:", email, error);
    return null;
  }
};

export const getSectionsByClassTeacherCustomId = async (teacherCustomId: string): Promise<SectionDocument[]> => {
  if (!teacherCustomId) return [];
  try {
    let sections: SectionDocument[] = [];
    let offset = 0;
    const limit = 100;
    let response;
    console.log(`[getSectionsByClassTeacherCustomId] Querying sections where coll-section.class_teacher (attribute) matches teacher's custom ID: ${teacherCustomId}`);
    do {
        response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            SECTIONS_COLLECTION_ID,
            [Query.equal('class_teacher', teacherCustomId), Query.limit(limit), Query.offset(offset)]
        );
        sections = sections.concat(response.documents as SectionDocument[]);
        offset += limit;
    } while (response.documents.length >= limit);
    console.log(`[getSectionsByClassTeacherCustomId] Found ${sections.length} sections (full docs):`, sections.map(s => ({ customId: s.id, appwriteId: s.$id, name: s.name, class_teacher: s.class_teacher })));
    return sections;
  } catch (error) {
    console.error("[getSectionsByClassTeacherCustomId] Error fetching sections by class teacher's custom ID:", teacherCustomId, error);
    throw error;
  }
};

// Fetches students.
// Assumes studentSectionValues contains the values (e.g. custom section IDs) stored in coll-student.section
export const getAllStudents = async (studentSectionValues?: string[]): Promise<StudentDocument[]> => {
  let students: StudentDocument[] = [];
  let offset = 0;
  const limit = 100;
  let response;
  const queries: string[] = [];

  console.log('[getAllStudents] Received studentSectionValues (these should match coll-student.section values):', studentSectionValues);

  if (studentSectionValues && studentSectionValues.length > 0) {
    // Query coll-student.section with the values provided
    queries.push(Query.equal('section', studentSectionValues));
    console.log(`[getAllStudents] Querying students where 'coll-student.section' is one of:`, studentSectionValues);
  } else if (studentSectionValues && studentSectionValues.length === 0) {
    console.log('[getAllStudents] studentSectionValues is an empty array. Returning 0 students.');
    return [];
  } else {
    console.log('[getAllStudents] studentSectionValues is undefined. Fetching all students (admin context).');
  }

  try {
    do {
      const currentQueries = [...queries, Query.limit(limit), Query.offset(offset)];
      response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        STUDENTS_COLLECTION_ID,
        currentQueries
      );
      students = students.concat(response.documents as StudentDocument[]);
      offset += limit;
    } while (response.documents.length >= limit);
    console.log(`[getAllStudents] Total students fetched: ${students.length}`, students.map(s => ({id: s.$id, name: s.name, section_attr_value: s.section })));
    return students;
  } catch (error) {
    console.error("[getAllStudents] Error fetching students:", error);
    throw error;
  }
};

// ... (getAllFaculties, getAllSections, updateStudentLeaveData, createNotification remain the same)
export const getAllFaculties = async (): Promise<FacultyDocument[]> => {
    try {
        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            FACULTIES_COLLECTION_ID,
            [Query.limit(100)]
        );
        return response.documents as FacultyDocument[];
    } catch (error) {
        console.error("Error fetching faculties:", error);
        throw error;
    }
};

export const getAllSections = async (): Promise<SectionDocument[]> => {
    try {
        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            SECTIONS_COLLECTION_ID,
            [Query.limit(200)]
        );
        return response.documents as SectionDocument[];
    } catch (error) {
        console.error("Error fetching sections:", error);
        throw error;
    }
};

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