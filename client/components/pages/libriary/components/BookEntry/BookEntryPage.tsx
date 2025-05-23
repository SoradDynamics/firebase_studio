// src/pages/library/BookEntryPage.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react'; // Added useCallback
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button, Chip } from '@heroui/react';
import { toast } from 'react-hot-toast';

import PageHeader from '../common/PageHeader';
import DataTable, { ColumnDef } from '../common/DataTable';
import { Drawer } from '../../../../common/Drawer';
import Popover from '../../../../common/Popover';
import ActionButton from '../../../../common/ActionButton';
import SearchBar from '../../../common/SearchBar'; // Assuming you have this
import BookForm from './BookForm';
import LoadingOverlay from '../common/LoadingOverlay';

import { useLibraryStore } from '~/store/libraryStore';
import type { Document } from 'types/appwrite';
import type { Book } from 'types/library';
import { formatDate } from '../../utils/helpers'; // If you want to format dates


const BookEntryPage: React.FC = () => {
  const {
    books: allBooks, // Renamed to allBooks to distinguish from filteredBooks
    isLoadingBooks,
    fetchBooks,
    addBook,
    updateBook,
    deleteBook,
    genres,
    fetchGenres,
    isLoadingGenres,
  } = useLibraryStore();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Document<Book> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Initial data fetch
  useEffect(() => {
    // Fetch all books initially without a search term for frontend filtering
    fetchBooks().catch(err => toast.error("Failed to load books."));
    if (genres.length === 0 && !isLoadingGenres) {
      fetchGenres().catch(err => toast.error("Failed to load genres for book display."));
    }
  }, [fetchBooks, fetchGenres, genres.length, isLoadingGenres]); // Removed searchTerm from dependency array

  // Memoized filtered books for display
  const filteredBooks = useMemo(() => {
    if (!searchTerm.trim()) {
      return allBooks;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allBooks.filter(book => {
      const genreName = book.genreName || genres.find(g => g.$id === book.genreId)?.name || '';
      
      return (
        book.customBookId?.toLowerCase().includes(lowerSearchTerm) ||
        book.name?.toLowerCase().includes(lowerSearchTerm) ||
        book.author?.toLowerCase().includes(lowerSearchTerm) ||
        genreName.toLowerCase().includes(lowerSearchTerm) ||
        (book.year && book.year.toString().includes(lowerSearchTerm)) ||
        book.location?.toLowerCase().includes(lowerSearchTerm) ||
        book.totalCopies?.toString().includes(lowerSearchTerm) || // Search by total copies
        book.availableCopies?.toString().includes(lowerSearchTerm) // Search by available copies
      );
    });
  }, [allBooks, searchTerm, genres]);

  // No need for handleSearch to call fetchBooks if doing frontend search
  // const handleSearch = (term: string) => {
  //   setSearchTerm(term);
  // };

  const handleAddBook = () => {
    setSelectedBook(null);
    setIsDrawerOpen(true);
  };

  const handleEditBook = (book: Document<Book>) => {
    setSelectedBook(book);
    setIsDrawerOpen(true);
  };

  const handleDeleteBook = (book: Document<Book>) => {
    setSelectedBook(book);
    setIsPopoverOpen(true);
  };

  const handleFormSubmit = async (data: Omit<Book, '$id' | 'availableCopies' | 'genreName'>) => {
    setIsSubmitting(true);
    try {
      if (selectedBook) {
        await updateBook(selectedBook.$id!, data);
        toast.success('Book updated successfully!');
      } else {
        await addBook(data);
        toast.success('Book added successfully!');
      }
      setIsDrawerOpen(false);
      setSelectedBook(null);
      // After add/edit, re-fetch all books to ensure store has the latest full list
      await fetchBooks(); 
    } catch (error) {
      console.error('Failed to save book:', error);
      const errorMessage = (error as any)?.response?.message || (error as Error).message || "An unknown error occurred";
      toast.error(`Failed to save book: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedBook) return;
    setIsSubmitting(true);
    try {
      await deleteBook(selectedBook.$id!);
      toast.success('Book deleted successfully!');
      setIsPopoverOpen(false);
      setSelectedBook(null);
      // After delete, re-fetch all books
      await fetchBooks();
    } catch (error) {
      console.error('Failed to delete book:', error);
      toast.error(`Failed to delete book: ${(error as Error).message}. It might be in use.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<Document<Book>>[] = useMemo(() => [
    { accessorKey: 'customBookId', header: 'Book ID' },
    { accessorKey: 'name', header: 'Title' },
    { accessorKey: 'author', header: 'Author' },
    {
      accessorKey: 'genreName',
      header: 'Genre',
      cell: (row) => row.genreName || (genres.find(g => g.$id === row.genreId)?.name || 'N/A'),
    },
    { accessorKey: 'year', header: 'Year', cell: (row) => row.year || '-' },
    { accessorKey: 'location', header: 'Location', cell: (row) => row.location || '-' },
    {
      accessorKey: 'totalCopies',
      header: 'Copies',
      cell: (row) => (
        <div className="flex flex-col">
          <span>Total: {row.totalCopies}</span>
          <Chip size="sm" color={row.availableCopies > 0 ? "success" : "danger"} variant="flat">
            Avail: {row.availableCopies}
          </Chip>
        </div>
      )
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex space-x-2">
          <ActionButton
            icon={<PencilIcon className="h-4 w-4" />}
            onClick={() => handleEditBook(row)}
            color="orange"
            isIconOnly
          />
          <ActionButton
            icon={<TrashIcon className="h-4 w-4" />}
            onClick={() => handleDeleteBook(row)}
            color="red"
            isIconOnly
          />
        </div>
      ),
    },
  ], [genres]);

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Manage Books"
        actionButton={
          <Button color="primary" onPress={handleAddBook} startContent={<PlusIcon className="h-5 w-5" />}>
            Add New Book
          </Button>
        }
      />

      <div className="mb-4">
        <SearchBar
          placeholder="Search by ID, Title, Author, Genre, Year, Location, Copies..."
          value={searchTerm}
          onValueChange={setSearchTerm} // Directly update searchTerm state
          className="max-w-xl" // Increased width for longer placeholder
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredBooks} // Use the memoized filteredBooks
        isLoading={isLoadingBooks && allBooks.length === 0 && !isSubmitting} // Show loading if initial load and no books yet
        emptyStateMessage={searchTerm ? `No books found for "${searchTerm}".` : "No books found. Add one to get started!"}
      />

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={selectedBook ? "Edit Book Details" : "Add New Book"} size="lg">
        <Drawer.Body>
          <BookForm
            initialData={selectedBook}
            onSubmit={handleFormSubmit}
            onClose={() => setIsDrawerOpen(false)}
            isSubmitting={isSubmitting}
          />
        </Drawer.Body>
      </Drawer>

      <Popover
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Book"
        content={`Are you sure you want to delete the book "${selectedBook?.name}"? This action cannot be undone.`}
        isConfirmLoading={isSubmitting}
      />
      <LoadingOverlay isLoading={isSubmitting && !isDrawerOpen && !isPopoverOpen} message="Saving book..."/>
    </div>
  );
};

export default BookEntryPage;