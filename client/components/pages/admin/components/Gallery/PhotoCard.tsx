// src/components/gallery/PhotoCard.tsx
import React from 'react';
import type { GalleryPhoto } from 'types/gallery';
import ActionButton from '../../../../common/ActionButton';
import { TrashIcon, EyeIcon } from '@heroicons/react/24/outline';

interface PhotoCardProps {
  photo: GalleryPhoto;
  onView: (photo: GalleryPhoto) => void;
  onDelete?: (photoId: string, fileId: string) => void; // Make optional
  isDeleting?: boolean; // Make optional
  isViewOnly?: boolean; // New prop
}

const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  onView,
  onDelete,
  isDeleting,
  isViewOnly = false, // Default to false
}) => {
  const validPreviewUrl = photo.previewUrl && !photo.previewUrl.startsWith('/placeholder')
    ? photo.previewUrl
    : '/placeholder-image.png'; // Ensure public/placeholder-image.png exists

  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg shadow-md bg-gray-200">
      <img
        src={validPreviewUrl}
        alt={photo.caption || photo.fileName || 'Gallery image'}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <div
        className={`absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-2 space-y-2 ${isViewOnly ? 'cursor-pointer' : ''}`}
        onClick={isViewOnly ? () => onView(photo) : undefined} // If view only, whole overlay click views
      >
        <ActionButton
          icon={<EyeIcon className="h-5 w-5" />}
          onClick={() => onView(photo)}
          color="blue"
          buttonText="View"
          isIconOnly={isViewOnly} // Icon only for student view could be cleaner
        />
        {!isViewOnly && onDelete && (
          <ActionButton
            icon={<TrashIcon className="h-5 w-5" />}
            onClick={() => onDelete(photo.$id, photo.fileId)}
            color="red"
            buttonText="Delete"
            isIconOnly={false}
            // Consider adding a loading state to ActionButton if needed
          />
        )}
      </div>
      {photo.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
          {photo.caption}
        </div>
      )}
    </div>
  );
};
export default PhotoCard;