// src/pages/parent/results/ParentResultsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { databases, Query, APPWRITE_DATABASE_ID, EXAMS_COLLECTION_ID, STUDENTS_COLLECTION_ID, SECTIONS_COLLECTION_ID } from '~/utils/appwrite';
import { useAuthStore } from '~/utils/authStore'; // Parent uses this to identify themselves
import { useSelectedStudent } from '../../contexts/SelectedStudentContext'; // Context for selected student
import {
    StudentDocumentForResults, // This is the type for a student document from Appwrite
    Exam as AppwriteExamType,
    ExamWithSummary,
    StudentDetails, // This will store the *selected* student's details
    SectionNameAndId,
    MarkEntryDocumentForResults
} from 'types/studentResult.types';
import {
    parseStudentSubjectDetails,
    processExamResultsForStudent
} from '~/utils/resultCalculations';
import StudentExamResultCard from '../../../student/components/Result/StudentExamResultCard';
import StudentDetailedResultView from '../../../student/components/Result/StudentDetailedResultView';
import SelectStudentComponent from '../Select/SelectStudent'; // Your select component
import { Spinner, Button, Chip } from '@heroui/react';
import { ArrowLeftIcon, ArrowPathIcon, AcademicCapIcon, ExclamationTriangleIcon, UserGroupIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import ActionButton from '../../../../common/ActionButton';

const MARKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MARKS_COLLECTION_ID || "ExamResults";

const ParentResultsPage: React.FC = () => {
  const { user, isLoading: isLoadingAuth, fetchUser: fetchParentUser } = useAuthStore(); // Auth for the parent
  const { selectedStudentId } = useSelectedStudent(); // Get the ID of the student selected by the parent

  const [selectedStudentDetails, setSelectedStudentDetails] = useState<StudentDetails | null>(null);
  const [publishedExams, setPublishedExams] = useState<ExamWithSummary[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamWithSummary | null>(null);
  const [detailedResults, setDetailedResults] = useState<{ processedSubjects: any[], summary: any } | null>(null);

  const [isLoadingSelectedStudentDetails, setIsLoadingSelectedStudentDetails] = useState(false);
  const [isLoadingExamsList, setIsLoadingExamsList] = useState(false);
  const [isLoadingDetailedView, setIsLoadingDetailedView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialAuthAttempted, setInitialAuthAttempted] = useState(false);

  useEffect(() => {
    fetchParentUser().finally(() => setInitialAuthAttempted(true));
  }, [fetchParentUser]);

  // Effect to fetch details of the *selected* student when selectedStudentId changes
  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudentDetails(null);
      setPublishedExams([]); // Clear exams if no student is selected
      setSelectedExam(null);  // Clear selected exam
      setDetailedResults(null); // Clear detailed results
      setError(null); // Clear errors
      return;
    }

    setIsLoadingSelectedStudentDetails(true);
    setError(null); // Clear previous errors
    setSelectedExam(null); // Reset selected exam when student changes
    setDetailedResults(null); // Reset detailed results


    const fetchStudentData = async () => {
      try {
        // Fetch the full document for the selected student
        const studentDoc = await databases.getDocument<StudentDocumentForResults>(
          APPWRITE_DATABASE_ID,
          STUDENTS_COLLECTION_ID,
          selectedStudentId
        );

        if (!studentDoc) {
          setError(`Student profile not found for ID: ${selectedStudentId}.`);
          setSelectedStudentDetails(null);
          return;
        }

        let studentSectionId: string | null = null;
        if (studentDoc.class && studentDoc.section) {
            try {
                const sectionResponse = await databases.listDocuments<SectionNameAndId>(
                    APPWRITE_DATABASE_ID,
                    SECTIONS_COLLECTION_ID,
                    [
                        Query.equal('name', studentDoc.section),
                        Query.equal('class', studentDoc.class), // Match class name
                        Query.limit(1)
                    ]
                );
                if (sectionResponse.documents.length > 0) {
                    studentSectionId = sectionResponse.documents[0].$id;
                } else {
                    console.warn(`Section ID not found for section: "${studentDoc.section}" in class: "${studentDoc.class}" for student ${studentDoc.name}`);
                }
            } catch (sectionError) {
                console.error("Error fetching selected student's section ID:", sectionError);
            }
        }
        
        setSelectedStudentDetails({
          id: studentDoc.$id,
          name: studentDoc.name,
          email: studentDoc.stdEmail, // Student's email, not parent's
          className: studentDoc.class,
          sectionName: studentDoc.section,
          sectionId: studentSectionId,
          facultyId: studentDoc.facultyId,
        });
      } catch (err: any) {
        console.error("Error fetching selected student details:", err);
        setError(`Failed to load profile for selected student: ${err.message || 'Unknown error'}`);
        setSelectedStudentDetails(null);
      } finally {
        setIsLoadingSelectedStudentDetails(false);
      }
    };

    fetchStudentData();
  }, [selectedStudentId]); // This effect runs when the parent selects a different student

  // Fetch exams for the *selectedStudentDetails* (this logic is similar to StudentResultsPage)
  const loadExamsForSelectedStudent = useCallback(async (isReload = false) => {
    if (!selectedStudentDetails) { // Now depends on selectedStudentDetails
        // setError("Cannot load exams: No student selected or details missing.");
        return;
    }

    setIsLoadingExamsList(true);
    if(!isReload) {
        setError(null); // Clear only if not a button reload
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
        const examClass = examDoc.class || [];
        const examSection = examDoc.section || [];

        const isGeneralExam = examFaculty.length === 0 && examClass.length === 0 && examSection.length === 0;
        if (isGeneralExam) return true;

        let matches = false;
        if (examFaculty.length > 0 && selectedStudentDetails.facultyId && examFaculty.includes(selectedStudentDetails.facultyId)) {
          matches = true;
        }
        if (!matches && examClass.length > 0 && selectedStudentDetails.className && examClass.includes(selectedStudentDetails.className)) {
          matches = true;
        }
        if (!matches && examSection.length > 0 && selectedStudentDetails.sectionId && examSection.includes(selectedStudentDetails.sectionId)) {
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
              Query.equal('studentId', selectedStudentDetails.id), // Use selected student's ID
              Query.limit(exam.subjectDetails.length || 50)
            ]
          );
          const { summary } = processExamResultsForStudent(exam.subjectDetails, marksResponse.documents, exam.isGpa);
          return { ...exam, summaryForStudent: summary };
        } catch (summaryError: any) {
          console.error(`Error fetching/processing marks for exam ${exam.title} (student ${selectedStudentDetails.name}):`, summaryError);
          return { ...exam, summaryForStudent: { examId: exam.$id, isGpa: exam.isGpa, overallResultStatus: 'Awaited'} };
        }
      });

      const resolvedExamsWithSummaries = await Promise.all(examsWithSummariesPromises);
      setPublishedExams(resolvedExamsWithSummaries);
       if (resolvedExamsWithSummaries.length === 0 && !error && relevantExamDocs.length > 0) {
        //setError(`No results found for ${selectedStudentDetails.name} in the filtered exams.`);
      } else if (relevantExamDocs.length === 0 && !error) {
        // setError(`No exams found matching ${selectedStudentDetails.name}'s criteria.`);
      }


    } catch (err: any) {
      console.error("Error fetching published exams for selected student:", err);
      setError(`Failed to load exams for ${selectedStudentDetails.name}: ${err.message || 'Unknown error'}`);
      setPublishedExams([]);
    } finally {
      setIsLoadingExamsList(false);
    }
  }, [selectedStudentDetails]); // Depends on selectedStudentDetails

  useEffect(() => {
    if (selectedStudentDetails && !selectedExam) { // Load exams when selected student details are available
      loadExamsForSelectedStudent();
    }
  }, [selectedStudentDetails, selectedExam, loadExamsForSelectedStudent]);

  // handleExamSelect, handleGoBack, handleReload are very similar to StudentResultsPage
  // but they operate on selectedStudentDetails
  const handleExamSelectForParent = useCallback(async (exam: ExamWithSummary) => {
    if (!selectedStudentDetails) return; // Guard: must have a student selected
    setSelectedExam(exam);
    setIsLoadingDetailedView(true);
    // setError(null); // Don't clear general errors
    setDetailedResults(null);

    try {
      const marksResponse = await databases.listDocuments<MarkEntryDocumentForResults>(
        APPWRITE_DATABASE_ID,
        MARKS_COLLECTION_ID,
        [
          Query.equal('examId', exam.$id),
          Query.equal('studentId', selectedStudentDetails.id), // Use selected student's ID
          Query.limit(exam.subjectDetails.length || 50)
        ]
      );
      const processed = processExamResultsForStudent(exam.subjectDetails, marksResponse.documents, exam.isGpa);
      setDetailedResults(processed);
    } catch (err: any) {
      console.error("Error fetching detailed results for parent's selected student:", err);
      setError(`Failed to load detailed results for ${exam.title} (Student: ${selectedStudentDetails.name}): ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoadingDetailedView(false);
    }
  }, [selectedStudentDetails]);

  const handleGoBackFromDetailedView = () => {
    setSelectedExam(null);
    setDetailedResults(null);
    // setError(null); // Optionally clear error specific to detailed view
    if (selectedStudentDetails) { // Reload exams for the current student
        loadExamsForSelectedStudent();
    }
  };
  
  const handleReloadData = () => {
    setError(null);
    if (selectedExam && selectedStudentDetails) { // Reloading detailed view of current student and exam
      handleExamSelectForParent(selectedExam);
    } else if (selectedStudentDetails) { // Reloading exam list for current student
      loadExamsForSelectedStudent(true);
    } else if (!selectedStudentId && user) { // No student selected, try to reload SelectStudentComponent (implicitly done by its own effect)
      // SelectStudentComponent should refetch if parent is logged in.
      // We can also re-trigger parent auth fetch to ensure session is active
      fetchParentUser().finally(() => setInitialAuthAttempted(true));
    }
  };
  
  const isInitialPageLoading = !initialAuthAttempted || isLoadingAuth; // Parent auth loading

  if (isInitialPageLoading) {
    return <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900"><Spinner label="Authenticating Parent..." size="lg" color="primary"/></div>;
  }

  if (!user) { // Parent not logged in
    return (
      <div className="container mx-auto p-6 text-center min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900">
         <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Parent Portal Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400">Please log in as a parent to view student results.</p>
      </div>
    );
  }

  // Main page content
  return (
    <div className="container mx-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
       


        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
  {/* THIS IS THE HEADER SECTION WHERE THE BACK BUTTON AND TITLE ARE */}
  <div className="flex items-center flex-grow"> {/* Added a flex container for button and title */}
    {selectedExam && selectedStudentDetails && ( // <<< CORRECTED CONDITION HERE
      <Button
        variant="light"
        color="primary"
        className="mr-3 p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800/30 focus:ring-2 focus:ring-indigo-300"
        onPress={handleGoBackFromDetailedView} // Make sure this handler is correct
        aria-label="Go back to exam list"
      >
        <ArrowLeftIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
      </Button>
    )}
    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
      {selectedExam && selectedStudentDetails 
        ? `Result: ${selectedExam.title}` 
        : 'Parent Dashboard: Student Results'}
    </h1>
  </div>
  <ActionButton
      icon={<ArrowPathIcon className="h-5 w-5" />}
      onClick={handleReloadData}
      color="blue"
      variant="light"
      isLoading={isLoadingExamsList || isLoadingDetailedView || isLoadingSelectedStudentDetails}
      tooltipText="Reload All Data"
      className="text-white dark:text-indigo-400 dark:hover:text-indigo-300 self-end md:self-center"
  />
</div>

        

         {/* Select Student Component Integration */}
        <div className="mt-6">
            <SelectStudentComponent />
        </div>
      </div>

      {error && <Chip color="danger" className="my-4 w-full p-3 text-center text-sm">{error}</Chip>}
      
      {!selectedStudentId && !isLoadingSelectedStudentDetails && (
        <div className="text-center py-10 bg-white dark:bg-gray-800 shadow-md rounded-lg p-8">
            <UserGroupIcon className="h-16 w-16 text-indigo-400 dark:text-indigo-500 mx-auto mb-4" />
            <p className="text-gray-700 dark:text-gray-200 text-lg font-medium">Please select a student from the dropdown above.</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Once a student is selected, their exam results will be displayed here.</p>
        </div>
      )}
      
      {isLoadingSelectedStudentDetails && (
          <div className="flex justify-center items-center h-40"><Spinner label="Loading selected student's profile..." size="lg" color="primary"/></div>
      )}

      {selectedStudentDetails && ( // Only show results section if a student is selected and details loaded
        <>
          {!selectedExam ? ( // Viewing list of exams for the selected student
            <>
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-1">
                Results for: <span className="text-indigo-600 dark:text-indigo-400">{selectedStudentDetails.name}</span>
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Class: {selectedStudentDetails.className} - Section: {selectedStudentDetails.sectionName}
              </p>
              {isLoadingExamsList ? (
                <div className="flex justify-center items-center h-60"><Spinner label={`Loading exams for ${selectedStudentDetails.name}...`} size="lg" color="primary"/></div>
              ) : publishedExams.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                    <AcademicCapIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 text-lg">No published exam results found for {selectedStudentDetails.name}.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {publishedExams.map(examItem => (
                    <StudentExamResultCard
                      key={examItem.$id}
                      exam={examItem}
                      onSelect={handleExamSelectForParent} // Use the parent-specific handler
                    />
                  ))}
                </div>
              )}
            </>
          ) : detailedResults ? ( // Viewing detailed result for an exam
            <StudentDetailedResultView
              exam={selectedExam}
              processedResults={detailedResults.processedSubjects}
              summary={detailedResults.summary}
              studentName={selectedStudentDetails.name} // Pass selected student's name
              isLoading={isLoadingDetailedView}
            />
          ) : isLoadingDetailedView ? (
             <div className="flex justify-center items-center h-64"><Spinner label={`Loading detailed results for ${selectedStudentDetails.name}...`} size="lg" color="primary"/></div>
          ) : (
             !error && <p className="text-center text-gray-500 dark:text-gray-400 py-10">Could not load detailed results for this exam.</p>
          )}
        </>
      )}
    </div>
  );
};

export default ParentResultsPage;