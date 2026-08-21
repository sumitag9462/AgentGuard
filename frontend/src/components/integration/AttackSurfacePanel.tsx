import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { ShieldWarning, Target, Lightning, Warning, CaretDown, CaretUp, Info } from '@phosphor-icons/react';
import { Badge } from '../ui/Badge';
import type { AttackSurface } from '../../types';

interface Props {
  attackSurface?: AttackSurface;
}

export function AttackSurfacePanel({ attackSurface }: Props) {
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  if (!attackSurface) return null;

  const toggleExpand = (toolName: string) => {
    if (expandedTool === toolName) setExpandedTool(null);
    else setExpandedTool(toolName);
  };

  return (
    <Card className="bg-surface border border-border-strong flex flex-col h-full col-span-1 md:col-span-2">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldWarning className="w-5 h-5 text-content-muted" />
          <h4 className="font-medium text-content-primary">Integration Attack Surface</h4>
        </div>
        <div className="text-xs text-content-secondary">
          {attackSurface.toolsDetected} capabilities discovered
        </div>
      </div>
      
      {/* SUMMARY DASHBOARD */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-panel border-b border-border-subtle">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase text-content-muted mb-1">Critical</span>
          <span className="text-2xl font-bold text-critical">{attackSurface.criticalRiskTools}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase text-content-muted mb-1">High</span>
          <span className="text-2xl font-bold text-warning">{attackSurface.highRiskTools}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase text-content-muted mb-1">Medium</span>
          <span className="text-2xl font-bold text-info">{attackSurface.mediumRiskTools}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase text-content-muted mb-1">Low</span>
          <span className="text-2xl font-bold text-safe">{attackSurface.lowRiskTools}</span>
        </div>
      </div>

      <div className="p-4 bg-surface border-b border-border-subtle">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-content-primary uppercase tracking-wider">Capability Map</span>
          <div className="flex gap-4 text-xs text-content-secondary">
            <span><strong className="text-content-primary">{attackSurface.confirmationRequiredTools.length}</strong> require confirmation</span>
            <span><strong className="text-content-primary">{attackSurface.destructiveTools.length}</strong> have destructive side effects</span>
          </div>
        </div>

        {/* CAPABILITY TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-content-muted uppercase border-b border-border-subtle bg-panel">
              <tr>
                <th className="px-4 py-3 font-medium">Capability</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Side Effect</th>
                <th className="px-4 py-3 font-medium">Confirmation</th>
                <th className="px-4 py-3 font-medium text-right">Coverage</th>
                <th className="px-4 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {attackSurface.toolRiskAnalysis.map((tool) => (
                <React.Fragment key={tool.name}>
                  <tr className="hover:bg-panel-hover transition-colors cursor-pointer" onClick={() => toggleExpand(tool.name)}>
                    <td className="px-4 py-3 font-mono text-content-primary font-medium">{tool.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={tool.riskLevel === 'CRITICAL' ? 'danger' : tool.riskLevel === 'HIGH' ? 'warning' : tool.riskLevel === 'MEDIUM' ? 'default' : 'success'}>
                        {tool.riskLevel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-content-secondary text-xs">{tool.sideEffect}</td>
                    <td className="px-4 py-3 text-content-secondary text-xs">{tool.requiresConfirmation ? 'REQUIRED' : 'NO'}</td>
                    <td className="px-4 py-3 text-right text-content-secondary text-xs">
                      {tool.testCategories?.length || 0} tests
                    </td>
                    <td className="px-4 py-3 text-content-muted text-right">
                      {expandedTool === tool.name ? <CaretUp /> : <CaretDown />}
                    </td>
                  </tr>
                  
                  {/* EXPANDED DETAIL PANEL */}
                  {expandedTool === tool.name && (
                    <tr className="bg-panel border-b border-border-strong">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-6 text-sm">
                          <div>
                            <h5 className="font-semibold text-content-primary mb-2 flex items-center gap-2">
                              <Info className="w-4 h-4 text-info" /> Mapped Policies
                            </h5>
                            {tool.applicablePolicies && tool.applicablePolicies.length > 0 ? (
                              <ul className="list-disc pl-5 text-content-secondary space-y-1">
                                {tool.applicablePolicies.map(p => <li key={p}>{p}</li>)}
                              </ul>
                            ) : (
                              <span className="text-content-muted text-xs italic">No specific policies mapped.</span>
                            )}
                          </div>
                          <div>
                            <h5 className="font-semibold text-content-primary mb-2 flex items-center gap-2">
                              <Target className="w-4 h-4 text-warning" /> Test Coverage Scenarios
                            </h5>
                            {tool.testCategories && tool.testCategories.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {tool.testCategories.map(cat => (
                                  <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-content-muted text-xs italic">Untested surface.</span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
