type StatusLevel = 'safe' | 'warning' | 'critical' | 'info' | 'neutral';

interface StatusIndicatorProps {
  status: StatusLevel;
  label?: string;
  pulse?: boolean;
  className?: string;
}

const statusConfig: Record<StatusLevel, { bg: string, ring: string, text: string }> = {
  safe: { bg: 'bg-safe', ring: 'ring-safe/20', text: 'text-safe' },
  warning: { bg: 'bg-warning', ring: 'ring-warning/20', text: 'text-warning' },
  critical: { bg: 'bg-critical', ring: 'ring-critical/20', text: 'text-critical' },
  info: { bg: 'bg-info', ring: 'ring-info/20', text: 'text-info' },
  neutral: { bg: 'bg-content-muted', ring: 'ring-content-muted/20', text: 'text-content-secondary' },
};

export function StatusIndicator({ status, label, pulse = false, className = '' }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2 w-2 shrink-0">
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.bg}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.bg} ring-4 ${config.ring}`} />
      </span>
      {label && <span className={`text-label ${config.text}`}>{label}</span>}
    </div>
  );
}
