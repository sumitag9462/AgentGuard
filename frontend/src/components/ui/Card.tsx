import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`glass-panel p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <h3 className="text-base font-semibold text-content-primary tracking-tight">{title}</h3>
        {description && <p className="text-[13px] text-content-secondary mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
