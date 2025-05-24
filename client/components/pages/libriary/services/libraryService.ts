// src/services/libraryService.ts
import { databases, iD as AppwriteID, Query, getCurrentUserEmail } from '~/utils/appwrite';
import {
  APPWRITE_DATABASE_ID,
  BOOKS_COLLECTION_ID,
  BOOK_BORROWINGS_COLLECTION_ID,
  BOOK_GENRES_COLLECTION_ID
  // Ensure BOOK_GENRES_COLLECTION_ID is here if you use genre services from this file
} from '../constants/appwriteIds';
import type { Document as AppwriteDocumentType } from 'types/appwrite';
import type { Book, BookBorrowing, BookGenre } from 'types/library'; // Assuming BookGenre might be used
import { createNotificationEntry, NotificationData } from '../utils/notification'; // Ensure this path is correct
import { getTomorrowADDateString, convertADtoBS } from '../utils/dateConverter'; // Using from dateConverter


export const fetchAllBorrowingsForDashboard = async (limit: number = 500): Promise<AppwriteDocumentType<BookBorrowing>[]> => {
  if (!BOOK_BORROWINGS_COLLECTION_ID || !APPWRITE_DATABASE_ID) {
    console.error("fetchAllBorrowingsForDashboard: Collection or DB ID not defined.");
    return [];
  }
  try {
    const response = await databases.listDocuments<AppwriteDocumentType<BookBorrowing>>(
      APPWRITE_DATABASE_ID,
      BOOK_BORROWINGS_COLLECTION_ID,
      [
        Query.limit(limit), // Fetch a significant number for dashboard aggregation
        Query.orderDesc('$createdAt') // Or another relevant order
      ]
    );
    return response.documents;
  } catch (error) {
    console.error("Error fetching all borrowings for dashboard from service:", error);
    throw error; // Or return [], depending on how you want to handle errors in the store
  }
};
// --- Book Genre Service Functions (if they belong here) ---
// Example:
// export const fetchGenres = async (): Promise<AppwriteDocumentType<BookGenre>[]> => { /* ... */ };

export const fetchGenres = async (): Promise<AppwriteDocumentType<BookGenre>[]> => {
  if (!BOOK_GENRES_COLLECTION_ID || !APPWRITE_DATABASE_ID) {
    console.error("fetchGenres: Book Genres Collection ID or DB ID is not defined.");
    // throw new Error("Genre service not configured."); // Or return empty array
    return [];
  }
  try {
    const response = await databases.listDocuments<AppwriteDocumentType<BookGenre>>(
      APPWRITE_DATABASE_ID,
      BOOK_GENRES_COLLECTION_ID
      // Add Query.limit(100) or similar if you have many genres
    );
    return response.documents;
  } catch (error) {
    console.error("Error fetching genres from service:", error);
    throw error; // Re-throw to be caught by store/component
  }
};

// --- Book Service Functions ---
export const fetchBookById = async (appwriteBookId: string): Promise<AppwriteDocumentType<Book> | null> => {
  if (!BOOKS_COLLECTION_ID || !APPWRITE_DATABASE_ID) {
      console.error("fetchBookById: Books Collection or DB ID not defined");
      return null;
  }
  try {
    const doc = await databases.getDocument<AppwriteDocumentType<Book>>(APPWRITE_DATABASE_ID, BOOKS_COLLECTION_ID, appwriteBookId);
    return doc;
  } catch (error) {
    if ((error as any).code !== 404) {
        console.error(`Error fetching book by ID ${appwriteBookId}:`, error);
    }
    return null;
  }
};

export const fetchBooks = async (searchTerm?: string, limit: number = 25): Promise<AppwriteDocumentType<Book>[]> => {
  if (!BOOKS_COLLECTION_ID || !APPWRITE_DATABASE_ID) {
    console.error("fetchBooks: Collection or DB ID not defined.");
    return [];
  }
  const queries: string[] = [Query.limit(limit), Query.orderDesc('$createdAt')];
  if (searchTerm && searchTerm.trim()) {
    queries.push(Query.search('name', searchTerm.trim())); // Example: search by name
  }
  
  try {
    const response = await databases.listDocuments<AppwriteDocumentType<Book>>(
      APPWRITE_DATABASE_ID,
      BOOKS_COLLECTION_ID,
      queries
    );
    return response.documents;
  } catch (error) {
    console.error("Error fetching books:", error);
    return [];
  }
};
// ... (addBook, updateBook, deleteBook services if not already present elsewhere)


// --- Book Borrowing Service Functions ---
export const fetchBorrowedBooks = async (filters?: { userId?: string; status?: 'borrowed' | 'returned' }): Promise<AppwriteDocumentType<BookBorrowing>[]> => {
    if (!BOOK_BORROWINGS_COLLECTION_ID || !APPWRITE_DATABASE_ID) {
        console.error("fetchBorrowedBooks: Collection or DB ID not defined.");
        return [];
    }
    const queries: string[] = [Query.orderDesc('borrowDate')]; // Changed from $createdAt for relevance
    if (filters?.userId) {
        // 'userId' in coll-book-borrowings stores the custom ID (e.g., S001)
        queries.push(Query.equal('userId', filters.userId)); 
    }
    if (filters?.status) {
        queries.push(Query.equal('status', filters.status));
    }
    queries.push(Query.limit(100)); 

    try {
        const response = await databases.listDocuments<AppwriteDocumentType<BookBorrowing>>(
            APPWRITE_DATABASE_ID,
            BOOK_BORROWINGS_COLLECTION_ID,
            queries
        );
        return response.documents;
    } catch (error) {
        console.error("Error fetching borrowed books:", error);
        return [];
    }
};

export const borrowBook = async (
  borrowData: Omit<BookBorrowing, '$id' | 'status' | 'borrowedByStaffEmail' | 'bookName' | 'userName' | '$permissions' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt'>,
  bookToUpdate: { id: string, availableCopies: number }, // id here is book's Appwrite $id
  borrowerCustomId: string, // User's custom 'id' field (e.g., S001) for notification 'to' field
  bookName: string
  // staffEmail is implicitly taken from logged-in user via getCurrentUserEmail
): Promise<AppwriteDocumentType<BookBorrowing>> => {
  if (!BOOK_BORROWINGS_COLLECTION_ID || !BOOKS_COLLECTION_ID || !APPWRITE_DATABASE_ID) {
    throw new Error("borrowBook: Critical Appwrite IDs are not defined.");
  }

  if (bookToUpdate.availableCopies <= 0) {
    throw new Error(`Book "${bookName}" (ID: ${bookToUpdate.id}) is not available for borrowing.`);
  }

  const staffEmail = await getCurrentUserEmail();
  if (!staffEmail) {
    console.warn('[LibraryService] borrowBook: Could not get sender email. Borrowing will proceed without sender info on record.');
    // Depending on strictness, you might want to throw an error here:
    // throw new Error("Could not identify staff member for borrowing record.");
  }

  console.log('[LibraryService] borrowBook initiated for:', { bookName, borrowerCustomId, dueDateAD: borrowData.dueDate });
  
  const newBorrowingDoc = await databases.createDocument<AppwriteDocumentType<BookBorrowing>>(
    APPWRITE_DATABASE_ID,
    BOOK_BORROWINGS_COLLECTION_ID,
    AppwriteID.unique(),
    { 
        ...borrowData, // Contains bookId (Appwrite $id), userId (custom S001), userType, borrowDate, dueDate
        status: 'borrowed', 
        borrowedByStaffEmail: staffEmail || 'unknown_staff' // Use fetched email or a placeholder
    }
  );
  console.log('[LibraryService] Borrowing record created:', newBorrowingDoc.$id);

  await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    BOOKS_COLLECTION_ID,
    bookToUpdate.id, // This is book's Appwrite $id
    { availableCopies: bookToUpdate.availableCopies - 1 }
  );
  console.log('[LibraryService] Book availableCopies updated for book:', bookToUpdate.id);

  // --- Create Notification ---
  if (staffEmail) { // Only send notification if sender is identified
    try {
        const notificationPayload: NotificationData = {
            title: `Book Borrowed: ${bookName}`,
            // Using convertADtoBS to show BS date in the notification message
            msg: `The book "${bookName}" has been borrowed. Due Date: ${convertADtoBS(borrowData.dueDate)}.`,
            to: [`id:${borrowerCustomId}`], // Format as per your schema: "id:USER_CUSTOM_ID"
            valid: getTomorrowADDateString(), // Using from dateConverter
            sender: staffEmail,
            date: new Date().toISOString(), // Add creation date to notification
        };
        await createNotificationEntry(notificationPayload);
        console.log('[LibraryService] Borrow notification sent for user custom ID:', borrowerCustomId);
    } catch(notificationError) {
        console.error('[LibraryService] Failed to send borrow notification:', notificationError);
    }
  } else {
      console.warn("[LibraryService] Skipping borrow notification due to missing staff email.");
  }

  return newBorrowingDoc;
};

export const returnBook = async (
  borrowingAppwriteId: string, // Appwrite $id of the BookBorrowing document
  bookToUpdate: { id: string, availableCopies: number, totalCopies: number }, // id is book's Appwrite $id
  borrowerCustomId: string, // User's custom 'id' field for notification
  bookName: string
  // staffEmail is implicitly taken from logged-in user via getCurrentUserEmail
): Promise<AppwriteDocumentType<BookBorrowing>> => {
  if (!BOOK_BORROWINGS_COLLECTION_ID || !BOOKS_COLLECTION_ID || !APPWRITE_DATABASE_ID) {
    throw new Error("returnBook: Critical Appwrite IDs are not defined.");
  }

  const staffEmail = await getCurrentUserEmail();
  if (!staffEmail) {
    console.warn('[LibraryService] returnBook: Could not get sender email. Return will proceed without sender info on record.');
  }
  
  console.log('[LibraryService] returnBook initiated for borrowing ID:', borrowingAppwriteId);

  const updatedBorrowingDoc = await databases.updateDocument<AppwriteDocumentType<BookBorrowing>>(
    APPWRITE_DATABASE_ID,
    BOOK_BORROWINGS_COLLECTION_ID,
    borrowingAppwriteId,
    { 
        status: 'returned', 
        returnDate: new Date().toISOString(), 
        returnedByStaffEmail: staffEmail || 'unknown_staff' 
    }
  );
  console.log('[LibraryService] Borrowing record status updated to returned:', updatedBorrowingDoc.$id);

  const newAvailableCopies = Math.min(bookToUpdate.availableCopies + 1, bookToUpdate.totalCopies);
  await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    BOOKS_COLLECTION_ID,
    bookToUpdate.id, // This is book's Appwrite $id
    { availableCopies: newAvailableCopies }
  );
  console.log('[LibraryService] Book availableCopies updated for book:', bookToUpdate.id);

  // --- Create Notification ---
  if (staffEmail) {
    try {
        const notificationPayload: NotificationData = {
            title: `Book Returned: ${bookName}`,
            msg: `The book "${bookName}" has been successfully returned. Thank you!`,
            to: [`id:${borrowerCustomId}`],
            valid: getTomorrowADDateString(),
            sender: staffEmail,
            date: new Date().toISOString(),
        };
        await createNotificationEntry(notificationPayload);
        console.log('[LibraryService] Return notification sent for user custom ID:', borrowerCustomId);
    } catch(notificationError) {
        console.error('[LibraryService] Failed to send return notification:', notificationError);
    }
  } else {
      console.warn("[LibraryService] Skipping return notification due to missing staff email.");
  }
  
  return updatedBorrowingDoc;
};