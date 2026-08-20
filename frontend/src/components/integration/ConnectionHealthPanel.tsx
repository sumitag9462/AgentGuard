
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
      <Card className="flex items-center justify-between p-4 bg-zinc-900/50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-zinc-800 rounded-md">
            <Heartbeat className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <h4 className="font-medium text-zinc-200">Internal Agent</h4>
            <p className="text-xs text-zinc-500">Running in AgentGuard sandbox</p>
          </div>
        </div>
        <Badge variant="default">Simulated</Badge>
      </Card>
    );
  }

  const isConnected = status === 'CONNECTED';
  const isWarning = status === 'DEGRADED' || status === 'TELEMETRY_DISCONNECTED';

  return (
    <Card className="bg-zinc-950 border border-zinc-800">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-md ${
            isConnected ? 'bg-emerald-500/10 text-emerald-400' :
            isWarning ? 'bg-amber-500/10 text-amber-400' :
            'bg-red-500/10 text-red-400'
          }`}>
            {isConnected ? <WifiHigh className="w-5 h-5" /> : <WifiNone className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-medium text-white">{integration.type} Integration</h4>
            <div className="flex items-center mt-1 space-x-2">
              <span className="text-xs text-zinc-500 font-mono truncate max-w-50">
                {integration.endpoint || 'No endpoint'}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-zinc-500">
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
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Auth Type</p>
          <p className="text-sm text-zinc-200 font-medium">{integration.authenticationType || 'NONE'}</p>
        </div>
        
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Telemetry</p>
          <div className="flex items-center space-x-1.5">
            {integration.webhookEnabled ? (
              <>
                <Plugs className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-sm text-zinc-200 font-medium">Plugs</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-sm text-zinc-200 font-medium">Black-box</span>
              </>
            )}
          </div>
        </div>
        
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Latency</p>
          <p className="text-sm text-zinc-200 font-medium">
            {isConnected ? '142ms avg' : '--'}
          </p>
        </div>
      </div>
    </Card>
  );
}
