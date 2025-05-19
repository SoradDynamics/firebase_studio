// src/features/fee-config/components/FeeEditDrawer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Drawer } from '../../../../common/Drawer';
import Popover from '../../../../common/Popover';
import ActionButton from '../../../../common/ActionButton';
import Table, { ColumnDef } from '../common/Table';
import { Button, Input, Spinner } from '@heroui/react';
import { PlusIcon, TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon as XMarkOutlineIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'; // Added ExclamationTriangleIcon
import { TrashIcon as SolidTrashIcon } from '@heroicons/react/24/solid';

import type { FeeItem, ProcessedFeeConfig } from 'types/fee-config';
import { serializeFeeItems, createFeeConfiguration, updateFeeConfiguration, deleteFeeConfiguration as deleteFullFeeConfig } from './service';

interface FeeEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  configToEdit: ProcessedFeeConfig & { facultyName: string };
}

const FeeEditDrawer: React.FC<FeeEditDrawerProps> = ({ isOpen, onClose, onSaveSuccess, configToEdit }) => {
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [newFeeTitle, setNewFeeTitle] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [currentEditTitle, setCurrentEditTitle] = useState('');
  const [currentEditAmount, setCurrentEditAmount] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingConfig, setIsDeletingConfig] = useState(false);
  const [showDeleteConfigPopover, setShowDeleteConfigPopover] = useState(false);
  const [feeItemToDelete, setFeeItemToDelete] = useState<FeeItem | null>(null);


  useEffect(() => {
    if (isOpen && configToEdit) {
      // Ensure each fee item has a unique 'id' for local state management in the table
      setFees(configToEdit.fees.map((f, index) => ({
        ...f,
        id: f.id || `existing-fee-${configToEdit.$id || 'new'}-${index}-${Date.now()}`
      })));
    } else {
      setFees([]);
      setNewFeeTitle('');
      setNewFeeAmount('');
      setEditingFeeId(null);
    }
  }, [isOpen, configToEdit]);

  const handleAddFeeItem = () => {
    if (!newFeeTitle.trim() || !newFeeAmount.trim() || isNaN(parseFloat(newFeeAmount))) {
      alert('Please enter a valid fee title and amount.');
      return;
    }
    setFees([
      ...fees,
      {
        id: `new-fee-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // More robust unique ID
        title: newFeeTitle.trim(),
        amount: parseFloat(newFeeAmount),
      },
    ]);
    setNewFeeTitle('');
    setNewFeeAmount('');
  };

  const startEditFeeItem = (fee: FeeItem) => {
    setEditingFeeId(fee.id);
    setCurrentEditTitle(fee.title);
    setCurrentEditAmount(String(fee.amount));
  };

  const cancelEditFeeItem = () => {
    setEditingFeeId(null);
    setCurrentEditTitle('');
    setCurrentEditAmount('');
  };

  const saveEditFeeItem = (idToSave: string) => {
    if (!currentEditTitle.trim() || !currentEditAmount.trim() || isNaN(parseFloat(currentEditAmount))) {
      alert('Please enter a valid fee title and amount for editing.');
      return;
    }
    setFees(
      fees.map(f =>
        f.id === idToSave
          ? { ...f, title: currentEditTitle.trim(), amount: parseFloat(currentEditAmount) }
          : f
      )
    );
    cancelEditFeeItem();
  };


  const handleDeleteFeeItem = (feeToDelete: FeeItem) => {
    setFeeItemToDelete(feeToDelete);
  };

  const confirmDeleteFeeItem = () => {
    if (feeItemToDelete) {
      setFees(fees.filter(f => f.id !== feeItemToDelete.id));
      setFeeItemToDelete(null);
    }
  };

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    try {
      const feeDesc = serializeFeeItems(fees);
      if (configToEdit.$id) { // Existing config, update it
        await updateFeeConfiguration(configToEdit.$id, { desc: feeDesc });
      } else { // New config for this class, create it
        await createFeeConfiguration({
          facultyId: configToEdit.facultyId,
          className: configToEdit.className, // Ensure className is correctly passed
          desc: feeDesc,
        });
      }
      onSaveSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving fee configuration:', error);
      alert(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntireConfiguration = async () => {
    if (!configToEdit.$id) {
        alert("This configuration hasn't been saved yet and cannot be deleted.");
        setShowDeleteConfigPopover(false);
        return;
    }
    setIsDeletingConfig(true);
    try {
        await deleteFullFeeConfig(configToEdit.$id);
        onSaveSuccess();
        onClose();
    } catch (error) {
        console.error("Error deleting fee configuration:", error);
        alert(`Failed to delete configuration: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setIsDeletingConfig(false);
        setShowDeleteConfigPopover(false);
    }
  };

  const columns: ColumnDef<FeeItem>[] = [
    { key: 'title', label: 'Fee Title', minWidth: '200px' },
    { key: 'amount', label: 'Amount', align: 'right', minWidth: '100px' },
    { key: 'actions', label: 'Actions', align: 'center', minWidth: '120px' },
  ];

  const renderCell = useCallback((item: FeeItem, columnKey: string) => {
    if (editingFeeId === item.id) {
        if (columnKey === 'title') return <Input size="sm" autoFocus value={currentEditTitle} onValueChange={setCurrentEditTitle} placeholder="Fee Title" className="w-full"/>;
        if (columnKey === 'amount') return <Input size="sm" type="number" value={currentEditAmount} onValueChange={setCurrentEditAmount} placeholder="Amount" className="w-full"/>;
        if (columnKey === 'actions') return (
            <div className="flex items-center justify-center space-x-1">
                <ActionButton icon={<CheckIcon className="w-4 h-4" />} onClick={() => saveEditFeeItem(item.id)} color="green" isIconOnly />
                <ActionButton icon={<XMarkOutlineIcon className="w-4 h-4" />} onClick={cancelEditFeeItem} color="orange" isIconOnly />
            </div>
        );
        return null;
    }

    switch (columnKey) {
      case 'title':
        return item.title;
      case 'amount':
        return item.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
      case 'actions':
        return (
          <div className="flex items-center justify-center space-x-1">
            <ActionButton icon={<PencilSquareIcon className="w-4 h-4" />} onClick={() => startEditFeeItem(item)} color="blue" isIconOnly />
            <ActionButton icon={<TrashIcon className="w-4 h-4" />} onClick={() => handleDeleteFeeItem(item)} color="red" isIconOnly />
          </div>
        );
      default:
        return null;
    }
  }, [editingFeeId, currentEditTitle, currentEditAmount, startEditFeeItem, saveEditFeeItem, cancelEditFeeItem, handleDeleteFeeItem]); // Removed `fees` from dep array as it can cause loops

  if (!configToEdit) return null;

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} size="lg" title={`Configure Fees for ${configToEdit.facultyName} - ${configToEdit.className}`}>
        <Drawer.Body>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Add New Fee Item</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Input
                  label="Fee Title"
                  placeholder="e.g., Monthly Fee"
                  value={newFeeTitle}
                  onValueChange={setNewFeeTitle}
                  disabled={isSaving || !!editingFeeId || isDeletingConfig}
                />
                <Input
                  label="Amount"
                  type="number"
                  placeholder="e.g., 1000"
                  value={newFeeAmount}
                  onValueChange={setNewFeeAmount}
                  disabled={isSaving || !!editingFeeId || isDeletingConfig}
                />
                <Button
                  color="primary"
                  onPress={handleAddFeeItem}
                  startContent={<PlusIcon className="w-5 h-5" />}
                  className="md:mt-auto h-[42px]"
                  isDisabled={isSaving || !!editingFeeId || isDeletingConfig}
                >
                  Add Fee
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Current Fee Structure</h3>
              {fees.length > 0 ? (
                <Table<FeeItem>
                  columns={columns}
                  data={fees}
                  getRowKey={(item) => item.id} // Ensure item.id is always unique and present
                  renderCell={renderCell}
                  isLoading={isSaving}
                  emptyContent="No fees added yet."
                  className="shadow rounded-md"
                  tableClassName="min-w-full border-collapse text-gray-800 dark:text-gray-200"
                  headerClassName="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600"
                  bodyClassName="bg-white dark:bg-gray-800"
                  cellClassName="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap"
                  headerCellClassName="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide"
                />
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No fees added yet. Use the form above to add fee items.</p>
              )}
            </div>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex justify-between w-full items-center">
             {configToEdit.$id && ( // Only show delete for existing configs
                 <Button
                    color="danger"
                    variant="ghost"
                    onPress={() => setShowDeleteConfigPopover(true)}
                    isLoading={isDeletingConfig}
                    startContent={!isDeletingConfig ? <SolidTrashIcon className="w-5 h-5" /> : null}
                    isDisabled={isSaving}
                >
                    Delete Entire Configuration
                </Button>
             )}
             {!configToEdit.$id && <div />}
            <div className="flex space-x-2">
                <Button variant="flat" onPress={onClose} disabled={isSaving || isDeletingConfig}>
                    Cancel
                </Button>
                <Button color="success" onPress={handleSaveConfiguration} isLoading={isSaving} disabled={isDeletingConfig}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
          </div>
        </Drawer.Footer>
      </Drawer>

      <Popover
        isOpen={!!feeItemToDelete}
        onClose={() => setFeeItemToDelete(null)}
        onConfirm={confirmDeleteFeeItem}
        title="Confirm Fee Item Deletion"
        content={`Are you sure you want to delete the fee item "${feeItemToDelete?.title}"? This only removes it from the current editing session until saved.`}
      />
      <Popover
        isOpen={showDeleteConfigPopover}
        onClose={() => setShowDeleteConfigPopover(false)}
        onConfirm={handleDeleteEntireConfiguration}
        title={<div className="flex items-center"><ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-2" /> Delete Fee Configuration</div>}
        content={`Are you sure you want to delete the entire fee configuration for ${configToEdit.facultyName} - ${configToEdit.className}? This action cannot be undone.`}
        isConfirmLoading={isDeletingConfig}
      />
    </>
  );
};

export default FeeEditDrawer;