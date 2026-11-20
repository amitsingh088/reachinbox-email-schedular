import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap: Record<string, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
}) => {
  return (
    <div
      className={`${sizeMap[size]} animate-spin rounded-full border-2 border-gray-200 border-t-primary-600 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};
