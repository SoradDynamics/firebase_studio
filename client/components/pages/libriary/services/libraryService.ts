// src/services/libraryService.ts
import { databases, iD, Query } from '~/utils/appwrite';
import {
  APPWRITE_DATABASE_ID,
  BOOK_GENRES_COLLECTION_ID,
  BOOKS_COLLECTION_ID,
  BOOK_BORROWINGS_COLLECTION_ID,
} from '../constants/appwriteIds';
import type { Document } from 'types/appwrite';
import type { BookGenre, Book, BookBorrowing, UserType } from 'types/library';
import { createNotification } from './notificationService';
import { useCurrentUser } from '../hooks/useCurrentUser'; // Used to get current user email

// --- Genre Service ---
export const fetchGenres = async (): Promise<Document<BookGenre>[]> => {
  if (!BOOK_GENRES_COLLECTION_ID) throw new Error("Genre Collection ID not defined");
  const response = await databases.listDocuments<Document<BookGenre>>(APPWRITE_DATABASE_ID!, BOOK_GENRES_COLLECTION_ID!);
  return response.documents;
};

export const addGenre = async (genreData: Omit<BookGenre, '$id'>): Promise<Document<BookGenre>> => {
  if (!BOOK_GENRES_COLLECTION_ID) throw new Error("Genre Collection ID not defined");
  return databases.createDocument<Document<BookGenre>>(
    APPWRITE_DATABASE_ID!,
    BOOK_GENRES_COLLECTION_ID!,
    iD.unique(),
    genreData
  );
};

export const updateGenre = async (id: string, genreData: Partial<BookGenre>): Promise<Document<BookGenre>> => {
  if (!BOOK_GENRES_COLLECTION_ID) throw new Error("Genre Collection ID not defined");
  return databases.updateDocument<Document<BookGenre>>(
    APPWRITE_DATABASE_ID!,
    BOOK_GENRES_COLLECTION_ID!,
    id,
    genreData
  );
};

export const deleteGenre = async (id: string): Promise<void> => {
  if (!BOOK_GENRES_COLLECTION_ID) throw new Error("Genre Collection ID not defined");
  // Consider checking if genre is in use by any books before deleting
  await databases.deleteDocument(APPWRITE_DATABASE_ID!, BOOK_GENRES_COLLECTION_ID!, id);
};

// --- Book Service ---
export const fetchBooks = async (searchTerm?: string): Promise<Document<Book>[]> => {
  if (!BOOKS_COLLECTION_ID) throw new Error("Books Collection ID not defined");
  const queries = searchTerm ? [Query.search('name', searchTerm), Query.limit(25)] : [Query.limit(25)]; // Add pagination later
  const response = await databases.listDocuments<Document<Book>>(APPWRITE_DATABASE_ID!, BOOKS_COLLECTION_ID!, queries);
  return response.documents;
};

export const fetchBookById = async (id: string): Promise<Document<Book> | null> => {
  if (!BOOKS_COLLECTION_ID) throw new Error("Books Collection ID not defined");
  try {
    return await databases.getDocument<Document<Book>>(APPWRITE_DATABASE_ID!, BOOKS_COLLECTION_ID!, id);
  } catch (error) {
    console.error("Error fetching book by ID:", error);
    return null;
  }
};


export const addBook = async (bookData: Omit<Book, '$id' | 'availableCopies'>): Promise<Document<Book>> => {
  if (!BOOKS_COLLECTION_ID) throw new Error("Books Collection ID not defined");
  return databases.createDocument<Document<Book>>(
    APPWRITE_DATABASE_ID!,
    BOOKS_COLLECTION_ID!,
    iD.unique(),
    { ...bookData, availableCopies: bookData.totalCopies } // Initially, all copies are available
  );
};

export const updateBook = async (id: string, bookData: Partial<Book>): Promise<Document<Book>> => {
  if (!BOOKS_COLLECTION_ID) throw new Error("Books Collection ID not defined");
  // If totalCopies is updated, availableCopies might need adjustment if it exceeds new total.
  // This logic can be complex if books are currently borrowed.
  // For simplicity, we assume direct update or handle this in the UI/store layer.
  return databases.updateDocument<Document<Book>>(
    APPWRITE_DATABASE_ID!,
    BOOKS_COLLECTION_ID!,
    id,
    bookData
  );
};

export const deleteBook = async (id: string): Promise<void> => {
  if (!BOOKS_COLLECTION_ID) throw new Error("Books Collection ID not defined");
  // Consider checking if book has active borrowings before deleting
  await databases.deleteDocument(APPWRITE_DATABASE_ID!, BOOKS_COLLECTION_ID!, id);
};

// --- Book Borrowing Service ---
export const fetchBorrowedBooks = async (filters?: { userId?: string; status?: 'borrowed' | 'returned' }): Promise<Document<BookBorrowing>[]> => {
  if (!BOOK_BORROWINGS_COLLECTION_ID) throw new Error("Borrowings Collection ID not defined");
  const queries: string[] = [Query.orderDesc('borrowDate')]; // Default sort
  if (filters?.userId) queries.push(Query.equal('userId', filters.userId));
  if (filters?.status) queries.push(Query.equal('status', filters.status));
  
  const response = await databases.listDocuments<Document<BookBorrowing>>(APPWRITE_DATABASE_ID!, BOOK_BORROWINGS_COLLECTION_ID!, queries);
  return response.documents;
};

export const borrowBook = async (
  borrowData: Omit<BookBorrowing, '$id' | 'status' | 'borrowedByStaffEmail'>,
  bookToUpdate: { id: string, availableCopies: number },
  borrowerAppwriteId: string, // The Appwrite $id of the student/teacher document
  borrowerCustomId: string, // The custom 'id' field of student/teacher
  bookName: string,
  staffEmail: string
): Promise<Document<BookBorrowing>> => {
  if (!BOOK_BORROWINGS_COLLECTION_ID || !BOOKS_COLLECTION_ID) throw new Error("Collection ID not defined for borrowing/books");

  if (bookToUpdate.availableCopies <= 0) {
    throw new Error('Book not available for borrowing.');
  }

  // 1. Create borrowing record
  const newBorrowing = await databases.createDocument<Document<BookBorrowing>>(
    APPWRITE_DATABASE_ID!,
    BOOK_BORROWINGS_COLLECTION_ID!,
    iD.unique(),
    { ...borrowData, status: 'borrowed', borrowedByStaffEmail: staffEmail }
  );

  // 2. Update book's availableCopies
  await databases.updateDocument(
    APPWRITE_DATABASE_ID!,
    BOOKS_COLLECTION_ID!,
    bookToUpdate.id,
    { availableCopies: bookToUpdate.availableCopies - 1 }
  );

  // 3. Send notification
  // The `to` field in coll-notify needs the specific user document ID (from your schema, not Appwrite's $id for the user document)
  // The prompt says "id of that user (there is seprate column named id in db use that column value for this id)"
  await createNotification({
    title: `Book Borrowed: ${bookName}`,
    msg: `The book "${bookName}" has been borrowed by you. Due date is ${new Date(borrowData.dueDate).toLocaleDateString()}.`,
    to: `id:${borrowerCustomId}`, // Use the custom 'id' field
  });

  return newBorrowing;
};

export const returnBook = async (
  borrowingId: string,
  bookToUpdate: { id: string, availableCopies: number, totalCopies: number },
  borrowerAppwriteId: string, // The Appwrite $id of the student/teacher document
  borrowerCustomId: string, // The custom 'id' field of student/teacher
  bookName: string,
  staffEmail: string
): Promise<Document<BookBorrowing>> => {
  if (!BOOK_BORROWINGS_COLLECTION_ID || !BOOKS_COLLECTION_ID) throw new Error("Collection ID not defined for borrowing/books");

  // 1. Update borrowing record
  const updatedBorrowing = await databases.updateDocument<Document<BookBorrowing>>(
    APPWRITE_DATABASE_ID!,
    BOOK_BORROWINGS_COLLECTION_ID!,
    borrowingId,
    { status: 'returned', returnDate: new Date().toISOString(), returnedByStaffEmail: staffEmail }
  );

  // 2. Update book's availableCopies (ensure it doesn't exceed totalCopies)
  const newAvailableCopies = Math.min(bookToUpdate.availableCopies + 1, bookToUpdate.totalCopies);
  await databases.updateDocument(
    APPWRITE_DATABASE_ID!,
    BOOKS_COLLECTION_ID!,
    bookToUpdate.id,
    { availableCopies: newAvailableCopies }
  );

  // 3. Send notification
  await createNotification({
    title: `Book Returned: ${bookName}`,
    msg: `The book "${bookName}" has been successfully returned. Thank you!`,
    to: `id:${borrowerCustomId}`, // Use the custom 'id' field
  });

  return updatedBorrowing;
};

// For Dashboard: Fetch all borrowings (potentially large, consider pagination or specific queries)
export const fetchAllBorrowingsForDashboard = async (): Promise<Document<BookBorrowing>[]> => {
    if (!BOOK_BORROWINGS_COLLECTION_ID) throw new Error("Borrowings Collection ID not defined");
    // This could be a lot of data. For a real dashboard, you'd use aggregated queries if Appwrite supports them,
    // or fetch in chunks, or pre-aggregate data.
    // For now, fetching all with a reasonable limit for demonstration.
    const response = await databases.listDocuments<Document<BookBorrowing>>(
        APPWRITE_DATABASE_ID!,
        BOOK_BORROWINGS_COLLECTION_ID!,
        [Query.limit(500)] // Adjust limit as needed
    );
    return response.documents;
};