import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@heroui/react';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useGalleryStore, getFilePreviewUrl, getFileViewUrl } from '~/store/galleryStore';
import GalleryGroupCard from './GalleryGroupCard';
import AddEditGroupForm from './AddEditGroupForm';
import PhotoCard from './PhotoCard';
import FullScreenPhotoView from './FullScreenPhotoView';
import { Drawer } from '../../../../common/Drawer'; // Your Drawer
import Popover from '../../../../common/Popover'; // Your Popover
import SearchBar from '../../../common/SearchBar'; // Your SearchBar
import type { GalleryGroup, GalleryPhoto } from 'types/gallery';
import toast from 'react-hot-toast';

const GalleryPage: React.FC = () => {
  const {
    groups,
    photosByGroup,
    selectedFullScreenPhoto,
    isLoadingGroups,
    isLoadingPhotos,
    isDeleting,
    error,
    fetchGalleryGroups,
    fetchPhotosForGroup,
    deleteGalleryGroup,
    deletePhotoFromGroup,
    setFullScreenPhoto,
    clearError,
  } = useGalleryStore();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<GalleryGroup | null>(null);
  
  const [selectedGroupForView, setSelectedGroupForView] = useState<GalleryGroup | null>(null);
  
  const [showDeleteGroupPopover, setShowDeleteGroupPopover] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; title: string } | null>(null);

  const [showDeletePhotoPopover, setShowDeletePhotoPopover] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<{ photoId: string; fileId: string; groupId: string; } | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGalleryGroups(searchTerm);
  }, [fetchGalleryGroups, searchTerm]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleOpenAddDrawer = () => {
    setGroupToEdit(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (group: GalleryGroup) => {
    setGroupToEdit(group);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setGroupToEdit(null);
  };

  const handleDeleteGroupClick = (groupId: string, groupTitle: string) => {
    setGroupToDelete({ id: groupId, title: groupTitle });
    setShowDeleteGroupPopover(true);
  };

  const confirmDeleteGroup = async () => {
    if (groupToDelete) {
      await deleteGalleryGroup(groupToDelete.id);
      toast.success(`Group "${groupToDelete.title}" deleted.`);
      setShowDeleteGroupPopover(false);
      setGroupToDelete(null);
      if (selectedGroupForView?.$id === groupToDelete.id) {
        setSelectedGroupForView(null); // Clear view if deleted group was selected
      }
    }
  };

  const handleDeletePhotoClick = (photoId: string, fileId: string, groupId: string) => {
    setPhotoToDelete({ photoId, fileId, groupId });
    setShowDeletePhotoPopover(true);
  };

  const confirmDeletePhoto = async () => {
    if (photoToDelete) {
      await deletePhotoFromGroup(photoToDelete.photoId, photoToDelete.fileId, photoToDelete.groupId);
      toast.success('Photo deleted.');
      setShowDeletePhotoPopover(false);
      setPhotoToDelete(null);
    }
  };
  
  const handleViewPhotos = (group: GalleryGroup) => {
    setSelectedGroupForView(group);
    if (!photosByGroup[group.$id] || photosByGroup[group.$id].length === 0) {
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

  const debouncedSearch = useCallback(
    debounce((term: string) => fetchGalleryGroups(term), 300),
    [fetchGalleryGroups]
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Basic debounce utility
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


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">Photo Gallery Management</h1>
        <div className="flex items-center gap-4">
          <SearchBar
            placeholder="Search groups..."
            value={searchTerm}
            onValueChange={handleSearchChange}
            className="w-full sm:w-64"
          />
          <Button color="primary" onPress={handleOpenAddDrawer} startContent={<PlusIcon className="h-5 w-5" />}>
            New Group
          </Button>
        </div>
      </div>

      {isLoadingGroups && <p className="text-center text-gray-500 py-8">Loading gallery groups...</p>}
      {!isLoadingGroups && groups.length === 0 && !searchTerm && (
        <p className="text-center text-gray-500 py-8">No gallery groups found. Create one to get started!</p>
      )}
      {!isLoadingGroups && groups.length === 0 && searchTerm && (
        <p className="text-center text-gray-500 py-8">No gallery groups found for "{searchTerm}".</p>
      )}

      {groups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {groups.map((group) => (
            <GalleryGroupCard
              key={group.$id}
              group={group}
              onEdit={handleOpenEditDrawer}
              onDelete={handleDeleteGroupClick}
              onViewPhotos={handleViewPhotos}
              isDeleting={isDeleting && groupToDelete?.id === group.$id}
            />
          ))}
        </div>
      )}
      
      {selectedGroupForView && (
        <section className="mt-10 p-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700">
                    Photos in: {selectedGroupForView.title}
                </h2>
                <Button 
                    variant="ghost" 
                    onPress={() => setSelectedGroupForView(null)}
                    className="text-sm"
                >
                    Close Group View
                </Button>
            </div>
            {isLoadingPhotos[selectedGroupForView.$id] && <p className="text-center text-gray-500 py-4">Loading photos...</p>}
            {!isLoadingPhotos[selectedGroupForView.$id] && currentPhotosInView.length === 0 && (
                <p  className="text-center text-gray-500 py-4">No photos in this group yet.</p>
            )}
             {!isLoadingPhotos[selectedGroupForView.$id] && currentPhotosInView.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {currentPhotosInView.map(photo => (
                        <PhotoCard 
                            key={photo.$id}
                            photo={photo}
                            onView={setFullScreenPhoto}
                            onDelete={(photoId, fileId) => handleDeletePhotoClick(photoId, fileId, selectedGroupForView.$id)}
                            isDeleting={isDeleting && photoToDelete?.photoId === photo.$id}
                        />
                    ))}
                </div>
             )}
        </section>
      )}


      <Drawer isOpen={isDrawerOpen} onClose={handleCloseDrawer} position="right" size="lg" title={groupToEdit ? 'Edit Gallery Group' : 'Add New Gallery Group'}>
        <Drawer.Body>
          <AddEditGroupForm groupToEdit={groupToEdit} onClose={handleCloseDrawer} />
        </Drawer.Body>
      </Drawer>

      <Popover
        isOpen={showDeleteGroupPopover}
        onClose={() => setShowDeleteGroupPopover(false)}
        onConfirm={confirmDeleteGroup}
        title="Delete Gallery Group"
        content={`Are you sure you want to delete the group "${groupToDelete?.title}" and all its photos? This action cannot be undone.`}
        isConfirmLoading={isDeleting}
      />

      <Popover
        isOpen={showDeletePhotoPopover}
        onClose={() => setShowDeletePhotoPopover(false)}
        onConfirm={confirmDeletePhoto}
        title="Delete Photo"
        content={`Are you sure you want to delete this photo? This action cannot be undone.`}
        isConfirmLoading={isDeleting}
      />
      
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

export default GalleryPage;