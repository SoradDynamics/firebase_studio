// src/pages/student/results/StudentResultsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { databases, Query, ID, APPWRITE_DATABASE_ID, EXAMS_COLLECTION_ID, STUDENTS_COLLECTION_ID, SECTIONS_COLLECTION_ID } from '~/utils/appwrite';
import { useAuthStore } from '~/utils/authStore';
import { 
    StudentDocumentForResults, 
    Exam as AppwriteExamType, // Renamed to avoid conflict with ExamWithSummary
    ExamWithSummary, 
    StudentDetails, 
    SectionNameAndId, 
    MarkEntryDocumentForResults 
} from 'types/studentResult.types'; // Adjusted path
import { 
    parseStudentSubjectDetails, // Correct import
    processExamResultsForStudent // Correct import
} from '~/utils/resultCalculations'; // Adjusted path
import StudentExamResultCard from './StudentExamResultCard';
import StudentDetailedResultView from './StudentDetailedResultView';
import { Spinner, Button, Chip } from '@heroui/react';
import { ArrowLeftIcon, ArrowPathIcon, AcademicCapIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import ActionButton from '../../../../common/ActionButton'; // Assuming ActionButton is in common

const MARKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MARKS_COLLECTION_ID || "ExamResults";

const StudentResultsPage: React.FC = () => {
  const { user, isLoading: isLoadingAuth, fetchUser } = useAuthStore();
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);
  const [publishedExams, setPublishedExams] = useState<ExamWithSummary[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamWithSummary | null>(null);
  
  const [detailedResults, setDetailedResults] = useState<{ processedSubjects: any[], summary: any } | null>(null);

  const [isLoadingStudentDetails, setIsLoadingStudentDetails] = useState(true);
  const [isLoadingExamsList, setIsLoadingExamsList] = useState(false);
  const [isLoadingDetailedView, setIsLoadingDetailedView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialAuthAttempted, setInitialAuthAttempted] = useState(false);

   useEffect(() => {
    fetchUser().finally(() => setInitialAuthAttempted(true));
  }, [fetchUser]);

  useEffect(() => {
    if (!initialAuthAttempted || isLoadingAuth || !user?.email) {
        if(initialAuthAttempted && !isLoadingAuth && !user) {
            setIsLoadingStudentDetails(false);
            setError("Please log in to view your results.");
        }
      return;
    }

    setIsLoadingStudentDetails(true);
    setError(null);

    const fetchStudentData = async () => {
      try {
        const studentResponse = await databases.listDocuments<StudentDocumentForResults>(
          APPWRITE_DATABASE_ID,
          STUDENTS_COLLECTION_ID,
          [Query.equal('stdEmail', user.email), Query.limit(1)]
        );

        if (studentResponse.documents.length === 0) {
          setError('Student profile not found for your email.');
          setStudentDetails(null);
          return;
        }
        const studentDoc = studentResponse.documents[0];
        let studentSectionId: string | null = null;

        // Fetch section ID based on student's class name and section name
        if (studentDoc.class && studentDoc.section) {
            try {
                const sectionResponse = await databases.listDocuments<SectionNameAndId>(
                    APPWRITE_DATABASE_ID,
                    SECTIONS_COLLECTION_ID,
                    [
                        Query.equal('name', studentDoc.section), // Section name from student doc
                        Query.equal('class', studentDoc.class), // Class name from student doc
                        Query.limit(1)
                    ]
                );
                if (sectionResponse.documents.length > 0) {
                    studentSectionId = sectionResponse.documents[0].$id;
                } else {
                    console.warn(`Section ID not found for section: "${studentDoc.section}" in class: "${studentDoc.class}"`);
                }
            } catch (sectionError) {
                console.error("Error fetching student's section ID:", sectionError);
            }
        }
        
        setStudentDetails({
          id: studentDoc.$id,
          name: studentDoc.name,
          email: studentDoc.stdEmail,
          className: studentDoc.class,
          sectionName: studentDoc.section,
          sectionId: studentSectionId,
          facultyId: studentDoc.facultyId,
        });
      } catch (err: any) {
        console.error("Error fetching student details:", err);
        setError(`Failed to load student profile: ${err.message || 'Unknown error'}`);
        setStudentDetails(null);
      } finally {
        setIsLoadingStudentDetails(false);
      }
    };

    fetchStudentData();
  }, [user, isLoadingAuth, initialAuthAttempted]);

  const loadExams = useCallback(async (isReload = false) => {
    if (!studentDetails) {
        if(!isLoadingStudentDetails){ // Only show if student details aren't actively loading
             // setError("Cannot load exams: Student details are missing.");
        }
        return;
    }

    setIsLoadingExamsList(true);
    if(!isReload) { // Only clear error and exams if it's not a button initiated reload
        setError(null);
        setPublishedExams([]);
    }


    try {
      const examBaseQueries: string[] = [
        Query.equal('isPublished', true),
        Query.orderDesc('$createdAt'),
        Query.limit(100) 
      ];
      
      const examResponse = await databases.listDocuments<AppwriteExamType>(
        APPWRITE_DATABASE_ID,
        EXAMS_COLLECTION_ID,
        examBaseQueries
      );

      const allPublishedExamsDocs = examResponse.documents;
      
      const relevantExamDocs = allPublishedExamsDocs.filter(examDoc => {
        const examFaculty = examDoc.faculty || [];
        const examClass = examDoc.class || []; // These are class names in coll-exam
        const examSection = examDoc.section || []; // These are section IDs in coll-exam

        const isGeneralExam = examFaculty.length === 0 && examClass.length === 0 && examSection.length === 0;
        if (isGeneralExam) return true;

        let matches = false;
        if (examFaculty.length > 0 && studentDetails.facultyId && examFaculty.includes(studentDetails.facultyId)) {
          matches = true;
        }
        if (!matches && examClass.length > 0 && studentDetails.className && examClass.includes(studentDetails.className)) {
          matches = true;
        }
        if (!matches && examSection.length > 0 && studentDetails.sectionId && examSection.includes(studentDetails.sectionId)) {
          matches = true;
        }
        return matches;
      });
      
      const examsWithParsedDetails: ExamWithSummary[] = relevantExamDocs.map(doc => ({
        ...doc,
        subjectDetails: parseStudentSubjectDetails(doc.subjectDetails_json),
      }));

      const examsWithSummariesPromises = examsWithParsedDetails.map(async (exam) => {
        try {
          const marksResponse = await databases.listDocuments<MarkEntryDocumentForResults>(
            APPWRITE_DATABASE_ID,
            MARKS_COLLECTION_ID,
            [
              Query.equal('examId', exam.$id),
              Query.equal('studentId', studentDetails.id),
              Query.limit(exam.subjectDetails.length || 50)
            ]
          );
          const { summary, processedSubjects } = processExamResultsForStudent(exam.subjectDetails, marksResponse.documents, exam.isGpa);
          
          // If all subjects are marked absent from marks entries, override overall summary
          if (processedSubjects.length > 0 && processedSubjects.every(ps => ps.isAbsent)) {
            return { ...exam, summaryForStudent: { ...summary, overallResultStatus: 'Failed' } };
          }
          return { ...exam, summaryForStudent: summary };
        } catch (summaryError: any) {
          console.error(`Error fetching/processing marks for exam ${exam.title}:`, summaryError);
          return { ...exam, summaryForStudent: { examId: exam.$id, isGpa: exam.isGpa, overallResultStatus: 'Awaited'} };
        }
      });

      const resolvedExamsWithSummaries = await Promise.all(examsWithSummariesPromises);
      setPublishedExams(resolvedExamsWithSummaries);
      if (resolvedExamsWithSummaries.length === 0 && !error) { // Check error to avoid overwriting an existing one
        // setError("No relevant exams found for you at this time."); // Soft error or info message
      }

    } catch (err: any) {
      console.error("Error fetching published exams:", err);
      setError(`Failed to load exams: ${err.message || 'Unknown error'}`);
      setPublishedExams([]);
    } finally {
      setIsLoadingExamsList(false);
    }
  }, [studentDetails, isLoadingStudentDetails]); // Added isLoadingStudentDetails

  useEffect(() => {
    if (studentDetails && !selectedExam) {
      loadExams();
    }
  }, [studentDetails, selectedExam, loadExams]);


  const handleExamSelect = useCallback(async (exam: ExamWithSummary) => {
    if (!studentDetails) return;
    setSelectedExam(exam);
    setIsLoadingDetailedView(true);
    // setError(null); // Don't clear general errors when selecting an exam
    setDetailedResults(null);

    try {
      const marksResponse = await databases.listDocuments<MarkEntryDocumentForResults>(
        APPWRITE_DATABASE_ID,
        MARKS_COLLECTION_ID,
        [
          Query.equal('examId', exam.$id),
          Query.equal('studentId', studentDetails.id),
          Query.limit(exam.subjectDetails.length || 50)
        ]
      );
      const processed = processExamResultsForStudent(exam.subjectDetails, marksResponse.documents, exam.isGpa);
      setDetailedResults(processed);
    } catch (err: any)      {
      console.error("Error fetching detailed results:", err);
      setError(`Failed to load detailed results for ${exam.title}: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoadingDetailedView(false);
    }
  }, [studentDetails]);

  const handleGoBack = () => {
    setSelectedExam(null);
    setDetailedResults(null);
    // setError(null); // Consider if general errors should persist
    // Reload exams to refresh summaries if needed, or rely on cached data
    if (studentDetails) loadExams(); 
  };
  
  const handleReload = () => {
    setError(null); // Clear previous errors on manual reload
    if (selectedExam) {
      handleExamSelect(selectedExam);
    } else if (studentDetails) {
      loadExams(true); // Force reload of exam list
    } else if (user && !studentDetails && !isLoadingAuth) { // If user exists but student details failed
        setInitialAuthAttempted(false); // This will re-trigger the student detail fetch effect
        fetchUser().finally(() => setInitialAuthAttempted(true));
    } else if (!user && !isLoadingAuth) { // No user, prompt login or try to fetch user again
        fetchUser().finally(() => setInitialAuthAttempted(true));
    }
  };

  // Combined loading state for initial page setup
  const isInitialPageLoading = !initialAuthAttempted || isLoadingAuth || isLoadingStudentDetails;

  if (isInitialPageLoading) {
    return <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900"><Spinner label="Loading Your Data..." size="lg" color="primary"/></div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6 text-center min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900">
         <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400">Please log in to view your results.</p>
        {/* Add a login button or redirect logic here */}
      </div>
    );
  }
  
  if (error && !selectedExam && !isLoadingExamsList && publishedExams.length === 0) { 
    return (
        <div className="container mx-auto p-6 text-center min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-2">An Error Occurred</h1>
            <p className="text-red-600 dark:text-red-500">{error}</p>
            <ActionButton
                icon={<ArrowPathIcon className="h-5 w-5" />}
                onClick={handleReload}
                color="blue"
                isLoading={isLoadingExamsList || isLoadingDetailedView || isLoadingStudentDetails}
                className="mt-6"
            > Try Reloading </ActionButton>
        </div>
    );
  }
  
  if (!studentDetails && !isLoadingStudentDetails) { // This check should be after error display for student not found
     return (
      <div className="container mx-auto p-6 text-center min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900">
         <InformationCircleIcon className="h-16 w-16 text-blue-500 dark:text-blue-400 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Student Profile Not Found</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">We couldn't find a student profile associated with your account ({user.email}). Please ensure your email is correctly registered with the school system.</p>
        <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">If you believe this is an error, please contact administration.</p>
         <ActionButton
            icon={<ArrowPathIcon className="h-5 w-5" />}
            onClick={handleReload} // This will try to re-fetch student details
            color="blue"
            isLoading={isLoadingStudentDetails || isLoadingAuth}
            className="mt-6"
        > Reload Profile </ActionButton>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        {selectedExam && (
          <Button
            variant="light"
            color="primary"
            className="mr-3 p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800/30 focus:ring-2 focus:ring-indigo-300"
            onPress={handleGoBack}
            aria-label="Go back to exam list"
          >
            <ArrowLeftIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </Button>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 flex-grow">
          {selectedExam ? `Result: ${selectedExam.title}` : 'Your Exam Results'}
        </h1>
        <ActionButton
            icon={<ArrowPathIcon className="h-5 w-5" />}
            onClick={handleReload}
            color="blue" // Keep consistent or use 'neutral' for less emphasis
            variant="light" // Subtle reload button
            isLoading={isLoadingExamsList || isLoadingDetailedView || isLoadingStudentDetails}
            tooltipText="Reload Data"
            className="text-white  dark:text-indigo-400 dark:hover:text-indigo-300"
        />
      </div>
      
      {error && selectedExam && <Chip color="danger" className="mb-4 w-full p-3 text-center text-sm">{error}</Chip>} {/* Error specific to detailed view */}

      {!selectedExam ? (
        <>
          {isLoadingExamsList ? (
            <div className="flex justify-center items-center h-60"><Spinner label="Loading Exams..." size="lg" color="primary"/></div>
          ) : publishedExams.length === 0 ? (
            <div className="text-center py-10">
                <AcademicCapIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300 text-lg">No published exam results found for you.</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Please check back later or contact administration if you expect results.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {publishedExams.map(examItem => ( // Renamed exam to examItem to avoid conflict
                <StudentExamResultCard
                  key={examItem.$id}
                  exam={examItem}
                  onSelect={handleExamSelect}
                />
              ))}
            </div>
          )}
        </>
      ) : studentDetails && detailedResults ? (
        <StudentDetailedResultView
          exam={selectedExam}
          processedResults={detailedResults.processedSubjects}
          summary={detailedResults.summary}
          studentName={studentDetails.name}
          isLoading={isLoadingDetailedView} // Pass this specific loading state
        />
      ) : isLoadingDetailedView ? ( // Show spinner if loading detailed view specifically
         <div className="flex justify-center items-center h-64"><Spinner label="Loading Detailed Results..." size="lg" color="primary"/></div>
      ) : ( // Fallback if detailedResults is null but not loading (e.g., error occurred, handled by chip)
        !error && <p className="text-center text-gray-500 dark:text-gray-400 py-10">Could not load detailed results for this exam.</p>
      )
    }
    </div>
  );
};

export default StudentResultsPage;