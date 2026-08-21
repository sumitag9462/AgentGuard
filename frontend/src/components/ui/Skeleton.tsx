interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'heading' | 'block' | 'circle' | 'custom';
  width?: string;
  height?: string;
  count?: number;
}

export function Skeleton({ 
  className = '', 
  variant = 'text', 
  width, 
  height,
  count = 1 
}: SkeletonProps) {
  const variantClasses: Record<string, string> = {
    text: 'h-3.5 rounded-sm',
    heading: 'h-6 rounded-sm',
    block: 'h-20 rounded-md',
    circle: 'rounded-full',
    custom: '',
  };

  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={`skeleton ${variantClasses[variant]} ${className}`}
          style={{ width, height }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

// Common patterns
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border-strong">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${60 + Math.random() * 40}px`} className="opacity-30" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 px-4 py-3 border-b border-border-subtle">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} variant="text" width={`${40 + Math.random() * 80}px`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      <Skeleton variant="heading" width="60%" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="block" />
    </div>
  );
}
