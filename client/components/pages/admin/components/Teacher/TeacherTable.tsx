// src/Academic/Teacher/teacherTable.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useTeacherStore } from "~/store/teacherStore";
import { Teacher } from 'types/teacher';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Spinner, Selection, Tooltip, Button, useDisclosure, Input } from "@heroui/react";
import { Drawer } from "components/common/Drawer";
import { TrashIcon, PencilIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import Popover from "../common/Popover"; // Adjust path as needed

interface TeacherTableProps {
  teacherData: Teacher[];
  isLoading: boolean;
  onTeacherSelect: (teacher: Teacher | null) => void;
  onClearSelection?: (clearFn: () => void) => void;
}

const TeacherTable: React.FC<TeacherTableProps> = ({
  teacherData,
  isLoading,
  onTeacherSelect,
  onClearSelection,
}) => {
  const { updateTeacherData, deleteTeacherData, isLoading: isMutating, error: storeError } = useTeacherStore();
  const { isOpen: isEditDrawerOpen, onOpen: onEditDrawerOpen, onClose: onEditDrawerClose } = useDisclosure();

  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editTeacherName, setEditTeacherName] = useState("");
  const [editTeacherSubjects, setEditTeacherSubjects] = useState("");
  const [editTeacherLevels, setEditTeacherLevels] = useState("");
  const [editTeacherQualification, setEditTeacherQualification] = useState("");
  const [editTeacherBaseSalary, setEditTeacherBaseSalary] = useState("");
  const [editTeacherEmail, setEditTeacherEmail] = useState(""); // Will be disabled

  // For editing other arrays (if you add inputs for them)
  const [editTeacherSalary, setEditTeacherSalary] = useState("");
  const [editTeacherAssignemnts, setEditTeacherAssignemnts] = useState(""); // Note: typo
  const [editTeacherNotes, setEditTeacherNotes] = useState("");


  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set([]));
  const [editError, setEditError] = useState<string | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);

  const parseStringToArray = (str: string): string[] => {
    return str.split(',').map(item => item.trim()).filter(item => item !== '');
  };
  const arrayToString = (arr: string[] | undefined | null): string => arr ? arr.join(', ') : '';


  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setEditTeacherName(teacher.name);
    setEditTeacherSubjects(arrayToString(teacher.subject));
    setEditTeacherLevels(arrayToString(teacher.level));
    setEditTeacherQualification(teacher.qualification);
    setEditTeacherBaseSalary(teacher.base_salary);
    setEditTeacherEmail(teacher.email);

    setEditTeacherSalary(arrayToString(teacher.salary));
    setEditTeacherAssignemnts(arrayToString(teacher.assignemnts)); // Note: typo
    setEditTeacherNotes(arrayToString(teacher.notes));

    setEditError(null);
    onEditDrawerOpen();
  };

  const handleSaveEdit = async () => {
    if (!editingTeacher) return;
    setEditError(null);

    if (!editTeacherName.trim()) { setEditError("Teacher Name is required."); return; }
    if (!editTeacherSubjects.trim()) { setEditError("Subject(s) are required."); return; }
    if (!editTeacherLevels.trim()) { setEditError("Level(s) are required."); return; }
    if (!editTeacherQualification.trim()) { setEditError("Qualification is required."); return; }
    if (!editTeacherBaseSalary.trim() || isNaN(parseFloat(editTeacherBaseSalary))) {
        setEditError("A valid Base Salary (number) is required.");
        return;
    }

    const updatedTeacherPayload: Teacher = {
      ...editingTeacher, // Includes $id, id, authUserId
      name: editTeacherName.trim(),
      subject: parseStringToArray(editTeacherSubjects),
      level: parseStringToArray(editTeacherLevels),
      qualification: editTeacherQualification.trim(),
      base_salary: editTeacherBaseSalary.trim(),
      email: editTeacherEmail.trim(), // Assuming email might be updatable in DB, but not auth
      salary: parseStringToArray(editTeacherSalary),
      assignemnts: parseStringToArray(editTeacherAssignemnts), // Note: typo
      notes: parseStringToArray(editTeacherNotes),
    };

    try {
      await updateTeacherData(updatedTeacherPayload);
      onEditDrawerClose();
      setSelectedKeys(new Set([]));
      onTeacherSelect(null);
    } catch (updateError: any) {
      setEditError(updateError.message || "Failed to update teacher.");
    }
  };

  const handleDelete = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setIsDeletePopoverOpen(true);
  };

  const handleCancelDelete = () => {
    setIsDeletePopoverOpen(false);
    setTeacherToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!teacherToDelete) return;
    try {
      await deleteTeacherData(teacherToDelete.$id);
      setIsDeletePopoverOpen(false);
      setTeacherToDelete(null);
      setSelectedKeys(new Set([]));
      onTeacherSelect(null);
    } catch (deleteError: any) {
      alert(`Error deleting teacher: ${deleteError.message || "Unknown error"}`);
      setIsDeletePopoverOpen(false);
      setTeacherToDelete(null);
    }
  };

  const handleSelectionChange = (keys: Selection) => {
    let selectedKeySet: Set<string> = new Set();
    if (keys === 'all') { /* Handle 'all' if needed */ }
    else if (keys instanceof Set) { selectedKeySet = keys as Set<string>; }
    setSelectedKeys(selectedKeySet);

    if (selectedKeySet.size > 0) {
      const selectedKey = Array.from(selectedKeySet)[0];
      const selectedTeacher = teacherData.find((t) => t.$id === selectedKey);
      onTeacherSelect(selectedTeacher || null);
    } else {
      onTeacherSelect(null);
    }
  };

  const clearSelectedRow = useCallback(() => {
    setSelectedKeys(new Set([]));
  }, []);

  useEffect(() => {
    if (onClearSelection) onClearSelection(clearSelectedRow);
  }, [onClearSelection, clearSelectedRow]);

  if (isLoading && teacherData.length === 0) {
    return <div className="h-52 flex items-center justify-center"><Spinner size="lg" label="Loading Teachers..." /></div>;
  }

  return (
    <div className="mt-4 flow-root md:px-0 lg:px-8">
      <div className="-my-2 overflow-x-auto lg:-mx-8">
        <div className="inline-block min-w-full pt-2 align-middle">
          <Table isHeaderSticky isCompact aria-label="Teachers Table" selectionMode="single" selectedKeys={selectedKeys} onSelectionChange={handleSelectionChange} color="secondary" className="min-w-full divide-y divide-gray-300">
            <TableHeader>
              <TableColumn key="name">Name</TableColumn>
              <TableColumn key="email">Email</TableColumn>
              <TableColumn key="subject">Subject(s)</TableColumn>
              <TableColumn key="qualification">Qualification</TableColumn>
              {/* <TableColumn key="base_salary">Base Salary</TableColumn> */}
              <TableColumn key="actions" align="center">Actions</TableColumn>
            </TableHeader>
            <TableBody items={teacherData} isLoading={isLoading && !isMutating} loadingContent={<Spinner label="Loading..." />} emptyContent={teacherData.length === 0 && !isLoading ? <div className="text-gray-500 p-5 text-center text-medium">No Teachers Found</div> : null}>
              {(teacher) => (
                <TableRow key={teacher.$id}>
                  <TableCell>{teacher.name}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{arrayToString(teacher.subject)}</TableCell>
                  <TableCell>{teacher.qualification}</TableCell>
                  <TableCell>{teacher.base_salary}</TableCell>
                  <TableCell className="flex justify-center gap-2">
                    <Tooltip content="Edit" showArrow color="warning" placement="top"><Button isIconOnly size="sm" variant="light" color="warning" onPress={() => handleEdit(teacher)} aria-label="Edit Teacher"><PencilIcon className="h-4 w-4 text-orange-500" /></Button></Tooltip>
                    <Tooltip content="Delete" showArrow color="danger" placement="top"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(teacher)} aria-label="Delete Teacher"><TrashIcon className="h-4 w-4 text-red-500" /></Button></Tooltip>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Popover isOpen={isDeletePopoverOpen} onClose={handleCancelDelete} onConfirm={handleConfirmDelete} title="Confirm Delete" content={teacherToDelete ? `Delete teacher: ${teacherToDelete.name}?` : ""}/>

      <Drawer isOpen={isEditDrawerOpen} onClose={onEditDrawerClose} position="right" size="md" nonDismissable={true}>
        <Drawer.Header showCloseButton={true}>Edit Teacher</Drawer.Header>
        <Drawer.Body>
          <div className="flex flex-col gap-4">
            {editError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error! </strong><span className="block sm:inline">{editError}</span>
                <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setEditError(null)}><ExclamationTriangleIcon className="h-5 w-5 text-red-500 cursor-pointer" /></span>
              </div>
            )}
            <Input id="edit-teacher-name" type="text" label="Teacher Name" variant="underlined" value={editTeacherName} isRequired color="secondary" onChange={(e) => { setEditTeacherName(e.target.value); setEditError(null); }}/>
            <Input id="edit-teacher-email" type="email" label="Email (Display Only)" variant="underlined" value={editTeacherEmail} isDisabled color="secondary" />
            <Input id="edit-teacher-subjects" type="text" label="Subject(s) (comma-separated)" variant="underlined" value={editTeacherSubjects} isRequired color="secondary" onChange={(e) => { setEditTeacherSubjects(e.target.value); setEditError(null); }}/>
            <Input id="edit-teacher-levels" type="text" label="Level(s) (comma-separated)" variant="underlined" value={editTeacherLevels} isRequired color="secondary" onChange={(e) => { setEditTeacherLevels(e.target.value); setEditError(null); }}/>
            <Input id="edit-teacher-qualification" type="text" label="Qualification" variant="underlined" value={editTeacherQualification} isRequired color="secondary" onChange={(e) => { setEditTeacherQualification(e.target.value); setEditError(null); }}/>
            <Input id="edit-teacher-base-salary" type="number" label="Base Salary" variant="underlined" value={editTeacherBaseSalary} isRequired color="secondary" onChange={(e) => { setEditTeacherBaseSalary(e.target.value); setEditError(null); }}/>
            {/* Optional inputs for other array fields */}
            <Input id="edit-teacher-salary-components" type="text" label="Salary Components (comma-separated)" variant="underlined" value={editTeacherSalary} color="secondary" onChange={(e) => { setEditTeacherSalary(e.target.value); setEditError(null); }}/>
            <Input id="edit-teacher-assignemnts" type="text" label="Assignments (comma-separated)" variant="underlined" value={editTeacherAssignemnts} color="secondary" onChange={(e) => { setEditTeacherAssignemnts(e.target.value); setEditError(null); }}/>
            <Input id="edit-teacher-notes" type="text" label="Notes (comma-separated)" variant="underlined" value={editTeacherNotes} color="secondary" onChange={(e) => { setEditTeacherNotes(e.target.value); setEditError(null); }}/>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button color="danger" variant="light" onPress={onEditDrawerClose} disabled={isMutating}>Cancel</Button>
          <Button color="success" onPress={handleSaveEdit} className="text-white font-medium" isLoading={isMutating} disabled={isMutating}>Save Changes</Button>
        </Drawer.Footer>
      </Drawer>
    </div>
  );
};

export default TeacherTable;