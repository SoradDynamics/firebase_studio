// src/components/ActionButton.tsx
import React from "react";
import { Button } from '@heroui/react';
import { ReactNode } from 'react';

interface ActionButtonProps {
  icon: ReactNode;
  onClick?: () => void; 
  color?: "blue" | "orange" | "green" | "red"; 
  buttonText?: string; 
  isIconOnly?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  onClick,
  color = "blue",
  buttonText,
  isIconOnly = true,
}) => {
  let bgColorClass = `bg-${color}-500`;
  if (color === "orange") {
    bgColorClass = "bg-orange-400";
  } else if (color === "green") {
    bgColorClass = "bg-[#17C964]";
  } else if (color === "red") {
    bgColorClass = "bg-red-500";
  }

  return (
    <Button
      className={`${bgColorClass} text-white shadow-lg`}
      size='sm'
      radius="md"
      isIconOnly={isIconOnly}
      onPress={onClick}
    >
      {icon}
    </Button>
  );
};

export default ActionButton;