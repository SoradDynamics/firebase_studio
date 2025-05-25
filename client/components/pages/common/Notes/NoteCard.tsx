// src/components/notes/NoteCard.tsx
import React, { useState } from 'react';
import { Note } from 'types/notes';
import { useNotesStore } from '~/store/notesStore';
import ActionButton from '../../../common/ActionButton';
import Popover from '../../../common/Popover';
import { PencilIcon, TrashIcon, DocumentArrowDownIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { storage } from '~/utils/appwrite';
import { Download, DownloadIcon } from 'lucide-react';

const NOTES_BUCKET_ID = import.meta.env.VITE_APPWRITE_NOTES_BUCKET_ID;

interface NoteCardProps {
  note: Note;
}

const NoteCard: React.FC<NoteCardProps> = ({ note }) => {
  const { openNoteForm, deleteNote, currentUser } = useNotesStore(); // Removed isLoading from here as it was for store-level delete
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = currentUser?.$id === note.uploadedById;

  const handleDownload = (fileId: string, fileName: string) => {
    // ... (download logic - assumed correct from previous fixes)
    if (!NOTES_BUCKET_ID) {
        console.error("Notes Bucket ID is not configured.");
        alert("Error: File download configuration is missing.");
        return;
    }
    try {
      const url = storage.getFileDownload(NOTES_BUCKET_ID, fileId);
      console.log("Generated download URL:", url.href);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 100);
    } catch (error) {
      console.error("Error generating download link or initiating download:", error);
      alert("Could not download file.");
    }
  };
  
  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    await deleteNote(note.$id, note.fileIds);
    setIsDeleting(false);
    setIsDeletePopoverOpen(false);
  };

  // For debugging:
  console.log("Note object in NoteCard:", JSON.parse(JSON.stringify(note)));


  return (
    <div className="bg-white shadow-lg rounded-lg p-5 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-semibold text-gray-800">{note.title}</h3>
        {isOwner && (
          <div className="flex space-x-2">
            <ActionButton
              icon={<PencilIcon className="h-4 w-4" />}
              onClick={() => openNoteForm(note)}
              color="orange"
              isIconOnly
            />
            <ActionButton
              icon={<TrashIcon className="h-4 w-4" />}
              onClick={() => setIsDeletePopoverOpen(true)}
              color="red"
              isIconOnly
            />
          </div>
        )}
      </div>


      {/* DEBUGGING: Check if subject exists and has a value */}
      {note.subject && (
        <p className="text-sm text-gray-600">
          <span className="font-medium">Subject:</span> {note.subject}
        </p>
      )}

      {note.description && (
        <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{note.description}</p>
      )}


      <p className="text-xs text-gray-500 mb-1">
        Date: {new Date(note.noteDate).toLocaleDateString()} <br /> By: {note.uploaderEmail}
      </p>
      
      {/* DEBUGGING: Let's make the conditions very explicit */}
      {(note.facultyName || note.className || note.sectionName || note.subject) && (
         <p className="text-xs text-gray-500 mb-3">
            {note.facultyName && `Faculty: ${note.facultyName}`}
            {note.className && `${note.facultyName ? ' | ' : ''}Class: ${note.className}`}
         </p>
       )}

      
      {note.fileIds && note.fileIds.length > 0 && (
        // ... (attachments logic) ...
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments:</h4>
          <ul className="space-y-2">
            {note.fileIds.map((fileId, index) => (
              <li key={fileId} className="flex items-center justify-between text-sm">
                <div className="flex items-center truncate">
                    <PaperClipIcon className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                    <span className="truncate" title={note.fileNames[index]}>
                        {note.fileNames[index]}
                    </span>
                </div>
                <button
                  onClick={() => handleDownload(fileId, note.fileNames[index])}
                  className="ml-2 text-indigo-600 hover:text-indigo-800 font-medium text-xs p-1 rounded hover:bg-indigo-50 transition-colors"
                  title={`Download ${note.fileNames[index]}`}
                >
                  <DownloadIcon className="h-5 w-5 inline"/>
                  <span className="sr-only">Download</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Popover
        isOpen={isDeletePopoverOpen}
        onClose={() => setIsDeletePopoverOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Note"
        content={`Are you sure you want to delete the note "${note.title}"? This action cannot be undone.`}
        isConfirmLoading={isDeleting}
      />
    </div>
  );
};

export default NoteCard;