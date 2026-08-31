import React from 'react';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusIndicatorProps {
  label: string;
  status: string;
  variant?: StatusVariant;
  pulse?: boolean;
  compact?: boolean;
}

const variantStyles: Record<StatusVariant, { dot: string; text: string; bg: string }> = {
  success: { dot: 'bg-accent-green', text: 'text-accent-green', bg: 'bg-green-50' },
  warning: { dot: 'bg-accent-yellow', text: 'text-accent-yellow', bg: 'bg-amber-50' },
  error: { dot: 'bg-accent-red', text: 'text-accent-red', bg: 'bg-red-50' },
  info: { dot: 'bg-accent-blue', text: 'text-accent-blue', bg: 'bg-blue-50' },
  neutral: { dot: 'bg-text-muted', text: 'text-text-secondary', bg: 'bg-bg-elevated' },
};

export function StatusIndicator({ label, status, variant = 'neutral', pulse = false, compact = false }: StatusIndicatorProps) {
  const styles = variantStyles[variant];

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4">
        <span className="label-editorial">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 ${styles.dot} ${pulse ? 'animate-pulse-dot' : ''}`} />
          <span className={`text-[12px] font-bold uppercase tracking-wide ${styles.text}`}>{status}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 ${styles.dot} ${pulse ? 'animate-pulse-dot' : ''}`} />
      <span className="label-editorial">{label}</span>
      <span className={`text-[12px] font-bold uppercase tracking-wide ${styles.text}`}>{status}</span>
    </div>
  );
}

export function OptimizationStatus({ status, progress, iteration, maxIteration, fitness, improvement, congestion, travelTime, distance }: {
  status: 'ready' | 'running' | 'converged';
  progress?: number;
  iteration?: number;
  maxIteration?: number;
  fitness?: number;
  improvement?: number;
  congestion?: number;
  travelTime?: number;
  distance?: number;
}) {
  const statusLabel = status === 'ready' ? 'READY' : status === 'running' ? 'RUNNING' : 'CONVERGED';
  const variant = status === 'ready' ? 'neutral' : status === 'running' ? 'info' : 'success';

  return (
    <div className="space-y-4">
      <div className={`inline-flex items-center gap-2 px-3 py-2 border-2 border-border ${variantStyles[variant].bg}`}>
        <StatusIndicator label="Status" status={statusLabel} variant={variant} pulse={status === 'running'} />
      </div>

      {(status === 'running' || status === 'converged') && (
        <div className="grid grid-cols-2 gap-4">
          {fitness !== undefined && (
            <StatBlock label="Best Fitness" value={fitness.toFixed(2)} large />
          )}
          {iteration !== undefined && maxIteration !== undefined && (
            <StatBlock label="Iteration" value={`${iteration} / ${maxIteration}`} />
          )}
          {travelTime !== undefined && (
            <StatBlock label="Travel Time" value={`${travelTime.toFixed(1)} min`} />
          )}
          {distance !== undefined && (
            <StatBlock label="Distance" value={`${distance.toFixed(1)} km`} />
          )}
          {congestion !== undefined && (
            <StatBlock label="Congestion" value={congestion.toFixed(1)} />
          )}
          {improvement !== undefined && status === 'converged' && (
            <StatBlock label="Improvement" value={`${improvement.toFixed(1)}%`} accent />
          )}
        </div>
      )}

      {status === 'running' && progress !== undefined && (
        <ProgressIndicator value={progress} label={`Iteration ${iteration ?? 0} / ${maxIteration ?? 100}`} />
      )}
    </div>
  );
}

function StatBlock({ label, value, large, accent }: { label: string; value: string; large?: boolean; accent?: boolean }) {
  return (
    <div>
      <div className="label-editorial mb-1">{label}</div>
      <div className={`font-mono font-bold tabular-nums ${large ? 'text-[24px]' : 'text-[16px]'} ${accent ? 'text-accent-green' : 'text-text-primary'}`}>
        {value}
      </div>
    </div>
  );
}

export function ProgressIndicator({ value, label, className = '' }: {
  value: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between text-[12px] mb-2">
          <span className="text-text-secondary font-medium">{label}</span>
          <span className="text-text-muted font-mono font-bold">{value}%</span>
        </div>
      )}
      <div className="h-2 bg-bg-hover border border-border overflow-hidden">
        <div
          className="h-full bg-bg-inverse transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
