// src/pages/student/StudentAssignmentsPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
    FiCalendar, FiBookOpen, FiDownload, FiPaperclip,
    FiLoader, FiAlertTriangle, FiUserCheck
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    databases, storage, APPWRITE_DATABASE_ID, ASSIGNMENT_COLLECTION_ID,
   STUDENTS_COLLECTION_ID as STUDENT_COLLECTION_ID, SECTIONS_COLLECTION_ID as SECTION_COLLECTION_ID, 
    ASSIGNMENT_FILES_BUCKET_ID
} from '~/utils/appwrite';
import { getCurrentUser } from '../../../teacher/components/Assignment/utils/appwriteAuth'; // Ensure this path is correct
import { Models, Query } from 'appwrite';
import { Assignment, Section } from '~/store/assignmentStore'; // Assuming Section type is exported or defined
import { StudentProfile } from 'types'; // Or wherever you defined StudentProfile
import { FcAbout } from 'react-icons/fc';

// Helper to group assignments by date
const groupAssignmentsByDate = (assignmentsArray: Assignment[]) => {
    if (!assignmentsArray || assignmentsArray.length === 0) return {};
    return assignmentsArray.reduce((acc, assignment) => {
        const date = assignment.dateBS; // Group by BS date
        if (!acc[date]) acc[date] = [];
        acc[date].push(assignment);
        return acc;
    }, {} as Record<string, Assignment[]>);
};

const StudentAssignmentsPage: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
    const [fetchedSectionId, setFetchedSectionId] = useState<string | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [isLoadingSectionId, setIsLoadingSectionId] = useState(false);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. Fetch Appwrite current user
    useEffect(() => {
        const fetchUser = async () => {
            setIsLoadingAuth(true);
            setError(null);
            try {
                console.log("[StudentAssignmentsPage] Attempting to fetch current user...");
                const user = await getCurrentUser();
                setCurrentUser(user);
                console.log("[StudentAssignmentsPage] Fetched Appwrite user:", user);
                if (!user) {
                    setError("You are not logged in. Please log in to view assignments.");
                }
            } catch (e) {
                console.error("[StudentAssignmentsPage] Error fetching current user:", e);
                setError("Failed to verify your login status. Please try again.");
            } finally {
                setIsLoadingAuth(false);
            }
        };
        fetchUser();
    }, []);

    // 2. Fetch student profile once current user is available
    useEffect(() => {
        if (!currentUser || !currentUser.email) {
            if (!isLoadingAuth && !currentUser) setError("Login required to fetch student profile.");
            return;
        }

        const fetchProfile = async () => {
            setIsLoadingProfile(true);
            setError(null);
            setFetchedSectionId(null); 
            if (!APPWRITE_DATABASE_ID || !STUDENT_COLLECTION_ID) {
                setError("Student profile system is not configured correctly (DB/Collection ID missing).");
                setIsLoadingProfile(false);
                return;
            }
            try {
                console.log(`[StudentAssignmentsPage] Fetching profile for email: ${currentUser.email}`);
                const response = await databases.listDocuments<StudentProfile>(
                    APPWRITE_DATABASE_ID,
                    STUDENT_COLLECTION_ID,
                    [Query.equal('stdEmail', currentUser.email), Query.limit(1)]
                );
                if (response.documents.length > 0) {
                    const profile = response.documents[0];
                    setStudentProfile(profile);
                    console.log("[StudentAssignmentsPage] Student profile found:", profile);
                    if (!profile.section || !profile.class || !profile.facultyId) {
                        setError("Your student profile is incomplete (missing section name, class, or faculty ID). Cannot fetch assignments. Please contact administration.");
                    }
                } else {
                    setError(`Student profile not found for email: ${currentUser.email}. Please contact administration if you are a registered student.`);
                    setStudentProfile(null);
                    console.warn(`[StudentAssignmentsPage] No student profile found for email: ${currentUser.email}`);
                }
            } catch (e) {
                console.error("[StudentAssignmentsPage] Error fetching student profile:", e);
                setError("Failed to fetch your student profile. Please try again.");
                setStudentProfile(null);
            } finally {
                setIsLoadingProfile(false);
            }
        };
        fetchProfile();
    }, [currentUser, isLoadingAuth]);

    // 3. Fetch Section ID based on studentProfile details
    useEffect(() => {
        if (!studentProfile || !studentProfile.section || !studentProfile.class || !studentProfile.facultyId) {
            if (studentProfile && !isLoadingProfile) { 
                // Error regarding incomplete profile is set in the previous useEffect
            }
            setAssignments([]); 
            setFetchedSectionId(null);
            return;
        }

        const fetchSectionDocumentId = async () => {
            setIsLoadingSectionId(true);
            // setError(null); // Do not clear error here, an error from profile fetch might be relevant
            if (!APPWRITE_DATABASE_ID || !SECTION_COLLECTION_ID) {
                setError("Section data system is not configured correctly (DB/Collection ID missing).");
                setIsLoadingSectionId(false);
                return;
            }
            try {
                console.log(`[StudentAssignmentsPage] Fetching section ID for: Name='${studentProfile.section}', Class='${studentProfile.class}', Faculty='${studentProfile.facultyId}'`);
                const sectionQuery = [
                    Query.equal("name", studentProfile.section),
                    Query.equal("class", studentProfile.class),
                    Query.equal("facultyId", studentProfile.facultyId),
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
                    console.log(`[StudentAssignmentsPage] Found section document ID: ${sectionDocId}`);
                    setError(null); // Clear errors if section ID is found
                } else {
                    setError(`Could not find a matching section for "${studentProfile.section}" in class "${studentProfile.class}" (Faculty ID: ${studentProfile.facultyId.substring(0,6)}...). Please check your profile or contact administration.`);
                    setFetchedSectionId(null);
                    console.warn(`[StudentAssignmentsPage] No matching section document found for Name='${studentProfile.section}', Class='${studentProfile.class}', Faculty='${studentProfile.facultyId}'`);
                }
            } catch (e) {
                console.error("[StudentAssignmentsPage] Error fetching section ID:", e);
                setError("An error occurred while trying to identify your section. Please try again.");
                setFetchedSectionId(null);
            } finally {
                setIsLoadingSectionId(false);
            }
        };

        fetchSectionDocumentId();
    }, [studentProfile, isLoadingProfile]);


    // 4. Fetch assignments once ACTUAL section ID is available
    useEffect(() => {
        if (!studentProfile || !fetchedSectionId || !studentProfile.facultyId || !studentProfile.class) {
             if (studentProfile && !isLoadingSectionId && fetchedSectionId === null && !error && !isLoadingProfile) {
                // This case is where profile is loaded, section ID fetch is done but no ID found.
                // Error for this should have been set by the previous useEffect.
             }
            setAssignments([]);
            return;
        }
        
        const fetchStudentAssignments = async () => {
            setIsLoadingAssignments(true);
            // setError(null); // Don't clear error here, an error from section ID fetch might be relevant. Only clear if successful.
            if (!APPWRITE_DATABASE_ID || !ASSIGNMENT_COLLECTION_ID) {
                setError("Assignment system is not configured correctly (DB/Collection ID missing).");
                setIsLoadingAssignments(false);
                return;
            }
            try {
                console.log(`[StudentAssignmentsPage] Fetching assignments for: Faculty=${studentProfile.facultyId}, Class=${studentProfile.class}, SectionID=${fetchedSectionId}`);
                const queries = [
                    Query.equal('facultyId', studentProfile.facultyId),
                    Query.equal('className', studentProfile.class),
                    Query.equal('sectionId', fetchedSectionId),
                    Query.orderDesc('dateBS')
                ];
                const response = await databases.listDocuments<Assignment>(
                    APPWRITE_DATABASE_ID,
                    ASSIGNMENT_COLLECTION_ID,
                    queries
                );
                setAssignments(response.documents);
                console.log(`[StudentAssignmentsPage] Found ${response.documents.length} assignments.`);
                if (response.documents.length > 0) setError(null); // Clear error if assignments are fetched
                
            } catch (e) {
                console.error("[StudentAssignmentsPage] Error fetching assignments:", e);
                setError("Failed to fetch assignments. Please try again later.");
                setAssignments([]);
            } finally {
                setIsLoadingAssignments(false);
            }
        };

        fetchStudentAssignments();
    }, [studentProfile, fetchedSectionId, isLoadingSectionId]); // Removed 'error' from deps here, error is for display

    const groupedAndSortedAssignments = useMemo(() => {
        // console.log("[StudentAssignmentsPage] Recalculating groupedAndSortedAssignments. assignments:", assignments);
        if (!assignments) return {};
        return groupAssignmentsByDate(assignments);
    }, [assignments]);

    const handleDownloadFile = (fileId: string, fileName: string) => {
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

    // console.log("[StudentAssignmentsPage] Rendering. State:", { isLoadingAuth, isLoadingProfile, isLoadingSectionId, isLoadingAssignments, error, currentUser, studentProfile, fetchedSectionId, assignmentsLength: assignments.length });

    if (isLoadingAuth || isLoadingProfile || isLoadingSectionId) {
        return (
            <div className="p-4 md:p-6 bg-gradient-to-br from-slate-100 to-sky-100 min-h-screen flex flex-col items-center justify-center">
                <FiLoader className="animate-spin mx-auto h-12 w-12 text-indigo-500 mb-4" />
                <p className="text-lg text-slate-600">
                    {isLoadingAuth ? "Verifying your identity..." :
                     isLoadingProfile ? "Loading your profile..." :
                     "Identifying your section..."}
                </p>
            </div>
        );
    }
    
    if (error && !isLoadingAssignments) { 
        return (
            <div className="p-4 md:p-6 bg-gradient-to-br from-slate-100 to-sky-100 min-h-screen flex flex-col items-center justify-center text-center">
                <FiAlertTriangle className="mx-auto h-16 w-16 text-red-400 mb-5" />
                <p className="text-xl font-semibold text-red-700 mb-2">An Error Occurred</p>
                <p className="text-red-600 max-w-md">{error}</p>
            </div>
        );
    }
    
    if (!currentUser && !isLoadingAuth) { 
         return (
            <div className="p-4 md:p-6 bg-gradient-to-br from-slate-100 to-sky-100 min-h-screen flex flex-col items-center justify-center text-center">
                <FiAlertTriangle className="mx-auto h-16 w-16 text-red-400 mb-5" />
                <p className="text-xl font-semibold text-red-700 mb-2">Access Denied</p>
                <p className="text-red-600 max-w-md">Please log in to view assignments.</p>
            </div>
        );
    }
    
    // This case might be covered by 'error' if profile not found sets an error
    if (!studentProfile && !isLoadingProfile && !error) { 
         return (
            <div className="p-4 md:p-6 bg-gradient-to-br from-slate-100 to-sky-100 min-h-screen flex flex-col items-center justify-center text-center">
                <FiUserCheck className="mx-auto h-16 w-16 text-orange-400 mb-5" />
                <p className="text-xl font-semibold text-orange-700 mb-2">Student Profile Issue</p>
                <p className="text-orange-600 max-w-md">
                    Could not load your student profile. Please ensure you are logged in with the correct student account.
                </p>
            </div>
        );
    }


    return (
        <div className="p-4 md:p-6 bg-gradient-to-br from-slate-100 to-sky-100 min-h-screen">
            <div className="container mx-auto max-w-7xl">
                <header className="mb-6 md:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">My Assignments</h1>
                    {studentProfile && (
                        <p className="text-sm text-slate-600 mt-1">
                            Showing assignments for:
                            {studentProfile.class ? ` Class ${studentProfile.class}` : ''}
                            {studentProfile.section ? `, Section ${studentProfile.section}` : ', Section (N/A)'}
                        </p>
                    )}
                </header>

                {isLoadingAssignments && (
                    <div className="text-center py-12 text-slate-500">
                        <FiLoader className="animate-spin mx-auto h-10 w-10 text-indigo-500 mb-3" />
                        <p className="text-lg">Loading your assignments...</p>
                    </div>
                )}
                
                {!isLoadingAssignments && !error && assignments.length === 0 && studentProfile && fetchedSectionId && (
                    <div className="text-center py-16 text-slate-500 bg-white rounded-xl shadow-lg p-8">
                        <FcAbout className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                        <p className="text-2xl font-semibold">No Assignments Found</p>
                        <p className="text-slate-600 mt-2">There are currently no assignments posted for your class and section.</p>
                    </div>
                )}
                {/* This specific "Could Not Identify Your Section" message might be redundant if 'error' state already covers it */}
                {!isLoadingAssignments && !error && assignments.length === 0 && studentProfile && !fetchedSectionId && !isLoadingSectionId && (
                     <div className="text-center py-16 text-slate-500 bg-white rounded-xl shadow-lg p-8">
                        <FiAlertTriangle className="mx-auto h-16 w-16 text-orange-400 mb-4" />
                        <p className="text-2xl font-semibold">Section Not Identified</p>
                        <p className="text-slate-600 mt-2">We couldn't identify a specific section ID based on your profile (Name: "{studentProfile.section}", Class: "{studentProfile.class}"). Please check your details or contact administration.</p>
                    </div>
                )}


                {groupedAndSortedAssignments && typeof groupedAndSortedAssignments === 'object' && Object.entries(groupedAndSortedAssignments).map(([dateBS, assignmentsOnDate]) => (
                    <div key={dateBS} className="mb-12">
                        <div className="flex  mb pl-1 border-b-2 border-indigo-200 pb-2">
                            <FiCalendar className="text-2xl sm:text-3xl text-indigo-600 mr-3 " />
                            <div className=' flex-row'>
                                <p className="text-xs text-slate-500">Due Date (BS)</p>
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-700">
                                    {dateBS}
                                </h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {assignmentsOnDate.map(assignment => (
                                <div key={assignment.$id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden group">
                                    <div className="p-5 sm:p-6 flex-grow">
                                      
                                      <div className=' flex gap-4 mb-1.5'>
                                        <span className="flex items-center whitespace-nowrap text-xl "><FiBookOpen className="mr-1.5 h-5 w-5 mt-1"/>{assignment.subjectName}</span>
                                      <h3 className="text-lg sm:text-xl font-semibold text-sky-700 leading-tight     group-hover:text-sky-600 transition-colors">
                                            {assignment.title}
                                        </h3>

                                      </div>
                                        <div className="flex flex-wrap items-center text-xs text-slate-500 mb-3 space-x-2">
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
    );
};

export default StudentAssignmentsPage;