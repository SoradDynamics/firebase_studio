// src/pages/parent/ParentAssignmentsPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
    FiCalendar, FiBookOpen, FiDownload, FiPaperclip,
    FiLoader, FiAlertTriangle, FiUsers, FiChevronDown
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    databases, storage, APPWRITE_DATABASE_ID, ASSIGNMENT_COLLECTION_ID,
  STUDENTS_COLLECTION_ID as   STUDENT_COLLECTION_ID, SECTIONS_COLLECTION_ID as SECTION_COLLECTION_ID, 
    ASSIGNMENT_FILES_BUCKET_ID
} from '~/utils/appwrite'; // Ensure your Appwrite client and IDs are here
import { Models, Query } from 'appwrite';
import { Assignment, Section } from '~/store/assignmentStore'; // Re-use types
import { Student } from 'types'; // Your student type
import { FcAbout } from 'react-icons/fc';

import SelectStudentComponent from '../Select/SelectStudent'; // Path to your component
import { useSelectedStudent } from '../../contexts/SelectedStudentContext'; // Path to your context

// Helper (same as before)
const groupAssignmentsByDate = (assignmentsArray: Assignment[]) => {
    if (!assignmentsArray || assignmentsArray.length === 0) return {};
    return assignmentsArray.reduce((acc, assignment) => {
        const date = assignment.dateBS;
        if (!acc[date]) acc[date] = [];
        acc[date].push(assignment);
        return acc;
    }, {} as Record<string, Assignment[]>);
};


const ParentAssignmentsPage: React.FC = () => {
    const { selectedStudentId } = useSelectedStudent();

    const [selectedStudentProfile, setSelectedStudentProfile] = useState<Student | null>(null);
    const [fetchedSectionId, setFetchedSectionId] = useState<string | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    
    const [isLoadingStudentProfile, setIsLoadingStudentProfile] = useState(false);
    const [isLoadingSectionId, setIsLoadingSectionId] = useState(false);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. Fetch Full Profile of the selected student
    useEffect(() => {
        if (!selectedStudentId) {
            setSelectedStudentProfile(null);
            setFetchedSectionId(null);
            setAssignments([]);
            setError(null); // Clear errors if no student is selected
            return;
        }

        const fetchStudentDetails = async () => {
            setIsLoadingStudentProfile(true);
            setError(null);
            setFetchedSectionId(null); // Reset dependent states
            setAssignments([]);

            if (!APPWRITE_DATABASE_ID || !STUDENT_COLLECTION_ID) {
                setError("Student data system is not configured correctly.");
                setIsLoadingStudentProfile(false);
                return;
            }
            try {
                console.log(`[ParentAssignmentsPage] Fetching profile for student ID: ${selectedStudentId}`);
                const studentDoc = await databases.getDocument<Student>(
                    APPWRITE_DATABASE_ID,
                    STUDENT_COLLECTION_ID,
                    selectedStudentId
                );
                setSelectedStudentProfile(studentDoc);
                console.log("[ParentAssignmentsPage] Selected student profile:", studentDoc);
                if (!studentDoc.section || !studentDoc.class || !studentDoc.facultyId) {
                    setError(`Selected student's profile (${studentDoc.name}) is incomplete (missing section name, class, or faculty ID). Cannot fetch assignments.`);
                }
            } catch (e) {
                console.error("[ParentAssignmentsPage] Error fetching selected student profile:", e);
                setError("Failed to load details for the selected student.");
                setSelectedStudentProfile(null);
            } finally {
                setIsLoadingStudentProfile(false);
            }
        };
        fetchStudentDetails();
    }, [selectedStudentId]);


    // 2. Fetch Section ID based on selectedStudentProfile details
    useEffect(() => {
        if (!selectedStudentProfile || !selectedStudentProfile.section || !selectedStudentProfile.class || !selectedStudentProfile.facultyId) {
            if (selectedStudentProfile && !isLoadingStudentProfile) {
                 // Error regarding incomplete profile is set in the previous useEffect
            }
            setAssignments([]); 
            setFetchedSectionId(null);
            return;
        }

        const fetchSectionDocumentId = async () => {
            setIsLoadingSectionId(true);
            // setError(null); // Keep error from previous step if any
            if (!APPWRITE_DATABASE_ID || !SECTION_COLLECTION_ID) {
                setError("Section data system is not configured correctly.");
                setIsLoadingSectionId(false);
                return;
            }
            try {
                console.log(`[ParentAssignmentsPage] Fetching section ID for: Name='${selectedStudentProfile.section}', Class='${selectedStudentProfile.class}', Faculty='${selectedStudentProfile.facultyId}'`);
                const sectionQuery = [
                    Query.equal("name", selectedStudentProfile.section),
                    Query.equal("class", selectedStudentProfile.class),
                    Query.equal("facultyId", selectedStudentProfile.facultyId),
                    Query.limit(1)
                ];
                const response = await databases.listDocuments<Section>(
                    APPWRITE_DATABASE_ID,
                    SECTION_COLLECTION_ID,
                    sectionQuery
                );

                if (response.documents.length > 0) {
                    const sectionDocId = response.documents[0].$id;
                    setFetchedSectionId(sectionDocId);
                    console.log(`[ParentAssignmentsPage] Found section document ID: ${sectionDocId}`);
                    if(error && error.startsWith("Selected student's profile")) setError(null); // Clear profile incomplete error if section is found
                    else if(error && error.startsWith("Could not find a matching section")) setError(null);
                } else {
                    setError(`Could not find a matching section for "${selectedStudentProfile.section}" in class "${selectedStudentProfile.class}" (Faculty ID: ${selectedStudentProfile.facultyId.substring(0,6)}...). Assignments cannot be loaded.`);
                    setFetchedSectionId(null);
                }
            } catch (e) {
                console.error("[ParentAssignmentsPage] Error fetching section ID:", e);
                setError("An error occurred while trying to identify the student's section.");
                setFetchedSectionId(null);
            } finally {
                setIsLoadingSectionId(false);
            }
        };
        fetchSectionDocumentId();
    }, [selectedStudentProfile, isLoadingStudentProfile]);


    // 3. Fetch assignments once ACTUAL section ID is available for the selected student
    useEffect(() => {
        if (!selectedStudentProfile || !fetchedSectionId || !selectedStudentProfile.facultyId || !selectedStudentProfile.class) {
            if (selectedStudentProfile && !isLoadingSectionId && fetchedSectionId === null && !isLoadingStudentProfile) {
                 // Error related to not finding sectionId should be set.
            }
            setAssignments([]);
            return;
        }
        
        const fetchStudentAssignments = async () => {
            setIsLoadingAssignments(true);
            // setError(null); // Keep previous errors unless successful
            if (!APPWRITE_DATABASE_ID || !ASSIGNMENT_COLLECTION_ID) {
                setError("Assignment system is not configured correctly.");
                setIsLoadingAssignments(false);
                return;
            }
            try {
                console.log(`[ParentAssignmentsPage] Fetching assignments for student ${selectedStudentProfile.name}: Faculty=${selectedStudentProfile.facultyId}, Class=${selectedStudentProfile.class}, SectionID=${fetchedSectionId}`);
                const queries = [
                    Query.equal('facultyId', selectedStudentProfile.facultyId),
                    Query.equal('className', selectedStudentProfile.class),
                    Query.equal('sectionId', fetchedSectionId), 
                    Query.orderDesc('dateBS')
                ];
                const response = await databases.listDocuments<Assignment>(
                    APPWRITE_DATABASE_ID,
                    ASSIGNMENT_COLLECTION_ID,
                    queries
                );
                setAssignments(response.documents);
                console.log(`[ParentAssignmentsPage] Found ${response.documents.length} assignments for ${selectedStudentProfile.name}.`);
                if (response.documents.length > 0) setError(null); // Clear error if assignments are successfully fetched

            } catch (e) {
                console.error(`[ParentAssignmentsPage] Error fetching assignments for ${selectedStudentProfile.name}:`, e);
                setError(`Failed to fetch assignments for ${selectedStudentProfile.name}.`);
                setAssignments([]);
            } finally {
                setIsLoadingAssignments(false);
            }
        };

        fetchStudentAssignments();
    }, [selectedStudentProfile, fetchedSectionId, isLoadingSectionId]);


    const groupedAndSortedAssignments = useMemo(() => {
        if (!assignments) return {};
        return groupAssignmentsByDate(assignments);
    }, [assignments]);

    const handleDownloadFile = (fileId: string, fileName: string) => { /* ... (same as Student's page) ... */ 
        if (!ASSIGNMENT_FILES_BUCKET_ID) {
            toast.error("File download system is not configured correctly.");
            return;
        }
        if (!fileId) {
            toast.error("Invalid file reference for download.");
            return;
        }
        try {
            const downloadUrl = storage.getFileDownload(ASSIGNMENT_FILES_BUCKET_ID, fileId);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', fileName || `file_${fileId.substring(0, 8)}`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Downloading ${fileName || 'file'}...`);
        } catch (e) {
            console.error("Download error:", e);
            toast.error(`Failed to initiate download: ${e instanceof Error ? e.message : "An unknown error occurred."}`);
        }
    };
    
    const currentLoadingStep = () => {
        if (isLoadingStudentProfile) return "Loading student details...";
        if (isLoadingSectionId) return "Identifying student's section...";
        if (isLoadingAssignments) return "Loading assignments...";
        return "";
    }

    return (
        <div className="p-4 md:p-6 bg-gradient-to-br from-slate-100 to-sky-100 min-h-screen">
            <div className="container mx-auto max-w-7xl">
                <header className="mb-6 md:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Child's Assignments</h1>
                </header>

                <SelectStudentComponent />

                {/* Display Area for Assignments */}
                <div className="mt-8">
                    {!selectedStudentId && (
                        <div className="p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-100 text-center">
                            <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-3 text-lg font-medium text-gray-800">Select a Student</h3>
                            <p className="mt-1.5 text-sm text-gray-600">
                                Please select one of your children from the dropdown above to view their assignments.
                            </p>
                        </div>
                    )}

                    {(isLoadingStudentProfile || isLoadingSectionId || isLoadingAssignments) && selectedStudentId && (
                         <div className="text-center py-12 text-slate-500">
                            <FiLoader className="animate-spin mx-auto h-10 w-10 text-indigo-500 mb-3" />
                            <p className="text-lg">{currentLoadingStep()}</p>
                        </div>
                    )}

                    {error && selectedStudentId && !isLoadingAssignments && !isLoadingSectionId && !isLoadingStudentProfile && (
                        <div className="my-8 p-6 text-center bg-red-50 border border-red-200 rounded-lg shadow-sm">
                            <FiAlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-3" />
                            <p className="text-xl font-semibold text-red-700">Assignments Could Not Be Loaded</p>
                            <p className="text-red-600 text-sm mt-1">{error}</p>
                        </div>
                    )}

                    {!isLoadingAssignments && !isLoadingSectionId && !isLoadingStudentProfile && !error && selectedStudentId && assignments.length === 0 && (
                         <div className="text-center py-16 text-slate-500 bg-white rounded-xl shadow-lg p-8">
                            <FcAbout className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                            <p className="text-2xl font-semibold">No Assignments Found</p>
                            <p className="text-slate-600 mt-2">
                                There are currently no assignments posted for {selectedStudentProfile?.name || 'the selected student'}'s class and section.
                            </p>
                        </div>
                    )}
                    
                    {/* Render Assignments if loaded and no errors */}
                    {selectedStudentId && !error && !isLoadingAssignments && !isLoadingSectionId && !isLoadingStudentProfile && assignments.length > 0 &&
                        Object.entries(groupedAndSortedAssignments).map(([dateBS, assignmentsOnDate]) => (
                        <div key={dateBS} className="mb-12">
                            <div className="flex items-center mb-3">
                                <FiCalendar className="text-xl text-indigo-600 mr-2" />
                                <h2 className="text-xl font-semibold text-slate-700">
                                    Due Date (BS): {dateBS}
                                    {selectedStudentProfile && <span className="text-base font-normal text-slate-500 ml-2"> (For: {selectedStudentProfile.name})</span>}
                                </h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {assignmentsOnDate.map(assignment => (
                                    <div key={assignment.$id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden group">
                                        <div className="p-5 sm:p-6 flex-grow">
                                            <h3 className="text-lg sm:text-xl font-semibold text-sky-700 leading-tight mb-1.5 group-hover:text-sky-600 transition-colors">
                                                {assignment.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center text-xs text-slate-500 mb-3 space-x-2">
                                                <span className="flex items-center whitespace-nowrap"><FiBookOpen className="mr-1 h-3.5 w-3.5"/>{assignment.subjectName}</span>
                                                <span className="text-slate-300">|</span>
                                                <span className="whitespace-nowrap">Class: {assignment.className}</span>
                                                <span className="whitespace-nowrap">/ Section: {assignment.sectionName || 'N/A'}</span>
                                            </div>

                                            {assignment.description && (
                                                <div className="mb-4">
                                                    <h4 className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Instructions:</h4>
                                                    <div className="prose prose-sm max-w-none prose-slate custom-scrollbar max-h-40 overflow-y-auto pr-2 rounded-md bg-slate-50 p-3 border border-slate-200">
                                                        <Markdown remarkPlugins={[remarkGfm]}>{assignment.description}</Markdown>
                                                    </div>
                                                </div>
                                            )}
                                             {!assignment.description && (
                                                <div className="mb-4 text-sm text-slate-500 italic flex items-center bg-slate-50 p-3 rounded-md border border-slate-200">
                                                    <FcAbout className="mr-2 h-4 w-4 flex-shrink-0" /> No detailed instructions provided.
                                                </div>
                                            )}

                                            {assignment.fileIds && assignment.fileIds.length > 0 && (
                                                <div className="mb-3">
                                                    <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Attachments: ({assignment.fileIds.length})</h4>
                                                    <div className="space-y-2">
                                                        {assignment.fileIds.map((fileId, index) => (
                                                            <button
                                                                key={fileId}
                                                                onClick={() => handleDownloadFile(fileId, assignment.fileNames?.[index] || 'download')}
                                                                className="w-full flex items-center text-sm text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 p-2.5 rounded-md transition-colors border border-sky-200 hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 group"
                                                            >
                                                                <FiPaperclip className="mr-2.5 h-4 w-4 flex-shrink-0 text-sky-600" />
                                                                <span className="truncate" title={assignment.fileNames?.[index] || `File ${index + 1}`}>{assignment.fileNames?.[index] || `File ${index + 1}`}</span>
                                                                <FiDownload className="ml-auto h-4 w-4 flex-shrink-0 text-slate-400 group-hover:text-sky-600 transition-colors" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {!assignment.fileIds?.length && (
                                                <div className="mb-3 text-xs text-slate-400 italic">No attachments for this assignment.</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ParentAssignmentsPage;