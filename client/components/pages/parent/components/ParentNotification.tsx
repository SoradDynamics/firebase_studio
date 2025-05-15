// client/components/pages/parent/components/ParentNotification.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNotificationContext } from '../../common/NotificationContext';
import { NotifyDocument } from 'types/notification';
import { formatDistanceToNow } from 'date-fns';
import { functions, account, databases, Query } from '~/utils/appwrite';
import { BellAlertIcon, EnvelopeIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const PARENT_COLLECTION_ID = 'coll-parent';
const NOTIFY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_NOTIFY_COLLECTION_ID;

// --- Helper Type for storing fetched roles ---
type SenderRolesMap = Record<string, string | null>;

// --- Notification Item Component ---
const NotificationItem: React.FC<{
    notification: NotifyDocument;
    senderRole: string | null | undefined;
}> = React.memo(({ notification, senderRole }) => {
    const timeAgo = formatDistanceToNow(new Date(notification.date), { addSuffix: true });
    const senderDisplay = senderRole === undefined ? 'Loading...' : senderRole || 'System/User';
    const IconComponent = notification.title.toLowerCase().includes('alert') ? BellAlertIcon : EnvelopeIcon;

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
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">{timeAgo}</p>
                </div>
            </div>
        </div>
    );
});

// --- Notification Page Component ---
const ParentNotification = () => {
    const [notifications, setNotifications] = useState<NotifyDocument[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [parentData, setParentData] = useState<any>(null);
    const [senderRoles, setSenderRoles] = useState<SenderRolesMap>({});
    const [loadingRoles, setLoadingRoles] = useState<boolean>(false);

    // --- Fetch Parent Data and Student IDs ---
    useEffect(() => {
        const fetchParentData = async () => {
            setLoading(true);
            setError(null);
            try {
                const user = await account.get();
                const email = user.email;

                const parentRes = await databases.listDocuments(
                    DATABASE_ID,
                    PARENT_COLLECTION_ID,
                    [Query.equal("email", email)]
                );

                if (parentRes.documents.length === 0) {
                    console.warn("No parent document found for this email.");
                    setError(new Error("No parent data found."));
                    setLoading(false);
                    return;
                }

                const parent = parentRes.documents[0];
                setParentData(parent);

            } catch (err: any) {
                console.error("Failed to fetch parent data:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchParentData();
    }, []);

    // --- Fetch notifications (MODIFIED QUERY) ---
    const fetchNotifications = useCallback(async () => {
        if (!DATABASE_ID || !NOTIFY_COLLECTION_ID) {
            console.error("Error: Database ID or Notify Collection ID missing from .env");
            setError(new Error("App configuration error."));
            setLoading(false);
            return;
        }

        if (!parentData) {
            console.log("ParentNotification: fetchNotifications - Waiting for parent data...");
            setLoading(true);
            return;
        }

        console.log("ParentNotification: Fetching initial notifications for parent:", parentData.$id);
        setLoading(true);
        setError(null);

        try {
            const nowISO = new Date().toISOString();
            const targetQueries: string[] = [];

            // 1. Add Parent ID to target queries
            targetQueries.push(`id:${parentData.$id}`);

            // 2. Add Student IDs to target queries
            if (parentData.students && parentData.students.length > 0) {
                parentData.students.forEach((studentId: string) => targetQueries.push(`id:${studentId}`));
            }

            const uniqueTargetQueries = [...new Set(targetQueries)];

            const queries = [
                Query.greaterThanEqual('valid', nowISO),
                Query.orderDesc('date'),
                Query.limit(50),
                Query.contains('to', uniqueTargetQueries)
            ];

            console.log("ParentNotification: Executing Queries:", queries);

            const response = await databases.listDocuments<NotifyDocument>(
                DATABASE_ID,
                NOTIFY_COLLECTION_ID,
                queries
            );

            console.log("ParentNotification: Raw fetched notifications:", response.documents);

            const relevantNotifications = response.documents.filter(doc =>
                isNotificationForUser(doc, parentData)
            );

            console.log("ParentNotification: Filtered relevant notifications:", relevantNotifications);

            relevantNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setNotifications(relevantNotifications);

        } catch (err: any) {
            console.error('ParentNotification: Failed to fetch notifications:', err);
            setError(err);
        } finally {
            console.log("ParentNotification: Fetch finished.");
            setLoading(false);
        }
    }, [parentData]);

    // --- Fetch on mount or when parentData becomes available ---
    useEffect(() => {
        if (parentData) {
            fetchNotifications();
        }
    }, [parentData, fetchNotifications]);

    // --- isNotificationForUser function ---
    const isNotificationForUser = (notification: NotifyDocument, parentData: any): boolean => {
        if (!parentData) return false;

        const now = new Date();
        const validUntil = new Date(notification.valid);
        if (now > validUntil) {
            return false;
        }

        if (!notification.to || notification.to.length === 0) {
            return false;
        }

        for (const target of notification.to) {
            const [key, value] = target.split(':', 2);

            switch (key) {
                case 'id':
                    if (value === parentData.$id || parentData.students.includes(value)) return true;
                    break;
                case 'role':
                    if (value.toLowerCase() === 'parent') return true;
                    break;
                default:
                    break;
            }
        }

        return false;
    };

    // Memoize the list of unique sender IDs that need their roles fetched.
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

    // Effect to trigger the Appwrite Cloud Function when new unique sender IDs are found.
    useEffect(() => {
        if (uniqueSenderIds.length === 0 || loadingRoles) {
            return;
        }

        const fetchRolesForIds = async () => {
            setLoadingRoles(true);

            try {
                const functionId = 'YOUR_FUNCTION_ID';
                if (functionId === 'YOUR_FUNCTION_ID') {
                    console.error("!!! Notification.tsx Error: Appwrite Function ID not set. Replace 'YOUR_FUNCTION_ID'. !!!");
                    const failedRoles = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                    setSenderRoles(prevRoles => ({ ...prevRoles, ...failedRoles }));
                    setLoadingRoles(false);
                    return;
                }

                const execution = await functions.createExecution(
                    functionId,
                    JSON.stringify({ senderIds: uniqueSenderIds }),
                    false
                );

                if (execution.status === 'completed') {
                    try {
                        const fetchedRoles: SenderRolesMap = JSON.parse(execution.responseBody);
                        setSenderRoles(prevRoles => ({ ...prevRoles, ...fetchedRoles }));
                    } catch (parseError) {
                        console.error("Failed to parse function response JSON:", execution.responseBody, parseError);
                        const failedRoles = uniqueSenderIds.reduce((acc, id) => { acc[id] = null; return acc; }, {} as SenderRolesMap);
                        setSenderRoles(prevRoles => ({ ...prevRoles, ...failedRoles }));
                    }
                } else {
                    console.error(`Appwrite Function execution failed with status: ${execution.status}`);
                    const failedRoles = uniqueSenderIds.reduce((acc, id) => {
                        acc[id] = null;
                        return acc;
                    }, {} as SenderRolesMap);
                    setSenderRoles(prevRoles => ({ ...prevRoles, ...failedRoles }));
                }

            } catch (error) {
                console.error("Error calling cloud function (functions.createExecution):", error);
                const failedRoles = uniqueSenderIds.reduce((acc, id) => {
                    acc[id] = null;
                    return acc;
                }, {} as SenderRolesMap);
                setSenderRoles(prevRoles => ({ ...prevRoles, ...failedRoles }));
            } finally {
                setLoadingRoles(false);
            }
        };

        fetchRolesForIds();

    }, [uniqueSenderIds, loadingRoles]);

    // --- Render the Notification Panel ---
    return (
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden dark:bg-gray-800">
            {/* Header Section */}
            <div className="flex justify-between items-center p-3 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Notifications</h3>
                {(loading || loadingRoles) && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">Loading...</span>
                )}
                <button
                    onClick={fetchNotifications}
                    disabled={loading || loadingRoles}
                    className='text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed'
                    aria-label="Refresh notifications"
                >
                    Refresh
                </button>
            </div>

            {/* List Area (Scrollable) */}
            <div className="max-h-80 overflow-y-auto">
                {error && (
                    <p className="p-4 text-center text-red-500 text-sm">
                        Error: {error.message || "Failed to load notifications."}
                    </p>
                )}

                {!loading && !error && notifications.length === 0 && (
                    <p className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No new notifications.</p>
                )}

                {!error && notifications.length > 0 && (
                    <div>
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.$id}
                                notification={notification}
                                senderRole={senderRoles[notification.sender]}
                            />
                        ))}
                    </div>
                )}
                {loading && notifications.length === 0 && (
                    <p className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">Loading notifications...</p>
                )}
            </div>
        </div>
    );
};

export default ParentNotification;
