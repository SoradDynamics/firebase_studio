// src/Transport/List.tsx
import React, { useState, useEffect, useCallback } from "react";
import { FaPlus } from "react-icons/fa6";
import { TbReload } from "react-icons/tb";
import { useDisclosure, Button, Input } from "@heroui/react";
import { Drawer } from "components/common/Drawer"; // Assuming common Drawer component
import { useTransportStore } from "~/store/transportStore"; // Use the new store
import { Driver } from 'types'; // Import Driver type

import ErrorMessage from "../common/ErrorMessage"; // Assuming common component
import SearchBar from "../../../common/SearchBar";     // Assuming common component
import ActionButton from "../../../../common/ActionButton"; // Assuming common component
import TransportTableRoute from "./transportTable"; // Import the new table component
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

interface ListProps {
  isMobile: boolean;
  onDriverSelect: (driver: Driver | null) => void; // Changed prop name
  driverData: Driver[]; // Changed prop name
  isLoading: boolean;
}

const List: React.FC<ListProps> = ({ isMobile, onDriverSelect, driverData, isLoading }) => {
  const { addDriverData, fetchDriversData, error: storeError } = useTransportStore(); // Get funcs/data from new store

  const [searchText, setSearchText] = useState<string>("");
  const handleSearchChange = (value: string) => {
    setSearchText(value);
  };

  // Disclosure for Add Drawer
  const {
    isOpen: isAddDrawerOpen,
    onOpen: onAddDrawerOpen,
    onOpenChange: onAddDrawerOpenChange, // Use if needed
    onClose: onAddDrawerClose,
  } = useDisclosure();

  // State for Add Drawer Inputs
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverRoute, setNewDriverRoute] = useState("");
  const [newDriverEmail, setNewDriverEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  // State for clearing table selection (passed up from table)
  const [tableClearSelection, setTableClearSelection] = useState<(() => void) | null>(null);

  // Handle Add Button Click
  const handleAdd = () => {
    // Reset form and errors before opening
    setNewDriverName("");
    setNewDriverRoute("");
    setNewDriverEmail("");
    setAddError(null);
    onAddDrawerOpen();
  };

  // Handle Refresh Button Click
  const handleRefresh = () => {
    fetchDriversData(); // Call fetch function from the store
  };

  // Handle Saving New Driver from Add Drawer
  const handleAddSaveNewDriver = async () => {
    setAddError(null); // Clear previous errors

    // Validation
    if (!newDriverName.trim()) {
      setAddError("Driver Name is required.");
      return;
    }
    if (!newDriverRoute.trim()) {
      setAddError("Route is required.");
      return;
    }
    if (!newDriverEmail.trim() || !newDriverEmail.includes('@')) { // Simple email validation
      setAddError("A valid Email is required.");
      return;
    }

    const newDriverPayload = {
      driverName: newDriverName.trim(),
      route: newDriverRoute.trim(),
      email: newDriverEmail.trim(),
    };

    try {
      await addDriverData(newDriverPayload);
      onAddDrawerClose(); // Close drawer on success
      // No need to manually refresh, store update should trigger re-render
      // Resetting state is handled in handleAdd now
    } catch (error: any) {
      console.error("Error adding driver data:", error);
      setAddError(error.message || "Failed to add driver.");
    }
  };

  // Callback for mobile back button (clears table selection)
   const handleBackToList = () => {
     if (tableClearSelection) {
       tableClearSelection();
     }
     // Parent (Transport.tsx) handles hiding details and clearing selectedDriver
   };

  // Filter data based on search text
  const dataForTable = searchText
    ? driverData.filter((driver) =>
        driver.driverName.toLowerCase().includes(searchText.toLowerCase()) ||
        driver.route.toLowerCase().includes(searchText.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchText.toLowerCase())
      )
    : driverData;

  // Combine store error and add drawer error for display
  const errorMessage = storeError || addError; // Prioritize store error if both exist?

  return (
    <div className=" md:w-full w-full md:p-2 ">
      {/* Display Error Messages */}
      {errorMessage && !isAddDrawerOpen && <ErrorMessage message={errorMessage} />} {/* Show general errors only when drawer is closed */}

      {/* Top Control Bar */}
      <div className="flex justify-between items-center gap-4 mt-1 mx-3 md:px-0">
        {/* Add Button */}
        <ActionButton
          icon={<FaPlus className="w-4 h-4 text-gray-100 transition duration-200" />}
          onClick={handleAdd}
          color="orange" // Or choose appropriate color
          aria-label="Add Driver"
        />
        {/* Search Bar */}
        <SearchBar
          placeholder="Search drivers by name, route, email..."
          value={searchText}
          onValueChange={handleSearchChange}
        />
        {/* Refresh Button */}
        <ActionButton
          icon={<TbReload className="w-5 h-5 text-gray-100 transition duration-200" />}
          onClick={handleRefresh}
          aria-label="Refresh Driver List"
        />
      </div>

      {/* Transport Table Component */}
      <TransportTableRoute
        driverData={dataForTable}
        isLoading={isLoading}
        onDriverSelect={onDriverSelect} // Pass down the selection handler
        onClearSelection={(clearFn) => setTableClearSelection(() => clearFn)} // Receive clear selection function
      />

      {/* Add Driver Drawer */}
      <Drawer
        isOpen={isAddDrawerOpen}
        onClose={onAddDrawerClose}
        // onOpenChange={onAddDrawerOpenChange}
        position="right"
        nonDismissable={true}
        size="md"
      >
        <Drawer.Header showCloseButton={true}>Add New Driver</Drawer.Header>
        <Drawer.Body>
          <div className="flex flex-col gap-4">
            {/* Add Drawer Error Message */}
            {addError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error!</strong>
                <span className="block sm:inline"> {addError}</span>
                <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
                   <ExclamationTriangleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                 </span>
              </div>
            )}
            {/* Driver Name Input */}
            <Input
              id="add-driver-name"
              type="text"
              label="Driver Name"
              variant="underlined"
              value={newDriverName}
              isRequired
              color="secondary"
              className="font-medium"
              onChange={(e) => {
                setNewDriverName(e.target.value);
                setAddError(null); // Clear error when typing
              }}
            />
            {/* Route Input */}
            <Input
              id="add-driver-route"
              type="text"
              label="Route"
              variant="underlined"
              value={newDriverRoute}
              isRequired
              color="secondary"
              className="font-medium"
              onChange={(e) => {
                setNewDriverRoute(e.target.value);
                setAddError(null);
              }}
            />
            {/* Email Input */}
            <Input
              id="add-driver-email"
              type="email"
              label="Email"
              variant="underlined"
              value={newDriverEmail}
              isRequired
              color="secondary"
              className="font-medium"
              onChange={(e) => {
                setNewDriverEmail(e.target.value);
                setAddError(null);
              }}
            />
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button color="danger" variant="light" onPress={onAddDrawerClose}>
            Cancel
          </Button>
          <Button
            color="success"
            onPress={handleAddSaveNewDriver}
            className="text-white font-medium"
            // Consider adding isLoading state to disable button during add operation
          >
            Save Driver
          </Button>
        </Drawer.Footer>
      </Drawer>
    </div>
  );
};

export default List;