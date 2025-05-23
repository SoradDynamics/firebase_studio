// src/types/index.ts

export interface Leave {
    leaveId: string;
    title: string;
    reason: string;
    periodType: 'today' | 'dateRange';
    appliedAt: string; // ISO Date string
    status: 'pending' | 'validated' | 'rejected' | 'approved';
    date?: string; // YYYY-MM-DD for 'today'
    fromDate?: string; // YYYY-MM-DD for 'dateRange'
    toDate?: string; // YYYY-MM-DD for 'dateRange'
    rejectedAt?: string; // ISO Date string
    rejectionReason?: string;
    // For UI purposes, not in DB initially
    studentId: string;
    studentName: string;
    studentClass: string;
    studentFacultyId: string;
    studentSection: string;
  }
  
  export interface StudentDocument {
    id: string; // Appwrite document ID ($id)
    name: string;
    class: string;
    facultyId: string;
    section: string;
    stdEmail: string;
    parentId: string;
    absent: string[]; // Assuming these are also JSON strings if complex
    leave: string[]; // Array of JSON strings, each representing a Leave object (without student details)
    library: string[];
    // Appwrite specific fields like $id, $collectionId etc.
    $id: string;
    $collectionId: string;
    $databaseId: string;
    $createdAt: string;
    $updatedAt: string;
    $permissions: string[];
  }
  
  export interface FacultyDocument {
    id: string; // Appwrite document ID ($id)
    name: string;
    classes: string[];
    $id: string;
    $collectionId: string;
    // ... other Appwrite fields
  }
  
  export interface SectionDocument {
    id: string; // Appwrite document ID ($id)
    name: string;
    subjects: string[];
    class: string;
    facultyId: string;
    $id: string;
    $collectionId: string;
    // ... other Appwrite fields
  }
  
  // For storing changes before applying
  export interface ModifiedLeave extends Leave {
    originalStatus: 'pending' | 'validated' | 'rejected' | 'approved';
  }
  
  export interface NotificationPayload {
      title: string;
      msg: string;
      to: string; // studentId
      valid: string; // YYYY-MM-DD (tomorrow's date)
      sender: string; // logged-in user email
      date: string; // current ISO string
  }

  export interface TeacherDocument {
    id: string; // <<< YOUR CUSTOM ID FIELD
    $id: string; // Appwrite's document ID
    name: string;
    email: string;
    // other Appwrite fields if any
    $collectionId: string;
    $databaseId: string;
    $createdAt: string;
    $updatedAt: string;
    $permissions: string[];
  }