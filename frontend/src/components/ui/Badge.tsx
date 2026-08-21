import React from 'react';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'default' | 'accent';

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  icon?: React.ReactNode;
  dot?: boolean;
  size?: 'sm' | 'md';
};

const variants: Record<BadgeVariant, string> = {
  success: 'bg-safe-muted text-safe border-safe/20',
  danger: 'bg-critical-muted text-critical border-critical/20',
  warning: 'bg-warning-muted text-warning border-warning/20',
  info: 'bg-info-muted text-info border-info/20',
  accent: 'bg-accent-muted text-accent border-accent/20',
  default: 'bg-panel-hover text-content-secondary border-border-strong',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-safe',
  danger: 'bg-critical',
  warning: 'bg-warning',
  info: 'bg-info',
  accent: 'bg-accent',
  default: 'bg-content-muted',
};

export function Badge({ 
  children, 
  variant = 'default', 
  className = '',
  icon,
  dot = false,
  size = 'md',
}: BadgeProps) {
  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-1.5 py-0 gap-1' 
    : 'text-[11px] px-2 py-0.5 gap-1.5';

  return (
    <span className={`
      inline-flex items-center rounded-sm
      uppercase tracking-wider font-semibold font-mono
      border whitespace-nowrap
      ${sizeClasses}
      ${variants[variant]} 
      ${className}
    `}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} shrink-0`} />
      )}
      {icon && <span className="shrink-0 [&>svg]:w-3 [&>svg]:h-3">{icon}</span>}
      {children}
    </span>
  );
}

// Convenience for severity badges used across the app
export function SeverityBadge({ severity }: { severity: string }) {
  const variant: BadgeVariant = 
    severity === 'CRITICAL' ? 'danger' :
    severity === 'HIGH' ? 'warning' :
    severity === 'MEDIUM' ? 'info' :
    'default';
  
  return <Badge variant={variant} dot>{severity}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const variant: BadgeVariant = 
    status === 'COMPLETED' || status === 'PASSED' || status === 'Healthy' ? 'success' :
    status === 'FAILED' || status === 'Offline' ? 'danger' :
    status === 'RUNNING' || status === 'PENDING' || status === 'Degraded' ? 'warning' :
    'default';
  
  return <Badge variant={variant} dot>{status}</Badge>;
}
