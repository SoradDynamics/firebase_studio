//for result

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
  }
  
  // For UI, with parsed subject details
  export interface Exam extends Omit<ExamDocument, 'subjectDetails_json'> {
    subjectDetails: SubjectDetail[];
  }
  
  export interface StudentDocument {
    $id: string;
    $collectionId: string;
    $databaseId: string;
    // Add other fields from your coll-student schema as needed
    name: string;
    class: string; // class identifier (e.g., "Class10", "10A")
    facultyId: string; // faculty ID or name/identifier
    section: string; // section ID (from coll-section.$id)
    stdEmail?: string;
    parentId?: string;
    // ... other fields
  }
  
  export interface SectionDocument {
    $id: string;
    name: string;
    class: string; // Parent class identifier (e.g., "Class10")
    // ... other fields from coll-section
  }
  
  
  export interface MarkEntryDocument {
    $id?: string; // Present if fetched, undefined for new entries
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
  }
  
  // For the marks entry table
  export interface StudentForMarksTable extends StudentDocument {
    theoryMarksInput: string; // Input fields are strings
    practicalMarksInput: string;
    isAbsentInput: boolean;
    existingMarkEntryId?: string; // $id of existing MarkEntryDocument
    isModified: boolean; // To track changes
  }
  
  // For CustomSelect
  export interface SelectOption {
    id: string | number;
    name: string;
  }

  // src/types/appwrite.types.ts
// ... (keep existing types)

export interface FacultyDocument {
  $id: string;
  name: string;
  // ... other fields from coll-faculty
}

// ... (rest of the file)