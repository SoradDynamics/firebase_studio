// ~/Attendance/Attendance.tsx
import React, { useState, useEffect } from "react";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import List from "./Attendance/List";
import Details from "./Attendance/Details";

const Attendance = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]); // Array of student IDs
  const [showDetailsMobile, setShowDetailsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const handleStudentsSelect = (studentIds: string[]) => {
    setSelectedStudents(studentIds);
    if (isMobile) {
      setShowDetailsMobile(true);
    } else {
      setShowDetailsMobile(false);
    }
  };

  const handleBackToList = () => {
    setShowDetailsMobile(false);
    setSelectedStudents([]);
  };

  return (
    <div className="flex flex-1 w-full h-full">
      {isMobile ? (
        !showDetailsMobile ? (
          <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden">
            <List
              isMobile={isMobile}
              onStudentsSelect={handleStudentsSelect}
              selectedStudents={selectedStudents}
            />
          </div>
        ) : (
          <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              <Details studentIds={selectedStudents} onBack={handleBackToList} />
            </PerfectScrollbar>
          </div>
        )
      ) : (
        <div className="flex w-full gap-3">
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              <List
                isMobile={isMobile}
                onStudentsSelect={handleStudentsSelect}
                selectedStudents={selectedStudents}
              />
            </PerfectScrollbar>
          </div>
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              {selectedStudents.length > 0 ? (
                <Details studentIds={selectedStudents} />
              ) : (
                <div className="p-6 rounded-md flex flex-col items-center justify-center h-full">
                  <p className="text-gray-600 text-lg italic">
                    Select students to view details.
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