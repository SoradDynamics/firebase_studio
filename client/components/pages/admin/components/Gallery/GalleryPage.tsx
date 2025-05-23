// src/pages/GalleryPage.tsx
import React, { useEffect, useMemo } from 'react';
import { Button, Progress } from '@heroui/react';
import { PlusIcon, PhotoIcon as NoImageIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { useGalleryStore, ALL_FACULTIES_ID } from '~/store/galleryStore';
import GalleryItemCard from './GalleryCard';
import GalleryForm from './GalleryForm';
import Popover from '../common/Popover';
import SearchBar from '../common/SearchBar';
import CustomSelect, { SelectOption } from './CustomSelect';
import ImageViewer from './ImageViewer'; // Import the new viewer

const GalleryPage: React.FC = () => {
  const {
    galleryItems,
    faculties,
    isLoading,
    isFormLoading: isActionLoading,
    error,
    fetchGalleryItems,
    fetchFaculties,
    openFormDrawer,
    searchTerm,
    setSearchTerm,
    selectedFacultyFilter, // This is string | null for single faculty filter on page
    setSelectedFacultyFilter,
    isDeletePopoverOpen,
    itemToDelete,
    closeDeletePopover,
    confirmDeleteItem,
    // Image Viewer state and actions
    isImageViewerOpen,
    imagesForViewer,
    viewerInitialIndex,
    closeImageViewer,
  } = useGalleryStore();

  useEffect(() => {
    fetchFaculties(); 
    fetchGalleryItems(); // Will use initial selectedFacultyFilter (ALL_FACULTIES_ID)
  }, [fetchGalleryItems, fetchFaculties]);

  // Options for the main page filter (single select)
  const facultyFilterOptions: SelectOption[] = useMemo(() => {
    return faculties.map(f => ({ value: f.$id, label: f.name }));
  }, [faculties]);

  const filteredGalleryItems = useMemo(() => {
    if (!searchTerm.trim()) return galleryItems;
    return galleryItems.filter(item =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  }, [galleryItems, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-slate-900 min-h-screen text-gray-800 dark:text-gray-200">
      <header className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold ">
            School Gallery
          </h1>
          <Button
            color="primary"
            variant="solid"
            onPress={() => openFormDrawer()}
            startContent={<PlusIcon className="w-5 h-5" />}
            className="w-full sm:w-auto"
          >
            Add New Album
          </Button>
        </div>
        {error && (
            <div role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 p-3 rounded-md flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>Gallery Error: {error}</span>
            </div>
        )}
      </header>

      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <SearchBar
            placeholder="Search by album title..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="w-full"
            inputClassName="dark:bg-slate-700 dark:text-gray-50 dark:placeholder-gray-400"
          />
          <CustomSelect // Using CustomSelect for single-select filter
            label="Filter by Faculty/Category"
            labelClassName="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            options={facultyFilterOptions}
            value={selectedFacultyFilter} // string | null
            onChange={(val) => setSelectedFacultyFilter(val as string | null)}
            placeholder="All Faculties/Categories"
            className="w-full"
            buttonClassName="dark:bg-slate-700"
            dropdownClassName="dark:bg-slate-700"
            disabled={faculties.length === 0}
            isMulti={false} // Explicitly single select for this filter
          />
        </div>
      </div>
      
      {isLoading && galleryItems.length === 0 ? (
         <div className="flex flex-col justify-center items-center h-64 text-center">
          <Progress isIndeterminate aria-label="Loading..." size="lg" className="w-32" />
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading albums, please wait...</p>
        </div>
      ) : !isLoading && filteredGalleryItems.length === 0 ? (
        <div className="text-center py-12 px-4">
          <NoImageIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">No Albums Found</h3>
          <p className="mt-2 text-md text-gray-500 dark:text-gray-400">
            {searchTerm || (selectedFacultyFilter && selectedFacultyFilter !== ALL_FACULTIES_ID) 
              ? "Try adjusting your search or filter criteria." 
              : "It looks a bit empty here. Why not add some albums?"}
          </p>
          {!(searchTerm || (selectedFacultyFilter && selectedFacultyFilter !== ALL_FACULTIES_ID)) && (
             <Button
                color="primary"
                variant="solid"
                onPress={() => openFormDrawer()}
                startContent={<PlusIcon className="w-5 h-5" />}
                className="mt-6"
            >
                Add Your First Album
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredGalleryItems.map((item) => (
            <GalleryItemCard key={item.$id} item={item} />
          ))}
        </div>
      )}
      
      <GalleryForm />

      <Popover
        isOpen={isDeletePopoverOpen && itemToDelete != null}
        onClose={closeDeletePopover}
        onConfirm={confirmDeleteItem}
        title={
          <span className="flex items-center text-red-600 dark:text-red-400">
              <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
              Confirm Deletion
          </span>
      }
      content={
        <p className="text-gray-600 dark:text-gray-300">
          Are you sure you want to delete the image titled "<strong>{itemToDelete?.title}</strong>"?
          This action will permanently remove the image and its data. This cannot be undone.
        </p>
      }
        isConfirmLoading={isActionLoading}
      />

      <ImageViewer 
        isOpen={isImageViewerOpen}
        onClose={closeImageViewer}
        images={imagesForViewer}
        initialIndex={viewerInitialIndex}
      />
    </div>
  );
};

export default GalleryPage;