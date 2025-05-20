// src/pages/StudentExamViewPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import useExamStore from '~/store/examStore'; // Re-use store for fetching all exams
import { getCurrentUserEmail, databases, Query, APPWRITE_DATABASE_ID, FACULTIES_COLLECTION_ID } from '~/utils/appwrite'; // Need db access for student/faculty
import { Exam, Student, Faculty } from 'types/models'; // Import types
import ExamCard from '../../admin/components/Exam/ExamCard'; // Use the modified card
import { Spinner } from '@heroui/react'; // Assuming Spinner from heroui/react

// Define a basic type for the student document relevant to this page
interface StudentData {
    $id: string;
    name: string;
    class: string;
    facultyId: string;
    section: string;
    stdEmail: string; // Should match logged-in user email
    // Include other fields if needed, but these are essential for filtering
}

const STUDENTS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID; // Make sure you have this env var


const StudentExamViewPage: React.FC = () => {
    // Get necessary state and actions from exam store
    const {
        exams,
        loading: examsLoading, // Rename to avoid conflict
        error: examsError,     // Rename to avoid conflict
        fetchExams,
        setError: setExamStoreError // Alias setError from store
    } = useExamStore();

    // Local state for student data
    const [student, setStudent] = useState<StudentData | null>(null);
    const [studentFacultyName, setStudentFacultyName] = useState<string | null>(null);
    const [studentLoading, setStudentLoading] = useState(true);
    const [studentError, setStudentError] = useState<string | null>(null);

    // --- Fetch Logged-in Student Data ---
    useEffect(() => {
        const loadStudentData = async () => {
            setStudentLoading(true);
            setStudentError(null);
            setExamStoreError(null); // Clear any previous exam store errors

            try {
                const userEmail = await getCurrentUserEmail();

                if (!userEmail) {
                    setStudentError("User not logged in or email not available.");
                    setStudentLoading(false);
                    return;
                }

                 console.log("Fetching student data for email:", userEmail);

                // Query Appwrite for the student document by email
                const studentsResponse = await databases.listDocuments(
                    APPWRITE_DATABASE_ID,
                    STUDENTS_COLLECTION_ID,
                    [Query.equal('stdEmail', userEmail), Query.limit(1)] // Limit to 1 as email should be unique
                );

                if (studentsResponse.documents.length === 0) {
                    setStudentError("Student profile not found for this email.");
                    setStudentLoading(false);
                    return;
                }

                const studentDoc = studentsResponse.documents[0] as StudentData;
                setStudent(studentDoc);
                console.log("Student data fetched:", studentDoc);

                // Fetch the faculty document using the student's facultyId
                const facultyResponse = await databases.getDocument(
                    APPWRITE_DATABASE_ID,
                    FACULTIES_COLLECTION_ID,
                    studentDoc.facultyId // Assuming facultyId is the $id of the Faculty document
                );

                const facultyDoc = facultyResponse as Faculty;
                setStudentFacultyName(facultyDoc.name);
                console.log("Student Faculty name fetched:", facultyDoc.name);

                 // --- After successfully loading student data, fetch exams ---
                 // We trigger this fetch only AFTER we know which student we are dealing with.
                fetchExams();

            } catch (err: any) {
                console.error("Error loading student data or faculty:", err);
                setStudentError("Failed to load your profile data: " + (err.message || 'Unknown error'));
                 // Also potentially set exam store error if subsequent fetch fails
                 setExamStoreError("Failed to fetch exams: " + (err.message || 'Unknown error')); // Default exam error
            } finally {
                setStudentLoading(false);
            }
        };

        loadStudentData();

    }, [fetchExams, setExamStoreError]); // Dependencies ensure effect runs if these functions change

     // --- Memoized Filtered Exams ---
    const filteredExams = useMemo(() => {
        // We can only filter if we have the student's required data and the exams
        if (!student || !studentFacultyName || exams.length === 0) {
            return []; // Cannot filter yet or no exams to filter
        }

        const studentClassName = student.class;
        const studentSectionName = student.section;

        console.log(`Filtering exams for Student: Faculty=${studentFacultyName}, Class=${studentClassName}, Section=${studentSectionName}`);

        return exams.filter(exam => {
            // Check Faculty: Exam faculty array contains student's faculty name OR exam faculty array is empty ('All Faculties')
            const facultyMatch = (exam.faculty && exam.faculty.length === 0) || (exam.faculty && exam.faculty.includes(studentFacultyName));

            // Check Class: Exam class array contains student's class name OR exam class array is empty ('All Classes')
            const classMatch = (exam.class && exam.class.length === 0) || (exam.class && exam.class.includes(studentClassName));

            // Check Section: Exam section array contains student's section name OR exam section array is empty ('All Sections')
            const sectionMatch = (exam.section && exam.section.length === 0) || (exam.section && exam.section.includes(studentSectionName));

            // An exam is relevant if it matches all three criteria
            return facultyMatch && classMatch && sectionMatch;
        });

    }, [exams, student, studentFacultyName]); // Recalculate when exams or student data changes

    // --- Render States ---

    // Show loading spinner while student data or exams are being fetched
    if (studentLoading || examsLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg" /> Loading your exams...
            </div>
        );
    }

    // Show error if student data failed to load
    if (studentError) {
        return (
             <div className="p-6 text-red-600 bg-red-100 rounded-md">
                Error loading your data: {studentError}
             </div>
        );
    }

     // Show error if exams failed to load after student data loaded
    if (examsError) {
        return (
             <div className="p-6 text-red-600 bg-red-100 rounded-md">
                Error loading exams: {examsError}
             </div>
        );
    }


    // If student data loaded but no exams are relevant
    if (filteredExams.length === 0) {
        return (
             <div className="p-6 bg-gray-100 min-h-screen">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Exams</h1>
                <div className="text-center text-gray-600 p-8 rounded-md border-2 border-dashed border-gray-300 bg-white">
                    No exams found for your Faculty, Class, and Section.
                </div>
             </div>
        );
    }

    // --- Render Filtered Exams ---
    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Exams</h1>

            {/* Display student context (Optional but helpful) */}
            {student && studentFacultyName && (
                <div className="mb-6 text-gray-700">
                    Viewing exams for: <span className="font-semibold">{studentFacultyName}</span> Faculty, <span className="font-semibold">{student.class}</span> Class, <span className="font-semibold">{student.section}</span> Section.
                </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.map((exam) => (
                    <ExamCard
                        key={exam.$id}
                        exam={exam}
                        // Provide dummy functions for onEdit/onDelete or null,
                        // but more importantly, set showActions to false
                        onEdit={() => {}}
                        onDelete={() => {}}
                        showActions={false} // Hide action buttons for students
                    />
                ))}
            </div>
        </div>
    );
};

export default StudentExamViewPage;