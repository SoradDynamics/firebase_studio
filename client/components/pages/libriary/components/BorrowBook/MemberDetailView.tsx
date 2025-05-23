// src/components/library/MemberDetailView.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Avatar, Button, Card, CardBody, Chip, Input, Checkbox, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tabs, Tab } from '@heroui/react';
import { PlusIcon, ArrowUturnLeftIcon, ShoppingCartIcon, XCircleIcon, CheckCircleIcon, ArrowLeftIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import type { LibraryUser, Book, BookBorrowing, BookInBorrowCart } from 'types/library';
import type { Document as AppwriteDocument } from 'types/appwrite';
import { useLibraryStore } from '~/store/libraryStore';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import * as libraryService from '../../services/libraryService';
import * as userService from '../../services/userService';
import { calculateDaysOverdue } from '../../utils/helpers';
import { convertADtoBS, convertBStoAD, getTodayADDateString, getTodayBSDateString } from '../../utils/dateConverter';

interface MemberDetailViewProps {
  member: LibraryUser;
  onBack: () => void;
  onMembershipChange?: (updatedMember: LibraryUser) => void;
  onDataUpdate?: () => void;
}

const MemberDetailView: React.FC<MemberDetailViewProps> = ({ member: initialMember, onBack, onMembershipChange, onDataUpdate }) => {
  const [member, setMember] = useState<LibraryUser>(initialMember);
  const { email: staffEmail } = useCurrentUser();
  const { 
    books: allLibraryBooks, 
    fetchBooks: fetchAllLibraryBooks, 
    isLoadingBooks: isLoadingLibraryBooks,
    getBookById,
  } = useLibraryStore();

  const [borrowingCart, setBorrowingCart] = useState<BookInBorrowCart[]>([]);
  const [bookSearchForCartTerm, setBookSearchForCartTerm] = useState('');
  const [availableBooksForSelection, setAvailableBooksForSelection] = useState<AppwriteDocument<Book>[]>([]);
  const [isProcessingBorrow, setIsProcessingBorrow] = useState(false);

  const [userBorrowedItems, setUserBorrowedItems] = useState<AppwriteDocument<BookBorrowing & { bookName?: string }>[]>([]);
  const [isLoadingBorrowedItems, setIsLoadingBorrowedItems] = useState(false);
  const [selectedItemsToReturn, setSelectedItemsToReturn] = useState<string[]>([]);
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);
  const [isReturnPopoverOpen, setIsReturnPopoverOpen] = useState(false);

  const [userReturnedHistory, setUserReturnedHistory] = useState<AppwriteDocument<BookBorrowing & { bookName?: string }>[]>([]);
  const [isLoadingReturnedHistory, setIsLoadingReturnedHistory] = useState(false);
  
  const [activeDetailTab, setActiveDetailTab] = useState<'borrow' | 'return' | 'history'>('borrow');

  useEffect(() => {
    if (allLibraryBooks.length === 0 && !isLoadingLibraryBooks) {
      fetchAllLibraryBooks().catch(console.error);
    }
  }, [allLibraryBooks, fetchAllLibraryBooks, isLoadingLibraryBooks]);

  const fetchMemberData = useCallback(async () => {
    if (!member.id) {
        setUserBorrowedItems([]);
        setUserReturnedHistory([]);
        return;
    }
    
    setIsLoadingBorrowedItems(true);
    setIsLoadingReturnedHistory(true);
    try {
      const [borrowed, history] = await Promise.all([
        libraryService.fetchBorrowedBooks({ userId: member.id, status: 'borrowed' }),
        libraryService.fetchBorrowedBooks({ userId: member.id, status: 'returned' })
      ]);

      const enrichItems = async (items: AppwriteDocument<BookBorrowing>[]) => 
        Promise.all(
          items.map(async (item) => {
            const book = await getBookById(item.bookId);
            return { ...item, bookName: book?.name || 'Unknown Book' };
          })
        );

      setUserBorrowedItems(await enrichItems(borrowed));
      setUserReturnedHistory(await enrichItems(history));
    } catch (error) {
      console.error(`Failed to load library data for ${member.name}:`, error);
      toast.error(`Failed to load library data for ${member.name}.`);
    } finally {
      setIsLoadingBorrowedItems(false);
      setIsLoadingReturnedHistory(false);
    }
  }, [member.id, member.name, getBookById]);

  useEffect(() => {
    setMember(initialMember);
    if (initialMember && initialMember.id) {
        fetchMemberData();
    } else {
        setUserBorrowedItems([]);
        setUserReturnedHistory([]);
    }
  }, [initialMember, fetchMemberData]);

  useEffect(() => {
    const lowerSearch = bookSearchForCartTerm.toLowerCase();
    const cartBookIds = new Set(borrowingCart.map(b => b.$id));
    const filtered = allLibraryBooks.filter(book =>
      book.availableCopies > 0 && !cartBookIds.has(book.$id!) &&
      (book.name.toLowerCase().includes(lowerSearch) || book.customBookId.toLowerCase().includes(lowerSearch))
    );
    setAvailableBooksForSelection(filtered.slice(0, 15));
  }, [bookSearchForCartTerm, allLibraryBooks, borrowingCart]);

  const handleToggleMembership = async () => {
    if (!member.$id) {
        toast.error("Member Appwrite ID not found.");
        return;
    }
    const newStatus = !member.isLibraryMember;
    try {
      await userService.updateUserLibraryMembershipStatus(member.$id, member.type, newStatus);
      const updatedMember = { ...member, isLibraryMember: newStatus };
      setMember(updatedMember);
      toast.success(`Membership ${newStatus ? 'granted to' : 'revoked for'} ${member.name}.`);
      if (onMembershipChange) onMembershipChange(updatedMember);
    } catch (error) {
      console.error("Membership update error:", error);
      toast.error(`Failed to update membership for ${member.name}.`);
    }
  };

  const addBookToCart = (book: AppwriteDocument<Book>) => {
    if (borrowingCart.find(b => b.$id === book.$id)) {
      toast.error("Book already in cart."); return;
    }
    setBorrowingCart(prev => [...prev, { ...book, bsDueDate: '', adDueDate: null }]);
  };

  const removeBookFromCart = (bookId: string) => {
    setBorrowingCart(prev => prev.filter(b => b.$id !== bookId));
  };

  const handleCartItemBsDueDateChange = (bookId: string, bsDate: string) => {
    setBorrowingCart(prevCart => 
      prevCart.map(item => {
        if (item.$id === bookId) {
          const adDate = convertBStoAD(bsDate);
          return { ...item, bsDueDate: bsDate, adDueDate: adDate };
        }
        return item;
      })
    );
  };

  const handleBorrowBooks = async () => {
    if (borrowingCart.length === 0) {
      toast.error("Borrowing cart is empty."); return;
    }
    if (!staffEmail) {
      toast.error("Staff email not found. Please login again."); return;
    }

    for (const item of borrowingCart) {
      if (!item.adDueDate || new Date(item.adDueDate) < new Date(getTodayADDateString())) {
        toast.error(`Please set a valid BS due date for "${item.name}" (AD date must be today or future).`);
        return;
      }
    }

    setIsProcessingBorrow(true);
    let successCount = 0; const errors: string[] = [];

    for (const cartItem of borrowingCart) {
      try {
        const freshBook = await getBookById(cartItem.$id!);
        if (!freshBook || freshBook.availableCopies <= 0) {
          errors.push(`Book "${cartItem.name}" is no longer available.`);
          continue;
        }
        if (!cartItem.adDueDate) {
          errors.push(`Due date missing for "${cartItem.name}".`);
          continue;
        }

        const borrowData: Omit<BookBorrowing, '$id' | 'status' | 'borrowedByStaffEmail' | 'bookName' | 'userName'> = {
          bookId: freshBook.$id!,
          userId: member.id,
          userType: member.type,
          borrowDate: new Date().toISOString(),
          dueDate: new Date(cartItem.adDueDate).toISOString(),
        };
        
        await libraryService.borrowBook(
          borrowData,
          { id: freshBook.$id!, availableCopies: freshBook.availableCopies },
          member.$id,
          member.id,
          freshBook.name,
          staffEmail
        );
        successCount++;
      } catch (err) {
        console.error(`Error borrowing book ${cartItem.name}:`, err);
        errors.push(`Failed to borrow "${cartItem.name}": ${(err as Error).message}`);
      }
    }

    setIsProcessingBorrow(false);
    if (successCount > 0) {
      toast.success(`${successCount} book(s) borrowed successfully for ${member.name}.`);
      setBorrowingCart([]);
      fetchAllLibraryBooks();
      fetchMemberData();
      if (onDataUpdate) onDataUpdate();
    }
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err, { duration: 6000 }));
    }
  };

  const toggleReturnSelection = (borrowingId: string) => {
    setSelectedItemsToReturn(prev =>
      prev.includes(borrowingId) ? prev.filter(id => id !== borrowingId) : [...prev, borrowingId]
    );
  };

  const handleReturnSelectedBooks = () => {
    if (selectedItemsToReturn.length === 0) {
      toast.error("No books selected for return."); return;
    }
    setIsReturnPopoverOpen(true);
  };
  
  const confirmReturnBooks = async () => {
    setIsReturnPopoverOpen(false);
    if (selectedItemsToReturn.length === 0 || !staffEmail) {
        if(!staffEmail) toast.error("Staff email not found.");
        return;
    }
    setIsProcessingReturn(true);
    let successCount = 0; const errors: string[] = [];

    for (const borrowingId of selectedItemsToReturn) {
        const itemToReturn = userBorrowedItems.find(item => item.$id === borrowingId);
        if (!itemToReturn) {
            console.warn(`Item with borrowing ID ${borrowingId} not found in local list.`);
            continue;
        }
        try {
            const bookDoc = await getBookById(itemToReturn.bookId);
            if (!bookDoc) {
                errors.push(`Book details for "${itemToReturn.bookName || 'a book'}" not found.`);
                continue;
            }
            await libraryService.returnBook(
                itemToReturn.$id!,
                { id: bookDoc.$id!, availableCopies: bookDoc.availableCopies, totalCopies: bookDoc.totalCopies },
                member.$id, 
                itemToReturn.userId, 
                itemToReturn.bookName || "Unknown Book",
                staffEmail
            );
            successCount++;
        } catch (err) {
            console.error(`Error returning book ${itemToReturn.bookName}:`, err);
            errors.push(`Failed to return "${itemToReturn.bookName || 'a book'}": ${(err as Error).message}`);
        }
    }
    setIsProcessingReturn(false);
    if (successCount > 0) {
      toast.success(`${successCount} book(s) returned successfully by ${member.name}.`);
      fetchMemberData();
      fetchAllLibraryBooks();
      setSelectedItemsToReturn([]);
      if (onDataUpdate) onDataUpdate();
    }
    if (errors.length > 0) {
        errors.forEach(err => toast.error(err, { duration: 6000 }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-start mb-4">
        <Button variant="ghost" onPress={onBack} startContent={<ArrowLeftIcon className="w-5 h-5 mr-1"/>}>
          Back to List
        </Button>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <Avatar name={member.name ? member.name.substring(0, 1) : '?'} size="md" />
            <div className="flex-grow">
              <h3 className="text-2xl font-bold text-gray-800">{member.name || 'N/A'}</h3>
              <p className="text-sm text-gray-600">
                Type: <Chip size="sm" variant="flat" className="capitalize">{member.type || 'N/A'}</Chip>
              </p>
              {member.type === 'student' && member.class && (
                <p className="text-xs text-gray-500">Class: {member.class}</p>
              )}
              {member.email && <p className="text-xs text-gray-500">Email: {member.email}</p>}
            </div>
            <div className="flex flex-col items-start sm:items-end space-y-2">
              {member.isLibraryMember ? (
                <Chip color="success" variant="flat" size="lg">Active Library Member</Chip>
              ) : (
                <Chip color="warning" variant="bordered" size="lg">Not a Library Member</Chip>
              )}
              {onMembershipChange && (
                <Button 
                    size="sm" 
                    color={member.isLibraryMember ? "danger" : "success"} 
                    variant="ghost" 
                    onPress={handleToggleMembership}
                >
                  {member.isLibraryMember ? "Revoke Membership" : "Activate Membership"}
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
      
      {member.isLibraryMember && (
        <Tabs 
            aria-label="Member Actions Details" 
            selectedKey={activeDetailTab}
            onSelectionChange={(key) => setActiveDetailTab(key as 'borrow' | 'return' | 'history')}
            color="primary" 
            variant="underlined"
            className="mt-4"
        >
            <Tab key="borrow" title="Borrow Books">
                <Card className="mt-2">
                    <CardBody className="space-y-4">
                        <h4 className="text-lg font-semibold text-gray-700">Borrow New Books</h4>
                        <Input
                            label="Search & Add Books to Cart (Title or Book ID)"
                            placeholder="Type to find books..."
                            value={bookSearchForCartTerm}
                            onValueChange={setBookSearchForCartTerm}
                            variant="bordered" 
                            isClearable 
                            onClear={() => setBookSearchForCartTerm('')}
                            fullWidth
                        />
                        {bookSearchForCartTerm && availableBooksForSelection.length > 0 && (
                            <div className="border rounded-md max-h-60 overflow-y-auto p-2 space-y-2 bg-white">
                                <p className="text-sm font-medium text-gray-700 px-1">Available to add:</p>
                                {availableBooksForSelection.map(book => (
                                <div key={book.$id} className="flex justify-between items-center p-2 hover:bg-slate-100 rounded">
                                    <div>
                                        <p className="font-medium text-sm">{book.name} <span className="text-xs text-gray-500">(ID: {book.customBookId})</span></p>
                                        <p className="text-xs text-gray-600">Author: {book.author} | Available: {book.availableCopies}</p>
                                    </div>
                                    <Button size="sm" variant="flat" color="success" onPress={() => addBookToCart(book)} startContent={<PlusIcon className="w-4 h-4"/>}>Add</Button>
                                </div>
                                ))}
                            </div>
                        )}
                        
                        {borrowingCart.length > 0 && (
                        <div className="mt-4 space-y-3">
                            <h5 className="font-semibold text-gray-700">Borrowing Cart ({borrowingCart.length} items):</h5>
                            {borrowingCart.map((item, index) => (
                            <Card key={item.$id} shadow="sm" className="p-3 border border-gray-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium text-gray-800">{index + 1}. {item.name}</p>
                                        <p className="text-xs text-gray-500">Author: {item.author}</p>
                                    </div>
                                    <Button size="sm" variant="light" color="danger" isIconOnly onPress={() => removeBookFromCart(item.$id!)}><XCircleIcon className="w-5 h-5"/></Button>
                                </div>
                                <Input
                                    label={`Due Date (BS: YYYY-MM-DD)`}
                                    placeholder={getTodayBSDateString()}
                                    value={item.bsDueDate || ''}
                                    onValueChange={(val) => handleCartItemBsDueDateChange(item.$id!, val)}
                                    variant="bordered"
                                    className="mt-1"
                                    description={item.adDueDate ? `AD Equivalent: ${item.adDueDate}` : 'Enter BS date'}
                                    isInvalid={!!item.bsDueDate && !item.adDueDate}
                                    errorMessage={!!item.bsDueDate && !item.adDueDate ? 'Invalid BS Date or Format' : ''}
                                    startContent={<CalendarDaysIcon className="w-4 h-4 text-gray-400 mr-1"/>}
                                    size="sm"
                                />
                            </Card>
                            ))}
                            <div className="flex justify-end pt-3">
                                <Button 
                                    color="primary" 
                                    onPress={handleBorrowBooks} 
                                    isLoading={isProcessingBorrow}
                                    isDisabled={borrowingCart.length === 0 || borrowingCart.some(i => !i.adDueDate || new Date(i.adDueDate) < new Date(getTodayADDateString()))}
                                    startContent={<ShoppingCartIcon className="w-5 h-5 mr-1"/>}
                                    size="lg"
                                >
                                    Confirm Borrow All ({borrowingCart.length})
                                </Button>
                            </div>
                        </div>
                        )}
                        {borrowingCart.length === 0 && !bookSearchForCartTerm && (
                            <p className="text-gray-500 text-center py-4">Search for books above to add them to the borrowing cart.</p>
                        )}
                    </CardBody>
                </Card>
            </Tab>

            <Tab key="return" title={`Currently Borrowed (${userBorrowedItems.length})`}>
                <Card className="mt-2">
                    <CardBody>
                        <h4 className="text-lg font-semibold text-gray-700 mb-3">Return Books</h4>
                        {isLoadingBorrowedItems && <p className="text-center py-4">Loading borrowed items...</p>}
                        {!isLoadingBorrowedItems && userBorrowedItems.length === 0 && <p className="text-center py-4">This member has no books currently borrowed.</p>}
                        {!isLoadingBorrowedItems && userBorrowedItems.length > 0 && (
                        <>
                            <div className="max-h-[500px] overflow-y-auto border rounded-md">
                            <Table removeWrapper aria-label={`Borrowed books by ${member.name}`}>
                                <TableHeader>
                                <TableColumn className="w-10"><Checkbox aria-label="Select all items to return" isSelected={selectedItemsToReturn.length === userBorrowedItems.length && userBorrowedItems.length > 0} isIndeterminate={selectedItemsToReturn.length > 0 && selectedItemsToReturn.length < userBorrowedItems.length} onChange={() => { if (selectedItemsToReturn.length === userBorrowedItems.length) {setSelectedItemsToReturn([]);} else {setSelectedItemsToReturn(userBorrowedItems.map(item => item.$id!));}}} /></TableColumn>
                                <TableColumn>Book Title</TableColumn>
                                <TableColumn>Borrowed (BS)</TableColumn> 
                                <TableColumn>Due (BS)</TableColumn>
                                <TableColumn>Status</TableColumn>
                                </TableHeader>
                                <TableBody items={userBorrowedItems} emptyContent="No items to display.">
                                {(item) => {
                                    const overdueDays = calculateDaysOverdue(item.dueDate); // Uses AD dueDate for calculation
                                    return (
                                    <TableRow key={item.$id}>
                                        <TableCell><Checkbox aria-label={`Select ${item.bookName} to return`} isSelected={selectedItemsToReturn.includes(item.$id!)} onChange={() => toggleReturnSelection(item.$id!)} /></TableCell>
                                        <TableCell>{item.bookName || "N/A"}</TableCell>
                                        <TableCell>{convertADtoBS(item.borrowDate)}</TableCell>
                                        <TableCell>{convertADtoBS(item.dueDate)}</TableCell>
                                        <TableCell>{overdueDays > 0 ? <Chip color="danger" size="sm">Overdue ({overdueDays}d)</Chip> : <Chip color="success" size="sm">On Time</Chip>}</TableCell>
                                    </TableRow>
                                    );
                                }}
                                </TableBody>
                            </Table>
                            </div>
                            <div className="flex justify-end pt-3">
                            <Button 
                                color="success" 
                                onPress={handleReturnSelectedBooks} 
                                isLoading={isProcessingReturn} 
                                isDisabled={selectedItemsToReturn.length === 0} 
                                startContent={<ArrowUturnLeftIcon className="w-5 h-5 mr-1"/>}
                                size="lg"
                            >
                                Return Selected ({selectedItemsToReturn.length})
                            </Button>
                            </div>
                        </>
                        )}
                    </CardBody>
                </Card>
            </Tab>

            <Tab key="history" title={`Returned History (${userReturnedHistory.length})`}>
                <Card className="mt-2">
                    <CardBody>
                        <h4 className="text-lg font-semibold text-gray-700 mb-3">Returned Books History</h4>
                        {isLoadingReturnedHistory && <p className="text-center py-4">Loading history...</p>}
                        {!isLoadingReturnedHistory && userReturnedHistory.length === 0 && <p className="text-center py-4">No returned books found for this member.</p>}
                        {!isLoadingReturnedHistory && userReturnedHistory.length > 0 && (
                            <div className="max-h-[500px] overflow-y-auto border rounded-md">
                                <Table removeWrapper aria-label="Returned books history">
                                    <TableHeader>
                                        <TableColumn>Book Title</TableColumn>
                                        <TableColumn>Borrowed (BS)</TableColumn>
                                        <TableColumn>Due (BS)</TableColumn>
                                        <TableColumn>Returned (BS)</TableColumn>
                                        <TableColumn>Issued By</TableColumn>
                                        {/* <TableColumn>Received By</TableColumn> */}
                                    </TableHeader>
                                    <TableBody items={userReturnedHistory} emptyContent="No history to display.">
                                        {(item) => (
                                            <TableRow key={item.$id}>
                                                <TableCell>{item.bookName || "N/A"}</TableCell>
                                                <TableCell>{convertADtoBS(item.borrowDate)}</TableCell>
                                                <TableCell>{convertADtoBS(item.dueDate)}</TableCell>
                                                <TableCell>{convertADtoBS(item.returnDate)}</TableCell>
                                                <TableCell>{item.borrowedByStaffEmail || '-'}</TableCell>
                                                {/* <TableCell>{item.returnedByStaffEmail || '-'}</TableCell> */}
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </Tab>
        </Tabs>
      )}

      {!member.isLibraryMember && (
        <Card className="mt-4">
            <CardBody className="text-center py-8">
                <p className="text-gray-600 mb-3">This user is not an active library member.</p>
                {onMembershipChange && (
                     <Button color="success" onPress={handleToggleMembership}>Activate Membership</Button>
                )}
            </CardBody>
        </Card>
      )}

      {isReturnPopoverOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={() => setIsReturnPopoverOpen(false)}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Confirm Book Return(s)</h3>
                <p className="text-sm text-gray-600 mb-6">Are you sure you want to mark {selectedItemsToReturn.length} selected book(s) as returned?</p>
                <div className="flex justify-end space-x-3">
                    <Button variant="flat" color="default" onPress={() => setIsReturnPopoverOpen(false)} isDisabled={isProcessingReturn}>
                        Cancel
                    </Button>
                    <Button 
                        color="success" 
                        onPress={confirmReturnBooks} 
                        isLoading={isProcessingReturn}
                        startContent={!isProcessingReturn ? <CheckCircleIcon className="w-5 h-5 mr-1"/> : null}
                    >
                        Confirm Return
                    </Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MemberDetailView;