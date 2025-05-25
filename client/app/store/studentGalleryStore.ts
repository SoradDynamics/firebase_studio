import { create } from 'zustand';
import {
  databases,
  storage,
  Query,
  account,
  APPWRITE_DATABASE_ID,
  STUDENTS_COLLECTION_ID, // Make sure this is exported from appwrite.ts
} from '~/utils/appwrite';
import {
  GALLERY_BUCKET_ID,
  GALLERY_GROUPS_COLLECTION_ID,
  GALLERY_PHOTOS_COLLECTION_ID,
  ALL_FACULTIES_ID,
} from '~/utils/appwrite'; // Assuming these are correctly set up
import type { GalleryGroup, GalleryPhoto } from 'types/gallery'; // Ensure this path is correct

// Helper: robustly get fileId, returning undefined if not a valid string
const getValidFileId = (fileIdInput: any): string | undefined => {
  if (typeof fileIdInput === 'string' && fileIdInput.trim() !== '' && fileIdInput.toLowerCase() !== 'undefined') {
    return fileIdInput;
  }
  return undefined;
};

// Helper: Get file preview URL
export const getStudentFilePreviewUrl = (fileIdInput: string, width?: number, height?: number, quality: number = 75): string => {
  const fileId = getValidFileId(fileIdInput);
  if (!fileId) {
    console.warn('getStudentFilePreviewUrl called with invalid fileId:', fileIdInput);
    return '/placeholder-image.png'; // Path to your placeholder image in the public folder
  }
  try {
    return storage.getFilePreview(GALLERY_BUCKET_ID, fileId, width, height, undefined, quality);
  } catch (e) {
    console.error(`Error generating preview URL for fileId ${fileId}:`, e);
    return '/placeholder-image-error.png';
  }
};

// Helper: Get file view URL (for full-screen)
export const getStudentFileViewUrl = (fileIdInput: string): string => {
  const fileId = getValidFileId(fileIdInput);
  if (!fileId) {
    console.warn('getStudentFileViewUrl called with invalid fileId:', fileIdInput);
    return '/placeholder-image.png';
  }
  try {
    return storage.getFileView(GALLERY_BUCKET_ID, fileId);
  } catch (e) {
    console.error(`Error generating view URL for fileId ${fileId}:`, e);
    return '/placeholder-image-error.png';
  }
};

// Helper: Get file download URL
export const getStudentFileDownloadUrl = (fileIdInput: string): string => {
  const fileId = getValidFileId(fileIdInput);
  if (!fileId) {
    console.warn('getStudentFileDownloadUrl called with invalid fileId:', fileIdInput);
    return '#invalid-file-for-download';
  }
  try {
    return storage.getFileDownload(GALLERY_BUCKET_ID, fileId);
  } catch (e) {
    console.error(`Error generating download URL for fileId ${fileId}:`, e);
    return '#error-generating-download-link';
  }
};


interface StudentGalleryState {
  studentFacultyId: string | null;
  galleryGroups: GalleryGroup[];
  photosByGroup: Record<string, GalleryPhoto[]>; // Key: groupId, Value: array of photos
  selectedFullScreenPhoto: GalleryPhoto | null;

  isFetchingStudentInfo: boolean;
  isLoadingGroups: boolean;
  isLoadingPhotos: Record<string, boolean>; // Key: groupId, Value: boolean

  error: string | null;

  fetchStudentInfoAndSetFaculty: () => Promise<string | null>;
  fetchGalleryGroupsForStudent: (searchTerm?: string) => Promise<void>;
  fetchPhotosForGroup: (groupId: string, forceRefresh?: boolean) => Promise<GalleryPhoto[] | undefined>;
  setFullScreenPhoto: (photo: GalleryPhoto | null) => void;
  clearError: () => void;
}

export const useStudentGalleryStore = create<StudentGalleryState>((set, get) => ({
  studentFacultyId: null,
  galleryGroups: [],
  photosByGroup: {},
  selectedFullScreenPhoto: null,

  isFetchingStudentInfo: false,
  isLoadingGroups: false,
  isLoadingPhotos: {},

  error: null,

  clearError: () => set({ error: null }),

  fetchStudentInfoAndSetFaculty: async () => {
    set({ isFetchingStudentInfo: true, error: null });
    try {
      const user = await account.get(); // Get logged-in Appwrite user
      // Query student record. Adjust if student ID isn't directly user email.
      const studentResponse = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        STUDENTS_COLLECTION_ID,
        [Query.equal('stdEmail', user.email), Query.limit(1)]
      );

      if (studentResponse.documents.length > 0) {
        const studentData = studentResponse.documents[0] as any; // Cast as per your student document structure
        if (studentData.facultyId) {
          set({ studentFacultyId: studentData.facultyId, isFetchingStudentInfo: false });
          return studentData.facultyId;
        } else {
          set({ error: 'Student faculty information not found in their record.', isFetchingStudentInfo: false });
          return null;
        }
      } else {
        set({ error: 'Student record not found for the logged-in user.', isFetchingStudentInfo: false });
        return null;
      }
    } catch (err: any) {
      console.error('Error fetching student info:', err);
      set({ error: 'Failed to load student information. Please try again later.', isFetchingStudentInfo: false });
      return null;
    }
  },

  fetchGalleryGroupsForStudent: async (searchTerm?: string) => {
    const facultyId = get().studentFacultyId;
    if (!facultyId) {
      set({ error: 'Cannot fetch gallery groups without student faculty information.', isLoadingGroups: false });
      return;
    }
    set({ isLoadingGroups: true, error: null });
    try {
      const queries = [
        Query.or([
          Query.equal('visibleTo', ALL_FACULTIES_ID),
          Query.equal('visibleTo', facultyId)
        ]),
        Query.orderDesc('$createdAt'),
        Query.limit(50), // Sensible limit for groups
      ];

      if (searchTerm && searchTerm.trim() !== '') {
        // Ensure 'title' attribute in 'coll-gallery-groups' has a Full-text index
        queries.push(Query.search('title', searchTerm.trim()));
      }

      const response = await databases.listDocuments<GalleryGroup>(
        APPWRITE_DATABASE_ID,
        GALLERY_GROUPS_COLLECTION_ID,
        queries
      );

      const groupsWithUrls = response.documents.map(group => {
        const validCoverFileId = getValidFileId(group.coverImageFileId);
        return {
          ...group,
          coverPreviewUrl: validCoverFileId ? getStudentFilePreviewUrl(validCoverFileId, 200, 150) : undefined,
        };
      });
      set({ galleryGroups: groupsWithUrls, isLoadingGroups: false });
    } catch (err: any) {
      console.error('Error fetching student gallery groups:', err);
      set({ error: 'Failed to load gallery albums.', isLoadingGroups: false });
    }
  },

  fetchPhotosForGroup: async (groupId: string, forceRefresh: boolean = false) => {
    if (!forceRefresh && get().photosByGroup[groupId]?.length) {
      return get().photosByGroup[groupId]; // Return cached if not forcing refresh
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
          Query.orderAsc('$createdAt'), // Or by 'order' attribute if you have one
          Query.limit(500) // Adjust limit based on expected photos per group
        ]
      );

      const photosWithUrls = response.documents.map(photo => {
        const validPhotoFileId = getValidFileId(photo.fileId);
        return {
          ...photo,
          // Ensure fileId itself is clean
          fileId: validPhotoFileId || '',
          previewUrl: validPhotoFileId ? getStudentFilePreviewUrl(validPhotoFileId, 150, 150) : undefined,
          fullUrl: validPhotoFileId ? getStudentFileViewUrl(validPhotoFileId) : undefined,
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