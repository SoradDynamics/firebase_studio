// src/pages/admin/appwriteService.ts
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
} from '~/utils/appwrite';

import {
  StudentDocument,
  FacultyDocument,
  SectionDocument,
  NotificationPayload,
  TeacherDocument
} from 'types'; // Adjust path if your types are elsewhere, e.g., 'types/index'

// Fetch all students (can be used as a fallback for admins)
export const getAllStudents = async (): Promise<StudentDocument[]> => {
let students: StudentDocument[] = [];
let offset = 0;
const limit = 100;
let response;
console.log("[Service.getAllStudents] Fetching all students...");
try {
  do {
    response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      STUDENTS_COLLECTION_ID,
      [Query.limit(limit), Query.offset(offset)]
    );
    students = students.concat(response.documents as StudentDocument[]);
    offset += response.documents.length; // Correct increment
  } while (response.documents.length >= limit && students.length < response.total);
  console.log(`[Service.getAllStudents] Fetched ${students.length} students.`);
  return students;
} catch (error) {
  console.error("[Service.getAllStudents] Error fetching students:", error);
  throw error;
}
};

// Fetch all faculties
export const getAllFaculties = async (): Promise<FacultyDocument[]> => {
  console.log("[Service.getAllFaculties] Fetching all faculties...");
  try {
      const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          FACULTIES_COLLECTION_ID,
          [Query.limit(100)]
      );
      console.log(`[Service.getAllFaculties] Fetched ${response.documents.length} faculties.`);
      return response.documents as FacultyDocument[];
  } catch (error) {
      console.error("[Service.getAllFaculties] Error fetching faculties:", error);
      throw error;
  }
};

// Fetch all sections
export const getAllSections = async (): Promise<SectionDocument[]> => {
  console.log("[Service.getAllSections] Fetching all sections...");
  try {
      const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          SECTIONS_COLLECTION_ID,
          [Query.limit(200)]
      );
      console.log(`[Service.getAllSections] Fetched ${response.documents.length} sections.`);
      return response.documents as SectionDocument[];
  } catch (error) {
      console.error("[Service.getAllSections] Error fetching sections:", error);
      throw error;
  }
};

// Update a student's leave array
export const updateStudentLeaveData = async (studentId: string, updatedLeaveArray: string[]): Promise<StudentDocument> => {
console.log(`[Service.updateStudentLeaveData] Updating leave for student ${studentId}`);
try {
  const response = await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    STUDENTS_COLLECTION_ID,
    studentId,
    { leave: updatedLeaveArray }
  );
  return response as StudentDocument;
} catch (error) {
  console.error(`[Service.updateStudentLeaveData] Error updating leave data for student ${studentId}:`, error);
  throw error;
}
};

// Create a notification
export const createNotification = async (payload: NotificationPayload): Promise<void> => {
console.log(`[Service.createNotification] Creating notification for: ${payload.to}`);
try {
  await databases.createDocument(
    APPWRITE_DATABASE_ID,
    NOTIFICATIONS_COLLECTION_ID,
    ID.unique(),
    payload
  );
} catch (error) {
  console.error("[Service.createNotification] Error creating notification:", error);
  throw error;
}
};

export const getTeacherByEmail = async (email: string): Promise<TeacherDocument | null> => {
if (!TEACHERS_COLLECTION_ID) {
  console.error("[Service.getTeacherByEmail] TEACHERS_COLLECTION_ID is not defined.");
  return null; // Return null instead of throwing to allow graceful fallback
}
console.log(`[Service.getTeacherByEmail] Fetching teacher by email: ${email}`);
try {
  const response = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    TEACHERS_COLLECTION_ID,
    [Query.equal('email', email), Query.limit(1)]
  );
  if (response.documents.length > 0) {
    console.log(`[Service.getTeacherByEmail] Found teacher:`, response.documents[0]);
    return response.documents[0] as TeacherDocument;
  }
  console.log(`[Service.getTeacherByEmail] No teacher found for email: ${email}`);
  return null;
} catch (error) {
  console.error(`[Service.getTeacherByEmail] Error fetching teacher by email ${email}:`, error);
  return null;
}
};

export const getSectionsByClassTeacherId = async (teacherCustomId: string): Promise<SectionDocument[]> => {
console.log(`[Service.getSectionsByClassTeacherId] Fetching sections for teacher custom ID: ${teacherCustomId}`);
try {
  const response = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    SECTIONS_COLLECTION_ID,
    [
      Query.equal('class_teacher', teacherCustomId),
      Query.limit(50)
    ]
  );
  console.log(`[Service.getSectionsByClassTeacherId] Found ${response.documents.length} sections for teacher ID ${teacherCustomId}.`);
  return response.documents as SectionDocument[];
} catch (error) {
  console.error(`[Service.getSectionsByClassTeacherId] Error fetching sections for teacher ID ${teacherCustomId}:`, error);
  throw error; // Re-throw to be caught by calling function
}
};

/**
* Fetches students belonging to the given section names AND optionally matching faculty and class.
* - coll-student.section stores the NAME of the section.
* - coll-student.facultyId stores the $ID of the faculty.
* - coll-student.class stores the class name/identifier.
*/
export const getStudentsBySectionDetails = async (
  sectionNames: string[],
  facultyIds?: string[],
  classNames?: string[]
): Promise<StudentDocument[]> => {
console.log(`[Service.getStudentsBySectionDetails] Fetching students for section NAMES: ${sectionNames.join(', ')}`);
if (!sectionNames || sectionNames.length === 0) {
  console.warn("[Service.getStudentsBySectionDetails] No section names provided. Returning empty array.");
  return [];
}
if (!STUDENTS_COLLECTION_ID || !APPWRITE_DATABASE_ID) {
  console.error("[Service.getStudentsBySectionDetails] STUDENTS_COLLECTION_ID or APPWRITE_DATABASE_ID is not defined!");
  return [];
}

let students: StudentDocument[] = [];
const limit = 50; // Appwrite query limit

const queries: string[] = [Query.equal('section', sectionNames)]; // student.section is student's section_name

if (facultyIds && facultyIds.length > 0) {
    console.log(`[Service.getStudentsBySectionDetails] Adding facultyId filter ($IDs): ${facultyIds.join(', ')}`);
    queries.push(Query.equal('facultyId', facultyIds)); // student.facultyId is faculty $ID
}
if (classNames && classNames.length > 0) {
    console.log(`[Service.getStudentsBySectionDetails] Adding class filter (names): ${classNames.join(', ')}`);
    queries.push(Query.equal('class', classNames)); // student.class is class name
}

queries.push(Query.limit(limit));
console.log(`[Service.getStudentsBySectionDetails] Final queries for students:`, queries.join('; '));

try {
  let offset = 0;
  let response;
  do {
    console.log(`[Service.getStudentsBySectionDetails] Querying with offset: ${offset}`);
    response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      STUDENTS_COLLECTION_ID,
      [...queries, Query.offset(offset)]
    );
    console.log(`[Service.getStudentsBySectionDetails] Response for offset ${offset}: ${response.documents.length} docs. Total estimate: ${response.total}`);
    if (response.documents.length > 0) {
         console.log(`[Service.getStudentsBySectionDetails] Sample raw student doc (section: ${response.documents[0].section}, facultyId: ${response.documents[0].facultyId}, class: ${response.documents[0].class}):`, response.documents[0].name);
    }
    students = students.concat(response.documents as StudentDocument[]);
    offset += response.documents.length;
  } while (response.documents.length >= limit && (response.total === 0 || students.length < response.total)); // Check against total if available
  
  console.log(`[Service.getStudentsBySectionDetails] Fetched ${students.length} students.`);
  if (students.length > 0 && students.length < 3) {
    console.log(`[Service.getStudentsBySectionDetails] Sample casted students:`, students.map(s => ({name: s.name, section: s.section, facultyId: s.facultyId, class: s.class})));
  }
  return students;
} catch (error: any) {
  console.error("[Service.getStudentsBySectionDetails] Error fetching students by section details:", error);
   if (error.response) {
      console.error("[Service.getStudentsBySectionDetails] Appwrite error details:", JSON.stringify(error.response, null, 2));
  }
  if (error.code === 401 || error.type === 'user_unauthorized' || (error.message && error.message.toLowerCase().includes("permission"))) {
      console.error("[Service.getStudentsBySectionDetails] POTENTIAL PERMISSION ISSUE.");
  }
  return []; // Return empty on error
}
};