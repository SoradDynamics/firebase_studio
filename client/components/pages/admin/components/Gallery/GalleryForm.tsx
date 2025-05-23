// src/components/gallery/GalleryForm.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Button, Input, Progress } from '@heroui/react'; // Adjust path if needed
import { Drawer } from '../../../../common/Drawer'; // Adjust path
import CustomSelect, { SelectOption } from './CustomSelect'; // Adjust path
import { useGalleryStore, GalleryFormData, ALL_FACULTIES_ID } from '~/store/galleryStore'; // Adjust path
import { storage, APPWRITE_BUCKET_GALLERY_ID as VITE_APPWRITE_GALLERY_BUCKET_ID } from '~/utils/appwrite'; // Adjust path
import { PhotoIcon, XCircleIcon, TrashIcon, PaperClipIcon } from '@heroicons/react/24/solid';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_TOTAL_FILES = 10;

interface FileWithPreview extends File {
  preview: string;
}

const GalleryForm: React.FC = () => {
  const {
    isFormDrawerOpen,
    closeFormDrawer,
    editingItem,
    faculties, // This now includes "All Categories"
    fetchFaculties,
    addGalleryItem,
    updateGalleryItem,
    isFormLoading,
    error: storeError,
  } = useGalleryStore();

  const [title, setTitle] = useState('');
  const [selectedFaculties, setSelectedFaculties] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<FileWithPreview[]>([]);
  const [existingImageInfos, setExistingImageInfos] = useState<{id: string, url:string}[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const facultyOptions: SelectOption[] = useMemo(() => {
    // `faculties` from store already includes "All Categories"
    return faculties.map(f => ({ value: f.$id, label: f.name }));
  }, [faculties]);


  useEffect(() => {
    if (isFormDrawerOpen) {
      // Fetch faculties if the list is empty or only contains the "All Categories" placeholder
      if (faculties.length === 0 || (faculties.length === 1 && faculties[0].$id === ALL_FACULTIES_ID)) {
          fetchFaculties();
      }
      if (editingItem) {
        setTitle(editingItem.title);
        setSelectedFaculties(editingItem.faculty || []);
        setNewFiles([]);
        // Use the small preview URLs (item.imageUrls) if available, otherwise generate new ones
        setExistingImageInfos(
            editingItem.fileId.map((id, index) => ({
                id,
                url: editingItem.imageUrls?.[index] || storage.getFilePreview(VITE_APPWRITE_GALLERY_BUCKET_ID, id, 200).toString() // Smaller preview for form
            }))
        );
      } else { // Reset for new item
        setTitle('');
        setSelectedFaculties([]); // Or default to [ALL_FACULTIES_ID] if desired
        setNewFiles([]);
        setExistingImageInfos([]);
      }
      setFormError(null); // Clear local form errors
    } else {
      // Cleanup previews on close
      newFiles.forEach(file => URL.revokeObjectURL(file.preview));
      setNewFiles([]); // Important to clear state
    }
  }, [isFormDrawerOpen, editingItem, fetchFaculties, faculties]);


  // Cleanup object URLs for new files when they are removed or component unmounts
  useEffect(() => {
    return () => {
      newFiles.forEach(file => URL.revokeObjectURL(file.preview));
    };
  }, [newFiles]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const filesFromInput = event.target.files;
    setFormError(null); // Clear previous file errors
    if (filesFromInput) {
      const currentTotalFiles = newFiles.length + existingImageInfos.length;
      if (currentTotalFiles + filesFromInput.length > MAX_TOTAL_FILES) {
        setFormError(`You can upload a maximum of ${MAX_TOTAL_FILES} images in total.`);
        event.target.value = ''; // Clear the input
        return;
      }

      const processedFiles: FileWithPreview[] = [];
      let localErrorFound = false;

      for (const file of Array.from(filesFromInput)) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          setFormError(`Invalid file type: ${file.name}. Accepted: JPG, PNG, GIF, WEBP.`);
          localErrorFound = true;
          break; 
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setFormError(`File too large: ${file.name}. Max size: ${MAX_FILE_SIZE_MB}MB.`);
          localErrorFound = true;
          break;
        }
        processedFiles.push(Object.assign(file, { preview: URL.createObjectURL(file) }));
      }

      if (!localErrorFound) {
        setNewFiles(prev => [...prev, ...processedFiles]);
      } else {
        // Clean up any previews created before error for this batch
        processedFiles.forEach(f => URL.revokeObjectURL(f.preview));
      }
      event.target.value = ''; // Allow selecting same file(s) again if removed
    }
  };

  const removeNewFile = (indexToRemove: number) => {
    const fileToRemove = newFiles[indexToRemove];
    if (fileToRemove) URL.revokeObjectURL(fileToRemove.preview);
    setNewFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const removeExistingFile = (fileIdToRemove: string) => {
    setExistingImageInfos(prev => prev.filter(img => img.id !== fileIdToRemove));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null); // Clear previous submission errors

    if (!title.trim()) {
      setFormError('Album Title is required.');
      return;
    }
    // Faculty selection can be optional, or enforce one if selectedFaculties.length === 0
    // if (selectedFaculties.length === 0) {
    //   setFormError('At least one faculty/category is required.');
    //   return;
    // }

    const totalImageCount = newFiles.length + existingImageInfos.length;
    if (totalImageCount === 0) {
      setFormError('At least one image must be included in the album.');
      return;
    }
    if (totalImageCount > MAX_TOTAL_FILES) {
      setFormError(`Too many images. Maximum is ${MAX_TOTAL_FILES}.`); // Should be caught by input, but good check
      return;
    }

    const galleryData: GalleryFormData = {
      title: title.trim(),
      faculty: selectedFaculties, // This is an array of $ids
    };
    
    if (newFiles.length > 0) galleryData.files = newFiles; // Pass the File objects
    if (editingItem) galleryData.existingFileIds = existingImageInfos.map(img => img.id);


    let success = false;
    if (editingItem) {
      success = await updateGalleryItem(editingItem.$id, editingItem, galleryData);
    } else {
      success = await addGalleryItem(galleryData);
    }
    // If successful, the store action closes the drawer.
    // Store error (storeError) will be displayed if not successful.
  };

  const effectiveError = storeError || formError;

  return (
    <Drawer
      isOpen={isFormDrawerOpen}
      onClose={closeFormDrawer}
      title={editingItem ? 'Edit Gallery Album' : 'Add New Gallery Album'}
      size="lg" 
    >
      <form onSubmit={handleSubmit} noValidate>
        <Drawer.Body className="space-y-6">
          {effectiveError && (
            <div role="alert" className="mb-4 text-sm text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40 p-3 rounded-md flex items-start">
              <XCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{effectiveError}</span>
            </div>
          )}
          
          <Input
            label="Album Title"
            id="gallery-title"
            fullWidth
            placeholder="E.g., Annual Sports Day 2024"
            value={title}
            onValueChange={setTitle}
            variant="faded"
            isRequired
            autoFocus
          />

          <CustomSelect
            label="Faculties / Categories"
            options={facultyOptions} // Includes "All Categories" from store
            value={selectedFaculties}
            onChange={(val) => setSelectedFaculties(val as string[])}
            placeholder="Select one or more (optional)"
            isMulti
            closeOnSelect={false} // Important for multi-select UX
            disabled={faculties.length === 0 || isFormLoading}
          />
           {(faculties.length === 0 || (faculties.length === 1 && faculties[0].$id === ALL_FACULTIES_ID)) && !storeError && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Loading categories...</p>
            )}

          <div>
            <label htmlFor="gallery-file-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Upload Images {editingItem ? `(Add more or replace)` : `(Up to ${MAX_TOTAL_FILES})`}
            </label>
            <div className="mt-1">
              <input 
                id="gallery-file-upload" 
                name="gallery-file-upload" 
                type="file" 
                multiple
                className="block w-full text-sm text-slate-500 dark:text-slate-400
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-md file:border-0
                           file:text-sm file:font-semibold
                           file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300
                           hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900 cursor-pointer"
                onChange={handleFileChange} 
                accept={ACCEPTED_IMAGE_TYPES.join(',')} 
                aria-describedby="file-constraints"
                disabled={isFormLoading || (newFiles.length + existingImageInfos.length >= MAX_TOTAL_FILES)}
              />
            </div>
            <p id="file-constraints" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Max {MAX_FILE_SIZE_MB}MB per file. Accepted: JPG, PNG, GIF, WEBP. Total {MAX_TOTAL_FILES} images.
            </p>
          </div>

          { (newFiles.length > 0 || existingImageInfos.length > 0) &&
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Album Images ({newFiles.length + existingImageInfos.length} / {MAX_TOTAL_FILES}):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {existingImageInfos.map((imgInfo) => (
                  <div key={imgInfo.id} className="relative group border dark:border-slate-700 rounded-md overflow-hidden aspect-square bg-slate-100 dark:bg-slate-800">
                    <img src={imgInfo.url} alt="Existing preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Button 
                        size="sm" isIconOnly color="danger" variant="light" aria-label="Remove existing image"
                        onPress={() => removeExistingFile(imgInfo.id)} isDisabled={isFormLoading}
                        className="text-white"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {newFiles.map((file, index) => (
                  <div key={file.name + index} className="relative group border dark:border-slate-700 rounded-md overflow-hidden aspect-square bg-slate-100 dark:bg-slate-800">
                    <img src={file.preview} alt={`Preview ${file.name}`} className="h-full w-full object-cover" />
                     <div className="absolute top-0 right-0 bg-green-600 text-white text-[0.6rem] px-1.5 py-0.5 rounded-bl-md shadow">NEW</div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                       <Button 
                        size="sm" isIconOnly color="danger" variant="light" aria-label="Remove new image"
                        onPress={() => removeNewFile(index)} isDisabled={isFormLoading}
                        className="text-white"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
           {newFiles.length > 0 && (
                <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <PaperClipIcon className="w-4 h-4"/>
                    {newFiles.length} new file(s) ready for upload.
                </div>
            )}

          {isFormLoading && <Progress isIndeterminate aria-label="Processing..." size="sm" className="my-4" />}
        </Drawer.Body>
        <Drawer.Footer>
          <Button variant="flat" color="default" onPress={closeFormDrawer} isDisabled={isFormLoading}>
            Cancel
          </Button>
          <Button type="submit" color="primary" isLoading={isFormLoading} isDisabled={isFormLoading || (newFiles.length + existingImageInfos.length === 0 && !editingItem)}>
            {isFormLoading ? (editingItem ? 'Saving Album...' : 'Adding Album...') : (editingItem ? 'Save Changes' : 'Add Album')}
          </Button>
        </Drawer.Footer>
      </form>
    </Drawer>
  );
};

export default GalleryForm;