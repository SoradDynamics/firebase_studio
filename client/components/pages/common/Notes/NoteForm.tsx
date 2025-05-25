// src/components/notes/NoteForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Textarea } from '@heroui/react';
import { Drawer } from '../../../common/Drawer'; // Your Drawer path
import CustomSelect, { SelectOption } from '../../common/CustomSelect'; // Your CustomSelect path
import { useNotesStore } from '~/store/notesStore';
import type { Note, NoteDocument, FileUpload } from 'types/notes';
import { XCircleIcon, PaperClipIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 10;
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx'];


interface NoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingNote: Note | null;
}

const NoteForm: React.FC<NoteFormProps> = ({ isOpen, onClose, editingNote }) => {
  const {
    addNote,
    updateNote,
    isFormLoading,
    faculties,
    sections,
    fetchSections,
    currentUser,
  } = useNotesStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [files, setFiles] = useState<FileUpload[]>([]); // For new files to upload
  const [existingFiles, setExistingFiles] = useState<{ id: string, name: string, mimeType: string }[]>([]); // For files already on the note
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const facultyOptions: SelectOption[] = faculties.map(f => ({ id: f.$id, name: f.name }));
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [sectionOptions, setSectionOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title);
      setDescription(editingNote.description || '');
      setNoteDate(new Date(editingNote.noteDate).toISOString().split('T')[0]);
      setSelectedFacultyId(editingNote.facultyId || null);
      setSelectedClass(editingNote.className || null);
      setSelectedSectionId(editingNote.sectionId || null);
      setSubject(editingNote.subject || '');
      setExistingFiles(editingNote.fileIds.map((id, index) => ({
        id,
        name: editingNote.fileNames[index],
        mimeType: editingNote.fileMimeTypes[index]
      })));
      setFiles([]); // Clear any pending new files
    } else {
      // Reset form for new note
      setTitle('');
      setDescription('');
      setNoteDate(new Date().toISOString().split('T')[0]);
      setSelectedFacultyId(null);
      setSelectedClass(null);
      setSelectedSectionId(null);
      setSubject('');
      setFiles([]);
      setExistingFiles([]);
    }
    setFileErrors([]);
  }, [editingNote, isOpen]); // Re-populate form when editingNote or isOpen changes

  useEffect(() => {
    if (selectedFacultyId) {
      const faculty = faculties.find(f => f.$id === selectedFacultyId);
      setClassOptions(faculty?.classes.map(c => ({ id: c, name: c })) || []);
      if (!faculty?.classes.includes(selectedClass || '')) {
         setSelectedClass(null); // Reset class if not in new faculty's list
      }
    } else {
      setClassOptions([]);
      setSelectedClass(null);
    }
    setSelectedSectionId(null); // Reset section when faculty changes
    setSectionOptions([]);
  }, [selectedFacultyId, faculties]);

  useEffect(() => {
    if (selectedFacultyId && selectedClass) {
      fetchSections(selectedFacultyId, selectedClass);
    } else {
      setSectionOptions([]); // Clear sections if faculty or class is not selected
    }
    setSelectedSectionId(null); // Reset section when class changes
  }, [selectedFacultyId, selectedClass, fetchSections]);

 useEffect(() => {
    setSectionOptions(sections.map(s => ({ id: s.$id, name: s.name })));
  }, [sections]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const currentTotalFiles = files.length + existingFiles.length;
      let errors: string[] = [];
      let validNewFiles: FileUpload[] = [];

      if (newFiles.length + currentTotalFiles > MAX_FILES) {
        errors.push(`You can upload a maximum of ${MAX_FILES} files in total.`);
      } else {
        newFiles.forEach(file => {
          if (!ALLOWED_FILE_TYPES.includes(file.type) && !ALLOWED_FILE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
            errors.push(`File ${file.name} has an invalid type. Allowed: PDF, DOC, DOCX.`);
          } else if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            errors.push(`File ${file.name} exceeds ${MAX_FILE_SIZE_MB}MB size limit.`);
          } else {
            validNewFiles.push({ file, id: crypto.randomUUID() });
          }
        });
      }
      setFileErrors(errors);
      if(errors.length === 0) {
        setFiles(prev => [...prev, ...validNewFiles]);
      }
       // Clear the input value to allow selecting the same file again if removed
      event.target.value = '';
    }
  };

  const removeNewFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setFileErrors([]);
  };

  const removeExistingFile = (id: string) => {
    setExistingFiles(prev => prev.filter(f => f.id !== id));
    setFileErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
        alert("Error: Not logged in!");
        return;
    }
    if (fileErrors.length > 0) {
        alert("Please fix file errors before submitting.");
        return;
    }

    const noteDetails: Omit<NoteDocument, 'uploadedById' | 'uploaderEmail' | 'fileIds' | 'fileNames' | 'fileMimeTypes'> = {
      title,
      description,
      noteDate: new Date(noteDate).toISOString(), // Ensure it's ISO
      facultyId: selectedFacultyId || undefined,
      facultyName: selectedFacultyId ? faculties.find(f => f.$id === selectedFacultyId)?.name : undefined,
      className: selectedClass || undefined,
      sectionId: selectedSectionId || undefined,
      sectionName: selectedSectionId ? sections.find(s => s.$id === selectedSectionId)?.name : undefined,
      subject,
    };

    if (editingNote) {
      const filesToAdd = files.map(f => f.file);
      const removedExistingFileIds = editingNote.fileIds.filter(id => !existingFiles.some(ef => ef.id === id));
      const removedExistingFileNames = editingNote.fileNames.filter((name, index) => removedExistingFileIds.includes(editingNote.fileIds[index]));
      const removedExistingFileMimeTypes = editingNote.fileMimeTypes.filter((type, index) => removedExistingFileIds.includes(editingNote.fileIds[index]));


      await updateNote(
        editingNote.$id,
        noteDetails,
        filesToAdd,
        removedExistingFileIds,
        removedExistingFileNames,
        removedExistingFileMimeTypes
      );
    } else {
      await addNote(noteDetails, files.map(f => f.file));
    }
    // onClose handled by store if successful
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={editingNote ? "Edit Note" : "Add New Note"} size="lg">
      <form onSubmit={handleSubmit}>
        <Drawer.Body className="space-y-4">
          <Input
            label="Title"
            placeholder="Enter note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            isRequired
            fullWidth
          />
          <Textarea
            label="Description"
            placeholder="Enter note description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            minRows={3}
          />
          <Input
            type="date"
            label="Date"
            value={noteDate}
            onChange={(e) => setNoteDate(e.target.value)}
            isRequired
            fullWidth
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomSelect
              label="Faculty"
              options={facultyOptions}
              value={selectedFacultyId}
              onChange={setSelectedFacultyId}
              placeholder="Select Faculty"
                          />
            <CustomSelect
              label="Class (Optional)"
              options={classOptions}
              value={selectedClass}
              onChange={setSelectedClass}
              placeholder="Select Class"
              disabled={!selectedFacultyId || classOptions.length === 0}
            />
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input
              label="Subject (Optional)"
              placeholder="Enter subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              fullWidth
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Files (PDF, DOC, DOCX - Max {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload files</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileChange}
                      disabled={files.length + existingFiles.length >= MAX_FILES}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF, DOC, DOCX up to {MAX_FILE_SIZE_MB}MB each</p>
              </div>
            </div>
            {fileErrors.length > 0 && (
              <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                {fileErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            )}
            {(existingFiles.length > 0 || files.length > 0) && (
                <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700">Selected Files:</p>
                    <ul className="mt-1 space-y-1">
                        {existingFiles.map(file => (
                            <li key={file.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                <div>
                                    <PaperClipIcon className="h-4 w-4 inline mr-2 text-gray-500" />
                                    {file.name} <span className="text-xs text-gray-400">(already uploaded)</span>
                                </div>
                                <button type="button" onClick={() => removeExistingFile(file.id)} className="text-red-500 hover:text-red-700">
                                    <XCircleIcon className="h-5 w-5" />
                                </button>
                            </li>
                        ))}
                        {files.map(fileItem => (
                            <li key={fileItem.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                <div>
                                <PaperClipIcon className="h-4 w-4 inline mr-2 text-gray-500" />
                                {fileItem.file.name}
                                </div>
                                <button type="button" onClick={() => removeNewFile(fileItem.id)} className="text-red-500 hover:text-red-700">
                                <XCircleIcon className="h-5 w-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button color="default" variant="flat" onPress={onClose} disabled={isFormLoading}>
            Cancel
          </Button>
          <Button color="primary" type="submit" isLoading={isFormLoading} disabled={isFormLoading || fileErrors.length > 0}>
            {editingNote ? 'Update Note' : 'Add Note'}
          </Button>
        </Drawer.Footer>
      </form>
    </Drawer>
  );
};

export default NoteForm;