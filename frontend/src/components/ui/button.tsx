import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  children: React.ReactNode;
}

/**
 * Button component with multiple variants and sizes
 */
export const Button: React.FC<ButtonProps> = ({
  className = '',
  variant = 'default',
  size = 'default',
  asChild = false,
  children,
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background';

  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    ghost: 'text-gray-700 hover:bg-gray-100',
    link: 'text-blue-600 underline-offset-4 hover:underline',
  };

  const sizeClasses = {
    default: 'h-10 py-2 px-4',
    sm: 'h-9 px-3 rounded-md',
    lg: 'h-11 px-8 rounded-md',
    icon: 'h-10 w-10',
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `.trim();

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      className: classes,
      ...props,
    });
  }

  return (
    <button
      className={classes}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
