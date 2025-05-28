'use client';

import React, { createContext, useContext, useState } from 'react';

interface AlertDialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextType | undefined>(undefined);

export interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface AlertDialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export interface AlertDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface AlertDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface AlertDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export interface AlertDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export interface AlertDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export interface AlertDialogActionProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface AlertDialogCancelProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * Alert dialog root component
 */
export const AlertDialog: React.FC<AlertDialogProps> = ({
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
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
};

/**
 * Alert dialog trigger component
 */
export const AlertDialogTrigger: React.FC<AlertDialogTriggerProps> = ({
  children,
  asChild = false,
}) => {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error('AlertDialogTrigger must be used within an AlertDialog');
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
 * Alert dialog content component
 */
export const AlertDialogContent: React.FC<AlertDialogContentProps> = ({
  children,
  className = '',
}) => {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error('AlertDialogContent must be used within an AlertDialog');
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
          relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Alert dialog header component
 */
export const AlertDialogHeader: React.FC<AlertDialogHeaderProps> = ({
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
 * Alert dialog title component
 */
export const AlertDialogTitle: React.FC<AlertDialogTitleProps> = ({
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
 * Alert dialog description component
 */
export const AlertDialogDescription: React.FC<AlertDialogDescriptionProps> = ({
  children,
  className = '',
}) => {
  return (
    <p className={`text-sm text-gray-600 mt-2 ${className}`}>
      {children}
    </p>
  );
};

/**
 * Alert dialog footer component
 */
export const AlertDialogFooter: React.FC<AlertDialogFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`flex justify-end space-x-2 mt-6 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Alert dialog action button component
 */
export const AlertDialogAction: React.FC<AlertDialogActionProps> = ({
  children,
  onClick,
  className = '',
}) => {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error('AlertDialogAction must be used within an AlertDialog');
  }

  const { setOpen } = context;

  const handleClick = () => {
    onClick?.();
    setOpen(false);
  };

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 ${className}`}
    >
      {children}
    </button>
  );
};

/**
 * Alert dialog cancel button component
 */
export const AlertDialogCancel: React.FC<AlertDialogCancelProps> = ({
  children,
  onClick,
  className = '',
}) => {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error('AlertDialogCancel must be used within an AlertDialog');
  }

  const { setOpen } = context;

  const handleClick = () => {
    onClick?.();
    setOpen(false);
  };

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 ${className}`}
    >
      {children}
    </button>
  );
};
