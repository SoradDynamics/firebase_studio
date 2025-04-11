// src/components/SearchBar.tsx
import React from "react";
import { Input, InputProps } from '@heroui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string; // Allow user to pass in custom class names
  inputClassName?: string; // Allow user to pass in custom class names for the input element specifically
  startIconClassName?: string; // Allow user to pass in custom class names for the icon
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search...",
  value,
  onValueChange,
  className = "", // Provide a default empty string
  inputClassName = "", // Provide a default empty string for the input element
  startIconClassName = "" // Provide a default empty string for the icon
}) => {
  return (
    <div className={`relative ${className}`}> {/* Wrap the input in a div to apply external styles */}
      <Input
        isClearable
        className={` sm:max-w sm:px-2 ${inputClassName}`}  // Apply custom input class names
        placeholder={placeholder}
        startContent={
          <MagnifyingGlassIcon
            className={`w-5 h-5 text-default-400 pointer-events-none flex-shrink-0 ${startIconClassName}`} // Apply icon class names
          />
        }
        value={value}
        variant="faded"
        onValueChange={onValueChange}
      />
    </div>
  );
};


export default SearchBar;