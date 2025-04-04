// ~/Attendance/List.tsx
import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
  } from "react";
  import { TbReload } from "react-icons/tb";
  import {
    Progress,
      Select,
      SelectItem
  } from "@heroui/react";
  
  import ErrorMessage from "../common/ErrorMessage";
  import SearchBar from "../common/SearchBar";
  import ActionButton from "../common/ActionButton";
  import AttendanceTable from "./AttendanceTable";
  import toast, { Toaster } from "react-hot-toast";
  import { useStudentStore } from "~/store/studentStore";
  import { useFacultyStore } from "~/store/facultyStore";
  import { useSectionStore } from "~/store/sectionStore";
  import { useParentStore } from "~/store/parentStore";
  import lodash from 'lodash';
  const { debounce } = lodash;
  
  const searchOptions = [
      { value: "name", label: "Name" },
      { value: "class", label: "Class" },
      { value: "section", label: "Section" },
  ];
  
  interface ListProps {
      isMobile: boolean;
      onStudentsSelect: (studentIds: string[]) => void;
      selectedStudents: string[];
  }
  
  const List: React.FC<ListProps> = ({
      isMobile,
      onStudentsSelect,
      selectedStudents,
  }) => {
      const [searchText, setSearchText] = useState<string>("");
      const [errorMessage, setErrorMessage] = useState<string | null>(null);
      const [selectedSearchOption, setSelectedSearchOption] = useState(searchOptions[0].value);
      const { studentData, fetchStudentData, isLoading } = useStudentStore();
      const { facultyData, fetchFacultyData } = useFacultyStore();
      const { fetchSectionData } = useSectionStore(); // Fetch sections if needed by table/other components
      const { fetchParentData } = useParentStore();
      const handleSearchChange = (value: string) => {
          setSearchText(value);
      };
  
      const handleRefresh = () => {
          setErrorMessage(null);
          // Clear selected students before refreshing the data
          onStudentsSelect([]); // Reset selected students
  
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
                      setErrorMessage("Failed to load initial data.")
                      return 'Failed to refresh data.'; // Message for toast
                  },
              }
          );
      };
      useEffect(() => {
          Promise.all([fetchFacultyData(), fetchSectionData(), fetchParentData(), fetchStudentData()])
              // .then(() => console.log("Initial data fetched."))
              .catch(err => {
                  console.error("Error during initial data fetch:", err);
                  setErrorMessage("Failed to load initial data. Please refresh.");
              });
      }, [fetchFacultyData, fetchSectionData, fetchParentData, fetchStudentData]); // Dependencies for initial fetch
      // Memoized Filtered Student Data for Table
      const filteredStudentData = useMemo(() => {
  
          // Use studentData from Zustand store as the source
          const fullStudentData = studentData || []; // Use store data, fallback to empty array
  
          if (searchText) {
              // --- SEARCH IS ACTIVE: Filter the entire dataset ---
              const lowerSearchText = searchText.toLowerCase();
              // Keep the original filtering logic using the full dataset
              return fullStudentData.filter((student) => {
                  switch (selectedSearchOption) {
                      case "name": return (student.name || '').toLowerCase().includes(lowerSearchText);
                      case "class": return (student.class || '').toLowerCase().includes(lowerSearchText);
                      case "section": return (student.section || '').toLowerCase().includes(lowerSearchText);
                      default: return false; // Return false for no match to avoid showing all data
                  }
              });
          } else {
              // If no search text, don't show any data
              return [];
          }
          // Dependencies for recalculation
      }, [studentData, searchText, selectedSearchOption]);
  
  
      return (
          <div className="md:w-full w-full md:p-2">
              <Toaster position="top-right" />
              {errorMessage && <ErrorMessage message={errorMessage} />}
  
              <div className="top overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
                  <div className="min-w-[370px] mt-1 mx-3 md:px-0 mb-1">
                      {/* Desktop layout (single line) */}
                      <div className="hidden sm:flex items-center justify-between gap-2">
                          {/* Spacer to balance the layout */}
  
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
                              {/* Spacer to balance the layout */}
  
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
  
              {isLoading && (
                  <Progress
                      size="sm"
                      isIndeterminate
                      aria-label="Loading students..."
                      className="w-full my-2"
                  />
              )}
  
              <AttendanceTable
                  studentData={filteredStudentData}
                  isLoading={isLoading}
                  onStudentsSelect={onStudentsSelect}
                  selectedStudents={selectedStudents}
              />
          </div>
      );
  };
  
  export default List;  