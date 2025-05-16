// ~/teacher/components/TeacherNotificationPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNotificationContext } from '../../common/NotificationContext';
import NotificationItem, { SenderRolesMap } from '../../common/NotificationItem'; // Ensure this path is correct
import { functions } from '~/utils/appwrite';

const SENDER_ROLE_FUNCTION_ID = import.meta.env.VITE_APPWRITE_SENDER_ROLE_FUNCTION_ID || 'YOUR_FUNCTION_ID_HERE';

const TeacherNotificationPage = () => {
    const {
        notifications,
        loading: notificationsLoading, // Loading for notification list
        userLoading, // Loading for user data itself
        error: notificationsError,
        fetchNotifications,
        currentUserType
    } = useNotificationContext();

    const [senderRoles, setSenderRoles] = useState<SenderRolesMap>({});
    const [loadingRoles, setLoadingRoles] = useState<boolean>(false);

    const uniqueSenderIds = useMemo(() => {
        const ids = new Set<string>();
        notifications.forEach(n => {
            if (n.sender && typeof n.sender === 'string' && n.sender.trim() !== '' && !senderRoles.hasOwnProperty(n.sender)) {
                 if (!['system', 'admin'].includes(n.sender.toLowerCase())) ids.add(n.sender);
            }
        });
        return Array.from(ids);
    }, [notifications, senderRoles]);

    useEffect(() => {
        if (uniqueSenderIds.length === 0 || loadingRoles) return;

        const fetchRolesForIds = async () => {
            setLoadingRoles(true);
            if (SENDER_ROLE_FUNCTION_ID === 'YOUR_FUNCTION_ID_HERE') {
                 console.error("TeacherNotificationPage: Appwrite Function ID for sender roles not set!");
                 const failed = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                 setSenderRoles(prev => ({ ...prev, ...failed }));
                 setLoadingRoles(false);
                 return;
            }
            try {
                const execution = await functions.createExecution(
                    SENDER_ROLE_FUNCTION_ID, JSON.stringify({ senderIds: uniqueSenderIds }), false
                );
                 if (execution.status === 'completed') {
                    setSenderRoles(prev => ({ ...prev, ...JSON.parse(execution.responseBody) }));
                 } else {
                     console.error(`Sender Roles Function failed: ${execution.status}`);
                     const failed = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                     setSenderRoles(prev => ({ ...prev, ...failed }));
                 }
            } catch (error) {
                console.error("Error calling sender roles function:", error);
                const failed = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                setSenderRoles(prev => ({ ...prev, ...failed }));
            } finally { setLoadingRoles(false); }
        };
        fetchRolesForIds();
    }, [uniqueSenderIds, loadingRoles]);

    const isLoading = notificationsLoading || userLoading || loadingRoles;

    return (
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden dark:bg-gray-800">
            <div className="flex justify-between items-center p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">
                    {currentUserType === 'teacher' ? "Teacher Notifications" : "Notifications"}
                </h3>
                {isLoading && <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">Loading...</span>}
                <button
                    onClick={fetchNotifications} disabled={isLoading}
                    className='text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50'
                > Refresh </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
                {notificationsError && <p className="p-4 text-red-500">Error: {notificationsError.message}</p>}
                {!isLoading && !notificationsError && notifications.length === 0 && (
                    <p className="p-4 text-gray-500 dark:text-gray-400">No new notifications.</p>
                )}
                {!notificationsError && notifications.length > 0 && (
                    notifications.map(n => (
                        <NotificationItem key={n.$id} notification={n} senderRole={senderRoles[n.sender]} />
                    ))
                )}
                {isLoading && notifications.length === 0 && !notificationsError && (
                     <p className="p-4 text-gray-500 dark:text-gray-400">Loading notifications...</p>
                )}
            </div>
        </div>
    );
};
export default TeacherNotificationPage;