// src/Academic/Teacher/List.tsx
import React, { useState } from "react";
import { FaPlus } from "react-icons/fa6";
import { TbReload } from "react-icons/tb";
import { useDisclosure, Button, Input } from "@heroui/react";
import { Drawer } from "components/common/Drawer";
import { useTeacherStore, TeacherFormData } from "~/store/teacherStore";
import { Teacher } from 'types/teacher';

import ErrorMessage from "../common/ErrorMessage";
import SearchBar from "../../../common/SearchBar";
import ActionButton from "../../../../common/ActionButton";
import TeacherTable from "./TeacherTable";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

interface ListProps {
  isMobile: boolean;
  onTeacherSelect: (teacher: Teacher | null) => void;
  teacherData: Teacher[];
  isLoading: boolean;
}

const List: React.FC<ListProps> = ({ isMobile, onTeacherSelect, teacherData, isLoading }) => {
  const { addTeacherData, fetchTeachersData, error: storeError, isLoading: isMutating } = useTeacherStore();

  const [searchText, setSearchText] = useState<string>("");
  const handleSearchChange = (value: string) => setSearchText(value);

  const { isOpen: isAddDrawerOpen, onOpen: onAddDrawerOpen, onClose: onAddDrawerClose } = useDisclosure();

  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherSubjects, setNewTeacherSubjects] = useState("");
  const [newTeacherLevels, setNewTeacherLevels] = useState("");
  const [newTeacherQualification, setNewTeacherQualification] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [tableClearSelection, setTableClearSelection] = useState<(() => void) | null>(null);

  const handleAdd = () => {
    setNewTeacherName("");
    setNewTeacherSubjects("");
    setNewTeacherLevels("");
    setNewTeacherQualification("");
    setNewTeacherEmail("");
    setAddError(null);
    onAddDrawerOpen();
  };

  const handleRefresh = () => fetchTeachersData();

  const parseStringToArray = (str: string): string[] => {
    return str.split(',').map(item => item.trim()).filter(item => item !== '');
  };

  const handleAddSaveNewTeacher = async () => {
    setAddError(null);
    if (!newTeacherName.trim()) { setAddError("Teacher Name is required."); return; }
    if (!newTeacherEmail.trim() || !newTeacherEmail.includes('@')) { setAddError("A valid Email is required."); return; }
    if (!newTeacherSubjects.trim()) { setAddError("Subject(s) are required."); return; }
    if (!newTeacherLevels.trim()) { setAddError("Level(s) are required."); return; }
    if (!newTeacherQualification.trim()) { setAddError("Qualification is required."); return; }

    const newTeacherPayload: TeacherFormData = {
      name: newTeacherName.trim(),
      subject: parseStringToArray(newTeacherSubjects),
      level: parseStringToArray(newTeacherLevels),
      qualification: newTeacherQualification.trim(),
      email: newTeacherEmail.trim(),
    };

    try {
      const result = await addTeacherData(newTeacherPayload);
      if (result) {
        onAddDrawerClose();
      } else {
        setAddError(storeError || "Failed to add teacher. Check console for details.");
      }
    } catch (error: any) {
      setAddError(error.message || "An unexpected error occurred.");
    }
  };

  const dataForTable = searchText
    ? teacherData.filter((teacher) =>
        teacher.name.toLowerCase().includes(searchText.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchText.toLowerCase()) ||
        teacher.qualification.toLowerCase().includes(searchText.toLowerCase()) ||
        (teacher.subject && teacher.subject.join(', ').toLowerCase().includes(searchText.toLowerCase())) ||
        (teacher.level && teacher.level.join(', ').toLowerCase().includes(searchText.toLowerCase()))
      )
    : teacherData;

  const errorMessage = storeError || addError;

  return (
    <div className=" md:w-full w-full md:p-2 ">
      {errorMessage && !isAddDrawerOpen && <ErrorMessage message={errorMessage} />}

      <div className="flex justify-between items-center gap-4 mt-1 mx-3 md:px-0">
        <ActionButton
          icon={<FaPlus className="w-4 h-4 text-gray-100" />}
          onClick={handleAdd}
          color="orange"
          aria-label="Add Teacher"
        />
        <SearchBar
          placeholder="Search teachers..."
          value={searchText}
          onValueChange={handleSearchChange}
        />
        <ActionButton
          icon={<TbReload className="w-5 h-5 text-gray-100" />}
          onClick={handleRefresh}
          aria-label="Refresh Teacher List"
          // isLoading={isLoading && !isMutating}
        />
      </div>

      <TeacherTable
        teacherData={dataForTable}
        isLoading={isLoading && !isMutating}
        onTeacherSelect={onTeacherSelect}
        onClearSelection={(clearFn) => setTableClearSelection(() => clearFn)}
      />

      <Drawer isOpen={isAddDrawerOpen} onClose={onAddDrawerClose} position="right" nonDismissable={true} size="md">
        <Drawer.Header showCloseButton={true}>Add New Teacher</Drawer.Header>
        <Drawer.Body>
          <div className="flex flex-col gap-4">
            {addError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error! </strong>
                <span className="block sm:inline">{addError}</span>
                 <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setAddError(null)}>
                   <ExclamationTriangleIcon className="h-5 w-5 text-red-500 cursor-pointer" aria-hidden="true" />
                 </span>
              </div>
            )}
            <Input id="add-teacher-name" type="text" label="Teacher Name" variant="underlined" value={newTeacherName} isRequired color="secondary" onChange={(e) => { setNewTeacherName(e.target.value); setAddError(null); }}/>
            <Input id="add-teacher-email" type="email" label="Email" variant="underlined" value={newTeacherEmail} isRequired color="secondary" onChange={(e) => { setNewTeacherEmail(e.target.value); setAddError(null); }}/>
            <Input id="add-teacher-subjects" type="text" label="Subject(s) (comma-separated)" variant="underlined" value={newTeacherSubjects} isRequired color="secondary" onChange={(e) => { setNewTeacherSubjects(e.target.value); setAddError(null); }}/>
            <Input id="add-teacher-levels" type="text" label="Level(s) (comma-separated)" variant="underlined" value={newTeacherLevels} isRequired color="secondary" onChange={(e) => { setNewTeacherLevels(e.target.value); setAddError(null); }}/>
            <Input id="add-teacher-qualification" type="text" label="Qualification" variant="underlined" value={newTeacherQualification} isRequired color="secondary" onChange={(e) => { setNewTeacherQualification(e.target.value); setAddError(null); }}/>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button color="danger" variant="light" onPress={onAddDrawerClose} disabled={isMutating}>Cancel</Button>
          <Button color="success" onPress={handleAddSaveNewTeacher} className="text-white font-medium" isLoading={isMutating} disabled={isMutating}>
            Save Teacher
          </Button>
        </Drawer.Footer>
      </Drawer>
    </div>
  );
};

export default List;