import { Models } from 'appwrite';

export interface TeacherInfo {
  id: string;
  name?: string; // Name might come from user profile or coll-teacher
  email: string;
}

// Represents a unique teaching assignment for the logged-in teacher
export interface TeacherAssignment {
  facultyId: string;
  facultyName: string;
  className: string; // Class is a name, e.g., "One"
  sectionId: string;
  sectionName: string;
  subject: string; // Subject name or code, e.g., "Mathematics"
}


export interface LessonPlanFiltersState {
  facultyId: string | null;
  className: string | null;
  sectionId: string | null;
  subject: string | null;
  status: string | null;
  searchText: string;
}

export interface Faculty extends Models.Document {
    name: string;
    // classes: string[]; // As per your schema
}

export interface Section extends Models.Document {
    name: string;
    // subjects: string[];
    // class: string;
    // facultyId: string;
}

// Helper for parsing routine desc
export interface RoutinePeriod {
    type: "period";
    fromTime: string;
    toTime: string;
    subject: string;
    teacherId: string;
}
export interface RoutineBreak {
    type: "break";
    fromTime: string;
    toTime: string;
    name: string;
}
export type RoutineDescItem = RoutinePeriod | RoutineBreak;

// src/stores/lessonPlanStore.ts



// src/types/lessonPlanTypes.ts

// Represents the context (Faculty, Class, Section, Subject) a teacher is assigned to
export interface TeacherContext {
  facultyId: string;
  facultyName: string;
  class: string; // Class name/identifier (e.g., "10", "11A")
  sectionId: string; // Document ID of the section from coll-section
  sectionName: string;
  subject: string; // Subject name (e.g., "nep", "eng")
}

// Represents a single lesson plan document from Appwrite's coll-lesson-plan
export interface LessonPlan {
  $id: string; // Appwrite document ID
  $createdAt?: string; // Appwrite internal timestamp
  $updatedAt?: string; // Appwrite internal timestamp
  teacherId: string;    // Document ID of the teacher from coll-teacher
  facultyId: string;    // Document ID of the faculty from coll-faculty
  class: string;        // Class identifier (e.g., "10", "11A")
  sectionId: string;    // Document ID of the section from coll-section
  subject: string;      // Subject name (e.g., "nep", "eng")
  title: string;
  description: string;
  lessonDateBS: string; // Date in Bikram Sambat format (e.g., "YYYY-MM-DD")
  estimatedPeriods: number;
  actualPeriodsTaken?: number;
  status: 'planned' | 'completed' | 'partially-completed';
  teacherReflection?: string;
  learningObjectives?: string[];
  teachingMaterials?: string[];
  assessmentMethods?: string[];
  overallClassRating?: number; // Optional: 0-5 star rating for the class
  isPublic?: boolean;          // Optional: true if the plan is public, defaults to false
}

// Data structure for the lesson plan form (excluding Appwrite-generated fields and teacherId)
export type LessonPlanFormData = Omit<LessonPlan, '$id' | '$createdAt' | '$updatedAt' | 'teacherId'>;


// Represents a student document from Appwrite's coll-student (relevant fields)
export interface Student {
  $id: string; // Appwrite document ID
  name: string;
  // Potentially other fields like rollNo, if needed for display or selection
  // class?: string; // Already in LessonPlan, usually not needed again on Student for this context
  // section?: string; // Section name, if needed for display, but fetched via sectionId typically
  // facultyId?: string;
}


// Represents a student review document from Appwrite's coll-lesson-student-review
export interface StudentReview {
  $id: string; // Appwrite document ID
  $createdAt?: string; // Appwrite internal timestamp
  lessonPlanId: string; // Links to LessonPlan.$id
  studentId: string;    // Links to Student.$id
  studentName?: string;  // For display convenience, usually fetched separately or joined
  teacherId: string;    // Document ID of the teacher who wrote the review
  rating: number;       // Typically 1-5
  comment: string;
}

// Data structure for the student review form
export type StudentReviewFormData = Omit<StudentReview, '$id' | '$createdAt' | 'teacherId' | 'studentName'>;


// For CustomSelect component options
export interface SelectOption {
  id: string | number;
  name: string;
}

// Teacher profile information (subset from coll-teacher)
export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
}