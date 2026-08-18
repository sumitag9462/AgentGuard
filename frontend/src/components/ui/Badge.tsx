import React from 'react';

type BadgeProps = {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'default';
  className?: string;
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-mono';
  
  const variants = {
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    default: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
