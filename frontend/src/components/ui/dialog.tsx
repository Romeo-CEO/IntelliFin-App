'use client';

import React, { createContext, useContext, useState } from 'react';

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Dialog root component
 */
export const Dialog: React.FC<DialogProps> = ({
  children,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

/**
 * Dialog trigger component
 */
export const DialogTrigger: React.FC<DialogTriggerProps> = ({
  children,
  asChild = false,
}) => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('DialogTrigger must be used within a Dialog');
  }

  const { setOpen } = context;

  const handleClick = () => {
    setOpen(true);
  };

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick,
    });
  }

  return (
    <button onClick={handleClick}>
      {children}
    </button>
  );
};

/**
 * Dialog content component
 */
export const DialogContent: React.FC<DialogContentProps> = ({
  children,
  className = '',
}) => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('DialogContent must be used within a Dialog');
  }

  const { open, setOpen } = context;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={() => setOpen(false)}
      />
      
      {/* Dialog */}
      <div
        className={`
          relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Dialog header component
 */
export const DialogHeader: React.FC<DialogHeaderProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Dialog title component
 */
export const DialogTitle: React.FC<DialogTitleProps> = ({
  children,
  className = '',
}) => {
  return (
    <h2 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h2>
  );
};

/**
 * Dialog description component
 */
export const DialogDescription: React.FC<DialogDescriptionProps> = ({
  children,
  className = '',
}) => {
  return (
    <p className={`text-sm text-gray-600 mt-2 ${className}`}>
      {children}
    </p>
  );
};
