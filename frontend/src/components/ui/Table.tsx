import React from 'react';

export function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full text-left border-collapse">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-white/5 text-xs text-zinc-500 font-medium uppercase tracking-wider">
        {children}
      </tr>
    </thead>
  );
}

export function TableHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`pb-3 px-4 font-medium ${className}`}>{children}</th>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="text-sm text-zinc-300 divide-y divide-white/5">{children}</tbody>;
}

export function TableRow({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr 
      className={`group transition-colors duration-150 ease-ui-out ${onClick ? 'cursor-pointer hover:bg-white/2' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode; className?: string }) {
  return <td className={`py-4 px-4 ${className}`} {...props}>{children}</td>;
}
