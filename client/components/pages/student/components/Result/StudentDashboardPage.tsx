import React, { useState, useEffect, useCallback } from 'react';
import { databases, Query, APPWRITE_DATABASE_ID, STUDENTS_COLLECTION_ID, EXAMS_COLLECTION_ID } from '~/utils/appwrite';
import { StudentDocument, Exam, ExamDocument, MarkEntryDocument, SubjectDetail } from 'types/result';
import { parseSubjectDetails } from '../../../common/Result/utils/helpers';
import { Models } from 'appwrite';

import StudentExamCard from './StudentExamCard';
import StudentMarksheet from './StudentMarksheet';
import SearchBar from '../../../common/SearchBar';
import { Spinner, Button } from '@heroui/react'; // Assuming HeroUI components
import { ArrowLeftIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const MARKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MARKS_COLLECTION_ID;

interface StudentDashboardPageProps {
  authUser: Models.User<Models.Preferences> & { email: string };
}

const StudentDashboardPage: React.FC<StudentDashboardPageProps> = ({ authUser }) => {
  const [studentData, setStudentData] = useState<StudentDocument | null>(null);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [selectedExamForMarksheet, setSelectedExamForMarksheet] = useState<Exam | null>(null);
  const [studentMarks, setStudentMarks] = useState<MarkEntryDocument[]>([]);

  const [isLoadingStudentData, setIsLoadingStudentData] = useState(true);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [isLoadingMarks, setIsLoadingMarks] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  

  useEffect(() => {
   
    const fetchRelevantExams = async () => {
      setIsLoadingExams(true);
      try {
        const queries: string[] = [
          Query.search('class', studentData.class),
          Query.search('section', studentData.section),
          Query.search('faculty', studentData.facultyId),
          Query.orderDesc('$createdAt'),
          Query.limit(50)
        ];
        const validQueries = queries.filter(q => !q.includes('""') && !q.includes("''"));
        const response = await databases.listDocuments<ExamDocument>(
          APPWRITE_DATABASE_ID,
          EXAMS_COLLECTION_ID,
          validQueries
        );
        const parsedExams = response.documents.map(doc => ({
          ...doc,
          subjectDetails: parseSubjectDetails(doc.subjectDetails_json),
        }));
        setAllExams(parsedExams);
        setFilteredExams(parsedExams);
        if (error && !selectedExamForMarksheet) setError(null);
      } catch (err: any) {
        console.error("Failed to fetch exams:", err);
        setError(prevError => prevError || "Failed to load exams. Please try again.");
      } finally {
        setIsLoadingExams(false);
      }
    };
    fetchRelevantExams();
  }, [studentData, error, selectedExamForMarksheet]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredExams(allExams);
    } else {
      const lowerSearchTerm = searchTerm.toLowerCase();
      setFilteredExams(
        allExams.filter(exam =>
          exam.title.toLowerCase().includes(lowerSearchTerm) ||
          exam.type.toLowerCase().includes(lowerSearchTerm)
        )
      );
    }
  }, [searchTerm, allExams]);

  useEffect(() => {
    if (!selectedExamForMarksheet || !studentData || !MARKS_COLLECTION_ID) {
      setStudentMarks([]);
      return;
    }
    const fetchMarks = async () => {
      setIsLoadingMarks(true);
      try {
        const response = await databases.listDocuments<MarkEntryDocument>(
          APPWRITE_DATABASE_ID,
          MARKS_COLLECTION_ID,
          [
            Query.equal('examId', selectedExamForMarksheet.$id),
            Query.equal('studentId', studentData.$id),
            Query.limit(selectedExamForMarksheet.subjectDetails.length + 5)
          ]
        );
        setStudentMarks(response.documents);
        if (error && selectedExamForMarksheet) setError(null);
      } catch (err: any) {
        console.error("Failed to fetch marks:", err);
        setError(prevError => prevError || `Failed to load marks for ${selectedExamForMarksheet.title}.`);
      } finally {
        setIsLoadingMarks(false);
      }
    };
    fetchMarks();
  }, [selectedExamForMarksheet, studentData, error, showSnackbar]);

  const handleExamSelect = (exam: Exam) => {
    setSelectedExamForMarksheet(exam);
    setError(null);
  };

  const handleBackToExams = () => {
    setSelectedExamForMarksheet(null);
    setStudentMarks([]);
    setError(null);
  };


  // ----- RENDER LOGIC -----
  // console.log(`[StudentDashboardPage] Render - isLoadingStudentData: ${isLoadingStudentData}, error: ${error}, studentData exists: ${!!studentData}`); // DEBUG

  if (isLoadingStudentData) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-4 text-center">
        <Spinner label="Loading student profile..." size="lg" />
      </div>
    );
  }

  if (!studentData && !isLoadingStudentData) { // Error occurred during profile fetch OR no student found
    return (
      <div className="container mx-auto p-6 text-center min-h-screen flex flex-col justify-center items-center">
        <UserCircleIcon className="h-16 w-16 text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-700 mb-3">Profile Issue</h1>
        <p className="text-gray-600 mb-2">{error || "Could not load student profile. No student record found."}</p>
        <p className="text-gray-500 text-sm">Please contact administration if this issue persists.</p>
      </div>
    );
  }
  
  if (!studentData) { // Fallback, should be caught by the condition above
      return (
          <div className="container mx-auto p-6 text-center min-h-screen flex flex-col justify-center items-center">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mb-4" />
              <p>An unexpected error occurred. Student data is unavailable after loading.</p>
          </div>
      );
  }

  // --- Main Content Rendering (studentData is available) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-50 py-8 px-4 md:px-6">
      <div className="container mx-auto">
        <div className="flex items-center mb-8">
          {selectedExamForMarksheet && (
            <Button
              variant="light"
              color="primary"
              className="mr-4 p-2 rounded-full hover:bg-indigo-200 transition-colors"
              onPress={handleBackToExams}
              aria-label="Back to exams"
            >
              <ArrowLeftIcon className="h-6 w-6 text-indigo-700" />
            </Button>
          )}
          <h1 className="text-3xl font-bold text-gray-800">
            {selectedExamForMarksheet ? `Marksheet: ${selectedExamForMarksheet.title}` : `${studentData.name}'s Dashboard`}
          </h1>
        </div>

        {error && (isLoadingExams || isLoadingMarks) && ( // Display errors related to exam/mark loading if profile is fine
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm">
                <ExclamationTriangleIcon className="h-5 w-5 inline mr-2" />
                {error}
            </div>
        )}

        {!selectedExamForMarksheet ? (
          <>
            <div className="mb-8 max-w-xl">
              <SearchBar
                placeholder="Search exams by title or type..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
            </div>
            {isLoadingExams ? (
              <div className="flex justify-center items-center h-64"><Spinner label="Loading exams..." size="lg"/></div>
            ) : filteredExams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.map(exam => (
                  <StudentExamCard key={exam.$id} exam={exam} onSelect={handleExamSelect} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow-md mt-6">
                <ClipboardDocumentListIcon className="h-20 w-20 text-gray-300 mx-auto mb-4"/>
                <p className="text-xl text-gray-500">
                    {allExams.length === 0 ? "No exams currently assigned or results published for you." : "No exams match your search criteria."}
                </p>
                 <p className="text-sm text-gray-400 mt-2">Please check back later or try different search terms.</p>
              </div>
            )}
          </>
        ) : (
          isLoadingMarks ? (
            <div className="flex justify-center items-center h-64"><Spinner label="Loading marksheet..." size="lg"/></div>
          ) : studentMarks.length > 0 || !error ? (
            <StudentMarksheet
              exam={selectedExamForMarksheet}
              student={studentData}
              marks={studentMarks}
            />
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-md mt-6">
                <ExclamationTriangleIcon className="h-20 w-20 text-red-300 mx-auto mb-4"/>
                <p className="text-xl text-red-500">Could not load marks for {selectedExamForMarksheet.title}.</p>
                <p className="text-sm text-gray-400 mt-2">{error || "Please try again later."}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default StudentDashboardPage;