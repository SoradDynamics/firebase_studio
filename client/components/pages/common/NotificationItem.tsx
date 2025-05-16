// ~/common/components/NotificationItem.tsx
import React from 'react';
import { NotifyDocument } from 'types/notification'; // Adjust path as needed
import { formatDistanceToNow } from 'date-fns';
import { BellAlertIcon, EnvelopeIcon, UserCircleIcon } from '@heroicons/react/24/outline';

// Helper Type for storing fetched roles (can be here or in a types file if used elsewhere)
export type SenderRolesMap = Record<string, string | null>; // Maps: userId -> roleName or null

const NotificationItem: React.FC<{
    notification: NotifyDocument;
    senderRole: string | null | undefined; // undefined = loading, null = not found/error, string = role
}> = React.memo(({ notification, senderRole }) => {
    const timeAgo = formatDistanceToNow(new Date(notification.date), { addSuffix: true });

    const senderDisplay = senderRole === undefined
        ? 'Loading...'
        : senderRole || 'System/User'; // Use fetched role or fallback if null/empty

    const IconComponent = notification.title.toLowerCase().includes('alert')
        ? BellAlertIcon
        : notification.title.toLowerCase().includes('message') // Example: different icon for messages
        ? EnvelopeIcon
        : UserCircleIcon; // Default or another type

    return (
        <div className="flex items-start p-3 border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 transition duration-150 ease-in-out space-x-3">
            <div className="flex-shrink-0 pt-1">
                 <IconComponent className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{notification.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 break-words">{notification.msg}</p>
                <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        From: <span className="font-medium">{senderDisplay}</span>
                         {/* {senderRole === null && ` (${notification.sender})`} */}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">{timeAgo}</p>
                </div>
            </div>
        </div>
    );
});

export default NotificationItem;