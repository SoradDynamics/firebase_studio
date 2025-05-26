// src/features/student-results/types/studentResult.types.ts
import { Models } from 'appwrite';

export interface SubjectDetail {
  name: string;
  date: string;
  theoryFM: number;
  theoryPM: number;
  hasPractical: boolean;
  practicalFM: number | null;
  practicalPM: number | null;
}

export interface ExamDocument extends Models.Document {
  title: string;
  type: string;
  faculty: string[];
  class: string[];
  desc?: string;
  section: string[];
  subjectDetails_json: string;
  isGpa: boolean;
  isPublished: boolean;
}

export interface Exam extends ExamDocument {
  subjectDetails: SubjectDetail[];
}

export interface StudentDocumentForResults extends Models.Document {
  name: string;
  class: string;
  facultyId: string;
  section: string;
  stdEmail: string;
}

export interface SectionNameAndId extends Models.Document {
    name: string;
    // class: string; // if your section collection has a 'class' (name) attribute
}

export interface StudentDetails {
    id: string;
    name: string;
    email: string;
    className: string;
    sectionName: string;
    sectionId: string | null;
    facultyId: string;
}

export interface MarkEntryDocumentForResults extends Models.Document {
  examId: string;
  studentId: string;
  subjectName: string;
  theoryMarksObtained: number | null;
  practicalMarksObtained: number | null;
  isAbsent: boolean;
}

export interface GpaInfo {
  grade: string;
  point: number;
}

export interface ProcessedSubjectResult {
  subjectName: string;
  theoryFM: number;
  theoryPM: number;
  practicalFM: number | null;
  practicalPM: number | null;
  hasPractical: boolean;
  theoryMarksObtained: number | null;
  practicalMarksObtained: number | null;
  isAbsent: boolean;
  theoryPercentage?: number | null;
  practicalPercentage?: number | null;
  theoryGpa?: GpaInfo;
  practicalGpa?: GpaInfo;
  subjectAverageGpaPoint?: number;
  subjectOverallLetterGrade?: string; // Overall letter grade for the subject in GPA mode
  subjectGpaStatus?: 'Passed' | 'Failed' | 'Absent' | 'NG'; // More specific status
  subjectTotalMarksObtained?: number;
  subjectFullMarks: number;
  subjectMarksStatus?: 'Passed' | 'Failed' | 'Absent';
}

export interface ExamResultSummary {
  examId: string;
  isGpa: boolean;
  overallResultStatus: 'Passed' | 'Failed' | 'Promoted' | 'Awaited';
  finalGpa?: number;
  totalPercentage?: number;
  grandTotalMarks?: number;
  totalFullMarks?: number;
}

export interface ExamWithSummary extends Exam {
  summaryForStudent?: ExamResultSummary;
}