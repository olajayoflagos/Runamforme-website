import React from 'react';
import { Spinner } from 'react-bootstrap';

interface LoadingSpinnerProps {
  fullPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  fullPage = false, 
  size = 'md',
  message 
}) => {
  const sizeClasses = {
    sm: { spinner: '', container: 'py-2' },
    md: { spinner: '', container: 'py-3' },
    lg: { spinner: 'w-3rem h-3rem', container: 'py-4' }
  };

  return (
    <div 
      className={`d-flex flex-column justify-content-center align-items-center ${
        fullPage ? 'min-vh-100 bg-light' : sizeClasses[size].container
      }`}
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner 
        animation="border" 
        role="status"
        className={`text-primary ${sizeClasses[size].spinner}`}
        style={size === 'lg' ? { width: '3rem', height: '3rem' } : undefined}
      >
        <span className="visually-hidden">Loading content...</span>
      </Spinner>
      {message && (
        <p className="mt-2 mb-0 text-primary fw-medium">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;