import {create} from 'zustand';
import {
  databases,
  storage,
  ID,
  APPWRITE_DATABASE_ID as VITE_APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_GALLERY_ID as VITE_APPWRITE_GALLERY_COLLECTION_ID,
  FACULTIES_COLLECTION_ID as VITE_APPWRITE_FACULTY_COLLECTION_ID,
  APPWRITE_BUCKET_GALLERY_ID as VITE_APPWRITE_GALLERY_BUCKET_ID,
} from '~/utils/appwrite'; // Adjust path as needed
import { Models, Query } from 'appwrite';

export const ALL_FACULTIES_ID = "_all_faculties_"; // Represents "All Categories"

// Define Faculty type based on your Appwrite collection attributes
export interface Faculty extends Models.Document {
  name: string;
  // Add other faculty attributes if any, e.g., classes: string[];
}

export interface GalleryItem extends Models.Document {
  title: string;
  fileId: string[]; // Array of file IDs from Appwrite Storage
  faculty: string[]; // Array of faculty $ids (can include ALL_FACULTIES_ID)
  imageUrls?: string[]; // Client-side generated preview URLs (e.g., 400px) for cards
}

export type GalleryFormData = {
  title: string;
  faculty: string[]; // Array of faculty $ids
  files?: File[]; // Array of new files for upload
  existingFileIds?: string[]; // For updates, to know which existing files are kept
};

interface GalleryState {
  galleryItems: GalleryItem[];
  faculties: Faculty[]; // Includes "All Categories" option
  isLoading: boolean;
  isFormLoading: boolean;
  error: string | null;
  searchTerm: string;
  selectedFacultyFilter: string | null; // For main page filter (single faculty $id or ALL_FACULTIES_ID for no filter)

  fetchFaculties: () => Promise<void>;
  fetchGalleryItems: () => Promise<void>;
  
  addGalleryItem: (data: GalleryFormData) => Promise<boolean>;
  updateGalleryItem: (docId: string, currentItem: GalleryItem, data: GalleryFormData) => Promise<boolean>;
  
  setSearchTerm: (term: string) => void;
  setSelectedFacultyFilter: (facultyId: string | null) => void;

  isFormDrawerOpen: boolean;
  editingItem: GalleryItem | null;
  openFormDrawer: (item?: GalleryItem) => void;
  closeFormDrawer: () => void;

  isDeletePopoverOpen: boolean;
  itemToDelete: GalleryItem | null;
  openDeletePopover: (item: GalleryItem) => void;
  closeDeletePopover: () => void;
  confirmDeleteItem: () => Promise<void>;

  // For Image Viewer
  isImageViewerOpen: boolean;
  imagesForViewer: { src: string; alt?: string }[];
  viewerInitialIndex: number;
  viewerAlbumTitle: string;
  openImageViewer: (images: { src: string; alt?: string }[], startIndex?: number, albumTitle?: string) => void;
  closeImageViewer: () => void;
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  galleryItems: [],
  faculties: [],
  isLoading: false,
  isFormLoading: false,
  error: null,
  searchTerm: '',
  selectedFacultyFilter: ALL_FACULTIES_ID, // Default to "All Categories" filter on page load

  isFormDrawerOpen: false,
  editingItem: null,
  isDeletePopoverOpen: false,
  itemToDelete: null,

  isImageViewerOpen: false,
  imagesForViewer: [],
  viewerInitialIndex: 0,
  viewerAlbumTitle: "",

  openImageViewer: (images, startIndex = 0, albumTitle = "Image Details") => set({ 
    isImageViewerOpen: true, 
    imagesForViewer: images, 
    viewerInitialIndex: startIndex,
    viewerAlbumTitle: albumTitle,
  }),
  closeImageViewer: () => set({ 
    isImageViewerOpen: false, 
    imagesForViewer: [], 
    viewerInitialIndex: 0, 
    viewerAlbumTitle: "" 
  }),

  fetchFaculties: async () => {
    try {
      const response = await databases.listDocuments<Faculty>(
        VITE_APPWRITE_DATABASE_ID,
        VITE_APPWRITE_FACULTY_COLLECTION_ID,
        [Query.orderAsc('name')]
      );
      const allCategoriesOption: Faculty = { 
        $id: ALL_FACULTIES_ID, 
        name: 'All Categories', 
        // Fill required Models.Document fields if Faculty extends it directly
        $collectionId: '', $databaseId: '', $createdAt: '', $updatedAt: '', $permissions: [] 
      };
      set({ faculties: [allCategoriesOption, ...response.documents]});
    } catch (err: any) {
      console.error('Failed to fetch faculties:', err);
      set({ error: err.message || 'Failed to fetch faculties' });
    }
  },

  fetchGalleryItems: async () => {
    set({ isLoading: true, error: null });
    const { selectedFacultyFilter } = get();
    try {
      const queries: string[] = [Query.orderDesc('$createdAt')];
      if (selectedFacultyFilter && selectedFacultyFilter !== ALL_FACULTIES_ID) {
        queries.push(Query.contains('faculty', selectedFacultyFilter));
      }
      // If selectedFacultyFilter is ALL_FACULTIES_ID, no specific faculty query is added.

      const response = await databases.listDocuments<GalleryItem>(
        VITE_APPWRITE_DATABASE_ID,
        VITE_APPWRITE_GALLERY_COLLECTION_ID,
        queries
      );

      const itemsWithUrls = response.documents.map(item => ({
        ...item,
        imageUrls: item.fileId.map(id => 
            storage.getFilePreview(VITE_APPWRITE_GALLERY_BUCKET_ID, id, 400).toString() // 400px wide preview for cards
        ),
      }));
      set({ galleryItems: itemsWithUrls, isLoading: false });
    } catch (err: any) {
      console.error('Failed to fetch gallery items:', err);
      set({ error: err.message || 'Failed to fetch gallery items', isLoading: false });
    }
  },

  addGalleryItem: async (data) => {
    if (!data.files || data.files.length === 0) {
      set({ error: 'At least one image file is required.' });
      return false;
    }
    set({ isFormLoading: true, error: null });
    try {
      const uploadedFileIds: string[] = [];
      // Consider Promise.all for parallel uploads if Appwrite client/server supports it well
      for (const file of data.files) {
        const fileUploadResponse = await storage.createFile(
          VITE_APPWRITE_GALLERY_BUCKET_ID,
          ID.unique(),
          file
        );
        uploadedFileIds.push(fileUploadResponse.$id);
      }

      await databases.createDocument(
        VITE_APPWRITE_DATABASE_ID,
        VITE_APPWRITE_GALLERY_COLLECTION_ID,
        ID.unique(),
        { title: data.title, fileId: uploadedFileIds, faculty: data.faculty }
      );
      set({ isFormLoading: false });
      get().closeFormDrawer();
      await get().fetchGalleryItems(); // Refresh list
      return true;
    } catch (err: any)
    {
      console.error('Failed to add gallery item:', err);
      // Potentially cleanup uploaded files if DB write fails (advanced)
      set({ error: err.message || 'Failed to add gallery item', isFormLoading: false });
      return false;
    }
  },

  updateGalleryItem: async (docId, currentItem, data) => {
    set({ isFormLoading: true, error: null });
    try {
      let finalFileIds: string[] = data.existingFileIds ? [...data.existingFileIds] : [];
      
      if (data.files && data.files.length > 0) {
        for (const file of data.files) {
          const newFileUploadResponse = await storage.createFile(
            VITE_APPWRITE_GALLERY_BUCKET_ID,
            ID.unique(),
            file
          );
          finalFileIds.push(newFileUploadResponse.$id);
        }
      }
      
      const filesToDeleteFromStorage = currentItem.fileId.filter(id => !finalFileIds.includes(id));
      for (const fileIdToDelete of filesToDeleteFromStorage) {
        try {
          await storage.deleteFile(VITE_APPWRITE_GALLERY_BUCKET_ID, fileIdToDelete);
        } catch (deleteError) {
          console.warn(`Failed to delete old file ${fileIdToDelete} from storage during update:`, deleteError);
        }
      }

      await databases.updateDocument(
        VITE_APPWRITE_DATABASE_ID,
        VITE_APPWRITE_GALLERY_COLLECTION_ID,
        docId,
        { title: data.title, fileId: finalFileIds, faculty: data.faculty }
      );
      set({ isFormLoading: false });
      get().closeFormDrawer();
      await get().fetchGalleryItems();
      return true;
    } catch (err: any) {
      console.error('Failed to update gallery item:', err);
      set({ error: err.message || 'Failed to update gallery item', isFormLoading: false });
      return false;
    }
  },
  
  confirmDeleteItem: async () => {
    const { itemToDelete } = get();
    if (!itemToDelete) return;

    set({ isFormLoading: true, error: null }); // Use isFormLoading for delete popover confirm
    try {
      // Delete all associated files from storage first
      for (const fileId of itemToDelete.fileId) {
        try {
          await storage.deleteFile(VITE_APPWRITE_GALLERY_BUCKET_ID, fileId);
        } catch (fileDeleteError: any) {
          console.warn(`Error deleting file ${fileId} for item ${itemToDelete.$id}. Will proceed with DB deletion. Error: ${fileDeleteError.message}`);
        }
      }

      await databases.deleteDocument(
        VITE_APPWRITE_DATABASE_ID,
        VITE_APPWRITE_GALLERY_COLLECTION_ID,
        itemToDelete.$id
      );
      
      set({ isFormLoading: false });
      get().closeDeletePopover();
      await get().fetchGalleryItems(); // Refresh list
    } catch (err: any) {
      console.error('Failed to delete gallery item:', err);
      set({ error: err.message || 'Failed to delete gallery item', isFormLoading: false });
    }
  },
  
  setSearchTerm: (term) => set({ searchTerm: term }),
  setSelectedFacultyFilter: (facultyId) => {
    set({ selectedFacultyFilter: facultyId }); // facultyId can be ALL_FACULTIES_ID or a specific ID
    get().fetchGalleryItems(); // Re-fetch with new filter
  },

  openFormDrawer: (item) => set({ isFormDrawerOpen: true, editingItem: item || null, error: null }),
  closeFormDrawer: () => set({ isFormDrawerOpen: false, editingItem: null }),

  openDeletePopover: (item) => set({ isDeletePopoverOpen: true, itemToDelete: item }),
  closeDeletePopover: () => set({ isDeletePopoverOpen: false, itemToDelete: null }),
}));