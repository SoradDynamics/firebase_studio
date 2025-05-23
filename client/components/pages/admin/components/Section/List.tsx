// src/Section/List.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaPlus } from "react-icons/fa6";
import { TbReload, TbRotateRectangle } from "react-icons/tb";
import {
  useDisclosure,
  Button,
  Input,
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";
import { useSectionStore } from "~/store/sectionStore";
import { useFacultyStore } from "~/store/facultyStore";
import { Faculty, Section } from "types";

import ErrorMessage from "../common/ErrorMessage";
import SearchBar from "../../../common/SearchBar";
import ActionButton from "../../../../common/ActionButton";
import SectionTableRoute from "./sectionTable";
import { Drawer } from "components/common/Drawer"; // Import Drawer component
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { FaSave } from "react-icons/fa";

interface ListProps {
  isMobile: boolean;
  onSectionSelect: (section: Section | null) => void;
  sectionData: Section[];
  isLoading: boolean;
}

const List: React.FC<ListProps> = ({
  isMobile,
  onSectionSelect,
  sectionData,
  isLoading,
}) => {
  const { addSectionData, fetchSectionData } = useSectionStore();
  const { facultyData, fetchFacultyData, isFacultyLoading } = useFacultyStore();

  const [searchText, setSearchText] = useState<string>("");
  const handleSearchChange = (value: string) => {
    setSearchText(value);
  };

  const [errorMessage, setErrorMessage] = useState<string | null>("");

  // Use disclosure for drawer
  const {
    isOpen: isAddDrawerOpen, // Renamed for clarity
    onOpen: onAddDrawerOpen,  // Renamed for clarity
    onOpenChange: onAddDrawerOpenChange, // Renamed for clarity
    onClose: onAddDrawerClose,  // Renamed for clarity
  } = useDisclosure();
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionSubjects, setNewSectionSubjects] = useState("");
  const [newSectionClass, setNewSectionClass] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [addError, setAddError] = useState<string | null>(null);
  const [tableClearSelection, setTableClearSelection] = useState<
    (() => void) | null
  >(null);

  const [facultyFilter, setFacultyFilter] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("");

  // State for Autocomplete Filtering
  const [filteredFacultyItems, setFilteredFacultyItems] = useState<
    { key: string; label: string }[]
  >([]);
  const [filteredClassItems, setFilteredClassItems] = useState<
    { key: string; label: string }[]
  >([]);
  const [filteredAddModalFacultyItems, setFilteredAddModalFacultyItems] =
    useState<{ key: string; label: string }[]>([]);
  const [filteredAddModalClassItems, setFilteredAddModalClassItems] = useState<
    { key: string; label: string }[]
  >([]);

  useEffect(() => {
    fetchFacultyData();
  }, [fetchFacultyData]);

  useEffect(() => {
    setFilteredFacultyItems(
      facultyData.map((faculty) => ({ key: faculty.$id, label: faculty.name }))
    );
    setFilteredAddModalFacultyItems(
      facultyData.map((faculty) => ({ key: faculty.$id, label: faculty.name }))
    );
  }, [facultyData]);

  useEffect(() => {
    setFilteredClassItems(
      facultyFilter
        ? (facultyData.find((f) => f.$id === facultyFilter)?.classes ?? []).map(
            (cls) => ({ key: cls, label: cls })
          )
        : []
    );
    setFilteredAddModalClassItems(
      selectedFacultyId
        ? (
            facultyData.find((f) => f.$id === selectedFacultyId)?.classes ?? []
          ).map((cls) => ({ key: cls, label: cls }))
        : []
    );
  }, [facultyFilter, selectedFacultyId, facultyData]);

  const handleAdd = () => {
    onAddDrawerOpen(); // Open the drawer
  };

  const handleRefresh = () => {
    fetchSectionData();
  };

  const handleResetFilters = () => {
    setFacultyFilter("");
    setClassFilter("");
  };

  const handleAddSaveNewSection = async () => {
    setAddError(null);

    if (!newSectionName.trim()) {
      setAddError("Section Name is required.");
      return;
    }

    if (!newSectionSubjects.trim()) {
      setAddError("Subjects are required.");
      return;
    }
    if (!newSectionClass.trim()) {
      setAddError("Class is required.");
      return;
    }
    if (!selectedFacultyId) {
      setAddError("Faculty is required to select class.");
      return;
    }

    const subjectsArray = newSectionSubjects
      .split(",")
      .map((sub) => sub.trim())
      .filter((sub) => sub !== "");

    const newSectionData = {
      name: newSectionName,
      subjects: subjectsArray,
      class: newSectionClass,
      facultyId: selectedFacultyId,
      id: Math.random().toString(36).substring(2, 15),
    };

    try {
      await addSectionData(newSectionData);
      onAddDrawerClose(); // Close the drawer
      setNewSectionName("");
      setNewSectionSubjects("");
      setNewSectionClass("");
      setSelectedFacultyId("");
    } catch (addError: any) {
      console.error("Error adding section data:", addError);
      setAddError(addError.message || "Failed to add section.");
    }
  };

  const handleBackToList = () => {
    if (tableClearSelection) {
      tableClearSelection();
    }
  };

  const filteredSectionData = useMemo(() => {
    let filteredData = sectionData;

    if (searchText) {
      filteredData = filteredData.filter((section) =>
        section.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (facultyFilter) {
      filteredData = filteredData.filter(
        (section) => section.facultyId === facultyFilter
      );
    }

    if (classFilter) {
      filteredData = filteredData.filter(
        (section) => section.class === classFilter
      );
    }

    return filteredData;
  }, [sectionData, searchText, facultyFilter, classFilter]);

  return (
    <div className=" md:w-full w-full md:p-2 ">
      {errorMessage && <ErrorMessage message={errorMessage} />}

      <div className="top">
        <div className="flex justify-between items-center gap-4 mt-1 mx-3 md:px-0">
          <ActionButton
            icon={
              <FaPlus className="w-4 h-4 text-gray-100 transition duration-200" />
            }
            onClick={handleAdd}
            color="orange"
            aria-label="Add Section"
          />

          <SearchBar
            placeholder="Search sections..."
            value={searchText}
            onValueChange={handleSearchChange}
          />

          <ActionButton
            icon={
              <TbReload className="w-5 h-5 text-gray-100 transition duration-200" />
            }
            onClick={handleRefresh}
            aria-label="Refresh Section List"
          />
        </div>

        <div className="filter flex pt-3 px-3 gap-3 justify-center">
          {/* Faculty Filter Autocomplete */}
            <Autocomplete
              placeholder="Faculty"
              className=" max-w-[15rem]"
              variant="faded"
              selectedKey={facultyFilter}
              onSelectionChange={(key) => {
                setFacultyFilter(key ? key.toString() : "");
                setClassFilter("");
                setFilteredClassItems(
                  key
                    ? (
                        facultyData.find((f) => f.$id === key)?.classes ?? []
                      ).map((cls) => ({ key: cls, label: cls }))
                    : []
                );
              }}
              items={filteredFacultyItems}
              onInputChange={(value) => {
                const filtered = facultyData
                  .filter((faculty) =>
                    faculty.name.toLowerCase().includes(value.toLowerCase())
                  )
                  .map((faculty) => ({
                    key: faculty.$id,
                    label: faculty.name,
                  }));
                setFilteredFacultyItems(filtered);
              }}
            >
              {(item) => (
                <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>
              )}
            </Autocomplete>

          {/* Class Filter Autocomplete */}
            <Autocomplete
              placeholder="Class"
              className=" max-w-[15rem]"
              variant="faded"
              selectedKey={classFilter}
              onSelectionChange={(key) => {
                setClassFilter(key ? key.toString() : "");
              }}
              disabled={!facultyFilter}
              items={filteredClassItems}
              onInputChange={(value) => {
                const allClassesForFaculty = facultyFilter
                  ? facultyData.find((f) => f.$id === facultyFilter)?.classes ??
                    []
                  : [];
                const filteredClasses = allClassesForFaculty
                  .filter((cls) =>
                    cls.toLowerCase().includes(value.toLowerCase())
                  )
                  .map((cls) => ({ key: cls, label: cls }));
                setFilteredClassItems(filteredClasses);
              }}
            >
              {(item) => (
                <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>
              )}
            </Autocomplete>

          {/* <div className=" mt-1.5">
          <ActionButton
            icon={
              <TbRotateRectangle className="w-5 h-5 font-semibold text-gray-100 transition duration-200" />
            }
            onClick={handleResetFilters}
            aria-label="Reset Filters"
            color="green"
          />
          </div> */}
        </div>
      </div>

      <SectionTableRoute
        sectionData={filteredSectionData}
        isLoading={isLoading}
        onSectionSelect={onSectionSelect}
        onClearSelection={(clearFn: () => void) =>
          setTableClearSelection(() => clearFn)
        }
        facultyData={facultyData}
        isFacultyLoading={isFacultyLoading}
      />

      {/* Add Section Drawer */}
      <Drawer
        isOpen={isAddDrawerOpen}
        onClose={onAddDrawerClose}
        position="right"
        size="md"
        nonDismissable={true}
      >
        <Drawer.Header showCloseButton={true}>
          Add New Section
        </Drawer.Header>
        <Drawer.Body>
          <div className="flex flex-col gap-2 px-4">
            {addError && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
                role="alert"
              >
                <strong className="font-bold">Error!</strong>
                <span className="block sm:inline">{addError}</span>
                <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
                  <ExclamationTriangleIcon
                    className="h-5 w-5 text-red-500"
                    aria-hidden="true"
                  />
                </span>
              </div>
            )}
            {/* Faculty Select Autocomplete in Add Modal */}
            <Autocomplete
              label="Faculty"
              color="secondary"
              variant="underlined"
              size="sm"
              className="font-medium"
              isRequired
              selectedKey={selectedFacultyId}
              onSelectionChange={(key) => {
                setSelectedFacultyId(key ? key.toString() : "");
                setNewSectionClass("");
                setAddError(null);
                setFilteredAddModalClassItems([]); // Clear class items when faculty changes
              }}
              errorMessage={
                addError && !selectedFacultyId
                  ? "Faculty is required"
                  : ""
              }
              isInvalid={!!(addError && !selectedFacultyId)}
              items={filteredAddModalFacultyItems}
              onInputChange={(value) => {
                const filtered = facultyData
                  .filter((faculty) =>
                    faculty.name
                      .toLowerCase()
                      .includes(value.toLowerCase())
                  )
                  .map((faculty) => ({
                    key: faculty.$id,
                    label: faculty.name,
                  }));
                setFilteredAddModalFacultyItems(filtered);
              }}
            >
              {(item) => (
                <AutocompleteItem key={item.key}>
                  {item.label}
                </AutocompleteItem>
              )}
            </Autocomplete>

            {/* Class Select Autocomplete in Add Modal */}
            <Autocomplete
              label="Class"
              color="secondary"
              variant="underlined"
              size="sm"
              className="font-medium"
              isRequired
              selectedKey={newSectionClass}
              onSelectionChange={(key) => {
                setNewSectionClass(key ? key.toString() : "");
                setAddError(null);
              }}
              disabled={!selectedFacultyId}
              errorMessage={
                addError && !newSectionClass ? "Class is required" : ""
              }
              isInvalid={!!(addError && !newSectionClass)}
              items={filteredAddModalClassItems}
              onInputChange={(value) => {
                const allClassesForSelectedFaculty = selectedFacultyId
                  ? facultyData.find((f) => f.$id === selectedFacultyId)
                      ?.classes ?? []
                  : [];
                const filteredClasses = allClassesForSelectedFaculty
                  .filter((cls) =>
                    cls.toLowerCase().includes(value.toLowerCase())
                  )
                  .map((cls) => ({ key: cls, label: cls }));
                setFilteredAddModalClassItems(filteredClasses);
              }}
            >
              {(item) => (
                <AutocompleteItem key={item.key}>
                  {item.label}
                </AutocompleteItem>
              )}
            </Autocomplete>

            <Input
              id="add-section-name"
              type="text"
              label="Section Name"
              variant="underlined"
              value={newSectionName}
              isRequired
              color="secondary"
              className="font-medium"
              onChange={(e) => {
                setNewSectionName(e.target.value);
                setAddError(null);
              }}
              errorMessage={
                addError && !newSectionName
                  ? "Section Name is required"
                  : ""
              }
              isInvalid={!!(addError && !newSectionName)}
            />

            <Input
              id="add-section-subjects"
              type="text"
              variant="underlined"
              label="Subjects (comma-separated)"
              value={newSectionSubjects}
              isRequired
              color="secondary"
              className="font-medium"
              onChange={(e) => {
                setNewSectionSubjects(e.target.value);
                setAddError(null);
              }}
              errorMessage={
                addError && !newSectionSubjects
                  ? "Subjects are required"
                  : ""
              }
              isInvalid={!!(addError && !newSectionSubjects)}
            />
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button color="danger" variant="light" onPress={onAddDrawerClose}>
            Cancel
          </Button>
          <Button
            color="success"
            onPress={handleAddSaveNewSection}
            className=" text-white font-medium"
          >
            Save
          </Button>
        </Drawer.Footer>
      </Drawer>
    </div>
  );
};

export default List;