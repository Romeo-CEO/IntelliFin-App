import React from 'react';

export interface ProgressProps {
  value?: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
}

/**
 * Progress component for showing completion status
 */
export const Progress: React.FC<ProgressProps> = ({
  value = 0,
  max = 100,
  className = '',
  indicatorClassName = '',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={`
        relative h-4 w-full overflow-hidden rounded-full bg-gray-200
        ${className}
      `}
    >
      <div
        className={`
          h-full w-full flex-1 bg-blue-600 transition-all duration-300 ease-in-out
          ${indicatorClassName}
        `}
        style={{
          transform: `translateX(-${100 - percentage}%)`,
        }}
      />
    </div>
  );
};
