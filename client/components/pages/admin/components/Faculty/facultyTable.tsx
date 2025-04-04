// facultyTable.tsx
// src/facultyTable.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useFacultyStore } from "~/store/facultyStore";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  Selection, // Import Selection type from @heroui/react
} from "@heroui/react";
import {
  Tooltip,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
} from "@heroui/react";
import { TrashIcon, PencilIcon } from "@heroicons/react/24/solid";
import Popover from "../common/Popover";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import PerfectScrollbar from "react-perfect-scrollbar";

interface Faculty {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  id: string;
  name: string;
  classes: string[];
}

interface FacultyTableRouteProps {
  facultyData: Faculty[];
  isLoading: boolean;
  onFacultySelect: (faculty: Faculty | null) => void;
  onClearSelection?: (clearFn: () => void) => void;
}

const FacultyTableRoute: React.FC<FacultyTableRouteProps> = ({
  facultyData,
  isLoading,
  onFacultySelect,
  onClearSelection,
}) => {
  const { updateFacultyData, deleteFacultyData, fetchFacultyData } =
    useFacultyStore();
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [editName, setEditName] = useState("");
  const [editClasses, setEditClasses] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set([]));

  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [facultyToDelete, setFacultyToDelete] = useState<Faculty | null>(null);
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);

  const handleEdit = (faculty: Faculty) => {
    setEditingFaculty(faculty);
    setEditName(faculty.name);
    setEditClasses(faculty.classes.join(", "));
    setEditError(null);
    onOpen();
  };

  const handleSave = async () => {
    if (!editingFaculty) return;
    setEditError(null); // Clear previous errors

    if (!editName.trim()) {
      setEditError("Faculty Name is required.");
      return;
    }

    if (!editClasses.trim()) {
      setEditError("Classes are required.");
      return;
    }

    const updatedFacultyData = {
      ...editingFaculty,
      name: editName,
      classes: editClasses
        .split(",")
        .map((cls) => cls.trim())
        .filter((cls) => cls !== ""),
    };

    try {
      await updateFacultyData(updatedFacultyData);
      onClose();
      // fetchFacultyData(); // Removed fetchFacultyData to avoid full reload
      setSelectedKeys(new Set([])); // Deselect the table row
      onFacultySelect(null); // **Explicitly call onFacultySelect(null) now**
      // console.log("FacultyTable: handleSave - onFacultySelect(null) called"); // LOG
    } catch (updateError: any) {
      console.error("FacultyTable: Error updating faculty data:", updateError);
      setEditError(updateError.message || "Failed to update faculty.");
    }
  };

  const handleDelete = (faculty: Faculty) => {
    setFacultyToDelete(faculty);
    setIsDeletePopoverOpen(true);
  };

  const handleCancelDelete = () => {
    setIsDeletePopoverOpen(false);
    setFacultyToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!facultyToDelete) return;
    // console.log("FacultyTable: handleConfirmDelete - START"); // LOG
    try {
      await deleteFacultyData(facultyToDelete.$id);
      setIsDeletePopoverOpen(false);
      setFacultyToDelete(null);
      // fetchFacultyData(); // No need to refetch all data after delete.
      setSelectedKeys(new Set([])); // Deselect the table row after delete as well (optional, but makes sense)
      onFacultySelect(null);
      // console.log("FacultyTable: handleConfirmDelete - onFacultySelect(null) called"); // LOG
    } catch (deleteError: any) {
      console.error("FacultyTable: Error deleting faculty data:", deleteError);
      alert(
        `Error deleting faculty: ${deleteError.message || "Unknown error"}`
      );
      setIsDeletePopoverOpen(false);
      setFacultyToDelete(null);
    }
    // console.log("FacultyTable: handleConfirmDelete - END"); // LOG
  };

  // Corrected handleSelectionChange to accept Selection type
  const handleSelectionChange = (keys: Selection) => {
    // console.log("FacultyTable: handleSelectionChange - START", keys); // LOG
    let selectedKeySet: Set<string> = new Set();
    if (keys) {
      if (typeof keys === 'string') { // For single selection mode, Selection might be a string
        selectedKeySet.add(keys);
      } else if (keys instanceof Set) { // In case Selection is already a Set (though unlikely in single mode, but for robustness)
        selectedKeySet = keys as Set<string>;
      }
       // If Selection is an array, handle it here if needed, based on heroui's Selection type definition.
       // else if (Array.isArray(keys)) { // if Selection is string[]
       //    selectedKeySet = new Set(keys);
       // }
    }
    setSelectedKeys(selectedKeySet);
    // console.log("FacultyTable: handleSelectionChange - setSelectedKeys", selectedKeySet); // LOG


    if (selectedKeySet.size > 0) {
      const selectedFaculty = facultyData.find((faculty) =>
        selectedKeySet.has(faculty.$id)
      );
      // console.log("FacultyTable: handleSelectionChange - faculty found", selectedFaculty); // LOG
      onFacultySelect(selectedFaculty || null);
      // console.log("FacultyTable: handleSelectionChange - onFacultySelect called with", selectedFaculty || null); // LOG
    } else {
      // console.log("FacultyTable: handleSelectionChange - no keys selected"); // LOG
      onFacultySelect(null);
      setSelectedKeys(new Set([])); // Ensure selectedKeys is also cleared when onFacultySelect(null) is called from List.tsx on back button.
      // console.log("FacultyTable: handleSelectionChange - onFacultySelect(null) called (no selection)"); // LOG
    }
    // console.log("FacultyTable: handleSelectionChange - END"); // LOG
  };

  const clearSelectedRow = useCallback(() => {
    setSelectedKeys(new Set([]));
  }, []);

  useEffect(() => {
    if (onClearSelection) {
      onClearSelection(clearSelectedRow);
    }
  }, [onClearSelection, clearSelectedRow]);

  useEffect(() => {
    // console.log("FacultyTable: Props - facultyData:", facultyData, "isLoading:", isLoading);
  }, [facultyData, isLoading]);


  if (isLoading) {
    return (
      <div className=" h-52 flex items-center justify-center">
        <Spinner size="lg" label="Loading Data..." />
      </div>
    );
  }

  return (
    <div className="mt-4 flow-root md:px-0 lg:px-8">
      <div className=" -my-2 overflow-x-auto  lg:-mx-8">
        <div className="inline-block min-w-full pt-2 align-middle">
          <Table
            isHeaderSticky
            isCompact
            aria-label="Faculty Table"
            selectionMode="single"
            selectedKeys={selectedKeys}
            onSelectionChange={handleSelectionChange}
            color="secondary"
            className="min-w-full divide-y divide-gray-300"
            classNames={
              {
                // base: "max-h-[fit] overflow-scroll",
                // table: "min-h-[400px]",
              }
            }
          >
            <TableHeader>
              <TableColumn key="name">Name</TableColumn>
              <TableColumn key="classes">Classes</TableColumn>
              <TableColumn key="actions" align="center">
                Actions
              </TableColumn>
            </TableHeader>
            <TableBody>
              {facultyData.length > 0 ? (
                facultyData.map((faculty) => (
                  <TableRow key={faculty.$id}>
                    <TableCell>{faculty.name}</TableCell>
                    <TableCell>{faculty.classes.length}</TableCell>
                    <TableCell className="flex justify-center gap-2">
                      <Tooltip
                        content="Edit"
                        showArrow
                        color="warning"
                        placement="top"
                        className="bg-warning-500 text-white rounded-md shadow-md"
                      >
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="warning"
                          onPress={() => handleEdit(faculty)}
                          aria-label="Edit Faculty"
                        >
                          <PencilIcon className="h-4 w-4 text-orange-500" />
                        </Button>
                      </Tooltip>
                      <Tooltip
                        content="Delete"
                        showArrow
                        color="danger"
                        placement="top"
                        className="bg-danger-500 text-white rounded-md shadow-md"
                      >
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => handleDelete(faculty)}
                          aria-label="Delete Faculty"
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
               <TableCell  className="text-center"><></></TableCell>
               <TableCell  className=" text-gray-500 p-5 text-center text-medium"> No Data Found</TableCell>
               <TableCell  className="text-center"><></></TableCell>

                </TableRow>
                )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Custom Delete Popover */}
      <Popover
        isOpen={isDeletePopoverOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirm Delete"
        content={
          facultyToDelete
            ? `Are you sure you want to delete faculty member: ${facultyToDelete.name}?`
            : ""
        }
        position="top"
      />

      {/* Edit Faculty Modal */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {(onCloseModal) => (
            <>
              {/* <ModalHeader className="flex justify-center text-xl">Edit Faculty</ModalHeader> */}
              <ModalBody className=" my-2">
                <div className="flex flex-col gap-2 px-4">
                  <h1 className=" text-xl font-semibold my-2">
                    Edit Faculty
                  </h1>

                  {editError && (
                    <div
                      className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
                      role="alert"
                    >
                      <strong className="font-bold">Error!</strong>
                      <span className="block sm:inline">{editError}</span>
                      <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
                        <ExclamationTriangleIcon
                          className="h-5 w-5 text-red-500"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  )}
                  <Input
                    id="faculty-name"
                    type="text"
                    color="secondary"
                    label="Name"
                    variant="underlined"
                    value={editName}
                    className="font-medium"
                    isRequired
                    // placeholder="Enter faculty name"
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setEditError(null); // Clear error on input change
                    }}
                  />

                  <Input
                    id="faculty-classes"
                    type="text"
                    color="secondary"
                    label="Classes (comma-separated)"
                    variant="underlined"
                    value={editClasses}
                    className="font-medium"
                    isRequired
                    // placeholder="e.g., Math, Science, English"
                    onChange={(e) => {
                      setEditClasses(e.target.value);
                      setEditError(null); // Clear error on input change
                    }}
                  />
                </div>
              </ModalBody>
              <ModalFooter className=" px-10 mb-1">
                <Button color="danger" variant="light" onPress={onCloseModal}>
                  Close
                </Button>
                <Button color="success" onPress={handleSave}
                className="text-white font-medium"
                >
                  Save
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default FacultyTableRoute;