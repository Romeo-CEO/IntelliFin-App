import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

/**
 * Skeleton component for loading states
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
}) => {
  const style: React.CSSProperties = {};
  
  if (width) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  
  if (height) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      style={style}
    />
  );
};
