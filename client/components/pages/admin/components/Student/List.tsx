// ~/components/pages/admin/components/Student/List.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { FaPlus } from "react-icons/fa6";
import { TbReload } from "react-icons/tb";
import {
  useDisclosure,
  Button,
  Input, // We'll still use HeroUI Input for the text field
  Autocomplete,
  AutocompleteItem,
  Select,
  SelectItem,
  Checkbox,
  Progress,
} from "@heroui/react";
import { Student, useStudentStore } from "~/store/studentStore";
import { useFacultyStore } from "~/store/facultyStore";
import { useSectionStore } from "~/store/sectionStore";
import { useParentStore } from "~/store/parentStore";
import { Drawer } from "components/common/Drawer";

import ErrorMessage from "../common/ErrorMessage";
import SearchBar from "../common/SearchBar";
import ActionButton from "../../../../common/ActionButton";
import StudentTableRoute from "./studentTable";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import toast, { Toaster } from "react-hot-toast";
import lodash from "lodash";
const { debounce } = lodash;

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const searchOptions = [
  { value: "name", label: "Name" },
  { value: "class", label: "Class" },
  { value: "section", label: "Section" },
  { value: "parentName", label: "Parent Name" },
];

interface ListProps {
  isMobile: boolean;
  onStudentSelect: (student: Student | null) => void;
  studentData: Student[];
  isLoading: boolean;
}

const List: React.FC<ListProps> = ({
  isMobile,
  onStudentSelect,
  isLoading: isRouteLoading,
}) => {
  const { studentData, fetchStudentData, addStudentData } = useStudentStore();
  const { facultyData, fetchFacultyData } = useFacultyStore();
  const { sectionData, fetchSectionData } = useSectionStore();
  const { parentData, fetchParentData, addParentData, updateParentData } =
    useParentStore();

  const [searchText, setSearchText] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    isOpen: isAddDrawerOpen,
    onOpen: onAddDrawerOpen,
    onClose: onAddDrawerClose,
  } = useDisclosure();
  const [newStudentName, setNewStudentName] = useState("");
  const [newParentName, setNewParentName] = useState("");
  const [newStudentClass, setNewStudentClass] = useState("");
  const [newStudentSection, setNewStudentSection] = useState("");
  const [newParentEmail, setNewParentEmail] = useState("");
  const [newParentContact, setNewParentContact] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [isExistingParentCheckboxChecked, setIsExistingParentCheckboxChecked] =
    useState<boolean>(false);
  const [selectedExistingParentId, setSelectedExistingParentId] =
    useState<string>("");
  const [parentSearchInput, setParentSearchInput] = useState("");
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);
  const parentAutocompleteRef = useRef<HTMLDivElement>(null); // For click outside
  const [addError, setAddError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [tableClearSelection, setTableClearSelection] = useState<
    (() => void) | null
  >(null);

  const [selectedSearchOption, setSelectedSearchOption] = useState(
    searchOptions[0].value
  );

  const [filteredAddModalFacultyItems, setFilteredAddModalFacultyItems] =
    useState<{ key: string; label: string }[]>([]);
  const [filteredAddModalClassItems, setFilteredAddModalClassItems] = useState<
    { key: string; label: string }[]
  >([]);
  const [filteredAddModalSectionItems, setFilteredAddModalSectionItems] = useState<
    { key: string; label: string }[]
  >([]);
  
  // State for the custom parent autocomplete (max 5 items)
  const [filteredParentItemsForDropdown, setFilteredParentItemsForDropdown] =
    useState<{ key: string; label: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetchFacultyData(),
      fetchSectionData(),
      fetchParentData(),
      fetchStudentData(),
    ]).catch((err) => {
      console.error("Error during initial data fetch:", err);
      setErrorMessage("Failed to load initial data. Please refresh.");
    });
  }, [fetchFacultyData, fetchSectionData, fetchParentData, fetchStudentData]);

  useEffect(() => {
    setFilteredAddModalFacultyItems(
      facultyData.map((faculty) => ({ key: faculty.$id, label: faculty.name }))
    );
    // No longer pre-populating all parents for the custom autocomplete here
    // It will be populated on type by debouncedFilterParents
  }, [facultyData]); // Removed parentData from deps for this specific effect if it only sets faculty

  useEffect(() => {
    setFilteredAddModalClassItems(
      selectedFacultyId
        ? (
            facultyData.find((f) => f.$id === selectedFacultyId)?.classes ?? []
          ).map((cls) => ({ key: cls, label: cls }))
        : []
    );
  }, [selectedFacultyId, facultyData]);

  useEffect(() => {
    if (isAddDrawerOpen && selectedFacultyId && newStudentClass) {
      const sectionItems = sectionData
        .filter(
          (section) =>
            section.facultyId === selectedFacultyId && section.class === newStudentClass
        )
        .map((section) => ({
          key: section.$id,
          label: section.name,
        }));
      setFilteredAddModalSectionItems(sectionItems);
    } else {
      setFilteredAddModalSectionItems([]);
    }
  }, [isAddDrawerOpen, sectionData, selectedFacultyId, newStudentClass]);

  // Click outside handler for the custom parent autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        parentAutocompleteRef.current &&
        !parentAutocompleteRef.current.contains(event.target as Node)
      ) {
        setIsParentDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced function to filter parents for the custom autocomplete
  const debouncedFilterParents = useCallback(
    debounce((searchValue: string) => {
      const trimmedValue = searchValue.trim();
      if (!trimmedValue) {
        setFilteredParentItemsForDropdown([]);
        setIsParentDropdownOpen(false); // Close if search term is empty
        return;
      }

      const lowerSearchValue = trimmedValue.toLowerCase();
      const allMatchingParents = parentData.filter(
        (parent) =>
          parent.name.toLowerCase().includes(lowerSearchValue) ||
          parent.email.toLowerCase().includes(lowerSearchValue)
      );

      const mappedParents = allMatchingParents.map((parent) => ({
        key: parent.$id,
        label: `${parent.name} (${parent.email})`,
      }));

      setFilteredParentItemsForDropdown(mappedParents.slice(0, 5)); // Limit to 5 items
      setIsParentDropdownOpen(true); // Open dropdown to show results or "no matches"
    }, 300),
    [parentData] // Dependency: parentData
  );

  const handleParentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setParentSearchInput(value);
    setAddError(null);
    setSelectedExistingParentId(""); // Deselect parent if user types new text

    if (value.trim() === "") {
      setFilteredParentItemsForDropdown([]);
      setIsParentDropdownOpen(false);
    } else {
      debouncedFilterParents(value); // This will update items and open/close dropdown
    }
  };

  const handleParentInputFocus = () => {
    if (parentSearchInput.trim() && !isParentDropdownOpen) {
      // If there's text and dropdown is closed, re-run filter to open it
      debouncedFilterParents(parentSearchInput.trim());
    } else if (!parentSearchInput.trim()){
        setIsParentDropdownOpen(false); // Ensure dropdown is closed if input is empty on focus
    }
  };

  const handleParentSelect = (item: { key: string; label: string }) => {
    setSelectedExistingParentId(item.key);
    setParentSearchInput(item.label); // Update input field with selected label
    setIsParentDropdownOpen(false); // Close dropdown
    setFilteredParentItemsForDropdown([]); // Clear items after selection
    setAddError(null);
  };


  const handleSearchChange = (value: string) => {
    setSearchText(value);
  };

  const handleAdd = () => {
    setNewStudentName("");
    setNewParentName("");
    setNewStudentClass("");
    setNewStudentSection("");
    setNewParentEmail("");
    setNewParentContact("");
    setSelectedFacultyId("");
    setIsExistingParentCheckboxChecked(false);
    setSelectedExistingParentId("");
    setParentSearchInput("");
    setIsParentDropdownOpen(false);
    setFilteredParentItemsForDropdown([]); // Clear custom autocomplete items
    setAddError(null);
    setIsSaving(false);
    onAddDrawerOpen();
  };

  const handleRefresh = () => {
    setErrorMessage(null);
    const refreshPromise = Promise.all([
      fetchStudentData(),
      fetchParentData(),
      fetchFacultyData(),
      fetchSectionData(),
    ]);
    toast.promise(refreshPromise, {
      loading: "Refreshing data...",
      success: "Data refreshed!",
      error: (err) => {
        console.error("Refresh Error:", err);
        setErrorMessage("Failed to refresh data.");
        return "Failed to refresh data.";
      },
    });
  };

  const handleAddSaveNewStudent = async () => {
    setAddError(null);
    setIsSaving(true);

    if (!newStudentName.trim()) {
      setAddError("Student Name is required.");
      setIsSaving(false);
      return;
    }
    if (!selectedFacultyId) {
      setAddError("Faculty is required.");
      setIsSaving(false);
      return;
    }
    if (!newStudentClass.trim()) {
      setAddError("Class is required.");
      setIsSaving(false);
      return;
    }

    let parentDocId: string | null = null;
    let parentDetailsForBackend: { name: string; email: string } | null = null;

    if (isExistingParentCheckboxChecked) {
      if (!selectedExistingParentId) {
        setAddError("Please select an existing parent.");
        setIsSaving(false);
        return;
      }
      parentDocId = selectedExistingParentId;
      const selectedParent = parentData.find((p) => p.$id === parentDocId);
      if (!selectedParent) {
        setAddError(
          "Selected parent data not found. Please refresh and try again."
        );
        setIsSaving(false);
        return;
      }
    } else {
      if (!newParentName.trim()) {
        setAddError("Parent Name is required.");
        setIsSaving(false);
        return;
      }
      if (!newParentEmail.trim() || !/\S+@\S+\.\S+/.test(newParentEmail)) {
        setAddError("Valid Parent Email is required.");
        setIsSaving(false);
        return;
      }
      if (!newParentContact.trim()) {
        setAddError("Contact No. is required.");
        setIsSaving(false);
        return;
      }

      const existingParentByEmail = parentData.find(
        (parent) => parent.email.toLowerCase() === newParentEmail.toLowerCase()
      );
      if (existingParentByEmail) {
        setAddError(
          `Parent with email ${newParentEmail} already exists. Use 'Existing Parent' option or choose a different email.`
        );
        setIsSaving(false);
        return;
      }
      parentDetailsForBackend = { name: newParentName, email: newParentEmail };
    }

    try {
      const signupPayload = {
        isExistingParent: isExistingParentCheckboxChecked,
        studentName: newStudentName,
        parentName: parentDetailsForBackend?.name,
        parentEmail: parentDetailsForBackend?.email,
      };

      const response = await fetch(`${SERVER_URL}/api/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupPayload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || `User creation failed: ${response.status}`
        );
      }

      const { studentUserId, parentUserId, studentEmail } = result;
      if (!studentUserId) {
        throw new Error("Backend did not return student user ID.");
      }

      let finalParentDocId: string | null = parentDocId;

      if (!isExistingParentCheckboxChecked) {
        if (!parentUserId) {
          throw new Error(
            "Backend did not return parent user ID for new parent."
          );
        }
        const newParentDataForDb = {
          id: parentUserId,
          name: newParentName,
          email: newParentEmail,
          contact: newParentContact
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
        };
        const createdParent = await addParentData(newParentDataForDb, parentUserId);
        if (!createdParent) {
          throw new Error("Failed to save new parent document to database.");
        }
        finalParentDocId = createdParent.$id;
      }

      if (!finalParentDocId) {
        throw new Error("Parent document ID could not be determined.");
      }

      let sectionNameToSave = "";
      if (newStudentSection) {
        const selectedSectionObject = sectionData.find(
          (sec) => sec.$id === newStudentSection
        );
        if (selectedSectionObject) {
          sectionNameToSave = selectedSectionObject.name;
        } else {
          console.warn(`Could not find section name for ID: ${newStudentSection}. Saving empty section name.`);
        }
      }

      const newStudentDataToSave = {
        id: studentUserId,
        name: newStudentName,
        class: newStudentClass,
        facultyId: selectedFacultyId,
        section: sectionNameToSave,
        parentId: finalParentDocId,
        stdEmail: studentEmail,
      };
      const createdStudent = await addStudentData(
        newStudentDataToSave,
        studentUserId
      );
      if (!createdStudent) {
        throw new Error("Failed to save student document to database.");
      }

      const updatedParent = await updateParentData(
        finalParentDocId,
        createdStudent.$id
      );
      if (!updatedParent) {
        console.error(
          `Failed to update parent document ${finalParentDocId} with new student ${createdStudent.$id}. Manual check needed.`
        );
        toast.error("Student created, but failed to link to parent record.");
      }

      toast.success("Student and associated user(s) created successfully!");
      onAddDrawerClose();
    } catch (error: any) {
      console.error("Error during save process:", error);
      setAddError(error.message || "An unexpected error occurred during save.");
      toast.error(`Save Failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToList = () => {
    if (tableClearSelection) {
      tableClearSelection();
    }
    onStudentSelect(null);
  };

  const handleExistingParentCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const checked = event.target.checked;
    setIsExistingParentCheckboxChecked(checked);
    setAddError(null);
    if (!checked) {
      setSelectedExistingParentId("");
      setParentSearchInput("");
      setIsParentDropdownOpen(false);
      setFilteredParentItemsForDropdown([]);
    } else {
      setNewParentName("");
      setNewParentEmail("");
      setNewParentContact("");
    }
  };

  const filteredStudentData = useMemo(() => {
    const numberOfRecordsToShowInitially = 10;
    const fullStudentData = studentData || [];

    if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      return fullStudentData.filter((student) => {
        const parentName =
          parentData.find((p) => p.$id === student.parentId)?.name || "";
        const studentSectionName = student.section;

        switch (selectedSearchOption) {
          case "name":
            return (student.name || "").toLowerCase().includes(lowerSearchText);
          case "class":
            return (student.class || "")
              .toLowerCase()
              .includes(lowerSearchText);
          case "section":
            return (studentSectionName || "")
              .toLowerCase()
              .includes(lowerSearchText);
          case "parentName":
            return parentName.toLowerCase().includes(lowerSearchText);
          default:
            return (student.name || "").toLowerCase().includes(lowerSearchText);
        }
      });
    } else {
      const sortedData = [...fullStudentData].sort((a, b) => {
        try {
          const dateA = a.$createdAt ? new Date(a.$createdAt).getTime() : 0;
          const dateB = b.$createdAt ? new Date(b.$createdAt).getTime() : 0;
          if (isNaN(dateB)) return -1;
          if (isNaN(dateA)) return 1;
          return dateB - dateA;
        } catch (e) {
          console.error("Error parsing date for sorting student data:", e, a, b);
          return 0;
        }
      });
      return sortedData.slice(0, numberOfRecordsToShowInitially);
    }
  }, [studentData, searchText, selectedSearchOption, parentData]);

  return (
    <div className="md:w-full w-full md:p-2">
      <Toaster position="top-right" />
      {errorMessage && <ErrorMessage message={errorMessage} />}

      <div
        className="top overflow-x-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#CBD5E1 transparent",
        }}
      >
        {/* Search and Action Buttons UI ... */}
        <div className="min-w-[370px] mt-1 mx-3 md:px-0 mb-1">
          {/* Desktop layout (single line) */}
          <div className="hidden sm:flex items-center justify-between gap-2">
            <ActionButton
              icon={
                <FaPlus className="w-4 h-4 text-gray-100 transition duration-200" />
              }
              onClick={handleAdd}
              color="orange"
              aria-label="Add New Student"
            />
            <Select
              placeholder="Search By"
              className="max-w-[9rem] flex-shrink-0"
              variant="faded"
              size="md"
              selectedKeys={new Set([selectedSearchOption])}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0];
                setSelectedSearchOption(
                  key ? key.toString() : searchOptions[0].value
                );
              }}
              aria-label="Select search field"
            >
              {searchOptions.map((option) => (
                <SelectItem key={option.value}>{option.label}</SelectItem>
              ))}
            </Select>
            <SearchBar
              placeholder="Search students..."
              value={searchText}
              onValueChange={handleSearchChange}
            />
            <ActionButton
              icon={
                <TbReload className="w-5 h-5 text-gray-100 transition duration-200" />
              }
              onClick={handleRefresh}
              aria-label="Refresh Student List"
            />
          </div>

          {/* Mobile layout (two lines) */}
          <div className="sm:hidden flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <ActionButton
                icon={
                  <FaPlus className="w-4 h-4 text-gray-100 transition duration-200" />
                }
                onClick={handleAdd}
                color="orange"
                aria-label="Add New Student"
              />
              <div className="flex-grow flex justify-center">
                <Select
                  placeholder="Search By"
                  className="w-40"
                  variant="faded"
                  size="md"
                  selectedKeys={new Set([selectedSearchOption])}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0];
                    setSelectedSearchOption(
                      key ? key.toString() : searchOptions[0].value
                    );
                  }}
                  aria-label="Select search field"
                >
                  {searchOptions.map((option) => (
                    <SelectItem key={option.value}>{option.label}</SelectItem>
                  ))}
                </Select>
              </div>
              <div className="w-8 flex-shrink-0"></div>
            </div>
            <div className="flex justify-between items-center gap-6">
              <div className="flex-grow">
                <SearchBar
                  placeholder="Search students..."
                  value={searchText}
                  onValueChange={handleSearchChange}
                />
              </div>
              <ActionButton
                icon={
                  <TbReload className="w-5 h-5 text-gray-100 transition duration-200" />
                }
                onClick={handleRefresh}
                aria-label="Refresh Student List"
              />
            </div>
          </div>
        </div>
      </div>

      {isRouteLoading && (
        <Progress
          size="sm"
          isIndeterminate
          aria-label="Loading initial data..."
          className="w-full my-2"
        />
      )}

      <StudentTableRoute
        studentData={filteredStudentData}
        isLoading={isRouteLoading || isSaving}
        onStudentSelect={onStudentSelect}
        onClearSelection={(clearFn: () => void) =>
          setTableClearSelection(() => clearFn)
        }
        facultyData={facultyData}
        parentData={parentData}
      />

      <Drawer
        isOpen={isAddDrawerOpen}
        onClose={onAddDrawerClose}
        position="right"
        size="lg"
        nonDismissable={isSaving}
      >
        <Drawer.Header showCloseButton={!isSaving}>Add New Student</Drawer.Header>
        <Drawer.Body>
          {isSaving && (
            <Progress
              size="sm"
              isIndeterminate
              aria-label="Saving..."
              className="absolute top-0 left-0 w-full z-50"
            />
          )}
          <div className={`flex flex-col gap-3 px-4 ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
            {addError && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-2 text-sm flex items-center"
                role="alert"
              >
                <ExclamationTriangleIcon className="h-5 w-5 text-red-700 inline mr-2 flex-shrink-0" />
                <span>{addError}</span>
              </div>
            )}
            <Checkbox
              isSelected={isExistingParentCheckboxChecked}
              onChange={handleExistingParentCheckboxChange}
              size="md"
            >
              Existing Parent?
            </Checkbox>

            {/* --- CUSTOM PARENT AUTOCOMPLETE --- */}
            {isExistingParentCheckboxChecked ? (
              <div className="relative" ref={parentAutocompleteRef}>
                <Input
                  label="Search Existing Parent"
                  value={parentSearchInput}
                  onChange={handleParentInputChange}
                  onFocus={handleParentInputFocus}
                  variant="underlined"
                  size="sm"
                  color="secondary"
                  className="font-medium max-w-full"
                  isRequired={isExistingParentCheckboxChecked}
                  isInvalid={
                    !!(
                      addError &&
                      isExistingParentCheckboxChecked &&
                      !selectedExistingParentId
                    )
                  }
                  errorMessage={
                    addError &&
                    isExistingParentCheckboxChecked &&
                    !selectedExistingParentId
                      ? "Please select parent"
                      : ""
                  }
                  description={
                    selectedExistingParentId
                      ? "Parent selected."
                      : "Type to search by name or email."
                  }
                  autoComplete="off" // Important for custom dropdown
                />
                {isParentDropdownOpen && (
                  <ul
                    className="absolute top-full mt-1 w-full bg-content1 border border-divider shadow-lg rounded-md max-h-60 overflow-y-auto z-50 list-none p-0"
                    role="listbox" // Accessibility
                  >
                    {filteredParentItemsForDropdown.length > 0 ? (
                      filteredParentItemsForDropdown.map((item) => (
                        <li
                          key={item.key}
                          onClick={() => handleParentSelect(item)}
                          className="px-3 py-2 hover:bg-default-100 cursor-pointer text-sm text-foreground"
                          role="option"
                          aria-selected={selectedExistingParentId === item.key}
                          tabIndex={-1} // Not focusable by tab, but can be by script
                        >
                          {item.label}
                        </li>
                      ))
                    ) : parentSearchInput.trim() !== "" ? (
                      <li className="px-3 py-2 text-sm text-foreground-500 italic">
                        No matches found
                      </li>
                    ) : null /* Or show "Type to search..." if desired when input is empty & focused */
                    }
                  </ul>
                )}
              </div>
            ) : (
              // New Parent Input Fields
              <>
                <Input
                  fullWidth
                  id="add-parent-name"
                  type="text"
                  label="Parent Name"
                  variant="underlined"
                  value={newParentName}
                  isRequired={!isExistingParentCheckboxChecked}
                  color="secondary"
                  size="sm"
                  className="font-medium"
                  onChange={(e) => {
                    setNewParentName(e.target.value);
                    setAddError(null);
                  }}
                  isInvalid={
                    !!(
                      addError &&
                      !isExistingParentCheckboxChecked &&
                      !newParentName.trim()
                    )
                  }
                  errorMessage={
                    addError &&
                    !isExistingParentCheckboxChecked &&
                    !newParentName.trim()
                      ? "Required"
                      : ""
                  }
                />
                <Input
                  fullWidth
                  id="add-parent-email"
                  type="email"
                  variant="underlined"
                  label="Parent Email"
                  value={newParentEmail}
                  isRequired={!isExistingParentCheckboxChecked}
                  color="secondary"
                  size="sm"
                  className="font-medium"
                  onChange={(e) => {
                    setNewParentEmail(e.target.value);
                    setAddError(null);
                  }}
                  isInvalid={
                    !!(
                      addError &&
                      !isExistingParentCheckboxChecked &&
                      (!newParentEmail.trim() || !/\S+@\S+\.\S+/.test(newParentEmail))
                    )
                  }
                  errorMessage={
                    addError &&
                    !isExistingParentCheckboxChecked &&
                    (!newParentEmail.trim() || !/\S+@\S+\.\S+/.test(newParentEmail))
                      ? "Valid email required"
                      : ""
                  }
                />
                <Input
                  fullWidth
                  id="add-parent-contact"
                  type="text"
                  variant="underlined"
                  label="Contact No.s (comma separated)"
                  value={newParentContact}
                  isRequired={!isExistingParentCheckboxChecked}
                  color="secondary"
                  size="sm"
                  className="font-medium"
                  onChange={(e) => {
                    setNewParentContact(e.target.value);
                    setAddError(null);
                  }}
                  isInvalid={
                    !!(
                      addError &&
                      !isExistingParentCheckboxChecked &&
                      !newParentContact.trim()
                    )
                  }
                  errorMessage={
                    addError &&
                    !isExistingParentCheckboxChecked &&
                    !newParentContact.trim()
                      ? "Required"
                      : ""
                  }
                />
              </>
            )}
            {/* --- END PARENT INPUTS --- */}

            {/* Faculty Select Autocomplete */}
            <Autocomplete
              fullWidth
              label="Faculty"
              color="secondary"
              variant="underlined"
              size="sm"
              className="font-medium"
              isRequired
              selectedKey={selectedFacultyId}
              onSelectionChange={(key) => {
                setSelectedFacultyId(key ? key.toString() : "");
                setNewStudentClass("");
                setNewStudentSection("");
                setAddError(null);
                setFilteredAddModalClassItems([]);
                setFilteredAddModalSectionItems([]);
              }}
              errorMessage={
                addError && !selectedFacultyId ? "Faculty required" : ""
              }
              isInvalid={!!(addError && !selectedFacultyId)}
              items={filteredAddModalFacultyItems}
              onInputChange={(value) => {
                const filtered = facultyData
                  .filter((faculty) =>
                    faculty.name.toLowerCase().includes(value.toLowerCase())
                  )
                  .map((faculty) => ({
                    key: faculty.$id,
                    label: faculty.name,
                  }));
                setFilteredAddModalFacultyItems(filtered.length > 0 ? filtered : facultyData.map(f => ({ key: f.$id, label: f.name })));
              }}
              aria-label="Select Faculty"
              allowsCustomValue={false}
            >
              {(item) => (
                <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>
              )}
            </Autocomplete>
            {/* Class Select Autocomplete */}
            <Autocomplete
              fullWidth
              label="Class"
              color="secondary"
              variant="underlined"
              size="sm"
              className="font-medium"
              isRequired
              selectedKey={newStudentClass}
              onSelectionChange={(key) => {
                setNewStudentClass(key ? key.toString() : "");
                setNewStudentSection("");
                setAddError(null);
                setFilteredAddModalSectionItems([]);
              }}
              isDisabled={!selectedFacultyId}
              errorMessage={
                addError && !newStudentClass ? "Class required" : ""
              }
              isInvalid={!!(addError && !newStudentClass)}
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
                setFilteredAddModalClassItems(filteredClasses.length > 0 ? filteredClasses : (allClassesForSelectedFaculty.map(cls => ({key: cls, label: cls}))));
              }}
              aria-label="Select Class"
              allowsCustomValue={false}
            >
              {(item) => (
                <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>
              )}
            </Autocomplete>
            {/* Section Select Autocomplete */}
            <Autocomplete
              fullWidth
              label="Section"
              color="secondary"
              variant="underlined"
              size="sm"
              className="font-medium"
              selectedKey={newStudentSection}
              onSelectionChange={(key) => {
                setNewStudentSection(key ? key.toString() : "");
                setAddError(null);
              }}
              isDisabled={!selectedFacultyId || !newStudentClass}
              items={filteredAddModalSectionItems}
              onInputChange={(value) => {
                 const sectionsForClassAndFaculty = sectionData
                  .filter(
                    (section) =>
                      section.facultyId === selectedFacultyId &&
                      section.class === newStudentClass
                  );
                const filteredSections = sectionsForClassAndFaculty
                  .filter((section) =>
                    section.name.toLowerCase().includes(value.toLowerCase())
                  )
                  .map((section) => ({ key: section.$id, label: section.name }));
                setFilteredAddModalSectionItems(filteredSections.length > 0 ? filteredSections : (sectionsForClassAndFaculty.map(s => ({key: s.$id, label: s.name}))));
              }}
              aria-label="Select Section"
              allowsCustomValue={false}
            >
              {(item) => (
                <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>
              )}
            </Autocomplete>
            {/* Student Name Input */}
            <Input
              fullWidth
              id="add-student-name"
              type="text"
              label="Student Name"
              variant="underlined"
              value={newStudentName}
              isRequired
              color="secondary"
              size="sm"
              className="font-medium"
              onChange={(e) => {
                setNewStudentName(e.target.value);
                setAddError(null);
              }}
              isInvalid={!!(addError && !newStudentName.trim())}
              errorMessage={
                addError && !newStudentName.trim() ? "Student Name required" : ""
              }
            />
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button
            color="danger"
            variant="light"
            onPress={onAddDrawerClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            color="success"
            onPress={handleAddSaveNewStudent}
            className="text-white font-medium"
            isLoading={isSaving}
            isDisabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Student"}
          </Button>
        </Drawer.Footer>
      </Drawer>
    </div>
  );
};

export default List;