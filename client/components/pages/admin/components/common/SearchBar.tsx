// src/components/SearchBar.tsx
import React from "react";
import { Input, InputProps } from '@heroui/react';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ placeholder = "Search...", value, onValueChange }) => {
  return (
    <Input
      isClearable
      className=" sm:max-w-[40%]"
      placeholder={placeholder}
      startContent={<MagnifyingGlassIcon className="w-5 h-5 text-default-400 pointer-events-none flex-shrink-0" />}
      value={value}
      variant="faded"
      onValueChange={onValueChange}
    />
  );
};

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
export default SearchBar;