import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { MagnifyingGlass, Funnel, Warning, CaretRight } from '@phosphor-icons/react';
import type { Failure } from '../types';

export default function Failures() {
  const navigate = useNavigate();
  const { data: failures, isLoading } = useSWR<Failure[]>('/failures', fetcher);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filteredFailures = (failures || []).filter(f => {
    const matchesSearch = 
      f.failureType?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      f.testId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesSeverity = severityFilter === 'ALL' || f.severity === severityFilter;
    
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-display text-content-primary mb-2">Failure Registry</h1>
          <p className="text-body text-content-secondary">
            Investigate policy violations, tool misuse, and agent hallucinations.
          </p>
        </div>
      </div>

      {/* Investigation Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 surface-panel rounded-lg border border-border-subtle">
        <div className="relative w-full md:w-96">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
          <input 
            type="text" 
            placeholder="Search failures, types, or trace IDs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-canvas border border-border-subtle rounded-md pl-10 pr-4 py-2 text-sm text-content-primary focus:outline-none focus:border-safe transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <Funnel className="w-4 h-4 text-content-muted mr-2 shrink-0" />
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-colors shrink-0 ${
                severityFilter === sev 
                  ? 'bg-content-primary text-canvas' 
                  : 'bg-canvas border border-border-subtle text-content-secondary hover:text-content-primary'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Failure List */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <Table 
          loading={isLoading} 
          empty={!isLoading && filteredFailures.length === 0}
          emptyProps={{ title: 'No failures detected', description: 'No failures match your current filters.' }}
        >
          <TableHead>
            <TableHeader>Severity</TableHeader>
            <TableHeader>Failure Type</TableHeader>
            <TableHeader>Scenario / Category</TableHeader>
            <TableHeader>Agent Context</TableHeader>
            <TableHeader>Release Impact</TableHeader>
            <TableHeader className="w-10">{' '}</TableHeader>
          </TableHead>
          <TableBody>
            {filteredFailures.map((failure) => (
              <TableRow 
                key={failure._id} 
                className="cursor-pointer group hover:bg-panel-hover transition-colors"
                onClick={() => navigate(`/app/failures/${failure._id}`)}
              >
                <TableCell>
                  <Badge 
                    variant={
                      failure.severity === 'CRITICAL' ? 'danger' :
                      failure.severity === 'HIGH' ? 'warning' :
                      failure.severity === 'MEDIUM' ? 'info' : 'default'
                    }
                    className="font-mono shadow-sm"
                  >
                    {failure.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-xs font-semibold text-content-primary">{failure.failureType}</div>
                  <div className="text-caption text-content-muted mt-1 truncate max-w-50">{failure.testId}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-content-primary">{failure.category || 'Uncategorized'}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-content-secondary">{failure.agentId || 'Unknown Agent'}</div>
                </TableCell>
                <TableCell>
                  {failure.severity === 'CRITICAL' || failure.severity === 'HIGH' ? (
                    <div className="flex items-center gap-1.5 text-critical text-xs font-bold uppercase tracking-wider bg-critical-muted px-2 py-1 rounded border border-critical/20">
                      <Warning weight="bold" /> Blocking
                    </div>
                  ) : (
                    <div className="text-content-muted text-xs uppercase tracking-wider font-semibold">Monitor</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-content-muted group-hover:text-content-primary group-hover:bg-surface transition-all">
                    <CaretRight weight="bold" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
