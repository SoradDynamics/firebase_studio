// Popover.tsx
// src/popover.tsx - Path might vary
import React, { useEffect } from "react";
import ReactDOM from "react-dom"; // Import ReactDOM for createPortal
import { Button } from "@heroui/react";
import { TrashIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";

interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  content: React.ReactNode;
  // Position prop is less relevant for a centered dialog, but keep if needed for other uses
  // position?: 'top' | 'right' | 'bottom' | 'left' | 'top-end' | 'left-start';
  className?: string;
  isConfirmLoading?: boolean; // Add loading state for confirm button
}

// --- Helper: Create or get the portal root ---
// This ensures we have a dedicated div outside the main React root to render portals into.
const getPortalRoot = (): HTMLElement => {
  let portalRoot = document.getElementById("popover-portal-root");
  if (!portalRoot) {
    portalRoot = document.createElement("div");
    portalRoot.setAttribute("id", "popover-portal-root");
    // Append directly to body to ensure it's outside the main app container
    document.body.appendChild(portalRoot);
  }
  return portalRoot;
};


const Popover: React.FC<PopoverProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  content,
  // position = 'right', // Less relevant now
  className = '',
  isConfirmLoading = false, // Default loading state
}) => {

  // Effect to handle Escape key press for closing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    // Cleanup listener
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]); // Re-run effect if isOpen or onClose changes


  // Don't render the portal if not open
  if (!isOpen) {
    return null;
  }

  // --- The JSX for the Popover/Dialog content ---
  const popoverContent = (
    // Backdrop: Fixed overlay covering the screen
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      // Close when clicking the backdrop (outside the content)
      onClick={onClose}
    >
      {/* Content Container: Prevent backdrop click from closing */}
      <div
        className={`bg-white/90 rounded-lg shadow-xl w-full max-w-md p-5 md:p-6 relative overflow-hidden ${className}`}
        // Stop propagation so clicks inside don't trigger backdrop onClick
        onClick={(e) => e.stopPropagation()}
      >
        {/* Optional: Close button top-right corner */}
        {/* <button
           onClick={onClose}
           className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
           aria-label="Close"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
               <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button> */}

        {/* Popover Title */}
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
           {/* Icon often placed in title for confirmation dialogs */}
           {typeof title === 'string' && title.toLowerCase().includes('delete') && (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 inline" />
           )}
           {title}
        </h3>

        {/* Popover Content */}
        <div className="mb-5 text-medium text-gray-600">{content}</div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
          <Button
            color="default"
            variant="flat" // Or 'light' based on your library
            size="md" // Consistent button size
            onPress={onClose}
            className="text-gray-700 w-full sm:w-auto" // Stack on mobile
            isDisabled={isConfirmLoading} // Disable cancel while confirming
          >
            Cancel
          </Button>
          <Button
            color="success"
            size="md"
            onPress={onConfirm}
            className="w-full sm:w-auto text-white font-medium" // Stack on mobile
            isLoading={isConfirmLoading} // Show loading state on confirm button
            isDisabled={isConfirmLoading} // Disable confirm while loading
            // startContent={!isConfirmLoading ? <TrashIcon className="h-5 w-5" /> : undefined} // Show icon only when not loading
          >
            {isConfirmLoading ? 'Confirming...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );

  // --- Use the Portal ---
  // Render the popoverContent into the dedicated portal root DOM node
  return ReactDOM.createPortal(popoverContent, getPortalRoot());
};

export default Popover;