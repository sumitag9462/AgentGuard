import { Card } from '../ui/Card';
import { ShieldWarning, Target, Lightning, Warning } from '@phosphor-icons/react';
import type { AttackSurface } from '../../types';

interface Props {
  attackSurface?: AttackSurface;
}

export function AttackSurfacePanel({ attackSurface }: Props) {
  if (!attackSurface) return null;

  return (
    <Card className="bg-zinc-950 border border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldWarning className="w-5 h-5 text-zinc-400" />
          <h4 className="font-medium text-zinc-100">Integration Attack Surface</h4>
        </div>
      </div>
      
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
          <div className="flex items-center space-x-2 text-zinc-400 mb-2">
            <Lightning className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Critical Tools</span>
          </div>
          <span className="text-2xl font-bold text-white">{attackSurface.criticalRiskTools}</span>
        </div>
        
        <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
          <div className="flex items-center space-x-2 text-zinc-400 mb-2">
            <Target className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Recommended Tests</span>
          </div>
          <span className="text-2xl font-bold text-white">{attackSurface.recommendedScenarioCount}</span>
        </div>
      </div>

      <div className="px-4 pb-4 flex-1">
        <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Threat Vectors</h5>
        <ul className="space-y-2">
          {attackSurface.recommendedAttacks.slice(0, 3).map((attack, idx) => (
            <li key={idx} className="flex items-start space-x-2 text-sm text-zinc-300">
              <Warning className="w-4 h-4 text-red-500/70 mt-0.5 shrink-0" />
              <span>{attack}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
