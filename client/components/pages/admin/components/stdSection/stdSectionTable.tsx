// ~/Section/sectionTable.tsx
import React, { useEffect, useState, useCallback, Key } from "react"; // Import Key or use React.Key
import { useStudentStore, Student } from "~/store/studentStore";
import { useFacultyStore } from "~/store/facultyStore";
import { useSectionStore } from "~/store/sectionStore";
import { Faculty, Section } from "types"; // Assuming 'types' is a valid path or alias
import {
  Spinner,
  Tooltip,
  Button,
  useDisclosure,
  Autocomplete,
  AutocompleteItem,
  Progress,
} from "@heroui/react";
import { PencilIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { Drawer } from "components/common/Drawer"; // Import Drawer component

// --- Custom Component Imports ---
import Table, { ColumnDef } from '../common/Table'; // Import custom Table and ColumnDef
import Popover from "../common/Popover"; // Keep Popover if needed elsewhere

interface SectionTableRouteProps {
  studentData: Student[];
  isLoading: boolean;
  onClearSelection?: (clearFn: () => void) => void;
  facultyData: Faculty[];
  sectionData: Section[];
  onStudentSelect: (student: Student | null) => void;
}

// --- Table Column Definitions (Mimicking studentTableRoute structure) ---
const columns: ColumnDef<Student>[] = [
  { key: 'name', label: 'Name' },
  { key: 'faculty', label: 'Faculty' }, // Will be handled in renderCell
  { key: 'class', label: 'Class' },
  { key: 'section', label: 'Section' },
  { key: 'actions', label: 'Actions', align: 'center' }, // Matching key 'actions'
];

const SectionTableRoute: React.FC<SectionTableRouteProps> = ({
  studentData,
  isLoading,
  onClearSelection,
  facultyData,
  sectionData,
  onStudentSelect,
}) => {
  // --- Define the number of rows to show ---
  const ROWS_TO_SHOW = 10; // <<<--- SET n HERE

  // --- Store Hooks ---
  const { updateStudentData } = useStudentStore();
  const { fetchFacultyData } = useFacultyStore(); // Keep store hooks
  const { fetchSectionData } = useSectionStore();

  // --- Modal State ---
  const {
    isOpen: isEditDrawerOpen,  // Renamed for clarity
    onOpen: onEditDrawerOpen,  // Renamed for clarity
    onOpenChange: onEditDrawerOpenChange, // Renamed for clarity
    onClose: onEditDrawerClose,  // Renamed for clarity
  } = useDisclosure();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editClass, setEditClass] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editFacultyId, setEditFacultyId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false); // Keep modal state

  // --- Selection State ---
  const [selectedKeys, setSelectedKeys] = useState<Set<React.Key>>(new Set([]));

  // --- Autocomplete state ---
  const [filteredEditModalFacultyItems, setFilteredEditModalFacultyItems] = useState<{ key: string; label: string }[]>([]);
  const [filteredEditModalClassItems, setFilteredEditModalClassItems] = useState<{ key: string; label: string }[]>([]);
  const [filteredEditModalSectionItems, setFilteredEditModalSectionItems] = useState<{ key: string; label: string }[]>([]);

  // --- Effects for modal autocomplete ---
  useEffect(() => {
    setFilteredEditModalFacultyItems(
      facultyData.map((faculty) => ({ key: faculty.$id, label: faculty.name }))
    );
  }, [facultyData]);

  useEffect(() => {
    setFilteredEditModalClassItems(
      editFacultyId
        ? facultyData
            .find((f) => f.$id === editFacultyId)
            ?.classes?.map((cls) => ({ key: cls, label: cls })) ?? []
        : []
    );
  }, [editFacultyId, facultyData]);

  useEffect(() => {
    setFilteredEditModalSectionItems(
      editFacultyId && editClass
        ? sectionData
          .filter(section => section.facultyId === editFacultyId && section.class === editClass)
          .map((section) => ({ key: section.name, label: section.name }))
        : []
    );
  }, [editFacultyId, editClass, sectionData]);

  // --- handleEdit and handleSave logic ---
  const handleEdit = useCallback((student: Student) => {
    setEditingStudent(student);
    setEditClass(student.class);
    setEditSection(student.section || "");
    setEditFacultyId(student.facultyId);
    setEditError(null);
    setIsSavingEdit(false);
    // Pre-populate class dropdown based on initial student faculty
    setFilteredEditModalClassItems(
        student.facultyId
          ? facultyData.find((f) => f.$id === student.facultyId)?.classes?.map((cls) => ({ key: cls, label: cls })) ?? []
          : []
    );
    // Pre-populate section dropdown based on initial student faculty & class
     setFilteredEditModalSectionItems(
      student.facultyId && student.class
        ? sectionData
          .filter(section => section.facultyId === student.facultyId && section.class === student.class)
          .map((section) => ({ key: section.name, label: section.name }))
        : []
    );
    onEditDrawerOpen();
  }, [facultyData, sectionData, onEditDrawerOpen]); // Dependencies remain the same

  const handleSave = useCallback(async () => {
    if (!editingStudent) return;
    setEditError(null);

    // Validation
    if (!editFacultyId || !editClass.trim() || !editSection.trim()) {
      setEditError("Faculty, Class, and Section are required.");
      setIsSavingEdit(false);
      return;
    }
    setIsSavingEdit(true);
    const updatedStudentFields = {
      class: editClass.trim(),
      section: editSection.trim(),
      facultyId: editFacultyId,
    };
    try {
      await updateStudentData(editingStudent.$id, updatedStudentFields);
      onEditDrawerClose();
      setSelectedKeys(new Set([])); // Clear selection after save
      onStudentSelect(null); // Notify parent component
      // Optionally re-fetch data if needed, though Zustand might handle this reactively
      // fetchStudentData(); // Assuming you have access or it's done elsewhere
    } catch (updateError: any) {
      console.error("Error updating student data:", updateError);
      const errorMessage = updateError.message || "Failed to update student.";
      setEditError(errorMessage);
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingStudent, editClass, editSection, editFacultyId, updateStudentData, onEditDrawerClose, onStudentSelect]); // Dependencies remain the same

  // --- Selection Handling ---
  const handleSelectionChange = useCallback((keys: Set<React.Key>) => {
    setSelectedKeys(keys); // Update state with the Set<React.Key>

    if (keys.size === 1) {
      const selectedId = Array.from(keys)[0]; // selectedId is React.Key
      // Convert to string for comparison if $id is always string
      // Find in the original full list, not the sliced list
      const selectedStudent = studentData.find((student) => student.$id === String(selectedId));
      onStudentSelect(selectedStudent || null);
    } else {
      onStudentSelect(null);
      if (keys.size > 1) {
           // If table selectionMode="single", this shouldn't happen,
           // but good practice to clear if somehow multiple are selected.
           setSelectedKeys(new Set([]));
      }
    }
  }, [studentData, onStudentSelect]); // Depend on the original studentData

  // --- Clear Selection ---
  const clearSelectedRow = useCallback(() => {
    setSelectedKeys(new Set([]));
    onStudentSelect(null); // Ensure parent is notified
  }, [onStudentSelect]);

  useEffect(() => {
    if (onClearSelection) {
      onClearSelection(clearSelectedRow);
    }
  }, [onClearSelection, clearSelectedRow]);

  // --- Render Table Cell Function ---
  const renderCell = useCallback((student: Student, columnKey: React.Key): React.ReactNode => {
      const key = String(columnKey); // Convert key to string for switch

      switch (key) {
        case 'name':
          return <span className="font-medium text-gray-900">{student.name}</span>;
        case 'faculty':
          const facultyName = facultyData.find(f => f.$id === student.facultyId)?.name;
          return facultyName || <span className="text-gray-400 italic">N/A</span>; // Match 'N/A' style
        case 'class':
          return student.class || <span className="text-gray-400 italic">N/A</span>;
        case 'section':
          return student.section || <span className="text-gray-400 italic">N/A</span>;
        case 'actions':
          return (
            <div className="flex justify-center gap-1 items-center relative"> {/* Match styling */}
              <Tooltip content="Edit Class/Section" color="warning" className="text-white" showArrow={true}>
                <Button
                  isIconOnly
                  size="sm" // Match size/variant
                  variant="light"
                  color="warning"
                  onPress={() => handleEdit(student)}
                  isDisabled={isSavingEdit} // Disable while saving modal changes
                >
                  <PencilIcon className="h-4 w-4 text-orange-500" /> {/* Match icon/styling */}
                </Button>
              </Tooltip>
            </div>
          );
        default:
           const value = (student as any)[key];
           return value !== undefined && value !== null ? String(value) : <span className="text-gray-400 italic">N/A</span>;
      }
  }, [facultyData, handleEdit, isSavingEdit]); // Add dependencies used inside

  // --- Slice data for display ---
  const displayedStudentData = studentData.slice(0, ROWS_TO_SHOW);

  // --- Loading state rendering ---
  if (isLoading && !displayedStudentData.length) { // Check displayed data length too
    return (
      <div className=" h-52 flex items-center justify-center">
        <Spinner size="lg" label="Loading Data..." />
      </div>
    );
  }

  // --- Component Render ---
  return (
    <div className="mt-4 flow-root ">
       {/* --- Use Custom Table Component --- */}
       <Table<Student>
          columns={columns}
          // Pass the sliced data to the Table component
          data={displayedStudentData}
          getRowKey={(student) => student.$id}
          isLoading={isLoading} // Pass loading state
          emptyContent={isLoading ? "Loading..." : "No students found."} // Improved empty state
          renderCell={renderCell}
          selectionMode="single"
          selectedKeys={selectedKeys}
          onSelectionChange={handleSelectionChange} // Pass the correctly typed handler
          maxHeight="70vh" // Apply maxHeight for scrolling
          // --- Apply Styling Props identical to studentTableRoute ---
          className="border border-gray-200 rounded-lg shadow-sm overflow-hidden"
          tableClassName="min-w-full divide-y divide-gray-300"
          headerClassName="bg-gray-50 sticky top-0 z-10"
          rowClassName={(item, isSelected) =>
             `transition-colors duration-150 ${isSelected ? 'bg-secondary-100' : 'hover:bg-gray-50'}`
          }
       />

      {/* --- Edit Modal (Remains Unchanged) --- */}
      <Drawer
        isOpen={isEditDrawerOpen}
        onClose={onEditDrawerClose}
        position="right"
        size="lg"
        nonDismissable={true}
      >
        <Drawer.Header showCloseButton={true}>
           Edit Class & Section
        </Drawer.Header>
        <Drawer.Body>
        {isSavingEdit && <Progress size="sm" isIndeterminate aria-label="Saving..." className="absolute top-0 left-0 w-full z-50 rounded-t-lg" />}
        <div className="flex flex-col gap-3 px-4">
            {/* <h1 className=" text-xl font-semibold my-2">Edit Class & Section</h1> */}
            {editError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-2 text-sm flex items-center gap-2" role="alert">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-700 flex-shrink-0" />
                    <span>{editError}</span>
                </div>
            )}
            <p className="font-semibold text-gray-700">Student Name: <span className="font-normal text-black">{editingStudent?.name}</span></p>
            {/* Faculty Autocomplete */}
            <Autocomplete
                label="Faculty" color="secondary" variant="underlined" size="sm" className="font-medium"
                isRequired selectedKey={editFacultyId} isDisabled={isSavingEdit}
                onSelectionChange={(key) => {
                    const newFacultyId = key ? String(key) : "";
                    setEditFacultyId(newFacultyId);
                    setEditClass(""); // Reset class on faculty change
                    setEditSection(""); // Reset section on faculty change
                    setFilteredEditModalSectionItems([]); // Clear section items
                    setEditError(null);
                }}
                errorMessage={editError && !editFacultyId ? "Faculty is required" : ""} isInvalid={!!(editError && !editFacultyId)}
                items={filteredEditModalFacultyItems} aria-label="Select Faculty" allowsCustomValue={false} placeholder="Choose a faculty"
                onInputChange={(value) => {
                    const filtered = facultyData.filter(f => f.name.toLowerCase().includes(value.toLowerCase())).map(f => ({ key: f.$id, label: f.name }));
                    setFilteredEditModalFacultyItems(filtered.length > 0 ? filtered : facultyData.map(f => ({ key: f.$id, label: f.name }))); // Show all if filter clears
                }}
            >{(item) => <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>}</Autocomplete>
            {/* Class Autocomplete */}
            <Autocomplete
                label="Class" color="secondary" variant="underlined" size="sm" className="font-medium"
                isRequired selectedKey={editClass} isDisabled={!editFacultyId || isSavingEdit}
                onSelectionChange={(key) => {
                    const newClass = key ? String(key) : "";
                    setEditClass(newClass);
                    setEditSection(""); // Reset section on class change
                    setFilteredEditModalSectionItems([]); // Clear section items
                    setEditError(null);
                }}
                errorMessage={editError && !editClass ? "Class is required" : ""} isInvalid={!!(editError && !editClass)}
                items={filteredEditModalClassItems} aria-label="Select Class" allowsCustomValue={false} placeholder="Choose a class"
                onInputChange={(value) => {
                    const currentClasses = editFacultyId ? facultyData.find(f => f.$id === editFacultyId)?.classes ?? [] : [];
                    const filtered = currentClasses.filter(cls => cls.toLowerCase().includes(value.toLowerCase())).map(cls => ({ key: cls, label: cls }));
                    setFilteredEditModalClassItems(filtered.length > 0 ? filtered : currentClasses.map(cls => ({ key: cls, label: cls }))); // Show all matching faculty if filter clears
                }}
            >{(item) => <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>}</Autocomplete>
            {/* Section Autocomplete */}
            <Autocomplete
                label="Section" color="secondary" variant="underlined" size="sm" className="font-medium"
                isRequired selectedKey={editSection} isDisabled={!editClass || !editFacultyId || isSavingEdit}
                onSelectionChange={(key) => {
                    setEditSection(key ? String(key) : "");
                    setEditError(null);
                }}
                errorMessage={editError && !editSection ? "Section is required" : ""} isInvalid={!!(editError && !editSection)}
                items={filteredEditModalSectionItems} aria-label="Select Section" allowsCustomValue={false} placeholder="Choose a section"
                onInputChange={(value) => {
                    const currentSections = (editFacultyId && editClass) ? sectionData.filter(s => s.facultyId === editFacultyId && s.class === editClass).map(s => s.name) : [];
                    const filtered = currentSections.filter(sec => sec.toLowerCase().includes(value.toLowerCase())).map(sec => ({ key: sec, label: sec }));
                    setFilteredEditModalSectionItems(filtered.length > 0 ? filtered : currentSections.map(sec => ({ key: sec, label: sec }))); // Show all matching faculty/class if filter clears
                }}
            >{(item) => <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>}</Autocomplete>
        </div>
        </Drawer.Body>
        <Drawer.Footer>
            <Button color="danger" variant="light" onPress={onEditDrawerClose} disabled={isSavingEdit}>Cancel</Button>
            <Button color="success" onPress={handleSave} className="text-white font-medium" isLoading={isSavingEdit} disabled={isSavingEdit || !editFacultyId || !editClass || !editSection}> {isSavingEdit ? "Saving..." : "Save Changes"} </Button>
        </Drawer.Footer>
      </Drawer>
    </div>
  );
};

export default SectionTableRoute;