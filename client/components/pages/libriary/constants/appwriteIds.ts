// src/constants/appwriteIds.ts
export const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;

// Existing Collections from your utils/appwrite.ts
export const FACULTIES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_FACULTY_COLLECTION_ID;
export const SECTIONS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_SECTION_COLLECTION_ID;
export const STUDENTS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID;
export const NOTIFICATIONS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_NOTIFY_COLLECTION_ID;
// Assuming coll-teacher ID is defined in .env
export const TEACHERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_TEACHER_COLLECTION_ID;


// Library Specific Collections
export const BOOK_GENRES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_BOOK_GENRES_COLLECTION_ID;
export const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_BOOKS_COLLECTION_ID;
export const BOOK_BORROWINGS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_BOOK_BORROWINGS_COLLECTION_ID;

// Ensure these VITE_ variables are in your .env file