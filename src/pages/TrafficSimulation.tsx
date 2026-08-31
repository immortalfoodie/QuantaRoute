import React from 'react';
import { useStore } from '../store/useStore';
import { NetworkCanvas } from '../components/network/NetworkCanvas';
import { FloatingPanel, EventTimeline, PrimaryButton } from '../components/design-system';
import { TrafficPreset } from '../engine/types';
import { AlertTriangle, TrendingUp, ZapOff, RotateCcw } from 'lucide-react';

const PRESETS: { id: TrafficPreset; label: string }[] = [
  { id: 'free-flow', label: 'Free Flow' },
  { id: 'morning-peak', label: 'Morning Peak' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening-peak', label: 'Evening Peak' },
  { id: 'heavy-congestion', label: 'Heavy Congestion' },
  { id: 'random', label: 'Random' },
];

export function TrafficSimulation() {
  const {
    trafficState,
    setTrafficPreset,
    setTrafficLevel,
    injectTrafficEvent,
    eventLog,
    network,
    selectedRoad,
    currentResult,
    runOptimization,
    isOptimizing,
    setPage,
  } = useStore();

  const closedRoads = network.roads.filter(r => r.isClosed).length;
  const avgCongestion = network.roads.reduce((s, r) => s + r.congestion, 0) / network.roads.length;

  const handleReoptimize = async () => {
    if (isOptimizing) return;
    await runOptimization();
    setPage('optimizer');
  };

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Main: Live network */}
      <div className="flex-1 min-w-0 relative">
        <NetworkCanvas showVehicles={!!currentResult} />

        <FloatingPanel title="Live Network" position="top-left" className="min-w-[200px]">
          <div className="text-[12px] text-text-muted font-medium mb-2">Global level: {trafficState.level}%</div>
          <div className="text-[14px] font-bold text-text-primary">{Math.round(avgCongestion * 100)}% avg congestion</div>
          {closedRoads > 0 && (
            <div className="text-[12px] text-accent-red font-bold mt-1">{closedRoads} road(s) closed</div>
          )}
        </FloatingPanel>
      </div>

      {/* Right: Controls */}
      <aside className="w-full lg:w-[340px] flex-shrink-0 border-l-2 border-border bg-bg-secondary overflow-y-auto">
        <div className="p-5 border-b-2 border-border">
          <h2 className="text-[16px] font-extrabold text-text-primary uppercase tracking-wide">Traffic Controls</h2>
          <p className="text-[12px] text-text-muted mt-1">Adjust conditions and inject events</p>
        </div>

        <div className="p-5 space-y-6">
          <section>
            <div className="label-editorial mb-3">Global Traffic</div>
            <div className="flex justify-between text-[13px] mb-3">
              <span className="text-text-muted font-medium">Congestion intensity</span>
              <span className="font-mono font-bold text-text-primary">{trafficState.level}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={trafficState.level}
              onChange={e => setTrafficLevel(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between mt-2 text-[11px] text-text-muted font-medium">
              <span>Free flow</span>
              <span>Gridlock</span>
            </div>
          </section>

          <section>
            <div className="label-editorial mb-3">Presets</div>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setTrafficPreset(p.id)}
                  className={`px-3 py-2.5 text-[12px] font-semibold text-left transition-colors border-2 ${
                    trafficState.preset === p.id
                      ? 'border-border bg-bg-inverse text-text-inverse'
                      : 'border-border-subtle text-text-secondary hover:border-border hover:bg-bg-hover'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="label-editorial mb-3">Traffic Event Controls</div>
            <p className="text-[12px] text-text-muted mb-3">
              {selectedRoad ? `Selected road: ${selectedRoad}` : 'Select a road on the map to apply a local event.'}
            </p>
            <div className="space-y-2">
              <EventButton icon={AlertTriangle} label="Major Accident" onClick={() => injectTrafficEvent('accident', selectedRoad ?? undefined)} variant="error" disabled={!selectedRoad} />
              <EventButton icon={ZapOff} label="Road Closure" onClick={() => injectTrafficEvent('closure', selectedRoad ?? undefined)} variant="warning" disabled={!selectedRoad} />
              <EventButton icon={TrendingUp} label="Traffic Spike" onClick={() => injectTrafficEvent('spike', selectedRoad ?? undefined)} variant="warning" disabled={!selectedRoad} />
            </div>
          </section>

          {currentResult && (
            <section className="border-2 border-accent bg-accent/5 p-4">
              <div className="label-editorial mb-2">Affected Routes</div>
              <p className="text-[13px] text-text-secondary mb-3">
                Traffic changes may invalidate current routes. Re-optimize to adapt.
              </p>
              <PrimaryButton onClick={handleReoptimize} disabled={isOptimizing} className="w-full">
                <RotateCcw className="w-4 h-4" /> Re-Optimize
              </PrimaryButton>
            </section>
          )}

          <section>
            <div className="label-editorial mb-3">Event Timeline</div>
            <div className="border-2 border-border bg-bg-surface p-3 max-h-[280px] overflow-y-auto">
              <EventTimeline events={eventLog.slice(0, 15)} />
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function EventButton({ icon: Icon, label, onClick, variant, disabled }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant: 'error' | 'warning';
  disabled?: boolean;
}) {
  const colors = variant === 'error'
    ? 'hover:border-accent-red text-accent-red hover:bg-red-50'
    : 'hover:border-accent-yellow text-accent-yellow hover:bg-amber-50';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-3 border-2 border-border-subtle transition-colors text-left disabled:cursor-not-allowed disabled:opacity-45 ${colors}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-[13px] font-semibold text-text-primary">{label}</span>
    </button>
  );
}
