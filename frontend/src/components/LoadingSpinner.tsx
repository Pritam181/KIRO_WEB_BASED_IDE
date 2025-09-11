import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`} data-testid="loading-spinner">
      <Loader2 className={`animate-spin ${sizeClasses[size]} text-blue-600`} />
      {text && (
        <span className="text-sm text-gray-600 dark:text-gray-300">{text}</span>
      )}
    </div>
  );
};

export const LoadingPage: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
};