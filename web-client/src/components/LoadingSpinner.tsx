import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  centered?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', centered = false }) => {
  const spinnerClass = size === 'lg' ? 'spinner spinner-lg' : 'spinner';
  
  const spinnerElement = <div className={spinnerClass} />;

  if (centered) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'var(--spacing-xl)', width: '100%', minHeight: '200px' }}>
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
};

export default LoadingSpinner;
