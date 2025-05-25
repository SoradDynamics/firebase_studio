import React, { useEffect, useState, useMemo } from 'react';
import { useAssignmentStore, Assignment } from '~/store/assignmentStore';
import {
    FiPlus, FiCalendar, FiBookOpen, FiDownload, FiEdit, FiTrash2,
    FiPaperclip, FiFilter, FiLoader, FiAlertTriangle // Added FcAbout
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { storage, ASSIGNMENT_FILES_BUCKET_ID } from '~/utils/appwrite';
import { Drawer } from '../../../../common/Drawer';
import AssignmentForm from './AssignmentForm';
import { FcAbout } from 'react-icons/fc';
import { getCurrentUser } from './utils/appwriteAuth'; // Import getCurrentUser
import { Models } from 'appwrite'; // Import Models for User type

// Helper to group assignments by date
const groupAssignmentsByDate = (assignments: Assignment[]) => {
    if (!assignments || assignments.length === 0) return {};
    return assignments.reduce((acc, assignment) => {
        const date = assignment.dateBS;
        if (!acc[date]) acc[date] = [];
        acc[date].push(assignment);
        return acc;
    }, {} as Record<string, Assignment[]>);
};

// A simple Popover placeholder (replace with your actual Popover component if you have one)
const Popover: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    content: React.ReactNode;
    isConfirmLoading: boolean;
}> = ({ isOpen, onClose, onConfirm, title, content, isConfirmLoading }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
                <h3 className="text-lg font-semibold mb-4 text-slate-800">{title}</h3>
                <div className="text-sm text-slate-600 mb-6">{content}</div>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        disabled={isConfirmLoading}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-300 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isConfirmLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm disabled:opacity-50 flex items-center justify-center"
                    >
                        {isConfirmLoading && <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};


const TeacherAssignmentsPage: React.FC = () => {
    const {
        faculties, classesForFilter, sectionsForFilter, subjectsForFilter,
        assignments, filters, isLoading, error: pageError,
        isDrawerOpen, editingAssignment, isSubmitting,
        fetchFaculties, setFilter, fetchAssignments, openDrawer, closeDrawer, deleteAssignment
    } = useAssignmentStore();

    // --- State for the currently logged-in user ---
    const [loggedInUser, setLoggedInUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [authLoading, setAuthLoading] = useState(true); // Start as true to indicate loading
    // --- End of user state ---

    // State for delete confirmation popover
    const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);
    const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
    const [isDeleteConfirmLoading, setIsDeleteConfirmLoading] = useState(false);

    // --- Fetch current user on component mount ---
    useEffect(() => {
        const fetchUser = async () => {
            setAuthLoading(true);
            console.log("[TeacherAssignmentsPage] Attempting to fetch current user...");
            const user = await getCurrentUser();
            console.log("[TeacherAssignmentsPage] Fetched user:", user);
            setLoggedInUser(user);
            setAuthLoading(false);
        };
        fetchUser();
    }, []);
    // --- End of user fetch ---

    useEffect(() => {
        fetchFaculties();
        fetchAssignments();
    }, [fetchFaculties, fetchAssignments]);

    const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
        setFilter(filterName, value || null);
    };

    const groupedAndSortedAssignments = useMemo(() => {
        const grouped = groupAssignmentsByDate(assignments);
        return Object.entries(grouped).sort(([dateA], [dateB]) => dateB.localeCompare(dateA));
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

    const handleDeleteClick = (assignment: Assignment) => {
        setAssignmentToDelete(assignment);
        setIsDeletePopoverOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (assignmentToDelete) {
            setIsDeleteConfirmLoading(true);
            await deleteAssignment(assignmentToDelete.$id, assignmentToDelete.fileIds || []);
            setIsDeleteConfirmLoading(false);
            setIsDeletePopoverOpen(false);
            setAssignmentToDelete(null);
        }
    };

    const handleCloseDeletePopover = () => {
        setIsDeletePopoverOpen(false);
        setAssignmentToDelete(null);
        setIsDeleteConfirmLoading(false);
    };

    const handleFormSubmitSuccess = () => {
        closeDrawer();
    };
    
    const getFacultyName = (facultyId: string) => faculties.find(f => f.$id === facultyId)?.name || 'N/A';

    // Handle loading state for authentication
    if (authLoading) {
        return (
            <div className="p-4 md:p-6 min-h-screen flex items-center justify-center">
                <FiLoader className="animate-spin h-10 w-10 text-indigo-500" />
                <p className="ml-3 text-slate-600">Verifying user...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-gradient-to-br from-slate-100 to-sky-100 min-h-screen">
            <div className="container mx-auto max-w-7xl">
                <header className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Assignment Management</h1>
                    {loggedInUser && ( // Only show "Add New" if a user is logged in
                        <button
                            onClick={() => openDrawer()}
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md flex items-center justify-center transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            <FiPlus className="mr-2 h-5 w-5" /> Add New Assignment
                        </button>
                    )}
                    {!loggedInUser && !authLoading && (
                         <p className="text-sm text-orange-600 bg-orange-100 p-2 rounded-md">Please log in to add assignments.</p>
                    )}
                </header>

                {/* Filters Section (existing code) */}
                <div className="mb-6 md:mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                        <FiFilter className="mr-2 h-5 w-5 text-slate-500"/>Filter Assignments
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label htmlFor="filterFaculty" className="block text-sm font-medium text-slate-600 mb-1">Faculty</label>
                            <select id="filterFaculty" value={filters.facultyId || ''}
                                onChange={(e) => handleFilterChange('facultyId', e.target.value)}
                                className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white">
                                <option value="">All Faculties</option>
                                {faculties.map(f => <option key={f.$id} value={f.$id}>{f.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="filterClass" className="block text-sm font-medium text-slate-600 mb-1">Class</label>
                            <select id="filterClass" value={filters.className || ''}
                                onChange={(e) => handleFilterChange('className', e.target.value)}
                                disabled={!filters.facultyId || classesForFilter.length === 0}
                                className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white disabled:bg-slate-100 disabled:cursor-not-allowed">
                                <option value="">All Classes</option>
                                {classesForFilter.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="filterSection" className="block text-sm font-medium text-slate-600 mb-1">Section</label>
                            <select id="filterSection" value={filters.sectionId || ''}
                                onChange={(e) => handleFilterChange('sectionId', e.target.value)}
                                disabled={!filters.className || sectionsForFilter.length === 0}
                                className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white disabled:bg-slate-100 disabled:cursor-not-allowed">
                                <option value="">All Sections</option>
                                {sectionsForFilter.map(s => <option key={s.$id} value={s.$id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="filterSubject" className="block text-sm font-medium text-slate-600 mb-1">Subject</label>
                            <select id="filterSubject" value={filters.subjectName || ''}
                                onChange={(e) => handleFilterChange('subjectName', e.target.value)}
                                disabled={!filters.sectionId || subjectsForFilter.length === 0}
                                className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white disabled:bg-slate-100 disabled:cursor-not-allowed">
                                <option value="">All Subjects</option>
                                {subjectsForFilter.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                            </select>
                        </div>
                    </div>
                </div>


                {isLoading && assignments.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <FiLoader className="animate-spin mx-auto h-10 w-10 text-indigo-500 mb-3" />
                        <p className="text-lg">Loading assignments, please wait...</p>
                    </div>
                )}
                {pageError && (
                    <div className="my-8 p-6 text-center bg-red-50 border border-red-200 rounded-lg shadow-sm">
                        <FiAlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-3" />
                        <p className="text-xl font-semibold text-red-700">Failed to Load Assignments</p>
                        <p className="text-red-600 text-sm mt-1">{pageError}</p>
                        <button 
                            onClick={() => fetchAssignments()} 
                            className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                        >
                            Try Again
                        </button>
                    </div>
                )}
                {!isLoading && !pageError && assignments.length === 0 && (
                    <div className="text-center py-16 text-slate-500 bg-white rounded-xl shadow-lg p-8">
                        <FcAbout className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                        <p className="text-2xl font-semibold">No Assignments Found</p>
                        <p className="text-slate-600 mt-2">There are no assignments matching your current filters. <br/> {loggedInUser ? "You can add a new assignment using the button above." : "Please log in to add assignments."}</p>
                    </div>
                )}

                {groupedAndSortedAssignments.map(([dateBS, assignmentsOnDate]) => (
                    <div key={dateBS} className="mb-12">
                        <div className="flex items-baseline mb-5 pl-1 border-b-2 border-indigo-200 pb-2">
                            <FiCalendar className="text-2xl sm:text-3xl text-indigo-600 mr-3 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-slate-500">Due Date (BS)</p>
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-700">
                                    {dateBS}
                                </h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {assignmentsOnDate.map(assignment => (
                                <div key={assignment.$id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col overflow-hidden group">
                                    <div className="p-5 sm:p-6 flex-grow">
                                        <h3 className="text-lg sm:text-xl font-semibold text-sky-700 leading-tight mb-1.5 group-hover:text-sky-600 transition-colors">
                                            {assignment.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center text-xs text-slate-500 mb-3 space-x-2">
                                            <span className="flex items-center whitespace-nowrap"><FiBookOpen className="mr-1 h-3.5 w-3.5"/>{assignment.subjectName}</span>
                                            <span className="text-slate-300">|</span>
                                            <span className="whitespace-nowrap">{getFacultyName(assignment.facultyId)}</span>
                                            <span className="whitespace-nowrap">/ {assignment.className}</span>
                                            <span className="whitespace-nowrap">/ {assignment.sectionName || 'N/A'}</span>
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
                                                <FcAbout className="mr-2 h-4 w-4 flex-shrink-0" /> No detailed instructions provided for this assignment.
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

                                    {/* --- CRITICAL FIX AREA --- */}
                                    {/* Use loggedInUser from component state */}
                                    {loggedInUser && loggedInUser.$id && assignment.assignedById === loggedInUser.$id && (
                                        <div className="bg-slate-50 p-3 border-t border-slate-200 flex justify-end space-x-2">
                                            <button
                                                onClick={() => openDrawer(assignment)}
                                                className="text-xs font-medium text-blue-600 hover:text-blue-800 py-1.5 px-3 rounded-md hover:bg-blue-100 transition-colors flex items-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                aria-label={`Edit assignment: ${assignment.title}`}
                                            >
                                                <FiEdit className="mr-1.5 h-3.5 w-3.5" /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(assignment)}
                                                className="text-xs font-medium text-red-600 hover:text-red-800 py-1.5 px-3 rounded-md hover:bg-red-100 transition-colors flex items-center focus:outline-none focus:ring-1 focus:ring-red-500"
                                                aria-label={`Delete assignment: ${assignment.title}`}
                                            >
                                                <FiTrash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                                            </button>
                                        </div>
                                    )}
                                    {/* --- END OF CRITICAL FIX AREA --- */}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <Drawer
                    isOpen={isDrawerOpen}
                    onClose={closeDrawer}
                    title={editingAssignment ? "Edit Assignment Details" : "Create New Assignment"}
                    position="right"
                    size="lg"
                    nonDismissable={isSubmitting}
                >
                    <AssignmentForm onFormSubmitSuccess={handleFormSubmitSuccess} />
                </Drawer>

                {assignmentToDelete && (
                    <Popover
                        isOpen={isDeletePopoverOpen}
                        onClose={handleCloseDeletePopover}
                        onConfirm={handleConfirmDelete}
                        title="Confirm Deletion"
                        content={
                            <p>
                                Are you sure you want to delete the assignment: <br />
                                <strong className="font-medium text-slate-700 break-all">{assignmentToDelete.title}</strong>?
                                <br />This action cannot be undone.
                            </p>
                        }
                        isConfirmLoading={isDeleteConfirmLoading}
                    />
                )}
            </div>
        </div>
    );
};

export default TeacherAssignmentsPage;