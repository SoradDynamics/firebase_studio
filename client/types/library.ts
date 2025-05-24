import { AppwriteDocument } from "./models";

// src/types/library.ts
export interface BookGenre {
    $id?: string;
    name: string;
    description?: string;
  }
  
  export interface Book {
    $id?: string;
    customBookId: string;
    name: string;
    author: string;
    year?: string | null;
    genreId: string;
    genreName?: string; // For display purposes, populated after fetching
    location?: string;
    totalCopies: number;
    availableCopies: number;
    coverImageId?: string;
  }
  
  export type UserType = 'student' | 'teacher';
  
  export interface LibraryUser { // Generic user for borrowing
    $id: string;
    name: string;
    email?: string; // student might have stdEmail, teacher has email
    type: UserType;
    class?: string; // For students
    facultyId?: string; // For students
  }
  
  export interface BookBorrowing {
    $id?: string;
    bookId: string;
    bookName?: string; // For display
    userId: string;
    userName?: string; // For display
    userType: UserType;
    borrowDate: string; // ISO Date string
    dueDate: string;    // ISO Date string
    returnDate?: string | null; // ISO Date string
    status: 'borrowed' | 'returned'; // 'overdue' will be calculated on frontend
    borrowedByStaffEmail: string;
    returnedByStaffEmail?: string | null;
  }

  export interface LibraryUser {
    $id: string; // Appwrite document ID
    id: string; // Your custom ID
    name: string;
    email?: string;
    type: UserType;
    class?: string;
    facultyId?: string;
    isLibraryMember?: boolean; // Add this
  }


export interface LibraryUser {
  $id: string; // This is the Appwrite Document ID
  id: string; // This is your custom unique ID (e.g., admission_no, employee_id)
  name: string;
  email?: string;
  type: UserType;
  class?: string; // For students
  facultyId?: string; // For students
  isLibraryMember?: boolean; // <<<< ADD THIS OR ENSURE IT EXISTS
}

export interface BookInBorrowCart extends AppwriteDocument {
  bsDueDate?: string;       // BS Due Date entered by user for this specific book
  adDueDate?: string | null; // Converted AD Due Date for this specific book
}