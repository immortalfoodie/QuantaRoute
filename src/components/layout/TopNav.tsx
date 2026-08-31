import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { PAGE_TITLES } from '../design-system';
import { getCongestionLabel } from '../../engine/traffic-simulator';
import { Bell, Loader2 } from 'lucide-react';

export function TopNav() {
  const { network, currentPage, isOptimizing, currentResult } = useStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const avgCongestion = network.roads.reduce((s, r) => s + r.congestion, 0) / network.roads.length;
  const congLabel = getCongestionLabel(avgCongestion);
  const pageTitle = PAGE_TITLES[currentPage] || 'Overview';
  const optStatus = isOptimizing ? 'Running' : currentResult ? 'Complete' : 'Ready';

  return (
    <header
      className="flex items-center px-6 gap-6 flex-shrink-0 border-b-2 border-border bg-bg-secondary"
      style={{ height: 'var(--spacing-topbar, 56px)' }}
    >
      <div className="min-w-[140px]">
        <h2 className="text-[15px] font-bold text-text-primary uppercase tracking-wide">{pageTitle}</h2>
      </div>

      <div className="flex-1 flex justify-center min-w-0">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-accent-green animate-pulse-dot flex-shrink-0" />
          <span className="text-[13px] font-bold text-text-primary tracking-wide uppercase">Live Simulation</span>
        </div>
      </div>

      <div className="flex items-center gap-5 lg:gap-6 min-w-0">
        <MetaItem label="Time" value={time.toLocaleTimeString()} mono />
        <MetaItem
          label="Traffic"
          value={congLabel}
          variant={avgCongestion < 0.3 ? 'success' : avgCongestion < 0.6 ? 'warning' : 'error'}
        />
        <MetaItem
          label="Optimization"
          value={optStatus}
          icon={isOptimizing ? <Loader2 className="w-3 h-3 animate-spin text-accent" /> : undefined}
        />

        <button className="relative p-1.5 hover:bg-bg-hover transition-colors border border-transparent hover:border-border-subtle" aria-label="Notifications">
          <Bell className="w-4 h-4 text-text-muted" />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-accent-red border border-bg-secondary" />
        </button>
      </div>
    </header>
  );
}

function MetaItem({ label, value, mono, variant, icon }: {
  label: string;
  value: string;
  mono?: boolean;
  variant?: 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
}) {
  const colorClass = variant === 'success' ? 'text-accent-green'
    : variant === 'warning' ? 'text-accent-yellow'
    : variant === 'error' ? 'text-accent-red'
    : 'text-text-primary';

  return (
    <div className="hidden md:flex flex-col items-end">
      <span className="label-editorial">{label}</span>
      <div className={`flex items-center gap-1 text-[13px] font-semibold tabular-nums ${colorClass} ${mono ? 'font-mono' : ''}`}>
        {icon}
        {value}
      </div>
    </div>
  );
}
