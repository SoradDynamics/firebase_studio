// src/types/routine.ts
import { Models } from 'appwrite';

export interface SelectOption {
  id: string | number;
  name: string;
}

export interface PeriodItem {
  id: string; // Unique ID for list management (e.g., uuid or nanoid)
  type: 'period';
  fromTime: string; // "HH:MM"
  toTime: string;   // "HH:MM"
  subject: string;  // Subject name
  teacherId: string;
  teacherName?: string; // Added teacherName
}

export interface BreakItem {
  id: string; // Unique ID for list management
  type: 'break';
  fromTime: string; // "HH:MM"
  toTime: string;   // "HH:MM"
  name: string;     // e.g., "Recess", "Lunch"
}

export type RoutineDescItem = PeriodItem | BreakItem;

// Document structure in Appwrite's coll-routine
export interface RoutineDocument extends Models.Document {
  faculty: string; // facultyId
  class: string;   // className (actual class name string)
  section: string; // sectionId
  desc: RoutineDescItem[];
}

// Enriched routine data for display
export interface DisplayRoutine extends RoutineDocument {
  facultyName?: string;
  sectionName?: string;
  // className is already part of RoutineDocument as `class`
  descDisplay?: (PeriodItemDisplay | BreakItemDisplay)[];
}

export interface PeriodItemDisplay extends PeriodItem {
  teacherName?: string;
}
export type BreakItemDisplay = BreakItem;


// Appwrite Document Types for reference
export interface FacultyDoc extends Models.Document {
  name: string;
  classes: string[]; // Array of class names
}

export interface SectionDoc extends Models.Document {
  name: string;
  subjects: string[]; // Array of subject names
  class: string;      // Class name
  facultyId: string;
}

export interface TeacherDoc extends Models.Document {
  name: string;
  // email is also there but not directly used in routine display logic
}

export interface RoutineFormData {
  facultyId: string | null;
  classId: string | null; // class name
  sectionId: string | null;
  desc: RoutineDescItem[];
}
