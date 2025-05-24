// src/store/libraryStore.ts
import { create } from 'zustand';
import type { Document } from 'types/appwrite';
import type { BookGenre, Book, BookBorrowing, LibraryUser } from 'types/library';
import * as libraryService from '../../components/pages/libriary/services/libraryService';
import * as userService from '../../components/pages/libriary/services/userService';

interface LibraryState {
  // Genres
  genres: Document<BookGenre>[];
  isLoadingGenres: boolean;
  fetchGenres: () => Promise<void>;
  addGenre: (genreData: Omit<BookGenre, '$id'>) => Promise<Document<BookGenre> | void>;
  updateGenre: (id: string, genreData: Partial<BookGenre>) => Promise<void>;
  deleteGenre: (id: string) => Promise<void>;

  // Books
  books: Document<Book>[];
  isLoadingBooks: boolean;
  fetchBooks: (searchTerm?: string) => Promise<void>;
  addBook: (bookData: Omit<Book, '$id' | 'availableCopies' | 'genreName'>) => Promise<Document<Book> | void>;
  updateBook: (id: string, bookData: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  getBookById: (id: string) => Promise<Document<Book> | null>;


  // Borrowings
  borrowings: Document<BookBorrowing>[];
  isLoadingBorrowings: boolean;
  fetchBorrowings: (filters?: { userId?: string; status?: 'borrowed' | 'returned' }) => Promise<void>;
  borrowBook: (
    borrowData: Omit<BookBorrowing, '$id' | 'status' | 'borrowedByStaffEmail' | 'bookName' | 'userName'>,
    bookToUpdate: { id: string, availableCopies: number },
    borrowerAppwriteId: string, // Appwrite $id for the user document
    borrowerCustomId: string, // Custom 'id' for notification
    bookName: string,
    staffEmail: string
  ) => Promise<void>;
  returnBook: (
    borrowingId: string,
    bookToUpdate: { id: string, availableCopies: number, totalCopies: number },
    borrowerAppwriteId: string, // Appwrite $id for the user document
    borrowerCustomId: string, // Custom 'id' for notification
    bookName: string,
    staffEmail: string
  ) => Promise<void>;

  // Users for borrowing
  searchedUsers: LibraryUser[];
  isSearchingUsers: boolean;
  searchUsers: (searchTerm: string, userType: 'student' | 'teacher') => Promise<void>;
  clearSearchedUsers: () => void;

  // Dashboard specific
  allBorrowingsForDashboard: Document<BookBorrowing>[];
  isLoadingAllBorrowings: boolean;
  fetchAllBorrowingsForDashboard: () => Promise<void>;
  faculties: {id: string, name: string}[];
  fetchFacultiesForDashboard: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  // Genres
  genres: [],
  isLoadingGenres: false,
  fetchGenres: async () => {
    set({ isLoadingGenres: true });
    try {
      const genres = await libraryService.fetchGenres();
      set({ genres, isLoadingGenres: false });
    } catch (error) {
      console.error("Error fetching genres:", error);
      set({ isLoadingGenres: false });
      throw error;
    }
  },
  addGenre: async (genreData) => {
    // No loading state for singular actions, handled by UI
    try {
      const newGenre = await libraryService.addGenre(genreData);
      set((state) => ({ genres: [...state.genres, newGenre] }));
      return newGenre;
    } catch (error) {
      console.error("Error adding genre:", error);
      throw error;
    }
  },
  updateGenre: async (id, genreData) => {
    try {
      const updatedGenre = await libraryService.updateGenre(id, genreData);
      set((state) => ({
        genres: state.genres.map((g) => (g.$id === id ? updatedGenre : g)),
      }));
    } catch (error) {
      console.error("Error updating genre:", error);
      throw error;
    }
  },
  deleteGenre: async (id) => {
    try {
      await libraryService.deleteGenre(id);
      set((state) => ({ genres: state.genres.filter((g) => g.$id !== id) }));
    } catch (error) {
      console.error("Error deleting genre:", error);
      throw error;
    }
  },

  // Books
  books: [],
  isLoadingBooks: false,
  fetchBooks: async (searchTerm?: string) => {
    set({ isLoadingBooks: true });
    try {
      const books = await libraryService.fetchBooks(searchTerm);
      // Optionally enrich with genre names here if performance allows
      const genres = get().genres.length > 0 ? get().genres : await libraryService.fetchGenres();
      if (get().genres.length === 0) set({ genres });

      const enrichedBooks = books.map(book => {
        const genre = genres.find(g => g.$id === book.genreId);
        return { ...book, genreName: genre?.name || 'Unknown Genre' };
      });
      set({ books: enrichedBooks, isLoadingBooks: false });
    } catch (error) {
      console.error("Error fetching books:", error);
      set({ isLoadingBooks: false });
      throw error;
    }
  },
  addBook: async (bookData) => {
    try {
      const newBook = await libraryService.addBook(bookData);
      const genre = get().genres.find(g => g.$id === newBook.genreId);
      const enrichedNewBook = { ...newBook, genreName: genre?.name || 'Unknown Genre' };
      set((state) => ({ books: [...state.books, enrichedNewBook] }));
      return newBook; // return the original, non-enriched one if needed elsewhere
    } catch (error) {
      console.error("Error adding book:", error);
      throw error;
    }
  },
  updateBook: async (id, bookData) => {
    try {
      const updatedBook = await libraryService.updateBook(id, bookData);
      const genre = get().genres.find(g => g.$id === updatedBook.genreId);
      const enrichedUpdatedBook = { ...updatedBook, genreName: genre?.name || 'Unknown Genre' };
      set((state) => ({
        books: state.books.map((b) => (b.$id === id ? enrichedUpdatedBook : b)),
      }));
    } catch (error) {
      console.error("Error updating book:", error);
      throw error;
    }
  },
  deleteBook: async (id) => {
    try {
      await libraryService.deleteBook(id);
      set((state) => ({ books: state.books.filter((b) => b.$id !== id) }));
    } catch (error) {
      console.error("Error deleting book:", error);
      throw error;
    }
  },
  getBookById: async (id: string) => {
      try {
          return await libraryService.fetchBookById(id);
      } catch (error) {
          console.error("Error fetching book by ID:", error);
          return null;
      }
  },

  // Borrowings
  borrowings: [],
  isLoadingBorrowings: false,
  fetchBorrowings: async (filters) => {
    set({ isLoadingBorrowings: true });
    try {
      const borrowings = await libraryService.fetchBorrowedBooks(filters);
      // Enrich with book names and user names
      const books = get().books.length > 0 ? get().books : await libraryService.fetchBooks();
      if(get().books.length === 0) set ( { books }); // cache books if not already fetched

      const enrichedBorrowings = await Promise.all(borrowings.map(async (borrow) => {
        let book = books.find(b => b.$id === borrow.bookId);
        if (!book) { // If book not in current local cache, fetch it
            const fetchedBook = await libraryService.fetchBookById(borrow.bookId);
            if (fetchedBook) book = fetchedBook;
        }
        const user = await userService.getUserById(borrow.userId, borrow.userType); // `userId` here is the custom ID from your schema
        return {
          ...borrow,
          bookName: book?.name || 'Unknown Book',
          userName: user?.name || 'Unknown User',
        };
      }));

      set({ borrowings: enrichedBorrowings, isLoadingBorrowings: false });
    } catch (error) {
      console.error("Error fetching borrowings:", error);
      set({ isLoadingBorrowings: false });
      throw error;
    }
  },
  borrowBook: async (borrowData, bookToUpdate, borrowerAppwriteId, borrowerCustomId, bookName, staffEmail) => {
    try {
      await libraryService.borrowBook(borrowData, bookToUpdate, borrowerAppwriteId, borrowerCustomId, bookName, staffEmail);
      // Re-fetch borrowings and books to reflect changes
      get().fetchBorrowings();
      get().fetchBooks(); // To update availableCopies in the main book list
    } catch (error) {
      console.error("Error borrowing book:", error);
      throw error;
    }
  },
  returnBook: async (borrowingId, bookToUpdate, borrowerAppwriteId, borrowerCustomId, bookName, staffEmail) => {
    try {
      await libraryService.returnBook(borrowingId, bookToUpdate, borrowerAppwriteId, borrowerCustomId, bookName, staffEmail);
      get().fetchBorrowings();
      get().fetchBooks();
    } catch (error) {
      console.error("Error returning book:", error);
      throw error;
    }
  },

  // Users for borrowing
  searchedUsers: [],
  isSearchingUsers: false,
  searchUsers: async (searchTerm, userType) => {
    if (!searchTerm.trim()) {
      set({ searchedUsers: [] });
      return;
    }
    set({ isSearchingUsers: true });
    try {
      const users = await userService.searchUsers(searchTerm, userType);
      set({ searchedUsers: users, isSearchingUsers: false });
    } catch (error) {
      console.error("Error searching users:", error);
      set({ searchedUsers: [], isSearchingUsers: false });
      throw error;
    }
  },
  clearSearchedUsers: () => set({ searchedUsers: [] }),

  // Dashboard
  allBorrowingsForDashboard: [],
  isLoadingAllBorrowings: false,
  fetchAllBorrowingsForDashboard: async () => {
    set({ isLoadingAllBorrowings: true }); // isLoadingAllBorrowings should be part of your LibraryState interface
    try {
      // This is where the error occurs (line 254 in your log)
      const borrowings = await libraryService.fetchAllBorrowingsForDashboard(); // Call the service function

      // Ensure your enrichment logic here is correct and robust
      const books = get().books.length > 0 ? get().books : await libraryService.fetchBooks(undefined, 500); // Fetch more books if needed for enrichment
      if(get().books.length === 0 && books.length > 0) set({ books });
      
      const genres = get().genres.length > 0 ? get().genres : await libraryService.fetchGenres();
      if (get().genres.length === 0 && genres.length > 0) set({ genres });

      const enrichedBorrowings = await Promise.all(borrowings.map(async (borrow) => {
          // ... YOUR EXISTING ENRICHMENT LOGIC ...
          // Ensure this logic correctly finds book details, genreId, userName, userFacultyId, etc.
          // Example snippet (ensure it matches your needs and Book/User types):
          let bookDetails: { name?: string, genreId?: string } | null = null;
          const bookDoc = get().books.find(b => b.$id === borrow.bookId) || await libraryService.fetchBookById(borrow.bookId);
          if (bookDoc) {
            bookDetails = { name: bookDoc.name, genreId: bookDoc.genreId };
          }
          
          const user = await userService.getUserByCustomId(borrow.userId, borrow.userType); // Make sure userService is imported

          return {
            ...borrow,
            bookName: bookDetails?.name || 'Unknown Book',
            genreId: bookDetails?.genreId,
            userName: user?.name || 'Unknown User',
            userFacultyId: user?.type === 'student' ? user.facultyId : undefined,
            userClass: user?.type === 'student' ? user.class : undefined,
          };
      }));
      set({ allBorrowingsForDashboard: enrichedBorrowings, isLoadingAllBorrowings: false });
    } catch (error) {
      console.error("Store: Error fetching all borrowings for dashboard action:", error); // Line 290 in your log
      set({ isLoadingAllBorrowings: false, allBorrowingsForDashboard: [] }); // Clear on error
      // toast.error("Failed to load dashboard borrowing data."); // Optionally show toast from component
    }
},
  faculties: [],
  fetchFacultiesForDashboard: async () => {
      try {
          const faculties = await userService.fetchFaculties();
          set({ faculties });
      } catch (error) {
          console.error("Error fetching faculties for dashboard:", error);
      }
  },

  
}));