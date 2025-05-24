// ~/utils/notification.ts
import { databases, ID, APPWRITE_DATABASE_ID, NOTIFICATIONS_COLLECTION_ID } from '~/utils/appwrite';
// Potentially import getCurrentUserEmail if you want the service to fetch it,
// or pass it as an argument as we'll do initially for more direct control from the caller.
// import { getCurrentUserEmail } from '~/utils/appwrite';

export interface NotificationData {
  title: string;
  msg: string;
  to: string[]; // Array of target IDs (e.g., student Appwrite User IDs or student document $IDs)
  valid: string; // Date string "YYYY-MM-DD"
  sender: string; // Email of the sender (logged-in user)
  // Add any other fields relevant to your coll-notify schema
  // e.g., type: 'leave_status_update', read: false, etc.
}

/**
 * Creates a new notification document in the 'coll-notify' collection.
 *
 * @param notificationPayload - The data for the notification.
 * @returns The created notification document.
 * @throws Will throw an error if the Appwrite request fails.
 */
export const createNotificationEntry = async (notificationPayload: NotificationData): Promise<any> => {
  if (!APPWRITE_DATABASE_ID || !NOTIFICATIONS_COLLECTION_ID) {
    console.error('Database ID or Notifications Collection ID is not configured.');
    throw new Error('Notification service is not properly configured.');
  }

  console.log('[NotificationService] Creating notification with payload:', notificationPayload);

  try {
    const document = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      NOTIFICATIONS_COLLECTION_ID,
      ID.unique(), // Appwrite generates a unique ID for the document
      {
        ...notificationPayload,
        // Ensure 'to' is an array of strings as per your schema `to[]`
        // If notificationPayload.to is already string[], this is fine.
        // If it could be a single string, you might need:
        // to: Array.isArray(notificationPayload.to) ? notificationPayload.to : [notificationPayload.to],
      }
    );
    console.log('[NotificationService] Notification created successfully:', document);
    return document;
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

/**
 * Generates tomorrow's date in YYYY-MM-DD format.
 * @returns Date string for tomorrow.
 */
export const getTomorrowDateString = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};