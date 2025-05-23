// src/components/gallery/GalleryItemCard.tsx
import React from 'react';
import { storage, APPWRITE_BUCKET_GALLERY_ID as VITE_APPWRITE_GALLERY_BUCKET_ID } from '~/utils/appwrite'; // Adjust path
import { GalleryItem, useGalleryStore, ALL_FACULTIES_ID } from '~/store/galleryStore'; // Adjust path
import ActionButton from '../../../../common/ActionButton'; // Adjust path as needed
import { PencilSquareIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface GalleryItemCardProps {
  item: GalleryItem;
}

const GalleryItemCard: React.FC<GalleryItemCardProps> = ({ item }) => {
  const { openFormDrawer, openDeletePopover, faculties, openImageViewer } = useGalleryStore();

  const facultyNames = React.useMemo(() => {
    return item.faculty
      .map(facultyId => {
        const faculty = faculties.find(f => f.$id === facultyId);
        return faculty?.name; // faculty?.name will include "All Categories" if ALL_FACULTIES_ID is a tag
      })
      .filter(Boolean) // Remove undefined if any faculty not found (should not happen if data is clean)
      .join(', ') || (item.faculty.length > 0 ? 'Specific Categories' : 'Uncategorized'); // Fallback if names are empty but array not
  }, [item.faculty, faculties]);

  // Use the pre-generated 400px preview URL from the store for the card
  const firstImageUrl = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : undefined;
  const totalImages = item.fileId.length;

  const handleViewAlbum = () => {
    if (item.fileId && item.fileId.length > 0) {
      // For the viewer, generate URLs for potentially higher quality or original images
      const viewerImages = item.fileId.map((id, index) => ({
        src: storage.getFilePreview(VITE_APPWRITE_GALLERY_BUCKET_ID, id, 0, 0, 100).toString(), // width=0, height=0, quality=100 for best preview
        alt: `${item.title} - Image ${index + 1}`
      }));
      openImageViewer(viewerImages, 0, item.title); // Pass album title to viewer
    }
  };

  return (
    <div className="group relative rounded-lg shadow-xl bg-gray-200 dark:bg-slate-800 transition-all duration-300 ease-in-out hover:shadow-2xl overflow-hidden">
      <div 
        className="aspect-w-16 aspect-h-9 cursor-pointer" // Or aspect-square, etc.
        onClick={handleViewAlbum}
      >
        {firstImageUrl ? (
          <img
            src={firstImageUrl}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
            <PhotoIcon className="w-16 h-16"/>
          </div>
        )}
      </div>
      
      {totalImages > 1 && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full shadow">
          {totalImages} images
        </div>
      )}

      {/* Content Overlay: Title, Faculties, Actions (on hover) */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 md:p-4 flex flex-col justify-end"
      >
        <h3 
          className="text-white text-base md:text-lg font-semibold truncate cursor-pointer hover:underline" 
          title={item.title}
          onClick={handleViewAlbum} // Title also clickable to view album
        >
          {item.title}
        </h3>
        {facultyNames && <p className="text-xs text-gray-300 truncate" title={facultyNames}>{facultyNames}</p>}
        
        <div className="mt-2 flex space-x-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity delay-100 duration-300 translate-y-2 group-hover:translate-y-0">
          <ActionButton
            icon={<PencilSquareIcon className="w-4 h-4" />}
            onClick={(e:any) => { e.stopPropagation(); openFormDrawer(item);}}
            color="orange"
            isIconOnly={true}
            buttonText="Edit Album"
          />
          <ActionButton
            icon={<TrashIcon className="w-4 h-4" />}
            onClick={(e:any) => { e.stopPropagation(); openDeletePopover(item);}}
            color="red"
            isIconOnly={true}
            buttonText="Delete Album"
          />
        </div>
      </div>

      {/* Always visible title bar (optional, for discoverability when not hovered) */}
      <div 
        className="absolute bottom-0 left-0 right-0 p-2 md:p-3 bg-gradient-to-t from-black/70 to-transparent group-hover:opacity-0 transition-opacity duration-200 pointer-events-none"
      >
         <h3 className="text-white text-sm md:text-md font-semibold truncate" title={item.title}>{item.title}</h3>
         {facultyNames && <p className="text-xs text-gray-200 truncate" title={facultyNames}>{facultyNames}</p>}
      </div>
    </div>
  );
};

export default GalleryItemCard;