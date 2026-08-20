import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center px-4 py-1.5 text-[13px] font-medium rounded-md transition-all duration-150 ease-ui-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-safe disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-content-primary text-zinc-950 hover:bg-white',
    secondary: 'bg-panel-hover text-content-primary hover:bg-border-strong border border-border-subtle',
    ghost: 'bg-transparent text-content-secondary hover:text-content-primary hover:bg-panel-hover',
    danger: 'bg-critical-muted text-critical hover:bg-critical/20 border border-critical/20',
  };

  return (
    <button className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
