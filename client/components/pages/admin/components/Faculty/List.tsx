// List.tsx
// src/List.tsx
import React, { useState, useEffect, useCallback } from "react";
import { FaPlus } from "react-icons/fa6";
import { TbReload } from "react-icons/tb";
import {
  useDisclosure,
  Button,
  Input,
} from "@heroui/react";
import { Drawer } from "components/common/Drawer";
import { useFacultyStore } from "~/store/facultyStore";

import ErrorMessage from "../common/ErrorMessage";
import SearchBar from "../common/SearchBar";
import ActionButton from "../common/ActionButton";
import FacultyTableRoute from "./facultyTable";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { FaSave } from "react-icons/fa";

interface Faculty {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  id: string;
  name: string;
  classes: string[];
}

interface ListProps {
  isMobile: boolean;
  onFacultySelect: (faculty: Faculty | null) => void; // Receive onFacultySelect from Faculty.tsx
  facultyData: Faculty[]; // Receive facultyData as prop
  isLoading: boolean;    // Receive isLoading as prop
}

const List: React.FC<ListProps> = ({ isMobile, onFacultySelect, facultyData, isLoading }) => { // Destructure facultyData and isLoading from props
  const { addFacultyData, fetchFacultyData } = useFacultyStore(); // Get fetchFacultyData from store

  const [searchText, setSearchText] = useState<string>("");
  const handleSearchChange = (value: string) => {
    setSearchText(value);
  };

  const [errorMessage, setErrorMessage] = useState<string | null>("");

  const {
    isOpen: isAddDrawerOpen,
    onOpen: onAddDrawerOpen,
    onOpenChange: onAddDrawerOpenChange,
    onClose: onAddDrawerClose,
  } = useDisclosure();
  const [newFacultyName, setNewFacultyName] = useState("");
  const [newFacultyClasses, setNewFacultyClasses] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [tableClearSelection, setTableClearSelection] = useState<
    (() => void) | null
  >(null);


  const handleAdd = () => {
    onAddDrawerOpen();
  };

  const handleRefresh = () => {
    // console.log("List: handleRefresh - calling fetchFacultyData");
    fetchFacultyData(); // Call fetchFacultyData to reload table data
  };

  const handleAddSaveNewFaculty = async () => {
    setAddError(null); // Clear previous errors

    if (!newFacultyName.trim()) {
      setAddError("Faculty Name is required.");
      return;
    }

    if (!newFacultyClasses.trim()) {
      setAddError("Classes are required.");
      return;
    }

    const classesArray = newFacultyClasses
      .split(",")
      .map((cls) => cls.trim())
      .filter((cls) => cls !== "");

    const newFacultyData = {
      name: newFacultyName,
      classes: classesArray,
      id: Math.random().toString(36).substring(2, 15),
    };

    try {
      await addFacultyData(newFacultyData);
      onAddDrawerClose();
      // fetchFacultyData(); // No need to fetch all data again - data is updated in store directly in addFacultyData
      // window.location.reload(); // No full page reload needed
      setNewFacultyName("");
      setNewFacultyClasses("");
    } catch (addError: any) {
      // console.error("Error adding faculty data:", addError);
      setAddError(addError.message || "Failed to add faculty.");
    }
  };

  const handleBackToList = () => {
    if (tableClearSelection) {
      tableClearSelection();
    }
  };

  // Determine data for table
  const dataForTable = searchText
    ? facultyData.filter((faculty) =>
        faculty.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : facultyData;

  return (
    <div className=" md:w-full w-full md:p-2 ">
      {errorMessage && <ErrorMessage message={errorMessage} />}

      {/* Top Section */}
      <div className="flex justify-between items-center gap-4 mt-1 mx-3 md:px-0">
        <ActionButton
          icon={
            <FaPlus className="w-4 h-4 text-gray-100 transition duration-200" />
          }
          onClick={handleAdd}
          color="orange"
          aria-label="Add Faculty"
        />
        <SearchBar
          placeholder="Search faculty members..."
          value={searchText}
          onValueChange={handleSearchChange}
        />
        <ActionButton
          icon={
            <TbReload className="w-5 h-5 text-gray-100 transition duration-200" />
          }
          onClick={handleRefresh}
          aria-label="Refresh Faculty List"
        />
      </div>

      {/* Faculty Table Route - Pass dataForTable, isLoading and onFacultySelect */}
      <FacultyTableRoute
        facultyData={dataForTable}
        isLoading={isLoading}
        onFacultySelect={onFacultySelect} // Pass onFacultySelect prop down
        onClearSelection={(clearFn) => setTableClearSelection(() => clearFn)}
      />

      {/* Add Faculty Drawer */}
      <Drawer
        isOpen={isAddDrawerOpen}
        onClose={onAddDrawerClose}
        position="right"
        nonDismissable={true} 
        size="md"
      >
        <Drawer.Header showCloseButton={true}>
          Add New Faculty
        </Drawer.Header>
        <Drawer.Body>
          <div className="flex flex-col gap-4">
            {addError && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
                role="alert"
              >
                <strong className="font-bold">Error!</strong>
                <span className="block sm:inline">{addError}</span>
                <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                </span>
              </div>
            )}
            {/* Name */}
            <Input
              id="add-faculty-name"
              type="text"
              label="Faculty Name"
              variant="underlined"
              value={newFacultyName}
              isRequired
              color="secondary"
              className="font-medium"
              onChange={(e) => {
                setNewFacultyName(e.target.value);
                setAddError(null); // Clear error when typing
              }}
            />

            {/* Classes (comma-separated) */}
            <Input
              id="add-faculty-classes"
              type="text"
              variant="underlined"
              label="Classes (comma-separated)"
              value={newFacultyClasses}
              isRequired
              color="secondary"
              className="font-medium"
              onChange={(e) => {
                setNewFacultyClasses(e.target.value);
                setAddError(null); // Clear error when typing
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
            onPress={handleAddSaveNewFaculty}
            className="text-white font-medium"
          >
            Save
          </Button>
        </Drawer.Footer>
      </Drawer>
    </div>
  );
};

export default List;