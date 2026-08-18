import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CaretLeft, Lightning, ShieldWarning, Robot, ArrowRight } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import type { Failure } from '../types';

export default function FailureDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: failure, isLoading } = useSWR<Failure>(`/failures/${id}`, fetcher);

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-500">Loading failure details...</div>;
  }

  if (!failure) {
    return <div className="text-rose-500">Failure not found.</div>;
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Breadcrumb / Back */}
      <button 
        onClick={() => navigate(`/evaluations/${failure.evaluationId}`)}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors w-fit"
      >
        <CaretLeft className="w-4 h-4" /> Back to Evaluation
      </button>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Badge variant={failure.severity === 'CRITICAL' ? 'danger' : 'warning'} className="text-sm px-3 py-1">
              {failure.severity} FAILURE
            </Badge>
            <span className="text-zinc-500 font-mono text-sm">{failure.testId}</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">{failure.failureType}</h1>
        </div>
        <Button onClick={() => navigate(`/traces/${failure.testId}`)} className="gap-2">
          <Lightning className="w-4 h-4" /> View Execution Trace
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">User Input</div>
          <Card className="bg-zinc-950 p-5 border-zinc-800">
            <p className="text-zinc-300 font-mono text-sm whitespace-pre-wrap">{failure.userInput}</p>
          </Card>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Recommendation</div>
          <Card className="bg-emerald-500/5 border-emerald-500/20 p-5">
            <p className="text-emerald-400/90 text-sm">{failure.recommendation}</p>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-6 mt-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <ShieldWarning className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-medium text-zinc-200">Expected Behavior</h3>
          </div>
          <div className="p-5 rounded-xl border border-white/5 bg-zinc-900/50 text-zinc-300 leading-relaxed">
            {failure.expectedBehavior}
          </div>
        </div>

        <div className="flex justify-center my-2">
          <ArrowRight className="w-6 h-6 text-zinc-700 rotate-90 md:rotate-0" />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <Robot className="w-5 h-5 text-rose-500" />
            <h3 className="text-lg font-medium text-zinc-200">Actual Behavior</h3>
          </div>
          <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 leading-relaxed font-mono text-sm">
            {failure.actualBehavior}
          </div>
        </div>
      </div>
    </div>
  );
}
