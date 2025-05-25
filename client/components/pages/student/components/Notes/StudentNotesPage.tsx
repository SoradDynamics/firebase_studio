// src/pages/StudentNotesPage.tsx
import React, { useEffect } from 'react';
import { Spinner } from '@heroui/react';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { useNotesStore } from '~/store/notesStore';
import NoteCard from '../../../common/Notes/NoteCard'; // Corrected path
import SearchBar from '../../../common/SearchBar'; // Corrected path
import ActionButton from '../../../../common/ActionButton'; // Import ActionButton

import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';

const STUDENTS_COLLECTION_ID_ENV = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID;

const StudentNotesPage: React.FC = () => {
  const {
    currentUser,
    currentStudentProfile,
    isStudentDataLoading,
    studentPageError,
    studentSearchTerm,
    fetchCurrentUser,
    fetchCurrentStudentProfile,
    fetchNotesForStudent, // Action to refresh notes
    setStudentSearchTerm,
    getFilteredStudentNotes,
  } = useNotesStore();

  useEffect(() => {
    const loadInitialUser = async () => {
      if (!currentUser) {
        await fetchCurrentUser();
      }
    };
    loadInitialUser();
  }, [fetchCurrentUser, currentUser]);

  useEffect(() => {
    if (currentUser && !currentStudentProfile && !isStudentDataLoading && !studentPageError) {
      fetchCurrentStudentProfile(); // This also triggers fetchNotesForStudent internally on success
    }
  }, [currentUser, currentStudentProfile, fetchCurrentStudentProfile, isStudentDataLoading, studentPageError]);

  const filteredNotes = getFilteredStudentNotes();

  const handleReload = () => {
    if (currentStudentProfile) {
      fetchNotesForStudent();
    } else if (currentUser) {
      fetchCurrentStudentProfile();
    } else {
      fetchCurrentUser();
    }
  };

  if (STUDENTS_COLLECTION_ID_ENV === undefined) {
    return (
      <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded-md">
        <h2 className="text-xl font-semibold">Configuration Error</h2>
        <p>VITE_APPWRITE_STUDENT_COLLECTION_ID is not defined.</p>
      </div>
    );
  }

  return (
    <PerfectScrollbar options={{ suppressScrollX: true, wheelSpeed: 2 }}>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-800">
              My Notes {currentStudentProfile ? `(${currentStudentProfile.name})` : ''}
            </h1>
            <ActionButton
              icon={<ArrowPathIcon className="h-5 w-5" />}
              onClick={handleReload}
              isLoading={isStudentDataLoading}
              color="blue"
              tooltipText="Reload My Notes"
            />
          </div>
        </div>

        {studentPageError && (
          <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">Error: {studentPageError}</p>
        )}

        <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow">
          <SearchBar
            placeholder="Search your notes..."
            value={studentSearchTerm}
            onValueChange={setStudentSearchTerm} // Corrected prop name based on typical SearchBar
            className="w-full"
          />
        </div>

        {isStudentDataLoading && !filteredNotes.length && !currentStudentProfile ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" label="Loading student details & notes..." />
          </div>
        ) : isStudentDataLoading && currentStudentProfile && !filteredNotes.length ? (
           <div className="flex justify-center items-center h-64">
            <Spinner size="lg" label="Loading your notes..." />
          </div>
        ) : filteredNotes.length === 0 && !studentPageError && !isStudentDataLoading ? ( // Added !isStudentDataLoading
          <p className="text-center text-gray-500 py-10">
            No notes found matching your profile or search term.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map(note => (
              <NoteCard key={note.$id} note={note} allowAdminActions={false} />
            ))}
          </div>
        )}
      </div>
    </PerfectScrollbar>
  );
};

export default StudentNotesPage;