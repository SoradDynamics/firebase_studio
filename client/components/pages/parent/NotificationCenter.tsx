// src/components/NotificationCenter.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNotifications } from './context/NotificationContext'; // Adjust path if needed

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'absence' | string;
  isRead: boolean;
}

// --- Configuration for Lazy Loading ---
const INITIAL_LOAD_COUNT = 5; // Number of items to show initially
const LOAD_MORE_COUNT = 2;    // Number of items to load each time user scrolls down
const SCROLL_THRESHOLD = 100;  // Pixels from bottom to trigger loading more

export const NotificationCenter: React.FC = () => {
  // Get full list, loading status, and error from context
  const {
    notifications: allNotifications,
    isLoading: contextIsLoading,
    error: contextError
  } = useNotifications();

  // Local state for the subset of notifications currently displayed
  const [displayedNotifications, setDisplayedNotifications] = useState<NotificationItem[]>([]);
  // Local state to track if there are more items to load from the full list
  const [hasMore, setHasMore] = useState<boolean>(true);
   // Local state for showing a loading indicator during "load more" action
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Ref for the scrollable container element
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Memoize the sorted full list from context to avoid resorting on every render
  const sortedNotifications = useMemo(() => {
     console.log("Recalculating sortedNotifications"); // Debug log
     return [...allNotifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allNotifications]);

  // Effect to initialize or reset the displayed list when the sorted list changes
  useEffect(() => {
    console.log("Resetting displayed notifications based on context update"); // Debug log
    const initialBatch = sortedNotifications.slice(0, INITIAL_LOAD_COUNT);
    setDisplayedNotifications(initialBatch);
    // Determine if there are more items beyond the initial batch
    setHasMore(initialBatch.length < sortedNotifications.length);
    // Ensure "loading more" indicator is off when resetting
    setIsLoadingMore(false);
  }, [sortedNotifications]); // Dependency: Run only when the sorted full list changes

  // Function to load the next batch of notifications
  const loadMoreNotifications = useCallback(() => {
    // Prevent loading if already loading, or if no more items exist
    if (isLoadingMore || !hasMore) {
        // console.log("Load more skipped:", {isLoadingMore, hasMore}); // Debug log
        return;
    }

    console.log("Loading more notifications..."); // Debug log
    setIsLoadingMore(true);

    // Calculate the next slice from the full sorted list
    const currentLength = displayedNotifications.length;
    const nextBatch = sortedNotifications.slice(currentLength, currentLength + LOAD_MORE_COUNT);

    // Simulate a small delay for visual feedback (optional) and prevent potential race conditions
    setTimeout(() => {
        setDisplayedNotifications(prev => [...prev, ...nextBatch]);
        setHasMore((currentLength + nextBatch.length) < sortedNotifications.length);
        setIsLoadingMore(false);
        console.log("Finished loading more. Has more:", (currentLength + nextBatch.length) < sortedNotifications.length); // Debug log
    }, 200); // Adjust delay as needed (e.g., 100-300ms)

  }, [displayedNotifications.length, hasMore, isLoadingMore, sortedNotifications]);


  // Effect to handle scroll events for loading more
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // --- Scroll Event Handler (with basic throttling) ---
    let isThrottled = false;
    const throttleDelay = 150; // Throttle scroll checks

    const handleScroll = () => {
        // Skip if throttled, already loading, or no more items
        if (isThrottled || isLoadingMore || !hasMore) return;

        const { scrollTop, scrollHeight, clientHeight } = container;

        // Check if user is near the bottom
        if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
            loadMoreNotifications();

            // Apply throttle
            isThrottled = true;
            setTimeout(() => { isThrottled = false; }, throttleDelay);
        }
    };
    // --- End Scroll Event Handler ---

    container.addEventListener('scroll', handleScroll);

    // Cleanup: Remove event listener when component unmounts or dependencies change
    return () => {
        // console.log("Removing scroll listener"); // Debug log
        container.removeEventListener('scroll', handleScroll);
    };

  }, [loadMoreNotifications, hasMore, isLoadingMore]); // Dependencies: Re-attach listener if these change


  // --- Render Logic ---
  return (
    <div className="w-80 sm:w-96 max-h-[70vh] flex flex-col bg-white rounded-md shadow-xl border border-gray-200">
       {/* Header (remains the same) */}
       <div className="p-3 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10 flex-shrink-0">
           <h3 className="text-lg font-semibold text-gray-700">Notifications</h3>
       </div>

      {/* Scrollable List Area */}
      <div ref={scrollContainerRef} className="flex-grow overflow-y-auto p-2">
        {/* --- Initial Loading/Error/Empty States (from Context) --- */}
        {contextIsLoading && displayedNotifications.length === 0 && (
          <p className="text-center text-gray-500 py-4 px-2">Loading notifications...</p>
        )}
        {contextError && (
           <p className="text-center text-red-600 bg-red-100 p-3 rounded-md mx-2 my-2">{contextError}</p>
        )}
        {!contextIsLoading && !contextError && sortedNotifications.length === 0 && (
          <p className="text-center text-gray-500 py-6 px-2">No notifications yet ✅</p>
        )}

        {/* --- Render the *Displayed* Notifications --- */}
        {sortedNotifications.length > 0 && ( // Only render list if there's data
             <ul className="space-y-2">
                {displayedNotifications.map((notification) => (
                <li
                    key={notification.id} // Use the unique notification ID
                    className={`p-3 rounded-md border transition-opacity duration-200 ${
                        notification.type === 'absence' ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-white border-gray-200 hover:bg-gray-50'
                    } ${!notification.isRead ? 'opacity-100' : 'opacity-70'}`}
                >
                    <div className="flex justify-between items-start mb-1 gap-2">
                    <span className={`flex-grow text-sm font-medium ${
                        notification.type === 'absence' ? 'text-red-800' : 'text-blue-800'
                        } ${!notification.isRead ? 'font-bold' : ''}`
                    }>
                        {notification.title}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                        {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    </div>
                    <p className={`text-sm ${notification.type === 'absence' ? 'text-red-700' : 'text-gray-700'}`}>
                    {notification.body}
                    </p>
                </li>
                ))}
            </ul>
        )}


        {/* --- Loading Indicator (for subsequent loads) --- */}
        {isLoadingMore && (
          <p className="text-center text-gray-500 text-sm py-3">Loading more...</p>
        )}

         {/* --- End of List Indicator --- */}
         {!contextIsLoading && !hasMore && displayedNotifications.length > 0 && sortedNotifications.length > INITIAL_LOAD_COUNT && (
             <p className="text-center text-gray-400 text-xs py-3">End of notifications</p>
         )}

      </div>

       {/* Footer (optional, can be removed if not needed) */}
       {/* <div className="p-2 border-t border-gray-100 text-center sticky bottom-0 bg-white z-10 flex-shrink-0">
           <span className="text-xs text-gray-500">Notification Footer</span>
       </div> */}
    </div>
  );
};