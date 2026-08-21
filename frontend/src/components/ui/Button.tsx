import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  iconOnly?: boolean;
};

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  iconOnly = false,
  className = '', 
  disabled,
  ...props 
}: ButtonProps) {
  const baseClasses = `inline-flex items-center justify-center font-medium rounded-md 
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas
    disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed
    select-none touch-manipulation min-h-[44px] md:min-h-[32px]`;
  
  const variants: Record<string, string> = {
    primary: 'bg-content-primary text-content-inverse hover:bg-white shadow-sm',
    secondary: 'bg-panel-hover text-content-primary hover:bg-border-strong border border-border-subtle',
    ghost: 'bg-transparent text-content-secondary hover:text-content-primary hover:bg-panel-hover',
    danger: 'bg-critical-muted text-critical hover:bg-critical/20 border border-critical/20',
  };

  const sizes: Record<string, string> = {
    sm: `text-[12px] ${iconOnly ? 'p-1.5' : 'px-3 py-1'} gap-1.5`,
    md: `text-[13px] ${iconOnly ? 'p-2 md:p-1.5' : 'px-4 py-2 md:py-1.5'} gap-2`,
    lg: `text-[14px] ${iconOnly ? 'p-3 md:p-2.5' : 'px-6 py-3 md:py-2.5'} gap-2`,
  };

  return (
    <motion.button 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`} 
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.01 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      transition={{ duration: 0.1, ease: 'easeOut' }}
      {...props}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children as any}
    </motion.button>
  );
}
