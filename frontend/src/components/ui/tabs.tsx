'use client';

import React, { createContext, useContext, useState } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export interface TabsTriggerProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
}

export interface TabsContentProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

/**
 * Tabs root component
 */
export const Tabs: React.FC<TabsProps> = ({
  children,
  defaultValue = '',
  className = '',
  value,
  onValueChange
}) => {
  const [activeTab, setActiveTab] = useState(value || defaultValue);

  const handleTabChange = (newValue: string) => {
    if (!value) {
      setActiveTab(newValue);
    }
    onValueChange?.(newValue);
  };

  const contextValue = {
    activeTab: value || activeTab,
    setActiveTab: handleTabChange,
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={`tabs ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

/**
 * Tabs list component (container for tab triggers)
 */
export const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex border-b border-gray-200 ${className}`} role="tablist">
      {children}
    </div>
  );
};

/**
 * Tab trigger component (clickable tab button)
 */
export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  children,
  value,
  className = '',
  disabled = false
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsTrigger must be used within a Tabs component');
  }

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      className={`
        px-4 py-2 text-sm font-medium border-b-2 transition-colors
        ${isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onClick={() => !disabled && setActiveTab(value)}
    >
      {children}
    </button>
  );
};

/**
 * Tab content component (content panel for each tab)
 */
export const TabsContent: React.FC<TabsContentProps> = ({
  children,
  value,
  className = ''
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsContent must be used within a Tabs component');
  }

  const { activeTab } = context;

  if (activeTab !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      className={`mt-4 ${className}`}
    >
      {children}
    </div>
  );
};
