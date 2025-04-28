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
  class: string;
  facultyId: string;
  section: string;
  stdEmail?: string;
  parentId?: string;
  absent?: string[];
  labels: string[]; // User roles/labels from Appwrite Auth
}

// Add other types if needed (Parent, Faculty, Section)