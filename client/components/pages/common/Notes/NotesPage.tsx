// src/pages/NotesPage.tsx
import React, { useEffect, useMemo } from 'react';
import { Button, Spinner } from '@heroui/react';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/solid'; // Using solid ArrowPathIcon
import { useNotesStore } from '~/store/notesStore';
import NoteCard from './NoteCard'; // Corrected path based on your structure
import NoteForm from './NoteForm'; // Corrected path
import SearchBar from '../SearchBar'; // Corrected path
import CustomSelect, { SelectOption } from '../../common/CustomSelect'; // Corrected path
import ActionButton from '../../../common/ActionButton'; // Import ActionButton

import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';

const NOTES_COLLECTION_ID_ENV = import.meta.env.VITE_APPWRITE_NOTES_COLLECTION_ID;
const NOTES_BUCKET_ID_ENV = import.meta.env.VITE_APPWRITE_NOTES_BUCKET_ID;

const NotesPage: React.FC = () => {
  const {
    fetchNotes,
    fetchFaculties,
    fetchCurrentUser,
    faculties,
    // sections, // Not directly used for options here
    isLoading,
    error,
    openNoteForm,
    isNoteFormOpen,
    closeNoteForm,
    editingNote,
    searchTerm,
    setSearchTerm,
    filterFacultyId,
    setFilterFacultyId,
    filterClass,
    setFilterClass,
    // filterSectionId, // Removed from here as it was commented out in your filters
    // setFilterSectionId,
    getFilteredNotes,
    isFetchingFilters,
  } = useNotesStore();

  useEffect(() => {
    fetchCurrentUser();
    fetchFaculties();
    fetchNotes();
  }, [fetchCurrentUser, fetchFaculties, fetchNotes]);

  const facultyOptions: SelectOption[] = useMemo(() => 
    faculties.map(f => ({ id: f.$id, name: f.name })),
    [faculties]
  );
  
  const classOptions: SelectOption[] = useMemo(() => {
    if (!filterFacultyId) return [];
    const selectedFaculty = faculties.find(f => f.$id === filterFacultyId);
    return selectedFaculty?.classes.map(c => ({ id: c, name: c })) || [];
  }, [filterFacultyId, faculties]);

  // const sectionOptions: SelectOption[] = useMemo(() => {
  //   return useNotesStore.getState().sections.map(s => ({ id: s.$id, name: s.name }));
  // }, [filterFacultyId, filterClass]); // Dependencies based on when sections are fetched

  const filteredNotes = getFilteredNotes();

  const handleReload = () => {
    fetchNotes();
  };

  if (!NOTES_COLLECTION_ID_ENV || !NOTES_BUCKET_ID_ENV) {
    return (
        <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <h2 className="text-xl font-semibold">Configuration Error</h2>
            <p>VITE_APPWRITE_NOTES_COLLECTION_ID or VITE_APPWRITE_NOTES_BUCKET_ID is not defined.</p>
        </div>
    );
  }

  return (
    <PerfectScrollbar options={{ suppressScrollX: true, wheelSpeed: 2 }}>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-800">Notes</h1>
            <ActionButton
              icon={<ArrowPathIcon className="h-5 w-5"
                color='blue' />}
              onClick={handleReload}
              isLoading={isLoading && !isFetchingFilters} // Show loading if notes are loading AND filters are not
              color="default" // Use a neutral color for refresh
              tooltipText="Reload Notes"
            />
          </div>
          <Button color="primary" onPress={() => openNoteForm()} startContent={<PlusIcon className="h-5 w-5" />}>
            Add Note
          </Button>
        </div>

        {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">Error: {error}</p>}

        <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow">
          <div className="flex flex-wrap gap-4 items-end"> {/* Changed to flex-wrap for responsiveness */}
            <SearchBar
              placeholder="Search notes..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="flex-grow min-w-[250px] sm:min-w-[300px]" // Allow search bar to grow
            />
            <CustomSelect
              label="Filter by Faculty"
              options={facultyOptions}
              value={filterFacultyId}
              onChange={setFilterFacultyId}
              placeholder="All Faculties"
              isLoading={isFetchingFilters && faculties.length === 0}
              className='min-w-[200px]' // Ensure minimum width
            />
            <CustomSelect
              label="Filter by Class"
              options={classOptions}
              value={filterClass}
              onChange={setFilterClass}
              placeholder="All Classes"
              disabled={!filterFacultyId || isFetchingFilters}
              isLoading={isFetchingFilters && !!filterFacultyId && classOptions.length === 0}
              className='min-w-[200px]'
            />
            {/* Section filter was commented out in your provided code */}
          </div>
        </div>

        {isLoading && !filteredNotes.length && !isFetchingFilters ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" label="Loading notes..." />
          </div>
        ) : filteredNotes.length === 0 && !error ? ( // Added !error condition
          <p className="text-center text-gray-500 py-10">No notes found. Try adjusting your filters or add a new note!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map(note => (
              <NoteCard key={note.$id} note={note} />
            ))}
          </div>
        )}

        <NoteForm
          isOpen={isNoteFormOpen}
          onClose={closeNoteForm}
          editingNote={editingNote}
        />
      </div>
    </PerfectScrollbar>
  );
};

export default NotesPage;