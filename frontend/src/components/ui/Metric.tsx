import React from 'react';

interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  delta?: string | number;
  status?: 'safe' | 'warning' | 'critical' | 'neutral';
  className?: string;
  valueClassName?: string;
  icon?: React.ReactNode;
}

export function Metric({ 
  label, 
  value, 
  unit, 
  trend, 
  delta, 
  status = 'neutral',
  className = '',
  valueClassName = '',
  icon
}: MetricProps) {
  const statusColors = {
    safe: 'text-safe',
    warning: 'text-warning',
    critical: 'text-critical',
    neutral: 'text-content-primary',
  };

  const deltaColors = {
    up: status === 'safe' ? 'text-safe' : status === 'critical' ? 'text-critical' : 'text-safe',
    down: status === 'safe' ? 'text-safe' : status === 'critical' ? 'text-critical' : 'text-critical',
    neutral: 'text-content-secondary',
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex justify-between items-center text-label text-content-muted">
        <span className="flex items-center gap-1.5">
          {icon && <span className="w-3.5 h-3.5">{icon}</span>}
          {label}
        </span>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className={`text-kpi ${statusColors[status]} ${valueClassName}`}>
          {value}
        </span>
        {unit && <span className="text-body-sm font-medium text-content-secondary">{unit}</span>}
      </div>
      
      {(trend || delta) && (
        <div className={`text-caption font-medium flex items-center gap-1 ${trend ? deltaColors[trend] : ''}`}>
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
          {trend === 'neutral' && '→'}
          {delta && <span>{delta}</span>}
        </div>
      )}
    </div>
  );
}
