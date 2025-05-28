'use client';

import React, { createContext, useContext, useState } from 'react';

interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextType | undefined>(undefined);

export interface DropdownMenuProps {
  children: React.ReactNode;
}

export interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

export interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export interface DropdownMenuSeparatorProps {
  className?: string;
}

/**
 * Dropdown menu root component
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

/**
 * Dropdown menu trigger component
 */
export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({
  children,
  asChild = false,
  className = '',
}) => {
  const context = useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenuTrigger must be used within a DropdownMenu');
  }

  const { open, setOpen } = context;

  const handleClick = () => {
    setOpen(!open);
  };

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick,
      className: `${(children as React.ReactElement).props.className || ''} ${className}`,
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
    >
      {children}
    </button>
  );
};

/**
 * Dropdown menu content component
 */
export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  children,
  className = '',
  align = 'start',
}) => {
  const context = useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenuContent must be used within a DropdownMenu');
  }

  const { open, setOpen } = context;

  if (!open) return null;

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => setOpen(false)}
      />
      
      {/* Menu */}
      <div
        className={`
          absolute z-50 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5
          ${alignmentClasses[align]}
          ${className}
        `}
      >
        <div className="py-1" role="menu">
          {children}
        </div>
      </div>
    </>
  );
};

/**
 * Dropdown menu item component
 */
export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
}) => {
  const context = useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenuItem must be used within a DropdownMenu');
  }

  const { setOpen } = context;

  const handleClick = () => {
    if (!disabled) {
      onClick?.();
      setOpen(false);
    }
  };

  return (
    <button
      type="button"
      className={`
        w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      role="menuitem"
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

/**
 * Dropdown menu separator component
 */
export const DropdownMenuSeparator: React.FC<DropdownMenuSeparatorProps> = ({
  className = '',
}) => {
  return <div className={`border-t border-gray-100 my-1 ${className}`} />;
};
