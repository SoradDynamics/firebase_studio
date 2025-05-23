// src/components/ui/CustomSelect.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDownIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  isMulti?: boolean;
  labelClassName?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  maxVisibleTags?: number; // For multi-select display
  closeOnSelect?: boolean; // For single-select, default true. For multi-select, default false.
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  className = '',
  disabled = false,
  isMulti = false,
  labelClassName = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
  buttonClassName = "",
  dropdownClassName = "",
  maxVisibleTags = 2,
  closeOnSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const effectiveCloseOnSelect = closeOnSelect !== undefined ? closeOnSelect : !isMulti;

  const selectedOptionsArray = useMemo(() => {
    if (!isMulti) {
      const found = options.find((opt) => opt.value === value);
      return found ? [found] : [];
    }
    return Array.isArray(value) ? options.filter(opt => value.includes(opt.value)) : [];
  }, [value, options, isMulti]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && dropdownRef.current && buttonRef.current) {
        const dropdownRect = dropdownRef.current.getBoundingClientRect();
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;

        if (spaceBelow < dropdownRect.height && spaceAbove > dropdownRect.height) {
            // Position above
            dropdownRef.current.style.bottom = `${buttonRect.height + 4}px`;
            dropdownRef.current.style.top = 'auto';
        } else {
            // Position below (default) or cap height if not enough space anywhere
            dropdownRef.current.style.top = '100%';
            dropdownRef.current.style.bottom = 'auto';
            if (spaceBelow < dropdownRect.height) {
              dropdownRef.current.style.maxHeight = `${Math.max(100, spaceBelow - 10)}px`; // Min height of 100px
            } else {
              dropdownRef.current.style.maxHeight = '15rem'; // Default max-h-60
            }
        }
    }
  }, [isOpen, options]); // Re-evaluate on options change too, as height might change


  const handleOptionClick = (optionValue: string) => {
    if (isMulti) {
      const currentValue = Array.isArray(value) ? [...value] : [];
      const index = currentValue.indexOf(optionValue);
      if (index > -1) {
        currentValue.splice(index, 1);
      } else {
        currentValue.push(optionValue);
      }
      onChange(currentValue);
    } else {
      onChange(optionValue);
    }
    if (effectiveCloseOnSelect) {
      setIsOpen(false);
    }
  };

  const handleRemoveTag = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation(); 
    if (isMulti && Array.isArray(value)) {
      onChange(value.filter(v => v !== optionValue));
    }
  };

  const displayValue = () => {
    if (isMulti) {
      if (selectedOptionsArray.length === 0) return <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>;
      
      const visibleTags = selectedOptionsArray.slice(0, maxVisibleTags);
      const remainingCount = selectedOptionsArray.length - maxVisibleTags;

      return (
        <div className="flex flex-wrap gap-1.5 items-center py-0.5">
          {visibleTags.map(opt => (
            <span 
              key={opt.value} 
              className="bg-indigo-100 dark:bg-indigo-800/70 text-indigo-700 dark:text-indigo-200 text-xs font-medium pl-2 pr-1 py-0.5 rounded-md flex items-center max-w-[100px] sm:max-w-[150px]"
              title={opt.label}
            >
              <span className="truncate">{opt.label}</span>
              {!disabled && (
                 <XMarkIcon
                    className="ml-1 h-3.5 w-3.5 cursor-pointer hover:text-red-500 dark:hover:text-red-400 flex-shrink-0"
                    onClick={(e) => handleRemoveTag(e, opt.value)}
                 />
              )}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              +{remainingCount} more
            </span>
          )}
        </div>
      );
    }
    return selectedOptionsArray[0]?.label || <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>;
  };
  
  const uniqueId = useMemo(() => label ? label.replace(/\s+/g, '-').toLowerCase() + '-' + Math.random().toString(36).substring(7) : undefined, [label]);


  return (
    <div className={`relative w-full ${className}`} ref={selectRef}>
      {label && <label htmlFor={uniqueId} className={labelClassName}>{label}</label>}
      <button
        ref={buttonRef}
        type="button"
        id={uniqueId}
        disabled={disabled}
        className={`flex items-center justify-between w-full px-3 text-left bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[2.5rem] text-sm
                    ${disabled ? 'bg-gray-100 dark:bg-slate-900 cursor-not-allowed opacity-70' : 'hover:bg-gray-50 dark:hover:bg-slate-700'}
                    ${buttonClassName}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`flex-grow ${selectedOptionsArray.length > 0 && isMulti ? '' : 'truncate'}`}>
          {displayValue()}
        </span>
        <ChevronDownIcon className={`ml-2 w-5 h-5 text-gray-400 dark:text-gray-500 transform transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <ul
          ref={dropdownRef}
          className={`absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 shadow-lg rounded-md py-1 text-base ring-1 ring-black/5 dark:ring-white/10 overflow-auto focus:outline-none sm:text-sm ${dropdownClassName}`}
          style={{ top: '100%', maxHeight: '15rem' }} // Default position and max height, JS might adjust
          role="listbox"
        >
          {options.filter(opt => !opt.disabled).length === 0 ? (
            <li className="text-gray-500 dark:text-gray-400 cursor-default select-none relative py-2 px-4">
              No options available
            </li>
          ) : (
            options.map((option) => (
              <li
                key={option.value}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 group text-sm
                            ${option.disabled ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-600' : 
                              (isMulti && Array.isArray(value) && value.includes(option.value)) || (!isMulti && value === option.value)
                                ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-slate-700 font-medium' 
                                : 'text-gray-900 dark:text-gray-200 hover:bg-indigo-500 dark:hover:bg-indigo-600 hover:text-white dark:hover:text-white'}`}
                onClick={() => !option.disabled && handleOptionClick(option.value)}
                role="option"
                aria-selected={(isMulti && Array.isArray(value) ? value.includes(option.value) : value === option.value)}
                aria-disabled={option.disabled}
              >
                 <span className={`block truncate ${ (isMulti && Array.isArray(value) && value.includes(option.value)) || (!isMulti && value === option.value) ? 'font-semibold' : 'font-normal'}`}>
                  {option.label}
                </span>
                {((isMulti && Array.isArray(value) && value.includes(option.value)) || (!isMulti && value === option.value)) && !option.disabled && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600 dark:text-indigo-300 group-hover:text-white dark:group-hover:text-white">
                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;