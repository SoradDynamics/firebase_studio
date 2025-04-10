// src/Section/sectionTable.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useSectionStore } from "~/store/sectionStore";
import { useFacultyStore } from "~/store/facultyStore";
import { Faculty, Section } from "types";
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
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";
import { TrashIcon, PencilIcon } from "@heroicons/react/24/solid";
import Popover from "../common/Popover";
import { Drawer } from "components/common/Drawer"; // Import the Drawer component
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import PerfectScrollbar from "react-perfect-scrollbar";

interface SectionTableRouteProps {
  sectionData: Section[];
  isLoading: boolean;
  onSectionSelect: (section: Section | null) => void;
  onClearSelection?: (clearFn: () => void) => void;
  facultyData: Faculty[];
  isFacultyLoading: boolean;
}

const SectionTableRoute: React.FC<SectionTableRouteProps> = ({
  sectionData,
  isLoading,
  onSectionSelect,
  onClearSelection,
  facultyData,
  isFacultyLoading,
}) => {
  const { updateSectionData, deleteSectionData, fetchSectionData } =
    useSectionStore();
  const { fetchFacultyData } = useFacultyStore();
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure(); // Disclosure for Drawer
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubjects, setEditSubjects] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editFacultyId, setEditFacultyId] = useState<string>("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set([]));

  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);

  // State for Autocomplete Filtering in Edit Modal
  const [filteredEditModalFacultyItems, setFilteredEditModalFacultyItems] =
    useState<{ key: string; label: string }[]>([]);
  const [filteredEditModalClassItems, setFilteredEditModalClassItems] =
    useState<{ key: string; label: string }[]>([]);

  useEffect(() => {
    if (isFacultyLoading) return;
    if (editingSection && facultyData.length > 0) {
      const facultyForClass = facultyData.find((f) =>
        f.classes.includes(editingSection.class)
      );
      setEditFacultyId(facultyForClass?.$id || "");
    }
    setFilteredEditModalFacultyItems(
      facultyData.map((faculty) => ({ key: faculty.$id, label: faculty.name }))
    );
  }, [editingSection, facultyData, isFacultyLoading]);

  useEffect(() => {
    setFilteredEditModalClassItems(
      editFacultyId
        ? (facultyData.find((f) => f.$id === editFacultyId)?.classes ?? []).map(
            (cls) => ({ key: cls, label: cls })
          )
        : []
    );
  }, [editFacultyId, facultyData]);

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    setEditName(section.name);
    setEditSubjects(section.subjects.join(", "));
    setEditClass(section.class);
    setEditFacultyId(section.facultyId || "");
    setEditError(null);
    onOpen(); // Open the drawer
  };

  const handleSave = async () => {
    if (!editingSection) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError("Section Name is required.");
      return;
    }

    if (!editSubjects.trim()) {
      setEditError("Subjects are required.");
      return;
    }
    if (!editClass.trim()) {
      setEditError("Class is required.");
      return;
    }
    if (!editFacultyId) {
      setEditError("Faculty is required to select class.");
      return;
    }

    const updatedSectionData = {
      ...editingSection,
      name: editName,
      subjects: editSubjects
        .split(",")
        .map((sub) => sub.trim())
        .filter((sub) => sub !== ""),
      class: editClass,
      facultyId: editFacultyId,
    };

    try {
      await updateSectionData(updatedSectionData);
      onClose(); // Close the drawer
      setSelectedKeys(new Set([]));
      onSectionSelect(null);
    } catch (updateError: any) {
      console.error("Error updating section data:", updateError);
      setEditError(updateError.message || "Failed to update section.");
    }
  };

  const handleDelete = (section: Section) => {
    setSectionToDelete(section);
    setIsDeletePopoverOpen(true);
  };

  const handleCancelDelete = () => {
    setIsDeletePopoverOpen(false);
    setSectionToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!sectionToDelete) return;
    try {
      await deleteSectionData(sectionToDelete.$id);
      setIsDeletePopoverOpen(false);
      setSectionToDelete(null);
      setSelectedKeys(new Set([]));
      onSectionSelect(null);
    } catch (deleteError: any) {
      console.error("Error deleting section data:", deleteError);
      alert(
        `Error deleting section: ${deleteError.message || "Unknown error"}`
      );
      setIsDeletePopoverOpen(false);
      setSectionToDelete(null);
    }
  };

  const handleSelectionChange = (keys: Selection) => {
    let selectedKeySet: Set<string> = new Set();
    if (keys) {
      if (typeof keys === "string") {
        selectedKeySet.add(keys);
      } else if (keys instanceof Set) {
        selectedKeySet = keys as Set<string>;
      }
    }
    setSelectedKeys(selectedKeySet);

    if (selectedKeySet.size > 0) {
      const selectedSection = sectionData.find((section) =>
        selectedKeySet.has(section.$id)
      );
      onSectionSelect(selectedSection || null);
    } else {
      onSectionSelect(null);
      setSelectedKeys(new Set([]));
    }
  };

  const clearSelectedRow = useCallback(() => {
    setSelectedKeys(new Set([]));
  }, []);

  useEffect(() => {
    if (onClearSelection) {
      onClearSelection(clearSelectedRow);
    }
  }, [onClearSelection, clearSelectedRow]);

  if (isLoading || isFacultyLoading) {
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
            aria-label="Section Table"
            selectionMode="single"
            selectedKeys={selectedKeys}
            onSelectionChange={handleSelectionChange}
            color="secondary"
            className="min-w-full divide-y divide-gray-300"
          >
            <TableHeader>
              <TableColumn key="name">Name</TableColumn>
              <TableColumn key="class">Class</TableColumn>
              <TableColumn key="subjects">Subjects</TableColumn>
              <TableColumn key="actions" align="center">
                Actions
              </TableColumn>
            </TableHeader>
            <TableBody>
              {sectionData.length > 0 ? (
                sectionData.map((section) => (
                  <TableRow key={section.$id}>
                    <TableCell>{section.name}</TableCell>
                    <TableCell>{section.class}</TableCell>
                    <TableCell>{section.subjects.length}</TableCell>
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
                          onPress={() => handleEdit(section)}
                          aria-label="Edit Section"
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
                          onPress={() => handleDelete(section)}
                          aria-label="Delete Section"
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="text-center">
                    <></>
                  </TableCell>
                  <TableCell className=" text-gray-500 p-5 text-center text-medium">
                    {" "}
                    No Data Found
                  </TableCell>
                  <TableCell className="text-center">
                    <></>
                  </TableCell>
                  <TableCell className="text-center">
                    <></>
                  </TableCell>
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
          sectionToDelete
            ? `Are you sure you want to delete section: ${sectionToDelete.name}?`
            : ""
        }
      />

      {/* Edit Section Drawer */}
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        position="right"
        size="md"
        nonDismissable={true}
      >
        <Drawer.Header showCloseButton={true}>
          Edit Section
        </Drawer.Header>
        <Drawer.Body>
          <div className="flex flex-col gap-3 px-4">

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

            {/* Faculty Select Autocomplete in Edit Modal */}
            <Autocomplete
              label="Faculty"
              color="secondary"
              variant="underlined"
              size="sm"
              className="font-medium"
              isRequired
              selectedKey={editFacultyId}
              onSelectionChange={(key) => {
                setEditFacultyId(key ? key.toString() : "");
                setEditClass("");
                setEditError(null);
                setFilteredEditModalClassItems([]); // Clear class items when faculty changes
              }}
              items={filteredEditModalFacultyItems}
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
                setFilteredEditModalFacultyItems(filtered);
              }}
            >
              {(item) => (
                <AutocompleteItem key={item.key}>
                  {item.label}
                </AutocompleteItem>
              )}
            </Autocomplete>

            {/* Class Select Autocomplete in Edit Modal */}
            <Autocomplete
              label="Class"
              color="secondary"
              variant="underlined"
              size="sm"
              className="font-medium"
              isRequired
              selectedKey={editClass}
              onSelectionChange={(key) => {
                setEditClass(key ? key.toString() : "");
                setEditError(null);
              }}
              disabled={!editFacultyId}
              items={filteredEditModalClassItems}
              onInputChange={(value) => {
                const allClassesForSelectedFaculty = editFacultyId
                  ? facultyData.find((f) => f.$id === editFacultyId)
                      ?.classes ?? []
                  : [];
                const filteredClasses = allClassesForSelectedFaculty
                  .filter((cls) =>
                    cls.toLowerCase().includes(value.toLowerCase())
                  )
                  .map((cls) => ({ key: cls, label: cls }));
                setFilteredEditModalClassItems(filteredClasses);
              }}
            >
              {(item) => (
                <AutocompleteItem key={item.key}>
                  {item.label}
                </AutocompleteItem>
              )}
            </Autocomplete>

            <Input
              id="section-name"
              type="text"
              color="secondary"
              label="Name"
              variant="underlined"
              value={editName}
              className="font-medium"
              isRequired
              onChange={(e) => {
                setEditName(e.target.value);
                setEditError(null);
              }}
              errorMessage={
                editError && !editName ? "Section Name is required" : ""
              }
              isInvalid={!!(editError && !editName)}
            />

            <Input
              id="section-subjects"
              type="text"
              color="secondary"
              label="Subjects (comma-separated)"
              variant="underlined"
              value={editSubjects}
              className="font-medium"
              isRequired
              onChange={(e) => {
                setEditSubjects(e.target.value);
                setEditError(null);
              }}
              errorMessage={
                editError && !editSubjects ? "Subjects are required" : ""
              }
              isInvalid={!!(editError && !editSubjects)}
            />
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button color="danger" variant="light" onPress={onClose}>
            Close
          </Button>
          <Button
            color="success"
            onPress={handleSave}
            className="text-white font-medium"
          >
            Save
          </Button>
        </Drawer.Footer>
      </Drawer>
    </div>
  );
};

export default SectionTableRoute;