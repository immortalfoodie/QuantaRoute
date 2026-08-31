import React from 'react';

interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; label?: string };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Metric({ label, value, unit, trend, size = 'md', className = '' }: MetricProps) {
  const valueSize = size === 'lg' ? 'text-[36px]' : size === 'md' ? 'text-[28px]' : 'text-[20px]';

  return (
    <div className={className}>
      <div className="label-editorial mb-2">{label}</div>
      <div className={`${valueSize} font-extrabold text-text-primary tracking-tight tabular-nums leading-none`}>
        {value}
        {unit && <span className="text-[14px] font-medium text-text-muted ml-1.5">{unit}</span>}
      </div>
      {trend && (
        <div className={`text-[12px] mt-2 font-medium ${trend.value < 0 ? 'text-accent-green' : trend.value > 0 ? 'text-accent-red' : 'text-text-muted'}`}>
          {trend.value < 0 ? '↓' : trend.value > 0 ? '↑' : ''} {Math.abs(trend.value).toFixed(1)}%
          {trend.label && <span className="text-text-muted ml-1">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}

export function MetricRow({ metrics, className = '' }: {
  metrics: MetricProps[];
  className?: string;
}) {
  return (
    <div className={`metric-strip ${className}`}>
      {metrics.map((m, i) => (
        <Metric key={i} {...m} size="md" />
      ))}
    </div>
  );
}
