// src/pages/library/ConfigureGenresPage.tsx
import React, { useEffect, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@heroui/react';
import { toast } from 'react-hot-toast';

import PageHeader from '../common/PageHeader';
import DataTable, { ColumnDef } from '../common/DataTable';
import { Drawer } from '../../../../common/Drawer'; // Your provided Drawer
import Popover from '../../../../common/Popover'; // Your provided Popover
import ActionButton from '../../../../common/ActionButton'; // Your provided ActionButton
import GenreForm from './GenreForm';
import LoadingOverlay from '../common/LoadingOverlay';

import { useLibraryStore } from '~/store/libraryStore';
import type { Document } from 'types/appwrite';
import type { BookGenre } from 'types/library';

const ConfigureGenresPage: React.FC = () => {
  const {
    genres,
    isLoadingGenres,
    fetchGenres,
    addGenre,
    updateGenre,
    deleteGenre,
  } = useLibraryStore();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<Document<BookGenre> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchGenres().catch(err => toast.error("Failed to load genres."));
  }, [fetchGenres]);

  const handleAddGenre = () => {
    setSelectedGenre(null);
    setIsDrawerOpen(true);
  };

  const handleEditGenre = (genre: Document<BookGenre>) => {
    setSelectedGenre(genre);
    setIsDrawerOpen(true);
  };

  const handleDeleteGenre = (genre: Document<BookGenre>) => {
    setSelectedGenre(genre);
    setIsPopoverOpen(true);
  };

  const handleFormSubmit = async (data: Omit<BookGenre, '$id'>) => {
    setIsSubmitting(true);
    try {
      if (selectedGenre) {
        await updateGenre(selectedGenre.$id!, data);
        toast.success('Genre updated successfully!');
      } else {
        await addGenre(data);
        toast.success('Genre added successfully!');
      }
      setIsDrawerOpen(false);
      setSelectedGenre(null);
    } catch (error) {
      console.error('Failed to save genre:', error);
      toast.error(`Failed to save genre: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedGenre) return;
    setIsSubmitting(true);
    try {
      await deleteGenre(selectedGenre.$id!);
      toast.success('Genre deleted successfully!');
      setIsPopoverOpen(false);
      setSelectedGenre(null);
    } catch (error) {
      console.error('Failed to delete genre:', error);
      toast.error(`Failed to delete genre: ${(error as Error).message}. It might be in use.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<Document<BookGenre>>[] = [
    { accessorKey: 'name', header: 'Genre Name' },
    { accessorKey: 'description', header: 'Description', cell: (row) => row.description || '-' },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex space-x-2">
          <ActionButton
            icon={<PencilIcon className="h-4 w-4" />}
            onClick={() => handleEditGenre(row)}
            color="orange"
            isIconOnly
          />
          <ActionButton
            icon={<TrashIcon className="h-4 w-4" />}
            onClick={() => handleDeleteGenre(row)}
            color="red"
            isIconOnly
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Configure Book Genres"
        actionButton={
          <Button color="primary" onPress={handleAddGenre} startContent={<PlusIcon className="h-5 w-5" />}>
            Add Genre
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={genres}
        isLoading={isLoadingGenres && !isSubmitting} // Show table loading only if not submitting form
        emptyStateMessage="No genres found. Add one to get started!"
      />

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={selectedGenre ? "Edit Genre" : "Add New Genre"} size="md">
        <Drawer.Body>
          <GenreForm
            initialData={selectedGenre}
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
        title="Delete Genre"
        content={`Are you sure you want to delete the genre "${selectedGenre?.name}"? This action cannot be undone.`}
        isConfirmLoading={isSubmitting}
      />
      <LoadingOverlay isLoading={isSubmitting && !isDrawerOpen && !isPopoverOpen} message="Processing..."/>
    </div>
  );
};

export default ConfigureGenresPage;