// ~/common/NotificationContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import client, { databases, Query } from '~/utils/appwrite';
import {
  NotifyDocument,
  StudentData,
  ParentData,
  ChildStudentDetails,
  UserForNotification,
} from 'types/notification'; // Ensure UserForNotification is imported
import { useStudentData } from '../student/components/StudentContext';
import { useParentData } from '../parent/components/ParentContext'; // Import new Parent context hook

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
  loading: boolean; // Overall loading for notifications
  userLoading: boolean; // Loading state for user data (student/parent)
  error: Error | null;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: NotifyDocument) => void;
  hasNotificationPermission: boolean;
  currentUser: UserForNotification | null;
  currentUserType: 'student' | 'parent' | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// --- Filtering Logic (MODIFIED) ---
export const isNotificationForUser = (
  notification: NotifyDocument,
  user: UserForNotification | null,
  userType: 'student' | 'parent' | null,
  childrenDetails?: ChildStudentDetails[] // Only relevant for parents
): boolean => {
  if (!user) return false;

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
        if (value === user.id) return true; // Matches parent's or student's own Appwrite User ID
        // For parents, check if it matches any of their children's User IDs
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.userId === value)) return true;
        }
        break;
      case 'role':
        if (value.toLowerCase() === 'all' || (user.labels && user.labels.includes(value))) {
          return true;
        }

        if (userType === 'parent' && value.toLowerCase() === 'student' && childrenDetails && childrenDetails.length > 0) {
          return true; // Parent can receive notifications meant for students
        }
        
        break;
      case 'facultyId':
        if (value.toLowerCase() === 'all') return true;
        if (userType === 'student' && (user as StudentData).facultyId === value) return true;
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.facultyId === value)) return true;
        }
        break;
      case 'class':
        if (value.toLowerCase() === 'all') return true;
        if (userType === 'student' && (user as StudentData).class === value) return true;
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.class === value)) return true;
        }
        break;
      case 'section':
        if (value.toLowerCase() === 'all') return true;
        if (userType === 'student' && (user as StudentData).section === value) return true;
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.section === value)) return true;
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
  const [loading, setLoading] = useState<boolean>(true); // Loading for notifications list
  const [error, setError] = useState<Error | null>(null);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

  // Consume both student and parent contexts
  const { studentData, loading: studentLoadingFromCtx } = useStudentData();
  const { parentData, loading: parentLoadingFromCtx } = useParentData();

  const [currentUser, setCurrentUser] = useState<UserForNotification | null>(null);
  const [currentUserType, setCurrentUserType] = useState<'student' | 'parent' | null>(null);
  const [childrenDetailsForParent, setChildrenDetailsForParent] = useState<ChildStudentDetails[] | undefined>(undefined);
  const [userLoading, setUserLoading] = useState(true); // Combined loading state for user data

  useEffect(() => {
    // Determine current user based on which context provides data
    if (!studentLoadingFromCtx && studentData) {
      setCurrentUser(studentData);
      setCurrentUserType('student');
      setChildrenDetailsForParent(undefined);
      setUserLoading(false);
    } else if (!parentLoadingFromCtx && parentData) {
      setCurrentUser(parentData);
      setCurrentUserType('parent');
      setChildrenDetailsForParent(parentData.childrenDetails);
      setUserLoading(false);
    } else if (!studentLoadingFromCtx && !parentLoadingFromCtx) {
      // Both contexts have finished loading (or attempted to), and neither has data.
      setCurrentUser(null);
      setCurrentUserType(null);
      setChildrenDetailsForParent(undefined);
      setUserLoading(false);
      // console.log("NotificationProvider: No student or parent data found.");
    }
     // If one is still loading, userLoading remains true until both settle
     else if (studentLoadingFromCtx || parentLoadingFromCtx) {
        setUserLoading(true);
    }
  }, [studentData, studentLoadingFromCtx, parentData, parentLoadingFromCtx]);


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

  const addNotification = useCallback(async (newNotification: NotifyDocument) => {
    const now = new Date();
    const validUntil = new Date(newNotification.valid);
    if (now > validUntil) return;

    if (isNotificationForUser(newNotification, currentUser, currentUserType, childrenDetailsForParent)) {
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
  }, [currentUser, currentUserType, childrenDetailsForParent, hasNotificationPermission]);


  const fetchNotifications = useCallback(async () => {
    if (!DATABASE_ID || !NOTIFY_COLLECTION_ID) {
      console.error("Error: Database ID or Notify Collection ID missing from .env");
      setError(new Error("App configuration error."));
      setLoading(false);
      return;
    }

    if (userLoading) {
      // console.log("NotificationProvider: fetchNotifications - Waiting for user data (student/parent)...");
      setLoading(true); // Show loading for notifications if user data is still loading
      return;
    }

    if (!currentUser) {
      // console.log("NotificationProvider: fetchNotifications - No current user data, cannot fetch notifications.");
      setNotifications([]); // Clear notifications if no user
      setLoading(false);
      return;
    }

    // console.log(`NotificationProvider: Fetching initial notifications for ${currentUserType}:`, currentUser.id);
    setLoading(true);
    setError(null);

    try {
      const nowISO = new Date().toISOString();
      const targetQueriesSet = new Set<string>();

      // 1. Common targets
      targetQueriesSet.add(`id:${currentUser.id}`); // Own ID
      targetQueriesSet.add('role:all');
      targetQueriesSet.add('class:all');
      targetQueriesSet.add('section:all');
      targetQueriesSet.add('facultyId:all');
      if (currentUser.labels && currentUser.labels.length > 0) {
        currentUser.labels.forEach(label => targetQueriesSet.add(`role:${label}`));
      }

      // 2. Student-specific targets
      if (currentUserType === 'student') {
        const student = currentUser as StudentData;
        if (student.class) targetQueriesSet.add(`class:${student.class}`);
        if (student.section) targetQueriesSet.add(`section:${student.section}`);
        if (student.facultyId) targetQueriesSet.add(`facultyId:${student.facultyId}`);
      }
      // 3. Parent-specific targets (for their children)
      else if (currentUserType === 'parent' && childrenDetailsForParent) {
        // Role 'parent' is already handled by currentUser.labels
        childrenDetailsForParent.forEach(child => {
          targetQueriesSet.add(`id:${child.userId}`); // Child's Appwrite User ID
          if (child.class) targetQueriesSet.add(`class:${child.class}`);
          if (child.section) targetQueriesSet.add(`section:${child.section}`);
          if (child.facultyId) targetQueriesSet.add(`facultyId:${child.facultyId}`);
        });
      }

      const uniqueTargetQueries = Array.from(targetQueriesSet);
      
      const queries = [
        Query.greaterThanEqual('valid', nowISO),
        Query.orderDesc('date'),
        Query.limit(100), // Increased limit slightly
        Query.contains('to', uniqueTargetQueries),
      ];

      // console.log("NotificationProvider: Executing Queries:", JSON.stringify(queries));

      const response = await databases.listDocuments<NotifyDocument>(
        DATABASE_ID,
        NOTIFY_COLLECTION_ID,
        queries
      );
      
      const relevantNotifications = response.documents.filter(doc =>
        isNotificationForUser(doc, currentUser, currentUserType, childrenDetailsForParent)
      );

      relevantNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotifications(relevantNotifications);

    } catch (err: any) {
      console.error('NotificationProvider: Failed to fetch notifications:', err);
      if (err.message && err.message.includes("index")) {
        setError(new Error("Database index missing or misconfigured for notifications. Ensure 'to' attribute is indexed for array queries."));
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentUserType, childrenDetailsForParent, userLoading]);

  useEffect(() => {
    if (!userLoading && currentUser) { // Fetch only when user data is loaded and available
      fetchNotifications();
    } else if (!userLoading && !currentUser) { // User data loaded, but no user (e.g. not student or parent)
        setNotifications([]);
        setLoading(false);
    }
  }, [userLoading, currentUser, fetchNotifications]);


  useEffect(() => {
    if (!DATABASE_ID || !NOTIFY_COLLECTION_ID || !currentUser) {
      return; // Don't subscribe if config or user data is missing
    }

    // console.log(`NotificationProvider: Setting up Appwrite subscription for ${currentUserType} notifications.`);
    const channel = `databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents`;
    const unsubscribe = client.subscribe(channel, (response: any) => {
      if (response.events.includes(`databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents.*.create`)) {
        const newNotification = response.payload as NotifyDocument;
        addNotification(newNotification);
      }
    });

    return () => {
      // console.log("NotificationProvider: Cleaning up Appwrite subscription.");
      unsubscribe();
    };
  }, [currentUser, addNotification]); // Re-subscribe if currentUser changes or addNotification logic changes

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        loading,
        userLoading, // expose userLoading state
        error,
        fetchNotifications,
        addNotification,
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