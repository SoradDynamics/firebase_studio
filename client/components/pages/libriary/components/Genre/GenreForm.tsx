// src/components/library/GenreForm.tsx
import React, { useEffect, useState } from 'react';
import { Input, Textarea, Button } from '@heroui/react'; // Assuming Textarea exists or use a simple textarea
import type { BookGenre } from 'types/library';

interface GenreFormProps {
  initialData?: BookGenre | null;
  onSubmit: (data: Omit<BookGenre, '$id'>) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

const GenreForm: React.FC<GenreFormProps> = ({ initialData, onSubmit, onClose, isSubmitting }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
    } else {
        setName('');
        setDescription('');
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: { name?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'Genre name is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ name, description });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-1">
      <div>
        <Input
          label="Genre Name"
          placeholder="e.g., Science Fiction"
          value={name}
          onValueChange={setName}
          isInvalid={!!errors.name}
          errorMessage={errors.name}
          isRequired
          variant="bordered"
          className="w-full"
        />
      </div>
      <div>
        <label htmlFor="genre-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
        </label>
        <Textarea // Or <textarea className="hero-ui-like-input-styles w-full" />
          id="genre-description"
          placeholder="A brief description of the genre"
          value={description}
          onValueChange={setDescription} // hero-ui might use onChange
          variant="bordered"
          className="w-full min-h-[80px]"
          // minRows={3} // hero-ui Textarea might have minRows
        />
      </div>
      <div className="flex justify-end space-x-3 pt-2">
        <Button type="button" color="default" variant="flat" onPress={onClose} isDisabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" color="primary" isLoading={isSubmitting} isDisabled={isSubmitting}>
          {initialData ? 'Update Genre' : 'Add Genre'}
        </Button>
      </div>
    </form>
  );
};

export default GenreForm;