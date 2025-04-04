// components/common/Profile.tsx
import React from 'react';
import { useStudentData } from "../StudentContext";
import { Select, SelectItem } from '@heroui/react';
import {
  Avatar, AvatarIcon
} from "@heroui/react";

const Profile: React.FC = () => {
  const { studentOptions, selectedStudentId, handleStudentChange } = useStudentData();

  const handleChange = (studentId: string) => {
    handleStudentChange(studentId);
  };

  return (
    <div className="p-4 bg-white rounded-md shadow-sm border mb-4">
      <div className="flex items-center mb-2">
        <Avatar
          classNames={{
            base: "bg-gradient-to-br from-[#FFB457] to-[#FF705B]",
            icon: "text-black/80",
          }}
          className="cursor-pointer mr-2"
          icon={<AvatarIcon />}
        />
        <div>
          <p className="font-semibold">User Name</p>
          <p className="text-sm text-gray-500">User Email</p>
        </div>
      </div>

      {studentOptions && studentOptions.length > 0 && (
       <Select
       className="max-w-xs"
       items={studentOptions}
       label="Select Student"
       placeholder="Select a student"
       onChange={(e) => handleChange(e.target.value)}
       selectedKeys={[selectedStudentId ?? '']}
   >
       {(student) => (
           <SelectItem key={student.id}>
               {student.name}
           </SelectItem>
       )}
   </Select>
      )}
    </div>
  );
};

export default Profile;