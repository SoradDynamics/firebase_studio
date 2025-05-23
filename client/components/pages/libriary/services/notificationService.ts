// src/services/notificationService.ts
import { databases, iD, getCurrentUserEmail } from '~/utils/appwrite';
import { APPWRITE_DATABASE_ID, NOTIFICATIONS_COLLECTION_ID } from '../constants/appwriteIds';
import { getTomorrowDateString } from '../utils/helpers';

interface CreateNotificationParams {
  title: string;
  msg: string;
  to: string; // Should be in the format "id:USER_DOCUMENT_ID"
}

export const createNotification = async ({ title, msg, to }: CreateNotificationParams): Promise<void> => {
  try {
    const senderEmail = await getCurrentUserEmail();
    if (!senderEmail) {
      console.error("Notification Service: Sender email could not be retrieved.");
      throw new Error("Sender email not found.");
    }

    await databases.createDocument(
      APPWRITE_DATABASE_ID!,
      NOTIFICATIONS_COLLECTION_ID!,
      iD.unique(),
      {
        title,
        msg,
        to: [to], //coll-notify schema suggests `to` is an array of strings
        sender: senderEmail,
        valid: getTomorrowDateString(),
        date: new Date().toISOString(), // Assuming 'date' is creation date
      }
    );
    console.log('Notification created successfully for:', to);
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};