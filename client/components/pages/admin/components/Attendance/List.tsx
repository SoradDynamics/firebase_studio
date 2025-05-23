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
    Autocomplete,
    AutocompleteItem,
  } from "@heroui/react";
  
  import ErrorMessage from "../common/ErrorMessage";
  import SearchBar from "../../../common/SearchBar";
  import ActionButton from "../../../../common/ActionButton";
  import AttendanceTable from "./AttendanceTable";
  import toast, { Toaster } from "react-hot-toast";
  import { useStudentStore } from "~/store/studentStore";
  import { useFacultyStore } from "~/store/facultyStore";
  import { useSectionStore } from "~/store/sectionStore"; // Import section store
  import { useParentStore } from "~/store/parentStore";
  import { Section } from "types"; // Assuming Section type is available globally or adjust path
  
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
  
    const { studentData, fetchStudentData, isLoading: isStudentLoading } = useStudentStore();
    const { facultyData, fetchFacultyData, isFacultyLoading } = useFacultyStore();
    const { sectionData, fetchSectionData, isLoading: isSectionLoading } = useSectionStore(); // Use section store
    const { fetchParentData } = useParentStore();
  
    // --- State for Filters ---
    const [facultyFilter, setFacultyFilter] = useState<string>(""); // Selected Faculty ID
    const [classFilter, setClassFilter] = useState<string>("");   // Selected Class Name
    const [sectionFilter, setSectionFilter] = useState<string>(""); // Selected Section Name
    const [filteredFacultyItems, setFilteredFacultyItems] = useState<{ key: string; label: string }[]>([]);
    const [filteredClassItems, setFilteredClassItems] = useState<{ key: string; label: string }[]>([]);
    const [filteredSectionItems, setFilteredSectionItems] = useState<{ key: string; label: string }[]>([]); // State for section options
    // --- End State for Filters ---
  
    // Combined loading state
    const isLoading = isStudentLoading || isFacultyLoading || isSectionLoading;
  
    const handleSearchChange = (value: string) => {
      setSearchText(value);
      // Clear selections if search text is entered while filters might be active
      if (value) {
          // Optional: Decide if you want to clear selections when typing in search
          // onStudentsSelect([]);
      }
    };
  
    const handleRefresh = () => {
      setErrorMessage(null);
      setSearchText("");
      setFacultyFilter("");
      setClassFilter("");
      setSectionFilter(""); // Reset section filter
      onStudentsSelect([]);
  
      const refreshPromise = Promise.all([
        fetchStudentData(),
        fetchParentData(),
        fetchFacultyData(),
        fetchSectionData(), // Fetch sections on refresh
      ]);
      toast.promise(
        refreshPromise,
        {
          loading: 'Refreshing data...',
          success: 'Data refreshed!',
          error: (err) => {
            console.error("Refresh Error:", err)
            setErrorMessage("Failed to load initial data.")
            return 'Failed to refresh data.';
          },
        }
      );
    };
  
    // Initial data fetch
    useEffect(() => {
      Promise.all([fetchFacultyData(), fetchSectionData(), fetchParentData(), fetchStudentData()])
        .catch(err => {
          console.error("Error during initial data fetch:", err);
          setErrorMessage("Failed to load initial data. Please refresh.");
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Keep dependencies minimal for initial fetch
  
    // --- Effects for Populating Autocomplete Filters ---
    useEffect(() => {
      // Populate faculty options
      setFilteredFacultyItems(
        facultyData.map((faculty) => ({ key: faculty.$id, label: faculty.name }))
      );
    }, [facultyData]);
  
    useEffect(() => {
      // Populate class options based on selected faculty
      let classes: { key: string; label: string }[] = [];
      if (facultyFilter) {
        const selectedFaculty = facultyData.find((f) => f.$id === facultyFilter);
        classes = (selectedFaculty?.classes ?? []).map((cls) => ({ key: cls, label: cls }));
      }
      setFilteredClassItems(classes);
      // Also reset section filter and options when faculty changes
      setSectionFilter("");
      setFilteredSectionItems([]);
    }, [facultyFilter, facultyData]);
  
    useEffect(() => {
      // Populate section options based on selected faculty AND class
      let sections: { key: string; label: string }[] = [];
      if (facultyFilter && classFilter && sectionData) {
          sections = sectionData
              .filter(sec => sec.facultyId === facultyFilter && sec.class === classFilter)
              .map(sec => ({ key: sec.name, label: sec.name })); // Use section name as key and label for filtering studentData.section
      }
      setFilteredSectionItems(sections);
      // No need to reset section filter here, as it's directly dependent
    }, [facultyFilter, classFilter, sectionData]); // Add sectionData dependency
    // --- End Effects for Autocomplete Filters ---
  
    // Memoized Filtered Student Data for Table
    const filteredStudentData = useMemo(() => {
      // **Requirement 2: Return empty array if no filters/search are active**
      if (!facultyFilter && !classFilter && !sectionFilter && !searchText.trim()) {
          return [];
      }
  
      const fullStudentData = studentData || [];
      let filteredData = fullStudentData;
  
      // Apply filters sequentially
      if (facultyFilter) {
        filteredData = filteredData.filter(
          (student) => student.facultyId === facultyFilter
        );
      }
      if (classFilter) {
        filteredData = filteredData.filter(
          (student) => student.class === classFilter
        );
      }
      if (sectionFilter) {
        // Filter by section NAME, as studentData likely has section name string
        filteredData = filteredData.filter(
          (student) => student.section === sectionFilter
        );
      }
  
      // Apply search text filter (on student name) *after* other filters
      if (searchText.trim()) {
        const lowerSearchText = searchText.toLowerCase().trim();
        filteredData = filteredData.filter((student) =>
          (student.name || '').toLowerCase().includes(lowerSearchText)
        );
      }
  
      return filteredData;
  
    }, [studentData, searchText, facultyFilter, classFilter, sectionFilter]); // Add sectionFilter dependency
  
    return (
      <div className="md:w-full w-full md:p-2">
        <Toaster position="top-right" />
        {errorMessage && <ErrorMessage message={errorMessage} />}
  
        <div className="top overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
          <div className="min-w-[500px] md:min-w-fit mt-1 mx-3 md:px-0 mb-2"> {/* Increased min-width for more filters */}
  
            {/* Combined Desktop and Mobile Layout */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 flex-wrap"> {/* Added flex-wrap */}
  
              {/* Filters Section (Faculty, Class, Section) */}
              <div className="flex flex-col sm:flex-row gap-2 flex-grow sm:flex-grow-0 min-w-[300px] sm:min-w-0"> {/* Adjust min-width */}
                {/* Faculty Filter */}
                <Autocomplete
                  placeholder="Faculty"
                  className="w-full sm:max-w-[10rem]" // Adjusted width
                  variant="faded"
                  size="md"
                  selectedKey={facultyFilter}
                  onSelectionChange={(key) => {
                    const newFacultyId = key ? key.toString() : "";
                    setFacultyFilter(newFacultyId);
                    // Reset dependent filters and selection
                    setClassFilter("");
                    setSectionFilter("");
                    onStudentsSelect([]);
                  }}
                  items={filteredFacultyItems}
                  aria-label="Select Faculty Filter"
                >
                  {(item) => (
                    <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>
                  )}
                </Autocomplete>
  
                {/* Class Filter */}
                <Autocomplete
                  placeholder="Class"
                  className="w-full sm:max-w-[8rem]" // Adjusted width
                  variant="faded"
                  size="md"
                  selectedKey={classFilter}
                  onSelectionChange={(key) => {
                    setClassFilter(key ? key.toString() : "");
                    // Reset dependent filter and selection
                    setSectionFilter("");
                    onStudentsSelect([]);
                  }}
                  items={filteredClassItems}
                  isDisabled={!facultyFilter || filteredClassItems.length === 0}
                  aria-label="Select Class Filter"
                >
                  {(item) => (
                    <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>
                  )}
                </Autocomplete>
  
                {/* Section Filter */}
                <Autocomplete
                  placeholder="Section"
                  className="w-full sm:max-w-[8rem]" // Adjusted width
                  variant="faded"
                  size="md"
                  selectedKey={sectionFilter} // Use sectionFilter (name)
                  onSelectionChange={(key) => {
                      setSectionFilter(key ? key.toString() : ""); // Store section name
                      // Reset selection when section changes
                      onStudentsSelect([]);
                  }}
                  items={filteredSectionItems} // Use filtered section items
                  isDisabled={!facultyFilter || !classFilter || filteredSectionItems.length === 0} // Disable if faculty/class not selected or no sections
                  aria-label="Select Section Filter"
                >
                  {(item) => (
                    <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem> // Key and label are both section names
                  )}
                </Autocomplete>
              </div>
  
               {/* Search and Refresh Section */}
               <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-grow w-full sm:w-auto"> {/* Ensure it takes space or shrinks appropriately */}
                  {/* Search Input */}
                  <div className="flex-grow min-w-[100px] sm:min-w-[150px] max-w-full sm:max-w-[250px]"> {/* Control max width */}
                      <SearchBar
                          placeholder="Search student name..."
                          value={searchText}
                          onValueChange={handleSearchChange}
                        //   className="w-full"
                      />
                  </div>
  
                  {/* Refresh Button */}
                  <ActionButton
                      icon={<TbReload className="w-5 h-5 text-gray-100 transition duration-200" />}
                      onClick={handleRefresh}
                      aria-label="Refresh Data & Filters"
                    //   className="flex-shrink-0" // Prevent button from shrinking too much
                  />
               </div>
            </div>
          </div>
        </div>
  
        {isLoading && (
          <Progress
            size="sm"
            isIndeterminate
            aria-label="Loading data..."
            className="w-full my-2"
          />
        )}
  
        <AttendanceTable
          studentData={filteredStudentData} // Pass the data filtered by all criteria
          isLoading={isLoading}
          onStudentsSelect={onStudentsSelect}
          selectedStudents={selectedStudents}
          // Pass a flag or modify emptyContent based on whether filters are active
        //   emptyContent={
        //       isLoading ? "Loading students..." :
        //       (!facultyFilter && !classFilter && !sectionFilter && !searchText.trim() ? "Please select filters or search to view students." : "No students match your criteria.")
        //   }
        />
      </div>
    );
  };
  
  export default List;