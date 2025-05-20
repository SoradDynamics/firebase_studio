// src/components/CheckboxSelect.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { useClickAway } from '@uidotdev/usehooks'; // Or implement your own click-away logic

interface Option {
    id: string; // Unique identifier for the option
    name: string; // Display name for the option
    disabled?: boolean; // Optional: if a specific option should be disabled
}

interface CheckboxSelectProps {
    label: string;
    options: Option[]; // The list of available options
    selectedValues: string[]; // Array of selected option IDs
    onValueChange: (values: string[]) => void; // Callback with the new array of selected IDs
    placeholder?: string;
    className?: string;
    disabled?: boolean; // Disables the entire select component
    hasAllOption?: boolean; // Whether to include an "All" option
}

// Use a unique ID for the "All" option to avoid clashes
const ALL_OPTION_ID = '__all__';

const CheckboxSelect: React.FC<CheckboxSelectProps> = ({
    label,
    options,
    selectedValues,
    onValueChange,
    placeholder = "Select items",
    className = '',
    disabled = false,
    hasAllOption = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useClickAway<HTMLDivElement>(() => {
        setIsOpen(false);
    });

    // Combine 'All' option with provided options
    const finalOptions = useMemo(() => {
        let list = options;
        if (hasAllOption) {
            // Add the 'All' option at the beginning
            list = [{ id: ALL_OPTION_ID, name: `All ${label}`, disabled: false }, ...options];
        }
        return list;
    }, [options, hasAllOption, label]);

    // Determine if 'All' is currently selected
    const isAllSelected = selectedValues.includes(ALL_OPTION_ID);

    const handleToggle = () => {
        if (!disabled) {
            setIsOpen((prev) => !prev);
        }
    };

    const handleCheckboxChange = (option: Option) => {
        if (option.disabled || disabled) return; // Do nothing if option or select is disabled

        const currentId = option.id;
        let newSelectedValues: string[];

        if (currentId === ALL_OPTION_ID) {
            // If 'All' is checked
            if (isAllSelected) {
                // If 'All' was already selected, unchecking it clears all selections
                newSelectedValues = [];
            } else {
                // If 'All' was not selected, selecting it selects only 'All'
                newSelectedValues = [ALL_OPTION_ID];
            }
        } else {
            // If a specific option is checked/unchecked
            if (isAllSelected) {
                // If 'All' was selected, unchecking it means start selecting specific items
                // The new list starts with the previously selected specific item if it exists
                // + the newly toggled item, removing 'All'.
                 const currentlySelectedSpecific = options // Filter from original options, not finalOptions
                     .filter(opt => selectedValues.includes(opt.id) && opt.id !== ALL_OPTION_ID)
                     .map(opt => opt.id);

                 newSelectedValues = currentlySelectedSpecific.includes(currentId)
                     ? currentlySelectedSpecific.filter(id => id !== currentId)
                     : [...currentlySelectedSpecific, currentId];

            } else {
                 // If 'All' was NOT selected, just toggle the specific item
                 newSelectedValues = selectedValues.includes(currentId)
                     ? selectedValues.filter((id) => id !== currentId)
                     : [...selectedValues, currentId];
            }

             // If all specific options are now selected, automatically select 'All'
            const allSpecificOptionIds = options.map(opt => opt.id);
            if (newSelectedValues.length > 0 && allSpecificOptionIds.length > 0 &&
                 allSpecificOptionIds.every(id => newSelectedValues.includes(id))) {
                 // This is a bit complex to automatically select 'All' when all specifics are checked.
                 // Let's simplify: Don't auto-select 'All'. The user must click 'All' to select it.
                 // If user unchecks all specific items, the array becomes empty.
            }
        }

        // Ensure 'all-option' isn't mixed with other options unless specifically handled by the above logic (only happens when unchecking from 'all')
        // A simpler rule: If 'all-option' is in the new array, it should be the *only* item.
        if (newSelectedValues.includes(ALL_OPTION_ID) && newSelectedValues.length > 1) {
             newSelectedValues = [ALL_OPTION_ID];
        }


        onValueChange(newSelectedValues); // Pass the updated array of IDs (which can contain ALL_OPTION_ID)
    };

     // Text to display in the button
     const buttonDisplayText = useMemo(() => {
        if (selectedValues.length === 0) {
            return placeholder;
        }
        if (isAllSelected) {
             return `All ${label} Selected`; // More descriptive if 'All' is checked
        }
         // Filter out the 'All' option ID just in case
        const selectedSpecificOptions = options.filter(opt => selectedValues.includes(opt.id) && opt.id !== ALL_OPTION_ID);

        if (selectedSpecificOptions.length === 0) {
            return placeholder; // Should not happen if selectedValues isn't empty but contains no valid specific IDs
        }
        if (selectedSpecificOptions.length === 1) {
            return selectedSpecificOptions[0].name;
        }
        return `${selectedSpecificOptions.length} ${label} Selected`;
     }, [selectedValues, options, placeholder, label, isAllSelected]);


    return (
        <div className={`relative ${className}`} ref={ref}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            <button
                type="button"
                className={`relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                onClick={handleToggle}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                disabled={disabled}
            >
                <span className={`block truncate ${selectedValues.length === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
                    {buttonDisplayText}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
            </button>

            {isOpen && !disabled && (
                <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg max-h-60 overflow-auto ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    <ul
                        className="py-1"
                        role="listbox"
                        aria-labelledby={label.replace(/\s+/g, '-').toLowerCase()} // Simple ID generation
                    >
                        {finalOptions.length === 0 ? (
                             <li className="text-gray-500 text-center py-2">No options available</li>
                        ) : (
                            finalOptions.map((option) => (
                                <li
                                    key={option.id}
                                    className={`relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-indigo-600 hover:text-white ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    onClick={() => handleCheckboxChange(option)}
                                    aria-disabled={option.disabled}
                                >
                                    <div className="flex items-center">
                                        <input
                                            id={`checkbox-${option.id}`}
                                            name={`${label}-checkbox-${option.id}`}
                                            type="checkbox"
                                            checked={selectedValues.includes(option.id)}
                                            onChange={() => handleCheckboxChange(option)}
                                            className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${option.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                            // Prevent click on checkbox from closing the dropdown immediately
                                            onClick={(e) => e.stopPropagation()}
                                             disabled={option.disabled}
                                        />
                                        <label
                                            htmlFor={`checkbox-${option.id}`}
                                            className={`ml-3 block text-sm cursor-pointer flex-grow ${option.disabled ? 'cursor-not-allowed' : ''}`}
                                        >
                                            {option.name}
                                        </label>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default CheckboxSelect;