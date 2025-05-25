// src/components/assignments/AssignmentForm.tsx
import React, { useState, useEffect, useId } from 'react';
import { useAssignmentStore, AssignmentFormDataForStore, Faculty, Section } from '~/store/assignmentStore'; // Ensure interfaces are exported
import { FiUploadCloud, FiXCircle, FiPaperclip, FiAlertTriangle, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatBytes } from './utils/fileUtils'; // Ensure this utility exists
import NepaliDateConverter from 'nepali-date-converter';
import { Drawer } from '../../../../common/Drawer'; // Your custom drawer component

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB example

interface ModalFileState {
    id: string;
    name: string;
    size: number;
    object?: File;
    isNew: boolean;
    toDelete?: boolean;
    error?: string;
}

interface AssignmentFormProps {
  onFormSubmitSuccess: () => void; // Callback to close drawer on success
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({ onFormSubmitSuccess }) => {
    const {
        addAssignment, updateAssignment, editingAssignment,
        faculties, // Fetched faculties
        fetchClassesForFaculty, classesForFilter: formClasses, // Classes for selected faculty in form
        fetchSectionsForClassAndFaculty, sectionsForFilter: formSections, // Sections for selected class/faculty in form
        fetchSubjectsForSection, subjectsForFilter: formSubjects, // Subjects for selected section in form
        isSubmitting, // Use isSubmitting for form specific loading
        error: storeError,
        closeDrawer, // Get closeDrawer to use for the cancel button
    } = useAssignmentStore();

    const [formData, setFormData] = useState<Omit<AssignmentFormDataForStore, 'files'>>({
        title: '', description: '', facultyId: '', className: '', sectionId: '',
        subjectName: '', dateBS: new NepaliDateConverter(new Date()).format('YYYY-MM-DD'),
    });
    const [managedFiles, setManagedFiles] = useState<ModalFileState[]>([]);
    const localIdPrefix = useId(); // For unique keys for new files

    useEffect(() => {
        if (editingAssignment) {
            setFormData({
                title: editingAssignment.title,
                description: editingAssignment.description || '', // Ensure description is not undefined
                facultyId: editingAssignment.facultyId,
                className: editingAssignment.className,
                sectionId: editingAssignment.sectionId,
                subjectName: editingAssignment.subjectName,
                dateBS: editingAssignment.dateBS,
            });
            const existingFiles: ModalFileState[] = (editingAssignment.fileIds || []).map((fileId, index) => ({
                id: fileId,
                name: (editingAssignment.fileNames || [])[index] || `Attachment ${index + 1}`,
                size: 0, // We don't store original size; could fetch if critical
                isNew: false,
            }));
            setManagedFiles(existingFiles);
            // Pre-fetch dropdown data is handled by openDrawer in store
        } else {
            // Reset form for new assignment
            setFormData({
                title: '', description: '', facultyId: '', className: '', sectionId: '',
                subjectName: '', dateBS: new NepaliDateConverter(new Date()).format('YYYY-MM-DD'),
            });
            setManagedFiles([]);
        }
    }, [editingAssignment]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Cascading dropdown logic based on form's current selections
        if (name === 'facultyId') {
            setFormData(prev => ({ ...prev, className: '', sectionId: '', subjectName: '' })); // Reset dependent fields
            if (value) fetchClassesForFaculty(value);
            else useAssignmentStore.setState({ classesForFilter: [], sectionsForFilter: [], subjectsForFilter: [] }); // Clear dependent data in store
        } else if (name === 'className') {
            setFormData(prev => ({ ...prev, sectionId: '', subjectName: '' }));
            if (value && formData.facultyId) fetchSectionsForClassAndFaculty(formData.facultyId, value);
            else useAssignmentStore.setState({ sectionsForFilter: [], subjectsForFilter: [] });
        } else if (name === 'sectionId') {
            setFormData(prev => ({ ...prev, subjectName: '' }));
            if (value) fetchSubjectsForSection(value);
            else useAssignmentStore.setState({ subjectsForFilter: [] });
        }
    };

    const handleDateChange = (bsDate: string) => { // Assuming your date picker provides YYYY-MM-DD
        setFormData(prev => ({ ...prev, dateBS: bsDate }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFilesToAdd: ModalFileState[] = Array.from(e.target.files).map((file, index) => {
                let fileError: string | undefined = undefined;
                if (file.size > MAX_FILE_SIZE_BYTES) {
                    fileError = `File size (${formatBytes(file.size)}) exceeds limit of ${formatBytes(MAX_FILE_SIZE_BYTES)}.`;
                    toast.error(`${file.name}: ${fileError}`, { duration: 6000 });
                }
                return {
                    id: `${localIdPrefix}-new-${Date.now()}-${index}`,
                    name: file.name,
                    size: file.size,
                    object: fileError ? undefined : file, // Don't attach file object if error
                    isNew: true,
                    error: fileError,
                };
            });
            // Only add files without errors to the managed list, or visually indicate errored files
            setManagedFiles(prev => [...prev, ...newFilesToAdd.filter(f => !f.error)]);
            // If you want to show errored files in the list to be removed manually:
            // setManagedFiles(prev => [...prev, ...newFilesToAdd]);
            e.target.value = ''; // Allow selecting the same file again after removing
        }
    };

    const removeFile = (fileIdToRemove: string) => {
        setManagedFiles(prev => prev.map(f => {
            if (f.id === fileIdToRemove) {
                if (f.isNew || f.error) return null; // Remove new/errored files directly
                return { ...f, toDelete: true }; // Mark existing files for deletion
            }
            return f;
        }).filter(Boolean) as ModalFileState[]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!formData.title || !formData.facultyId || !formData.className || !formData.sectionId || !formData.subjectName || !formData.dateBS) {
            toast.error("Please fill all required fields for the assignment.");
            return;
        }
        const filesWithErrors = managedFiles.filter(f => f.error && f.isNew);
        if (filesWithErrors.length > 0) {
            toast.error("Some selected files have errors (e.g., too large). Please remove them before submitting.");
            return;
        }

        const filesToUpload = managedFiles.filter(f => f.isNew && f.object && !f.error).map(f => f.object as File);
        const fileIdsToDelete = managedFiles.filter(f => !f.isNew && f.toDelete).map(f => f.id);

        let successOperation = false;
        if (editingAssignment) {
            successOperation = await updateAssignment(editingAssignment.$id, {
                ...formData,
                newFiles: filesToUpload,
                filesToDelete: fileIdsToDelete,
            });
        } else {
            successOperation = await addAssignment({
                ...formData,
                files: filesToUpload,
            });
        }

        if (successOperation) {
            onFormSubmitSuccess(); // This will trigger closeDrawer in TeacherAssignmentsPage
        }
        // Toasts for success/failure are handled within the store actions
    };

    return (
        <>
            <Drawer.Body className="!p-5 md:!p-6 custom-scrollbar"> {/* Custom scrollbar class if needed */}
                <form id="assignment-form" onSubmit={handleSubmit} className="space-y-5">
                    {storeError && !isSubmitting && ( // Show store error only if not submitting (to avoid flicker)
                        <p className="text-red-600 bg-red-100 p-3 rounded-lg text-sm">
                            <FiAlertTriangle className="inline mr-2 mb-0.5" />
                            {storeError}
                        </p>
                    )}
                    
                    {/* Faculty Select */}
                    <div>
                        <label htmlFor="formFacultyId" className="block text-sm font-medium text-slate-700 mb-1">Faculty</label>
                        <select name="facultyId" id="formFacultyId" value={formData.facultyId} onChange={handleInputChange} required
                            className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            <option value="">Select Faculty</option>
                            {faculties.map(f => <option key={f.$id} value={f.$id}>{f.name}</option>)}
                        </select>
                    </div>
                    {/* Class Select */}
                    <div>
                        <label htmlFor="formClassName" className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                        <select name="className" id="formClassName" value={formData.className} onChange={handleInputChange} required
                            disabled={!formData.facultyId || formClasses.length === 0}
                            className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-100 disabled:cursor-not-allowed">
                            <option value="">Select Class</option>
                            {formClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    {/* Section Select */}
                     <div>
                        <label htmlFor="formSectionId" className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                        <select name="sectionId" id="formSectionId" value={formData.sectionId} onChange={handleInputChange} required
                            disabled={!formData.className || formSections.length === 0}
                            className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-100 disabled:cursor-not-allowed">
                            <option value="">Select Section</option>
                            {formSections.map(s => <option key={s.$id} value={s.$id}>{s.name}</option>)}
                        </select>
                    </div>
                    {/* Subject Select */}
                    <div>
                        <label htmlFor="formSubjectName" className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                        <select name="subjectName" id="formSubjectName" value={formData.subjectName} onChange={handleInputChange} required
                            disabled={!formData.sectionId || formSubjects.length === 0}
                            className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-100 disabled:cursor-not-allowed">
                            <option value="">Select Subject</option>
                            {formSubjects.map(sName => <option key={sName} value={sName}>{sName}</option>)}
                        </select>
                    </div>
                    {/* Title Input */}
                    <div>
                        <label htmlFor="formTitle" className="block text-sm font-medium text-slate-700 mb-1">Assignment Title</label>
                        <input type="text" name="title" id="formTitle" value={formData.title} onChange={handleInputChange} required
                            className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    {/* Description Textarea */}
                    <div>
                        <label htmlFor="formDescription" className="block text-sm font-medium text-slate-700 mb-1">Description (Supports Markdown)</label>
                        <textarea name="description" id="formDescription" value={formData.description} onChange={handleInputChange} rows={6}
                            className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm custom-scrollbar"
                            placeholder="Enter assignment details, questions, instructions. Use Markdown for formatting (e.g., # Heading, *italic*, **bold**, - List item)."></textarea>
                    </div>
                    {/* Due Date (BS) */}
                    <div>
                        <label htmlFor="formDateBS" className="block text-sm font-medium text-slate-700 mb-1">Due Date (BS)</label>
                        <input type="text" name="dateBS" id="formDateBS" value={formData.dateBS} onChange={(e) => handleDateChange(e.target.value)}
                            placeholder="YYYY-MM-DD (e.g., 2080-05-15)" required
                            className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                         <p className="text-xs text-slate-500 mt-1">Enter date in Bikram Sambat format.</p>
                    </div>
                    {/* File Upload Section */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Attach Files (PDF, DOCX - Max {formatBytes(MAX_FILE_SIZE_BYTES)})</label>
                        <div className="mt-1 flex justify-center px-6 py-8 border-2 border-slate-300 border-dashed rounded-lg hover:border-indigo-500 transition-colors cursor-pointer bg-slate-50/50 hover:bg-slate-50"
                             onClick={() => document.getElementById('file-upload-input')?.click()}>
                            <div className="space-y-1 text-center">
                                <FiUploadCloud className="mx-auto h-10 w-10 text-slate-400" />
                                <div className="flex text-sm text-slate-600">
                                    <label htmlFor="file-upload-input" className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                        <span>Choose files</span>
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                 <p className="text-xs text-slate-500">Max {formatBytes(MAX_FILE_SIZE_BYTES)} per file</p>
                            </div>
                            <input id="file-upload-input" name="files" type="file" className="sr-only" multiple
                                accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={handleFileChange} />
                        </div>
                        {/* Display Managed Files */}
                        {managedFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {managedFiles.map((file) => (
                                    <div key={file.id}>
                                        <div className={`flex items-center justify-between text-sm p-2.5 rounded-lg border ${
                                            file.toDelete ? 'border-red-300 opacity-70 bg-red-50 line-through' :
                                            file.error ? 'border-red-400 bg-red-100' :
                                            'border-slate-200 bg-slate-50'
                                        }`}>
                                            <div className="flex items-center overflow-hidden min-w-0">
                                                {file.error ? <FiAlertTriangle className="mr-2 h-4 w-4 text-red-600 flex-shrink-0" title={file.error} /> : <FiPaperclip className="mr-2 h-4 w-4 text-slate-500 flex-shrink-0" />}
                                                <span className={`truncate ${file.error ? 'text-red-700 font-medium' : 'text-slate-700'}`} title={file.name}>
                                                    {file.name}
                                                </span>
                                                {!file.error && <span className="ml-2 text-xs text-slate-500 whitespace-nowrap">({formatBytes(file.size)})</span>}
                                                {file.isNew && !file.toDelete && !file.error && <span className="ml-2 text-xs text-green-600 whitespace-nowrap font-semibold">(New)</span>}
                                            </div>
                                            <button type="button" onClick={() => removeFile(file.id)}
                                                className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50 flex-shrink-0 p-1 hover:bg-red-100 rounded-md"
                                                disabled={isSubmitting} aria-label={`Remove ${file.name}`}
                                            >
                                                <FiXCircle size={18} />
                                            </button>
                                        </div>
                                        {file.error && !file.toDelete && <p className="text-xs text-red-600 mt-0.5 pl-1">{file.error}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Hidden submit button for the form, actual submit triggered by Drawer.Footer button */}
                    <button type="submit" className="hidden" aria-hidden="true">Submit Form Internally</button>
                </form>
            </Drawer.Body>

            <Drawer.Footer className="bg-slate-50 dark:bg-gray-750">
                <button
                    type="button"
                    onClick={closeDrawer} // Use closeDrawer from store
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-sm dark:bg-gray-600 dark:text-slate-200 dark:border-gray-500 dark:hover:bg-gray-500 transition-colors"
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    form="assignment-form" // Links to the form in Drawer.Body
                    disabled={isSubmitting}
                    className="min-w-[140px] px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    {isSubmitting && <FiLoader className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />}
                    {isSubmitting ? (editingAssignment ? 'Updating...' : 'Adding...') : (editingAssignment ? 'Save Changes' : 'Add Assignment')}
                </button>
            </Drawer.Footer>
        </>
    );
};
export default AssignmentForm;