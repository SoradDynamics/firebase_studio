// src/common/Drawer.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useId,
  } from 'react';
  import { createPortal } from 'react-dom';
  import { XMarkIcon } from '@heroicons/react/24/outline';
  import PerfectScrollbar from "react-perfect-scrollbar";
  import "react-perfect-scrollbar/dist/css/styles.css";
  // --- Types ---

  type DrawerPosition = 'left' | 'right';
  type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

  interface DrawerContextProps {
    onClose: () => void;
    titleId: string;
  }

  interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    position?: DrawerPosition;
    size?: DrawerSize;
    title?: string;
    nonDismissable?: boolean; // <-- ADDED: Prevents closing via overlay/Esc
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
  }

  interface DrawerHeaderProps {
    children: React.ReactNode;
    showCloseButton?: boolean;
    className?: string;
  }

  interface DrawerBodyProps {
    children: React.ReactNode;
    className?: string;
  }

  interface DrawerFooterProps {
    children: React.ReactNode;
    className?: string;
  }

  // --- Context ---

  const DrawerContext = createContext<DrawerContextProps | null>(null);

  const useDrawerContext = () => {
    const context = useContext(DrawerContext);
    if (!context) {
      throw new Error('Drawer compound components must be used within a Drawer');
    }
    return context;
  };

  // --- Size Mapping ---

  const sizeClasses: Record<DrawerSize, string> = {
    sm: 'w-64 max-w-full',
    md: 'w-96 max-w-full', // Default
    lg: 'w-[32rem] max-w-full', // 512px
    xl: 'w-[48rem] max-w-full', // 768px
    full: 'w-full',
  };

  // --- Main Drawer Component ---

  export function Drawer({
    isOpen,
    onClose,
    children,
    position = 'right',
    size = 'md',
    title,
    nonDismissable = false, // <-- ADDED: Default to false (dismissable)
    'aria-labelledby': ariaLabelledbyProp,
    'aria-describedby': ariaDescribedbyProp,
  }: DrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);
    const generatedTitleId = useId();
    const titleId = ariaLabelledbyProp || generatedTitleId;

    // Close on Escape key (conditionally)
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        // <-- ADDED condition: !nonDismissable
        if (!nonDismissable && event.key === 'Escape' && isOpen) {
          onClose();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
      // <-- ADDED nonDismissable to dependency array
    }, [isOpen, onClose, nonDismissable]);

    // Close on overlay click (conditionally)
    const handleOverlayClick = (
      event: React.MouseEvent<HTMLDivElement, MouseEvent>
    ) => {
      // <-- ADDED condition: !nonDismissable
      if (!nonDismissable && event.target === event.currentTarget) {
        onClose();
      }
    };

    // Focus trapping (basic example)
    useEffect(() => {
      if (isOpen && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTabKey = (e: KeyboardEvent) => {
          if (e.key !== 'Tab') return;
          if (focusableElements.length === 0) return; // Handle case with no focusable elements

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement?.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement?.focus();
              e.preventDefault();
            }
          }
        };

        // Try focusing the first element, fallback to the drawer itself
        if (firstElement) {
          firstElement.focus();
        } else if (drawerRef.current) {
           // Make drawer focusable if no interactive elements inside
           drawerRef.current.setAttribute('tabindex', '-1');
           drawerRef.current.focus();
        }

        const currentDrawerRef = drawerRef.current; // Capture ref for cleanup
        currentDrawerRef?.addEventListener('keydown', handleTabKey);
        return () => currentDrawerRef?.removeEventListener('keydown', handleTabKey);
      }
    }, [isOpen]);

     // Prevent body scroll when drawer is open
     useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (typeof window === 'undefined') return null;

    return createPortal(
      <DrawerContext.Provider value={{ onClose, titleId }}>
        {/* Overlay */}
        <div
          className={`fixed inset-0 z-40 bg-gray-900/50 dark:bg-gray-900/80 transition-opacity duration-300 ease-in-out ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } ${nonDismissable ? 'cursor-default' : 'cursor-pointer' // <-- Optional: visual cue
          }`}
          onClick={handleOverlayClick}
          aria-hidden="true"
        />

        {/* Drawer Panel */}
        <div
          ref={drawerRef}
          className={`fixed top-0 bottom-0 z-50 flex h-full flex-col overflow-hidden bg-white/90 shadow-xl transition-transform duration-300 ease-in-out dark:bg-gray-800 ${
            sizeClasses[size]
          } ${position === 'right' ? 'right-0' : 'left-0'} ${
            isOpen
              ? 'translate-x-0'
              : position === 'right'
              ? 'translate-x-full'
              : '-translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={ariaDescribedbyProp}
        >
          {/* Render simple title if provided and no Drawer.Header is found */}
          {title && !React.Children.toArray(children).some(child => (child as React.ReactElement).type === DrawerHeader) && (
            // NOTE: For non-dismissable drawers using only 'title', you MUST provide a close mechanism elsewhere
            <DrawerHeader showCloseButton={!nonDismissable}>
               <h2 id={titleId} className="text-lg font-semibold text-gray-800 dark:text-white">
                {title}
              </h2>
            </DrawerHeader>
          )}
            <PerfectScrollbar options={{ suppressScrollX: true }}>
          
          {/* Render provided children (Header, Body, Footer) */}
          {children}
          </PerfectScrollbar>
        </div>
      </DrawerContext.Provider>,
      document.body
    );
  }

  // --- Drawer Header ---
  // No changes needed, but be mindful of showCloseButton when nonDismissable=true
  const DrawerHeader: React.FC<DrawerHeaderProps> = ({
    children,
    showCloseButton = true, // User should set this to false if drawer is nonDismissable and they don't want this specific X
    className = '',
  }) => {
    const { onClose, titleId } = useDrawerContext();
    return (
      <div
        className={`flex items-center justify-between p-4 border-b border-gray-200 shrink-0 dark:border-gray-700 ${className}`}
      >
        <div id={titleId} className="flex-grow text-lg font-semibold text-gray-800 dark:text-white">
           {children}
        </div>
        {showCloseButton && (
          <button
            type="button"
            className="-mr-2 ml-4 rounded-md p-1 text-gray-600 font-bold hover:bg-gray-100 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            onClick={onClose} // This button WILL still work even if nonDismissable=true
            aria-label="Close drawer"
          >
            <XMarkIcon className="h-6 w-6 font-bold" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  };

  // --- Drawer Body --- (No changes needed)
  const DrawerBody: React.FC<DrawerBodyProps> = ({ children, className = '' }) => {
    return (
      <div className={`flex-grow overflow-y-auto p-4 ${className}`}>
        {children}
      </div>
    );
  };

  // --- Drawer Footer --- (No changes needed)
  const DrawerFooter: React.FC<DrawerFooterProps> = ({ children, className = '' }) => {
    return (
      <div
        className={`flex flex-shrink-0 justify-end space-x-2 p-4 border-t border-gray-200 dark:border-gray-700 ${className}`}
      >
        {children}
      </div>
    );
  };

  // --- Assign Compound Components ---
  Drawer.Header = DrawerHeader;
  Drawer.Body = DrawerBody;
  Drawer.Footer = DrawerFooter;