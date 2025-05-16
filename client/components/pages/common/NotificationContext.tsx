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
import { useParentData } from '../parent/components/ParentContext'; // Adjust path
import { useTeacherData } from '../teacher/components/TeacherContext'; // Adjust path

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
    // console.log(`isNotificationForUser: No user provided for notification ${notification.$id}`);
    return false;
  }

  // Uncomment for very detailed per-notification check:
  // console.log(`isNotificationForUser: CHECKING Doc ID: ${notification.$id}, Title: "${notification.title}" FOR User ID: ${user.id} (Appwrite User ID), User Document ID: ${user.$id}, Type: ${userType}, Labels: ${JSON.stringify(user.labels)}`);
  // console.log(`isNotificationForUser: Notification 'to' field: ${JSON.stringify(notification.to)}, Valid until: ${notification.valid}`);

  const now = new Date();
  const validUntil = new Date(notification.valid);
  if (now > validUntil) {
    // console.log(`isNotificationForUser: Notification ${notification.$id} is EXPIRED (valid until ${notification.valid}).`);
    return false;
  }

  if (!notification.to || notification.to.length === 0) {
    // console.log(`isNotificationForUser: Notification ${notification.$id} has no 'to' targets.`);
    return false;
  }

  for (const target of notification.to) {
    const [key, value] = target.split(':', 2);
    // console.log(`isNotificationForUser: Target part: "${target}", Key: "${key}", Value: "${value}" for Doc ${notification.$id}`);

    switch (key.toLowerCase()) { // Make key comparison case-insensitive
      case 'id':
        if (value === user.id) { // user.id should be the Appwrite User ID
          console.log(`%cMATCH (ID)%c! Target id "${value}" === User id "${user.id}" for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
          return true;
        }
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.userId === value)) {
            console.log(`%cMATCH (Parent's Child ID)%c! Target id "${value}" matches a child's User id for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
            return true;
          }
        }
        break;
      case 'role':
        const targetRole = value.toLowerCase();
        if (targetRole === 'all') {
          console.log(`%cMATCH (Role All)%c! for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
          return true;
        }
        if (user.labels && user.labels.map(l => l.toLowerCase()).includes(targetRole)) {
          console.log(`%cMATCH (Role Label)%c! User labels ${JSON.stringify(user.labels)} includes target role "${targetRole}" for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
          return true;
        }
        if (userType === 'parent' && targetRole === 'student' && childrenDetails && childrenDetails.length > 0) {
          console.log(`%cMATCH (Parent for Student Role)%c! Parent receiving student notification for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
          return true;
        }
        break;
      case 'facultyid': // case-insensitive key
        const targetFacultyId = value.toLowerCase();
        if (targetFacultyId === 'all') {
          console.log(`%cMATCH (FacultyId All)%c! for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
          return true;
        }
        if (userType === 'student' && (user as StudentData).facultyId?.toLowerCase() === targetFacultyId) {
          console.log(`%cMATCH (Student FacultyId)%c! for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
          return true;
        }
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.facultyId?.toLowerCase() === targetFacultyId)) {
            console.log(`%cMATCH (Parent's Child FacultyId)%c! for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
            return true;
          }
        }
        if (userType === 'teacher' && (user as TeacherData).facultyId?.toLowerCase() === targetFacultyId) {
          console.log(`%cMATCH (Teacher FacultyId)%c! Teacher facultyId "${(user as TeacherData).facultyId}" === Target facultyId "${targetFacultyId}" for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
          return true;
        }
        break;
      case 'class': // case-insensitive key
        const targetClass = value.toLowerCase();
        if (targetClass === 'all') {
          console.log(`%cMATCH (Class All)%c! for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
          return true;
        }
        if (userType === 'student' && (user as StudentData).class?.toLowerCase() === targetClass) {
          console.log(`%cMATCH (Student Class)%c! for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
          return true;
        }
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.class?.toLowerCase() === targetClass)) {
            console.log(`%cMATCH (Parent's Child Class)%c! for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
            return true;
          }
        }
        if (userType === 'teacher' && (user as TeacherData).assignedClasses?.map(c => c.toLowerCase()).includes(targetClass)) {
          console.log(`%cMATCH (Teacher Assigned Class)%c! Teacher classes ${JSON.stringify((user as TeacherData).assignedClasses)} includes target class "${targetClass}" for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
          return true;
        }
        break;
      case 'section': // case-insensitive key
        const targetSection = value.toLowerCase();
        if (targetSection === 'all') {
          console.log(`%cMATCH (Section All)%c! for Doc ${notification.$id}`, 'color: green; font-weight: bold;', 'color: inherit;');
          return true;
        }
        if (userType === 'student' && (user as StudentData).section?.toLowerCase() === targetSection) return true;
        if (userType === 'parent' && childrenDetails) {
          if (childrenDetails.some(child => child.section?.toLowerCase() === targetSection)) return true;
        }
        // Add teacher section logic if relevant
        break;
      default:
        // console.log(`isNotificationForUser: Unknown target key "${key}" for Doc ${notification.$id}`);
        break;
    }
  }
  // console.log(`%cNO MATCH%c for Doc ${notification.$id} with User ID ${user.id} (Appwrite User ID)`, 'color: red;', 'color: inherit;');
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
    console.log("NotificationContext: User context data update. StudentLoading:", studentLoadingFromCtx, "ParentLoading:", parentLoadingFromCtx, "TeacherLoading:", teacherLoadingFromCtx);
    // console.log("NotificationContext: StudentData:", studentData, "ParentData:", parentData, "TeacherData:", teacherData);

    if (!studentLoadingFromCtx && studentData) {
      setCurrentUser(studentData);
      setCurrentUserType('student');
      setChildrenDetailsForParent(undefined);
      setUserLoading(false);
      console.log("NotificationContext: Current user set to STUDENT:", studentData);
    } else if (!parentLoadingFromCtx && parentData) {
      setCurrentUser(parentData);
      setCurrentUserType('parent');
      setChildrenDetailsForParent(parentData.childrenDetails);
      setUserLoading(false);
      console.log("NotificationContext: Current user set to PARENT:", parentData);
    } else if (!teacherLoadingFromCtx && teacherData) {
      setCurrentUser(teacherData);
      setCurrentUserType('teacher');
      setChildrenDetailsForParent(undefined);
      setUserLoading(false);
      console.log("NotificationContext: Current user set to TEACHER:", teacherData);
    } else if (!studentLoadingFromCtx && !parentLoadingFromCtx && !teacherLoadingFromCtx) {
      setCurrentUser(null);
      setCurrentUserType(null);
      setChildrenDetailsForParent(undefined);
      setUserLoading(false);
      console.log("NotificationContext: All user contexts loaded, but no student, parent, or teacher data found. Current user set to null.");
    } else if (studentLoadingFromCtx || parentLoadingFromCtx || teacherLoadingFromCtx) {
        setUserLoading(true);
        // console.log("NotificationContext: Waiting for one or more user data contexts to finish loading...");
    }
  }, [
    studentData, studentLoadingFromCtx,
    parentData, parentLoadingFromCtx,
    teacherData, teacherLoadingFromCtx
  ]);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        let permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          const permission = await requestPermission();
          permissionGranted = permission === 'granted';
        }
        setHasNotificationPermission(permissionGranted);
        // console.log("NotificationContext: Tauri notification permission status:", permissionGranted);
      } catch (err) {
        console.error('Error checking/requesting Tauri notification permission:', err);
        setHasNotificationPermission(false);
      }
    };
    checkPermission();
  }, []);

  const addNotification = useCallback(async (newNotification: NotifyDocument) => {
    // console.log(`NotificationContext: addNotification called with:`, newNotification);
    const now = new Date();
    const validUntil = new Date(newNotification.valid);
    if (now > validUntil) {
        console.log(`NotificationContext: addNotification - Incoming notification ${newNotification.$id} is EXPIRED.`);
        return;
    }

    // Crucial: Use the current state of currentUser and currentUserType
    if (isNotificationForUser(newNotification, currentUser, currentUserType, childrenDetailsForParent)) {
      console.log(`%cNotificationContext: addNotification - Notification ${newNotification.$id} IS FOR current user. Adding to list.`, 'color: blue;');
      setNotifications((prevNotifications) => {
        const exists = prevNotifications.some(n => n.$id === newNotification.$id);
        if (exists) {
            // console.log(`NotificationContext: addNotification - Notification ${newNotification.$id} already exists in list.`);
            return prevNotifications;
        }
        const updatedList = [newNotification, ...prevNotifications];
        updatedList.sort((a, b) => new Date(b.date || b.$createdAt).getTime() - new Date(a.date || a.$createdAt).getTime());
        return updatedList;
      });

      if (hasNotificationPermission) {
        try {
          // console.log(`NotificationContext: addNotification - Sending Tauri notification for ${newNotification.$id}`);
          await sendTauriNotification({
            title: newNotification.title || 'New Notification',
            body: newNotification.msg,
          });
        } catch (err: any) {
          console.error("NotificationContext: addNotification - Failed to send Tauri notification:", err);
        }
      }
    } else {
        console.log(`NotificationContext: addNotification - Notification ${newNotification.$id} IS NOT for current user. Ignoring.`);
    }
  }, [currentUser, currentUserType, childrenDetailsForParent, hasNotificationPermission]); // Dependencies are important here!

  const fetchNotifications = useCallback(async () => {
    if (!DATABASE_ID || !NOTIFY_COLLECTION_ID) {
      console.error("NotificationContext: fetchNotifications - Error: Database ID or Notify Collection ID missing from .env");
      setError(new Error("App configuration error."));
      setLoading(false);
      return;
    }

    if (userLoading) {
      console.log("NotificationContext: fetchNotifications - Waiting for user data to load completely.");
      setLoading(true);
      return;
    }

    if (!currentUser) {
      console.log("NotificationContext: fetchNotifications - No current user, cannot fetch notifications. Clearing list.");
      setNotifications([]);
      setLoading(false);
      return;
    }

    console.log(`NotificationContext: fetchNotifications - Attempting to fetch for ${currentUserType}: User Appwrite ID ${currentUser.id}, User Document ID ${currentUser.$id}, Labels: ${JSON.stringify(currentUser.labels)}`);
    setLoading(true);
    setError(null);

    try {
      const nowISO = new Date().toISOString();
      const targetQueriesSet = new Set<string>();

      // 1. Common targets for all users
      targetQueriesSet.add(`id:${currentUser.id}`); // Target by Appwrite User ID
      if (currentUser.labels && currentUser.labels.length > 0) {
        currentUser.labels.forEach(label => targetQueriesSet.add(`role:${label.toLowerCase()}`)); // Ensure role queries are lowercase
      }
      targetQueriesSet.add('role:all');
      targetQueriesSet.add('class:all');
      targetQueriesSet.add('section:all');
      targetQueriesSet.add('facultyid:all'); // Using lowercase for consistency

      // 2. Student-specific targets
      if (currentUserType === 'student') {
        const student = currentUser as StudentData;
        if (student.class) targetQueriesSet.add(`class:${student.class.toLowerCase()}`);
        if (student.section) targetQueriesSet.add(`section:${student.section.toLowerCase()}`);
        if (student.facultyId) targetQueriesSet.add(`facultyid:${student.facultyId.toLowerCase()}`);
      }
      // 3. Parent-specific targets (for their children)
      else if (currentUserType === 'parent' && childrenDetailsForParent) {
        childrenDetailsForParent.forEach(child => {
          targetQueriesSet.add(`id:${child.userId}`); // Child's Appwrite User ID
          if (child.class) targetQueriesSet.add(`class:${child.class.toLowerCase()}`);
          if (child.section) targetQueriesSet.add(`section:${child.section.toLowerCase()}`);
          if (child.facultyId) targetQueriesSet.add(`facultyid:${child.facultyId.toLowerCase()}`);
        });
        targetQueriesSet.add('role:student'); // Parents can also get general "student" role notifications
      }
      // 4. Teacher-specific targets
      else if (currentUserType === 'teacher') {
        const teacher = currentUser as TeacherData;
        // 'role:teacher' is already added by labels loop above
        if (teacher.facultyId) targetQueriesSet.add(`facultyid:${teacher.facultyId.toLowerCase()}`);
        if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
          teacher.assignedClasses.forEach(cls => targetQueriesSet.add(`class:${cls.toLowerCase()}`));
        }
      }

      const uniqueTargetQueries = Array.from(targetQueriesSet);
      console.log("NotificationContext: fetchNotifications - Constructed uniqueTargetQueries for Appwrite:", uniqueTargetQueries);
      
      const queries = [
        Query.greaterThanEqual('valid', nowISO),
        Query.orderDesc('date'), // or $createdAt
        Query.limit(100),
        Query.contains('to', uniqueTargetQueries), // Appwrite will do OR logic for items in this array
      ];

      console.log("NotificationContext: fetchNotifications - Executing Appwrite Query:", JSON.stringify(queries));
      const response = await databases.listDocuments<NotifyDocument>(
        DATABASE_ID,
        NOTIFY_COLLECTION_ID,
        queries
      );
      console.log("NotificationContext: fetchNotifications - Appwrite Raw Response (documents count):", response.documents.length);
      // console.log("NotificationContext: fetchNotifications - Appwrite Raw Documents:", response.documents); // Log if count is low/unexpected
      
      console.log("NotificationContext: fetchNotifications - Filtering raw documents with client-side isNotificationForUser...");
      const relevantNotifications = response.documents.filter(doc =>
        isNotificationForUser(doc, currentUser, currentUserType, childrenDetailsForParent)
      );
      console.log("NotificationContext: fetchNotifications - Relevant Notifications after client-side filter (count):", relevantNotifications.length);
      // console.log("NotificationContext: fetchNotifications - Final Relevant Notifications:", relevantNotifications);


      relevantNotifications.sort((a, b) => new Date(b.date || b.$createdAt).getTime() - new Date(a.date || a.$createdAt).getTime());
      setNotifications(relevantNotifications);

    } catch (err: any) {
        console.error(`NotificationContext: fetchNotifications - Failed to fetch for ${currentUserType}:`, err);
        if (err.message && err.message.includes("index") && err.message.includes("to")) {
            setError(new Error("Database index missing or misconfigured for 'to' attribute in notifications. Ensure 'to' is indexed (Key: to, Type: FULLTEXT or KEY, Attributes: to, Orders: ASC)."));
        } else {
            setError(err);
        }
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentUserType, childrenDetailsForParent, userLoading]);

  useEffect(() => {
    if (!userLoading && currentUser) {
      console.log("NotificationContext: User data fully loaded and currentUser exists. Calling fetchNotifications.");
      fetchNotifications();
    } else if (!userLoading && !currentUser) {
        console.log("NotificationContext: User data loaded, but no currentUser (e.g. not student/parent/teacher). Clearing notifications list.");
        setNotifications([]);
        setLoading(false); // Ensure loading is false if no user
    }
  }, [userLoading, currentUser, fetchNotifications]); // fetchNotifications is memoized

  useEffect(() => {
    if (!DATABASE_ID || !NOTIFY_COLLECTION_ID || !currentUser) {
      // console.log("NotificationContext: Subscription prerequisites not met (config or currentUser missing). Skipping subscription setup.");
      return; 
    }

    console.log(`NotificationContext: Setting up Appwrite subscription for user ${currentUser.id} (Appwrite User ID, Type: ${currentUserType}) on channel databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents`);
    const channel = `databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents`;
    const unsubscribeFn = client.subscribe(channel, (response: any) => {
      // console.log("NotificationContext: Realtime event received from Appwrite:", response);
      if (response.events.includes(`databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents.*.create`)) {
        const newNotification = response.payload as NotifyDocument;
        console.log("NotificationContext: Realtime CREATE event, payload:", newNotification);
        addNotification(newNotification); // addNotification will call isNotificationForUser
      }
      // Optionally handle updates if needed
      // if (response.events.includes(`databases.${DATABASE_ID}.collections.${NOTIFY_COLLECTION_ID}.documents.*.update`)) {
      //   const updatedNotification = response.payload as NotifyDocument;
      //   console.log("NotificationContext: Realtime UPDATE event, payload:", updatedNotification);
      //   // You might want to refetch or update the specific notification in the list
      //   fetchNotifications(); // Simplest way, or more targeted update
      // }
    });

    return () => {
      console.log("NotificationContext: Cleaning up Appwrite subscription.");
      unsubscribeFn();
    };
  }, [DATABASE_ID, NOTIFY_COLLECTION_ID, currentUser, addNotification]); // addNotification is a dependency for the subscription effect

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