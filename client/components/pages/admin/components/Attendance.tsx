// ~/Attendance/Attendance.tsx
import React, { useState, useEffect, useCallback } from "react";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import List from "./Attendance/List"; // Adjust path if needed
import Details from "./Attendance/Details"; // Adjust path if needed

const Attendance = () => {
  // State for mobile view detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  // State for the list of currently selected student IDs
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  // State to control showing Details view on mobile
  const [showDetailsMobile, setShowDetailsMobile] = useState<boolean>(false);

  // Effect to handle window resize for mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();
    // Add resize listener
    window.addEventListener("resize", checkMobile);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []); // Empty dependency array means this runs only on mount and unmount

  // Callback to handle student selection changes from the List component
  // Memoized using useCallback to prevent unnecessary re-renders of child components
  const handleStudentsSelect = useCallback((studentIds: string[]) => {
    setSelectedStudents(studentIds); // Update the selected students state

    // If on mobile and students are selected, navigate to the Details view
    if (isMobile && studentIds.length > 0) {
      setShowDetailsMobile(true);
    }
    // Optionally handle deselection on mobile if needed
    // else if (isMobile && studentIds.length === 0) {
    //   setShowDetailsMobile(false); // Go back to list if selection is cleared
    // }
  }, [isMobile]); // Dependency: isMobile state

  // Callback for the 'Back' button in the Details view on mobile
  // Memoized using useCallback
  const handleBackToList = useCallback(() => {
    setShowDetailsMobile(false); // Hide Details view
    // Optionally clear selection when going back, or keep it if user might go back and forth
    // setSelectedStudents([]);
  }, []); // No dependencies needed here

  return (
    // Main container takes full available height and width
    <div className="flex flex-1 w-full h-full">
      {isMobile ? (
        // --- Mobile Layout ---
        !showDetailsMobile ? (
          // Show List view if not showing details
          <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden shadow-md">
             {/* Wrap List with PerfectScrollbar if List itself might overflow */}
            <PerfectScrollbar options={{ suppressScrollX: true }}>
                <List
                    isMobile={isMobile}
                    onStudentsSelect={handleStudentsSelect} // Pass the memoized callback
                    selectedStudents={selectedStudents}    // Pass current selection state
                />
            </PerfectScrollbar>
          </div>
        ) : (
          // Show Details view if students are selected
          <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden shadow-md">
            {/* Details view often needs scrolling */}
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              <Details
                studentIds={selectedStudents} // Pass selected IDs
                onBack={handleBackToList}      // Pass the back handler
               />
            </PerfectScrollbar>
          </div>
        )
      ) : (
        // --- Desktop Layout ---
        <div className="flex w-full gap-4"> {/* Use gap for spacing */}
        {/* List View Pane */}
        <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden"> {/* Use flex-1 to ensure equal width */}
          {/* List view often needs scrolling */}
          <PerfectScrollbar options={{ suppressScrollX: true }}>
            <List
              isMobile={isMobile}
              onStudentsSelect={handleStudentsSelect} // Pass the memoized callback
              selectedStudents={selectedStudents}    // Pass current selection state
            />
          </PerfectScrollbar>
        </div>
        {/* Details View Pane */}
        <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden"> {/* Use flex-1 here as well */}
          {/* Details view often needs scrolling */}
          <PerfectScrollbar options={{ suppressScrollX: true }}>
            {selectedStudents.length > 0 ? (
              // Show Details if students are selected
              <Details
                  studentIds={selectedStudents} // Pass selected IDs
                  // No 'onBack' needed for desktop view
              />
            ) : (
              // Show placeholder if no students are selected
              <div className="p-6 flex flex-col items-center justify-center h-full text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 18h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-lg italic">
                  Select students from the list to view or mark attendance.
                </p>
              </div>
            )}
          </PerfectScrollbar>
        </div>
      </div>
      
      )}
    </div>
  );
};

export default Attendance;