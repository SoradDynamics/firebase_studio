// ~/common/NotificationContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import client, { databases, Query } from '~/utils/appwrite'; // Adjust path
import {
  NotifyDocument,
  StudentData,
  ParentData,
  TeacherData,
  ChildStudentDetails,
  UserForNotification,
} from 'types/notification'; // Adjust path
import { useStudentData } from '../student/components/StudentContext'; // Adjust path
import { useParentData } from '../parent/contexts/ParentContext'; // Adjust path
import { useTeacherData } from '../teacher/components/TeacherContext'; // Adjust path

import {
  isPermissionGranted,
  requestPermission,
  sendNotification as sendTauriNotification,
} from '@tauri-apps/plugin-notification';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const NOTIFY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_NOTIFY_COLLECTION_ID;

// --- Local Storage for Tauri Displayed Notifications ---
const TAURI_DISPLAYED_NOTIFICATIONS_LS_KEY = 'tauriDisplayedNotifications';

// Gets the record of notification IDs and their original 'valid' timestamps
const getDisplayedTauriNotificationsFromLS = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(TAURI_DISPLAYED_NOTIFICATIONS_LS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading displayed Tauri notifications from LS:", e);
    // If parsing fails, clear the corrupted item to prevent further errors
    localStorage.removeItem(TAURI_DISPLAYED_NOTIFICATIONS_LS_KEY);
  }
  return {};
};

// Adds a notification ID and its 'valid' date string to LS
const addDisplayedTauriNotificationToLS = (notificationId: string, validUntil: string): void => {
  const displayed = getDisplayedTauriNotificationsFromLS();
  displayed[notificationId] = validUntil; // Store the 'valid' date string
  try {
    localStorage.setItem(TAURI_DISPLAYED_NOTIFICATIONS_LS_KEY, JSON.stringify(displayed));
    console.log(`NotificationContext: Marked Tauri notification ${notificationId} as displayed (valid until ${validUntil}) in LS.`);
  } catch (e) {
    console.error("Error saving displayed Tauri notification to LS:", e);
  }
};

// Checks if a Tauri notification for this ID has been marked as displayed in LS
const hasTauriNotificationBeenDisplayed = (notificationId: string): boolean => {
  const displayed = getDisplayedTauriNotificationsFromLS();
  return !!displayed[notificationId];
};

// Removes entries from LS whose 'validUntil' timestamp (original validity) is in the past
const cleanupStoredTauriNotificationsFromLS = (): void => {
  const displayed = getDisplayedTauriNotificationsFromLS();
  const now = new Date();
  let needsUpdate = false;
  const newDisplayed: Record<string, string> = {};

  for (const id in displayed) {
    if (Object.prototype.hasOwnProperty.call(displayed, id)) {
        const validUntilString = displayed[id];
        try {
            const validUntilDate = new Date(validUntilString);
            // Check if the date is valid and if it's in the past
            if (!isNaN(validUntilDate.getTime()) && validUntilDate > now) {
                newDisplayed[id] = validUntilString; // Keep it
            } else {
                // console.log(`NotificationContext: Cleaning up LS entry for Tauri notification ${id} (was valid until ${validUntilString} or invalid date).`);
                needsUpdate = true; // Mark for removal
            }
        } catch (e) {
            // This catch might not be strictly necessary if new Date() handles bad strings by returning Invalid Date
            console.warn(`NotificationContext: Error parsing date string for ${id} in LS: ${validUntilString}. Removing.`);
            needsUpdate = true; // Remove invalid entry
        }
    }
  }

  if (needsUpdate) {
    try {
      localStorage.setItem(TAURI_DISPLAYED_NOTIFICATIONS_LS_KEY, JSON.stringify(newDisplayed));
      // console.log("NotificationContext: Finished cleaning up LS for Tauri notifications.");
    } catch (e) {
      console.error("Error during cleanup of displayed Tauri notifications in LS:", e);
    }
  }
};
// --- End Local Storage ---


interface NotificationContextType {
  notifications: NotifyDocument[];
  loading: boolean;
  userLoading: boolean;
  error: Error | null;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: NotifyDocument) => Promise<void>; // Renamed for clarity, handles Tauri
  hasNotificationPermission: boolean;
  currentUser: UserForNotification | null;
  currentUserType: 'student' | 'parent' | 'teacher' | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const isNotificationForUser = (
  notification: NotifyDocument,
  user: UserForNotification | null,
  userType: 'student' | 'parent' | 'teacher' | null,
  childrenDetails?: ChildStudentDetails[]
): boolean => {
  if (!user) {
    return false;
  }

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

    switch (key.toLowerCase()) {
      case 'id':
        if (value === user.id) return true;
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.userId === value)) return true;
        }
        break;
      case 'role':
        const targetRole = value.toLowerCase();
        if (targetRole === 'all') return true;
        if (user.labels && user.labels.map(l => l.toLowerCase()).includes(targetRole)) return true;
        if (userType === 'parent' && targetRole === 'student' && childrenDetails && childrenDetails.length > 0) return true;
        break;
      case 'facultyid':
        const targetFacultyId = value.toLowerCase();
        if (targetFacultyId === 'all') return true;
        if (userType === 'student' && (user as StudentData).facultyId?.toLowerCase() === targetFacultyId) return true;
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.facultyId?.toLowerCase() === targetFacultyId)) return true;
        }
        if (userType === 'teacher' && (user as TeacherData).facultyId?.toLowerCase() === targetFacultyId) return true;
        break;
      case 'class':
        const targetClass = value.toLowerCase();
        if (targetClass === 'all') return true;
        if (userType === 'student' && (user as StudentData).class?.toLowerCase() === targetClass) return true;
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.class?.toLowerCase() === targetClass)) return true;
        }
        if (userType === 'teacher' && (user as TeacherData).assignedClasses?.map(c => c.toLowerCase()).includes(targetClass)) return true;
        break;
      case 'section':
        const targetSection = value.toLowerCase();
        if (targetSection === 'all') return true;
        if (userType === 'student' && (user as StudentData).section?.toLowerCase() === targetSection) return true;
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.section?.toLowerCase() === targetSection)) return true;
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

  const { studentData, loading: studentLoadingFromCtx } = useStudentData();
  const { parentData, loading: parentLoadingFromCtx } = useParentData();
  const { teacherData, loading: teacherLoadingFromCtx } = useTeacherData();

  const [currentUser, setCurrentUser] = useState<UserForNotification | null>(null);
  const [currentUserType, setCurrentUserType] = useState<'student' | 'parent' | 'teacher' | null>(null);
  const [childrenDetailsForParent, setChildrenDetailsForParent] = useState<ChildStudentDetails[] | undefined>(undefined);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    // console.log("NotificationContext: User context data update.");
    if (!studentLoadingFromCtx && studentData) {
      setCurrentUser(studentData); setCurrentUserType('student'); setChildrenDetailsForParent(undefined); setUserLoading(false);
    } else if (!parentLoadingFromCtx && parentData) {
      setCurrentUser(parentData); setCurrentUserType('parent'); setChildrenDetailsForParent(parentData.childrenDetails); setUserLoading(false);
    } else if (!teacherLoadingFromCtx && teacherData) {
      setCurrentUser(teacherData); setCurrentUserType('teacher'); setChildrenDetailsForParent(undefined); setUserLoading(false);
    } else if (!studentLoadingFromCtx && !parentLoadingFromCtx && !teacherLoadingFromCtx) {
      setCurrentUser(null); setCurrentUserType(null); setChildrenDetailsForParent(undefined); setUserLoading(false);
    } else if (studentLoadingFromCtx || parentLoadingFromCtx || teacherLoadingFromCtx) {
        setUserLoading(true);
    }
  }, [
    studentData, studentLoadingFromCtx,
    parentData, parentLoadingFromCtx,
    teacherData, teacherLoadingFromCtx
  ]);

  useEffect(() => {
    const checkPermissionAndInitialCleanup = async () => {
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
      // Perform initial cleanup of LS for Tauri displayed notifications
      cleanupStoredTauriNotificationsFromLS();
    };
    checkPermissionAndInitialCleanup();
  }, []);

  // Internal function to handle sending Tauri notification and LS update
  const _sendAndRecordTauriNotification = useCallback(async (notification: NotifyDocument) => {
    if (!hasNotificationPermission) {
        // console.log("NotificationContext: No Tauri permission, cannot send notification.");
        return;
    }
    
    // Always run cleanup before checking, to ensure LS is fresh
    cleanupStoredTauriNotificationsFromLS(); 

    if (hasTauriNotificationBeenDisplayed(notification.$id)) {
      // console.log(`NotificationContext: Tauri notification for ${notification.$id} already displayed or marked in LS.`);
      return;
    }

    try {
      // console.log(`NotificationContext: Sending Tauri notification for ${notification.$id} ("${notification.title}")`);
      await sendTauriNotification({
        title: notification.title || 'New Notification',
        body: notification.msg,
      });
      addDisplayedTauriNotificationToLS(notification.$id, notification.valid);
    } catch (err) {
      console.error(`NotificationContext: Failed to send Tauri notification for ${notification.$id}:`, err);
    }
  }, [hasNotificationPermission]); // Depends on hasNotificationPermission

  // For new notifications (e.g., via subscription) or for adding to list
  const addNotificationToListAndTryTauri = useCallback(async (newNotification: NotifyDocument) => {
    const now = new Date();
    const validUntil = new Date(newNotification.valid);
    if (now > validUntil) {
      // console.log(`NotificationContext: addNotificationToListAndTryTauri - Incoming notification ${newNotification.$id} is EXPIRED.`);
      return;
    }

    // Check if notification is for the current user before adding to list or sending Tauri
    if (currentUser && isNotificationForUser(newNotification, currentUser, currentUserType, childrenDetailsForParent)) {
      // console.log(`NotificationContext: Notification ${newNotification.$id} IS FOR current user. Processing...`);
      setNotifications((prevNotifications) => {
        const exists = prevNotifications.some(n => n.$id === newNotification.$id);
        if (exists) {
            // console.log(`NotificationContext: Notification ${newNotification.$id} already exists in list. Not re-adding.`);
            return prevNotifications; // Avoid duplicates if event somehow fires multiple times
        }
        const updatedList = [newNotification, ...prevNotifications];
        updatedList.sort((a, b) => new Date(b.date || b.$createdAt).getTime() - new Date(a.date || a.$createdAt).getTime());
        return updatedList;
      });

      // Attempt to send Tauri notification for this new/relevant item
      await _sendAndRecordTauriNotification(newNotification);

    } else {
      // console.log(`NotificationContext: addNotificationToListAndTryTauri - Notification ${newNotification.$id} IS NOT for current user or no user. Ignoring.`);
    }
  }, [currentUser, currentUserType, childrenDetailsForParent, _sendAndRecordTauriNotification]);


  const fetchNotifications = useCallback(async () => {
    if (!DATABASE_ID || !NOTIFY_COLLECTION_ID) {
        console.error("NotificationContext: fetchNotifications - Error: Database ID or Notify Collection ID missing from .env");
        setError(new Error("App configuration error."));
        setLoading(false);
        return;
      }
  
      if (userLoading) {
        setLoading(true);
        return;
      }
  
      if (!currentUser) {
        setNotifications([]);
        setLoading(false);
        return;
      }
  
      setLoading(true);
      setError(null);
  
      try {
        const nowISO = new Date().toISOString();
        const targetQueriesSet = new Set<string>();
  
        targetQueriesSet.add(`id:${currentUser.id}`);
        if (currentUser.labels && currentUser.labels.length > 0) {
          currentUser.labels.forEach(label => targetQueriesSet.add(`role:${label.toLowerCase()}`));
        }
        targetQueriesSet.add('role:all');
        targetQueriesSet.add('class:all');
        targetQueriesSet.add('section:all');
        targetQueriesSet.add('facultyid:all');
  
        if (currentUserType === 'student') {
          const student = currentUser as StudentData;
          if (student.class) targetQueriesSet.add(`class:${student.class.toLowerCase()}`);
          if (student.section) targetQueriesSet.add(`section:${student.section.toLowerCase()}`);
          if (student.facultyId) targetQueriesSet.add(`facultyid:${student.facultyId.toLowerCase()}`);
        }
        else if (currentUserType === 'parent' && childrenDetailsForParent) {
          childrenDetailsForParent.forEach(child => {
            targetQueriesSet.add(`id:${child.userId}`);
            if (child.class) targetQueriesSet.add(`class:${child.class.toLowerCase()}`);
            if (child.section) targetQueriesSet.add(`section:${child.section.toLowerCase()}`);
            if (child.facultyId) targetQueriesSet.add(`facultyid:${child.facultyId.toLowerCase()}`);
          });
          targetQueriesSet.add('role:student');
        }
        else if (currentUserType === 'teacher') {
          const teacher = currentUser as TeacherData;
          if (teacher.facultyId) targetQueriesSet.add(`facultyid:${teacher.facultyId.toLowerCase()}`);
          if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
            teacher.assignedClasses.forEach(cls => targetQueriesSet.add(`class:${cls.toLowerCase()}`));
          }
        }
  
        const uniqueTargetQueries = Array.from(targetQueriesSet);
        
        const queries = [
          Query.greaterThanEqual('valid', nowISO), // Fetch only currently valid notifications
          Query.orderDesc('date'),
          Query.limit(100), // Adjust limit as needed
          Query.contains('to', uniqueTargetQueries),
        ];
  
        const response = await databases.listDocuments<NotifyDocument>(
          DATABASE_ID,
          NOTIFY_COLLECTION_ID,
          queries
        );
        
        const relevantNotifications = response.documents.filter(doc =>
          isNotificationForUser(doc, currentUser, currentUserType, childrenDetailsForParent)
        );
  
        relevantNotifications.sort((a, b) => new Date(b.date || b.$createdAt).getTime() - new Date(a.date || a.$createdAt).getTime());
        setNotifications(relevantNotifications);
  
      } catch (err: any) {
          console.error(`NotificationContext: fetchNotifications - Failed to fetch for ${currentUserType}:`, err);
          if (err.message && err.message.includes("index") && err.message.includes("to")) {
              setError(new Error("Database index missing or misconfigured for 'to' attribute in notifications."));
          } else {
              setError(err);
          }
      } finally {
        setLoading(false);
      }
  }, [currentUser, currentUserType, childrenDetailsForParent, userLoading]);

  useEffect(() => {
    if (!userLoading && currentUser) {
      fetchNotifications();
    } else if (!userLoading && !currentUser) {
        setNotifications([]);
        setLoading(false);
    }
  }, [userLoading, currentUser, fetchNotifications]);

  // Effect to show Tauri notifications for initially fetched/loaded notifications
  useEffect(() => {
    // Run only after initial loading is done, user is present, and notifications are fetched
    if (loading || userLoading || !currentUser || notifications.length === 0) {
      return;
    }
    
    // console.log("NotificationContext: Processing fetched notifications for Tauri display.");

    notifications.forEach(notification => {
        // isNotificationForUser also implicitly checks validity (now < validUntil)
        if (isNotificationForUser(notification, currentUser, currentUserType, childrenDetailsForParent)) {
             _sendAndRecordTauriNotification(notification); // This will handle LS check and permission
        }
    });
  // _sendAndRecordTauriNotification is a stable useCallback, its dependencies are handled internally.
  // This effect runs when the list of notifications changes, or user context, or loading states.
  }, [notifications, currentUser, currentUserType, childrenDetailsForParent, loading, userLoading, _sendAndRecordTauriNotification]);


  useEffect(() => {
    if (!DATABASE_ID || !NOTIFY_COLLECTION_ID || !currentUser) {
      return; 
    }

    // console.log(`NotificationContext: Setting up Appwrite subscription for user ${currentUser.id}`);
    const channel = `databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents`;
    const unsubscribeFn = client.subscribe(channel, (response: any) => {
      if (response.events.includes(`databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents.*.create`)) {
        const newNotification = response.payload as NotifyDocument;
        // console.log("NotificationContext: Realtime CREATE event, payload:", newNotification);
        addNotificationToListAndTryTauri(newNotification); // Use the combined function
      }
    });

    return () => {
      // console.log("NotificationContext: Cleaning up Appwrite subscription.");
      unsubscribeFn();
    };
  }, [DATABASE_ID, NOTIFY_COLLECTION_ID, currentUser, addNotificationToListAndTryTauri]); // addNotificationToListAndTryTauri is a dependency

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        loading,
        userLoading,
        error,
        fetchNotifications,
        addNotification: addNotificationToListAndTryTauri, // Expose the function that also handles Tauri
        hasNotificationPermission,
        currentUser,
        currentUserType,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }
  return context;
};