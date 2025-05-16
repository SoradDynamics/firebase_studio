// ~/teacher/components/TeacherNotificationPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNotificationContext } from '../../common/NotificationContext'; // Adjust path
// Ensure NotificationItem and its types are correctly imported
import NotificationItem, { SenderRolesMap } from '../../common/NotificationItem'; // Adjust path if NotificationItem is elsewhere
import { functions } from '~/utils/appwrite'; // Adjust path

const SENDER_ROLE_FUNCTION_ID = import.meta.env.VITE_APPWRITE_SENDER_ROLE_FUNCTION_ID || 'YOUR_FUNCTION_ID';

const TeacherNotificationPage = () => {
    const {
        notifications,
        loading: notificationsLoading,
        userLoading,
        error: notificationsError,
        fetchNotifications,
        currentUser, // current user (teacher data)
        currentUserType
    } = useNotificationContext();

    const [senderRoles, setSenderRoles] = useState<SenderRolesMap>({});
    const [loadingRoles, setLoadingRoles] = useState<boolean>(false);

    const uniqueSenderIds = useMemo(() => {
        const ids = new Set<string>();
        notifications.forEach(n => {
            if (n.sender && typeof n.sender === 'string' && n.sender.trim() !== '' && senderRoles[n.sender] === undefined) {
                 if (!['system', 'admin'].includes(n.sender.toLowerCase())) {
                     ids.add(n.sender);
                 }
            }
        });
        return Array.from(ids);
    }, [notifications, senderRoles]);

    useEffect(() => {
        if (uniqueSenderIds.length === 0 || loadingRoles) {
            return;
        }

        const fetchRolesForIds = async () => {
            setLoadingRoles(true);
            if (SENDER_ROLE_FUNCTION_ID === 'YOUR_FUNCTION_ID' || !SENDER_ROLE_FUNCTION_ID) {
                 console.error("TeacherNotificationPage Error: Appwrite Function ID for sender roles not set. Set VITE_APPWRITE_SENDER_ROLE_FUNCTION_ID.");
                 const failedRoles = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                 setSenderRoles((prevRoles: SenderRolesMap) => ({ ...prevRoles, ...failedRoles }));
                 setLoadingRoles(false);
                 return;
            }

            try {
                const execution = await functions.createExecution(
                    SENDER_ROLE_FUNCTION_ID,
                    JSON.stringify({ senderIds: uniqueSenderIds }),
                    false // async = false
                );

                 if (execution.status === 'completed') {
                    try {
                        const fetchedRoles: SenderRolesMap = JSON.parse(execution.responseBody);
                        setSenderRoles((prevRoles: SenderRolesMap) => ({ ...prevRoles, ...fetchedRoles }));
                    } catch (parseError) {
                        console.error("Failed to parse sender role function response JSON:", execution.responseBody, parseError);
                        const failed = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                        setSenderRoles((prev: SenderRolesMap) => ({ ...prev, ...failed }));
                    }
                 } else {
                     console.error(`Appwrite Function (Sender Roles) execution failed: ${execution.status}`, execution.logs || execution.errors);
                     const failed = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                     setSenderRoles((prev: SenderRolesMap) => ({ ...prev, ...failed }));
                 }
            } catch (error) {
                console.error("Error calling cloud function for sender roles:", error);
                const failed = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                setSenderRoles((prev: SenderRolesMap) => ({ ...prev, ...failed }));
            } finally {
                setLoadingRoles(false);
            }
        };

        fetchRolesForIds();
    }, [uniqueSenderIds, loadingRoles]); // Removed SENDER_ROLE_FUNCTION_ID from deps, it's a const

    const isLoading = notificationsLoading || userLoading || loadingRoles;

    // // Ensure this page only renders meaningful content if the user is a teacher
    // if (currentUserType !== 'teacher' && !userLoading) {
    //     // Optionally, redirect or show a message if a non-teacher tries to access this page directly
    //     // For now, it will just show "No new notifications" if currentUser is not a teacher because `notifications` will be empty.
    //     // A better approach for routing might be needed depending on your app structure.
    // }

    return (
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden dark:bg-gray-800">
            <div className="flex justify-between items-center p-3 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">
                    Teacher Notifications
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
                        {notifications.map((notification) => ( // Type is NotifyDocument from context
                            <NotificationItem
                                key={notification.$id}
                                notification={notification}
                                senderRole={senderRoles[notification.sender]}
                            />
                        ))}
                    </div>
                )}
                 {isLoading && notifications.length === 0 && !notificationsError && (
                     <p className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">Loading notifications...</p>
                 )}
            </div>
        </div>
    );
};

export default TeacherNotificationPage;