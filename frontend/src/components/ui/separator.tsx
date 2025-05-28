import React from 'react';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * Separator component for visual separation
 */
export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  className = '',
}) => {
  const orientationClasses = {
    horizontal: 'h-px w-full',
    vertical: 'w-px h-full',
  };

  return (
    <div
      className={`
        bg-gray-200
        ${orientationClasses[orientation]}
        ${className}
      `}
    />
  );
};
