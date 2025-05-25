import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export * from './leave_approve';
export * from './class_teacher';

// ~/types/index.ts
export interface Faculty {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $updatedBy?: string; // Make $updatedBy optional as it might not always be present
  id: string;
  name: string;
  classes: string[];
}

export interface Section {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  id: string;
  name: string;
  subjects: string[];
  class: string;
  facultyId?: string;

}

export interface Parent {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  id: string;
  name: string;
  email: string;
  contact: string[];
  students: string[];
}

export interface Driver {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  driverId: string;
  driverName: string;
  route: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  email: string;
  authUserId?: string | null;
}



///for gallery
// src/types/index.ts
import { Models } from 'appwrite';

export interface GalleryItem extends Models.Document {
  title: string;
  fileIds: string[]; // Array of Appwrite file IDs
  faculty: string;
  // Appwrite automatically adds $id, $createdAt, $updatedAt, $permissions, $collectionId, $databaseId
}

export interface Faculty {
  value: string;
  label: string;
}


export interface StudentProfile extends Models.Document {
  userId: string; // Links to Appwrite User $id
  name: string;
  email: string;
  facultyId: string;
  class: string; // e.g., "XI", "XII"
  sectionId: string;
  // any other student-specific fields
}


export interface Student extends Models.Document {
  name: string;
  class: string;
  facultyId: string;
  section: string; // Section Name
  stdEmail?: string; // Optional
  parentId: string;
}

export interface Parent extends Models.Document {
  name: string;
  email: string;
  // Array of student document IDs (though your SelectStudentComponent fetches students via parentId on student
}