// src/utils/fileUtils.ts
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const validateImageFile = (file: File): string | null => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `Invalid file type. Accepted types: ${ACCEPTED_IMAGE_TYPES.join(', ')}.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large. Max size: ${MAX_FILE_SIZE_MB}MB.`;
  }
  return null; // No error
};

export const getFilePreviewUrl = (fileId: string): string => {
  // Assuming you have storage configured from Appwrite SDK
  // This is a placeholder; you'll use appwrite.storage.getFilePreview directly
  // For simplicity, let's assume you have 'storage' instance from appwrite/config.ts
  // and APPWRITE_BUCKET_GALLERY_ID
  // In actual component, you'll call:
  // import { storage, APPWRITE_BUCKET_GALLERY_ID } from '../appwrite/config';
  // return storage.getFilePreview(APPWRITE_BUCKET_GALLERY_ID, fileId).toString();
  // For this util, we can't directly import. It's better to call Appwrite SDK where needed.
  // This function is more conceptual for the thought process.
  // Direct usage: storage.getFilePreview(BUCKET_ID, fileId).href
  console.warn("getFilePreviewUrl is conceptual. Use Appwrite SDK directly for URLs.");
  return `preview_for_${fileId}`; // Placeholder
};