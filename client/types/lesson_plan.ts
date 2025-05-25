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

export interface LessonPlan extends Models.Document {
  teacherId: string;
  facultyId: string;
  className: string;
  sectionId: string;
  subject: string;
  title: string;
  description: string;
  lessonDateBS: string;
  lessonDateAD: string; // ISO string for Appwrite Datetime
  estimatedPeriods: number;
  learningObjectives?: string[];
  topicsCovered?: string[];
  teachingActivities?: string[];
  resourcesNeeded?: string[];
  assessmentMethods?: string[];
  homeworkAssignment?: string;
  status: 'Planned' | 'Completed' | 'Partially Completed' | 'Postponed' | 'Cancelled';
  actualPeriodsTaken?: number;
  completionDateAD?: string; // ISO string
  teacherReflection?: string;
}

export interface LessonPlanFormData {
  title: string;
  description: string;
  lessonDateBS: string;
  lessonDateAD: string;
  estimatedPeriods: number | string; // string for form input
  learningObjectives: string; // Comma-separated for simple input, then split
  topicsCovered: string;
  teachingActivities: string;
  resourcesNeeded: string;
  assessmentMethods: string;
  homeworkAssignment?: string;
  status: LessonPlan['status'];
  actualPeriodsTaken?: number | string;
  completionDateAD?: string;
  teacherReflection?: string;
  // Fields for context, pre-filled or selected
  facultyId: string;
  className: string;
  sectionId: string;
  subject: string;
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