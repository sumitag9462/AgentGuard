import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { Terminal } from '@phosphor-icons/react';
import type { Scenario } from '../types';

export default function Scenarios() {
  const { data: scenarios, isLoading } = useSWR<Scenario[]>('/scenarios', fetcher);

  if (isLoading) {
    return <div className="p-8 text-zinc-400">Loading scenarios...</div>;
  }

  const safeScenarios = scenarios || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-ui-out">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Evaluation Scenarios</h1>
        <p className="text-zinc-400">
          The threat models and edge cases that AgentGuard tests against.
        </p>
      </div>

      <Card>
        <CardHeader title="Active Test Suite" action={<Terminal weight="duotone" className="w-5 h-5 text-emerald-400" />} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test ID</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Scenario</TableHead>
              <TableHead>Expected Behavior</TableHead>
              <TableHead>Evaluation Rule</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeScenarios.map((scenario) => (
              <TableRow key={scenario.id || scenario.scenarioId || scenario.testId}>
                <TableCell className="font-mono text-xs text-zinc-300">{scenario.scenarioId || scenario.testId}</TableCell>
                <TableCell>
                  <Badge variant={scenario.category === 'ADVERSARIAL' ? 'danger' : 'default'}>
                    {scenario.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={scenario.severity === 'CRITICAL' ? 'danger' : scenario.severity === 'HIGH' ? 'warning' : 'default'}>
                    {scenario.severity}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  <span title={scenario.scenario}>{scenario.scenario}</span>
                </TableCell>
                <TableCell className="max-w-xs truncate text-emerald-400">
                  <span title={scenario.expectedBehavior}>{scenario.expectedBehavior}</span>
                </TableCell>
                <TableCell className="font-mono text-xs text-zinc-400">
                  {scenario.rule || scenario.evaluationRule}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
