// ~/components/Notification.tsx (Ensure this file path is correct)

import React, { useState, useEffect, useMemo } from 'react';
import { useNotificationContext } from '../../common/NotificationContext'; // Adjust path if needed
import { NotifyDocument } from 'types/notification'; // Adjust path if needed
import { formatDistanceToNow } from 'date-fns';
import { functions } from '~/utils/appwrite'; // Adjust path - ensure 'functions' is exported from appwrite.ts
import { BellAlertIcon, EnvelopeIcon, UserCircleIcon } from '@heroicons/react/24/outline'; // Example icons

// --- Helper Type for storing fetched roles ---
type SenderRolesMap = Record<string, string | null>; // Maps: userId -> roleName or null (if fetch failed/no role)

// --- Notification Item Component ---
// Renders a single notification item. Receives the fetched sender role as a prop.
const NotificationItem: React.FC<{
    notification: NotifyDocument;
    senderRole: string | null | undefined; // undefined = loading, null = not found/error, string = role
}> = React.memo(({ notification, senderRole }) => { // Memoize to prevent re-renders if props don't change
    const timeAgo = formatDistanceToNow(new Date(notification.date), { addSuffix: true });

    // Determine display text for the sender based on the fetched role prop
    const senderDisplay = senderRole === undefined // Still loading?
        ? 'Loading...'
        : senderRole || 'System/User'; // Use fetched role or fallback if null/empty

    // Choose an icon (example based on title content)
    const IconComponent = notification.title.toLowerCase().includes('alert')
        ? BellAlertIcon
        : EnvelopeIcon;

    // console.log(`Rendering NotificationItem: ${notification.$id}, Role: ${senderRole}`); // For debugging re-renders

    return (
        <div className="flex items-start p-3 border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 transition duration-150 ease-in-out space-x-3">
            {/* Icon Column */}
            <div className="flex-shrink-0 pt-1">
                 <IconComponent className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            {/* Content Column */}
            <div className="flex-1 min-w-0"> {/* Added min-w-0 for better text wrapping */}
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{notification.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 break-words">{notification.msg}</p> {/* Added break-words */}
                <div className="flex justify-between items-center mt-2">
                    {/* Sender Info */}
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate"> {/* Added truncate */}
                        From: <span className="font-medium">{senderDisplay}</span>
                         {/* Optional: Show sender ID if debugging or role lookup fails */}
                         {/* {senderRole === null && ` (${notification.sender})`} */}
                    </p>
                    {/* Time Info */}
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">{timeAgo}</p> {/* Added margin */}
                </div>
            </div>
        </div>
    );
});


// --- Notification Page Component ---
// Main component that fetches notifications via context and manages fetching sender roles.
const NotificationPage = () => {
    // Get notification data from context
    const {
        notifications,
        loading: notificationsLoading,
        error: notificationsError,
        fetchNotifications // Function to manually refresh notifications
    } = useNotificationContext();

    // State for storing fetched sender roles (userId -> roleName)
    const [senderRoles, setSenderRoles] = useState<SenderRolesMap>({});
    // State to track if roles are currently being fetched via the function
    const [loadingRoles, setLoadingRoles] = useState<boolean>(false);

    // Memoize the list of unique sender IDs that need their roles fetched.
    // This avoids redundant calculations and prevents re-fetching roles already loaded.
    const uniqueSenderIds = useMemo(() => {
        const ids = new Set<string>();
        notifications.forEach(n => {
            // Check if sender ID is valid and role is not already fetched/failed
            if (n.sender && typeof n.sender === 'string' && n.sender.trim() !== '' && senderRoles[n.sender] === undefined) {
                 // Optional: Exclude known system/non-user IDs if needed
                 if (!['system', 'admin'].includes(n.sender.toLowerCase())) {
                     ids.add(n.sender);
                 }
            }
        });
        // console.log("Memoized Sender IDs needing fetch:", Array.from(ids)); // Debugging
        return Array.from(ids);
    }, [notifications, senderRoles]); // Recompute only when notifications list or fetched roles state changes


    // Effect to trigger the Appwrite Cloud Function when new unique sender IDs are found.
    useEffect(() => {
        // Don't run if there are no new IDs or if already loading roles
        if (uniqueSenderIds.length === 0 || loadingRoles) {
            return;
        }

        const fetchRolesForIds = async () => {
            setLoadingRoles(true); // Indicate role fetching started
            // console.log("Calling Cloud Function for sender IDs:", uniqueSenderIds);

            try {
                // *** Replace 'YOUR_FUNCTION_ID' with the Function ID from your Appwrite Console ***
                const functionId = 'YOUR_FUNCTION_ID'; // <--- IMPORTANT: SET YOUR FUNCTION ID HERE
                if (functionId === 'YOUR_FUNCTION_ID') {
                     console.error("!!! Notification.tsx Error: Appwrite Function ID not set. Replace 'YOUR_FUNCTION_ID'. !!!");
                     // Mark these IDs as failed to prevent retry loop
                     const failedRoles = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                     setSenderRoles(prevRoles => ({ ...prevRoles, ...failedRoles }));
                     setLoadingRoles(false);
                     return;
                }

                // Execute the cloud function, passing the IDs in the body
                const execution = await functions.createExecution(
                    functionId,
                    JSON.stringify({ senderIds: uniqueSenderIds }), // Body must be a string
                    false // Wait for sync execution (async = false)
                    // method defaults to POST when body is present
                );

                 // Check the execution status returned by Appwrite
                 if (execution.status === 'completed') {
                    // Try parsing the response body, expecting a JSON map
                    try {
                        const fetchedRoles: SenderRolesMap = JSON.parse(execution.responseBody);
                        // console.log("Fetched roles successfully:", fetchedRoles);
                        // Update the state, merging new roles with any previously fetched
                        setSenderRoles(prevRoles => ({ ...prevRoles, ...fetchedRoles }));
                    } catch (parseError) {
                        console.error("Failed to parse function response JSON:", execution.responseBody, parseError);
                        // Mark these IDs as failed if response is malformed
                         const failedRoles = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                         setSenderRoles(prevRoles => ({ ...prevRoles, ...failedRoles }));
                    }
                 } else {
                     // Handle 'failed' status from the function execution
                     console.error(`Appwrite Function execution failed with status: ${execution.status}`);
                     console.error("Function Logs:", execution.logs); // Combined stdout/stderr from function
                     console.error("Function Errors:", execution.errors); // Specific errors reported by function runtime
                     console.error("Function Response Status Code:", execution.responseStatusCode); // HTTP status if function returned response on fail
                     console.error("Function Response Body:", execution.responseBody); // Body if function returned response on fail

                     // Mark these IDs as failed (null) in state to prevent immediate retry
                     const failedRoles = uniqueSenderIds.reduce((acc, id) => {
                         acc[id] = null; // Indicate lookup failure for these IDs
                         return acc;
                     }, {} as SenderRolesMap);
                     setSenderRoles(prevRoles => ({ ...prevRoles, ...failedRoles }));
                 }

            } catch (error) {
                // Handle network errors or errors calling the function itself
                console.error("Error calling cloud function (functions.createExecution):", error);
                 // Mark these IDs as failed (null) on network/API call error
                 const failedRoles = uniqueSenderIds.reduce((acc, id) => {
                    acc[id] = null;
                    return acc;
                 }, {} as SenderRolesMap);
                 setSenderRoles(prevRoles => ({ ...prevRoles, ...failedRoles }));
            } finally {
                // Ensure loading state is turned off regardless of success/failure
                setLoadingRoles(false);
            }
        };

        fetchRolesForIds(); // Execute the async function

    }, [uniqueSenderIds, loadingRoles]); // Effect dependencies


    // --- Render the Notification Panel ---
    return (
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden dark:bg-gray-800">
            {/* Header Section */}
             <div className="flex justify-between items-center p-3 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Notifications</h3>
                {/* Show a combined loading indicator */}
                {(notificationsLoading || loadingRoles) && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">Loading...</span>
                )}
                {/* Refresh Button */}
                <button
                    onClick={fetchNotifications} // Trigger notification refetch from context
                    disabled={notificationsLoading || loadingRoles} // Disable if loading anything
                    className='text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed'
                    aria-label="Refresh notifications"
                >
                    Refresh
                </button>
            </div>

            {/* List Area (Scrollable) */}
            <div className="max-h-80 overflow-y-auto">
                {/* Display Error from Notification Context */}
                {notificationsError && (
                    <p className="p-4 text-center text-red-500 text-sm">
                        Error: {notificationsError.message || "Failed to load notifications."}
                    </p>
                )}

                {/* Display Empty State (only if not loading and no errors) */}
                {!notificationsLoading && !notificationsError && notifications.length === 0 && (
                    <p className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No new notifications.</p>
                )}

                {/* Render Notification List (if not loading and no errors) */}
                {!notificationsError && notifications.length > 0 && (
                    <div>
                        {notifications.map((notification) => (
                            // Pass the fetched role from the 'senderRoles' state map
                            <NotificationItem
                                key={notification.$id}
                                notification={notification}
                                // Look up role; will be undefined if still loading, null if failed, or string if succeeded
                                senderRole={senderRoles[notification.sender]}
                            />
                        ))}
                        {/* Optional: Add padding at the bottom if list is long */}
                        {/* <div className="h-2"></div> */}
                    </div>
                )}
                 {/* Display Loading state specifically when list is empty */}
                 {notificationsLoading && notifications.length === 0 && (
                     <p className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">Loading notifications...</p>
                 )}
            </div>

             {/* Optional Footer */}
            {/* <div className="p-2 text-center border-t border-gray-200 dark:border-gray-700">
                <a href="/all-notifications" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    View all notifications
                </a>
            </div> */}
        </div>
    );
};

export default NotificationPage;