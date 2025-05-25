import { create } from 'zustand';
import {
  databases,
  storage,
  Query,
  account,
  APPWRITE_DATABASE_ID,
  PARENTS_COLLECTION_ID, // You'll need to define this in appwrite.ts and .env
  STUDENTS_COLLECTION_ID,
} from '~/utils/appwrite';
import {
  GALLERY_BUCKET_ID,
  GALLERY_GROUPS_COLLECTION_ID,
  GALLERY_PHOTOS_COLLECTION_ID,
  ALL_FACULTIES_ID,
} from '~/utils/appwrite';
import type { GalleryGroup, GalleryPhoto } from 'types/gallery'; // Ensure path is correct

// --- Environment Variable for Parents Collection ---
// Ensure VITE_APPWRITE_PARENT_COLLECTION_ID is in your .env
// and PARENTS_COLLECTION_ID is exported from ~/utils/appwrite.ts
// export const PARENTS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID;

// Helper: robustly get fileId (same as in studentGalleryStore)
const getValidFileId = (fileIdInput: any): string | undefined => {
  if (typeof fileIdInput === 'string' && fileIdInput.trim() !== '' && fileIdInput.toLowerCase() !== 'undefined') {
    return fileIdInput;
  }
  return undefined;
};

// URL Helper functions (can be shared in a util file, but duplicated here for store independence)
export const getParentFilePreviewUrl = (fileIdInput: string, width?: number, height?: number, quality: number = 75): string => {
  const fileId = getValidFileId(fileIdInput);
  if (!fileId) return '/placeholder-image.png';
  try {
    return storage.getFilePreview(GALLERY_BUCKET_ID, fileId, width, height, undefined, quality);
  } catch (e) { return '/placeholder-image-error.png'; }
};

export const getParentFileViewUrl = (fileIdInput: string): string => {
  const fileId = getValidFileId(fileIdInput);
  if (!fileId) return '/placeholder-image.png';
  try {
    return storage.getFileView(GALLERY_BUCKET_ID, fileId);
  } catch (e) { return '/placeholder-image-error.png'; }
};

export const getParentFileDownloadUrl = (fileIdInput: string): string => {
  const fileId = getValidFileId(fileIdInput);
  if (!fileId) return '#invalid-file-for-download';
  try {
    return storage.getFileDownload(GALLERY_BUCKET_ID, fileId);
  } catch (e) { return '#error-generating-download-link'; }
};


interface ParentGalleryState {
  parentAssociatedFacultyIds: string[]; // All unique faculty IDs of their children
  galleryGroups: GalleryGroup[];
  photosByGroup: Record<string, GalleryPhoto[]>;
  selectedFullScreenPhoto: GalleryPhoto | null;

  isFetchingParentInfo: boolean;
  isLoadingGroups: boolean;
  isLoadingPhotos: Record<string, boolean>;

  error: string | null;

  fetchParentInfoAndFaculties: () => Promise<string[] | null>; // Returns array of faculty IDs or null
  fetchGalleryGroupsForParent: (searchTerm?: string) => Promise<void>;
  fetchPhotosForGroup: (groupId: string, forceRefresh?: boolean) => Promise<GalleryPhoto[] | undefined>;
  setFullScreenPhoto: (photo: GalleryPhoto | null) => void;
  clearError: () => void;
}

export const useParentGalleryStore = create<ParentGalleryState>((set, get) => ({
  parentAssociatedFacultyIds: [],
  galleryGroups: [],
  photosByGroup: {},
  selectedFullScreenPhoto: null,

  isFetchingParentInfo: false,
  isLoadingGroups: false,
  isLoadingPhotos: {},

  error: null,

  clearError: () => set({ error: null }),

  fetchParentInfoAndFaculties: async () => {
    set({ isFetchingParentInfo: true, error: null, parentAssociatedFacultyIds: [] });
    try {
      const user = await account.get(); // Logged-in Appwrite user

      // Query parent record. Assuming parent email is unique.
      // Adjust if parent identification is different (e.g., parent document ID in user prefs)
      const parentResponse = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        PARENTS_COLLECTION_ID,
        [Query.equal('email', user.email), Query.limit(1)]
      );

      if (parentResponse.documents.length === 0) {
        set({ error: 'Parent record not found for the logged-in user.', isFetchingParentInfo: false });
        return null;
      }

      const parentData = parentResponse.documents[0] as any; // Cast as per your parent document structure
      const studentIds: string[] = parentData.students || [];

      if (studentIds.length === 0) {
        set({ error: 'No students are associated with this parent account.', isFetchingParentInfo: false });
        // Still return empty array for faculty IDs as technically correct
        return [];
      }

      // Fetch facultyId for each student
      const facultyIdPromises = studentIds.map(studentId =>
        databases.getDocument(APPWRITE_DATABASE_ID, STUDENTS_COLLECTION_ID, studentId)
          .then(studentDoc => (studentDoc as any).facultyId)
          .catch(err => {
            console.warn(`Could not fetch student ${studentId} or their facultyId:`, err);
            return null; // Return null if a student record or facultyId is missing
          })
      );

      const resolvedFacultyIds = await Promise.all(facultyIdPromises);
      const uniqueFacultyIds = Array.from(new Set(resolvedFacultyIds.filter(id => id !== null))) as string[];

      set({ parentAssociatedFacultyIds: uniqueFacultyIds, isFetchingParentInfo: false });
      return uniqueFacultyIds;

    } catch (err: any) {
      console.error('Error fetching parent/student info:', err);
      set({ error: 'Failed to load your family information. Please try again.', isFetchingParentInfo: false });
      return null;
    }
  },

  fetchGalleryGroupsForParent: async (searchTerm?: string) => {
    const associatedFacultyIds = get().parentAssociatedFacultyIds;
    // If parent has no associated students/faculties, they might only see 'ALL_FACULTIES_ID'
    // Or, if you decide they see nothing if no children, handle that here.
    // Current logic: will fetch ALL_FACULTIES_ID even if associatedFacultyIds is empty.

    set({ isLoadingGroups: true, error: null });
    try {
      const facultyQueries = associatedFacultyIds.map(fid => Query.equal('visibleTo', fid));
      const queries = [
        Query.or([
          Query.equal('visibleTo', ALL_FACULTIES_ID),
          ...facultyQueries // Spread the individual faculty ID queries
        ]),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ];

      // If there are no specific faculty queries (e.g., no children or no faculty IDs found),
      // the Query.or might behave unexpectedly with an empty array.
      // So, if facultyQueries is empty, we simplify the main query.
      let finalQueries = queries;
      if (facultyQueries.length === 0) {
          finalQueries = [
              Query.equal('visibleTo', ALL_FACULTIES_ID), // Only public groups
              Query.orderDesc('$createdAt'),
              Query.limit(50),
          ];
      }


      if (searchTerm && searchTerm.trim() !== '') {
        finalQueries.push(Query.search('title', searchTerm.trim()));
      }

      const response = await databases.listDocuments<GalleryGroup>(
        APPWRITE_DATABASE_ID,
        GALLERY_GROUPS_COLLECTION_ID,
        finalQueries
      );

      const groupsWithUrls = response.documents.map(group => {
        const validCoverFileId = getValidFileId(group.coverImageFileId);
        return {
          ...group,
          coverPreviewUrl: validCoverFileId ? getParentFilePreviewUrl(validCoverFileId, 200, 150) : undefined,
        };
      });
      set({ galleryGroups: groupsWithUrls, isLoadingGroups: false });
    } catch (err: any) {
      console.error('Error fetching parent gallery groups:', err);
      set({ error: 'Failed to load gallery albums for your family.', isLoadingGroups: false });
    }
  },

  fetchPhotosForGroup: async (groupId: string, forceRefresh: boolean = false) => {
    // This method can be identical to the one in studentGalleryStore
    if (!forceRefresh && get().photosByGroup[groupId]?.length) {
      return get().photosByGroup[groupId];
    }
    set(state => ({
      isLoadingPhotos: { ...state.isLoadingPhotos, [groupId]: true },
      error: null
    }));
    try {
      const response = await databases.listDocuments<GalleryPhoto>(
        APPWRITE_DATABASE_ID,
        GALLERY_PHOTOS_COLLECTION_ID,
        [
          Query.equal('groupId', groupId),
          Query.orderAsc('$createdAt'),
          Query.limit(500)
        ]
      );
      const photosWithUrls = response.documents.map(photo => {
        const validPhotoFileId = getValidFileId(photo.fileId);
        return {
          ...photo,
          fileId: validPhotoFileId || '',
          previewUrl: validPhotoFileId ? getParentFilePreviewUrl(validPhotoFileId, 150, 150) : undefined,
          fullUrl: validPhotoFileId ? getParentFileViewUrl(validPhotoFileId) : undefined,
        };
      });
      set(state => ({
        photosByGroup: { ...state.photosByGroup, [groupId]: photosWithUrls },
        isLoadingPhotos: { ...state.isLoadingPhotos, [groupId]: false },
      }));
      return photosWithUrls;
    } catch (err: any) {
      console.error(`Error fetching photos for group ${groupId}:`, err);
      set(state => ({
        error: `Failed to load photos for the selected album.`,
        isLoadingPhotos: { ...state.isLoadingPhotos, [groupId]: false }
      }));
      return undefined;
    }
  },

  setFullScreenPhoto: (photo: GalleryPhoto | null) => {
    set({ selectedFullScreenPhoto: photo });
  },
}));