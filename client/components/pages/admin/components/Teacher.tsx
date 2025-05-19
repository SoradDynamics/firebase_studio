// src/Academic/Teacher.tsx
import React, { useState, useEffect } from "react";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import List from "./Teacher/List"; // To be created
import Details from "./Teacher/Details"; // To be created
import { useTeacherStore } from "~/store/teacherStore";
import { Teacher } from 'types/teacher';

const TeacherPage = () => { // Renamed component to avoid conflict if 'Teacher' type is used directly
  const [isMobile, setIsMobile] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showDetailsMobile, setShowDetailsMobile] = useState<boolean>(false);

  const { teacherData, fetchTeachersData, isLoading, isFetching } = useTeacherStore();

  useEffect(() => {
    fetchTeachersData();
  }, [fetchTeachersData]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTeacherSelect = (teacher: Teacher | null) => {
    setSelectedTeacher(teacher);
    if (isMobile) {
      setShowDetailsMobile(!!teacher);
    }
  };

  const handleBackToList = () => {
    setShowDetailsMobile(false);
    setSelectedTeacher(null);
  };

  return (
    <div className="flex flex-1 w-full h-full ">
      {isMobile ? (
        !showDetailsMobile ? (
          <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden">
            <List
              isMobile={isMobile}
              onTeacherSelect={handleTeacherSelect}
              teacherData={teacherData}
              isLoading={isFetching || isLoading} // Combine loading states
            />
          </div>
        ) : (
          <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              <Details teacher={selectedTeacher} onBack={handleBackToList} />
            </PerfectScrollbar>
          </div>
        )
      ) : (
        <div className="flex w-full gap-3">
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              <List
                isMobile={isMobile}
                onTeacherSelect={handleTeacherSelect}
                teacherData={teacherData}
                isLoading={isFetching || isLoading}
               />
            </PerfectScrollbar>
          </div>
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              {selectedTeacher ? (
                <Details teacher={selectedTeacher} />
              ) : (
                <div className="p-6 rounded-md flex flex-col items-center justify-center h-full">
                  <p className="text-gray-600 text-lg italic">Select a teacher to view details.</p>
                </div>
              )}
            </PerfectScrollbar>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPage;