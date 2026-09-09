import React from 'react';
import { AlgorithmType, ALGORITHM_LABELS, ALGORITHM_COLORS } from '../../engine/types';

interface AlgorithmSelectorProps {
  value: AlgorithmType;
  onChange: (algo: AlgorithmType) => void;
  algorithms?: AlgorithmType[];
  compact?: boolean;
}

const DEFAULT_ALGOS: AlgorithmType[] = ['qpso', 'pso', 'ga', 'aco', 'exact'];

export function AlgorithmSelector({ value, onChange, algorithms = DEFAULT_ALGOS }: AlgorithmSelectorProps) {
  return (
    <div className="space-y-1">
      {algorithms.map(algo => {
        const active = value === algo;
        const isReference = algo === 'exact';
        return (
          <button
            key={algo}
            onClick={() => onChange(algo)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all border-2 ${
              active
                ? 'border-border bg-bg-inverse text-text-inverse font-bold'
                : 'border-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary font-medium'
            }`}
          >
            <span
              className="w-2.5 h-2.5 flex-shrink-0"
              style={{ backgroundColor: ALGORITHM_COLORS[algo] }}
            />
            <span className="text-[13px] flex-1">{ALGORITHM_LABELS[algo]}</span>
            {isReference && (
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider px-1.5 py-0.5 border border-border-subtle">
                Ref
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ParameterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-text-secondary font-medium">{label}</span>
      {children}
    </div>
  );
}

export function NumberInput({ value, onChange, min, max, step }: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className="w-20 bg-bg-surface border-2 border-border px-2 py-1.5 text-[13px] text-text-primary font-mono text-right focus:border-accent outline-none"
    />
  );
}

export function WeightSlider({ label, value, onChange }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-[13px] text-text-secondary font-medium">{label}</span>
        <span className="text-[12px] font-mono font-bold text-text-primary tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
