// src/components/common/StudentAutocomplete.tsx (NEW - Example)
import React, { useState, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react'; // Using Headless UI as an example
import { CheckIcon, ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { StudentWithDetails } from 'types/review'; // Adjust path as needed
import { Spinner } from '@heroui/react'; // Assuming Spinner from HeroUI

interface StudentAutocompleteProps {
  students: StudentWithDetails[]; // Options to display
  selectedStudent: StudentWithDetails | null;
  onSelectStudent: (student: StudentWithDetails | null) => void;
  onQueryChange: (query: string) => void; // To trigger search in store
  placeholder?: string;
  isLoading?: boolean;
  currentSearchTerm: string; // To control the input field's value
}

const StudentAutocomplete: React.FC<StudentAutocompleteProps> = ({
  students,
  selectedStudent,
  onSelectStudent,
  onQueryChange,
  placeholder = "Search and select student...",
  isLoading = false,
  currentSearchTerm,
}) => {
  // The `query` state in Combobox is internal for its filtering.
  // We use `onQueryChange` to sync it with the Zustand store's `studentSearchTerm`.

  return (
    <Combobox value={selectedStudent} onChange={onSelectStudent} nullable>
      <div className="relative mt-1">
        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-300 sm:text-sm">
          <MagnifyingGlassIcon
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <Combobox.Input
            className="w-full border-none py-2.5 pl-10 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
            displayValue={(student: StudentWithDetails | null) => student?.name || currentSearchTerm || ''}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            value={currentSearchTerm} // Control input value from store's search term
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            {isLoading ? (
                 <Spinner size="sm" className="h-5 w-5 text-gray-400" />
            ) : (
                <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
                />
            )}
          </Combobox.Button>
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          // afterLeave={() => onQueryChange('')} // Optional: clear query on close if desired
        >
          <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
            {students.length === 0 && currentSearchTerm !== '' && !isLoading ? (
              <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                No students found.
              </div>
            ) : null}
             {students.length === 0 && currentSearchTerm === '' && !isLoading ? (
              <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                Type to search for students.
              </div>
            ) : null}

            {students.map((student) => (
              <Combobox.Option
                key={student.$id}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                  }`
                }
                value={student}
              >
                {({ selected, active }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? 'font-medium' : 'font-normal'
                      }`}
                    >
                      {student.name} ({student.class} - {student.sectionName || 'Sec ?'})
                    </span>
                    {selected ? (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? 'text-white' : 'text-indigo-600'
                        }`}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Transition>
      </div>
    </Combobox>
  );
};

export default StudentAutocomplete;