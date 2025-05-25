import { create } from 'zustand';
import {
  databases,
  storage,
  ID,
  Query,
  APPWRITE_DATABASE_ID,
  FACULTIES_COLLECTION_ID,
  account,
} from '~/utils/appwrite';
import {
  GALLERY_BUCKET_ID,
  GALLERY_GROUPS_COLLECTION_ID,
  GALLERY_PHOTOS_COLLECTION_ID,
  ALL_FACULTIES_ID,
} from '~/utils/appwrite';
import type { GalleryGroup, GalleryPhoto, FacultyForSelect, ManagedFile } from 'types/gallery';
import { Models } from 'appwrite';

// Helper: Get current user ID
const getCurrentUserId = async (): Promise<string | undefined> => {
  try {
    const user = await account.get();
    return user.$id;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return undefined;
  }
};

// Helper: Upload single file to Appwrite Storage
const uploadFileToStorage = async (file: File): Promise<{ fileId: string; fileName: string }> => {
  const response = await storage.createFile(GALLERY_BUCKET_ID, ID.unique(), file);
  return { fileId: response.$id, fileName: file.name };
};

// Helper: Delete file from Appwrite Storage
const deleteFileFromStorage = async (fileId: string): Promise<void> => {
  await storage.deleteFile(GALLERY_BUCKET_ID, fileId);
};

export const getFilePreviewUrl = (fileId: string, width?: number, height?: number, quality: number = 75): string => {
  const params = new URLSearchParams();
  if (width) params.append('width', String(width));
  if (height) params.append('height', String(height));
  if (quality) params.append('quality', String(quality));
  // params.append('output', 'webp'); // Optional: convert to webp
  const queryString = params.toString();
  return storage.getFilePreview(GALLERY_BUCKET_ID, fileId, width, height, undefined, quality) + (queryString ? `&${queryString}` : '');
};

export const getFileViewUrl = (fileId: string): string => {
    return storage.getFileView(GALLERY_BUCKET_ID, fileId);
};

export const getFileDownloadUrl = (fileId: string): string => {
    return storage.getFileDownload(GALLERY_BUCKET_ID, fileId);
};


interface GalleryState {
  groups: GalleryGroup[];
  photosByGroup: Record<string, GalleryPhoto[]>;
  faculties: FacultyForSelect[];
  selectedFullScreenPhoto: GalleryPhoto | null;
  isLoadingGroups: boolean;
  isLoadingPhotos: Record<string, boolean>; // isLoadingPhotos[groupId]
  isLoadingFaculties: boolean;
  isSubmittingGroup: boolean; // For add/edit group
  isDeleting: boolean; // For delete operations
  error: string | null;

  fetchFaculties: () => Promise<void>;
  fetchGalleryGroups: (searchTerm?: string) => Promise<void>;
  fetchPhotosForGroup: (groupId: string, forceRefresh?: boolean) => Promise<GalleryPhoto[] | undefined>;
  
  createGalleryGroup: (
    data: { title: string; description?: string; visibleTo: string },
    files: File[],
    coverFileIndex?: number // Index of the file in 'files' array to be set as cover
  ) => Promise<GalleryGroup | undefined>;
  
  updateGalleryGroup: (
    groupId: string,
    data: { title?: string; description?: string; visibleTo?: string },
    newFiles: File[], // Files to add
    photosToDelete: { photoId: string; fileId: string }[], // Existing photos to delete
    newCoverFile?: File, // A new file specifically for cover
    existingCoverFileId?: string // An existing photo's fileId to set as cover
  ) => Promise<GalleryGroup | undefined>;

  deleteGalleryGroup: (groupId: string) => Promise<void>;
  
  addPhotosToGroup: (groupId: string, files: File[]) => Promise<void>;
  deletePhotoFromGroup: (photoId: string, fileId: string, groupId: string) => Promise<void>;

  setFullScreenPhoto: (photo: GalleryPhoto | null) => void;
  clearError: () => void;
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  groups: [],
  photosByGroup: {},
  faculties: [],
  selectedFullScreenPhoto: null,
  isLoadingGroups: false,
  isLoadingPhotos: {},
  isLoadingFaculties: false,
  isSubmittingGroup: false,
  isDeleting: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchFaculties: async () => {
    set({ isLoadingFaculties: true, error: null });
    try {
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        FACULTIES_COLLECTION_ID,
        [Query.limit(100)] // Adjust limit as needed
      );
      const facultiesForSelect: FacultyForSelect[] = response.documents.map((doc) => ({
        id: doc.$id,
        name: doc.name,
      }));
      set({ faculties: facultiesForSelect, isLoadingFaculties: false });
    } catch (err: any) {
      console.error('Error fetching faculties:', err);
      set({ error: 'Failed to load faculties.', isLoadingFaculties: false });
    }
  },

  fetchGalleryGroups: async (searchTerm?: string) => {
    set({ isLoadingGroups: true, error: null });
    try {
      const queries = [Query.orderDesc('$createdAt')];
      if (searchTerm) {
        queries.push(Query.search('title', searchTerm));
      }
      const response = await databases.listDocuments<GalleryGroup>(
        APPWRITE_DATABASE_ID,
        GALLERY_GROUPS_COLLECTION_ID,
        queries
      );
      const groupsWithUrls = response.documents.map(group => ({
        ...group,
        coverPreviewUrl: group.coverImageFileId ? getFilePreviewUrl(group.coverImageFileId, 200, 150) : undefined,
      }));
      set({ groups: groupsWithUrls, isLoadingGroups: false });
    } catch (err: any) {
      console.error('Error fetching gallery groups:', err);
      set({ error: 'Failed to load gallery groups.', isLoadingGroups: false });
    }
  },

  fetchPhotosForGroup: async (groupId: string, forceRefresh: boolean = false) => {
    if (!forceRefresh && get().photosByGroup[groupId]?.length) {
      return get().photosByGroup[groupId];
    }
    set(state => ({ isLoadingPhotos: { ...state.isLoadingPhotos, [groupId]: true }, error: null }));
    try {
      const response = await databases.listDocuments<GalleryPhoto>(
        APPWRITE_DATABASE_ID,
        GALLERY_PHOTOS_COLLECTION_ID,
        [Query.equal('groupId', groupId), Query.orderAsc('$createdAt'), Query.limit(500)] // Adjust limit
      );
      const photosWithUrls = response.documents.map(photo => ({
        ...photo,
        previewUrl: getFilePreviewUrl(photo.fileId, 150, 150),
        fullUrl: getFileViewUrl(photo.fileId),
      }));
      set(state => ({
        photosByGroup: { ...state.photosByGroup, [groupId]: photosWithUrls },
        isLoadingPhotos: { ...state.isLoadingPhotos, [groupId]: false },
      }));
      return photosWithUrls;
    } catch (err: any) {
      console.error(`Error fetching photos for group ${groupId}:`, err);
      set(state => ({ 
        error: `Failed to load photos for group.`,
        isLoadingPhotos: { ...state.isLoadingPhotos, [groupId]: false }
      }));
      return undefined;
    }
  },

  createGalleryGroup: async (data, files, coverFileIndex) => {
    set({ isSubmittingGroup: true, error: null });
    const userId = await getCurrentUserId();
    if (!userId) {
        set({ error: 'User not authenticated.', isSubmittingGroup: false });
        return undefined;
    }

    try {
      // 1. Upload all files
      const uploadedFileResults = await Promise.all(
        files.map(file => uploadFileToStorage(file))
      );

      // 2. Determine coverImageFileId
      let coverImageFileId: string | undefined = undefined;
      if (coverFileIndex !== undefined && uploadedFileResults[coverFileIndex]) {
        coverImageFileId = uploadedFileResults[coverFileIndex].fileId;
      } else if (uploadedFileResults.length > 0) {
        coverImageFileId = uploadedFileResults[0].fileId; // Default to first image if no specific cover
      }
      
      // 3. Create Group Document
      const groupData = {
        ...data,
        createdBy: userId,
        updatedBy: userId,
        photoCount: uploadedFileResults.length,
        coverImageFileId,
      };
      const groupDoc = await databases.createDocument<GalleryGroup>(
        APPWRITE_DATABASE_ID,
        GALLERY_GROUPS_COLLECTION_ID,
        ID.unique(),
        groupData
      );

      // 4. Create Photo Documents
      if (uploadedFileResults.length > 0) {
        const photoPromises = uploadedFileResults.map((result, index) => 
          databases.createDocument(
            APPWRITE_DATABASE_ID,
            GALLERY_PHOTOS_COLLECTION_ID,
            ID.unique(),
            {
              groupId: groupDoc.$id,
              fileId: result.fileId,
              fileName: result.fileName,
              uploadedBy: userId,
              order: index, // Simple order by upload
            }
          )
        );
        await Promise.all(photoPromises);
      }
      
      set({ isSubmittingGroup: false });
      await get().fetchGalleryGroups(); // Refresh list
      return groupDoc;
    } catch (err: any) {
      console.error('Error creating gallery group:', err);
      set({ error: 'Failed to create gallery group.', isSubmittingGroup: false });
      // Consider cleaning up uploaded files if group/photo creation fails partially
      return undefined;
    }
  },
  
  updateGalleryGroup: async (groupId, data, newFiles, photosToDelete, newCoverFile, existingCoverFileId) => {
    set({ isSubmittingGroup: true, error: null });
    const userId = await getCurrentUserId();
    if (!userId) {
        set({ error: 'User not authenticated.', isSubmittingGroup: false });
        return undefined;
    }

    try {
        // 1. Delete specified photos (DB docs and Storage files)
        if (photosToDelete.length > 0) {
            await Promise.all(photosToDelete.map(p => deleteFileFromStorage(p.fileId)));
            await Promise.all(photosToDelete.map(p => 
                databases.deleteDocument(APPWRITE_DATABASE_ID, GALLERY_PHOTOS_COLLECTION_ID, p.photoId)
            ));
        }

        // 2. Upload new files
        const uploadedNewFileResults = newFiles.length > 0 
            ? await Promise.all(newFiles.map(file => uploadFileToStorage(file))) 
            : [];

        // 3. Create DB docs for new photos
        if (uploadedNewFileResults.length > 0) {
            await Promise.all(uploadedNewFileResults.map((result, index) => 
                databases.createDocument(
                    APPWRITE_DATABASE_ID,
                    GALLERY_PHOTOS_COLLECTION_ID,
                    ID.unique(),
                    {
                        groupId: groupId,
                        fileId: result.fileId,
                        fileName: result.fileName,
                        uploadedBy: userId,
                        // Consider more robust ordering if needed
                    }
                )
            ));
        }

        // 4. Handle cover image update
        let finalCoverImageFileId: string | undefined = (await databases.getDocument<GalleryGroup>(APPWRITE_DATABASE_ID, GALLERY_GROUPS_COLLECTION_ID, groupId)).coverImageFileId;

        if (newCoverFile) { // If a new file is designated as cover
            const uploadedCover = await uploadFileToStorage(newCoverFile);
            finalCoverImageFileId = uploadedCover.fileId;
            // Also create a photo document for this new cover if it's not already in newFiles
            const isCoverInNewFiles = newFiles.some(f => f.name === newCoverFile.name && f.size === newCoverFile.size);
            if (!isCoverInNewFiles) {
                await databases.createDocument(
                    APPWRITE_DATABASE_ID,
                    GALLERY_PHOTOS_COLLECTION_ID,
                    ID.unique(),
                    {
                        groupId: groupId,
                        fileId: uploadedCover.fileId,
                        fileName: uploadedCover.fileName,
                        uploadedBy: userId,
                    }
                );
            }
        } else if (existingCoverFileId) { // If an existing photo is set as new cover
            finalCoverImageFileId = existingCoverFileId;
        } else if (photosToDelete.some(p => p.fileId === finalCoverImageFileId) && uploadedNewFileResults.length > 0) {
             // If current cover was deleted, and new photos were added, pick the first new one
            finalCoverImageFileId = uploadedNewFileResults[0].fileId;
        } else if (photosToDelete.some(p => p.fileId === finalCoverImageFileId) && uploadedNewFileResults.length === 0) {
            // If current cover was deleted and no new photos, try to find another existing photo
            const remainingPhotos = await get().fetchPhotosForGroup(groupId, true);
            finalCoverImageFileId = remainingPhotos && remainingPhotos.length > 0 ? remainingPhotos[0].fileId : undefined;
        }


        // 5. Update group document
        // Recalculate photoCount
        const currentPhotos = await databases.listDocuments(APPWRITE_DATABASE_ID, GALLERY_PHOTOS_COLLECTION_ID, [Query.equal('groupId', groupId), Query.limit(0)]); // Just get total
        const photoCount = currentPhotos.total;

        const groupUpdateData = {
            ...data,
            updatedBy: userId,
            coverImageFileId: finalCoverImageFileId,
            photoCount,
        };

        const updatedGroupDoc = await databases.updateDocument<GalleryGroup>(
            APPWRITE_DATABASE_ID,
            GALLERY_GROUPS_COLLECTION_ID,
            groupId,
            groupUpdateData
        );
        
        set({ isSubmittingGroup: false });
        await get().fetchGalleryGroups(); // Refresh list
        await get().fetchPhotosForGroup(groupId, true); // Refresh photos for this group
        return updatedGroupDoc;

    } catch (err: any) {
        console.error('Error updating gallery group:', err);
        set({ error: 'Failed to update gallery group.', isSubmittingGroup: false });
        return undefined;
    }
  },

  deleteGalleryGroup: async (groupId: string) => {
    set({ isDeleting: true, error: null });
    try {
      // 1. Fetch all photos for the group
      const photos = await get().fetchPhotosForGroup(groupId, true);
      
      // 2. Delete all photo files from storage
      if (photos && photos.length > 0) {
        await Promise.all(photos.map(photo => deleteFileFromStorage(photo.fileId)));
      }
      
      // 3. Delete all photo documents (batched if Appwrite supported, else one by one or use a function)
      // For simplicity, one by one. Consider Appwrite functions for bulk delete.
      if (photos && photos.length > 0) {
        await Promise.all(
          photos.map(photo => 
            databases.deleteDocument(APPWRITE_DATABASE_ID, GALLERY_PHOTOS_COLLECTION_ID, photo.$id)
          )
        );
      }

      // 4. Delete the group document
      await databases.deleteDocument(APPWRITE_DATABASE_ID, GALLERY_GROUPS_COLLECTION_ID, groupId);
      
      set(state => ({
        groups: state.groups.filter(g => g.$id !== groupId),
        photosByGroup: { ...state.photosByGroup, [groupId]: [] }, // Clear photos for deleted group
        isDeleting: false,
      }));
    } catch (err: any) {
      console.error('Error deleting gallery group:', err);
      set({ error: 'Failed to delete gallery group.', isDeleting: false });
    }
  },

  addPhotosToGroup: async (groupId: string, files: File[]) => {
    set({ isSubmittingGroup: true, error: null });
    const userId = await getCurrentUserId();
    if (!userId) {
        set({ error: 'User not authenticated.', isSubmittingGroup: false });
        return;
    }
    if (files.length === 0) {
        set({ isSubmittingGroup: false });
        return;
    }

    try {
        const uploadedFileResults = await Promise.all(
            files.map(file => uploadFileToStorage(file))
        );

        const photoPromises = uploadedFileResults.map((result, index) => 
            databases.createDocument(
                APPWRITE_DATABASE_ID,
                GALLERY_PHOTOS_COLLECTION_ID,
                ID.unique(),
                {
                    groupId: groupId,
                    fileId: result.fileId,
                    fileName: result.fileName,
                    uploadedBy: userId,
                    // order: could be based on existing count + index
                }
            )
        );
        await Promise.all(photoPromises);

        // Update photoCount in group
        const groupDoc = await databases.getDocument<GalleryGroup>(APPWRITE_DATABASE_ID, GALLERY_GROUPS_COLLECTION_ID, groupId);
        await databases.updateDocument(APPWRITE_DATABASE_ID, GALLERY_GROUPS_COLLECTION_ID, groupId, {
            photoCount: groupDoc.photoCount + uploadedFileResults.length,
            updatedBy: userId,
        });

        set({ isSubmittingGroup: false });
        await get().fetchPhotosForGroup(groupId, true); // Refresh photos for this group
        await get().fetchGalleryGroups(); // Refresh group list (for photoCount update)
    } catch (err:any) {
        console.error('Error adding photos to group:', err);
        set({ error: 'Failed to add photos.', isSubmittingGroup: false });
    }
  },

  deletePhotoFromGroup: async (photoId: string, fileId: string, groupId: string) => {
    set({ isDeleting: true, error: null });
    const userId = await getCurrentUserId();
    if (!userId) {
        set({ error: 'User not authenticated.', isDeleting: false });
        return;
    }
    try {
        await deleteFileFromStorage(fileId);
        await databases.deleteDocument(APPWRITE_DATABASE_ID, GALLERY_PHOTOS_COLLECTION_ID, photoId);

        // Update photoCount in group
        const groupDoc = await databases.getDocument<GalleryGroup>(APPWRITE_DATABASE_ID, GALLERY_GROUPS_COLLECTION_ID, groupId);
        if (groupDoc.photoCount > 0) {
            await databases.updateDocument(APPWRITE_DATABASE_ID, GALLERY_GROUPS_COLLECTION_ID, groupId, {
                photoCount: groupDoc.photoCount - 1,
                updatedBy: userId,
            });
        }
        
        set(state => ({
            photosByGroup: {
                ...state.photosByGroup,
                [groupId]: (state.photosByGroup[groupId] || []).filter(p => p.$id !== photoId),
            },
            isDeleting: false,
        }));
        await get().fetchGalleryGroups(); // Refresh group list for photoCount
    } catch (err:any) {
        console.error('Error deleting photo:', err);
        set({ error: 'Failed to delete photo.', isDeleting: false });
    }
  },

  setFullScreenPhoto: (photo) => set({ selectedFullScreenPhoto: photo }),
}));