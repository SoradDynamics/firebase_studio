import React, { useState, useMemo } from 'react';
// Adjust imports based on your actual HeroUI setup
import { Button, Input, Spinner } from '@heroui/react';
import { PlusIcon, ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { AppwriteNotification } from 'types/notification'; // Adjust path as needed
import ActionButton from '../../../../common/ActionButton';
import { FaPlus } from 'react-icons/fa6';

interface CardsProps {
  notifications: AppwriteNotification[];
  isLoading: boolean;
  error: string | null;
  selectedNotificationId: string | null;
  onSelectNotification: (notification: AppwriteNotification) => void;
  onRefresh: () => void; // Callback for refresh button
  onAdd: () => void;     // Callback for add button
}

const Cards: React.FC<CardsProps> = ({
  notifications,
  isLoading,
  error,
  selectedNotificationId,
  onSelectNotification,
  onRefresh, // Received from parent
  onAdd,     // Received from parent
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter notifications based on search term
  const filteredNotifications = useMemo(() => {
    if (!searchTerm.trim()) {
      return notifications;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(lowerSearchTerm) ||
        n.msg.toLowerCase().includes(lowerSearchTerm) ||
        (n.sender && n.sender.toLowerCase().includes(lowerSearchTerm)) // Check sender if it exists
    );
  }, [notifications, searchTerm]);

   // Helper to format date for display on the card
   const formatCardDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch (e) { return 'Invalid Date'; }
   };

  return (
    // Main container for the Cards component, flex column layout
    <div className="flex flex-col h-full bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">

      {/* ================================================================== */}
      {/* == Top Bar Section (Add Button, Search, Refresh) - INSIDE Cards.tsx == */}
      {/* ================================================================== */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between gap-3 f bg-gray-50">
        {/* Add New Button */}
        <ActionButton
          icon={
            <FaPlus className="w-4 h-4 text-gray-100 transition duration-200" />
          }
          // onClick={handleAdd}
          onClick={onAdd} // Calls the handler passed from parent
          color="orange"
          aria-label="Add Faculty"
        />
        
        {/* Search Input */}
        <div className="">
             {/* Use HeroUI Input if available */}
             <Input
                placeholder="Search title, message..."
                startContent={<MagnifyingGlassIcon className="w-5 h-5 m text-gray-400" />}
                value={searchTerm}
                size='md'
                variant='bordered'
                onValueChange={setSearchTerm} // Check correct prop for HeroUI
                // onChange={(e) => setSearchTerm(e.target.value)} // Fallback
                className=" max-w-3xl" // Ensure it takes available space
             />
           {/* Fallback standard input if HeroUI Input isn't suitable/available
           <div className="relative">
             <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
             </span>
             <input
               type="search"
               placeholder="Search title, message..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
             />
           </div>
           */}
        </div>

        {/* Refresh Button */}
        <Button
          isIconOnly // Assuming HeroUI supports this for icon-only buttons
          variant="light"
          onPress={onRefresh} // Calls the handler passed from parent
          disabled={isLoading} // Disable while loading
          aria-label="Refresh Notifications"
          className=""
        >
          <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
        </Button>
      </div>
      {/* ================================================================== */}
      {/* == End of Top Bar Section                                          == */}
      {/* ================================================================== */}


      {/* Cards List Area with Scrollbar */}
      <div className="flex-1 overflow-hidden"> {/* This container allows PerfectScrollbar to work correctly */}
        <PerfectScrollbar options={{ suppressScrollX: true }} className="h-full">
          {/* Loading State */}
          {isLoading && <div className="p-6 text-center text-gray-500">
            <Spinner color="primary" size="lg" label="Loading Notifications..." />
            </div>}

          {/* Error State */}
          {error && <div className="p-6 text-center text-red-600">Error: {error}</div>}

          {/* Empty State (No Errors, Not Loading) */}
          {!isLoading && !error && filteredNotifications.length === 0 && (
            <div className="p-6 text-center text-gray-500 italic">
              {searchTerm ? 'No notifications match your search.' : 'No notifications found.'}
            </div>
          )}

          {/* Notification Cards List */}
          {!isLoading && !error && filteredNotifications.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <li
                  key={notification.$id}
                  onClick={() => onSelectNotification(notification)}
                  className={`block p-3 cursor-pointer transition-colors duration-150 ease-in-out ${
                    notification.$id === selectedNotificationId
                      ? 'bg-blue-100 hover:bg-blue-200' // Highlight selected
                      : 'hover:bg-gray-50' // Hover effect for others
                  }`}
                  role="button" // Semantics for clickable item
                  tabIndex={0} // Make focusable
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectNotification(notification)} // Keyboard accessibility
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-semibold text-sm text-gray-800 truncate pr-1">
                        {notification.title || 'Untitled Notification'}
                    </h4>
                     <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                        {formatCardDate(notification.date)}
                     </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2"> {/* Preview message */}
                    {notification.msg}
                  </p>
                   {/* Optional: Display sender */}
                   {/* <p className="text-xs text-gray-500 mt-1">
                      From: <span className="font-medium">{notification.sender || 'System'}</span>
                   </p> */}
                </li>
              ))}
            </ul>
          )}
        </PerfectScrollbar>
      </div> {/* End scrollable area */}

    </div> // End main container
  );
};

export default Cards;