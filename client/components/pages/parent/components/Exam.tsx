// src/pages/ParentExamViewPage.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react'; // Import useCallback
import useExamStore from '~/store/examStore';
import ExamCard from '../../admin/components/Exam/ExamCard';
import SelectStudentComponent from './Select/SelectStudent';
import ActionButton from '../../../common/ActionButton'; // Import ActionButton
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import { Student, Faculty } from 'types/models';
import { Spinner } from '@heroui/react';
import { ArrowPathIcon } from '@heroicons/react/24/outline'; // Import Refresh Icon
import { InformationCircleIcon } from '@heroicons/react/24/outline'; // Keep info icon for empty states
import { databases, Query, APPWRITE_DATABASE_ID } from '~/utils/appwrite';

// Appwrite config (Assuming these are exported in utils/appwrite.ts)
const DATABASE_ID = APPWRITE_DATABASE_ID;
const STUDENTS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID as string;
const FACULTIES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_FACULTY_COLLECTION_ID as string; // Assuming this is defined in your env
// const FACULTIES_COLLECTION_ID = FACULTIES_COLLECTION_ID;


const ParentExamViewPage: React.FC = () => {
    const { selectedStudentId } = useSelectedStudent();

    const {
        exams,
        loading: examsLoading,
        error: examsError,
        fetchExams,
        faculties, // Need faculties to map student's facultyId to name
        fetchFaculties, // Need to ensure faculties are loaded
        setError: setExamStoreError
    } = useExamStore();

    // Local state for the selected student's details
    const [selectedStudentDetails, setSelectedStudentDetails] = useState<Student | null>(null);
    const [studentDetailsLoading, setStudentDetailsLoading] = useState<boolean>(false);
    const [studentDetailsError, setStudentDetailsError] = useState<string | null>(null);
    const [selectedStudentFacultyName, setSelectedStudentFacultyName] = useState<string | null>(null);

     // New state for refresh loading
    const [isRefreshing, setIsRefreshing] = useState(false);


    // --- Fetch all exams when the page mounts ---
    useEffect(() => {
        fetchExams();
        // Also ensure faculties are fetched, as we need them to map student.facultyId to name
        fetchFaculties();
    }, [fetchExams, fetchFaculties]);

    // --- Fetch details for the selected student when selectedStudentId changes ---
    // Wrapped fetch logic in a useCallback for handleRefresh
     const fetchSelectedStudentData = useCallback(async () => {
        if (!selectedStudentId) {
            setSelectedStudentDetails(null);
            setSelectedStudentFacultyName(null);
            setStudentDetailsError(null);
            setStudentDetailsLoading(false); // Not loading if no ID
            return;
        }

        setStudentDetailsLoading(true);
        setStudentDetailsError(null);
        setSelectedStudentFacultyName(null);

        try {
            const studentDoc = await databases.getDocument<Student>(
                DATABASE_ID,
                STUDENTS_COLLECTION_ID,
                selectedStudentId
            );
            setSelectedStudentDetails(studentDoc);
             console.log("Selected student details fetched:", studentDoc);

             // Find the faculty name for this student's facultyId
             const studentFaculty = faculties.find(f => f.$id === studentDoc.facultyId);
             if (studentFaculty) {
                 setSelectedStudentFacultyName(studentFaculty.name);
                 console.log("Selected student faculty name:", studentFaculty.name);
             } else {
                 console.warn(`Faculty not found in store for student's facultyId: ${studentDoc.facultyId}`);
                 setSelectedStudentFacultyName(null);
                  setStudentDetailsError("Selected student's assigned faculty not found."); // Indicate specific issue
             }

        } catch (err: any) {
            console.error("Error fetching selected student details or faculty:", err);
            setStudentDetailsError("Failed to load student details: " + (err.message || 'Unknown error'));
            setSelectedStudentDetails(null);
            setSelectedStudentFacultyName(null);
        } finally {
            setStudentDetailsLoading(false);
        }
    }, [selectedStudentId, faculties]); // Depend on selectedStudentId and faculties

    // Effect to trigger fetching selected student data when ID changes
    useEffect(() => {
        fetchSelectedStudentData();
    }, [fetchSelectedStudentData]);


    // --- Client-side Filtering of Exams ---
    const filteredExams = useMemo(() => {
        // Can only filter if exams are loaded AND selected student details + faculty name are available
        if (examsLoading || studentDetailsLoading || !selectedStudentDetails || !selectedStudentFacultyName || exams.length === 0) {
             return [];
        }

        const studentClassName = selectedStudentDetails.class;
        const studentSectionName = selectedStudentDetails.section;
        const studentFacultyName = selectedStudentFacultyName;

        console.log(`Filtering exams for Selected Student: Faculty=${studentFacultyName}, Class=${studentClassName}, Section=${studentSectionName}`);

        return exams.filter(exam => {
            const facultyMatch = (exam.faculty && exam.faculty.length === 0) || (exam.faculty && exam.faculty.includes(studentFacultyName));
            const classMatch = (exam.class && exam.class.length === 0) || (exam.class && exam.class.includes(studentClassName));
            const sectionMatch = (exam.section && exam.section.length === 0) || (exam.section && exam.section.includes(studentSectionName));
            return facultyMatch && classMatch && sectionMatch;
        });

    }, [exams, selectedStudentDetails, selectedStudentFacultyName, examsLoading, studentDetailsLoading]);


    // --- New Refresh Handler ---
    const handleRefresh = async () => {
        if (isRefreshing || examsLoading || studentDetailsLoading) return;
        setIsRefreshing(true);
        setStudentDetailsError(null); // Clear student details error before refreshing
        setExamStoreError(null); // Clear exam store error before refreshing

        try {
            // Re-fetch selected student data (only if a student is selected)
            if (selectedStudentId) {
                await fetchSelectedStudentData(); // This also depends on faculties
            }

            // Re-fetch all exams
            await fetchExams();

        } catch (err) {
            console.error("Failed to refresh data:", err);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Combine relevant loading states
     const overallLoading = studentDetailsLoading || examsLoading || isRefreshing;
     // Combine errors
     const overallError = studentDetailsError || examsError;


     // --- Render States ---

     // Initial loading state (show spinner if no data fetched yet)
     if (overallLoading && !selectedStudentDetails && exams.length === 0 && !selectedStudentId) { // Only show initial if no student selected yet
         return (
             <div className="flex justify-center items-center h-64">
                 <Spinner size="lg" /> Loading data...
             </div>
         );
     }

     // Show overall error if any occurred and nothing is currently loading
    if (overallError && !overallLoading) {
        return (
             <div className="p-6 text-red-600 bg-red-100 rounded-md">
                Error: {overallError}
             </div>
        );
    }


    return (
        <div className="p-6 bg-gray-100 min-h-screen relative"> {/* Make relative for overlay */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Parent Dashboard</h1>
                 {/* Refresh Button */}
                 <div className="flex items-center gap-2">
                     {isRefreshing && <Spinner size="sm"/>} {/* Small spinner next to button */}
                     <ActionButton
                         icon={<ArrowPathIcon className="h-5 w-5" />}
                         color="blue" onClick={handleRefresh} isIconOnly={true}
                        //  isDisabled={overallLoading} // Disable while any relevant async operation is active
                     />
                 </div>
            </div>

            {/* Render the Select Student Component */}
            {/* This component manages its own loading/error for the student list */}
            <SelectStudentComponent />

             {/* Optional: Render Display Student Component (shows details of selected student) */}
             {/* It uses selectedStudentId from context and handles its own loading/error *for the details fetch* */}
             {/* We show it while loading details too so the spinner inside it is visible */}
            


            {/* Exam List Header */}
             <h2 className="text-xl font-semibold text-gray-800 mb-4">Exams for Selected Student</h2>

             {/* Exam List */}
             {!selectedStudentId ? (
                 <div className="p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center">
                    <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-3 text-lg font-medium text-gray-800">No Student Selected</h3>
                    <p className="mt-1.5 text-sm text-gray-600">
                        Please select a student above to see their exams.
                    </p>
                </div>
             ) : filteredExams.length === 0 && !overallLoading ? ( // Check overallLoading here
                <div className="text-center text-gray-600 p-8 rounded-md border-2 border-dashed border-gray-300 bg-white">
                    No exams found for the selected student's criteria.
                </div>
            ) : (
                 // Apply opacity and pointer-events-none if overallLoading is active
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${overallLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {filteredExams.map((exam) => (
                        <ExamCard
                            key={exam.$id} exam={exam} onEdit={() => {}} onDelete={() => {}}
                            showActions={false} // Hide action buttons for parents viewing
                        />
                    ))}
                </div>
            )}

            {/* Loading Overlay */}
            {overallLoading && (
                 <div className="absolute inset-0 flex justify-center items-center bg-gray-200 bg-opacity-60 z-10 rounded-md">
                      <Spinner size="lg"/> Loading...
                 </div>
             )}


        </div>
    );
};

export default ParentExamViewPage;