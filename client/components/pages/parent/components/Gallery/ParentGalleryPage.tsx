import React, { useEffect, useState, useCallback } from 'react';
import { useParentGalleryStore } from '~/store/parentGalleryStore'; // Use the dedicated parent store
import StudentGalleryGroupCard from '../../../student/components/Gallery/StudentGalleryGroupCard'; // Reusable
import PhotoCard from '../../../admin/components/Gallery/PhotoCard'; // Reusable
import FullScreenPhotoView from '../../../admin/components/Gallery/FullScreenPhotoView'; // Reusable
import SearchBar from '../../../common/SearchBar'; // Reusable
import type { GalleryGroup, GalleryPhoto } from 'types/gallery';
import toast from 'react-hot-toast';
import { Button } from '@heroui/react';
import { PhotoIcon, UserGroupIcon } from '@heroicons/react/24/outline'; // UserGroupIcon for parent context

// Debounce utility (can be moved to a utils file)
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

const ParentGalleryPage: React.FC = () => {
  const {
    parentAssociatedFacultyIds, // Faculty IDs relevant to the parent's children
    galleryGroups,
    photosByGroup,
    selectedFullScreenPhoto,
    isFetchingParentInfo,
    isLoadingGroups,
    isLoadingPhotos,
    error,
    fetchParentInfoAndFaculties,
    fetchGalleryGroupsForParent,
    fetchPhotosForGroup,
    setFullScreenPhoto,
    clearError,
  } = useParentGalleryStore();

  const [selectedGroupForView, setSelectedGroupForView] = useState<GalleryGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch parent info (and their children's faculty IDs) on mount
  useEffect(() => {
    fetchParentInfoAndFaculties();
  }, [fetchParentInfoAndFaculties]);

  // 2. Debounced function for fetching gallery groups
  const debouncedFetchGroups = useCallback(
    debounce((currentSearchTerm: string) => {
      // parentAssociatedFacultyIds is handled inside fetchGalleryGroupsForParent
      fetchGalleryGroupsForParent(currentSearchTerm);
    }, 300),
    [fetchGalleryGroupsForParent] // fetchGalleryGroupsForParent itself will use the latest parentAssociatedFacultyIds from store
  );

  // 3. Fetch gallery groups when parent info is ready or searchTerm changes
  useEffect(() => {
    // Only fetch if parent info has been processed (even if no specific faculties, it will fetch "ALL")
    // isFetchingParentInfo will be false after fetchParentInfoAndFaculties completes
    if (!isFetchingParentInfo) {
        debouncedFetchGroups(searchTerm);
    }
  }, [isFetchingParentInfo, searchTerm, debouncedFetchGroups]);


  // 4. Handle and clear errors
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleViewPhotos = (group: GalleryGroup) => {
    setSelectedGroupForView(group);
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
  };

  // --- UI Render Logic ---

  if (isFetchingParentInfo) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4 bg-gray-50">
        <p className="text-lg text-gray-600 animate-pulse">Loading gallery for your family...</p>
      </div>
    );
  }

  // This condition means parent info loaded, but there might have been an error message set by the store
  // (e.g., "Parent record not found", "No students associated")
  // The error from the store will be shown by the toast.
  // We can add a more specific UI here if parentAssociatedFacultyIds is empty AND no "ALL_FACULTIES" groups are available
  if (!isFetchingParentInfo && galleryGroups.length === 0 && !isLoadingGroups && !error && parentAssociatedFacultyIds.length === 0 && !searchTerm) {
    // This specific case: parent info loaded, no error, no associated faculties, no search term, and no "ALL_FACULTIES" groups found
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4 text-center bg-gray-50">
        <UserGroupIcon className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No Albums to Display</h2>
        <p className="text-gray-500">There are currently no photo albums relevant to your children or shared publicly.</p>
        <p className="text-sm text-gray-400 mt-1">This could be because no students are linked to your account, or no relevant albums exist.</p>
      </div>
    );
  }


  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {!selectedGroupForView ? (
        // --- Gallery Groups View ---
        <>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl font-semibold text-gray-800">Family Photo Gallery</h1>
            <SearchBar
              placeholder="Search albums..."
              value={searchTerm}
              onValueChange={handleSearchChange}
              className="w-full sm:w-72"
              inputClassName="bg-white"
            />
          </div>

          {isLoadingGroups && (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white shadow-lg rounded-lg overflow-hidden animate-pulse">
                        <div className="h-48 bg-gray-300"></div>
                        <div className="p-4"><div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div><div className="h-4 bg-gray-300 rounded w-1/2"></div></div>
                    </div>
                ))}
            </div>
          )}
          {!isLoadingGroups && galleryGroups.length === 0 && !searchTerm && (
            <div className="text-center py-16">
              <PhotoIcon className="mx-auto h-20 w-20 text-gray-400" />
              <p className="mt-4 text-xl text-gray-600">No Photo Albums Available</p>
              <p className="text-sm text-gray-400 mt-1">No albums relevant to your family are currently available. Please check back later.</p>
            </div>
          )}
           {!isLoadingGroups && galleryGroups.length === 0 && searchTerm && (
            <p className="text-center text-gray-500 py-8">No albums found matching "{searchTerm}" for your family.</p>
          )}

          {!isLoadingGroups && galleryGroups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {galleryGroups.map((group) => (
                <StudentGalleryGroupCard // Reusing this card, as it's view-only
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
              variant="flat" color="default" size="md"
              onPress={() => setSelectedGroupForView(null)}
              className="whitespace-nowrap flex-shrink-0 font-bold"
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
                {[...Array(6)].map((_, i) => (<div key={i} className="aspect-square bg-gray-300 rounded-lg animate-pulse"></div>))}
            </div>
          )}
          {!isLoadingPhotos[selectedGroupForView.$id] && currentPhotosInView.length === 0 && (
            <div className="text-center py-12">
                 <PhotoIcon className="mx-auto h-16 w-16 text-gray-400" /><p className="mt-3 text-lg text-gray-500">This album is currently empty.</p>
            </div>
          )}
          {!isLoadingPhotos[selectedGroupForView.$id] && currentPhotosInView.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {currentPhotosInView.map(photo => (
                <PhotoCard key={photo.$id} photo={photo} onView={setFullScreenPhoto} isViewOnly={true} />
              ))}
            </div>
          )}
        </section>
      )}

      {selectedFullScreenPhoto && (
        <FullScreenPhotoView
          isOpen={!!selectedFullScreenPhoto} photo={selectedFullScreenPhoto}
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

export default ParentGalleryPage;