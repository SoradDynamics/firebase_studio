// src/pages/ParentNotesPage.tsx
import React, { useEffect } from 'react';
import { Spinner } from '@heroui/react';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { useParentStore } from '~/store/parentNoteStore';
import NoteCard from '../../../common/Notes/NoteCard'; // Corrected path
import SearchBar from '../../../common/SearchBar'; // Corrected path
import SelectStudentComponent from '../Select/SelectStudent'; // Corrected path
// import DisplayStudentComponent from '../Select/DisplayStudentRecords'; // Not used in this version of layout
import { useSelectedStudent } from '../../contexts/SelectedStudentContext'; // Corrected path
import ActionButton from '../../../../common/ActionButton'; // Import ActionButton

import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';

const STUDENTS_COLLECTION_ID_ENV = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID;
const PARENT_COLLECTION_ID_ENV = import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID;
const NOTES_COLLECTION_ID_ENV = import.meta.env.VITE_APPWRITE_NOTES_COLLECTION_ID;

const ParentNotesPage: React.FC = () => {
  const { selectedStudentId } = useSelectedStudent();

  const {
    isLoadingProfile,
    isLoadingNotes,
    error,
    searchTerm,
    setSelectedStudentIdForNotes,
    fetchNotesForSelectedStudent, // Specific action for reloading notes
    setSearchTerm,
    getFilteredNotes,
    clearParentViewData,
  } = useParentStore();

  useEffect(() => {
    setSelectedStudentIdForNotes(selectedStudentId);
    return () => {
      if (!selectedStudentId) {
        clearParentViewData();
      }
    };
  }, [selectedStudentId, setSelectedStudentIdForNotes, clearParentViewData]);

  const filteredNotes = getFilteredNotes();
  const isOverallLoading = isLoadingProfile || isLoadingNotes;

  const handleReloadNotesForSelectedStudent = () => {
    if (selectedStudentId) {
      fetchNotesForSelectedStudent();
    }
  };

  if (!STUDENTS_COLLECTION_ID_ENV || !PARENT_COLLECTION_ID_ENV || !NOTES_COLLECTION_ID_ENV) {
    return (
      <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded-md">
        <h2 className="text-xl font-semibold">Configuration Error</h2>
        <p>One or more Appwrite Collection IDs are not defined.</p>
      </div>
    );
  }

  return (
    <PerfectScrollbar options={{ suppressScrollX: true, wheelSpeed: 2 }}>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Removed the main H1 for "Parent Dashboard" as it was commented out */}
        
        {/* SelectStudentComponent is now the primary content driver */}
        <SelectStudentComponent />
        
        {/* Notes Section: Only shown if a student is selected via context */}
        {selectedStudentId && (
          <div>
            <div className="flex items-center justify-between mb-4 pt-4 border-t mt-6">
              <h2 className="text-2xl font-semibold text-gray-700">
                Notes for Selected Student
              </h2>
              <ActionButton
                icon={<ArrowPathIcon className="h-5 w-5" />}
                onClick={handleReloadNotesForSelectedStudent}
                isLoading={isLoadingNotes}
                color="blue"
                tooltipText="Reload Student's Notes"
              />
            </div>

            {error && (
              <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">Error: {error}</p>
            )}

            <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow">
              <SearchBar
                placeholder="Search notes for this student..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="w-full"
              />
            </div>

            {isOverallLoading && !filteredNotes.length ? (
              <div className="flex justify-center items-center h-40">
                <Spinner size="lg" label="Loading student data & notes..." />
              </div>
            ) : filteredNotes.length === 0 && !error && !isOverallLoading ? (
              <p className="text-center text-gray-500 py-10">
                No notes found for the selected student or your search term.
              </p>
            ) : !isOverallLoading && filteredNotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredNotes.map(note => (
                  <NoteCard key={note.$id} note={note} allowAdminActions={false} />
                ))}
              </div>
            ) : null}
          </div>
        )}
        {!selectedStudentId && !isOverallLoading && (
           <div className="text-center py-10 text-gray-500 mt-6 border-t pt-6">
              <p>Please select a student to view their associated notes.</p>
          </div>
         )}
      </div>
    </PerfectScrollbar>
  );
};

export default ParentNotesPage;