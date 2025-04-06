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
  
  // --- Appwrite Config ---
  const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);
  const account = new Account(client);
  const databases = new Databases(client);
  const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const studentCollectionId = "coll-student";
  const parentCollectionId = "coll-parent"; // Added Parent Collection ID
  
  // --- Type Definitions ---
  type StudentDoc = Models.Document & {
    name: string;
    class: string; // Optional: Add if needed in notifications
    section: string; // Optional: Add if needed in notifications
    stdEmail: string; // Optional: Could be null for some students
    parentId: string;
    absent: string[];
  };
  
  // Added Parent Type
  type ParentDoc = Models.Document & {
      name: string;
      email: string;
      students: string[]; // Array of student document IDs
  };
  
  interface NotificationItem {
    id: string;
    type: 'absence' | 'announcement' | 'message' | 'assignment' | 'other';
    title: string;
    body: string;
    timestamp: string;
    relatedDocId?: string; // Student ID for absence notifications
    isRead: boolean;
    date?: string; // Absence date
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
    const [userRole, setUserRole] = useState<'student' | 'parent' | 'unknown'>('unknown'); // Track role
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
  
    // --- Data Processing & Subscription Logic ---
  
    /**
     * Core logic to handle updates for a SINGLE student document.
     * Compares incoming data with current UI state to add new notifications.
     * Uses localStorage ONLY to debounce desktop notifications.
     */
    const handleStudentUpdate = useCallback((updatedStudent: StudentDoc) => {
      const studentDocId = updatedStudent.$id;
      const currentDbAbsenceDates = updatedStudent.absent || [];
      const studentName = updatedStudent.name || "Student"; // Fallback name
      const desktopNotifiedKey = `desktop_notified_absences_${studentDocId}`; // Key per student
  
      // Use functional update to safely access previous state
      setNotifications(prev => {
        const datesAlreadyInUiState = new Set<string>(
            prev.filter(n => n.type === 'absence' && n.relatedDocId === studentDocId && n.date).map(n => n.date!)
        );
  
        const newDatesForUi = currentDbAbsenceDates.filter(
            date => !datesAlreadyInUiState.has(date)
        );
  
        // console.log(`--- Absence Update [${studentName}] ---`);
        // console.log("DB Dates:", currentDbAbsenceDates);
        // console.log("UI Dates (before):", Array.from(datesAlreadyInUiState));
        // console.log("New Dates for UI:", newDatesForUi);
  
        if (newDatesForUi.length > 0) {
          const newNotificationItems: NotificationItem[] = [];
          const desktopNotifiedDates: string[] = JSON.parse(localStorage.getItem(desktopNotifiedKey) || "[]");
  
          newDatesForUi.forEach(date => {
            const notificationId = `absence-${studentDocId}-${date}-${Date.now()}`;
            const newItem: NotificationItem = {
              id: notificationId,
              type: 'absence',
              title: '🚨 New Absence Alert',
              body: `${studentName} was marked absent on ${date}`,
              timestamp: new Date().toISOString(),
              relatedDocId: studentDocId,
              isRead: false,
              date: date,
            };
            newNotificationItems.push(newItem);
  
            // Check if desktop notification needed for this date & student
            if (!desktopNotifiedDates.includes(date)) {
              // console.log(`Sending Desktop Notification for ${studentName}: ${date}`);
              showDesktopNotification(newItem.title, newItem.body);
            }
          });
  
          // Update localStorage for desktop debounce *after* checking
          localStorage.setItem(desktopNotifiedKey, JSON.stringify(currentDbAbsenceDates));
  
          // Prepend ONLY the truly new items for this student
          // console.log(`Prepending new UI items for ${studentName}:`, newNotificationItems);
          return [...newNotificationItems, ...prev];
  
        } else {
             // Optional: Update localStorage if list shrank to maintain consistency
             const desktopNotifiedDates: string[] = JSON.parse(localStorage.getItem(desktopNotifiedKey) || "[]");
             if (JSON.stringify(currentDbAbsenceDates) !== JSON.stringify(desktopNotifiedDates)) {
                 localStorage.setItem(desktopNotifiedKey, JSON.stringify(currentDbAbsenceDates));
             }
             return prev; // No UI changes if no new dates
        }
      }); // End setNotifications functional update
  
       // TODO: Handle other student document updates (e.g., grades) if needed
  
    }, [showDesktopNotification]); // Dependencies for the handler
  
  
    /**
     * Sets up a real-time subscription for a SINGLE student document.
     */
    const subscribeToStudentUpdates = useCallback((studentDoc: StudentDoc) => {
        const studentDocId = studentDoc.$id;
        const subscriptionString = `databases.${databaseId}.collections.${studentCollectionId}.documents.${studentDocId}`;
        // console.log(`Subscribing to: ${subscriptionString}`);
  
        try {
            const unsubscribe = client.subscribe(subscriptionString, response => {
                if (response.events.some(e => e.includes('.update'))) {
                    const updatedStudent = response.payload as StudentDoc;
                    handleStudentUpdate(updatedStudent); // Call the centralized handler
                }
            });
            // Add the specific unsubscribe function to the ref immediately
            unsubscribeFunctionsRef.current.push(unsubscribe);
            // console.log(`Subscription successful for ${studentDoc.name || studentDocId}`);
  
        } catch (subError) {
            console.error(`Failed to subscribe to ${subscriptionString}:`, subError);
            // Optionally update error state, but avoid overwriting existing errors?
            // setError(prevError => prevError ? `${prevError}\nSubscription failed for ${studentDoc.name || studentDocId}` : `Subscription failed for ${studentDoc.name || studentDocId}`);
        }
    }, [handleStudentUpdate]); // Depends on the handler
  
  
    // --- Main Effect for Initialization & Role Detection ---
    useEffect(() => {
      let isMounted = true;
  
      const initializeAndSubscribe = async () => {
        if (!isMounted) return;
        setIsLoading(true);
        setError(null);
        setUserRole('unknown');
        setNotifications([]); // Clear previous notifications
  
        // Clear previous subscriptions before starting
        unsubscribeFunctionsRef.current.forEach(unsub => {
            try { unsub(); } catch (e) { console.error("Unsubscribe error during init cleanup", e); }
        });
        unsubscribeFunctionsRef.current = []; // Reset the array
  
        try {
          const user = await account.get();
          if (!isMounted) return;
          const userEmail = user.email;
  
          // --- Role Detection Logic ---
          let foundRole = false;
  
          // 1. Check if Student
          try {
            const studentRes = await databases.listDocuments<StudentDoc>(databaseId, studentCollectionId, [Query.equal("stdEmail", userEmail), Query.limit(1)]);
            if (!isMounted) return;
  
            if (studentRes.documents.length > 0) {
              console.log("User identified as: Student");
              setUserRole('student');
              foundRole = true;
              const studentDoc = studentRes.documents[0];
  
              // Populate initial history for this student
               const studentName = studentDoc.name || "Student";
               const initialItems = (studentDoc.absent || []).map(date => ({
                   id: `absence-${studentDoc.$id}-${date}`, type: 'absence', title: 'Absence Recorded (History)',
                   body: `${studentName} was marked absent on ${date}.`, timestamp: studentDoc.$updatedAt,
                   relatedDocId: studentDoc.$id, isRead: true, date: date,
               }));
              setNotifications(initialItems);
  
              // Subscribe to this student's updates
              subscribeToStudentUpdates(studentDoc);
            }
          } catch (studentCheckError) {
              console.error("Error checking student role:", studentCheckError);
              // Don't stop, try checking parent role next
          }
  
  
          // 2. Check if Parent (only if not already found as student)
          if (isMounted && !foundRole) {
             try {
                  const parentRes = await databases.listDocuments<ParentDoc>(databaseId, parentCollectionId, [Query.equal("email", userEmail), Query.limit(1)]);
                  if (!isMounted) return;
  
                  if (parentRes.documents.length > 0) {
                      console.log("User identified as: Parent");
                      setUserRole('parent');
                      foundRole = true;
                      const parentDoc = parentRes.documents[0];
                      const studentIds = parentDoc.students || [];
  
                      if (studentIds.length > 0) {
                           console.log(`Parent has ${studentIds.length} students. Fetching...`);
                           // Fetch all student documents associated with the parent
                           const studentPromises = studentIds.map(id =>
                               databases.getDocument<StudentDoc>(databaseId, studentCollectionId, id)
                                  .catch(err => {
                                      console.error(`Failed to fetch student ${id}:`, err);
                                      return null; // Return null if a fetch fails, handle below
                                  })
                           );
                           const studentDocsResults = await Promise.all(studentPromises);
                           const fetchedStudentDocs = studentDocsResults.filter(doc => doc !== null) as StudentDoc[]; // Filter out nulls
  
                           if (!isMounted) return;
  
                           console.log(`Fetched ${fetchedStudentDocs.length} student documents.`);
  
                           // Populate initial history for ALL fetched students
                           let allInitialItems: NotificationItem[] = [];
                           fetchedStudentDocs.forEach(sDoc => {
                               const studentName = sDoc.name || "Student";
                               const initialItems = (sDoc.absent || []).map(date => ({
                                   id: `absence-${sDoc.$id}-${date}`, type: 'absence', title: 'Absence Recorded (History)',
                                   body: `${studentName} was marked absent on ${date}.`, timestamp: sDoc.$updatedAt,
                                   relatedDocId: sDoc.$id, isRead: true, date: date,
                               }));
                               allInitialItems = allInitialItems.concat(initialItems);
                           });
                           setNotifications(allInitialItems); // Set initial state for all children
  
                           // Subscribe to updates for EACH fetched student
                           fetchedStudentDocs.forEach(sDoc => {
                               subscribeToStudentUpdates(sDoc);
                           });
  
                      } else {
                          console.log("Parent has no students linked.");
                      }
                  }
             } catch(parentCheckError) {
                 console.error("Error checking parent role:", parentCheckError);
                 // Proceed, maybe set error later if no role found
             }
          }
  
          // 3. Handle case where no role is found
          if (isMounted && !foundRole) {
              console.warn("User role could not be determined.");
              setError("Could not determine user role or find associated data.");
          }
  
        } catch (err: any) {
           if (isMounted && err.code !== 401) { // Ignore session errors if potentially logged out
              console.error("Initialization Error:", err);
              setError(`Failed to initialize notifications: ${err.message || 'Unknown error'}`);
           }
        } finally {
             if (isMounted) setIsLoading(false);
        }
      };
  
      initializeAndSubscribe();
  
      // Cleanup function
      return () => {
        isMounted = false;
        console.log(`Cleaning up ${unsubscribeFunctionsRef.current.length} notification subscriptions on unmount...`);
        unsubscribeFunctionsRef.current.forEach(unsub => {
          try { unsub(); } catch (e) { console.error("Unsubscribe error on unmount", e); }
        });
        unsubscribeFunctionsRef.current = []; // Clear the ref array
      };
      // Dependencies: Include the functions responsible for setting up subscriptions
    }, [subscribeToStudentUpdates]); // `handleStudentUpdate` is a dependency of `subscribeToStudentUpdates`
  
  
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