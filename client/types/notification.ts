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
  senderRole?: string; // Role name of the sender (e.g., "Faculty", "Admin") - already in your example
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

// For Parent's Children Details
export interface ChildStudentDetails {
  $docId: string;       // Student document ID from coll-student
  userId: string;       // Student's Appwrite User ID (from coll-student.id field)
  name?: string;
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
  students: string[]; // Array of student *document* IDs
  childrenDetails: ChildStudentDetails[];
  labels: string[]; // User labels (e.g., ['parent']) from Appwrite auth user
}

// ---- NEW: TeacherData ----
export interface TeacherData {
  $id: string; // Document ID from coll-teacher
  id: string;  // User ID (from auth - Appwrite User ID)
  name: string;
  email?: string;
  // Add other teacher-specific fields from coll-teacher that might be used for notification targeting
  facultyId?: string; // Example: if teachers belong to a faculty (ensure this is in coll-teacher)
  assignedClasses?: string[]; // Example: if teachers are assigned to specific classes (ensure this is in coll-teacher)
  labels: string[]; // User labels (e.g., ['teacher']) from Appwrite auth user
}

// Union type for user data that NotificationContext will handle
export type UserForNotification = StudentData | ParentData | TeacherData;