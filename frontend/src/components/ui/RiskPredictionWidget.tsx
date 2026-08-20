import { Card, CardHeader } from './Card';

export interface RiskPrediction {
  name: string;
  probability: number;
}

export function RiskPredictionWidget({ predictions }: { predictions: RiskPrediction[] }) {
  if (!predictions || predictions.length === 0) {
    return (
      <Card>
        <CardHeader title="Risk Prediction" />
        <div className="pt-2">
          <div className="text-sm text-content-muted">
            No risk predictions available.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Risk Prediction" />
      <div className="pt-2 space-y-4">
        {predictions.map((pred, idx) => (
          <div key={idx} className="flex justify-between">
            <span>{pred.name}</span>
            <span>{pred.probability}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
