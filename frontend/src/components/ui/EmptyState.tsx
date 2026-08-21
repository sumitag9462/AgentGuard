import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      {icon && (
        <div className="mb-4 text-content-muted [&>svg]:w-10 [&>svg]:h-10">
          {icon}
        </div>
      )}
      <h3 className="text-h3 text-content-secondary mb-1">{title}</h3>
      {description && (
        <p className="text-body-sm text-content-muted max-w-md">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <Button variant={action.variant || 'secondary'} onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
