// src/components/library/DashboardBookInfo.tsx
import React, { useMemo } from 'react';
import { Card, CardBody, Chip } from '@heroui/react';
import { BookOpenIcon, CheckBadgeIcon, ArrowTrendingUpIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { Document as AppwriteDocument } from 'types/appwrite';
import type { Book, BookBorrowing } from 'types/library';
import { convertADtoBS } from '../../utils/dateConverter'; // If displaying dates

interface DashboardBookInfoProps {
  books: AppwriteDocument<Book>[]; // All books in the library
  allBorrowings: AppwriteDocument<BookBorrowing>[]; // All borrowing records
  isLoading?: boolean;
}

const DashboardBookInfo: React.FC<DashboardBookInfoProps> = ({ books, allBorrowings, isLoading }) => {
  const totalUniqueTitles = useMemo(() => new Set(books.map(b => b.customBookId)).size, [books]);
  const totalBookCopies = useMemo(() => books.reduce((sum, book) => sum + book.totalCopies, 0), [books]);

  const mostBorrowedBooks = useMemo(() => {
    if (!allBorrowings.length || !books.length) return [];

    const borrowCounts: Record<string, number> = {}; // bookId (Appwrite $id) -> count
    allBorrowings.forEach(borrowing => {
      borrowCounts[borrowing.bookId] = (borrowCounts[borrowing.bookId] || 0) + 1;
    });

    return Object.entries(borrowCounts)
      .map(([bookAppwriteId, count]) => {
        const bookDetails = books.find(b => b.$id === bookAppwriteId);
        return {
          name: bookDetails?.name || 'Unknown Book',
          customBookId: bookDetails?.customBookId || 'N/A',
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 3); // Show top 3
  }, [allBorrowings, books]);

  const recentlyAddedBooks = useMemo(() => {
    return [...books] // Create a new array to avoid mutating the original prop
      .sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
      .slice(0, 3); // Show top 3 recently added
  }, [books]);

  if (isLoading) {
    return (
      <Card shadow="md">
        <CardBody className="p-5">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Book Statistics</h3>
          <p className="text-gray-500">Loading book information...</p>
        </CardBody>
      </Card>
    );
  }
  
  if (books.length === 0) {
    return (
      <Card shadow="md">
        <CardBody className="p-5">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Book Statistics</h3>
          <p className="text-gray-500">No book data available to display statistics.</p>
        </CardBody>
      </Card>
    );
  }


  return (
    <Card shadow="md" className=' w-full'>
      <CardBody className="p-5 space-y-6">
        <h3 className="text-xl font-semibold text-gray-800">Book Insights</h3>

        {/* Key Book Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg flex items-start space-x-3">
            <div className="flex-shrink-0 p-2 bg-blue-200 text-blue-700 rounded-full">
              <BookOpenIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Unique Titles</p>
              <p className="text-2xl font-bold text-blue-800">{totalUniqueTitles}</p>
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg flex items-start space-x-3">
            <div className="flex-shrink-0 p-2 bg-green-200 text-green-700 rounded-full">
              <CheckBadgeIcon className="w-5 h-5" /> {/* Using CheckBadge for total copies */}
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Total Physical Copies</p>
              <p className="text-2xl font-bold text-green-800">{totalBookCopies}</p>
            </div>
          </div>
        </div>

        {/* Most Borrowed Books */}
        {mostBorrowedBooks.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-gray-700 mb-2 flex items-center">
              <ArrowTrendingUpIcon className="w-5 h-5 mr-2 text-indigo-600"/>
              Top Borrowed Books
            </h4>
            <div className="space-y-2">
              {mostBorrowedBooks.map((book, index) => (
                <div key={index} className="p-2.5 border border-gray-200 rounded-md bg-gray-50 text-sm">
                  <span className="font-medium text-gray-800">{book.name}</span>
                  <Chip size="sm" color="primary" variant="flat" className="ml-2 float-right">
                    {book.count} borrows
                  </Chip>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Added Books */}
        {recentlyAddedBooks.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-gray-700 mb-2 flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2 text-amber-600"/>
                Recently Added Books
            </h4>
            <div className="space-y-2">
              {recentlyAddedBooks.map(book => (
                <div key={book.$id} className="p-2.5 border border-gray-200 rounded-md bg-gray-50 text-sm">
                  <span className="font-medium text-gray-800">{book.name}</span>
                  <span className="text-xs text-gray-500 float-right">
                    Added: {convertADtoBS(book.$createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default DashboardBookInfo;