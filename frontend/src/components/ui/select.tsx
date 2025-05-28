'use client';

import React, { createContext, useContext, useState } from 'react';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

export interface SelectProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

export interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  placeholder?: string;
}

export interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

/**
 * Select root component
 */
export const Select: React.FC<SelectProps> = ({
  children,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [open, setOpen] = useState(false);

  const currentValue = value !== undefined ? value : internalValue;

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };

  const contextValue = {
    value: currentValue,
    onValueChange: handleValueChange,
    open,
    setOpen: disabled ? () => {} : setOpen,
  };

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

/**
 * Select trigger component
 */
export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  className = '',
  placeholder,
}) => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('SelectTrigger must be used within a Select component');
  }

  const { open, setOpen } = context;

  return (
    <button
      type="button"
      className={`
        flex h-10 w-full items-center justify-between rounded-md border border-gray-300 
        bg-white px-3 py-2 text-sm placeholder:text-gray-500 
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
      onClick={() => setOpen(!open)}
    >
      {children}
      <svg
        className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
};

/**
 * Select content component
 */
export const SelectContent: React.FC<SelectContentProps> = ({
  children,
  className = '',
}) => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('SelectContent must be used within a Select component');
  }

  const { open } = context;

  if (!open) return null;

  return (
    <div
      className={`
        absolute top-full z-50 mt-1 w-full rounded-md border border-gray-200 
        bg-white shadow-lg
        ${className}
      `}
    >
      <div className="max-h-60 overflow-auto p-1">
        {children}
      </div>
    </div>
  );
};

/**
 * Select item component
 */
export const SelectItem: React.FC<SelectItemProps> = ({
  children,
  value,
  className = '',
}) => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('SelectItem must be used within a Select component');
  }

  const { value: selectedValue, onValueChange } = context;
  const isSelected = selectedValue === value;

  return (
    <div
      className={`
        relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm 
        outline-none hover:bg-gray-100 focus:bg-gray-100
        ${isSelected ? 'bg-blue-100 text-blue-900' : ''}
        ${className}
      `}
      onClick={() => onValueChange(value)}
    >
      {children}
      {isSelected && (
        <span className="absolute right-2 h-3.5 w-3.5">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </span>
      )}
    </div>
  );
};

/**
 * Select value component
 */
export const SelectValue: React.FC<SelectValueProps> = ({
  placeholder = 'Select an option...',
  className = '',
}) => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('SelectValue must be used within a Select component');
  }

  const { value } = context;

  return (
    <span className={`block truncate ${!value ? 'text-gray-500' : ''} ${className}`}>
      {value || placeholder}
    </span>
  );
};
