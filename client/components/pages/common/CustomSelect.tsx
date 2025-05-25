// src/components/common/CustomSelect.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XCircleIcon as ClearIcon } from '@heroicons/react/20/solid';

export interface SelectOption {
  id: string | number;
  name: string;
}

interface CustomSelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string | null; // The ID of the selected option
  onChange: (selectedId: string | null) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  allowClear?: boolean; // To show a clear button
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  placeholder = 'Select an option',
  options,
  value,
  onChange,
  className = '',
  size = 'md',
  disabled = false,
  allowClear = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => String(opt.id) === String(value));

  // Mimicking HeroUI's typical "md" size (text-sm, py-2)
  const inputSizeClass = size === 'sm' ? 'text-sm leading-5 py-1.5 px-3' : 'text-sm leading-6 py-2 px-3';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionId: string | null) => {
    onChange(optionId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggleOpen from firing
    if (!disabled) {
      onChange(null);
      setIsOpen(false);
    }
  };

  const toggleOpen = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };
  
  const baseButtonClasses = "w-full max-w-[250px] flex items-center justify-between rounded-md border bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed";
  const placeholderColorClass = "text-gray-400"; // HeroUI uses gray-500 for placeholder usually
  const valueColorClass = "text-gray-900";

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      {label && (
        <label htmlFor={label.replace(/\s+/g, '-').toLowerCase()} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        id={label ? label.replace(/\s+/g, '-').toLowerCase() : undefined}
        onClick={toggleOpen}
        disabled={disabled}
        className={`${baseButtonClasses} ${inputSizeClass} ${
          selectedOption ? valueColorClass : placeholderColorClass
        } border-gray-300`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">
            {selectedOption ? selectedOption.name : placeholder}
        </span>
        <div className="flex items-center">
          {allowClear && value && !disabled && (
            <ClearIcon
              className="h-5 w-5 text-gray-400 hover:text-gray-600 mr-1.5" // Added mr-1.5 for spacing
              onClick={handleClear}
              aria-hidden="true"
              title="Clear selection"
            />
          )}
          <ChevronDownIcon className={`h-5 w-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <ul
          className="absolute z-[9999999999999999] mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
          role="listbox"
        >
          {/* Option to select placeholder text, effectively clearing the filter */}
          {placeholder && allowClear && ( // Show only if allowClear is true
             <li
             className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white ${
               !value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-900 font-normal'
             }`}
             onClick={() => handleSelect(null)}
             role="option"
             aria-selected={!value}
           >
             <span className={`block truncate ${!value ? 'font-semibold' : 'font-normal'}`}>
               {placeholder}
             </span>
           </li>
          )}
          {options.map((option) => (
            <li
              key={option.id}
              className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white ${
                String(value) === String(option.id) ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-900 font-normal'
              }`}
              onClick={() => handleSelect(String(option.id))}
              role="option"
              aria-selected={String(value) === String(option.id)}
            >
              <span className={`block truncate ${String(value) === String(option.id) ? 'font-semibold' : 'font-normal'}`}>
                {option.name}
              </span>
              {/* Optional: Add a checkmark for selected item */}
              {/* {String(value) === String(option.id) && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                   <CheckIcon className="h-5 w-5" aria-hidden="true" /> 
                </span>
              )} */}
            </li>
          ))}
          {options.length === 0 && (!placeholder || !allowClear) && ( // Avoid "No options" if placeholder option is shown
            <li className="cursor-default select-none relative py-2 px-4 text-gray-700">
              No options
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;