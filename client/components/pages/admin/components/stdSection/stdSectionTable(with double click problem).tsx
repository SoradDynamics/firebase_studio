// ~/Section/sectionTable.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useStudentStore, Student } from "~/store/studentStore";
import { useFacultyStore } from "~/store/facultyStore";
import { useSectionStore } from "~/store/sectionStore";
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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";
import { PencilIcon } from "@heroicons/react/24/solid";
import Popover from "../common/Popover";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

interface SectionTableRouteProps {
  studentData: Student[];
  isLoading: boolean;
  onClearSelection?: (clearFn: () => void) => void;
  facultyData: Faculty[];
  sectionData: Section[];
  onStudentSelect: (student: Student | null) => void;
}

const SectionTableRoute: React.FC<SectionTableRouteProps> = ({
  studentData,
  isLoading,
  onClearSelection,
  facultyData,
  sectionData,
  onStudentSelect,
}) => {
  const { updateStudentData } = useStudentStore();
  const { fetchFacultyData } = useFacultyStore();
  const { fetchSectionData } = useSectionStore();
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editClass, setEditClass] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editFacultyId, setEditFacultyId] = useState("");

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set([]));

  const [editError, setEditError] = useState<string | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);

  const [filteredEditModalFacultyItems, setFilteredEditModalFacultyItems] =
    useState<{ key: string; label: string }[]>([]);
  const [filteredEditModalClassItems, setFilteredEditModalClassItems] =
    useState<{ key: string; label: string }[]>([]);
  const [filteredEditModalSectionItems, setFilteredEditModalSectionItems] = useState<{ key: string; label: string }[]>([]);

  const clickTimerRef = useRef<number | null>(null);
  const clickCountRef = useRef<number>(0);

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


  const handleEdit = async (student: Student) => {
    setEditingStudent(student);
    setEditClass(student.class);
    setEditSection(student.section);
    setEditFacultyId(student.facultyId);
    setEditError(null);
    onOpen();
  };

  const handleSave = async () => {
    if (!editingStudent) return;
    setEditError(null);

    if (!editClass.trim()) {
      setEditError("Class is required.");
      return;
    }
    if (!editSection.trim()) {
      setEditError("Section is required.");
      return;
    }
    if (!editFacultyId) {
      setEditError("Faculty is required to select class.");
      return;
    }

    const updatedStudentData = {
      ...editingStudent,
      class: editClass,
      section: editSection || "",
      facultyId: editFacultyId,
    };


    try {
      await updateStudentData(updatedStudentData);
      onClose();
      setSelectedKeys(new Set([]));
    } catch (updateError: any) {
      console.error("Error updating student data:", updateError);
      setEditError(updateError.message || "Failed to update student.");
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
      const selectedStudent = studentData.find((student) =>
        selectedKeySet.has(student.$id)
      );
      onStudentSelect(selectedStudent || null);
    } else {
      onStudentSelect(null);
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

  if (isLoading) {
    return (
      <div className=" h-52 flex items-center justify-center">
        <Spinner size="lg" label="Loading Data..." />
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, student: Student) => {
    e.preventDefault();

    clickCountRef.current += 1;

    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    clickTimerRef.current = window.setTimeout(() => {
      if (clickCountRef.current === 1) {
        // console.log('Single click detected for student:', student.name);
        handleSelectionChange(new Set([student.$id]));
      } else if (clickCountRef.current >= 2) {
        // console.log('Double click detected for student:', student.name);
        handleEdit(student);
      }
      clickCountRef.current = 0;
      clickTimerRef.current = null;
    }, 250); // Adjust delay as needed (250ms)
  };


  return (
    <div className="mt-4 flow-root md:px-0 lg:px-8">
      <div className=" -my-2 overflow-x-auto  lg:-mx-8">
        <div className="inline-block min-w-full pt-2 align-middle">
          <Table
            isHeaderSticky
            isCompact
            aria-label="Student Table"
            selectionMode="single"
            selectedKeys={selectedKeys}
            onSelectionChange={handleSelectionChange}
            color="secondary"
            className="min-w-full divide-y divide-gray-300"
          >
            <TableHeader>
              <TableColumn key="name">Name</TableColumn>
              <TableColumn key="faculty">Faculty</TableColumn>
              <TableColumn key="class">Class</TableColumn>
              <TableColumn key="section">Section</TableColumn>
              <TableColumn key="actions" align="center">
                Actions
              </TableColumn>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    <Spinner size="lg" label="Loading Data..." />
                  </TableCell>
                </TableRow>
              ) : studentData.length > 0 ? (
                studentData.map((student) => (
                  <TableRow
                    key={student.$id}
                    onClick={(e) => handleClick(e, student)}
                    // onDoubleClick={() => handleEdit(student)} // Removed onDoubleClick
                    >
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{facultyData.find(f => f.$id === student.facultyId)?.name || 'N/A'}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>{student.section || "N/A"}</TableCell>
                    <TableCell className="flex justify-center gap-2">
                      {/* Option to keep edit button */}
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
                        >
                          <PencilIcon className="h-4 w-4 text-orange-500" />
                        </Button>
                      </Tooltip>
                      {/* REMOVED DELETE BUTTON AND TOOLTIP */}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell>{""}</TableCell>
                  <TableCell>{""}</TableCell>
                  <TableCell>{""}</TableCell>
                  <TableCell>
                    <p className="text-gray-500  py-4 absolute translate-x-[35%]">
                      No students found.
                    </p>
                  </TableCell>
                  <TableCell>{""}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>


      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onCloseModal) => (
            <>
              <ModalBody className=" my-2">
                <div className="flex flex-col gap-3 px-4">
                  <h1 className=" text-xl font-semibold my-2">Edit Class & Section</h1>

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

                  <p className="font-semibold">Student Name: {editingStudent?.name}</p>


                  {/* Faculty and Class Autocomplete */}
                  <Autocomplete
                    label="Faculty"
                    color="secondary"
                    variant="underlined"
                    size="sm"
                    className="font-medium"
                    isRequired
                    selectedKey={editFacultyId}
                    onSelectionChange={(key) => {
                      setEditFacultyId(key as any);
                      setEditClass("");
                      setEditSection("");
                      setFilteredEditModalSectionItems([]);
                      setEditError(null);
                      setFilteredEditModalClassItems([]);
                    }}
                    errorMessage={
                      editError && !editFacultyId ? "Faculty is required" : ""
                    }
                    isInvalid={!!(editError && !editFacultyId)}
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
                      setFilteredEditModalFacultyItems(filtered || []);
                    }}
                  >
                    {(item) => (
                      <AutocompleteItem key={item.key}>
                        {item.label}
                      </AutocompleteItem>
                    )}
                  </Autocomplete>

                  <Autocomplete
                    label="Class"
                    color="secondary"
                    variant="underlined"
                    size="sm"
                    className="font-medium"
                    isRequired
                    selectedKey={editClass}
                    onSelectionChange={(key: any) => {
                      setEditClass(key);
                      setEditSection("");
                      setFilteredEditModalSectionItems([]);
                      setEditError(null);
                    }}
                    disabled={!editFacultyId}
                    errorMessage={
                      editError && !editClass ? "Class is required" : ""
                    }
                    isInvalid={!!(editError && !editClass)}
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
                      setFilteredEditModalClassItems(filteredClasses || []);
                    }}
                  >
                    {(item) => (
                      <AutocompleteItem key={item.key}>
                        {item.label}
                      </AutocompleteItem>
                    )}
                  </Autocomplete>

                  <Autocomplete
                    label="Section"
                    color="secondary"
                    variant="underlined"
                    size="sm"
                    className="font-medium"
                    isRequired
                    selectedKey={editSection}
                    onSelectionChange={(key: any) => {
                      setEditSection(key);
                      setEditError(null);
                    }}
                    disabled={!editClass || !editFacultyId}
                    errorMessage={
                      editError && !editSection ? "Section is required" : ""
                    }
                    isInvalid={!!(editError && !editSection)}
                    items={filteredEditModalSectionItems}
                    onInputChange={(value) => {
                      const allSectionsForSelectedClass = (editFacultyId && editClass)
                        ? sectionData.filter(section => section.facultyId === editFacultyId && section.class === editClass)
                          .map(section => section.name)
                        : [];

                      const filteredSections = allSectionsForSelectedClass
                        .filter((sec) =>
                          sec.toLowerCase().includes(value.toLowerCase())
                        )
                        .map((sec) => ({ key: sec, label: sec }));
                      setFilteredEditModalSectionItems(filteredSections || []);
                    }}
                  >
                    {(item) => (
                      <AutocompleteItem key={item.key}>
                        {item.label}
                      </AutocompleteItem>
                    )}
                  </Autocomplete>


                </div>
              </ModalBody>
              <ModalFooter className=" px-10 mb-1">
                <Button color="danger" variant="light" onPress={onCloseModal}>
                  Close
                </Button>
                <Button
                  color="success"
                  onPress={handleSave}
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

export default SectionTableRoute;