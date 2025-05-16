// ~/types/index.ts

export interface NotifyDocument {
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  title: string;
  msg: string;
  to: string[]; // Array of strings like "id:...", "role:...", "facultyId:..." etc.
  valid: string; // ISO 8601 date string
  sender: string; // Appwrite User ID of the sender
  senderRole?: string; // <<< ADDED: Optional role name of the sender (e.g., "Faculty", "Admin")
  date: string; // ISO 8601 date string when sent
}

export interface StudentData {
  $id: string; // Appwrite Document ID for coll-student
  id: string; // User ID from Appwrite Auth
  name: string;
  class?: string;
  facultyId?: string;
  section?: string;
  stdEmail?: string;
  parentId?: string;
  absent?: string[];
  labels: string[]; // User roles/labels from Appwrite Auth
}

// Add other types if needed (Parent, Faculty, Section)

// ~/types/notification.ts
import { Models } from 'appwrite';

export interface NotifyDocument extends Models.Document {
  title: string;
  msg: string;
  to: string[]; // e.g., ["id:USER_ID", "role:student", "class:10A"]
  valid: string; // ISO Datetime
  sender: string; // User ID or system
  date: string; // ISO Datetime
  readBy?: string[];
  type?: string;
}


// For Parent's Children Details
export interface ChildStudentDetails {
  $docId: string;       // Student document ID from coll-student
  userId: string;       // Student's Appwrite User ID (from coll-student.id field)
  name?: string;        // Student's name (optional, for display if needed)
  class?: string;
  section?: string;
  facultyId?: string;
}

// For Parent
export interface ParentData {
  $id: string; // Document ID from coll-parent
  id: string; // User ID (from auth, this is the parent's own Appwrite User ID)
  name: string;
  email?: string;
  students: string[]; // Array of student *document* IDs (from coll-parent.students field)
  childrenDetails: ChildStudentDetails[]; // Populated by ParentContext based on 'students' array
  labels: string[]; // User labels (e.g., ['parent']) from Appwrite auth user
}

// Union type for user data that NotificationContext will handle
export type UserForNotification = StudentData | ParentData | TeacherData;

// ---- NEW: TeacherData ----
export interface TeacherData {
  $id?: string; // Document ID from coll-teacher (if you have one) or User ID
  id: string;  // User ID (from auth) - THIS IS THE ONE TO USE FOR 'id:' TARGETS
  name: string;
  email?: string;
  subjects?: string[]; // Example: if teachers are linked to subjects
  facultyId?: string;  // Example: if teachers belong to a faculty
  assignedClasses?: string[]; // Example: if teachers are assigned to specific classes
  labels: string[]; // User labels (e.g., ['teacher']) from Appwrite auth user
  // Add other teacher-specific fields as needed
}
