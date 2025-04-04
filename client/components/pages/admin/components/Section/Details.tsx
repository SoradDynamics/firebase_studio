// src/Section/Details.tsx
import React from "react";
import { Button } from "@heroui/react";
import { useFacultyStore } from "~/store/facultyStore";
import { Section, Faculty } from "types"; // Import interfaces from types/index.ts

interface DetailsProps {
  section: Section | null;
  onBack?: () => void;
}

const Details: React.FC<DetailsProps> = ({ section, onBack }) => {
  const { facultyData } = useFacultyStore();
  if (!section) {
    return null;
  }

  const facultyName = section.facultyId
    ? facultyData.find((f) => f.$id === section.facultyId)?.name
    : "N/A";

  return (
    <div className=" px-6 pt-3 rounded-md flex flex-col h-full">
      {onBack && (
        <div className="mb-6">
          <Button onPress={onBack} color="secondary" variant="flat">
            Back to List
          </Button>
        </div>
      )}
      <h2 className="text-3xl font-bold text-gray-900 mb-1 border-b pb-2">
        {section.name}
      </h2>
      <h3 className="text-lg text-gray-700 mb-4 italic">
        Class: {section.class} {facultyName ? `(Faculty: ${facultyName})` : ""}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <strong className="block font-medium text-gray-700 mb-2">
            Subjects:
          </strong>
          <ul className="list-disc list-inside pl-5">
            {section.subjects.map((sub, index) => (
              <li key={index} className="text-gray-900">
                {sub}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Details;
