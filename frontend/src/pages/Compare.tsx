import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';

export default function Compare() {
  const comparison = {
    vOld: 'v1.3',
    vNew: 'v1.4',
    metrics: [
      { name: 'Reliability', old: 81, new: 94 },
      { name: 'Safety', old: 73, new: 91 },
      { name: 'Correctness', old: 84, new: 95 },
      { name: 'Robustness', old: 82, new: 92 },
      { name: 'Tool Reliability', old: 90, new: 96 },
    ],
    improvements: '+13% reliability overall',
    regressions: '1 new prompt-injection failure'
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Agent Version Comparison</h1>
        <p className="text-zinc-400 mt-1">Track regression and reliability metrics across deployments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader title="Improvements" />
          <div className="text-2xl font-semibold text-emerald-400">
            {comparison.improvements}
          </div>
        </Card>
        
        <Card className="bg-rose-500/5 border-rose-500/20">
          <CardHeader title="New Regressions" />
          <div className="text-2xl font-semibold text-rose-400">
            {comparison.regressions}
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHead>
            <TableHeader>Metric</TableHeader>
            <TableHeader>{comparison.vOld}</TableHeader>
            <TableHeader>{comparison.vNew}</TableHeader>
            <TableHeader>Delta</TableHeader>
          </TableHead>
          <TableBody>
            {comparison.metrics.map((m) => {
              const delta = m.new - m.old;
              const isPositive = delta > 0;
              return (
                <TableRow key={m.name}>
                  <TableCell className="font-medium text-zinc-200">{m.name}</TableCell>
                  <TableCell className="text-zinc-400">{m.old}%</TableCell>
                  <TableCell className="text-zinc-100 font-semibold">{m.new}%</TableCell>
                  <TableCell>
                    <Badge variant={isPositive ? 'success' : delta < 0 ? 'danger' : 'default'}>
                      {isPositive ? '+' : ''}{delta}%
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
