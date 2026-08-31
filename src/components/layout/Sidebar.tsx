import React from 'react';
import { Atom, BarChart3, FlaskConical, LayoutDashboard, Map, Network, Route, TrafficCone } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { NAV_ITEMS, NAV_GROUPS } from '../design-system';

const NAV_ICONS = {
  overview: LayoutDashboard,
  network: Network,
  optimizer: Route,
  quantum: Atom,
  benchmark: BarChart3,
  scalability: Map,
  experiments: FlaskConical,
  traffic: TrafficCone,
} as const;

export function Sidebar() {
  const { currentPage, setPage, isOptimizing, resetSimulation } = useStore();

  return (
    <aside
      className="flex flex-col flex-shrink-0 h-full border-r-2 border-border bg-bg-secondary"
      style={{ width: 'var(--spacing-sidebar, 236px)' }}
    >
      <div className="px-5 py-5 border-b-2 border-border">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-bg-inverse flex items-center justify-center flex-shrink-0">
            <span className="text-[13px] font-extrabold text-text-inverse tracking-tight">QR</span>
          </div>
          <div>
            <div className="text-[14px] font-extrabold text-text-primary tracking-tight leading-none">Q-ROUTE</div>
            <div className="text-[13px] text-text-muted mt-1 font-medium">Quantum Intelligence</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {NAV_GROUPS.map(group => {
          const items = NAV_ITEMS.filter(i => i.group === group.id);
          return (
            <div key={group.id} className="mb-5">
              <div className="px-3 py-1 mb-1 label-editorial">
                {group.label}
              </div>
              {items.map(item => {
                const active = currentPage === item.id;
                const Icon = NAV_ICONS[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => setPage(item.id)}
                    className={`relative w-full flex items-center gap-4 px-3 py-3.5 mb-1 text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-bg-inverse text-text-inverse font-bold'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary font-medium'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                    )}
                    <Icon className="w-[20px] h-[20px] flex-shrink-0" aria-hidden="true" />
                    <span className="text-[14px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t-2 border-border bg-bg-elevated flex flex-col gap-4">
        <div>
          <div className="label-editorial mb-3">System Status</div>
          <div className="space-y-2.5">
            <HealthRow label="Network" value="ONLINE" ok />
            <HealthRow label="Traffic" value="ACTIVE" ok />
            <HealthRow label="Optimizer" value={isOptimizing ? 'RUNNING' : 'READY'} ok={!isOptimizing} warn={isOptimizing} />
          </div>
        </div>
        
        <button
          onClick={resetSimulation}
          className="w-full px-3 py-2 text-[13px] font-bold tracking-wide uppercase text-accent-red border-2 border-accent-red/30 hover:bg-accent-red/10 hover:border-accent-red transition-colors text-center"
        >
          Reset Simulation
        </button>
      </div>
    </aside>
  );
}

function HealthRow({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-text-muted uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 ${warn ? 'bg-accent-yellow animate-pulse-dot' : ok ? 'bg-accent-green' : 'bg-text-muted'}`} />
        <span className={`text-[12px] font-bold tracking-wide uppercase ${warn ? 'text-accent-yellow' : 'text-text-primary'}`}>{value}</span>
      </div>
    </div>
  );
}
