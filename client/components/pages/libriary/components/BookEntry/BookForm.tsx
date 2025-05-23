// src/components/library/BookForm.tsx
import React, { useEffect, useState } from 'react';
import { Input, Button } from '@heroui/react'; // Assuming NumberInput is part of Input or use type="number"
import CustomSelect, { SelectOption } from '../../../common/CustomSelect'; // Your CustomSelect
import type { Book, BookGenre } from 'types/library';
import type { Document } from 'types/appwrite';
import { useLibraryStore } from '~/store/libraryStore';

interface BookFormProps {
  initialData?: Document<Book> | null;
  onSubmit: (data: Omit<Book, '$id' | 'availableCopies' | 'genreName'>) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

interface BookFormState {
  customBookId: string;
  name: string;
  author: string;
  year: string; // Keep as string for input, parse on submit
  genreId: string | null;
  location: string;
  totalCopies: string; // Keep as string for input
}

interface BookFormErrors {
  customBookId?: string;
  name?: string;
  author?: string;
  year?: string;
  genreId?: string;
  totalCopies?: string;
}

const BookForm: React.FC<BookFormProps> = ({ initialData, onSubmit, onClose, isSubmitting }) => {
  const { genres, fetchGenres, isLoadingGenres } = useLibraryStore();
  const [formData, setFormData] = useState<BookFormState>({
    customBookId: '',
    name: '',
    author: '',
    year: '',
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
        year: initialData.year?.toString() || '',
        genreId: initialData.genreId || null,
        location: initialData.location || '',
        totalCopies: initialData.totalCopies?.toString() || '',
      });
    } else {
      // Reset form for new entry
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
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
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
      newErrors.totalCopies = 'Valid number of copies is required (must be 0 or more).';
    }
    if (formData.year.trim() && (isNaN(Number(formData.year)) || Number(formData.year) <= 0 || Number(formData.year) > new Date().getFullYear() + 5 )) {
        newErrors.year = 'Enter a valid year.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const bookDataToSubmit: Omit<Book, '$id' | 'availableCopies' | 'genreName'> = {
      customBookId: formData.customBookId,
      name: formData.name,
      author: formData.author,
      year: formData.year ? parseInt(formData.year, 10) : null,
      genreId: formData.genreId!,
      location: formData.location,
      totalCopies: parseInt(formData.totalCopies, 10),
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
        isDisabled={!!initialData || isSubmitting} // Disable if editing, ID shouldn't change
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
            label="Publication Year"
            placeholder="e.g., 2023"
            type="number"
            value={formData.year}
            onValueChange={(val) => handleInputChange('year', val)}
            isInvalid={!!errors.year}
            errorMessage={errors.year}
            variant="bordered"
            className="w-full"
            isDisabled={isSubmitting}
            min="1000" // Basic HTML5 validation
            max={new Date().getFullYear() + 5} // Basic HTML5 validation
        />
        <Input
            label="Total Copies"
            placeholder="e.g., 10"
            type="number" // Use number type for numeric input
            value={formData.totalCopies}
            onValueChange={(val) => handleInputChange('totalCopies', val)}
            isInvalid={!!errors.totalCopies}
            errorMessage={errors.totalCopies}
            isRequired
            variant="bordered"
            className="w-full"
            isDisabled={isSubmitting}
            min="0"
        />
      </div>
      <CustomSelect
        label="Genre"
        placeholder={isLoadingGenres ? "Loading genres..." : "Select genre"}
        options={genreOptions}
        value={formData.genreId}
        onChange={(selectedId) => handleInputChange('genreId', selectedId)}
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