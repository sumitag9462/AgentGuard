
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Heartbeat, ShieldCheck, WifiHigh, WifiNone, Plugs } from '@phosphor-icons/react';
import type { AgentIntegration, ConnectionStatus } from '../../types';

interface Props {
  integration?: AgentIntegration;
  status?: ConnectionStatus;
  lastChecked?: string;
}

export function ConnectionHealthPanel({ integration, status = 'DISABLED', lastChecked }: Props) {
  if (!integration || integration.type === 'INTERNAL') {
    return (
      <Card className="flex items-center justify-between p-4 bg-panel border-border-subtle">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-surface border border-border-subtle rounded-md">
            <Heartbeat className="w-5 h-5 text-content-muted" />
          </div>
          <div>
            <h4 className="font-medium text-content-primary">Internal Agent</h4>
            <p className="text-xs text-content-muted">Running in AgentGuard sandbox</p>
          </div>
        </div>
        <Badge variant="default">Simulated</Badge>
      </Card>
    );
  }

  const isConnected = status === 'CONNECTED';
  const isWarning = status === 'DEGRADED' || status === 'TELEMETRY_DISCONNECTED';

  return (
    <Card className="bg-surface border border-border-strong p-0 overflow-hidden">
      <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-panel/30">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-md ${
            isConnected ? 'bg-safe-muted text-safe' :
            isWarning ? 'bg-warning-muted text-warning' :
            'bg-critical-muted text-critical'
          }`}>
            {isConnected ? <WifiHigh className="w-5 h-5" /> : <WifiNone className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-medium text-content-primary">{integration.type} Integration</h4>
            <div className="flex items-center mt-1 space-x-2">
              <span className="text-xs text-content-muted font-mono truncate max-w-50">
                {integration.endpoint || 'No endpoint'}
              </span>
              <span className="text-content-muted">•</span>
              <span className="text-xs text-content-muted">
                {lastChecked ? `Checked ${new Date(lastChecked).toLocaleTimeString()}` : 'Never checked'}
              </span>
            </div>
          </div>
        </div>
        
        <Badge variant={
          isConnected ? 'success' : 
          isWarning ? 'warning' : 
          'danger'
        }>
          {status}
        </Badge>
      </div>

      <div className="p-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-content-muted uppercase tracking-wider mb-1">Auth Type</p>
          <p className="text-sm text-content-primary font-medium">{integration.authenticationType || 'NONE'}</p>
        </div>
        
        <div>
          <p className="text-xs text-content-muted uppercase tracking-wider mb-1">Telemetry</p>
          <div className="flex items-center space-x-1.5">
            {integration.webhookEnabled ? (
              <>
                <Plugs className="w-3.5 h-3.5 text-safe" />
                <span className="text-sm text-content-primary font-medium">Plugs</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-content-muted" />
                <span className="text-sm text-content-primary font-medium">Black-box</span>
              </>
            )}
          </div>
        </div>
        
        <div>
          <p className="text-xs text-content-muted uppercase tracking-wider mb-1">Latency</p>
          <p className="text-sm text-content-primary font-medium">
            {isConnected ? '142ms avg' : '--'}
          </p>
        </div>
      </div>
    </Card>
  );
}
