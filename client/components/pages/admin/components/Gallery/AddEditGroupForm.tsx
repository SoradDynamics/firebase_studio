import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { Button, Input, Textarea } from '@heroui/react';
import CustomSelect, { SelectOption } from '../../../common/CustomSelect';
import { useGalleryStore, getFilePreviewUrl } from '~/store/galleryStore';
import type { GalleryGroup, GalleryGroupFormData, ManagedFile, FacultyForSelect } from 'types/gallery';
import { ALL_FACULTIES_ID } from '~/utils/appwrite';
import { TrashIcon, PhotoIcon, StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast'; // Assuming you have react-hot-toast

interface AddEditGroupFormProps {
  groupToEdit?: GalleryGroup | null;
  onClose: () => void;
}

const AddEditGroupForm: React.FC<AddEditGroupFormProps> = ({ groupToEdit, onClose }) => {
  const {
    faculties,
    fetchFaculties,
    isLoadingFaculties,
    createGalleryGroup,
    updateGalleryGroup,
    fetchPhotosForGroup, // To load existing photos for edit mode
    photosByGroup,       // To get existing photos
    isSubmittingGroup,
  } = useGalleryStore();

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } = useForm<GalleryGroupFormData>({
    defaultValues: {
      title: groupToEdit?.title || '',
      description: groupToEdit?.description || '',
      visibleTo: groupToEdit?.visibleTo || ALL_FACULTIES_ID,
    },
  });

  const [managedFiles, setManagedFiles] = useState<ManagedFile[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<{ photoId: string; fileId: string }[]>([]);
  const [selectedCoverFileId, setSelectedCoverFileId] = useState<string | undefined>(groupToEdit?.coverImageFileId);
  const [newCoverCandidate, setNewCoverCandidate] = useState<File | null>(null); // For a newly uploaded file to be cover

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFaculties();
  }, [fetchFaculties]);

  useEffect(() => {
    if (groupToEdit) {
      reset({
        title: groupToEdit.title,
        description: groupToEdit.description || '',
        visibleTo: groupToEdit.visibleTo || ALL_FACULTIES_ID,
      });
      setSelectedCoverFileId(groupToEdit.coverImageFileId);
      
      // Load existing photos for the group
      const loadExistingPhotos = async () => {
        const existingPhotos = await fetchPhotosForGroup(groupToEdit.$id, true);
        if (existingPhotos) {
          const existingManagedFiles: ManagedFile[] = existingPhotos.map(p => ({
            id: p.$id, // Use photo $id as unique key for existing
            file: new File([], p.fileName, {}), // Placeholder file
            preview: getFilePreviewUrl(p.fileId, 100, 100),
            isNew: false,
            existingPhotoId: p.$id,
            existingFileId: p.fileId,
          }));
          setManagedFiles(existingManagedFiles);
        }
      };
      loadExistingPhotos();
    } else {
        reset({ title: '', description: '', visibleTo: ALL_FACULTIES_ID });
        setManagedFiles([]);
        setSelectedCoverFileId(undefined);
        setNewCoverCandidate(null);
    }
  }, [groupToEdit, reset, fetchPhotosForGroup]);

  const facultyOptions: SelectOption[] = [
    { id: ALL_FACULTIES_ID, name: 'All Faculties' },
    ...faculties.map((f) => ({ id: f.id, name: f.name })),
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFilesArray = Array.from(event.target.files).map((file, index) => ({
        id: `new-${Date.now()}-${index}`, // temp local id
        file,
        preview: URL.createObjectURL(file),
        isNew: true,
      }));
      setManagedFiles(prev => [...prev, ...newFilesArray]);
      if (event.target) event.target.value = ''; // Reset file input
    }
  };

  const removeManagedFile = (fileIdToRemove: string) => {
    const fileToRemove = managedFiles.find(mf => mf.id === fileIdToRemove);
    if (fileToRemove) {
        if (!fileToRemove.isNew && fileToRemove.existingPhotoId && fileToRemove.existingFileId) {
            // Mark existing photo for deletion
            setPhotosToDelete(prev => [...prev, { photoId: fileToRemove.existingPhotoId!, fileId: fileToRemove.existingFileId! }]);
        }
        setManagedFiles(prev => prev.filter(mf => mf.id !== fileIdToRemove));
        // If the removed file was the selected cover, clear cover selection
        if (fileToRemove.isNew && newCoverCandidate?.name === fileToRemove.file.name && newCoverCandidate?.size === fileToRemove.file.size) {
            setNewCoverCandidate(null);
        } else if (!fileToRemove.isNew && selectedCoverFileId === fileToRemove.existingFileId) {
            setSelectedCoverFileId(undefined);
        }
    }
  };
  
  const setAsCover = (file: ManagedFile) => {
    if (file.isNew) {
        setNewCoverCandidate(file.file);
        setSelectedCoverFileId(undefined); // Clear existing selection if new file is chosen
    } else if (file.existingFileId) {
        setSelectedCoverFileId(file.existingFileId);
        setNewCoverCandidate(null); // Clear new file selection
    }
  };

  const onSubmit: SubmitHandler<GalleryGroupFormData> = async (data) => {
    const newActualFiles = managedFiles.filter(mf => mf.isNew).map(mf => mf.file);
    
    if (!groupToEdit && newActualFiles.length === 0) {
      toast.error('Please upload at least one photo for a new group.');
      return;
    }

    let coverFileForUpload: File | undefined = newCoverCandidate || undefined;
    let coverIndexInNewFiles: number | undefined = undefined;

    if (!groupToEdit && newActualFiles.length > 0 && !coverFileForUpload) {
        // If creating and no explicit cover, find index of first new file if it's implicitly the cover
        // Or, if selectedCoverFileId points to a new file's preview (less robust)
    } else if (groupToEdit && newCoverCandidate) {
        coverFileForUpload = newCoverCandidate;
    }


    if (groupToEdit) {
      await updateGalleryGroup(
        groupToEdit.$id,
        { title: data.title, description: data.description, visibleTo: data.visibleTo || ALL_FACULTIES_ID },
        newActualFiles,
        photosToDelete,
        coverFileForUpload, // new file to be uploaded and set as cover
        !newCoverCandidate ? selectedCoverFileId : undefined // existing fileId to be set as cover
      );
      toast.success('Group updated successfully!');
    } else {
      let coverFileIndex: number | undefined = undefined;
      if (newCoverCandidate) {
        coverFileIndex = newActualFiles.findIndex(f => f.name === newCoverCandidate.name && f.size === newCoverCandidate.size);
      } else if (newActualFiles.length > 0) {
        // Default to first new file as cover if nothing specific is chosen
        // coverFileIndex = 0; // The store logic handles this default better
      }

      await createGalleryGroup(
        { title: data.title, description: data.description, visibleTo: data.visibleTo || ALL_FACULTIES_ID },
        newActualFiles,
        coverFileIndex
      );
      toast.success('Group created successfully!');
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-1">
      <Input
        label="Group Title"
        {...register('title', { required: 'Title is required' })}
        placeholder="e.g., Annual Sports Day 2024"
        errorMessage={errors.title?.message}
        isInvalid={!!errors.title}
      />
      <Textarea
        label="Description (Optional)"
        {...register('description')}
        placeholder="A brief description of the photo group"
      />
      <Controller
        name="visibleTo"
        control={control}
        render={({ field }) => (
          <CustomSelect
            label="Visible To"
            options={facultyOptions}
            value={field.value}
            onChange={(val) => field.onChange(val)}
            placeholder="Select visibility"
            disabled={isLoadingFaculties}
          />
        )}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Photos</label>
        <div className="mt-2 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
          <div className="space-y-1 text-center">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2"
              >
                <span>Upload files</span>
                <input 
                    id="file-upload" 
                    name="file-upload" 
                    type="file" 
                    className="sr-only" 
                    multiple 
                    onChange={handleFileChange}
                    accept="image/*"
                    ref={fileInputRef}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
          </div>
        </div>
      </div>

      {managedFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded Photos ({managedFiles.length})</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {managedFiles.map((mf) => (
              <div key={mf.id} className="relative group aspect-square border rounded-md overflow-hidden">
                <img src={mf.preview} alt={mf.file.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-1 p-1">
                  <Button 
                    size="sm" 
                    isIconOnly 
                    variant="light" 
                    className="text-white hover:text-yellow-400"
                    onPress={() => setAsCover(mf)}
                    title="Set as cover"
                  >
                    {(mf.isNew && newCoverCandidate?.name === mf.file.name && newCoverCandidate?.size === mf.file.size) ||
                     (!mf.isNew && selectedCoverFileId === mf.existingFileId) ? (
                        <StarSolidIcon className="h-5 w-5 text-yellow-400" />
                    ) : (
                        <StarOutlineIcon className="h-5 w-5" />
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    isIconOnly 
                    color="danger" 
                    variant="light"
                    className="text-white hover:text-red-400"
                    onPress={() => removeManagedFile(mf.id)}
                    title="Remove photo"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </Button>
                </div>
                {(mf.isNew && newCoverCandidate?.name === mf.file.name && newCoverCandidate?.size === mf.file.size) ||
                 (!mf.isNew && selectedCoverFileId === mf.existingFileId) ? (
                    <div className="absolute top-1 right-1 bg-yellow-500 text-white p-0.5 rounded-full">
                        <StarSolidIcon className="h-3 w-3" />
                    </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" color="default" variant="flat" onPress={onClose} disabled={isSubmittingGroup}>
          Cancel
        </Button>
        <Button type="submit" color="primary" isLoading={isSubmittingGroup} disabled={isSubmittingGroup}>
          {groupToEdit ? 'Save Changes' : 'Create Group'}
        </Button>
      </div>
    </form>
  );
};

export default AddEditGroupForm;