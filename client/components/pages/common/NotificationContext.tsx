// ~/context/NotificationContext.tsx
import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useCallback,
    ReactNode,
  } from 'react';
  import client, { databases, account, Query, iD } from '~/utils/appwrite'; // Import client for subscription
  import { Models } from 'appwrite';
  import { NotifyDocument, StudentData } from 'types/notification';
  import { useStudentData } from '../student/components/StudentContext';
  
  // Tauri Notification Imports
  import {
    isPermissionGranted,
    requestPermission,
    sendNotification as sendTauriNotification,
  } from '@tauri-apps/plugin-notification';
  
  // --- Appwrite Config from .env ---
  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const NOTIFY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_NOTIFY_COLLECTION_ID;
  // --- End Appwrite Config ---
  
  
  interface NotificationContextType {
    notifications: NotifyDocument[];
    loading: boolean;
    error: Error | null;
    fetchNotifications: () => Promise<void>;
    addNotification: (notification: NotifyDocument) => void;
    hasNotificationPermission: boolean;
  }
  
  const NotificationContext = createContext<NotificationContextType | undefined>(
    undefined
  );
  
  
  // --- Filtering Logic (No changes needed here) ---
  export const isNotificationForUser = (
    notification: NotifyDocument,
    userData: StudentData | null
  ): boolean => {
    if (!userData) return false;
  
    const now = new Date();
    const validUntil = new Date(notification.valid);
    if (now > validUntil) {
      return false;
    }
  
    if (!notification.to || notification.to.length === 0) {
       // Decide if empty 'to' means "for no one" or "for everyone"
       // Let's assume it needs *some* target to match anyone.
      return false;
    }
  
    // Check if *any* target in the 'to' array matches the user's criteria
    for (const target of notification.to) {
      const [key, value] = target.split(':', 2);
  
      switch (key) {
        case 'id':
          if (value === userData.id) return true;
          break;
        case 'role':
          // Handle 'all' or specific role match
          if (value.toLowerCase() === 'all' || (userData.labels && userData.labels.includes(value))) {
            return true;
          }
          break;
        case 'facultyId':
           if (value.toLowerCase() === 'all' || userData.facultyId === value) {
             return true;
           }
           break;
        case 'class':
           if (value.toLowerCase() === 'all' || userData.class === value) {
             return true;
           }
           break;
        case 'section':
           if (value.toLowerCase() === 'all' || userData.section === value) {
             return true;
           }
           break;
        default:
          // console.warn(`Unknown target key: ${key} in notification ${notification.$id}`);
          break;
      }
    }
  
    return false; // No target matched
  };
  
  
  export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
    children,
  }) => {
    const [notifications, setNotifications] = useState<NotifyDocument[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
    const { studentData, loading: studentLoading } = useStudentData();
  
    // --- Check/Request Tauri Notification Permission (No changes) ---
    useEffect(() => {
      const checkPermission = async () => {
        // If not running in tauri, these functions might not exist
       
        try {
          let permissionGranted = await isPermissionGranted();
          if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
          }
          setHasNotificationPermission(permissionGranted);
          // console.log('Tauri Notification Permission:', permissionGranted ? 'Granted' : 'Denied');
        } catch (err) {
          console.error('Error checking/requesting Tauri notification permission:', err);
          setHasNotificationPermission(false);
        }
      };
      checkPermission();
    }, []);
  
    // --- Add Notification & Trigger Tauri (No changes needed, filtering is correct) ---
     const addNotification = useCallback(async (newNotification: NotifyDocument) => {
        // Check validity FIRST - no point showing expired ones even from realtime
        const now = new Date();
        const validUntil = new Date(newNotification.valid);
        if (now > validUntil) {
           // console.log("Realtime: Ignoring expired notification:", newNotification.$id);
           return;
        }
  
        if (isNotificationForUser(newNotification, studentData)) {
            // console.log("Realtime: Notification is relevant, adding to list:", newNotification.$id);
            setNotifications((prevNotifications) => {
                const exists = prevNotifications.some(n => n.$id === newNotification.$id);
                if (exists) return prevNotifications; // Avoid duplicates from potential overlaps
                const updatedList = [newNotification, ...prevNotifications];
                updatedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                // Optional: Limit the number of notifications kept in state
                // if (updatedList.length > 50) updatedList.length = 50;
                return updatedList;
            });
  
            if (hasNotificationPermission) {
                // console.log("Realtime: Sending Tauri notification for:", newNotification.$id);
                try {
                    await sendTauriNotification({
                        title: newNotification.title || 'New Notification',
                        body: newNotification.msg,
                    });
                } catch (err: any) {
                    console.error("Failed to send Tauri notification:", err);
                }
            }
        } else {
          // console.log("Realtime: Notification is not relevant:", newNotification.$id);
        }
    }, [studentData, hasNotificationPermission]);
  
  
    // --- Fetch initial notifications (MODIFIED QUERY) ---
    const fetchNotifications = useCallback(async () => {
      // Ensure IDs are loaded from .env
      if (!DATABASE_ID || !NOTIFY_COLLECTION_ID) {
          console.error("Error: Database ID or Notify Collection ID missing from .env");
          setError(new Error("App configuration error."));
          setLoading(false);
          return;
      }
  
      if (!studentData || !studentData.id) {
         // console.log("NotificationProvider: fetchNotifications - Waiting for student data...");
         setLoading(studentLoading); // Reflect student data loading status
         if (!studentLoading) {
             // If student loading is finished but data is null (e.g., fetch failed)
             // console.log("NotificationProvider: fetchNotifications - Student loading finished, but no data.");
             setLoading(false);
         }
         return;
      }
  
      // console.log("NotificationProvider: Fetching initial notifications for user:", studentData.id);
      setLoading(true);
      setError(null);
  
      try {
          const nowISO = new Date().toISOString();
  
          // --- Build Queries using Query.contains ---
          const targetQueries: string[] = [];
  
          // 1. Specific User ID
          targetQueries.push(`id:${studentData.id}`);
  
          // 2. User Roles (Labels) + Role 'all'
          if (studentData.labels && studentData.labels.length > 0) {
              studentData.labels.forEach(label => targetQueries.push(`role:${label}`));
          }
          targetQueries.push('role:all');
  
          // 3. Class + Class 'all'
          if (studentData.class) {
              targetQueries.push(`class:${studentData.class}`);
          }
          targetQueries.push('class:all');
  
          // 4. Section + Section 'all'
          if (studentData.section) {
              targetQueries.push(`section:${studentData.section}`);
          }
          targetQueries.push('section:all');
  
          // 5. Faculty + Faculty 'all'
          if (studentData.facultyId) {
              targetQueries.push(`facultyId:${studentData.facultyId}`);
          }
          targetQueries.push('facultyId:all');
  
          // Remove duplicates just in case
          const uniqueTargetQueries = [...new Set(targetQueries)];
  
          // Build the actual Appwrite queries
          const queries = [
              Query.greaterThanEqual('valid', nowISO), // Filter expired
              Query.orderDesc('date'),
              Query.limit(50), // Limit initial load
              // Use Query.contains for each potential target string in the 'to' array
              // Appwrite treats multiple queries on the same attribute as OR
              Query.contains('to', uniqueTargetQueries)
          ];
          // --- End Query Build ---
  
          // console.log("NotificationProvider: Executing Queries:", queries);
  
          const response = await databases.listDocuments<NotifyDocument>(
              DATABASE_ID,
              NOTIFY_COLLECTION_ID,
              queries
          );
  
          // console.log("NotificationProvider: Raw fetched notifications:", response.documents);
  
          // Client-side filtering is STILL essential because Query.contains fetches if *any* target matches.
          // We need to ensure the *specific* notification's structure matches our rules.
          const relevantNotifications = response.documents.filter(doc =>
              isNotificationForUser(doc, studentData) // Use the precise filter here
          );
  
          // console.log("NotificationProvider: Filtered relevant notifications:", relevantNotifications);
  
          // Sort again just to be safe, though orderDesc should handle it
          relevantNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setNotifications(relevantNotifications);
  
      } catch (err: any) {
          console.error('NotificationProvider: Failed to fetch notifications:', err);
          // Provide a more user-friendly error message if it's the expected query error
          if (err.message && err.message.includes("Cannot query search")) {
               setError(new Error("Failed to query notifications. Check collection index configuration."));
          } else if (err.message && err.message.includes("index")) {
               setError(new Error("Database index missing or misconfigured for notifications."));
          }
          else {
               setError(err);
          }
      } finally {
          // console.log("NotificationProvider: Fetch finished.");
          setLoading(false);
      }
    }, [studentData, studentLoading]); // Depend on studentData and its loading state
  
    // --- Fetch on mount or when studentData becomes available (No changes) ---
    useEffect(() => {
      if (studentData) {
          fetchNotifications();
      } else {
        // Optional: if student data failed to load, ensure loading is false
         if(!studentLoading) {
             setLoading(false);
             // console.log("NotificationProvider: Student data not available after load, not fetching notifications.");
         }
      }
    }, [studentData, studentLoading, fetchNotifications]); // Added studentLoading
  
  
    // --- Setup Appwrite Realtime Subscription (MODIFIED: Use env vars) ---
    useEffect(() => {
      // Ensure IDs are loaded before subscribing
      if (!DATABASE_ID || !NOTIFY_COLLECTION_ID) {
          console.error("Cannot subscribe: Database ID or Notify Collection ID missing.");
          return;
      }
  
      // Do not subscribe until student data is available for filtering
      if (!studentData) {
          // console.log("NotificationProvider: Skipping subscription setup - No student data.");
          return;
      }
  
      // console.log("NotificationProvider: Setting up Appwrite subscription for notifications.");
      const channel = `databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents`;
      const unsubscribe = client.subscribe(channel, (response:any) => {
          // console.log("Realtime event received:", response.events, response.payload.$id);
  
          if (response.events.includes(`databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents.*.create`)) {
            // console.log("Realtime: Document create event detected");
            const newNotification = response.payload as NotifyDocument;
            // The addNotification function already includes the isNotificationForUser check
            addNotification(newNotification);
          }
          // Add handlers for update/delete if needed
          // if (response.events.includes(`...*.update`)) { ... fetchNotifications(); or update specific item }
          // if (response.events.includes(`...*.delete`)) { ... remove specific item from state }
        }
      );
  
      // console.log("NotificationProvider: Appwrite subscription established for channel:", channel);
  
      return () => {
        // console.log("NotificationProvider: Cleaning up Appwrite subscription.");
        unsubscribe();
      };
    }, [studentData, addNotification]); // Re-subscribe if studentData changes (e.g., login/logout) or addNotification changes
  
  
    return (
      <NotificationContext.Provider
        value={{ notifications, loading, error, fetchNotifications, addNotification, hasNotificationPermission }}
      >
        {children}
      </NotificationContext.Provider>
    );
  };
  
  // --- useNotificationContext Hook (No changes) ---
  export const useNotificationContext = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
      throw new Error(
        'useNotificationContext must be used within a NotificationProvider'
      );
    }
    return context;
  };
