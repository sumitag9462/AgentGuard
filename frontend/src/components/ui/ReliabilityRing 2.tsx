import { motion } from 'framer-motion';

interface ReliabilityRingProps {
  score: number;
  confidence: string;
  coverage: number;
}

export function ReliabilityRing({ score, confidence, coverage }: ReliabilityRingProps) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = 'varsafe';
  let glow = 'var(--shadow-glow-safe)';
  if (score < 85) { color = 'varwarning'; glow = '0 0 24px rgba(245,158,11,0.2)'; }
  if (score < 70) { color = 'varcritical'; glow = 'var(--shadow-glow-critical)'; }

  return (
    <div className="relative flex flex-col items-center justify-center p-8">
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Background track */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
          <circle
            cx="128"
            cy="128"
            r={radius}
            stroke="varborder-subtle"
            strokeWidth="8"
            fill="none"
          />
          {/* Animated score ring */}
          <motion.circle
            cx="128"
            cy="128"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ strokeDasharray: circumference, filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>

        <div className="flex flex-col items-center justify-center z-10 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="text-5xl font-mono font-bold tracking-tighter"
            style={{ color }}
          >
            {score.toFixed(1)}%
          </motion.div>
          <div className="text-xs font-semibold tracking-widest text-content-secondary uppercase mt-2">
            Reliability
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="flex gap-6 mt-4"
      >
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-content-muted mb-1">Confidence</div>
          <div className={`text-sm font-semibold ${confidence === 'HIGH' ? 'text-safe' : 'text-warning'}`}>
            {confidence}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-content-muted mb-1">Coverage</div>
          <div className="text-sm font-semibold text-white">{coverage}%</div>
        </div>
      </motion.div>
    </div>
  );
}
