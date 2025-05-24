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

  // types/leave_approve.ts (or your main types file)

// ... (other existing types like Leave, StudentDocument, etc.)

export interface FacultyDocument {
  $id: string;
  name: string;
  // classes?: string[]; // Assuming this exists based on schema
  // any other fields
}

export interface SectionDocument {
  $id: string;
  name: string;
  // subjects?: string[];
  class: string;
  facultyId: string;
  class_teacher: string; // This is the teacher's custom 'id' field
  // any other fields
}

// Add or ensure TeacherDocument is defined:
export interface TeacherDocument {
  $id: string; // Appwrite document ID
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  id: string; // Custom unique ID field for the teacher
  name: string;
  email: string;
  // any other fields relevant to your application
}





// types/index.ts (or types/leave_approve.ts)

// Appwrite Base Document Structure (Optional, for convenience)
export interface AppwriteDocument {
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
}

// From coll-student: id,name,class,facultyId,section,stdEmail,parentId,absent[],leave[]
export interface StudentDocument extends AppwriteDocument {
  id: string; // Custom ID
  name: string;
  class: string;
  facultyId: string; // $id from coll-faculty
  section: string; // $id from coll-section
  // stdEmail?: string;
  // parentId?: string; // $id from coll-parent
  // absent?: string[]; // Array of date strings or objects
  leave: string[]; // Array of stringified LeaveApplication objects
}

// From coll-parent: id,name,email,contact[],students[]
export interface ParentDocument extends AppwriteDocument {
  id: string; // Custom ID
  name: string;
  email: string;
  contact?: string[];
  students?: string[]; // Array of student custom IDs or $ids
}

// From coll-section: id,name,subjects[],class,facultyId,class_teacher
export interface SectionDocument extends AppwriteDocument {
  id: string; // Custom ID
  name: string;
  // subjects?: string[];
  class: string;
  facultyId: string; // $id from coll-faculty
  class_teacher: string; // Custom 'id' from coll-teacher
}

// From coll-faculty: id,name,classes[]
export interface FacultyDocument extends AppwriteDocument {
  id: string; // Custom ID
  name: string;
  // classes?: string[];
}

// From coll-teacher: id,name,email
export interface TeacherDocument extends AppwriteDocument {
  id: string; // Custom unique ID field for the teacher
  name: string;
  email: string;
  // any other fields relevant to your application
}

// Structure of a single leave application (stored as string in student.leave[])
export interface LeaveApplication {
  leaveId: string; // Unique ID for the leave request
  title: string;
  reason: string;
  type: string; // e.g., 'Sick', 'Casual', 'Urgent'
  periodType: 'today' | 'multiple_days';
  date?: string; // YYYY-MM-DD (Nepali or English, be consistent) - for 'today'
  fromDate?: string; // YYYY-MM-DD - for 'multiple_days'
  toDate?: string; // YYYY-MM-DD - for 'multiple_days'
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string; // ISO Date string
  rejectionReason?: string;
  rejectedAt?: string; // ISO Date string
  rejectedBy?: string; // Name of admin/teacher
  approvedBy?: string; // Name of admin/teacher
  approvedAt?: string; // ISO Date string
  // Any other fields like attachments, etc.
}

// Enriched Leave object used in the UI and store
export interface Leave extends LeaveApplication {
  studentId: string; // $id of the student document
  studentName: string;
  studentClass: string;
  studentFacultyId: string;
  studentSection: string; // $id of the student's section document
}

// For tracking modifications before saving
export interface ModifiedLeave extends Leave {
  // originalStatus: 'pending' | 'approved' | 'rejected';
}

// For creating notifications
export interface NotificationPayload {
  title: string;
  msg: string;
  to: string; // Student's $id (or parent's $id, depending on your notification target)
  valid: string; // Date string YYYY-MM-DD
  sender: string; // Email of the sender (admin/teacher)
  date: string; // ISO Date string of when notification was created
  // any other fields for notification
}

// Add other types if they are used in the store or components, e.g., for filters.