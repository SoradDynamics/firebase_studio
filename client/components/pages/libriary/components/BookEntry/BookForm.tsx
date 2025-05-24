// src/components/library/BookForm.tsx
import React, { useEffect, useState } from 'react';
import { Input, Button } from '@heroui/react';
import CustomSelect, { SelectOption } from '../../../common/CustomSelect';
import type { Book } from 'types/library'; // Book type now has year as string
import type { Document as AppwriteDocument } from 'types/appwrite';
import { useLibraryStore } from '~/store/libraryStore';

interface BookFormProps {
  initialData?: AppwriteDocument<Book> | null;
  // Ensure the Omit list matches the Book type and what's auto-generated/handled elsewhere
  onSubmit: (data: Omit<Book, '$id' | 'availableCopies' | 'genreName' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

interface BookFormState {
  customBookId: string;
  name: string;
  author: string;
  year: string; // Year is now a simple string input
  genreId: string | null;
  location: string;
  totalCopies: string; // Keep as string for input, parse on submit for this field
}

interface BookFormErrors {
  customBookId?: string;
  name?: string;
  author?: string;
  // No specific year error, as it's free text. Could add max length if desired.
  genreId?: string;
  totalCopies?: string;
}

const BookForm: React.FC<BookFormProps> = ({ initialData, onSubmit, onClose, isSubmitting }) => {
  const { genres, fetchGenres, isLoadingGenres } = useLibraryStore();
  
  const [formData, setFormData] = useState<BookFormState>({
    customBookId: '',
    name: '',
    author: '',
    year: '', // Initialize as empty string
    genreId: null,
    location: '',
    totalCopies: '',
  });
  const [errors, setErrors] = useState<BookFormErrors>({});

  useEffect(() => {
    if (genres.length === 0 && !isLoadingGenres) {
      fetchGenres().catch(console.error);
    }
  }, [genres, fetchGenres, isLoadingGenres]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        customBookId: initialData.customBookId || '',
        name: initialData.name || '',
        author: initialData.author || '',
        year: initialData.year || '', // Directly use the string value
        genreId: initialData.genreId || null,
        location: initialData.location || '',
        totalCopies: initialData.totalCopies?.toString() || '',
      });
    } else {
      setFormData({
        customBookId: '',
        name: '',
        author: '',
        year: '',
        genreId: null,
        location: '',
        totalCopies: '',
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof BookFormState, value: string | null) => {
    // For 'year', allow any string. For 'totalCopies', allow only numbers for the input string.
    if (field === 'totalCopies' && value !== null && !/^\d*$/.test(value)) {
        return; // Prevent non-numeric input for totalCopies
    }
    setFormData((prev) => ({ ...prev, [field]: value === null ? '' : value })); // Ensure value is not null for string fields
    if (errors[field as keyof BookFormErrors]) { // Type assertion needed here
      setErrors((prev) => ({ ...prev, [field as keyof BookFormErrors]: undefined }));
    }
  };

  const genreOptions: SelectOption[] = genres.map((g) => ({
    id: g.$id!,
    name: g.name,
  }));

  const validate = (): boolean => {
    const newErrors: BookFormErrors = {};
    if (!formData.customBookId.trim()) newErrors.customBookId = 'Book ID is required.';
    if (!formData.name.trim()) newErrors.name = 'Book name is required.';
    if (!formData.author.trim()) newErrors.author = 'Author is required.';
    if (!formData.genreId) newErrors.genreId = 'Genre is required.';
    
    if (!formData.totalCopies.trim() || isNaN(Number(formData.totalCopies)) || Number(formData.totalCopies) < 0) {
      newErrors.totalCopies = 'Valid number of copies is required (0 or more).';
    }
    // No validation for formData.year as it's free text
    // Can add maxLength validation if needed:
    // if (formData.year.length > 50) newErrors.yearInput = 'Year text is too long (max 50 chars).';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Ensure Omit list in onSubmit prop matches this structure and Book type
    const bookDataToSubmit = {
      customBookId: formData.customBookId,
      name: formData.name,
      author: formData.author,
      year: formData.year.trim() ? formData.year.trim() : null, // Send null if empty, otherwise trimmed string
      genreId: formData.genreId!,
      location: formData.location.trim() ? formData.location.trim() : '', // Send empty string if only spaces
      totalCopies: parseInt(formData.totalCopies, 10),
      // availableCopies will be set by the service/store
    };
    await onSubmit(bookDataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      <Input
        label="Book ID (Unique)"
        placeholder="e.g., ISBN or LIB001"
        value={formData.customBookId}
        onValueChange={(val) => handleInputChange('customBookId', val)}
        isInvalid={!!errors.customBookId}
        errorMessage={errors.customBookId}
        isRequired
        variant="bordered"
        className="w-full"
        isDisabled={!!initialData || isSubmitting}
        description={initialData ? "Book ID cannot be changed after creation." : ""}
      />
      <Input
        label="Book Name / Title"
        placeholder="Enter book title"
        value={formData.name}
        onValueChange={(val) => handleInputChange('name', val)}
        isInvalid={!!errors.name}
        errorMessage={errors.name}
        isRequired
        variant="bordered"
        className="w-full"
        isDisabled={isSubmitting}
      />
      <Input
        label="Author(s)"
        placeholder="Enter author name(s)"
        value={formData.author}
        onValueChange={(val) => handleInputChange('author', val)}
        isInvalid={!!errors.author}
        errorMessage={errors.author}
        isRequired
        variant="bordered"
        className="w-full"
        isDisabled={isSubmitting}
      />
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
            label="Publication Year / Period"
            placeholder="e.g., 2023, 2078 BS, Ancient, c. 1950"
            type="text" // Changed to text
            value={formData.year}
            onValueChange={(val) => handleInputChange('year', val)}
            // isInvalid={!!errors.yearInput} // No specific validation, maybe length
            // errorMessage={errors.yearInput}
            variant="bordered"
            className="w-full"
            isDisabled={isSubmitting}
            maxLength={50} // Optional: limit length
        />
        <Input
            label="Total Copies"
            placeholder="e.g., 10"
            type="text" // Keep as text to allow custom numeric input handling
            inputMode="numeric" // Provides numeric keyboard on mobile
            value={formData.totalCopies}
            onValueChange={(val) => handleInputChange('totalCopies', val)}
            isInvalid={!!errors.totalCopies}
            errorMessage={errors.totalCopies}
            isRequired
            variant="bordered"
            className="w-full"
            isDisabled={isSubmitting}
            // min="0" // HTML5 min doesn't work well if type="text" for custom handling
        />
      </div>
      <CustomSelect
        label="Genre"
        placeholder={isLoadingGenres ? "Loading genres..." : "Select genre"}
        options={genreOptions}
        value={formData.genreId}
        onChange={(selectedId) => handleInputChange('genreId', selectedId as string | null)} // Cast needed
        className="w-full"
        disabled={isLoadingGenres || isSubmitting}
      />
      {errors.genreId && <p className="text-xs text-red-500 mt-1">{errors.genreId}</p>}

      <Input
        label="Location (e.g., Shelf, Rack)"
        placeholder="e.g., Shelf A, Row 3"
        value={formData.location}
        onValueChange={(val) => handleInputChange('location', val)}
        variant="bordered"
        className="w-full"
        isDisabled={isSubmitting}
      />

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" color="default" variant="flat" onPress={onClose} isDisabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" color="primary" isLoading={isSubmitting} isDisabled={isSubmitting}>
          {initialData ? 'Update Book' : 'Add Book'}
        </Button>
      </div>
    </form>
  );
};

export default BookForm;