import React from 'react';
import { SkeletonTable } from './Skeleton';
import { EmptyState } from './EmptyState';

export function Table({ 
  children, 
  className = '',
  loading = false,
  empty = false,
  emptyProps,
  loadingRows = 5,
  cols = 4,
}: { 
  children?: React.ReactNode; 
  className?: string;
  loading?: boolean;
  empty?: boolean;
  emptyProps?: { title: string; description?: string; icon?: React.ReactNode };
  loadingRows?: number;
  cols?: number;
}) {
  if (loading) {
    return (
      <div className={`w-full overflow-hidden border border-border-subtle rounded-md bg-canvas ${className}`}>
        <SkeletonTable rows={loadingRows} cols={cols} />
      </div>
    );
  }

  if (empty && emptyProps) {
    return (
      <div className={`w-full overflow-hidden border border-border-subtle rounded-md bg-canvas ${className}`}>
        <EmptyState {...emptyProps} />
      </div>
    );
  }

  return (
    <div className={`w-full overflow-x-auto border border-border-subtle rounded-md bg-canvas ${className}`}>
      <table className="w-full text-left border-collapse border-spacing-0">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="bg-panel border-b border-border-strong">
        {children}
      </tr>
    </thead>
  );
}

export function TableHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`data-table-header whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wider text-content-muted ${className}`}>{children}</th>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="text-body-sm text-content-primary">{children}</tbody>;
}

export function TableRow({ 
  children, 
  className = '', 
  onClick 
}: { 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void;
}) {
  const isClickable = !!onClick;
  
  return (
    <tr 
      className={`group transition-colors duration-150 ease-ui-out border-b border-border-subtle last:border-b-0
        ${isClickable ? 'cursor-pointer hover:bg-panel-hover focus-within:bg-panel-hover focus-visible:outline-none focus-visible:bg-panel-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus' : ''} 
        ${className}`}
      onClick={onClick}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={e => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode; className?: string }) {
  return <td className={`data-table-cell px-4 py-3 align-middle ${className}`} {...props}>{children}</td>;
}
