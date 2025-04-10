// ~/components/pages/admin/components/Student/studentTable.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
// --- Import Types from Stores ---
import {
  useStudentStore,
  Student,
  StudentUpdateData,
} from "~/store/studentStore";
import {
  useParentStore,
  Parent,
  ParentDetailsUpdateData,
} from "~/store/parentStore";
// --- Other Store/Type Imports ---
import { useFacultyStore } from "~/store/facultyStore";
import { Faculty } from "types";
// --- UI Library Imports ---
import {
  Tooltip,
  Button,
  Input,
  Autocomplete,
  AutocompleteItem,
  Progress,
  useDisclosure,
} from "@heroui/react";
import {
  TrashIcon,
  PencilIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import { Drawer } from "components/common/Drawer"; // Import Drawer component

// --- Custom Component Imports ---
import Popover from "../common/Popover";
import Table, { ColumnDef } from "../common/Table";

// --- Define Key type ---
type Selection = Set<React.Key>;

// --- Component Props ---
interface StudentTableRouteProps {
  studentData: Student[];
  isLoading: boolean;
  onStudentSelect: (student: Student | null) => void;
  onClearSelection?: (clearFn: () => void) => void;
  facultyData: Faculty[];
  parentData: Parent[];
}

// --- Table Column Definitions ---
const columns: ColumnDef<Student>[] = [
  { key: "name", label: "Name" },
  { key: "class", label: "Class" },
  { key: "section", label: "Section" },
  { key: "parentName", label: "Parent Name" },
  { key: "actions", label: "Actions", align: "center" },
];

// --- The Component ---
const StudentTableRoute: React.FC<StudentTableRouteProps> = ({
  studentData,
  isLoading,
  onStudentSelect,
  onClearSelection,
  facultyData,
  parentData,
}) => {
  // --- Define the number of rows to show ---
  const ROWS_TO_SHOW = 10; // Set n here   rows to be displayed

  // --- Store Hooks ---
  const { updateStudentData, fetchStudentData, deleteStudentData } =
    useStudentStore();
  const { updateParentDetails, fetchParentData } = useParentStore();

  // --- Modal State (for Edit) ---
  const {
    isOpen: isEditDrawerOpen, // Renamed for clarity
    onOpen: onEditDrawerOpen, // Renamed for clarity
    onOpenChange: onEditDrawerOpenChange, // Renamed for clarity
    onClose: onEditDrawerClose, // Renamed for clarity
  } = useDisclosure();

  // --- Editing State ---
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFacultyId, setEditFacultyId] = useState<string>(""); // State setter is setEditFacultyId
  const [editParentContact, setEditParentContact] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // --- Selection & Delete State ---
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Autocomplete Filter State (for Edit Modal) ---
  const [filteredEditModalFacultyItems, setFilteredEditModalFacultyItems] =
    useState<{ key: string; label: string }[]>([]);
  const [filteredEditModalClassItems, setFilteredEditModalClassItems] =
    useState<{ key: string; label: string }[]>([]);

  // --- Effects ---
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

  // --- Edit Modal Logic ---
  const handleEdit = useCallback(
    (student: Student) => {
      if (isDeleting) return;
      setEditingStudent(student);
      setEditName(student.name);
      setEditClass(student.class);
      setEditSection(student.section || "");
      setEditFacultyId(student.facultyId);
      setEditError(null);
      setIsSavingEdit(false);

      const parent = parentData.find((p) => p.$id === student.parentId);
      if (parent) {
        setEditingParent(parent);
        setEditParentName(parent.name ?? "");
        setEditEmail(parent.email ?? "");
        setEditParentContact(parent.contact ? parent.contact.join(", ") : "");
      } else {
        console.warn(
          `Parent with ID ${student.parentId} not found for student ${student.name}`
        );
        setEditingParent(null);
        setEditParentName("");
        setEditEmail("");
        setEditParentContact("");
      }
      setFilteredEditModalClassItems(
        student.facultyId
          ? facultyData
              .find((f) => f.$id === student.facultyId)
              ?.classes?.map((cls) => ({ key: cls, label: cls })) ?? []
          : []
      );
      onEditDrawerOpen(); //Open Drawer
    },
    [facultyData, parentData, onEditDrawerOpen, isDeleting]
  );

  const handleSave = useCallback(async () => {
    // Use useCallback for consistency if desired
    if (!editingStudent) return;
    setEditError(null);
    setIsSavingEdit(true);

    // Validation
    if (!editName.trim() || !editFacultyId || !editClass.trim()) {
      setEditError("Student Name, Faculty, and Class are required.");
      setIsSavingEdit(false);
      return;
    }
    if (
      editingParent &&
      (!editParentName.trim() ||
        !editEmail.trim() ||
        !/\S+@\S+\.\S+/.test(editEmail) ||
        !editParentContact.trim())
    ) {
      setEditError("Parent Name, valid Email, and Contact are required.");
      setIsSavingEdit(false);
      return;
    }

    try {
      // Update Parent Details (using imported type)
      if (editingParent) {
        const parentDetailsUpdate: ParentDetailsUpdateData = {
          name: editParentName.trim(),
          email: editEmail.trim(),
          contact: editParentContact
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
        };
        await updateParentDetails(editingParent.$id, parentDetailsUpdate);
      }

      // Update Student Details (using imported type)
      const studentDetailsUpdate: StudentUpdateData = {
        name: editName.trim(),
        class: editClass.trim(),
        facultyId: editFacultyId,
        section: editSection.trim() || "",
      };
      const updatedStudent = await updateStudentData(
        editingStudent.$id,
        studentDetailsUpdate
      );

      toast.success(
        `Student '${updatedStudent?.name || editName}' updated successfully!`
      );
      onEditDrawerClose(); //Close Drawer
      setSelectedKeys(new Set([]));
      onStudentSelect(null);
    } catch (error: any) {
      console.error("Error during edit save process:", error);
      const errorMessage =
        error.message || "An unexpected error occurred during save.";
      setEditError(errorMessage);
      toast.error(`Save Failed: ${errorMessage}`);
    } finally {
      setIsSavingEdit(false);
    }
  }, [
    editingStudent,
    editingParent,
    editName,
    editParentName,
    editClass,
    editSection,
    editEmail,
    editFacultyId,
    editParentContact,
    updateParentDetails,
    updateStudentData,
    onEditDrawerClose,
    onStudentSelect, // Added dependencies
  ]);

  // --- Delete Popover Logic ---
  const handleDeletePress = useCallback(
    (student: Student) => {
      if (isDeleting || isEditDrawerOpen) return;
      // console.log("Delete pressed for:", student.name, student.$id);
      setStudentToDelete(student);
      setIsDeletePopoverOpen(true);
    },
    [isDeleting, isEditDrawerOpen]
  );

  const handleCancelDelete = useCallback(() => {
    // console.log("Delete cancelled.");
    setIsDeletePopoverOpen(false);
    setStudentToDelete(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!studentToDelete || isDeleting) return;

    const studentIdToDelete = studentToDelete.$id;
    const studentName = studentToDelete.name;
    // console.log(`Confirming delete for: ${studentName} (${studentIdToDelete})`);

    setIsDeleting(true);
    setIsDeletePopoverOpen(false);

    const toastId = toast.loading(`Deleting student ${studentName}...`);

    try {
      await deleteStudentData(studentIdToDelete);
      toast.success(`Student ${studentName} deleted successfully.`, {
        id: toastId,
      });
      // console.log(`UI: Deletion process for ${studentIdToDelete} completed.`);
      // console.log("UI: Refetching student and parent data after deletion.");
      // No need to await these if the UI update from the store is reactive enough
      fetchStudentData();
      fetchParentData();
      setSelectedKeys(new Set([]));
      onStudentSelect(null);
    } catch (error: any) {
      // console.error("UI: Error occurred during student deletion process:", error);
      toast.error(
        `Error deleting ${studentName}: ${error.message || "Unknown error"}`,
        { id: toastId }
      );
    } finally {
      setIsDeleting(false);
      setStudentToDelete(null); // Ensure studentToDelete is cleared
    }
  }, [
    studentToDelete,
    isDeleting,
    deleteStudentData,
    fetchStudentData,
    fetchParentData,
    onStudentSelect,
  ]);

  // --- Selection Handling & Clear Selection ---
  const handleSelectionChange = useCallback(
    (keys: Selection) => {
      setSelectedKeys(keys);
      if (keys.size === 1) {
        const selectedId = Array.from(keys)[0];
        // Important: Find in the original full list, not the sliced list
        const selectedStudent = studentData.find(
          (student) => student.$id === selectedId
        );
        onStudentSelect(selectedStudent || null);
      } else {
        onStudentSelect(null);
      }
    },
    [studentData, onStudentSelect]
  ); // Depend on the original studentData

  const clearSelectedRow = useCallback(() => {
    setSelectedKeys(new Set([]));
    onStudentSelect(null);
  }, [onStudentSelect]);

  useEffect(() => {
    if (onClearSelection) {
      onClearSelection(clearSelectedRow);
    }
  }, [onClearSelection, clearSelectedRow]);

  // --- Render Table Cell ---
  const renderCell = useCallback(
    (student: Student, columnKey: string): React.ReactNode => {
      // Cast to any is acceptable here for dynamic property access or use type assertion
      const value = (student as any)[columnKey];

      switch (columnKey) {
        case "name":
          return (
            <span className="font-medium text-gray-900">{student.name}</span>
          );
        case "class":
          return (
            student.class || <span className="text-gray-400 italic">N/A</span>
          );
        case "section":
          return (
            student.section || <span className="text-gray-400 italic">N/A</span>
          );
        case "parentName":
          const parent = parentData.find((p) => p.$id === student.parentId);
          return parent ? (
            <Tooltip
              content={parent.email || "No email"}
              placement="top-start"
              showArrow
            >
              <span>
                {parent.name || (
                  <span className="text-gray-400 italic">N/A</span>
                )}
              </span>
            </Tooltip>
          ) : (
            <span className="text-gray-400 italic">Not Found</span>
          );
        case "actions":
          return (
            <div className="flex justify-center gap-1 items-center relative">
              {/* Edit Button */}
              <Tooltip
                content="Edit"
                color="warning"
                className="text-white"
                showArrow={true}
              >
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="warning"
                  onPress={() => handleEdit(student)}
                  isDisabled={
                    isDeleting ||
                    (isDeletePopoverOpen &&
                      studentToDelete?.$id === student.$id)
                  }
                >
                  <PencilIcon className="h-4 w-4 text-orange-500" />
                </Button>
              </Tooltip>
              {/* Delete Button */}
              <Tooltip
                content="Delete"
                color="danger"
                className="text-white"
                showArrow={true}
              >
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  aria-label={`Delete student ${student.name}`}
                  onPress={() => handleDeletePress(student)}
                  isDisabled={
                    isDeleting ||
                    isEditDrawerOpen ||
                    (isDeletePopoverOpen &&
                      studentToDelete?.$id === student.$id)
                  }
                >
                  <TrashIcon className="h-4 w-4 text-red-500" />
                </Button>
              </Tooltip>
              {/* Custom Popover */}
              {studentToDelete?.$id === student.$id && (
                <Popover
                  isOpen={isDeletePopoverOpen}
                  onClose={handleCancelDelete}
                  onConfirm={handleConfirmDelete}
                  title={
                    <span className="text-red-700 flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5" />
                      Confirm Deletion
                    </span>
                  }
                  content={
                    <>
                      {" "}
                      Are you sure to delete student: <br />{" "}
                      <strong className="font-semibold">
                        {studentToDelete?.name}
                      </strong>
                      ? <br />{" "}
                      {isDeleting && (
                        <Progress
                          size="sm"
                          isIndeterminate
                          aria-label="Deleting..."
                          className="my-2"
                        />
                      )}{" "}
                      <span className="text-sm text-red-600 block mt-3">
                        This cannot be undone and may delete the parent record
                        if this is their only student.
                      </span>{" "}
                    </>
                  }
                />
              )}
            </div>
          );
        default:
          return value ?? <span className="text-gray-400 italic">N/A</span>;
      }
    },
    [
      parentData,
      handleEdit,
      handleDeletePress,
      isDeletePopoverOpen,
      studentToDelete,
      handleCancelDelete,
      handleConfirmDelete,
      isDeleting,
      isEditDrawerOpen,
    ]
  ); // Added isEditModalOpen dependency

  // --- Slice data for display ---
  // Slice the studentData array to get only the first ROWS_TO_SHOW items
  // This will not throw an error if studentData has fewer than ROWS_TO_SHOW items; it will just return all available items.
  const displayedStudentData = studentData.slice(0, ROWS_TO_SHOW);

  // --- Component Render ---
  return (
    <div className="mt-4">
      {/* --- Reusable Table Component --- */}
      <Table<Student>
        columns={columns}
        // Pass the sliced data to the Table component
        data={displayedStudentData}
        getRowKey={(student) => student.$id}
        isLoading={isLoading}
        emptyContent={isLoading ? "Loading..." : "No students found."} // Improved empty state when loading
        renderCell={renderCell}
        selectionMode="single"
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChange}
        maxHeight="70vh"
        className="border border-gray-200 rounded-lg shadow-sm overflow-hidden"
        tableClassName="min-w-full divide-y divide-gray-300"
        headerClassName="bg-gray-50 sticky top-0 z-10"
        rowClassName={(item, isSelected) =>
          `transition-colors duration-150 ${
            isSelected ? "bg-secondary-100" : "hover:bg-gray-50"
          }`
        }
      />

      {/* --- Edit Student Drawer --- */}
      <Drawer
        isOpen={isEditDrawerOpen}
        onClose={onEditDrawerClose}
        position="right"
        size="lg"
        nonDismissable={true}
      >
        <Drawer.Header showCloseButton={true}>
          Edit Student Details
        </Drawer.Header>
        <Drawer.Body>
          {isSavingEdit && (
            <Progress
              size="sm"
              isIndeterminate
              aria-label="Saving..."
              className="absolute top-0 left-0 w-full z-50"
            />
          )}
          <div className="flex flex-col gap-3 px-4">
            {/* <h1 className=" text-xl font-semibold mb-2">Edit Student Details</h1> */}
            {editError && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-2 text-sm flex items-center gap-2"
                role="alert"
              >
                <ExclamationTriangleIcon className="h-5 w-5 text-red-700 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}
            {/* Parent Fields */}
            <Input
              id="parent-name-edit"
              type="text"
              color="secondary"
              label="Parent Name"
              variant="underlined"
              value={editParentName}
              className="font-medium"
              size="sm"
              isRequired
              isDisabled={!editingParent || isSavingEdit}
              onChange={(e) => {
                setEditParentName(e.target.value);
                setEditError(null);
              }}
              isInvalid={
                !!(editError && editingParent && !editParentName.trim())
              }
              errorMessage={
                editError && editingParent && !editParentName.trim()
                  ? "Parent Name required"
                  : ""
              }
              description={!editingParent ? "No parent linked." : ""}
            />
            <Input
              id="student-email-edit"
              type="email"
              color="secondary"
              label="Parent Email"
              variant="underlined"
              value={editEmail}
              className="font-medium"
              size="sm"
              isRequired
              // isDisabled={!editingParent || isSavingEdit}
              isDisabled
              onChange={(e) => {
                setEditEmail(e.target.value);
                setEditError(null);
              }}
              isInvalid={
                !!(
                  editError &&
                  editingParent &&
                  (!editEmail.trim() || !/\S+@\S+\.\S+/.test(editEmail))
                )
              }
              errorMessage={
                editError &&
                editingParent &&
                (!editEmail.trim() || !/\S+@\S+\.\S+/.test(editEmail))
                  ? "Valid Parent Email required"
                  : ""
              }
            />
            <Input
              id="parent-contact-edit"
              type="text"
              color="secondary"
              label="Parent Contact No."
              variant="underlined"
              value={editParentContact}
              className="font-medium"
              size="sm"
              isRequired
              isDisabled={!editingParent || isSavingEdit}
              onChange={(e) => {
                setEditParentContact(e.target.value);
                setEditError(null);
              }}
              isInvalid={
                !!(editError && editingParent && !editParentContact.trim())
              }
              errorMessage={
                editError && editingParent && !editParentContact.trim()
                  ? "Parent Contact required"
                  : ""
              }
              placeholder="Comma-separated if multiple"
            />

            {/* Faculty Autocomplete */}
            <Autocomplete
              fullWidth
              label="Select Faculty"
              variant="underlined"
              color="secondary"
              size="sm"
              className="font-medium"
              isRequired
              selectedKey={editFacultyId}
              onSelectionChange={(key) => {
                const newFacultyId = key ? key.toString() : "";
                setEditFacultyId(newFacultyId);
                setEditClass("");
                setEditSection("");
                setEditError(null);
              }}
              errorMessage={
                editError && !editFacultyId ? "Faculty required" : ""
              }
              isInvalid={!!(editError && !editFacultyId)}
              items={filteredEditModalFacultyItems}
              aria-label="Select Faculty"
              allowsCustomValue={false}
              isDisabled={isSavingEdit}
              placeholder="Choose a faculty"
            >
              {(item) => (
                <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>
              )}
            </Autocomplete>

            {/* Class Autocomplete */}
            <Autocomplete
              fullWidth
              label="Select Class"
              variant="underlined"
              color="secondary"
              size="sm"
              className="font-medium"
              isRequired
              selectedKey={editClass}
              onSelectionChange={(key) => {
                setEditClass(key ? key.toString() : "");
                setEditError(null);
              }}
              isDisabled={!editFacultyId || isSavingEdit}
              errorMessage={editError && !editClass ? "Class required" : ""}
              isInvalid={!!(editError && !editClass)}
              items={filteredEditModalClassItems}
              aria-label="Select Class"
              allowsCustomValue={false}
              placeholder="Choose a class"
            >
              {(item) => (
                <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>
              )}
            </Autocomplete>

            {/* Section Input */}
            <Input
              fullWidth
              id="edit-student-section"
              type="text"
              label="Section (Optional)"
              placeholder="E.g., A, B"
              variant="underlined"
              value={editSection}
              color="secondary"
              size="sm"
              className="font-medium"
              onChange={(e) => {
                setEditSection(e.target.value);
              }}
              isDisabled={isSavingEdit}
            />
            {/* Student Name Input */}
            <Input
              fullWidth
              id="student-name-edit"
              type="text"
              color="secondary"
              label="Student Name"
              variant="underlined"
              value={editName}
              className="font-medium"
              size="sm"
              isRequired
              onChange={(e) => {
                setEditName(e.target.value);
                setEditError(null);
              }}
              isInvalid={!!(editError && !editName.trim())}
              errorMessage={
                editError && !editName.trim() ? "Student Name required" : ""
              }
              isDisabled={isSavingEdit}
            />
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button
            color="danger"
            variant="light"
            onPress={onEditDrawerClose}
            disabled={isSavingEdit}
          >
            {" "}
            Cancel{" "}
          </Button>
          <Button
            color="success"
            onPress={handleSave}
            className="text-white font-medium"
            isLoading={isSavingEdit}
            isDisabled={isSavingEdit}
          >
            {" "}
            {isSavingEdit ? "Saving..." : "Save Changes"}{" "}
          </Button>
        </Drawer.Footer>
      </Drawer>
    </div>
  );
};

export default StudentTableRoute;
