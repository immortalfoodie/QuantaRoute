import React from 'react';
import { useStore } from '../store/useStore';
import { NetworkCanvas } from '../components/network/NetworkCanvas';
import { PageContainer, MetricRow, EventTimeline, PrimaryButton } from '../components/design-system';
import { getCongestionLabel } from '../engine/traffic-simulator';
import { ArrowRight, Zap } from 'lucide-react';

export function Overview() {
  const { network, currentResult, beforeOptimization, setPage, eventLog, isOptimizing, trafficState } = useStore();

  const avgCongestion = network.roads.reduce((acc, r) => acc + r.congestion, 0) / network.roads.length;

  const travelTime = currentResult?.travelTime;
  const distance = currentResult?.totalDistance;
  const fitness = currentResult?.fitness;

  const travelTrend = travelTime && beforeOptimization
    ? ((travelTime - beforeOptimization.travelTime) / beforeOptimization.travelTime) * 100
    : undefined;

  return (
    <PageContainer className="flex flex-col h-full overflow-y-auto">
      <header className="mb-8">
        <div className="label-editorial mb-3">Quantum-Inspired Transportation Platform</div>
        <h1 className="text-[40px] font-extrabold text-text-primary tracking-tight leading-[1.05] uppercase max-w-3xl">
          Quantum-Inspired<br />Routing for Dynamic Cities
        </h1>
        <p className="text-[15px] text-text-secondary mt-4 max-w-xl leading-relaxed">
          Optimize transportation routes under changing traffic conditions using quantum-inspired metaheuristic search.
        </p>
        <div className="flex gap-3 mt-6">
          <PrimaryButton variant="secondary" onClick={() => setPage('network')}>
            Explore Network <ArrowRight className="w-4 h-4" />
          </PrimaryButton>
          <PrimaryButton onClick={() => setPage('optimizer')}>
            <Zap className="w-4 h-4" /> Run Optimization
          </PrimaryButton>
        </div>
      </header>

      <div className="flex-1 min-h-[380px] lg:min-h-[460px] relative border-2 border-border mb-8 bg-bg-surface">
        <NetworkCanvas showZoomControls={false} showVehicles />

        <div className="absolute top-4 left-4 bg-bg-surface border-2 border-border p-4 z-10 shadow-[4px_4px_0_#1a1a1a]">
          <div className="label-editorial mb-3">Network Summary</div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <Stat label="Nodes" value={network.nodes.length} />
            <Stat label="Roads" value={network.roads.length} />
            <Stat label="Deliveries" value={network.customers.length} />
            <Stat label="Vehicles" value={network.vehicles.length} />
          </div>
        </div>

        <div className="absolute top-4 right-4 bg-bg-inverse text-text-inverse border-2 border-border p-4 z-10">
          <div className="label-editorial mb-2 text-text-muted">System State</div>
          <div className="space-y-1.5 text-[12px] font-bold uppercase tracking-wide">
            <div>Traffic: {getCongestionLabel(avgCongestion)} ({trafficState.level}%)</div>
            <div>Optimizer: {isOptimizing ? 'Running' : currentResult ? 'Complete' : 'Ready'}</div>
          </div>
        </div>
      </div>

      <MetricRow
        metrics={[
          {
            label: 'Travel Time',
            value: travelTime ? travelTime.toFixed(1) : '—',
            unit: travelTime ? 'min' : undefined,
            trend: travelTrend !== undefined ? { value: travelTrend } : undefined,
          },
          {
            label: 'Distance',
            value: distance ? distance.toFixed(1) : '—',
            unit: distance ? 'km' : undefined,
          },
          {
            label: 'Congestion',
            value: getCongestionLabel(avgCongestion),
          },
          {
            label: 'Optimization Fitness',
            value: fitness ? fitness.toFixed(2) : '—',
          },
        ]}
      />

      <section className="mt-8">
        <h2 className="label-editorial mb-4">Recent System Events</h2>
        <div className="border-2 border-border bg-bg-surface p-4">
          <EventTimeline events={eventLog.slice(0, 8)} />
        </div>
      </section>
    </PageContainer>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="text-[12px] text-text-muted font-medium">{label}</span>
      <span className="ml-2 font-mono text-[16px] font-bold text-text-primary tabular-nums">{value}</span>
    </div>
  );
}
