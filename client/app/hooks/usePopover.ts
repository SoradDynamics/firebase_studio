// src/hooks/usePopover.ts
import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePopoverResult {
    isOpen: boolean;
    targetRef: React.RefObject<HTMLElement>;
    openPopover: (event: React.MouseEvent<HTMLElement>) => void;
    closePopover: () => void;
}

export const usePopover = (): UsePopoverResult => {
    const [isOpen, setIsOpen] = useState(false);
    const targetRef = useRef<HTMLElement>(null);

    const openPopover = useCallback((event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation(); // Prevent click from closing immediately
        setIsOpen(true);
    }, []);

    const closePopover = useCallback(() => {
        setIsOpen(false);
    }, []);

    // Close popover on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (targetRef.current && !targetRef.current.contains(event.target as Node)) {
                closePopover();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, closePopover]);

    return { isOpen, targetRef, openPopover, closePopover };
};