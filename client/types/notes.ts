// src/types/index.ts
import { Models } from 'appwrite';

export interface AppwriteUser extends Models.User<Models.Preferences> {}

export interface Faculty extends Models.Document {
  name: string;
  classes: string[]; // Array of class names like "10th", "12th A"
}

export interface Section extends Models.Document {
  name: string;
  subjects?: string[]; // Optional array of subject names
  class: string; // Class name this section belongs to
  facultyId: string; // ID of the faculty this section is under
}

export interface NoteDocument {
  title: string;
  description?: string;
  noteDate: string; // ISO Date string
  facultyId?: string;
  facultyName?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  subject?: string;
  fileIds: string[];
  fileNames: string[];
  fileMimeTypes: string[];
  uploadedById: string;
  uploaderEmail: string;
}

export interface Note extends Models.Document, NoteDocument {}

export interface FileUpload {
  file: File;
  id: string; // temp id for list rendering
}

// src/types/index.ts (example)
import { Models } from 'appwrite';

export interface AppwriteUser extends Models.User<Models.Preferences> {}

export interface Note extends Models.Document {
  title: string;
  description?: string;
  noteDate: string;
  facultyId?: string;
  facultyName?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  subject?: string;
  fileIds: string[];
  fileNames: string[];
  fileMimeTypes: string[];
  uploadedById: string;
  uploaderEmail: string;
}

export interface Student extends Models.Document { // General Student type from your schema
  name: string;
  class: string; // Matches className in notes
  facultyId: string;
  sectionId: string; // Matches sectionId in notes
  stdEmail: string;
  parentId: string;
  // any other fields
}

// Specific profile needed for fetching notes
export interface StudentProfileForNotes extends Student {
  // It already includes facultyId, class, sectionId from Student
}

export interface Parent extends Models.Document {
  name: string;
  email: string;
  contact?: string[];
  students?: string[]; // Array of student $ids
}

// ... other types