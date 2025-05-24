// src/types/models.ts (ensure SubjectDetail is also defined here)

export interface SubjectDetail {
  name: string;
  date: string;       // Exam date for this subject (ISO String AD)
  theoryFM: number;
  theoryPM: number;
  hasPractical: boolean;
  practicalFM?: number | null;
  practicalPM?: number | null;
}

export interface Exam {
  $id: string;
  title: string;
  type: string;
  desc: string;
  faculty: string[];
  class: string[];
  section: string[];

  subjectDetails: SubjectDetail[]; // For frontend use

  // Appwrite might return subjectDetails_json, which we'll parse into subjectDetails
  // We don't strictly need to add subjectDetails_json here if the store handles the mapping.
  // For clarity, the store will transform it.

  $createdAt?: string;
  $updatedAt?: string;
  // ... other Appwrite fields
}

export interface Faculty {
  $id: string;
  name: string;
  classes: string[];
  // ... other properties
}

export interface Section {
  $id: string;
  name: string;
  subjects: string[]; // Names of subjects taught in this section
  class: string;
  facultyId: string;
  // ... other properties
}
