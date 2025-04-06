// src/context/NotificationContext.tsx

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Client, Account, Databases, Models, Query } from "appwrite";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

// --- Appwrite Config --- (Same)
const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);
const account = new Account(client);
const databases = new Databases(client);
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const studentCollectionId = "coll-student";

// --- Type Definitions --- (Same)
type StudentDoc = Models.Document & {
  name: string;
  class: string;
  section: string;
  stdEmail: string;
  parentId: string;
  absent: string[];
};

interface NotificationItem {
  id: string;
  type: 'absence' | 'announcement' | 'message' | 'assignment' | 'other';
  title: string;
  body: string;
  timestamp: string;
  relatedDocId?: string;
  isRead: boolean;
  date?: string;
  data?: any;
}

// --- Context Definition --- (Same)
interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// --- Notification Provider Component ---
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeFunctionsRef = useRef<(() => void)[]>([]);

  // --- Desktop Notification Function --- (Same)
  const showDesktopNotification = useCallback(async (title: string, body: string) => {
    try {
        let granted = await isPermissionGranted();
        if (!granted) {
          const permission = await requestPermission();
          granted = permission === "granted";
        }
        if (granted) {
          await sendNotification({ title, body });
        } else {
          console.warn("Desktop notification permission not granted.");
        }
      } catch (err) {
        console.error("Error sending desktop notification:", err);
      }
  }, []);

  // --- Mark as Read Functions --- (Same)
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
        if (prev.some(n => !n.isRead)) {
            return prev.map((n) => ({ ...n, isRead: true }));
        }
        return prev;
    });
  }, []);

  // --- Data Processing and Subscription Setup ---

  // Initial load - populates history
  const populateInitialAbsences = useCallback((studentDoc: StudentDoc) => {
    // --- UPDATE: Include student name in history body ---
    const studentName = studentDoc.name || "Student"; // Fallback name
    const initialAbsenceNotifications: NotificationItem[] = (studentDoc.absent || []).map(date => ({
      id: `absence-${studentDoc.$id}-${date}`,
      type: 'absence',
      title: 'Absence Recorded (History)',
      // Use studentName here
      body: `${studentName} was marked absent on ${date}.`,
      timestamp: studentDoc.$updatedAt,
      relatedDocId: studentDoc.$id,
      isRead: true,
      date: date,
    }));

    setNotifications(prev => [
        ...initialAbsenceNotifications,
        ...prev.filter(n => n.type !== 'absence' || !n.id.startsWith(`absence-${studentDoc.$id}`))
    ]);
  }, []);


  // Subscription handler - Handles live updates
  const setupStudentSubscriptions = useCallback(async (studentDoc: StudentDoc) => {
    const studentDocId = studentDoc.$id;
    const desktopNotifiedKey = `desktop_notified_absences_${studentDocId}`;
    const subscriptionString = `databases.${databaseId}.collections.${studentCollectionId}.documents.${studentDocId}`;

    try {
      const unsubscribe = client.subscribe(subscriptionString, response => {
        if (response.events.some(e => e.includes('.update'))) {
          const updatedStudent = response.payload as StudentDoc;
          const currentDbAbsenceDates = updatedStudent.absent || [];
          // --- UPDATE: Get student name for notification messages ---
          const studentName = updatedStudent.name || "Student"; // Fallback name

          let datesAlreadyInUiState = new Set<string>();
          setNotifications(prev => {
            datesAlreadyInUiState = new Set(
                prev.filter(n => n.type === 'absence' && n.date).map(n => n.date!)
            );

            const newDatesForUi = currentDbAbsenceDates.filter(
                date => !datesAlreadyInUiState.has(date)
            );

            if (newDatesForUi.length > 0) {
              const newNotificationItems: NotificationItem[] = [];
              const desktopNotifiedDates: string[] = JSON.parse(localStorage.getItem(desktopNotifiedKey) || "[]");

              newDatesForUi.forEach(date => {
                const notificationId = `absence-${updatedStudent.$id}-${date}-${Date.now()}`;
                const newItem: NotificationItem = {
                  id: notificationId,
                  type: 'absence',
                  title: '🚨 New Absence Alert',
                   // --- UPDATE: Use studentName in body ---
                  body: `${studentName} was marked absent on ${date}`,
                  timestamp: new Date().toISOString(),
                  relatedDocId: updatedStudent.$id,
                  isRead: false,
                  date: date,
                };
                newNotificationItems.push(newItem);

                if (!desktopNotifiedDates.includes(date)) {
                   // --- UPDATE: Pass correct body to desktop notification ---
                  showDesktopNotification(newItem.title, newItem.body);
                }
              });

              localStorage.setItem(desktopNotifiedKey, JSON.stringify(currentDbAbsenceDates));
              return [...newNotificationItems, ...prev];

            } else {
                 const desktopNotifiedDates: string[] = JSON.parse(localStorage.getItem(desktopNotifiedKey) || "[]");
                 if (JSON.stringify(currentDbAbsenceDates) !== JSON.stringify(desktopNotifiedDates)) {
                     localStorage.setItem(desktopNotifiedKey, JSON.stringify(currentDbAbsenceDates));
                 }
            }
            return prev;
          });
        }
      });
      unsubscribeFunctionsRef.current.push(unsubscribe);
    } catch (subError) {
      console.error(`Failed to subscribe to ${subscriptionString}:`, subError);
      setError(`Subscription failed for student ${studentDoc.name || studentDocId}`); // Also use name in error
    }
  }, [showDesktopNotification]); // Keep dependencies


  // --- Main Effect for Initialization --- (Same, ensure cleanup)
  useEffect(() => {
    // ... (Initialization logic remains the same) ...
     let isMounted = true; // Track mount status for async operations

    const initializeAndSubscribe = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);
      setNotifications([]);

      unsubscribeFunctionsRef.current.forEach(unsub => {
          try { unsub(); } catch (e) { console.error("Unsubscribe error during init cleanup", e); }
      });
      unsubscribeFunctionsRef.current = [];

      try {
        const user = await account.get();
        if (!isMounted) return;

        const studentRes = await databases.listDocuments<StudentDoc>(databaseId, studentCollectionId, [Query.equal("stdEmail", user.email), Query.limit(1)]);
        if (!isMounted) return;

        if (studentRes.documents.length > 0) {
          const studentDoc = studentRes.documents[0];
          populateInitialAbsences(studentDoc);
          await setupStudentSubscriptions(studentDoc);
        } else {
          console.warn("User role not determined (student only checked).");
        }

      } catch (err: any) {
         if (isMounted && err.code !== 401) {
            console.error("Initialization Error:", err);
            setError(`Failed to initialize notifications: ${err.message || 'Unknown error'}`);
         }
      } finally {
           if (isMounted) setIsLoading(false);
      }
    };

    initializeAndSubscribe();

    return () => {
      isMounted = false;
      console.log("Cleaning up notification subscriptions on unmount...");
      unsubscribeFunctionsRef.current.forEach(unsub => {
        try { unsub(); } catch (e) { console.error("Unsubscribe error on unmount", e); }
      });
      unsubscribeFunctionsRef.current = [];
    };
  }, [setupStudentSubscriptions, populateInitialAbsences]); // Dependencies


  // Calculate unread count (Same)
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Context Value (Same)
  const value = useMemo(() => ({
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead
  }), [notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// --- Custom Hook --- (Same)
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};