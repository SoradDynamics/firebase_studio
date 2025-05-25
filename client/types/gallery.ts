import { Models } from 'appwrite';

export interface FacultyForSelect {
  id: string;
  name: string;
}

export interface GalleryPhoto extends Models.Document {
  groupId: string;
  fileId: string;
  fileName: string;
  caption?: string;
  uploadedBy: string;
  order?: number;
  // UI only
  previewUrl?: string;
  fullUrl?: string;
}

export interface GalleryGroup extends Models.Document {
  title: string;
  description?: string;
  visibleTo: string; // 'ALL_FACULTIES_SHARED_ID' or a specific faculty $id
  coverImageFileId?: string;
  photoCount: number;
  createdBy: string;
  updatedBy: string;
  // UI only
  photos?: GalleryPhoto[];
  coverPreviewUrl?: string;
}

export interface GalleryGroupFormData {
  title: string;
  description: string;
  visibleTo: string | null; // For CustomSelect value
}

// Interface for file objects being managed before upload
export interface ManagedFile {
  id: string; // local unique id like Date.now() + index
  file: File;
  preview: string; // from URL.createObjectURL
  isNew: boolean; // true for newly added files, false for existing files (when editing)
  existingPhotoId?: string; // for existing photos, their Appwrite document ID
  existingFileId?: string; // for existing photos, their Appwrite storage file ID
}