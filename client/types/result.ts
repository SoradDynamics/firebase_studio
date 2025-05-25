// ... (existing types)

// From coll-student
export interface StudentDocument {
    $id: string;
    $collectionId: string;
    $databaseId: string;
    name: string;
    class: string;         // e.g., "Class10ID" or "10"
    facultyId: string;     // e.g., "ScienceFacultyID"
    section: string;       // e.g., "SectionAID" or "A" (this should be the ID)
    stdEmail?: string;      // Email used for login
    userId?: string;        // Appwrite User ID (RECOMMENDED for linking to auth user)
    parentId?: string;
    absent?: string[];
    leave?: string[];
    fee?: string[]; // Assuming fee details might be complex, maybe an array of FeeEntry IDs
    // ... other fields
  }
  
  // From coll-exam
  export interface SubjectDetail {
    name: string;
    date: string;
    theoryFM: string | number;
    theoryPM: string | number;
    hasPractical: boolean;
    practicalFM?: string | number | null;
    practicalPM?: string | number | null;
  }
  
  export interface ExamDocument {
    $id: string;
    title: string;
    type: string;
    faculty: string[]; // Array of faculty IDs
    class: string[];   // Array of class IDs
    section: string[]; // Array of section IDs
    subjectDetails_json: string; // JSON string of SubjectDetail[]
    // Add any other relevant fields like examDate, status ('Published', 'Upcoming')
    status?: 'Upcoming' | 'Ongoing' | 'ResultsPublished' | 'Graded';
    examStartDate?: string; // ISO Date
    // ... other fields
  }
  
  export interface Exam extends Omit<ExamDocument, 'subjectDetails_json'> {
    subjectDetails: SubjectDetail[];
  }
  
  // From coll-marks (MarkEntryDocument is already defined, ensure it's suitable)
  export interface MarkEntryDocument {
    $id?: string;
    examId: string;
    studentId: string;
    classId: string; // Student's class ID at the time of exam
    sectionId: string; // Student's section ID at the time of exam
    subjectName: string; // Name of the subject
    theoryMarksObtained: number | null;
    practicalMarksObtained: number | null;
    isAbsent: boolean;
    // ... other fields like remarks, grade
  }