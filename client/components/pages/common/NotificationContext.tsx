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
    userData: any,
    studentIds?: string[]
  ): boolean => {
    if (!userData) return false;

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
          if (userData.$id === value) return true; // Match the parent's ID
          if (studentIds && studentIds.includes(value)) return true; // Match any of the student IDs
          break;
        case 'role':
          if (value.toLowerCase() === 'parent') return true; // Match the parent role
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
          break;
      }
    }

    return false;
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
        try {
          let permissionGranted = await isPermissionGranted();
          if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
          }
          setHasNotificationPermission(permissionGranted);
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
           return;
        }
  
        if (isNotificationForUser(newNotification, studentData)) {
            setNotifications((prevNotifications) => {
                const exists = prevNotifications.some(n => n.$id === newNotification.$id);
                if (exists) return prevNotifications;
                const updatedList = [newNotification, ...prevNotifications];
                updatedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                return updatedList;
            });
  
            if (hasNotificationPermission) {
                try {
                    await sendTauriNotification({
                        title: newNotification.title || 'New Notification',
                        body: newNotification.msg,
                    });
                } catch (err: any) {
                    console.error("Failed to send Tauri notification:", err);
                }
            }
        }
    }, [studentData, hasNotificationPermission]);
  
  
    // --- Fetch initial notifications (MODIFIED QUERY) ---
    const fetchNotifications = useCallback(async () => {
      if (!DATABASE_ID || !NOTIFY_COLLECTION_ID) {
          console.error("Error: Database ID or Notify Collection ID missing from .env");
          setError(new Error("App configuration error."));
          setLoading(false);
          return;
      }
  
      if (!studentData || !studentData.id) {
         setLoading(studentLoading);
         if (!studentLoading) {
             setLoading(false);
         }
         return;
      }
  
      setLoading(true);
      setError(null);
  
      try {
          const nowISO = new Date().toISOString();
          const targetQueries: string[] = [];
  
          targetQueries.push(`id:${studentData.id}`);
  
          if (studentData.labels && studentData.labels.length > 0) {
              studentData.labels.forEach(label => targetQueries.push(`role:${label}`));
          }
          targetQueries.push('role:all');
  
          if (studentData.facultyId) {
              targetQueries.push(`facultyId:${studentData.facultyId}`);
          }
          targetQueries.push('facultyId:all');
  
          if (studentData.class) {
              targetQueries.push(`class:${studentData.class}`);
          }
          targetQueries.push('class:all');
  
          if (studentData.section) {
              targetQueries.push(`section:${studentData.section}`);
          }
          targetQueries.push('section:all');
  
          const uniqueTargetQueries = [...new Set(targetQueries)];
  
          const queries = [
              Query.greaterThanEqual('valid', nowISO),
              Query.orderDesc('date'),
              Query.limit(50),
              Query.contains('to', uniqueTargetQueries)
          ];
  
          const response = await databases.listDocuments<NotifyDocument>(
              DATABASE_ID,
              NOTIFY_COLLECTION_ID,
              queries
          );
  
          const relevantNotifications = response.documents.filter(doc =>
              isNotificationForUser(doc, studentData)
          );
  
          relevantNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setNotifications(relevantNotifications);
  
      } catch (err: any) {
          console.error('NotificationProvider: Failed to fetch notifications:', err);
          if (err.message && err.message.includes("Cannot query search")) {
               setError(new Error("Failed to query notifications. Check collection index configuration."));
          } else if (err.message && err.message.includes("index")) {
               setError(new Error("Database index missing or misconfigured for notifications."));
          }
          else {
               setError(err);
          }
      } finally {
          setLoading(false);
      }
    }, [studentData, studentLoading]);
  
    useEffect(() => {
      if (studentData) {
          fetchNotifications();
      } else {
         if(!studentLoading) {
             setLoading(false);
         }
      }
    }, [studentData, studentLoading, fetchNotifications]);
  
  
    useEffect(() => {
      if (!DATABASE_ID || !NOTIFY_COLLECTION_ID) {
          console.error("Cannot subscribe: Database ID or Notify Collection ID missing.");
          return;
      }
  
      if (!studentData) {
          return;
      }
  
      const channel = `databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents`;
      const unsubscribe = client.subscribe(channel, (response:any) => {
  
          if (response.events.includes(`databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents.*.create`)) {
            const newNotification = response.payload as NotifyDocument;
            addNotification(newNotification);
          }
        }
      );
  
      return () => {
        unsubscribe();
      };
    }, [studentData, addNotification]);
  
  
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
