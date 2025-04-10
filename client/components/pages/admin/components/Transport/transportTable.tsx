// src/Transport/transportTable.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTransportStore } from "~/store/transportStore"; // Import new store
import { Driver } from 'types'; // Import Driver type
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  Selection,
  Tooltip,
  Button,
  useDisclosure,
  Input,
} from "@heroui/react";
import { Drawer } from "components/common/Drawer";
import { TrashIcon, PencilIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import Popover from "../common/Popover"; // Assuming Popover is in common

interface TransportTableRouteProps {
  driverData: Driver[];
  isLoading: boolean;
  onDriverSelect: (driver: Driver | null) => void; // Changed prop name
  onClearSelection?: (clearFn: () => void) => void;
}

const TransportTableRoute: React.FC<TransportTableRouteProps> = ({
  driverData,
  isLoading,
  onDriverSelect,
  onClearSelection,
}) => {
  const { updateDriverData, deleteDriverData } = useTransportStore(); // Use funcs from new store
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure(); // Edit drawer disclosure
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editDriverName, setEditDriverName] = useState("");
  const [editDriverRoute, setEditDriverRoute] = useState("");
  const [editDriverEmail, setEditDriverEmail] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set([]));

  const [editError, setEditError] = useState<string | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null); // State for delete confirmation
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);

  // --- Edit Handling ---
  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setEditDriverName(driver.driverName);
    setEditDriverRoute(driver.route);
    setEditDriverEmail(driver.email);
    setEditError(null); // Clear previous errors
    onOpen(); // Open edit drawer
  };

  const handleSave = async () => {
    if (!editingDriver) return;
    setEditError(null);

    // Basic Validation
    if (!editDriverName.trim()) {
      setEditError("Driver Name is required.");
      return;
    }
    if (!editDriverRoute.trim()) {
      setEditError("Route is required.");
      return;
    }
    if (!editDriverEmail.trim() || !editDriverEmail.includes('@')) { // Simple email check
      setEditError("A valid Email is required.");
      return;
    }

    // Construct the updated driver object (only including fields to update)
    const updatedDriverData = {
      ...editingDriver, // Keep existing data like $id, etc.
      driverName: editDriverName.trim(),
      route: editDriverRoute.trim(),
      email: editDriverEmail.trim(),
    };

    try {
      await updateDriverData(updatedDriverData);
      onClose(); // Close drawer on success
      setSelectedKeys(new Set([])); // Deselect row
      onDriverSelect(null); // Clear details view
    } catch (updateError: any) {
      console.error("TransportTable: Error updating driver data:", updateError);
      setEditError(updateError.message || "Failed to update driver.");
    }
  };

  // --- Delete Handling ---
  const handleDelete = (driver: Driver) => {
    setDriverToDelete(driver);
    setIsDeletePopoverOpen(true); // Show confirmation popover
  };

  const handleCancelDelete = () => {
    setIsDeletePopoverOpen(false);
    setDriverToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!driverToDelete) return;
    try {
      await deleteDriverData(driverToDelete.$id); // Call store delete function with document $id
      setIsDeletePopoverOpen(false);
      setDriverToDelete(null);
      setSelectedKeys(new Set([])); // Deselect row
      onDriverSelect(null); // Clear details view
    } catch (deleteError: any) {
      console.error("TransportTable: Error deleting driver data:", deleteError);
      // Display error to user (e.g., using a toast notification or alert)
      alert(`Error deleting driver: ${deleteError.message || "Unknown error"}`);
      setIsDeletePopoverOpen(false); // Still close popover on error
      setDriverToDelete(null);
    }
  };

  // --- Selection Handling ---
  const handleSelectionChange = (keys: Selection) => {
    let selectedKeySet: Set<string> = new Set();
    if (keys === 'all') {
       // Handle "select all" if needed, though current mode is single
    } else if (keys instanceof Set) {
       selectedKeySet = keys as Set<string>;
    }

    setSelectedKeys(selectedKeySet);

    if (selectedKeySet.size > 0) {
      const selectedKey = Array.from(selectedKeySet)[0]; // Get the single selected key
      const selectedDriver = driverData.find((driver) => driver.$id === selectedKey);
      onDriverSelect(selectedDriver || null);
    } else {
      onDriverSelect(null); // No selection or deselect
    }
  };

   // --- Clear Selection ---
   const clearSelectedRow = useCallback(() => {
    setSelectedKeys(new Set([]));
    // Note: onDriverSelect(null) should be called by the parent component (List) when needed.
  }, []);

  useEffect(() => {
    if (onClearSelection) {
      onClearSelection(clearSelectedRow);
    }
  }, [onClearSelection, clearSelectedRow]);


  // --- Render Logic ---
  if (isLoading && driverData.length === 0) { // Show spinner only on initial load
    return (
      <div className="h-52 flex items-center justify-center">
        <Spinner size="lg" label="Loading Drivers..." />
      </div>
    );
  }

  return (
    <div className="mt-4 flow-root md:px-0 lg:px-8">
      <div className="-my-2 overflow-x-auto lg:-mx-8">
        <div className="inline-block min-w-full pt-2 align-middle">
          <Table
            isHeaderSticky
            isCompact
            aria-label="Drivers Table"
            selectionMode="single" // Keep single selection
            selectedKeys={selectedKeys}
            onSelectionChange={handleSelectionChange}
            color="secondary"
            className="min-w-full divide-y divide-gray-300"
          >
            <TableHeader>
              <TableColumn key="driverName">Name</TableColumn>
              <TableColumn key="route">Route</TableColumn>
              <TableColumn key="email">Email</TableColumn>
              <TableColumn key="actions" align="center">
                Actions
              </TableColumn>
            </TableHeader>
            <TableBody
              items={driverData}
              isLoading={isLoading} // Use table's built-in loading state
              loadingContent={<Spinner label="Loading..." />}
              emptyContent={
                driverData.length === 0 && !isLoading ? (
                    <div className=" text-gray-500 p-5 text-center text-medium"> No Data Found</div>
                ) : null
              }
            >
              {(driver) => ( // Use TableBody's render function
                <TableRow key={driver.$id}>
                  <TableCell>{driver.driverName}</TableCell>
                  <TableCell>{driver.route}</TableCell>
                  <TableCell>{driver.email}</TableCell>
                  <TableCell className="flex justify-center gap-2">
                    {/* Edit Button */}
                    <Tooltip content="Edit" showArrow color="warning" placement="top" className="bg-warning-500 text-white rounded-md shadow-md">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="warning"
                        onPress={() => handleEdit(driver)}
                        aria-label="Edit Driver"
                      >
                        <PencilIcon className="h-4 w-4 text-orange-500" />
                      </Button>
                    </Tooltip>
                    {/* Delete Button */}
                    <Tooltip content="Delete" showArrow color="danger" placement="top" className="bg-danger-500 text-white rounded-md shadow-md">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => handleDelete(driver)}
                        aria-label="Delete Driver"
                      >
                        <TrashIcon className="h-4 w-4 text-red-500" />
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Popover */}
      <Popover
        isOpen={isDeletePopoverOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirm Delete"
        content={
          driverToDelete
            ? `Are you sure you want to delete driver: ${driverToDelete.driverName}?`
            : ""
        }
      />

      {/* Edit Driver Drawer */}
      <Drawer
        isOpen={isOpen}
        onClose={onClose} // Allow closing via backdrop or X button
        // onOpenChange={onOpenChange}
        position="right"
        size="md"
        nonDismissable={true} // Prevent closing on backdrop click if needed
      >
        <Drawer.Header showCloseButton={true}>Edit Driver</Drawer.Header>
        <Drawer.Body>
          <div className="flex flex-col gap-4">
            {/* Edit Error Message */}
            {editError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error!</strong>
                <span className="block sm:inline"> {editError}</span>
                 <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                </span>
              </div>
            )}
            {/* Driver Name Input */}
            <Input
              id="edit-driver-name"
              type="text"
              color="secondary"
              label="Driver Name"
              variant="underlined"
              value={editDriverName}
              className="font-medium"
              isRequired
              onChange={(e) => {
                setEditDriverName(e.target.value);
                setEditError(null); // Clear error on change
              }}
            />
            {/* Route Input */}
            <Input
              id="edit-driver-route"
              type="text"
              color="secondary"
              label="Route"
              variant="underlined"
              value={editDriverRoute}
              className="font-medium"
              isRequired
              onChange={(e) => {
                setEditDriverRoute(e.target.value);
                setEditError(null);
              }}
            />
            {/* Email Input */}
            <Input
              id="edit-driver-email"
              type="email"
              color="secondary"
              label="Email"
              variant="underlined"
              value={editDriverEmail}
              className="font-medium"
              isRequired
              isDisabled
              onChange={(e) => {
                setEditDriverEmail(e.target.value);
                setEditError(null);
              }}
            />
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button color="danger" variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="success" onPress={handleSave} className="text-white font-medium">
            Save Changes
          </Button>
        </Drawer.Footer>
      </Drawer>
    </div>
  );
};

export default TransportTableRoute;