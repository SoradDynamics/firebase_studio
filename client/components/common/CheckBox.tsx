// src/components/common/CustomCheckbox.tsx
import React from 'react';
import { CheckIcon } from '@heroicons/react/20/solid'; // Using a smaller check icon

interface CustomCheckboxProps {
  id?: string;
  label?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string; // For the wrapper div
  labelClassName?: string; // For the label text
  checkboxClassName?: string; // For the checkbox itself
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string; // For accessibility when no visible label
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  id,
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
  labelClassName = '',
  checkboxClassName = '',
  size = 'md',
  'aria-label': ariaLabel,
}) => {
  const uniqueId = id || React.useId();

  const sizeClasses = {
    sm: { box: 'h-4 w-4', icon: 'h-3 w-3', text: 'text-xs' },
    md: { box: 'h-5 w-5', icon: 'h-3.5 w-3.5', text: 'text-sm' }, // Default HeroUI Checkbox size
    lg: { box: 'h-6 w-6', icon: 'h-4 w-4', text: 'text-base' },
  };

  const currentSize = sizeClasses[size];

  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div className={`flex items-center ${className} ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`} onClick={handleToggle}>
      <button
        type="button"
        id={uniqueId}
        role="checkbox"
        aria-checked={checked}
        aria-labelledby={label ? `${uniqueId}-label` : undefined}
        aria-label={!label && ariaLabel ? ariaLabel : undefined} // Use aria-label if no visible label
        disabled={disabled}
        onClick={(e) => {
            e.stopPropagation(); // Prevent double toggle if div also has onClick
            handleToggle();
        }}
        className={`
          ${currentSize.box}
          flex-shrink-0 inline-flex items-center justify-center 
          border rounded 
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500
          transition-colors duration-150 ease-in-out
          ${
            checked
              ? 'bg-indigo-600 border-indigo-600 hover:bg-indigo-700'
              : 'bg-white border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'bg-gray-100 border-gray-200' : ''}
          ${checkboxClassName}
        `}
      >
        {/* Hidden input for native checkbox behavior if needed, but not strictly necessary for custom */}
        {/* <input type="checkbox" className="sr-only" checked={checked} onChange={() => {}} disabled={disabled} /> */}
        
        {checked && (
          <CheckIcon className={`${currentSize.icon} text-white`} />
        )}
      </button>
      {label && (
        <label
          htmlFor={uniqueId}
          id={`${uniqueId}-label`}
          className={`ml-2 ${currentSize.text} font-medium text-gray-700 ${labelClassName} ${disabled ? 'text-gray-400' : ''}`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default CustomCheckbox;