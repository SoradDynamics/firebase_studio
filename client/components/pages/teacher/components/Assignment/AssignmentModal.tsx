// src/components/assignments/AssignmentModal.tsx
import React, { useState, useEffect, useId } from 'react'; // Added useId
import { useAssignmentStore, Faculty, Section, Assignment } from '~/store/assignmentStore'; // Assuming Assignment type is exported
import { FiUploadCloud, FiXCircle, FiPaperclip, FiLoader } from 'react-icons/fi'; // Added FiPaperclip, FiLoader
import NepaliDateConverter from 'nepali-date-converter';

// Interface for files being managed in the modal's local state
interface ModalFileState {
    id: string; // Can be Appwrite $id for existing, or a temp local ID for new
    name: string;
    object?: File; // The actual File object for new files
    isNew: boolean; // True if it's a newly selected file
    toDelete?: boolean; // True if an existing file is marked for deletion
    uploadProgress?: number; // For displaying progress (0-100)
}


const AssignmentModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const {
        addAssignment, updateAssignment, editingAssignment,
        faculties,
        fetchClassesForFaculty, classesForFilter: modalClasses,
        fetchSectionsForClassAndFaculty, sectionsForFilter: modalSections,
        fetchSubjectsForSection, subjectsForFilter: modalSubjects,
        isLoading, error,
        // If you add uploadProgresses to Zustand:
        // uploadProgresses,
    } = useAssignmentStore();

    const [formData, setFormData] = useState({ // Keep this for non-file form data
        title: '', description: '', facultyId: '', className: '', sectionId: '',
        subjectName: '', dateBS: new NepaliDateConverter(new Date()).format('YYYY-MM-DD'),
    });

    // Enhanced file state management within the modal
    const [managedFiles, setManagedFiles] = useState<ModalFileState[]>([]);
    const localIdPrefix = useId(); // For generating unique local keys

    useEffect(() => {
        if (editingAssignment) {
            setFormData({
                title: editingAssignment.title,
                description: editingAssignment.description,
                facultyId: editingAssignment.facultyId,
                className: editingAssignment.className,
                sectionId: editingAssignment.sectionId,
                subjectName: editingAssignment.subjectName,
                dateBS: editingAssignment.dateBS,
            });

            const existingFiles: ModalFileState[] = (editingAssignment.fileIds || []).map((fileId, index) => ({
                id: fileId,
                name: (editingAssignment.fileNames || [])[index] || `File ${index + 1}`,
                isNew: false,
            }));
            setManagedFiles(existingFiles);

            // Pre-populate dependent dropdowns
            if (editingAssignment.facultyId) fetchClassesForFaculty(editingAssignment.facultyId);
            if (editingAssignment.facultyId && editingAssignment.className) fetchSectionsForClassAndFaculty(editingAssignment.facultyId, editingAssignment.className);
            if (editingAssignment.sectionId) fetchSubjectsForSection(editingAssignment.sectionId);
        } else {
            setFormData(prev => ({ ...prev, dateBS: new NepaliDateConverter(new Date()).format('YYYY-MM-DD') }));
            setManagedFiles([]); // Clear files for new assignment
        }
    }, [editingAssignment, fetchClassesForFaculty, fetchSectionsForClassAndFaculty, fetchSubjectsForSection]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // ... (your existing logic for cascading dropdowns) ...
        if (name === 'facultyId') {
            setFormData(prev => ({ ...prev, className: '', sectionId: '', subjectName: '' }));
            if (value) fetchClassesForFaculty(value); else {
                useAssignmentStore.setState({ classesForFilter: [], sectionsForFilter: [], subjectsForFilter: [] });
            }
        } else if (name === 'className') {
             setFormData(prev => ({ ...prev, sectionId: '', subjectName: '' }));
            if (value && formData.facultyId) fetchSectionsForClassAndFaculty(formData.facultyId, value); else {
                useAssignmentStore.setState({ sectionsForFilter: [], subjectsForFilter: [] });
            }
        } else if (name === 'sectionId') {
            setFormData(prev => ({ ...prev, subjectName: '' }));
            if (value) fetchSubjectsForSection(value); else {
                 useAssignmentStore.setState({ subjectsForFilter: [] });
            }
        }
    };

    const handleDateChange = (bsDate: string) => {
        setFormData(prev => ({ ...prev, dateBS: bsDate }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFilesToAdd: ModalFileState[] = Array.from(e.target.files).map((file, index) => ({
                id: `${localIdPrefix}-new-${Date.now()}-${index}`, // Unique local ID
                name: file.name,
                object: file,
                isNew: true,
            }));
            setManagedFiles(prev => [...prev, ...newFilesToAdd]);
            e.target.value = ''; // Clear input for re-selection
        }
    };

    const removeFile = (fileIdToRemove: string) => {
        setManagedFiles(prev => prev.map(f => {
            if (f.id === fileIdToRemove) {
                if (f.isNew) return null; // Mark for filtering out if it's a new, unuploaded file
                return { ...f, toDelete: true }; // Mark existing file for deletion
            }
            return f;
        }).filter(Boolean) as ModalFileState[]); // Filter out nulls
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        if (!formData.title || !formData.facultyId || !formData.className || !formData.sectionId || !formData.subjectName || !formData.dateBS) {
            alert("Please fill all required fields.");
            return;
        }
        
        const filesToUpload = managedFiles.filter(f => f.isNew && f.object).map(f => f.object as File);
        const fileIdsToDelete = managedFiles.filter(f => !f.isNew && f.toDelete).map(f => f.id);

        if (editingAssignment) {
            await updateAssignment(editingAssignment.$id, {
                ...formData,
                newFiles: filesToUpload,
                filesToDelete: fileIdsToDelete,
            });
        } else {
            await addAssignment({
                ...formData,
                files: filesToUpload,
            });
        }

        if (!useAssignmentStore.getState().error) {
             onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                {/* ... (header and error display) ... */}
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">
                        {editingAssignment ? 'Edit Assignment' : 'Add New Assignment'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <FiXCircle size={24} />
                    </button>
                </div>

                {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">Error: {error}</p>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ... (Faculty, Class, Section, Subject, Title, Description, DateBS inputs) ... */}
                    {/* These are same as before */}
                    <div>
                        <label htmlFor="mFacultyId" className="block text-sm font-medium text-gray-700">Faculty</label>
                        <select name="facultyId" id="mFacultyId" value={formData.facultyId} onChange={handleInputChange} required
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="">Select Faculty</option>
                            {faculties.map(f => <option key={f.$id} value={f.$id}>{f.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="mClassName" className="block text-sm font-medium text-gray-700">Class</label>
                        <select name="className" id="mClassName" value={formData.className} onChange={handleInputChange} required
                            disabled={!formData.facultyId || modalClasses.length === 0}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="">Select Class</option>
                            {modalClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="mSectionId" className="block text-sm font-medium text-gray-700">Section</label>
                        <select name="sectionId" id="mSectionId" value={formData.sectionId} onChange={handleInputChange} required
                            disabled={!formData.className || modalSections.length === 0}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="">Select Section</option>
                            {modalSections.map(s => <option key={s.$id} value={s.$id}>{s.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="mSubjectName" className="block text-sm font-medium text-gray-700">Subject</label>
                        <select name="subjectName" id="mSubjectName" value={formData.subjectName} onChange={handleInputChange} required
                            disabled={!formData.sectionId || modalSubjects.length === 0}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="">Select Subject</option>
                            {modalSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                        <input type="text" name="title" id="title" value={formData.title} onChange={handleInputChange} required
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} rows={4}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                    <div>
                        <label htmlFor="dateBS" className="block text-sm font-medium text-gray-700">Due Date (BS)</label>
                         <input
                            type="text"
                            name="dateBS"
                            id="dateBS"
                            value={formData.dateBS}
                            // onChange={handleInputChange} // If your date picker is a simple input
                            onChange={(e) => handleDateChange(e.target.value)} // Or use its specific onChange
                            placeholder="YYYY-MM-DD (e.g., 2080-05-15)"
                            required
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter BS date. E.g., 2080-01-15.</p>
                    </div>


                    {/* File Upload Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload Files (PDF, DOCX)</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            {/* ... (upload input area) ... */}
                            <div className="space-y-1 text-center">
                                <FiUploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                        <span>Upload files</span>
                                        <input id="file-upload" name="files" type="file" className="sr-only" multiple
                                            accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                            onChange={handleFileChange} />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 10MB each</p>
                            </div>
                        </div>

                        {/* Display Managed Files */}
                        {managedFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-sm font-medium text-gray-700">Attached files:</p>
                                {managedFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className={`flex items-center justify-between text-sm bg-gray-50 p-2 rounded-md border ${
                                            file.toDelete ? 'border-red-300 opacity-60' : 'border-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center">
                                            <FiPaperclip className="mr-2 h-4 w-4 text-gray-500" />
                                            <span className={`${file.toDelete ? 'line-through' : ''}`}>{file.name}</span>
                                            {file.isNew && !file.toDelete && <span className="ml-2 text-xs text-green-600">(New)</span>}
                                        </div>
                                        {/* Simple progress display - enhance this with actual progress from store if implemented */}
                                        {/* {isLoading && file.isNew && !file.uploadProgress && (
                                            <FiLoader className="animate-spin h-4 w-4 text-blue-500 ml-2" />
                                        )}
                                        {file.uploadProgress && file.uploadProgress < 100 && (
                                             <div className="w-16 bg-gray-200 rounded-full h-1.5 ml-2">
                                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${file.uploadProgress}%` }}></div>
                                            </div>
                                        )} */}
                                        <button
                                            type="button"
                                            onClick={() => removeFile(file.id)}
                                            className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                            disabled={isLoading}
                                        >
                                            <FiXCircle size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 disabled:opacity-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm flex items-center justify-center disabled:opacity-50">
                            {isLoading && <FiLoader className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />}
                            {isLoading ? (editingAssignment ? 'Updating...' : 'Adding...') : (editingAssignment ? 'Update Assignment' : 'Add Assignment')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignmentModal;