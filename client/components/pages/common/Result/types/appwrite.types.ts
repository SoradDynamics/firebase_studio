// src/types/appwrite.types.ts

// From coll-exam.subjectDetails_json
export interface SubjectDetail {
  name: string;
  date: string; // ISO date string
  theoryFM: string | number;
  theoryPM: string | number;
  hasPractical: boolean;
  practicalFM?: string | number | null;
  practicalPM?: string | number | null;
}

export interface ExamDocument {
$id: string;
$collectionId: string;
$databaseId: string;
$createdAt: string;
$updatedAt: string;
$permissions: string[];
title: string;
type: string;
faculty: string[]; // faculty IDs or names/identifiers
class: string[];   // class identifiers (e.g., "Class10", "10A")
desc?: string;
section: string[]; // section IDs (from coll-section.$id)
subjectDetails_json: string; // JSON string of SubjectDetail[]
isGpa: boolean;           // <<< ADDED (as per coll-exam schema)
isPublished: boolean;     // <<< ADDED (as per coll-exam schema)
}

// For UI, with parsed subject details
export interface Exam extends Omit<ExamDocument, 'subjectDetails_json'> {
subjectDetails: SubjectDetail[];
// isGpa and isPublished are inherited from ExamDocument
}

export interface StudentDocument {
$id: string;
$collectionId: string;
$databaseId: string;
name: string;
class: string;
facultyId: string;
section: string; // section ID
stdEmail?: string;
parentId?: string;
}

export interface SectionDocument {
$id: string;
name: string;
class: string;
}

export interface MarkEntryDocument {
$id?: string;
$collectionId?: string;
$databaseId?: string;
examId: string;
studentId: string;
classId: string;
sectionId: string;
subjectName: string;
theoryMarksObtained: number | null;
practicalMarksObtained: number | null;
isAbsent: boolean;
updatedBy?: string;
lastUpdatedAt?: string;
// isPublished is part of coll-exam, not coll-ExamResults
}

export interface StudentForMarksTable extends StudentDocument {
theoryMarksInput: string;
practicalMarksInput: string;
isAbsentInput: boolean;
existingMarkEntryId?: string;
isModified: boolean;
}

export interface SelectOption {
id: string | number;
name: string;
}

export interface FacultyDocument {
$id: string;
name: string;
}