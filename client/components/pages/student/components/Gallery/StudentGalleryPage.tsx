
import React, { useEffect, useState, useCallback } from 'react';
import { useStudentGalleryStore } from '~/store/studentGalleryStore';
import StudentGalleryGroupCard from './StudentGalleryGroupCard';
import PhotoCard from '../../../admin/components/Gallery/PhotoCard'; // Reusing the modified one
import FullScreenPhotoView from '../../../admin/components/Gallery/FullScreenPhotoView';
import SearchBar from '../../../common/SearchBar';
import type { GalleryGroup, GalleryPhoto } from 'types/gallery';
import toast from 'react-hot-toast';
import { Button } from '@heroui/react'; // If needed for "Back to Groups"
import { PhotoIcon } from '@heroicons/react/24/outline';


// Basic debounce utility (can be moved to a utils file if not already)
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}

const StudentGalleryPage: React.FC = () => {
  const {
    studentFacultyId,
    galleryGroups, // Groups specific to the student
    photosByGroup,
    selectedFullScreenPhoto,
    isFetchingStudentInfo,
    isLoadingGroups,
    isLoadingPhotos,
    error,
    fetchStudentInfoAndSetFaculty,
    fetchGalleryGroupsForStudent,
    fetchPhotosForGroup,
    setFullScreenPhoto,
    clearError,
  } = useStudentGalleryStore();

  const [selectedGroupForView, setSelectedGroupForView] = useState<GalleryGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch student info on mount to get their facultyId
  useEffect(() => {
    fetchStudentInfoAndSetFaculty();
  }, [fetchStudentInfoAndSetFaculty]);

  // 2. Debounced function for fetching gallery groups
  // Wrapped in useCallback to prevent re-creation on every render unless dependencies change
  const debouncedFetchGroups = useCallback(
    debounce((currentSearchTerm: string) => {
      if (studentFacultyId) { // Only fetch if facultyId is known
        fetchGalleryGroupsForStudent(currentSearchTerm);
      }
    }, 300), // Adjust debounce delay as needed
    [studentFacultyId, fetchGalleryGroupsForStudent] // Dependencies for useCallback
  );

  // 3. Fetch gallery groups when studentFacultyId is available or searchTerm changes
  useEffect(() => {
    // Initial fetch or when studentFacultyId changes (and searchTerm is empty)
    // Or when searchTerm changes (and studentFacultyId is present)
    if (studentFacultyId) {
        debouncedFetchGroups(searchTerm);
    }
  }, [studentFacultyId, searchTerm, debouncedFetchGroups]);


  // 4. Handle and clear errors
  useEffect(() => {
    if (error) {
      toast.error(error); // Show toast notification for errors
      clearError(); // Clear error from store after displaying
    }
  }, [error, clearError]);

  const handleViewPhotos = (group: GalleryGroup) => {
    setSelectedGroupForView(group);
    // Fetch photos if not already loaded or explicitly want to refresh (though not implemented here)
    if (!photosByGroup[group.$id] || photosByGroup[group.$id]?.length === 0) {
      fetchPhotosForGroup(group.$id);
    }
  };

  const currentPhotosInView = selectedGroupForView ? photosByGroup[selectedGroupForView.$id] || [] : [];
  const selectedPhotoIndex = selectedFullScreenPhoto
    ? currentPhotosInView.findIndex(p => p.$id === selectedFullScreenPhoto.$id)
    : -1;

  const handleNextPhoto = () => {
    if (selectedPhotoIndex > -1 && selectedPhotoIndex < currentPhotosInView.length - 1) {
      setFullScreenPhoto(currentPhotosInView[selectedPhotoIndex + 1]);
    }
  };

  const handlePrevPhoto = () => {
    if (selectedPhotoIndex > 0) {
      setFullScreenPhoto(currentPhotosInView[selectedPhotoIndex - 1]);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // debouncedFetchGroups will be called by the useEffect dependency on searchTerm
  };

  // --- UI Render Logic ---

  if (isFetchingStudentInfo) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4 bg-gray-50">
        <p className="text-lg text-gray-600 animate-pulse">Loading your gallery...</p>
      </div>
    );
  }

  // Handle cases where student facultyId couldn't be determined
  // This check is after isFetchingStudentInfo is false
  if (!studentFacultyId && !error) { // No error, but no facultyId means student data issue
     return (
        <div className="flex flex-col justify-center items-center min-h-screen p-4 text-center bg-gray-50">
            <PhotoIcon className="w-16 h-16 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Gallery Access Denied</h2>
            <p className="text-gray-500">We couldn't retrieve your faculty information to show relevant galleries.</p>
            <p className="text-sm text-gray-400 mt-1">Please ensure your student profile is complete or contact support.</p>
        </div>
     );
  }
   // If there was an error fetching student info (already handled by toast, but good for explicit UI)
   if (!studentFacultyId && error) { // Error state from store takes precedence
      return (
         <div className="flex flex-col justify-center items-center min-h-screen p-4 text-center bg-gray-50">
             <PhotoIcon className="w-16 h-16 text-red-400 mb-4" />
             <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Gallery</h2>
             <p className="text-red-500">{error}</p> {/* Display the specific error */}
             <p className="text-sm text-gray-400 mt-1">Please try again later.</p>
         </div>
      );
   }


  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {!selectedGroupForView ? (
        // --- Gallery Groups View ---
        <>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl font-semibold text-gray-800">School Photo Gallery</h1>
            <SearchBar
              placeholder="Search albums..."
              value={searchTerm}
              onValueChange={handleSearchChange}
              className="w-full sm:w-72"
              inputClassName="bg-white" // Example to ensure contrast on gray bg
            />
          </div>

          {isLoadingGroups && (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* Skeleton Loaders for Groups */}
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white shadow-lg rounded-lg overflow-hidden animate-pulse">
                        <div className="h-48 bg-gray-300"></div>
                        <div className="p-4">
                            <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                            <div className="h-4 bg-gray-300 rounded w-full"></div>
                        </div>
                    </div>
                ))}
            </div>
          )}
          {!isLoadingGroups && galleryGroups.length === 0 && !searchTerm && (
            <div className="text-center py-16">
              <PhotoIcon className="mx-auto h-20 w-20 text-gray-400" />
              <p className="mt-4 text-xl text-gray-600">No Photo Albums Found</p>
              <p className="text-sm text-gray-400 mt-1">It looks like there are no albums available for you right now. Check back soon!</p>
            </div>
          )}
           {!isLoadingGroups && galleryGroups.length === 0 && searchTerm && (
            <p className="text-center text-gray-500 py-8">No albums found matching "{searchTerm}". Try a different search.</p>
          )}

          {!isLoadingGroups && galleryGroups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {galleryGroups.map((group) => (
                <StudentGalleryGroupCard
                  key={group.$id}
                  group={group}
                  onViewPhotos={handleViewPhotos}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        // --- Photos in Selected Group View ---
        <section className="mt-2">
          <div className="flex flex-col sm:flex-row justify-start items-center mb-6 gap-3">
            <Button
              variant="flat"
              color="default"
              size="md"
              onPress={() => {
                setSelectedGroupForView(null);
                // Optionally clear search when going back, or refetch all groups for the current faculty
                // setSearchTerm(''); // Uncomment if you want to clear search
                // if (studentFacultyId) fetchGalleryGroupsForStudent(searchTerm); // Keep current search or clear it by passing ''
              }}
              className="whitespace-nowrap flex-shrink-0 font-semibold"
              startContent={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>}
            >
              Back
            </Button>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-700 truncate" title={selectedGroupForView.title}>
              {selectedGroupForView.title}
            </h2>
          </div>
           {selectedGroupForView.description && (
            <p className="text-sm text-gray-600 mb-6 prose max-w-none dark:text-gray-300">{selectedGroupForView.description}</p>
           )}

          {isLoadingPhotos[selectedGroupForView.$id] && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                 {/* Skeleton Loaders for Photos */}
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-300 rounded-lg animate-pulse"></div>
                ))}
            </div>
          )}
          {!isLoadingPhotos[selectedGroupForView.$id] && currentPhotosInView.length === 0 && (
            <div className="text-center py-12">
                 <PhotoIcon className="mx-auto h-16 w-16 text-gray-400" />
                 <p className="mt-3 text-lg text-gray-500">This album is currently empty.</p>
                 <p className="text-sm text-gray-400">No photos have been added yet.</p>
            </div>
          )}
          {!isLoadingPhotos[selectedGroupForView.$id] && currentPhotosInView.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {currentPhotosInView.map(photo => (
                <PhotoCard
                  key={photo.$id}
                  photo={photo}
                  onView={setFullScreenPhoto}
                  isViewOnly={true}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {selectedFullScreenPhoto && (
        <FullScreenPhotoView
          isOpen={!!selectedFullScreenPhoto}
          photo={selectedFullScreenPhoto}
          onClose={() => setFullScreenPhoto(null)}
          onNext={selectedPhotoIndex < currentPhotosInView.length - 1 ? handleNextPhoto : undefined}
          onPrev={selectedPhotoIndex > 0 ? handlePrevPhoto : undefined}
          canNext={selectedPhotoIndex < currentPhotosInView.length - 1}
          canPrev={selectedPhotoIndex > 0}
        />
      )}
    </div>
  );
};

export default StudentGalleryPage;