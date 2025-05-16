// /types/models.ts
import { Models } from 'appwrite';

// Base Appwrite Document type
export interface AppwriteDocument extends Models.Document {
  // Add any common custom fields if necessary, though usually not needed here
}

export interface Student extends AppwriteDocument {
  name: string;
  class: string; // Assuming this is a class ID referencing coll-class (not shown in your schema)
                 // or just a string like "Grade 10"
  facultyId?: string; // Assuming it can be optional or linked
  section: string; // Assuming this is a section ID or name
  stdEmail?: string;
  parentId: string;
}

export interface Parent extends AppwriteDocument {
  name: string;
  email: string;
  contact?: string[];
  students?: string[]; // Array of student document IDs
}

// You can define Section and Faculty too if needed for other parts,
// but they are not directly used in this specific parent-student view component logic.
// export interface Section extends AppwriteDocument {
//   name: string;
//   subjects?: string[];
//   class: string; // class ID
//   facultyId: string; // faculty ID
// }

// export interface Faculty extends AppwriteDocument {
//   name: string;
//   classes?: string[]; // array of class IDs
// }