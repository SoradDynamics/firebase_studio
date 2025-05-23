// src/components/ui/ImageViewer.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
} from '@heroicons/react/24/solid';
import { Button } from '@heroui/react'; // Adjust path if needed

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: { src: string; alt?: string }[];
  initialIndex?: number;
  albumTitle?: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

const ImageViewer: React.FC<ImageViewerProps> = ({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  albumTitle = "Image Viewer",
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      resetImageState();
      document.body.style.overflow = 'hidden';
      
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
        if (event.key === 'ArrowLeft') goToPrevious();
        if (event.key === 'ArrowRight') goToNext();
        if (event.key === '+' || event.key === '=') { event.preventDefault(); handleZoomIn(); }
        if (event.key === '-') { event.preventDefault(); handleZoomOut(); }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, initialIndex, onClose]);

  const resetImageState = () => {
    setZoomLevel(1);
    setImageOffset({ x: 0, y: 0 });
  }

  const goToPrevious = () => {
    if (images.length > 1) {
      setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
      resetImageState();
    }
  };

  const goToNext = () => {
    if (images.length > 1) {
      setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
      resetImageState();
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP));

  const handleDownload = async () => {
    const currentImage = images[currentIndex];
    if (!currentImage) return;
    try {
      const response = await fetch(currentImage.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      let filename = `image-${currentIndex + 1}.jpg`; // Default filename
      const srcParts = currentImage.src.split('/');
      const lastPart = srcParts.pop();
      if (lastPart) {
          const queryParamIndex = lastPart.indexOf('?');
          filename = queryParamIndex !== -1 ? lastPart.substring(0, queryParamIndex) : lastPart;
      }
      // Ensure filename has an extension, crude check
      if (!filename.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
        filename += '.jpg'; // Default to .jpg if no clear extension
      }

      a.download = currentImage.alt ? `${albumTitle.replace(/ /g, '_')}-${filename}` : filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error("Error downloading image:", error);
      alert("Could not download image.");
    }
  };
  
  const onMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (zoomLevel <= 1 || !imageRef.current) return;
    // Check if the click is on the image itself, not padding if image is smaller than container
    const imgRect = imageRef.current.getBoundingClientRect();
    if (e.clientX < imgRect.left || e.clientX > imgRect.right || e.clientY < imgRect.top || e.clientY > imgRect.bottom) {
        return; // Click was outside the scaled image content
    }
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - imageOffset.x, y: e.clientY - imageOffset.y });
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !imageRef.current || zoomLevel <= 1) return;
    e.preventDefault();
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setImageOffset({ x: newX, y: newY });
  };

  const onMouseUpOrLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the mouse up is outside the main image viewer area, then close.
    // This can be tricky with panning.
    if (e.target === viewerRef.current && !isDragging) {
      // If click was on the backdrop (viewerRef) and not dragging an image
      // onClose(); // This might be too aggressive if user accidentally clicks backdrop while panning
    }
    if (isDragging) setIsDragging(false);
  };

  if (!isOpen || images.length === 0) return null;
  const currentImage = images[currentIndex];

  return (
    <div
      ref={viewerRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-0 select-none" // prevent text selection
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUpOrLeave}
      onMouseLeave={onMouseUpOrLeave}
    >
      {/* Top Bar: Title and Close */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-black/30 backdrop-blur-sm flex items-center justify-between px-4 z-10">
        <h2 className="text-lg font-semibold text-white truncate flex-1" title={albumTitle || currentImage?.alt}>
          {albumTitle || currentImage?.alt || `Image ${currentIndex + 1}`}
        </h2>
        <Button
          isIconOnly variant="light" onPress={onClose}
          className="text-white hover:bg-white/20 focus:ring-white/50" aria-label="Close viewer"
        >
          <XMarkIcon className="h-7 w-7" />
        </Button>
      </div>

      {/* Main Image Area */}
      <div 
        className="flex-grow flex items-center justify-center w-full h-full overflow-hidden relative pt-16 pb-20" // Padding for top/bottom bars
        onClick={(e) => { if(e.target === e.currentTarget) onClose(); }} // Close on backdrop click
      >
        <img
          ref={imageRef}
          key={currentImage.src} 
          src={currentImage.src}
          alt={currentImage.alt || `Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain transition-transform duration-100 ease-out"
          style={{ 
            transform: `scale(${zoomLevel}) translate(${imageOffset.x / zoomLevel}px, ${imageOffset.y / zoomLevel}px)`,
            cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
           }}
          onMouseDown={onMouseDown}
          onClick={(e) => e.stopPropagation()} // Prevent backdrop close when clicking image
          draggable="false"
        />
      </div>
      
      {/* Bottom Controls: Navigation, Zoom, Download */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-black/30 backdrop-blur-sm flex items-center justify-center gap-2 sm:gap-4 px-2 z-10">
        <Button isIconOnly variant="light" onPress={handleZoomOut} isDisabled={zoomLevel <= MIN_ZOOM} className="text-white hover:bg-white/20 focus:ring-white/50" aria-label="Zoom out">
          <MagnifyingGlassMinusIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>

        {images.length > 1 && (
            <Button isIconOnly variant="light" onPress={goToPrevious} className="text-white hover:bg-white/20 focus:ring-white/50" aria-label="Previous image">
                <ChevronLeftIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            </Button>
        )}

        <Button isIconOnly variant="light" onPress={handleDownload} className="text-white hover:bg-white/20 focus:ring-white/50" aria-label="Download image">
          <ArrowDownTrayIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>

        {images.length > 1 && (
            <Button isIconOnly variant="light" onPress={goToNext} className="text-white hover:bg-white/20 focus:ring-white/50" aria-label="Next image">
                <ChevronRightIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            </Button>
        )}
        
        <Button isIconOnly variant="light" onPress={handleZoomIn} isDisabled={zoomLevel >= MAX_ZOOM} className="text-white hover:bg-white/20 focus:ring-white/50" aria-label="Zoom in">
          <MagnifyingGlassPlusIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      </div>
      
        {/* Image Counter (if multiple images) */}
        {images.length > 1 && (
            <div className="absolute top-[calc(4rem+0.5rem)] sm:bottom-[calc(5rem+0.5rem)] sm:top-auto left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full shadow">
                {currentIndex + 1} / {images.length}
            </div>
        )}
    </div>
  );
};

export default ImageViewer;