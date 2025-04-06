// src/components/NotificationCenter.tsx

import React from 'react';
import { useNotifications } from './context/NotificationContext'; // Adjust path

// Removed Button import as it's no longer used here

export const NotificationCenter: React.FC = () => {
  // Consume context
  const { notifications, isLoading, error /* removed markAllAsRead, unreadCount */ } = useNotifications();

  // Sort notifications by timestamp descending for display
  const sortedNotifications = React.useMemo(() => {
     return [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications]);


  return (
    <div className="max-h-[70vh] flex flex-col bg-white rounded-md shadow-lg border border-gray-200">
       {/* Header - Removed the Button */}
       <div className="p-3 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
           <h3 className="text-lg font-semibold text-gray-700">Notifications</h3>
           {/* Mark all read button removed */}
       </div>

      {/* List */}
      <div className="flex-grow overflow-y-auto p-2">
        {isLoading ? (
          <p className="text-center text-gray-500 py-4">Loading...</p>
        ) : error ? (
          <p className="text-center text-red-600 bg-red-100 p-3 rounded-md mx-2 my-2">{error}</p>
        ) : sortedNotifications.length === 0 ? (
          <p className="text-center text-gray-500 py-6">No notifications ✅</p>
        ) : (
          <ul className="space-y-2">
            {sortedNotifications.map((notification) => (
              <li
                key={notification.id}
                className={`p-3 rounded-md border transition-opacity duration-200 ${
                    notification.type === 'absence' ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-white border-gray-200 hover:bg-gray-50'
                } ${!notification.isRead ? 'opacity-100' : 'opacity-70'}`}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <span className={`flex-grow text-sm font-medium ${
                      notification.type === 'absence' ? 'text-red-800' : 'text-blue-800'
                      } ${!notification.isRead ? 'font-bold' : ''}`
                  }>
                    {/* Display title based on whether it's new or history */}
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
      </div>
       {/* Footer */}
       <div className="p-2 border-t border-gray-100 text-center sticky bottom-0 bg-white z-10">
           <span className="text-xs text-gray-500">End of notifications</span>
       </div>
    </div>
  );
};