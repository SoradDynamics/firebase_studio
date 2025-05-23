// ~/Section/List.tsx
import React, { useState, useEffect, useMemo } from "react";
import { TbReload } from "react-icons/tb";
import {
  Select,
  SelectItem,
} from "@heroui/react";
import { useStudentStore, Student } from "~/store/studentStore";
import { useFacultyStore } from "~/store/facultyStore";
import { useSectionStore } from "~/store/sectionStore";
import { Faculty, Section } from "types";

import ErrorMessage from "../common/ErrorMessage";
import SearchBar from "../../../common/SearchBar";
import ActionButton from "../../../../common/ActionButton";
import SectionTableRoute from "./stdSectionTable";

interface ListProps {
  isMobile: boolean;
  studentData: Student[];
  isLoading: boolean;
  onStudentSelect: (student: Student | null) => void; // Add onStudentSelect prop
}

const List: React.FC<ListProps> = ({
  isMobile,
  studentData,
  isLoading,
  onStudentSelect, // Destructure onStudentSelect prop
}) => {
  const { fetchStudentData } = useStudentStore();
  const { facultyData, fetchFacultyData } = useFacultyStore();
  const { sectionData, fetchSectionData } = useSectionStore();

  const [searchText, setSearchText] = useState<string>("");
  const handleSearchChange = (value: string) => {
    setSearchText(value);
  };

  const [errorMessage, setErrorMessage] = useState<string | null>("");
  const [tableClearSelection, setTableClearSelection] = useState<
    (() => void) | null
  >(null);

  const [searchField, setSearchField] = useState<
    "name" | "class" | "section" | "faculty"
  >("name");

  const searchOptions = useMemo(
    () => [
      { value: "name", label: "Name" },
      { value: "class", label: "Class" },
      { value: "section", label: "Section" },
      { value: "faculty", label: "Faculty" },
    ],
    []
  );
  const [selectedSearchOption, setSelectedSearchOption] = useState(
    searchOptions[0].value
  );

  useEffect(() => {
    Promise.all([fetchFacultyData(), fetchSectionData()]);
  }, [fetchFacultyData, fetchSectionData]);


  const handleRefresh = () => {
    fetchStudentData();
  };


  const filteredStudentData = useMemo(() => {
    let filteredData = studentData;

    if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      filteredData = filteredData.filter((student) => {
        const facultyName = facultyData.find(f => f.$id === student.facultyId)?.name || '';
        switch (selectedSearchOption) {
          case "name":
            return student.name.toLowerCase().includes(lowerSearchText);
          case "class":
            return student.class.toLowerCase().includes(lowerSearchText);
          case "section":
            return student.section.toLowerCase().includes(lowerSearchText);
          case "faculty":
            return facultyName.toLowerCase().includes(lowerSearchText);
          default:
            return student.name.toLowerCase().includes(lowerSearchText); //default name
        }
      });
    }

    return filteredData;
  }, [studentData, searchText, selectedSearchOption, facultyData]);


  return (
    <div className=" md:w-full w-full md:p-2 ">
      {errorMessage && <ErrorMessage message={errorMessage} />}
      <div className="top">
        <div className="flex justify-between items-center gap-4 mt-1 mx-3 md:px-0">

          <Select
            placeholder="Search By"
            className="max-w-[9rem]"
            variant="faded"
            size="md"
            selectedKeys={new Set([selectedSearchOption])}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              setSelectedSearchOption(key ? key.toString() : "");
            }}
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
      </div>
      <SectionTableRoute
        studentData={filteredStudentData}
        isLoading={isLoading}
        onClearSelection={(clearFn: () => void) =>
          setTableClearSelection(() => clearFn)
        }
        facultyData={facultyData}
        sectionData={sectionData}
        onStudentSelect={onStudentSelect} // Pass onStudentSelect to SectionTableRoute
      />
    </div>
  );
};

export default List;