// src/types/domain.ts (Create this file)

import { Models } from 'appwrite';

// From your existing schema
export interface Teacher {
  id: string; // Custom ID attribute
  name: string;
  email: string;
  // classes[] // Assuming this is an array of class IDs or names
}
export type TeacherDocument = Teacher & Models.Document;

export interface Section {
  name: string;
  subjects: string[];
  class: string; // Class name or ID
  facultyId: string;
  class_teacher: string; // Refers to Teacher.id (custom)
}
export type SectionDocument = Section & Models.Document;

export interface Student {
  id: string; // Custom ID attribute
  name: string;
  class: string; // Class name or ID
  facultyId: string;
  section: string; // Section $id
  stdEmail: string;
  parentId: string;
}
export type StudentDocument = Student & Models.Document;

export interface Faculty {
  id: string; // Custom ID attribute
  name: string;
  // classes[]
}
export type FacultyDocument = Faculty & Models.Document;


// New Review Type
export interface Review {
  studentId: string;
  teacherId: string; // Custom teacher ID
  sectionId: string; // Section $id
  type: string;
  description: string;
  rating?: string;
  reviewDate: string; // ISO Date string
  academicYear?: string;
}
export type ReviewDocument = Review & Models.Document;

// For displaying student details with resolved names
export interface StudentWithDetails extends StudentDocument {
  facultyName?: string;
  sectionName?: string;
  // className is already part of Student as `class`
}

// For storing class teacher's authenticated info
export interface ClassTeacherInfo {
  appwriteUserId: string;
  teacherCustomId: string;
  name: string;
  email: string;
  managedSections: Array<{ id: string; name: string; className: string; facultyId: string }>; // Added facultyId
  managedFaculties: Array<{ id: string; name: string }>; // To store names of managed faculties
}