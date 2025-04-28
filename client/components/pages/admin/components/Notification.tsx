// src/pages/Admin/Notification/Notification.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useMediaQuery } from "react-responsive";
import { toast } from "react-hot-toast";

import Cards from "./Notification/Cards";
import Details from "./Notification/Details";
import AddNotificationDrawer from "./Notification/AddNotificationDrawer"; // Import the drawer
import { databases, Query } from "~/utils/appwrite"; // Make sure Query is imported if needed
import { AppwriteNotification } from "types/notification";

// --- Configuration ---
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const NOTIFY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_NOTIFY_COLLECTION_ID;

const Notification = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notifications, setNotifications] = useState<AppwriteNotification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<AppwriteNotification | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // <-- State for drawer

  // --- Media Query ---
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Data Fetching ---
  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true); // Control loading indicator visibility
    setError(null);
    // Don't deselect notification on automatic refresh after save
    // setSelectedNotification(null);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        NOTIFY_COLLECTION_ID,
        [Query.orderDesc('$createdAt')] // Fetch newest first
      );
      const sortedDocs = response.documents; // Already sorted by query
      setNotifications(sortedDocs as AppwriteNotification[]);
    } catch (err: any) {
      console.error("Failed to fetch notifications:", err);
      setError(err.message || "Failed to load notifications.");
      toast.error("Could not fetch notifications.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []); // Empty dependency array means this function definition is stable

  useEffect(() => {
    fetchNotifications(true); // Show loading on initial mount
  }, [fetchNotifications]); // Fetch on component mount

  // --- Event Handlers ---
  const handleSelectNotification = (notification: AppwriteNotification) => {
    setSelectedNotification(notification);
  };

  const handleDeselectNotification = () => {
    setSelectedNotification(null);
  };

  const handleRefresh = () => {
    fetchNotifications(true); // Show loading indicator on manual refresh
  };

  // --- Drawer Handlers ---
  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleSaveSuccess = () => {
    // Refresh the list without showing the main loading indicator
    fetchNotifications(false);
  };

  // --- Render Logic ---
  return (
    // Added flex flex-col h-full to ensure parent takes height
    <div className="flex flex-col flex-1 w-full h-full">
       {/* Main content area */}
       <div className={`flex flex-1 w-full h-full ${isMobile ? '' : 'gap-3 md:gap-4'}`}>
          {isMobile ? (
            // Mobile View: Show Cards OR Details
            <div className="w-full h-full">
              {!selectedNotification ? (
                <Cards
                  notifications={notifications}
                  isLoading={isLoading}
                  error={error}
                  selectedNotificationId={selectedNotification?.$id ?? null}
                  onSelectNotification={handleSelectNotification}
                  onRefresh={handleRefresh}
                  onAdd={handleOpenDrawer} // <-- Use handleOpenDrawer for onAdd
                />
              ) : (
                <Details
                  notification={selectedNotification}
                  isMobile={true}
                  onGoBack={handleDeselectNotification}
                />
              )}
            </div>
          ) : (
            // Desktop View: Show Cards AND Details (or placeholder)
            <> {/* Use Fragment to avoid extra div */}
              {/* Cards List Container */}
               <div className="w-1/3 lg:w-2/5 xl:w-1/3 h-full">
                 <Cards
                    notifications={notifications}
                    isLoading={isLoading}
                    error={error}
                    selectedNotificationId={selectedNotification?.$id ?? null}
                    onSelectNotification={handleSelectNotification}
                    onRefresh={handleRefresh}
                    onAdd={handleOpenDrawer} // <-- Use handleOpenDrawer for onAdd
                 />
              </div>

              {/* Details View Container */}
              <div className="flex-1 h-full">
                 {selectedNotification ? (
                    <Details
                        notification={selectedNotification}
                        isMobile={false}
                        onGoBack={() => {}} // No back button needed on desktop
                    />
                 ) : (
                    // Placeholder when no card is selected
                    <div className="flex items-center justify-center h-full bg-gray-100 rounded-xl shadow-md p-6">
                        <p className="text-gray-500 text-lg italic">
                            Select a notification from the list to view details.
                        </p>
                    </div>
                 )}
              </div>
            </>
          )}
        </div>

        {/* Drawer Component (Rendered outside the main layout flow) */}
        <AddNotificationDrawer
            isOpen={isDrawerOpen}
            onClose={handleCloseDrawer}
            onSaveSuccess={handleSaveSuccess} // Pass the refresh callback
        />
    </div>
  );
};

export default Notification;