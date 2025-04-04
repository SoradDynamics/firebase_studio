// ~/Section/Details.tsx
import React, { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { useFacultyStore } from "~/store/facultyStore";
import { Student } from "~/store/studentStore"; // Import Student interface


interface DetailsProps {
  student: Student | null;
  onBack?: () => void;
  isMobile: boolean; // Add isMobile prop
}

const Details: React.FC<DetailsProps> = ({ student, onBack, isMobile }) => { // Destructure isMobile prop
  const { facultyData } = useFacultyStore();

  if (!student) {
    return null;
  }

  const facultyName = student.facultyId
    ? facultyData.find((f) => f.$id === student.facultyId)?.name
    : "N/A";


  return (
    <div className=" px-6 pt-3 rounded-md flex flex-col h-full">
      {isMobile && onBack && ( // Conditionally render Back button in mobile view
        <div className="mb-6">
          <Button onPress={onBack} color="secondary" variant="flat">
            Back to List
          </Button>
        </div>
      )}
      <h2 className="text-3xl font-bold text-gray-900 mb-1 border-b-2 pb-2">
        {student.name}
      </h2>
      <h3 className="text-lg text-gray-700 mb-4 italic">
        Class: {student.class}, Section: {student.section} {facultyName ? `(Faculty: ${facultyName})` : ""}
      </h3>
      <div className="grid grid-cols-1  gap-6">
      <div>
          <strong className="block font-medium text-gray-700 mb-2">
            Student Info:
          </strong>
          <p className="text-gray-900">Name: {student.name}</p>
          <p className="text-gray-900">Email: {student.stdEmail}</p>
          <p className="text-gray-900">Class: {student.class}</p>
          <p className="text-gray-900">Section: {student.section}</p>
           {facultyName && <p className="text-gray-900">Faculty: {facultyName}</p>}
        </div>
      </div>
    </div>
  );
};

export default Details;