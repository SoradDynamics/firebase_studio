// routes/facultyTable.tsx (renamed to src/facultyTable.tsx and updated)
import { useEffect, useState } from "react";
import { useFacultyStore } from "~/store/facultyStore";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
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
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

// Define Faculty interface (if not already defined elsewhere, or import it)
interface Faculty {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  id: string;
  name: string;
  classes: string[];
}

interface FacultyTableRouteProps {
  fetchFacultyData: () => void; // Prop to receive fetchFacultyData function
}

const FacultyTableRoute: React.FC<FacultyTableRouteProps> = ({
  fetchFacultyData,
}) => {
  // Receive fetchFacultyData as prop
  const {
    facultyData,
    isLoading,
    error,
    updateFacultyData,
    deleteFacultyData,
  } = useFacultyStore(); // Removed fetchFacultyData from here
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [editName, setEditName] = useState("");
  const [editClasses, setEditClasses] = useState("");

  const [editError, setEditError] = useState<string | null>(null); // Error state for Edit modal
  const [deleteError, setDeleteError] = useState<string | null>(null); // Error state for Delete popover
  const [facultyToDelete, setFacultyToDelete] = useState<Faculty | null>(null); // State to hold faculty to be deleted
  const {
    isOpen: isDeletePopoverOpen,
    onOpen: onDeletePopoverOpen,
    onClose: onDeletePopoverClose,
  } = useDisclosure(); // For Delete Popover

  useEffect(() => {
    fetchFacultyData(); // Fetch data on component mount - now using prop function
  }, [fetchFacultyData]);

  const handleEdit = (faculty: Faculty) => {
    setEditingFaculty(faculty);
    setEditName(faculty.name);
    setEditClasses(faculty.classes.join(", "));
    setEditError(null); // Clear any previous edit error when opening modal
    onOpen();
  };

  const handleSave = async () => {
    if (!editingFaculty) return;
    setEditError(null); // Clear any previous edit error before saving

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
      fetchFacultyData();
    } catch (updateError: any) {
      console.error("Error updating faculty data:", updateError);
      setEditError(updateError.message || "Failed to update faculty."); // Set edit error state
    }
  };

  const handleDelete = async (faculty: Faculty) => {
    if (
      !window.confirm(
        `Are you sure you want to delete faculty member: ${faculty.name}?`
      )
    ) {
      return;
    }

    try {
      await deleteFacultyData(faculty.$id);
      fetchFacultyData(); // Refresh data after delete - now using prop function
    } catch (deleteError: any) {
      console.error("Error deleting faculty data:", deleteError);
      alert(
        `Error deleting faculty: ${deleteError.message || "Unknown error"}`
      );
    }
  };

  if (isLoading) {
    return <div>Loading faculty data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="mt-8 flow-root">
      {" "}
      {/* Removed outer padding div */}
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <Table aria-label="Faculty Table">
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Name</TableColumn>
              <TableColumn># Classes</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody>
              {facultyData.map((faculty) => (
                <TableRow key={faculty.$id}>
                  <TableCell>{faculty.id}</TableCell>
                  <TableCell>{faculty.name}</TableCell>
                  <TableCell>{faculty.classes.length}</TableCell>
                  <TableCell>
                    <Tooltip
                      content="Edit"
                      showArrow
                      color="warning"
                      placement="top"
                      className="text-white"
                    >
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => handleEdit(faculty)}
                      >
                        <PencilIcon className="h-4 w-4 text-orange-500" />
                      </Button>
                    </Tooltip>
                    <Tooltip
                      content="Delete"
                      showArrow
                      color="danger"
                      placement="top"
                      className="text-white ml-1"
                    >
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => handleDelete(faculty)}
                      >
                        <TrashIcon className="h-4 w-4 text-red-500" />
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Edit Faculty Modal - Remains in FacultyTableRoute */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
        <ModalContent>
          {(onCloseModal) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Edit Faculty
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div>
                    Name
                    <Input
                      id="faculty-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    Classes (comma-separated)
                    <Input
                      id="faculty-classes"
                      type="text"
                      value={editClasses}
                      onChange={(e) => setEditClasses(e.target.value)}
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onCloseModal}>
                  Close
                </Button>
                <Button color="primary" onPress={handleSave}>
                  Save Changes
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
