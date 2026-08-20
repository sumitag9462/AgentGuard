import React from 'react';

type BadgeProps = {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'default';
  className?: string;
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] uppercase tracking-wider font-semibold font-mono';
  
  const variants = {
    success: 'bg-safe-muted text-safe border border-safe/20',
    danger: 'bg-critical-muted text-critical border border-critical/20',
    warning: 'bg-warning-muted text-warning border border-warning/20',
    info: 'bg-info-muted text-info border border-info/20',
    default: 'bg-panel-hover text-content-secondary border border-border-strong',
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
