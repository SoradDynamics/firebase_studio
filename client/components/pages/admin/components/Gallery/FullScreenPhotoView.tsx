import React from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'; // Using Headless UI for modal
import { XMarkIcon, ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { GalleryPhoto } from 'types/gallery';
import { Button } from '@heroui/react'; // Assuming Button is from hero ui
import { getFileDownloadUrl } from '~/store/galleryStore';


interface FullScreenPhotoViewProps {
  photo: GalleryPhoto | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  canNext?: boolean;
  canPrev?: boolean;
}

const FullScreenPhotoView: React.FC<FullScreenPhotoViewProps> = ({
  photo,
  isOpen,
  onClose,
  onNext,
  onPrev,
  canNext,
  canPrev,
}) => {
  if (!photo) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = getFileDownloadUrl(photo.fileId);
    link.download = photo.fileName || 'gallery-image';
    console.log(link.download);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-4xl transform overflow-hidden rounded-lg bg-neutral-800 p-2 text-left align-middle shadow-xl transition-all">
                <DialogTitle as="h3" className="text-lg font-medium leading-6 text-gray-100 p-2 flex justify-between items-center">
                  <span>{photo.caption || photo.fileName}</span>
                  <div className="flex items-center gap-2">
                    <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        className="text-white hover:bg-neutral-700"
                        onPress={handleDownload}
                        aria-label="Download photo"
                    >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                    </Button>
                    <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        className="text-white hover:bg-neutral-700"
                        onPress={onClose}
                        aria-label="Close full screen view"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </Button>
                  </div>
                </DialogTitle>
                <div className="mt-2 relative aspect-video flex items-center justify-center">
                  <img 
                    src={photo.fullUrl || ''} 
                    alt={photo.caption || photo.fileName} 
                    className="max-h-[80vh] max-w-full object-contain" 
                  />
                  {onPrev && canPrev && (
                     <Button 
                        isIconOnly 
                        variant="flat" 
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full"
                        onPress={onPrev}
                        aria-label="Previous photo"
                    >
                       <ChevronLeftIcon className="h-8 w-8" />
                     </Button>
                  )}
                  {onNext && canNext && (
                     <Button 
                        isIconOnly 
                        variant="flat" 
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full"
                        onPress={onNext}
                        aria-label="Next photo"
                    >
                       <ChevronRightIcon className="h-8 w-8" />
                     </Button>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default FullScreenPhotoView;