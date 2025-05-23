// src/types/models.ts

// From coll-faculty: id, name, classes[]
export interface Faculty {
    $id: string; // Appwrite document ID
    id: string;  // Custom unique ID
    name: string;
    classes: string[];
    $createdAt?: string;
    $updatedAt?: string;
    $permissions?: string[];
    $collectionId?: string;
    $databaseId?: string;
  }
  
  // From coll-teacher: id, name, email
  export interface Teacher {
    $id: string; // Appwrite document ID
    id: string;  // Custom unique ID (this is what's stored in section.class_teacher)
    name: string;
    email: string;
    $createdAt?: string;
    $updatedAt?: string;
    $permissions?: string[];
    $collectionId?: string;
    $databaseId?: string;
  }
  
  // From coll-section: id, name, subjects[], class, facultyId, class_teacher
  export interface Section {
    $id: string; // Appwrite document ID (this is the 'id' in coll-section for Appwrite)
    name: string;
    subjects: string[];
    class: string;
    facultyId: string; // References coll-faculty.id (custom ID)
    class_teacher: string | null; // References coll-teacher.id (custom ID)
    $createdAt?: string;
    $updatedAt?: string;
    $permissions?: string[];
    $collectionId?: string;
    $databaseId?: string;
  }
  
  // Enriched type for display purposes
  export interface EnrichedSection extends Section {
    facultyName?: string;
    classTeacherName?: string;
    // studentCount?: number; // Omitting for now due to N+1 query complexity
  }
  
  // For CustomSelect
  export interface SelectOption {
    id: string | number;
    name: string;
  }