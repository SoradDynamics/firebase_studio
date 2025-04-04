// ~/Student/Details.tsx
import React, { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { useFacultyStore } from "~/store/facultyStore";
import { useSectionStore } from "~/store/sectionStore";
import { useParentStore } from "~/store/parentStore"; // import parent store
import { Student } from "~/store/studentStore"; // Import Student interface
import { Parent } from "types"; // Import Faculty, Section and Parent interfaces

interface DetailsProps {
  student: Student | null;
  onBack?: () => void;
}

const Details: React.FC<DetailsProps> = ({ student, onBack }) => {
  // console.log("Details Component - student prop:", student); // INSPECT STUDENT PROP HERE
  const { facultyData } = useFacultyStore();
  const { sectionData } = useSectionStore();
  const { parentData, fetchParentData } = useParentStore(); // use parent store
  const [parentDetails, setParentDetails] = useState<Parent | null>(null); // State to hold parent details

  useEffect(() => {
    if (student?.parentId) {
      const fetchParent = async () => {
        await fetchParentData(); // Ensure parent data is fetched
        const parent = parentData.find((p) => p.$id === student.parentId);
        setParentDetails(parent || null);
      };
      fetchParent();
    } else {
      setParentDetails(null);
    }
  }, [student, parentData, fetchParentData]);


  if (!student) {
    return null;
  }

  const facultyName = student.facultyId
    ? facultyData.find((f) => f.$id === student.facultyId)?.name
    : "N/A";
  const sectionDetails = student.section
    ? sectionData.find((s) => s.name === student.section && s.facultyId === student.facultyId && s.class === student.class)
    : null;


  return (
    <div className=" px-6 pt-3 rounded-md flex flex-col h-full">
      {onBack && (
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
          <p className="text-gray-900">Email: {student.stdEmail}</p> {/* Display Student Email from DB */}
          <p className="text-gray-900">Class: {student.class}</p>
          <p className="text-gray-900">Section: {student.section}</p>
           {facultyName && <p className="text-gray-900">Faculty: {facultyName}</p>}
        </div>
<hr className=" border-1" />

        <div>
          <strong className="block font-medium text-gray-700 mb-2">
            Parent Details:
          </strong>
          <p className="text-gray-900">Name: {parentDetails?.name || "N/A"}</p>
          <p className="text-gray-900">Email: {parentDetails?.email || "N/A"}</p>
          <strong className="block font-medium text-gray-700 mt-2 mb-2">
            Parent Contact:
          </strong>
          <ul className="list-disc list-inside pl-5">
            {parentDetails?.contact && Array.isArray(parentDetails.contact) ? ( // Defensive check for parent contact too
              parentDetails.contact.map((contact, index) => (
                <li key={index} className="text-gray-900">
                  {contact}
                </li>
              ))
            ) : (
              <li className="text-gray-900">N/A</li>
            )}
          </ul>
        </div>
        
        
      </div>
    </div>
  );
};

export default Details;