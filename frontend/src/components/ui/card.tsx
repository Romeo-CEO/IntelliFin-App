import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  onClick?: () => void;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card component for displaying content in a contained layout
 */
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  description,
  onClick
}) => {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {(title || description) && (
        <div className="p-6 pb-0">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>
      )}
      {children}
    </Component>
  );
};

/**
 * Card header component
 */
export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`p-6 pb-0 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Card content component
 */
export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Card footer component
 */
export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`p-6 pt-0 border-t border-gray-200 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Card title component
 */
export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '' }) => {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  );
};

/**
 * Card description component
 */
export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className = '' }) => {
  return (
    <p className={`text-sm text-gray-600 ${className}`}>
      {children}
    </p>
  );
};
