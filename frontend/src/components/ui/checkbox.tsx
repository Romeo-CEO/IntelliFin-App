'use client';

import React, { useState } from 'react';

export interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

/**
 * Checkbox component for boolean inputs
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  checked: controlledChecked,
  onCheckedChange,
  disabled = false,
  className = '',
  id,
  name,
}) => {
  const [internalChecked, setInternalChecked] = useState(false);
  
  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : internalChecked;

  const handleChange = () => {
    if (disabled) return;
    
    const newChecked = !checked;
    
    if (!isControlled) {
      setInternalChecked(newChecked);
    }
    
    onCheckedChange?.(newChecked);
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      id={id}
      disabled={disabled}
      className={`
        peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-white 
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 
        focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white'}
        ${className}
      `}
      onClick={handleChange}
    >
      {checked && (
        <svg
          className="h-4 w-4 text-current"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {/* Hidden input for form compatibility */}
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {}} // Controlled by button click
        name={name}
        className="sr-only"
        tabIndex={-1}
      />
    </button>
  );
};
