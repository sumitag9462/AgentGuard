import { Card, CardHeader } from './Card';

export interface FailureHotspot {
  name: string;
  count: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export function FailureHotspotsWidget({ hotspots }: { hotspots: FailureHotspot[] }) {
  if (!hotspots || hotspots.length === 0) {
    return (
      <Card>
        <CardHeader title="Failure Hotspots" />
        <div className="pt-2">
          <div className="text-sm text-content-muted">
            No failure hotspots identified yet.
          </div>
        </div>
      </Card>
    );
  }

  const maxCount = Math.max(...hotspots.map(h => h.count), 1);

  return (
    <Card>
      <CardHeader title="Failure Hotspots" />
      <div className="pt-2 space-y-4">
        {hotspots.map((hotspot, idx) => {
          const percent = Math.round((hotspot.count / maxCount) * 100);
          
          let colorClass = 'bg-info';
          if (hotspot.severity === 'CRITICAL') colorClass = 'bg-critical';
          else if (hotspot.severity === 'HIGH') colorClass = 'bg-critical';
          else if (hotspot.severity === 'MEDIUM') colorClass = 'bg-warning';

          return (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-content-primary truncate" title={hotspot.name}>
                  {hotspot.name}
                </span>
                <span className="text-content-secondary tabular-nums font-medium">
                  {hotspot.count} failures
                </span>
              </div>
              <div className="w-full h-2 bg-panel rounded-full overflow-hidden">
                <div 
                  className={`h-full ${colorClass} rounded-full transition-all duration-500`} 
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="text-[10px] uppercase font-bold text-content-muted tracking-wider">
                Max Severity: {hotspot.severity}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
