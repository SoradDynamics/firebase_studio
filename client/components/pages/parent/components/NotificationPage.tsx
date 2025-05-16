// ~/parent/components/ParentNotificationPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNotificationContext } from '../../common/NotificationContext'; // Adjust path
import { NotifyDocument } from 'types/notification'; // Adjust path
import NotificationItem, { SenderRolesMap } from '../../common/NotificationItem'; // Adjust path
import { functions } from '~/utils/appwrite'; // Adjust path

// Ensure YOUR_FUNCTION_ID is set correctly in your .env or directly here
const SENDER_ROLE_FUNCTION_ID = import.meta.env.VITE_APPWRITE_SENDER_ROLE_FUNCTION_ID || 'YOUR_FUNCTION_ID';


const ParentNotificationPage = () => {
    const {
        notifications, // These are already filtered for the parent AND their children by NotificationContext
        loading: notificationsLoading,
        userLoading, // Loading state for user (parent) data itself
        error: notificationsError,
        fetchNotifications,
        currentUser, // current user (parent data)
        currentUserType
    } = useNotificationContext();

    const [senderRoles, setSenderRoles] = useState<SenderRolesMap>({});
    const [loadingRoles, setLoadingRoles] = useState<boolean>(false);

    // Memoize unique sender IDs that need role fetching
    const uniqueSenderIds = useMemo(() => {
        const ids = new Set<string>();
        notifications.forEach(n => {
            if (n.sender && typeof n.sender === 'string' && n.sender.trim() !== '' && senderRoles[n.sender] === undefined) {
                 if (!['system', 'admin'].includes(n.sender.toLowerCase())) { // Optional: exclude system IDs
                     ids.add(n.sender);
                 }
            }
        });
        return Array.from(ids);
    }, [notifications, senderRoles]);

    // Effect to fetch sender roles
    useEffect(() => {
        if (uniqueSenderIds.length === 0 || loadingRoles) {
            return;
        }

        const fetchRolesForIds = async () => {
            setLoadingRoles(true);
            if (SENDER_ROLE_FUNCTION_ID === 'YOUR_FUNCTION_ID') {
                 console.error("!!! ParentNotificationPage Error: Appwrite Function ID for sender roles not set. Replace 'YOUR_FUNCTION_ID' or set VITE_APPWRITE_SENDER_ROLE_FUNCTION_ID. !!!");
                 const failedRoles = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                 setSenderRoles((prevRoles: any) => ({ ...prevRoles, ...failedRoles }));
                 setLoadingRoles(false);
                 return;
            }

            try {
                const execution = await functions.createExecution(
                    SENDER_ROLE_FUNCTION_ID,
                    JSON.stringify({ senderIds: uniqueSenderIds }),
                    false // async = false (wait for sync execution)
                );

                 if (execution.status === 'completed') {
                    try {
                        const fetchedRoles: SenderRolesMap = JSON.parse(execution.responseBody);
                        setSenderRoles((prevRoles:any) => ({ ...prevRoles, ...fetchedRoles }));
                    } catch (parseError) {
                        console.error("Failed to parse sender role function response JSON:", execution.responseBody, parseError);
                        const failed = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                        setSenderRoles((prev:any) => ({ ...prev, ...failed }));
                    }
                 } else {
                     console.error(`Appwrite Function (Sender Roles) execution failed: ${execution.status}`, execution.logs, execution.errors);
                     const failed = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                     setSenderRoles((prev:any) => ({ ...prev, ...failed }));
                 }
            } catch (error) {
                console.error("Error calling cloud function for sender roles:", error);
                const failed = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                setSenderRoles((prev:any) => ({ ...prev, ...failed }));
            } finally {
                setLoadingRoles(false);
            }
        };

        fetchRolesForIds();
    }, [uniqueSenderIds, loadingRoles]);


    // Combined loading state
    const isLoading = notificationsLoading || userLoading || loadingRoles;

    return (
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden dark:bg-gray-800">
            <div className="flex justify-between items-center p-3 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">
                    {currentUserType === 'parent' ? "Parent Notifications" : "Notifications"}
                </h3>
                {isLoading && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">Loading...</span>
                )}
                <button
                    onClick={fetchNotifications}
                    disabled={isLoading}
                    className='text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed'
                    aria-label="Refresh notifications"
                >
                    Refresh
                </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
                {notificationsError && (
                    <p className="p-4 text-center text-red-500 text-sm">
                        Error: {notificationsError.message || "Failed to load notifications."}
                    </p>
                )}

                {!isLoading && !notificationsError && notifications.length === 0 && (
                    <p className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No new notifications.
                    </p>
                )}

                {!notificationsError && notifications.length > 0 && (
                    <div>
                        {notifications.map((notification:any) => (
                            <NotificationItem
                                key={notification.$id}
                                notification={notification}
                                senderRole={senderRoles[notification.sender]}
                            />
                        ))}
                    </div>
                )}
                 {isLoading && notifications.length === 0 && !notificationsError && ( // Show loading specifically when list is empty and loading
                     <p className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">Loading notifications...</p>
                 )}
            </div>
            {/* Optional Footer */}
            {/* <div className="p-2 text-center border-t border-gray-200 dark:border-gray-700">
                <a href="/all-parent-notifications" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    View all
                </a>
            </div> */}
        </div>
    );
};

export default ParentNotificationPage;