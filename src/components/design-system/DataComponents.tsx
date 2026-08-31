import React from 'react';
import { Route } from '../../engine/types';
import { NetworkGraph } from '../../engine/types';

interface RouteTimelineProps {
  route: Route;
  network: NetworkGraph;
  vehicleCapacity: number;
  color?: string;
  active?: boolean;
  onClick?: () => void;
}

export function RouteTimeline({ route, network, vehicleCapacity, color, active, onClick }: RouteTimelineProps) {
  const keyNodes = route.nodes.filter(n => {
    const node = network.nodes.find(nd => nd.id === n);
    return node && (node.type === 'depot' || node.type === 'customer');
  });

  const getLabel = (nodeId: string) => {
    if (nodeId === network.depot) return 'DEPOT';
    const node = network.nodes.find(n => n.id === nodeId);
    return node?.label || nodeId.replace('C', 'C');
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-2 transition-all ${
        active
          ? 'border-border bg-bg-elevated shadow-[3px_3px_0_#1a1a1a]'
          : 'border-border-subtle hover:border-border hover:bg-bg-hover'
      }`}
      style={active && color ? { borderLeftWidth: '4px', borderLeftColor: color } : undefined}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="text-[14px] font-extrabold text-text-primary uppercase tracking-wide">
          Vehicle {route.vehicleId.replace('V', '').padStart(2, '0')}
        </div>
        <div className="text-right text-[14px] font-mono tabular-nums space-y-0.5">
          <div className="text-text-primary">{route.travelTime.toFixed(1)} min</div>
          <div className="text-text-muted">{route.distance.toFixed(1)} km</div>
          <div className="text-text-secondary">{route.load} / {vehicleCapacity} cap</div>
        </div>
      </div>

      <div className="flex flex-col gap-0">
        {keyNodes.map((nodeId, idx) => (
          <div key={`${nodeId}-${idx}`} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 ${nodeId === network.depot ? 'bg-accent' : 'bg-accent-blue'}`} />
              {idx < keyNodes.length - 1 && <div className="w-0.5 h-5 bg-border" />}
            </div>
            <span className={`text-[14px] font-mono font-semibold ${nodeId === network.depot ? 'text-accent' : 'text-text-primary'}`}>
              {getLabel(nodeId)}
            </span>
          </div>
        ))}
      </div>
    </button>
  );
}

export function EventTimeline({ events, className = '' }: {
  events: { time: string; message: string }[];
  className?: string;
}) {
  return (
    <div className={`space-y-0 ${className}`}>
      {events.map((event, i) => (
        <div key={i} className="flex gap-4 group border-b border-border-subtle last:border-0 py-3">
          <div className="flex flex-col items-center pt-1">
            <div className={`w-2 h-2 ${i === 0 ? 'bg-accent' : 'bg-border-subtle'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-mono text-text-muted mb-1 tabular-nums">{event.time}</div>
            <div className="text-[14px] text-text-primary group-hover:text-text-secondary transition-colors leading-snug">
              {event.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DataTable({ columns, rows, highlightRow }: {
  columns: { key: string; label: string; align?: 'left' | 'right'; mono?: boolean }[];
  rows: Record<string, React.ReactNode>[];
  highlightRow?: number;
}) {
  return (
    <div className="overflow-x-auto border-2 border-border">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b-2 border-border bg-bg-elevated">
            {columns.map(col => (
              <th
                key={col.key}
                className={`py-3 px-4 font-bold label-editorial text-${col.align || 'left'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-border-subtle hover:bg-bg-hover transition-colors ${
                highlightRow === i ? 'bg-bg-elevated' : ''
              }`}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`py-3 px-4 text-${col.align || 'left'} ${col.mono ? 'font-mono tabular-nums' : ''}`}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InspectorPanel({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-surface border-2 border-border p-5 w-80 shadow-[4px_4px_0_#1a1a1a]">
      <div className="flex justify-between items-start mb-4 pb-3 border-b-2 border-border">
        <h3 className="text-[14px] font-extrabold text-text-primary uppercase tracking-wide">{title}</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-[20px] leading-none font-bold w-6 h-6 flex items-center justify-center">&times;</button>
      </div>
      {children}
    </div>
  );
}

export function TrafficLegend() {
  return (
    <div className="space-y-3 text-[13px]">
      <div className="flex items-center gap-3"><span className="w-8 h-1 bg-accent-green" /><span className="text-text-secondary font-medium">Free Flow</span></div>
      <div className="flex items-center gap-3"><span className="w-8 h-1 bg-accent-yellow" /><span className="text-text-secondary font-medium">Moderate</span></div>
      <div className="flex items-center gap-3"><span className="w-8 h-1 bg-accent-red" /><span className="text-text-secondary font-medium">Congested</span></div>
      <div className="flex items-center gap-3"><span className="w-2.5 h-2.5 rotate-45 bg-accent" /><span className="text-text-secondary font-medium">Depot</span></div>
      <div className="flex items-center gap-3"><span className="w-2.5 h-2.5 bg-accent-blue" /><span className="text-text-secondary font-medium">Customer</span></div>
      <div className="flex items-center gap-3"><span className="w-2.5 h-2.5 bg-bg-inverse border border-border" /><span className="text-text-secondary font-medium">Vehicle</span></div>
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, loading, variant = 'primary', className = '' }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
}) {
  const base = 'px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed border-2';
  const variants = {
    primary: 'bg-bg-inverse text-text-inverse border-border hover:bg-accent hover:border-accent',
    secondary: 'bg-bg-surface text-text-primary border-border hover:bg-bg-hover shadow-[3px_3px_0_#1a1a1a] hover:shadow-[1px_1px_0_#1a1a1a] hover:translate-x-[2px] hover:translate-y-[2px]',
    danger: 'bg-accent-red text-white border-accent-red hover:bg-red-700',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
