import { useEffect, useState, useRef } from "react";
import {
  Client,
  Account,
  Databases,
  Models,
  Query,
} from "appwrite";
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
// Add other collection IDs as needed
// const parentCollectionId = "coll-parent";
// const facultyCollectionId = "coll-faculty";
// const announcementCollectionId = "coll-announcements"; // Example

// --- Type Definitions ---

// Specific document types (expand as needed)
type StudentDoc = Models.Document & {
  name: string;
  class: string;
  section: string;
  stdEmail: string;
  parentId: string;
  absent: string[]; // Array of date strings
};

// Generic structure for notifications in the UI state
interface NotificationItem {
  id: string; // Unique ID for React key (e.g., type-docId-timestamp)
  type: 'absence' | 'announcement' | 'message' | 'assignment' | 'other'; // Expandable type
  title: string;
  body: string;
  timestamp: string; // ISO string format recommended
  relatedDocId?: string; // ID of the source document (e.g., student.$id)
  isRead?: boolean; // Optional: for future read/unread status
  data?: any; // Optional: any extra data associated with the notification
}

// --- Component ---

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'parent' | 'faculty' | 'unknown'>('unknown');

  // Store unsubscribe functions for cleanup
  const unsubscribeFunctionsRef = useRef<(() => void)[]>([]);

  // --- Generic Desktop Notification Function ---
  const showDesktopNotification = async (title: string, body: string) => {
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
  };

  // --- Effect for Initialization and Subscriptions ---
  useEffect(() => {
    const initializeAndSubscribe = async () => {
      setIsLoading(true);
      setError(null);
      unsubscribeFunctionsRef.current = []; // Clear previous unsubscribers

      try {
        // 1. Get Logged-in User
        const user = await account.get();
        setCurrentUser(user);
        const userEmail = user.email;

        // 2. Determine User Role (Simplified Example - Needs Robust Logic)
        // This is crucial and might involve checking labels or querying multiple collections.
        // For now, we assume if we find them in student collection, they are a student.
        try {
          const studentRes = await databases.listDocuments(databaseId, studentCollectionId, [Query.equal("stdEmail", userEmail), Query.limit(1)]);
          if (studentRes.documents.length > 0) {
            setUserRole('student');
            const studentDoc = studentRes.documents[0] as StudentDoc;
            await setupStudentSubscriptions(studentDoc);
            // Pre-populate with existing absences as notifications
            populateInitialAbsences(studentDoc);
          } else {
             // TODO: Check if parent, then faculty...
             console.warn("User role could not be determined (checking student only).");
             setUserRole('unknown');
             setError("Could not determine user role or find associated data.");
          }
        } catch (roleError) {
             console.error("Error determining user role:", roleError);
             setError("Error checking user role.");
             setUserRole('unknown');
        }

        // TODO: Add similar logic for 'parent', 'faculty' roles
        // if (userRole === 'parent') { await setupParentSubscriptions(user); }
        // if (userRole === 'faculty') { await setupFacultySubscriptions(user); }


        setIsLoading(false);

      } catch (err: any) {
        console.error("Initialization Error:", err);
        setError(`Failed to initialize: ${err.message || 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    initializeAndSubscribe();

    // Cleanup function
    return () => {
      console.log("Cleaning up subscriptions...");
      unsubscribeFunctionsRef.current.forEach(unsub => {
        try {
          unsub();
        } catch (unsubError) {
          console.error("Error during unsubscribe:", unsubError);
        }
      });
      unsubscribeFunctionsRef.current = [];
    };
  }, []); // Run only on mount

  // --- Data Processing and Subscription Setup Functions ---

  const populateInitialAbsences = (studentDoc: StudentDoc) => {
     const initialAbsenceNotifications: NotificationItem[] = (studentDoc.absent || []).map(date => ({
         id: `absence-${studentDoc.$id}-${date}`, // Simple initial ID
         type: 'absence',
         title: 'Absence Recorded',
         body: `${studentDoc.name} was marked absent on ${date}.`,
         timestamp: studentDoc.$updatedAt, // Use doc update time initially
         relatedDocId: studentDoc.$id,
         isRead: true, // Assume initially loaded absences are "read" or known
     }));
     // Add to state, maybe sort later if needed
     setNotifications(prev => [...initialAbsenceNotifications, ...prev]);
  };


  const setupStudentSubscriptions = async (studentDoc: StudentDoc) => {
    const studentDocId = studentDoc.$id;
    const storageKey = `absent_notified_${studentDocId}`; // Key for desktop notification tracking

    // Subscribe to the specific student document
    const subscriptionString = `databases.${databaseId}.collections.${studentCollectionId}.documents.${studentDocId}`;
    console.log("Subscribing to student document:", subscriptionString);

    try {
        const unsubscribe = client.subscribe(subscriptionString, response => {
            if (response.events.some(e => e.includes('.update'))) {
                console.log("Received student update:", response.payload);
                const updatedStudent = response.payload as StudentDoc;

                // --- Absence Update Logic ---
                const storedNotifiedAbsents: string[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
                const currentAbsents = updatedStudent.absent || [];
                const newAbsences = currentAbsents.filter(date => !storedNotifiedAbsents.includes(date));

                if (newAbsences.length > 0) {
                    console.log("Detected new absences:", newAbsences);
                    const newNotifications: NotificationItem[] = [];

                    for (const date of newAbsences) {
                        const newNotification: NotificationItem = {
                            id: `absence-${updatedStudent.$id}-${date}-${Date.now()}`, // More unique ID
                            type: 'absence',
                            title: '🚨 New Absence Alert',
                            body: `${updatedStudent.name} was marked absent on ${date}`,
                            timestamp: new Date().toISOString(),
                            relatedDocId: updatedStudent.$id,
                            isRead: false // New notifications are unread
                        };
                        newNotifications.push(newNotification);

                        // Trigger desktop notification
                        showDesktopNotification(newNotification.title, newNotification.body);
                    }

                    // Add new notifications to the beginning of the state array
                    setNotifications(prev => [...newNotifications, ...prev]);

                    // Update localStorage *after* processing, only storing notified dates
                    localStorage.setItem(storageKey, JSON.stringify(currentAbsents));
                 } else {
                     // Optional: If absences were removed, you might want to update localStorage
                     // This prevents re-notifying if an absence is removed then re-added later.
                      if (JSON.stringify(currentAbsents) !== JSON.stringify(storedNotifiedAbsents)) {
                         localStorage.setItem(storageKey, JSON.stringify(currentAbsents));
                     }
                 }

                // TODO: Add logic here to check for other changes in the student doc
                // e.g., if a 'grades' field was updated, create a 'grade' notification.
                // Check `response.payload` against previous state or specific fields.
            }
            // TODO: Handle other events like 'delete' if necessary
        });

        unsubscribeFunctionsRef.current.push(unsubscribe); // Store for cleanup
    } catch (subError) {
         console.error(`Failed to subscribe to ${subscriptionString}:`, subError);
         setError(`Subscription failed for student ${studentDoc.name || studentDocId}`);
    }

     // TODO: Subscribe to other relevant sources for a student
     // e.g., subscribe to general announcements collection filtered by class/section?
     // const unsubscribeAnnouncements = client.subscribe(...)
     // unsubscribeFunctionsRef.current.push(unsubscribeAnnouncements);
  };

  // --- TODO: Implement setupParentSubscriptions / setupFacultySubscriptions ---
  // These would involve:
  // - Fetching related data (e.g., parent's students, faculty's classes)
  // - Setting up potentially multiple subscriptions (e.g., one per child for a parent)
  // - Handling updates from those subscriptions and formatting them into NotificationItem

  // --- Render Logic ---
  return (
    <div className="max-w-lg mx-auto mt-8 p-4 sm:p-6 bg-gray-50 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-center text-gray-700">
        <span role="img" aria-label="bell">🔔</span> Notification Center
      </h2>

      {isLoading ? (
        <p className="text-center text-gray-500">Loading notifications...</p>
      ) : error ? (
        <p className="text-center text-red-600 bg-red-100 p-3 rounded-md">{error}</p>
      ) : notifications.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No new notifications ✅</p>
      ) : (
        <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {notifications
             // Optional: Sort notifications by timestamp descending
             .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
             .map((notification) => (
                <li
                  key={notification.id}
                  className={`p-3 rounded-md shadow-sm border ${
                    notification.type === 'absence' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                  } ${notification.isRead === false ? 'font-semibold' : 'opacity-80'}`} // Example styling for unread
                >
                  <div className="flex justify-between items-center mb-1">
                     <span className={`text-sm font-medium ${notification.type === 'absence' ? 'text-red-800' : 'text-blue-800'}`}>
                       {notification.title}
                       {/* Simple icon based on type */}
                       {notification.type === 'absence' && <span className="ml-1" role="img" aria-label="alert">🚨</span>}
                     </span>
                     <span className="text-xs text-gray-500">
                       {new Date(notification.timestamp).toLocaleString()}
                     </span>
                  </div>
                  <p className={`text-sm ${notification.type === 'absence' ? 'text-red-700' : 'text-gray-700'}`}>
                    {notification.body}
                  </p>
                  {/* Optionally add actions like 'Mark as read' or 'View Details' */}
                </li>
             ))}
        </ul>
      )}
    </div>
  );
};