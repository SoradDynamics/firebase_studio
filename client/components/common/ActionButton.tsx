// src/components/common/ActionButton.tsx
import React from "react";
import { Button } from '@heroui/react'; // Or your UI library's Button
import { ReactNode } from 'react';

interface ActionButtonProps {
  icon: ReactNode;
  onClick?: () => void; 
  color?: "blue" | "orange" | "green" | "red" | "default"; // Added "default"
  buttonText?: string; 
  isIconOnly?: boolean;
  isLoading?: boolean; // Added for loading state
  className?: string; // Added for custom styling
  tooltipText?: string; // For aria-label or potential tooltip
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  onClick,
  color = "blue",
  // buttonText, // Not used if isIconOnly is true by default
  isIconOnly = true,
  isLoading = false,
  className = "",
  tooltipText = "Action",
}) => {
  let bgColorClass = `bg-${color}-500 hover:bg-${color}-600`;
  let textColorClass = "text-white";

  switch (color) {
    case "orange":
      bgColorClass = "bg-orange-400 hover:bg-orange-500";
      break;
    case "green":
      bgColorClass = "bg-[#17C964] hover:bg-[#12A150]";
      break;
    case "red":
      bgColorClass = "bg-red-500 hover:bg-red-600";
      break;
    case "default": // For a more neutral refresh button
      bgColorClass = "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600";
      textColorClass = "text-gray-700 dark:text-gray-200";
      break;
    // default is blue
  }

  return (
    <Button
      className={`${isIconOnly ? '' : 'px-3'} ${bgColorClass} ${textColorClass} shadow-md disabled:opacity-50 ${className}`}
      size='sm' // Small size for an icon button next to text
      radius="md"
      isIconOnly={isIconOnly}
      onPress={onClick}
      isLoading={isLoading}
      aria-label={tooltipText}
      isDisabled={isLoading}
    >
      {/* HeroUI Button shows spinner when isLoading is true, so only show icon if not loading */}
      {!isLoading && icon}
    </Button>
  );
};

export default ActionButton;