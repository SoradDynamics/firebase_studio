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
  TeacherData, // Import TeacherData
  ChildStudentDetails,
  UserForNotification,
} from 'types/notification';
import { useStudentData } from '../student/components/StudentContext';
import { useParentData } from '../parent/components/ParentContext';
import { useTeacherData } from '../teacher/components/TeacherContext'; // Import useTeacherData

import {
  isPermissionGranted,
  requestPermission,
  sendNotification as sendTauriNotification,
} from '@tauri-apps/plugin-notification';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const NOTIFY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_NOTIFY_COLLECTION_ID;

interface NotificationContextType {
  notifications: NotifyDocument[];
  loading: boolean;
  userLoading: boolean;
  error: Error | null;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: NotifyDocument) => void;
  hasNotificationPermission: boolean;
  currentUser: UserForNotification | null;
  currentUserType: 'student' | 'parent' | 'teacher' | null; // Add 'teacher'
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const isNotificationForUser = (
  notification: NotifyDocument,
  user: UserForNotification | null,
  userType: 'student' | 'parent' | 'teacher' | null, // Add 'teacher'
  childrenDetails?: ChildStudentDetails[]
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
        if (value === user.id) return true;
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.userId === value)) return true;
        }
        break;
      case 'role':
        if (value.toLowerCase() === 'all' || (user.labels && user.labels.includes(value))) {
          return true;
        }
        // Parent can receive notifications meant for any student if they have children
        if (userType === 'parent' && value.toLowerCase() === 'student' && childrenDetails && childrenDetails.length > 0) {
          return true;
        }
        // Teacher specific role check (already covered by user.labels.includes(value) if value is 'teacher')
        // if (userType === 'teacher' && value.toLowerCase() === 'teacher') return true; // This is redundant if labels are checked
        break;
      case 'facultyId':
        if (value.toLowerCase() === 'all') return true;
        if (userType === 'student' && (user as StudentData).facultyId === value) return true;
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.facultyId === value)) return true;
        }
        if (userType === 'teacher' && (user as TeacherData).facultyId === value) return true; // Teacher faculty check
        break;
      case 'class':
        if (value.toLowerCase() === 'all') return true;
        if (userType === 'student' && (user as StudentData).class === value) return true;
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.class === value)) return true;
        }
        // Teacher class check (if teachers are assigned to classes)
        if (userType === 'teacher' && (user as TeacherData).assignedClasses?.includes(value)) return true;
        break;
      case 'section': // Sections might be less relevant for direct teacher targeting unless explicitly modeled
        if (value.toLowerCase() === 'all') return true;
        if (userType === 'student' && (user as StudentData).section === value) return true;
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.section === value)) return true;
        }
        // if (userType === 'teacher' && (user as TeacherData).assignedSections?.includes(value)) return true; // If teachers have assigned sections
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
  const { teacherData, loading: teacherLoadingFromCtx } = useTeacherData(); // Consume teacher context

  const [currentUser, setCurrentUser] = useState<UserForNotification | null>(null);
  const [currentUserType, setCurrentUserType] = useState<'student' | 'parent' | 'teacher' | null>(null); // Add 'teacher'
  const [childrenDetailsForParent, setChildrenDetailsForParent] = useState<ChildStudentDetails[] | undefined>(undefined);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    // Determine current user
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
    } else if (!teacherLoadingFromCtx && teacherData) { // Check for teacher data
      setCurrentUser(teacherData);
      setCurrentUserType('teacher');
      setChildrenDetailsForParent(undefined); // Teachers don't have 'childrenDetails' in this context
      setUserLoading(false);
    } else if (!studentLoadingFromCtx && !parentLoadingFromCtx && !teacherLoadingFromCtx) {
      // All contexts have finished loading, and none have data.
      setCurrentUser(null);
      setCurrentUserType(null);
      setChildrenDetailsForParent(undefined);
      setUserLoading(false);
    } else if (studentLoadingFromCtx || parentLoadingFromCtx || teacherLoadingFromCtx) {
        setUserLoading(true); // If any context is still loading
    }
  }, [
    studentData, studentLoadingFromCtx,
    parentData, parentLoadingFromCtx,
    teacherData, teacherLoadingFromCtx // Add teacher dependencies
  ]);

  useEffect(() => {
    const checkPermission = async () => {
      // ... (permission logic remains the same)
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
    // ... (addNotification logic should largely remain the same)
    // It uses isNotificationForUser which will now correctly handle teachers
    const now = new Date();
    const validUntil = new Date(newNotification.valid);
    if (now > validUntil) return;

    if (isNotificationForUser(newNotification, currentUser, currentUserType, childrenDetailsForParent)) {
      setNotifications((prevNotifications) => {
        const exists = prevNotifications.some(n => n.$id === newNotification.$id);
        if (exists) return prevNotifications;
        const updatedList = [newNotification, ...prevNotifications];
        updatedList.sort((a, b) => new Date(b.date || b.$createdAt).getTime() - new Date(a.date || a.$createdAt).getTime());
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
      // ... (error handling remains the same)
      console.error("Error: Database ID or Notify Collection ID missing from .env");
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

      // 1. Common targets for all users
      targetQueriesSet.add(`id:${currentUser.id}`);
      targetQueriesSet.add('role:all');
      targetQueriesSet.add('class:all'); // Generic 'all classes'
      targetQueriesSet.add('section:all'); // Generic 'all sections'
      targetQueriesSet.add('facultyId:all'); // Generic 'all faculties'
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
        childrenDetailsForParent.forEach(child => {
          targetQueriesSet.add(`id:${child.userId}`);
          if (child.class) targetQueriesSet.add(`class:${child.class}`);
          if (child.section) targetQueriesSet.add(`section:${child.section}`);
          if (child.facultyId) targetQueriesSet.add(`facultyId:${child.facultyId}`);
        });
        // Parents might also receive general "student" role notifications
        targetQueriesSet.add('role:student');
      }
      // 4. Teacher-specific targets
      else if (currentUserType === 'teacher') {
        const teacher = currentUser as TeacherData;
        // 'role:teacher' is already added by labels loop
        if (teacher.facultyId) targetQueriesSet.add(`facultyId:${teacher.facultyId}`);
        if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
          teacher.assignedClasses.forEach(cls => targetQueriesSet.add(`class:${cls}`));
        }
        // Add other teacher-specific query targets if needed (e.g., subject, etc.)
      }

      const uniqueTargetQueries = Array.from(targetQueriesSet);
      
      const queries = [
        Query.greaterThanEqual('valid', nowISO),
        Query.orderDesc('date'), // or $createdAt
        Query.limit(100),
        Query.contains('to', uniqueTargetQueries),
      ];

      // console.log(`NotificationProvider: Executing Queries for ${currentUserType}:`, JSON.stringify(queries));

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
        console.error(`NotificationProvider: Failed to fetch notifications for ${currentUserType}:`, err);
        if (err.message && err.message.includes("index") && err.message.includes("to")) {
            setError(new Error("Database index missing or misconfigured for 'to' attribute in notifications. Ensure 'to' is indexed for array queries."));
        } else {
            setError(err);
        }
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentUserType, childrenDetailsForParent, userLoading]); // Add dependencies

  useEffect(() => {
    if (!userLoading && currentUser) {
      fetchNotifications();
    } else if (!userLoading && !currentUser) {
        setNotifications([]);
        setLoading(false);
    }
  }, [userLoading, currentUser, fetchNotifications]);

  useEffect(() => {
    if (!DATABASE_ID || !NOTIFY_COLLECTION_ID || !currentUser) {
      return;
    }
    const channel = `databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents`;
    const unsubscribe = client.subscribe(channel, (response: any) => {
      if (response.events.includes(`databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents.*.create`)) {
        const newNotification = response.payload as NotifyDocument;
        // console.log("NotificationProvider: Realtime new notification:", newNotification);
        addNotification(newNotification);
      }
      // You might want to handle updates or deletes as well
      // if (response.events.includes(`databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents.*.update`)) { ... }
      // if (response.events.includes(`databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents.*.delete`)) { ... }
    });

    return () => {
      unsubscribe();
    };
  }, [DATABASE_ID, NOTIFY_COLLECTION_ID, currentUser, addNotification]); // Add addNotification

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        loading,
        userLoading,
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