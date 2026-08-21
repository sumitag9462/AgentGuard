import React from 'react';

interface SectionProps {
  children: React.ReactNode;
  variant?: 'panel' | 'raised' | 'inset' | 'transparent';
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Section({ 
  children, 
  variant = 'transparent', 
  padding = 'md',
  className = '' 
}: SectionProps) {
  const variants = {
    panel: 'surface-panel',
    raised: 'surface-raised',
    inset: 'surface-inset',
    transparent: 'bg-transparent',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`${variants[variant]} ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 ${className}`}>
      <div>
        <h3 className="text-h3 text-content-primary">{title}</h3>
        {description && <p className="text-body-sm text-content-secondary mt-1">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
