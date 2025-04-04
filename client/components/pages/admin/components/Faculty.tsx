// Faculty.tsx
// src/Faculty.tsx
import React, { useState, useEffect } from "react";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import List from "./Faculty/List";
import Details from "./Faculty/Details"; // Import Details in Faculty.tsx
import { useFacultyStore } from "~/store/facultyStore"; // Import useFacultyStore

interface FacultyType { // Define FacultyType for type safety
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  id: string;
  name: string;
  classes: string[];
}

const Faculty = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyType | null>(null); // State for selected faculty
  const [showDetailsMobile, setShowDetailsMobile] = useState<boolean>(false); // State for mobile details visibility

  const { facultyData, fetchFacultyData, isLoading } = useFacultyStore(); // Use facultyStore in Faculty component

  useEffect(() => {
    fetchFacultyData(); // Fetch data here, only once when Faculty component mounts
  }, [fetchFacultyData]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleFacultySelect = (faculty: FacultyType | null) => { // Handler for faculty selection
    // console.log("Faculty: handleFacultySelect - START", faculty); // LOG
    setSelectedFaculty(faculty);
    if (isMobile) {
      if (faculty) { // Check if faculty is NOT null (i.e., a faculty is selected)
        setShowDetailsMobile(true); // Show details only if faculty is selected
        // console.log("Faculty: handleFacultySelect - isMobile is true AND faculty is selected, setShowDetailsMobile(true)"); // LOG
      } else {
        setShowDetailsMobile(false); // Hide details if faculty is null (deselected or after delete)
        // console.log("Faculty: handleFacultySelect - isMobile is true AND faculty is null, setShowDetailsMobile(false)"); // LOG
      }
    } else {
      setShowDetailsMobile(false); // For desktop, always hide details when selection changes (can adjust if desktop behavior should be different)
      // console.log("Faculty: handleFacultySelect - isMobile is false, setShowDetailsMobile(false)"); // LOG
    }
    // console.log("Faculty: handleFacultySelect - END"); // LOG
  };

  const handleBackToList = () => { // Handler for back button in Details
    setShowDetailsMobile(false); // Hide details, show list on mobile
    setSelectedFaculty(null); // Clear selected faculty
  };

  useEffect(() => {
    // console.log("Faculty: State - isMobile:", isMobile, "showDetailsMobile:", showDetailsMobile, "selectedFaculty:", selectedFaculty);
  }, [isMobile, showDetailsMobile, selectedFaculty]);

  return (
    // Outer container for Faculty component
    <div className="flex flex-1 w-full h-full ">
      {/* Mobile View: Conditionally render List or Details */}
      {isMobile ? (
        !showDetailsMobile ? (
          // Mobile List View Container
          <div className="flex-1 bg-gray-100 rounded-xl  overflow-hidden">
            {/* Pass facultyData and isLoading as props to List */}
            <List isMobile={isMobile} onFacultySelect={handleFacultySelect} facultyData={facultyData} isLoading={isLoading} />
          </div>
        ) : (
          // Mobile Details View Container
          <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              <Details faculty={selectedFaculty} onBack={handleBackToList} /> {/* Pass selectedFaculty and onBack to Details */}
            </PerfectScrollbar>
          </div>
        )
      ) : (
        /* Computer View: Always render List and Details side-by-side */
        <div className="flex w-full gap-3">
          {/* Computer List View Container */}
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              <List isMobile={isMobile} onFacultySelect={handleFacultySelect} facultyData={facultyData} isLoading={isLoading} /> {/* Pass onFacultySelect to List */}
            </PerfectScrollbar>
          </div>
          {/* Computer Details View Container */}
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              {selectedFaculty ? ( // Conditional rendering here
                <Details faculty={selectedFaculty} />
              ) : (
                <div className="p-6 rounded-md flex flex-col items-center justify-center h-full">
                  <p className="text-gray-600 text-lg italic">Select a faculty member to view details.</p>
                </div>
              )}
            </PerfectScrollbar>
          </div>
        </div>
      )}
    </div>
  );
};

export default Faculty;