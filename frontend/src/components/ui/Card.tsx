import React, { useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  children: React.ReactNode;
  variant?: 'default' | 'subtle' | 'raised' | 'focused';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function Card({ 
  children, 
  variant = 'default',
  collapsible = false,
  defaultCollapsed = false,
  title,
  description,
  action,
  className = '', 
  ...props 
}: CardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const variants = {
    default: 'surface-panel',
    subtle: 'bg-canvas border border-border-subtle rounded-md',
    raised: 'surface-raised',
    focused: 'bg-panel border border-border-focus rounded-md shadow-glow-safe',
  };

  return (
    <div className={`flex flex-col overflow-hidden ${variants[variant]} ${className}`} {...props}>
      {(title || collapsible) && (
        <CardHeader 
          title={title!} 
          description={description} 
          action={action}
          collapsible={collapsible}
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
      )}
      
      <div className={`p-6 pt-0 transition-all duration-300 ${
        isCollapsed ? 'hidden' : 'block'
      } ${(title || collapsible) ? 'pt-0' : 'pt-6'}`}>
        {children}
      </div>
    </div>
  );
}

export function CardHeader({ 
  title, 
  description, 
  action,
  collapsible,
  isCollapsed,
  onToggle
}: { 
  title: React.ReactNode; 
  description?: React.ReactNode; 
  action?: React.ReactNode;
  collapsible?: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className={`flex justify-between items-start p-6 pb-4 ${isCollapsed ? 'pb-6' : ''}`}>
      <div>
        {typeof title === 'string' ? (
          <h3 className="text-h3 text-content-primary">{title}</h3>
        ) : title}
        {description && (
          <p className="text-body-sm text-content-secondary mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {action && <div>{action}</div>}
        {collapsible && (
          <button 
            onClick={onToggle}
            className="p-1.5 text-content-muted hover:text-content-primary hover:bg-panel-hover rounded-sm transition-colors"
          >
            {isCollapsed ? <CaretDown className="w-4 h-4" /> : <CaretUp className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
