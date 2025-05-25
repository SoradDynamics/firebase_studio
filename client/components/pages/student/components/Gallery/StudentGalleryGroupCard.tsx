// src/components/gallery/StudentGalleryGroupCard.tsx
import React from 'react';
import type { GalleryGroup } from 'types/gallery';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface StudentGalleryGroupCardProps {
  group: GalleryGroup;
  onViewPhotos: (group: GalleryGroup) => void;
}

const StudentGalleryGroupCard: React.FC<StudentGalleryGroupCardProps> = ({ group, onViewPhotos }) => {
  const validCoverUrl = group.coverPreviewUrl && !group.coverPreviewUrl.startsWith('/placeholder')
    ? group.coverPreviewUrl
    : '/placeholder-image.png';

  return (
    <div
      className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col cursor-pointer hover:shadow-xl transition-shadow duration-200"
      onClick={() => onViewPhotos(group)}
      title={`View photos from ${group.title}`}
    >
      <div className="relative h-48 bg-gray-200"> {/* Increased height slightly */}
        <img src={validCoverUrl} alt={group.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center p-4">
            {/* Can add "View Album" text here if desired on hover */}
        </div>
      </div>
      <div className="p-4 flex-grow">
        <h3 className="text-md font-semibold text-gray-800 mb-1 truncate">
          {group.title}
        </h3>
        <p className="text-xs text-gray-500 mb-2">{group.photoCount || 0} photos</p>
        {group.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
        )}
      </div>
    </div>
  );
};
export default StudentGalleryGroupCard;