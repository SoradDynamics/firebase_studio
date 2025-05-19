// src/types.ts or src/types/index.ts


// --- Teacher Type (Updated) ---
export interface Teacher {
  $id: string;          // Appwrite Document ID (system generated)
  id: string;           // Your custom ID attribute from the schema
  name: string;
  subject: string[];
  level: string[];
  qualification: string;
  base_salary: string;
  salary: string[];
  assignemnts: string[]; // Note: Typo from schema 'assignemnts' instead of 'assignments'
  notes: string[];
  email: string;
  authUserId: string;   // Link to Appwrite Auth User ID (ensure this attribute exists in Appwrite)
  $createdAt?: string;   // Appwrite metadata
  $updatedAt?: string;   // Appwrite metadata
}

// ... any other global types ...