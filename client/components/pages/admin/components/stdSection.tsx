// ~/Section/Section.tsx
import React, { useState, useEffect } from "react";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import List from "./stdSection/List";
import Details from "./stdSection/Details"; // Import Details component
import { useStudentStore } from "~/store/studentStore";
import { Student as StudentType } from "~/store/studentStore"; // Import Student interface

const stdSection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentType | null>(
    null
  );
  const [showDetailsMobile, setShowDetailsMobile] = useState<boolean>(false);

  const { studentData, fetchStudentData, isLoading } = useStudentStore();

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

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

  const handleStudentSelect = (student: StudentType | null) => {
    setSelectedStudent(student);
    if (isMobile) {
      if (student) {
        setShowDetailsMobile(true);
      } else {
        setShowDetailsMobile(false);
      }
    } else {
      setShowDetailsMobile(false);
    }
  };

  const handleBackToList = () => {
    setShowDetailsMobile(false);
    setSelectedStudent(null);
  };


  return (
    <div className="flex flex-1 w-full h-full ">
      {isMobile ? (
        !showDetailsMobile ? (
          <div className="flex-1 bg-gray-100 rounded-xl  overflow-hidden">
            <List
              isMobile={isMobile}
              onStudentSelect={handleStudentSelect}
              studentData={studentData}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              <Details student={selectedStudent} onBack={handleBackToList} isMobile={isMobile} /> {/* Pass isMobile prop */}
            </PerfectScrollbar>
          </div>
        )
      ) : (
        <div className="flex w-full gap-3">
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              <List
                isMobile={isMobile}
                onStudentSelect={handleStudentSelect}
                studentData={studentData}
                isLoading={isLoading}
              />
            </PerfectScrollbar>
          </div>
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              {selectedStudent ? (
                <Details student={selectedStudent} isMobile={isMobile} /> 
              ) : (
                <div className="p-6 rounded-md flex flex-col items-center justify-center h-full">
                  <p className="text-gray-600 text-lg italic">
                    Select a student to view details.
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

export default stdSection;