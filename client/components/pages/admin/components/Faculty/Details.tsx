// Details.tsx
// src/Faculty/Details.tsx
import React from "react";
import { Button } from "@heroui/react";

interface Faculty {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  id: string;
  name: string;
  classes: string[];
}

interface DetailsProps {
  faculty: Faculty | null;
  onBack?: () => void; // Optional back function for mobile
}

const Details: React.FC<DetailsProps> = ({ faculty, onBack }) => {
  if (!faculty) {
    return null; // Return null when faculty is null - render nothing or placeholder in parent
  }

  return (
    <div className=" px-6 pt-3 rounded-md flex flex-col h-full">
      {/* Conditionally render Back Button only if onBack prop is provided (mobile) */}
      {onBack && (
        <div className="mb-6">
          <Button onPress={onBack} color="secondary" variant="flat">
            Back to List
          </Button>
        </div>
      )}
      <h2 className="text-3xl font-bold text-gray-900 mb-4 border-b pb-2">
        {faculty.name}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <strong className="block font-medium text-gray-700 mb-2">Classes:</strong>
          <ul className="list-disc list-inside pl-5">
            {faculty.classes.map((cls, index) => (
              <li key={index} className="text-gray-900">{cls}</li>
            ))}
          </ul>
        </div>
        {/* Add more details here as needed within the grid layout */}
      </div>
    </div>
  );
};

export default Details;