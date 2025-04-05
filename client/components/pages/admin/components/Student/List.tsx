// ~/components/pages/admin/components/Student/List.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo, // Keep useMemo for filteredStudentData
  useRef,
} from "react";
import { FaPlus } from "react-icons/fa6";
import { TbReload } from "react-icons/tb";
import {
  useDisclosure,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Autocomplete,
  AutocompleteItem,
  Select,
  SelectItem,
  Checkbox,
  Progress,
} from "@heroui/react";
import { useStudentStore, Student } from "~/store/studentStore";
import { useFacultyStore } from "~/store/facultyStore";
import { useSectionStore } from "~/store/sectionStore";
import { Faculty, Section, Parent } from "types"; // Assuming types are correctly defined in a global types file or similar
import { useParentStore } from "~/store/parentStore";

import ErrorMessage from "../common/ErrorMessage";
import SearchBar from "../common/SearchBar";
import ActionButton from "../common/ActionButton";
import StudentTableRoute from "./studentTable"; // Assuming this path is correct
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import toast, { Toaster } from "react-hot-toast";
import lodash from 'lodash';
const { debounce } = lodash;

// Ensure server URL is correctly defined in your .env file (e.g., VITE_SERVER_URL=http://localhost:3001)
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// --- Helper functions (can be moved to a utils file if preferred) ---
// NOTE: Actual password/email generation happens on the server for security.
// These might be kept for frontend reference or removed if unused.
// const generatePassword = () => Math.random().toString(36).slice(-8);
// const generateUsername = (name: string) => {
//   const baseName = name.trim().toLowerCase().replace(/\s+/g, "-");
//   const randomChars = Math.random().toString(36).slice(-3);
//   return `${baseName}-${randomChars}`;
// };
// const generateSchoolEmail = (username: string) => {
//   return `${username}@skool.edu`; // Example domain
// };
// ---

// --- Moved searchOptions outside the component as a constant ---
const searchOptions = [
  { value: "name", label: "Name" },
  { value: "class", label: "Class" },
  { value: "section", label: "Section" },
  { value: "parentName", label: "Parent Name" },
];
// ---

interface ListProps {
  isMobile: boolean; // Prop might be used for responsive layout decisions
  onStudentSelect: (student: Student | null) => void; // Callback when a student is selected (e.g., in the table)
  studentData: Student[]; // Data passed down, likely from a route loader
  isLoading: boolean; // Loading state, likely from a route loader
}

const List: React.FC<ListProps> = ({
  isMobile,
  onStudentSelect,
  studentData: initialStudentData, // Rename prop to avoid conflict with store data if used directly
  isLoading: isRouteLoading, // Rename prop to distinguish from internal loading states
}) => {
  // Zustand Store Hooks
  const { studentData, fetchStudentData, addStudentData } = useStudentStore();
  const { facultyData, fetchFacultyData } = useFacultyStore();
  const { sectionData, fetchSectionData } = useSectionStore(); // Fetch sections if needed by table/other components
  const { parentData, fetchParentData, addParentData, updateParentData } = useParentStore();

  // Component State
  const [searchText, setSearchText] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // For general fetch/refresh errors

  // Add Modal State
  const {
    isOpen: isAddModalOpen,
    onOpen: onAddModalOpen,
    onOpenChange: onAddModalOpenChange,
    onClose: onAddModalClose,
  } = useDisclosure();
  const [newStudentName, setNewStudentName] = useState("");
  const [newParentName, setNewParentName] = useState("");
  const [newStudentClass, setNewStudentClass] = useState("");
  const [newStudentSection, setNewStudentSection] = useState("");
  const [newParentEmail, setNewParentEmail] = useState("");
  const [newParentContact, setNewParentContact] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [isExistingParentCheckboxChecked, setIsExistingParentCheckboxChecked] = useState<boolean>(false);
  const [selectedExistingParentId, setSelectedExistingParentId] = useState<string>(""); // Parent *Document* ID ($id)
  const [parentSearchInput, setParentSearchInput] = useState("");
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);
  const parentAutocompleteRef = useRef<HTMLDivElement>(null);
  const [addError, setAddError] = useState<string | null>(null); // Error specific to Add Modal validation/saving
  const [isSaving, setIsSaving] = useState(false); // Loading state for Add Modal save operation

  // Table State / Refs
  const [tableClearSelection, setTableClearSelection] = useState<(() => void) | null>(null);

  // Search State
  const [selectedSearchOption, setSelectedSearchOption] = useState(searchOptions[0].value); // Initialize using the external constant

  // Autocomplete Filtered Items State
  const [filteredAddModalFacultyItems, setFilteredAddModalFacultyItems] = useState<{ key: string; label: string }[]>([]);
  const [filteredAddModalClassItems, setFilteredAddModalClassItems] = useState<{ key: string; label: string }[]>([]);
  const [filteredExistingParentItems, setFilteredExistingParentItems] = useState<{ key: string; label: string }[]>([]);

  // Data Fetching Effect
  useEffect(() => {
    // Fetch required data on component mount
    // Consider if fetching should be triggered differently in Remix (e.g., loaders)
    // This assumes client-side fetching after initial load
    Promise.all([fetchFacultyData(), fetchSectionData(), fetchParentData(), fetchStudentData()])
        // .then(() => console.log("Initial data fetched."))
        .catch(err => {
        console.error("Error during initial data fetch:", err);
        setErrorMessage("Failed to load initial data. Please refresh.");
    });
  }, [fetchFacultyData, fetchSectionData, fetchParentData, fetchStudentData]); // Dependencies for initial fetch

  // Update Autocomplete Items Effects
  useEffect(() => {
    setFilteredAddModalFacultyItems(
      facultyData.map((faculty) => ({ key: faculty.$id, label: faculty.name }))
    );
    setFilteredExistingParentItems(
        parentData.map((parent) => ({
          key: parent.$id, // Use Document ID ($id) as the key
          label: parent.name + " (" + parent.email + ")",
        }))
    );
  }, [facultyData, parentData]); // Update when faculty or parent data changes

  useEffect(() => {
    // Update class dropdown based on selected faculty
    setFilteredAddModalClassItems(
      selectedFacultyId
        ? (
            facultyData.find((f) => f.$id === selectedFacultyId)?.classes ?? []
          ).map((cls) => ({ key: cls, label: cls }))
        : []
    );
     // Reset class/section if faculty changes
     if (selectedFacultyId) {
        // Optionally reset class/section here if needed when faculty changes
        // setNewStudentClass("");
        // setNewStudentSection("");
     }
  }, [selectedFacultyId, facultyData]);

  // Click Outside Handler for Parent Dropdown
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

  // Event Handlers
  const handleSearchChange = (value: string) => {
    setSearchText(value);
  };

  const handleAdd = () => {
    // Reset form state before opening modal
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
    setAddError(null);
    setIsSaving(false);
    onAddModalOpen();
  };

  const handleRefresh = () => {
    setErrorMessage(null);
    const refreshPromise = Promise.all([
        fetchStudentData(),
        fetchParentData(),
        fetchFacultyData(), // Optionally refresh faculty/section too
        fetchSectionData(),
    ]);
    toast.promise(
        refreshPromise,
        {
          loading: 'Refreshing data...',
          success: 'Data refreshed!',
          error: (err) => {
              console.error("Refresh Error:", err)
              setErrorMessage("Failed to refresh data.")
              return 'Failed to refresh data.'; // Message for toast
          },
        }
      );
  };

  // *** The Core Add/Save Logic ***
  const handleAddSaveNewStudent = async () => {
    setAddError(null);
    setIsSaving(true);

    // --- Validation ---
    if (!newStudentName.trim()) { setAddError("Student Name is required."); setIsSaving(false); return; }
    if (!selectedFacultyId) { setAddError("Faculty is required."); setIsSaving(false); return; }
    if (!newStudentClass.trim()) { setAddError("Class is required."); setIsSaving(false); return; }

    let parentDocId: string | null = null; // Parent *Document* ID ($id)
    let parentDetailsForBackend: { name: string; email: string } | null = null;

    if (isExistingParentCheckboxChecked) {
        if (!selectedExistingParentId) {
            setAddError("Please select an existing parent.");
            setIsSaving(false); return;
        }
        parentDocId = selectedExistingParentId;
        const selectedParent = parentData.find(p => p.$id === parentDocId);
        if (!selectedParent) {
             setAddError("Selected parent data not found. Please refresh and try again."); setIsSaving(false); return;
        }
        // console.log("Using Existing Parent (Document ID):", parentDocId);
    } else {
        if (!newParentName.trim()) { setAddError("Parent Name is required."); setIsSaving(false); return; }
        if (!newParentEmail.trim() || !/\S+@\S+\.\S+/.test(newParentEmail)) { setAddError("Valid Parent Email is required."); setIsSaving(false); return; }
        if (!newParentContact.trim()) { setAddError("Contact No. is required."); setIsSaving(false); return; }

        const existingParentByEmail = parentData.find(
            (parent) => parent.email.toLowerCase() === newParentEmail.toLowerCase()
        );
        if (existingParentByEmail) {
            setAddError(`Parent with email ${newParentEmail} already exists. Use 'Existing Parent' option or choose a different email.`); setIsSaving(false); return;
        }
        parentDetailsForBackend = { name: newParentName, email: newParentEmail };
        // console.log("Creating New Parent:", parentDetailsForBackend);
    }

    try {
        // --- Step 1: Call Backend to Create User(s) ---
        const signupPayload = {
            isExistingParent: isExistingParentCheckboxChecked,
            studentName: newStudentName,
            parentName: parentDetailsForBackend?.name, // Only if new
            parentEmail: parentDetailsForBackend?.email, // Only if new
        };

        // console.log("Calling backend /signup:", signupPayload);
        const response = await fetch(`${SERVER_URL}/api/users/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signupPayload),
        });
        const result = await response.json();

        if (!response.ok) { throw new Error(result.message || `User creation failed: ${response.status}`); }
        // console.log("Backend /signup response:", result);

        const { studentUserId, parentUserId, studentEmail } = result; // parentUserId is null if existing
        if (!studentUserId) { throw new Error("Backend did not return student user ID."); }

        let finalParentDocId: string | null = parentDocId; // Use existing ID initially

        // --- Step 2: Create Parent Document in DB (if new) ---
        if (!isExistingParentCheckboxChecked) {
            if (!parentUserId) { throw new Error("Backend did not return parent user ID for new parent."); }
             const newParentData = {
                id: parentUserId, // User ID from backend
                name: newParentName,
                email: newParentEmail,
                contact: newParentContact.split(',').map(c => c.trim()).filter(Boolean),
            };
            const createdParent = await addParentData(newParentData, parentUserId); // Call store action
            if (!createdParent) { throw new Error("Failed to save new parent document to database."); }
            finalParentDocId = createdParent.$id; // Get the new Parent Document ID
            // console.log("New Parent Document created, ID:", finalParentDocId);
        }

        if (!finalParentDocId) { throw new Error("Parent document ID could not be determined."); }

        // --- Step 3: Create Student Document in DB ---
        // Regenerate email for DB storage (backend handles actual user email)
        const newStudentData = {
            id: studentUserId, // User ID from backend
            name: newStudentName,
            class: newStudentClass,
            facultyId: selectedFacultyId,
            section: newStudentSection || "",
            parentId: finalParentDocId, // Link to Parent *Document* ID
            stdEmail: studentEmail,
        };
        const createdStudent = await addStudentData(newStudentData, studentUserId); // Call store action
        if (!createdStudent) { throw new Error("Failed to save student document to database."); }
        // console.log("New Student Document created, ID:", createdStudent.$id);

        // --- Step 4: Update Parent's 'students' Array ---
        const updatedParent = await updateParentData(finalParentDocId, createdStudent.$id); // Call store action
        if (!updatedParent) {
             console.error(`Failed to update parent document ${finalParentDocId} with new student ${createdStudent.$id}. Manual check needed.`);
             toast.error("Student created, but failed to link to parent record."); // Non-blocking error
        } else {
            // console.log(`Parent ${finalParentDocId} updated successfully with student ${createdStudent.$id}`);
        }

        // --- Step 5: Success ---
        toast.success("Student and associated user(s) created successfully!");
        onAddModalClose(); // Close modal

    } catch (error: any) {
        console.error("Error during save process:", error);
        setAddError(error.message || "An unexpected error occurred during save.");
        toast.error(`Save Failed: ${error.message}`);
        // Cleanup attempt (optional, complex): Could try deleting created users/docs if partial failure occurred
    } finally {
        setIsSaving(false); // Stop loading indicator
    }
  };
  // *** End Add/Save Logic ***

  const handleBackToList = () => {
    // If table selection needs clearing when navigating back (e.g., in mobile view)
    if (tableClearSelection) {
      tableClearSelection();
    }
    onStudentSelect(null); // Ensure parent component knows no student is selected
  };

  const handleExistingParentCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setIsExistingParentCheckboxChecked(checked);
    setAddError(null); // Clear errors when switching mode
    if (!checked) {
      // Reset existing parent selection if unchecked
      setSelectedExistingParentId("");
      setParentSearchInput("");
    } else {
        // Reset new parent fields if checked
        setNewParentName("");
        setNewParentEmail("");
        setNewParentContact("");
    }
  };

  // Debounced Parent Search for Autocomplete
  const debouncedFilterParents = useCallback(
    debounce((value: string) => {
      const lowerValue = value.toLowerCase();
      const filtered = parentData
        .filter(
          (parent) =>
            parent.name.toLowerCase().includes(lowerValue) ||
            parent.email.toLowerCase().includes(lowerValue)
        )
        .map((parent) => ({
          key: parent.$id, // Document ID
          label: parent.name + " (" + parent.email + ")",
        }));
      setFilteredExistingParentItems(filtered);
    }, 300), // 300ms delay
    [parentData] // Recreate debounce function if parentData changes
  );

  const handleParentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setParentSearchInput(value);
    setIsParentDropdownOpen(true);
    debouncedFilterParents(value); // Trigger debounced search
    // Clear selection if input is cleared manually
    if (value === "") {
      setSelectedExistingParentId("");
    }
     setAddError(null); // Clear error on input change
  };

  const handleParentSelect = (item: { key: string; label: string }) => {
    setSelectedExistingParentId(item.key); // Set the Parent Document ID
    setParentSearchInput(item.label); // Display selected label in input
    setIsParentDropdownOpen(false); // Close dropdown
    setAddError(null); // Clear error on selection
  };

  // Memoized Filtered Student Data for Table
   // Memoized Filtered Student Data for Table
   const filteredStudentData = useMemo(() => {
    // --- Define how many records to show when not searching ---
    const numberOfRecordsToShowInitially = 10; // Set n here (e.g., 1)  no of rows to be displayed in table

    // Use studentData from Zustand store as the source
    const fullStudentData = studentData || []; // Use store data, fallback to empty array

    if (searchText) {
      // --- SEARCH IS ACTIVE: Filter the entire dataset ---
      const lowerSearchText = searchText.toLowerCase();
      // Keep the original filtering logic using the full dataset
      return fullStudentData.filter((student) => {
        // Find parent name efficiently (keep original lookup)
        const parentName = parentData.find((p) => p.$id === student.parentId)?.name || "";
        switch (selectedSearchOption) {
          case "name": return (student.name || '').toLowerCase().includes(lowerSearchText);
          case "class": return (student.class || '').toLowerCase().includes(lowerSearchText);
          case "section": return (student.section || '').toLowerCase().includes(lowerSearchText);
          case "parentName": return parentName.toLowerCase().includes(lowerSearchText);
          default: return (student.name || '').toLowerCase().includes(lowerSearchText); // Default to name search
        }
      });
    } else {
      // --- NO SEARCH: Show only the latest N records ---
      // Create a shallow copy before sorting to avoid mutating store state
      const sortedData = [...fullStudentData].sort((a, b) => {
        // Sort by $createdAt descending (latest first)
        // Convert to Date objects for reliable comparison
        try {
            const dateA = new Date(a.$createdAt).getTime();
            const dateB = new Date(b.$createdAt).getTime();
            // Handle potential NaN if dates are invalid
            if (isNaN(dateB)) return -1;
            if (isNaN(dateA)) return 1;
            return dateB - dateA; // Newest first (higher timestamp)
        } catch (e) {
             console.error("Error parsing date for sorting:", e);
             return 0; // Maintain original order if parsing fails
        }
      });
      // Slice the sorted array to get the specified number of latest records
      return sortedData.slice(0, numberOfRecordsToShowInitially);
    }
    // Dependencies for recalculation
  }, [studentData, searchText, selectedSearchOption, parentData]);

  // --- Render JSX ---
  return (
    <div className="md:w-full w-full md:p-2">
      <Toaster position="top-right" />
      {errorMessage && <ErrorMessage message={errorMessage} />}

      {/* --- Top Action Bar --- */}
      <div className="top overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
  <div className="min-w-[370px] mt-1 mx-3 md:px-0 mb-1">
    {/* Desktop layout (single line) */}
    <div className="hidden sm:flex items-center justify-between gap-2">
      {/* Add Button */}
      <ActionButton
        icon={<FaPlus className="w-4 h-4 text-gray-100 transition duration-200" />}
        onClick={handleAdd}
        color="orange"
        aria-label="Add New Student"
      />
      
      {/* Search By Select */}
      <Select
        placeholder="Search By"
        className="max-w-[9rem] flex-shrink-0" 
        variant="faded"
        size="md"
        selectedKeys={new Set([selectedSearchOption])}
        onSelectionChange={(keys) => {
          const key = Array.from(keys)[0];
          setSelectedSearchOption(key ? key.toString() : searchOptions[0].value);
        }}
        aria-label="Select search field"
      >
        {searchOptions.map((option) => (
          <SelectItem key={option.value}>{option.label}</SelectItem>
        ))}
      </Select>
      
      {/* Search Input */}
      {/* <div className="flex-grow min-w-[150px] max-w-[350px]"> */}
        <SearchBar
          placeholder="Search students..."
          value={searchText}
          onValueChange={handleSearchChange}
          // className="w-full"
        />
      {/* </div> */}
      
      {/* Refresh Button */}
      <ActionButton
        icon={<TbReload className="w-5 h-5 text-gray-100 transition duration-200" />}
        onClick={handleRefresh}
        aria-label="Refresh Student List"
        // disabled={isRouteLoading}
      />
    </div>
    
    {/* Mobile layout (two lines) */}
    <div className="sm:hidden flex flex-col gap-3">
      {/* First row: Add Button and Select (centered) */}
      <div className="flex items-center justify-between">
        <ActionButton
          icon={<FaPlus className="w-4 h-4 text-gray-100 transition duration-200" />}
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
              setSelectedSearchOption(key ? key.toString() : searchOptions[0].value);
            }}
            aria-label="Select search field"
          >
            {searchOptions.map((option) => (
              <SelectItem key={option.value}>{option.label}</SelectItem>
            ))}
          </Select>
        </div>
        
        <div className="w-8 flex-shrink-0"></div> {/* Spacer to balance the layout */}
      </div>
      
      {/* Second row: Search Bar and Reload Button */}
      <div className="flex justify-between items-center gap-6">
        <div className="flex-grow">
          <SearchBar
            placeholder="Search students..."
            value={searchText}
            onValueChange={handleSearchChange}
          />
        </div>
        
        <ActionButton
          icon={<TbReload className="w-5 h-5 text-gray-100 transition duration-200" />}
          onClick={handleRefresh}
          aria-label="Refresh Student List"
          // disabled={isRouteLoading}
        />
      </div>
    </div>
  </div>
</div>


       {/* Loading Indicator for initial data */}
       {isRouteLoading && <Progress size="sm" isIndeterminate aria-label="Loading initial data..." className="w-full my-2" />}

      {/* --- Student Table --- */}
      <StudentTableRoute
        studentData={filteredStudentData} // Pass memoized filtered data
        isLoading={isRouteLoading} // Pass route loading state (table might have internal loading too)
        onStudentSelect={onStudentSelect}
        onClearSelection={(clearFn: () => void) => setTableClearSelection(() => clearFn)}
        facultyData={facultyData}
        // sectionData={sectionData}
        parentData={parentData}
      />

      {/* --- Add Student Modal --- */}
      <Modal isOpen={isAddModalOpen} onOpenChange={onAddModalOpenChange} scrollBehavior="inside" size="xl" placement="top">
        <ModalContent>
          {(onCloseModal) => (
            <>
              {/* Saving Progress Indicator */}
              {isSaving && <Progress size="sm" isIndeterminate aria-label="Saving..." className="absolute top-0 left-0 w-full z-50" />}

              {/* Modal Header (Optional) */}
              {/* <ModalHeader className="flex flex-col gap-1">Add New Student</ModalHeader> */}

              <ModalBody className="py-4">
                <div className="flex flex-col gap-3 px-4"> {/* Increased gap */}
                  <h1 className="text-xl font-semibold mb-2">Add New Student</h1>
                  {/* Add Modal Error Display */}
                  {addError && (
                     <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-2 text-sm flex items-center" role="alert">
                       <ExclamationTriangleIcon className="h-5 w-5 text-red-700 inline mr-2 flex-shrink-0" />
                       <span>{addError}</span>
                     </div>
                  )}
                  {/* Existing Parent Checkbox */}
                  <Checkbox
                    isSelected={isExistingParentCheckboxChecked}
                    onChange={handleExistingParentCheckboxChange}
                    size="md"
                    className=""
                    >
                    Existing Parent?
                  </Checkbox>

                  {/* --- Conditional Parent Inputs --- */}
                  {isExistingParentCheckboxChecked ? (
                    // Existing Parent Search Autocomplete (Custom Implementation)
                    <div className="relative" ref={parentAutocompleteRef}>
                       <Input
                         label="Search Existing Parent"
                         value={parentSearchInput}
                         onChange={handleParentInputChange}
                         onFocus={() => setIsParentDropdownOpen(true)}
                         variant="underlined" size="sm" color="secondary" className="font-medium max-w-full"
                         isRequired={isExistingParentCheckboxChecked} // Mark as required visually
                         isInvalid={!!(addError && isExistingParentCheckboxChecked && !selectedExistingParentId)} // Show error state
                         errorMessage={addError && isExistingParentCheckboxChecked && !selectedExistingParentId ? "Please select parent" : ""}
                         description={selectedExistingParentId ? "Parent selected." : "Type to search."}
                         autoComplete="off" // Prevent browser autocomplete interference
                       />
                       {isParentDropdownOpen && (
                         <ul className="absolute z-50 w-full bg-content1 border border-divider shadow-lg rounded-md mt-1 max-h-60 overflow-y-auto">
                            {filteredExistingParentItems.length > 0 ? (
                                filteredExistingParentItems.map((item) => (
                                  <li key={item.key} onClick={() => handleParentSelect(item)} className="px-3 py-2 hover:bg-default-100 cursor-pointer text-sm">
                                    {item.label}
                                  </li>
                                ))
                            ) : (
                                <li className="px-3 py-2 text-sm text-gray-500">
                                    {parentSearchInput ? "No matches found" : "Type to search"}
                                </li>
                            )}
                          </ul>
                       )}
                    </div>
                  ) : (
                    // New Parent Input Fields
                    <>
                      <Input fullWidth id="add-parent-name" type="text" label="Parent Name" variant="underlined" value={newParentName} isRequired={!isExistingParentCheckboxChecked} color="secondary" size="sm" className="font-medium" onChange={(e) => { setNewParentName(e.target.value); setAddError(null); }} isInvalid={!!(addError && !isExistingParentCheckboxChecked && !newParentName)} errorMessage={addError && !isExistingParentCheckboxChecked && !newParentName ? "Required" : ""} />
                      <Input fullWidth id="add-parent-email" type="email" variant="underlined" label="Parent Email" value={newParentEmail} isRequired={!isExistingParentCheckboxChecked} color="secondary" size="sm" className="font-medium" onChange={(e) => { setNewParentEmail(e.target.value); setAddError(null); }} isInvalid={!!(addError && !isExistingParentCheckboxChecked && (!newParentEmail || !/\S+@\S+\.\S+/.test(newParentEmail)))} errorMessage={addError && !isExistingParentCheckboxChecked && (!newParentEmail || !/\S+@\S+\.\S+/.test(newParentEmail)) ? "Valid email required" : ""} />
                      <Input fullWidth id="add-parent-contact" type="text" variant="underlined" label="Contact No.s (comma seprated)"  value={newParentContact} isRequired={!isExistingParentCheckboxChecked} color="secondary" size="sm" className="font-medium" onChange={(e) => { setNewParentContact(e.target.value); setAddError(null); }} isInvalid={!!(addError && !isExistingParentCheckboxChecked && !newParentContact)} errorMessage={addError && !isExistingParentCheckboxChecked && !newParentContact ? "Required" : ""} />
                    </>
                  )}
                  {/* --- End Parent Inputs --- */}

                  {/* Faculty Select Autocomplete */}
                  <Autocomplete
                    fullWidth
                    label="Faculty" color="secondary" variant="underlined" size="sm" className="font-medium"
                    isRequired selectedKey={selectedFacultyId}
                    onSelectionChange={(key) => { setSelectedFacultyId(key ? key.toString() : ""); setNewStudentClass(""); setNewStudentSection(""); setAddError(null); setFilteredAddModalClassItems([]); }}
                    errorMessage={addError && !selectedFacultyId ? "Faculty required" : ""}
                    isInvalid={!!(addError && !selectedFacultyId)}
                    items={filteredAddModalFacultyItems}
                    onInputChange={(value) => {
                      const filtered = facultyData.filter((faculty) => faculty.name.toLowerCase().includes(value.toLowerCase())).map((faculty) => ({ key: faculty.$id, label: faculty.name }));
                      setFilteredAddModalFacultyItems(filtered);
                    }}
                    aria-label="Select Faculty"
                    allowsCustomValue={false} // Prevent entering non-existing faculty
                  >
                    {(item) => (<AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>)}
                  </Autocomplete>

                  {/* Class Select Autocomplete */}
                   <Autocomplete
                    fullWidth
                    label="Class" color="secondary" variant="underlined" size="sm" className="font-medium"
                    isRequired selectedKey={newStudentClass}
                    onSelectionChange={(key) => { setNewStudentClass(key ? key.toString() : ""); setAddError(null); }}
                    isDisabled={!selectedFacultyId} // Disable if no faculty selected
                    errorMessage={addError && !newStudentClass ? "Class required" : ""}
                    isInvalid={!!(addError && !newStudentClass)}
                    items={filteredAddModalClassItems}
                    onInputChange={(value) => { // Allow filtering classes by typing
                      const allClassesForSelectedFaculty = selectedFacultyId ? facultyData.find((f) => f.$id === selectedFacultyId)?.classes ?? [] : [];
                      const filteredClasses = allClassesForSelectedFaculty.filter((cls) => cls.toLowerCase().includes(value.toLowerCase())).map((cls) => ({ key: cls, label: cls }));
                      setFilteredAddModalClassItems(filteredClasses);
                    }}
                    aria-label="Select Class"
                    allowsCustomValue={false} // Prevent entering non-existing classes
                  >
                    {(item) => (<AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>)}
                  </Autocomplete>

                  {/* Section Input (Optional) */}
                  {/* <Input
                    fullWidth
                    id="add-student-section"
                    type="text"
                    label="Section (Optional)"
                    variant="underlined"
                    value={newStudentSection}
                    color="secondary" size="sm" className="font-medium"
                    onChange={(e) => { setNewStudentSection(e.target.value); }}
                  /> */}

                  {/* Student Name Input */}
                  <Input
                    fullWidth
                    id="add-student-name" type="text" label="Student Name" variant="underlined"
                    value={newStudentName} isRequired color="secondary" size="sm" className="font-medium"
                    onChange={(e) => { setNewStudentName(e.target.value); setAddError(null); }}
                    isInvalid={!!(addError && !newStudentName)}
                    errorMessage={addError && !newStudentName ? "Student Name required" : ""}
                  />
                </div>
              </ModalBody>
              <ModalFooter className="px-10 pb-4 pt-2"> {/* Adjusted padding */}
                <Button color="danger" variant="light" onPress={onCloseModal} disabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  color="success"
                  onPress={handleAddSaveNewStudent}
                  className="text-white font-medium" // Ensure text visibility
                  isLoading={isSaving}
                  isDisabled={isSaving} // Disable button while saving
                >
                  {isSaving ? "Saving..." : "Save Student"} {/* More descriptive text */}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default List;