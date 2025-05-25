import React from 'react';
import type { GalleryGroup } from 'types/gallery';
import ActionButton from '../../../../common/ActionButton';
import { PencilIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface GalleryGroupCardProps {
  group: GalleryGroup;
  onEdit: (group: GalleryGroup) => void;
  onDelete: (groupId: string, groupTitle: string) => void;
  onViewPhotos: (group: GalleryGroup) => void; // To show photos of this group
  isDeleting: boolean;
}

const GalleryGroupCard: React.FC<GalleryGroupCardProps> = ({ group, onEdit, onDelete, onViewPhotos, isDeleting }) => {
  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col">
      <div 
        className="relative h-40 bg-gray-200 cursor-pointer"
        onClick={() => onViewPhotos(group)}
      >
        {group.coverPreviewUrl ? (
          <img src={group.coverPreviewUrl} alt={group.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <PhotoIcon className="w-16 h-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-white text-lg font-semibold">View Photos</p>
        </div>
      </div>
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
            <h3 
                className="text-lg font-semibold text-gray-800 mb-1 truncate cursor-pointer hover:text-indigo-600"
                onClick={() => onViewPhotos(group)}
                title={group.title}
            >
                {group.title}
            </h3>
            <p className="text-xs text-gray-500 mb-1">{group.photoCount || 0} photos</p>
            {group.description && <p className="text-sm text-gray-600 mb-2 line-clamp-2">{group.description}</p>}
        </div>
        <div className="mt-3 flex justify-end space-x-2">
          <ActionButton
            icon={<PencilIcon className="h-4 w-4" />}
            onClick={() => onEdit(group)}
            color="orange"
            isIconOnly={true}
          />
          <ActionButton
            icon={<TrashIcon className="h-4 w-4" />}
            onClick={() => onDelete(group.$id, group.title)}
            color="red"
            isIconOnly={true}
            // Add loading state to ActionButton if it supports it
          />
        </div>
      </div>
    </div>
  );
};
export default GalleryGroupCard;