import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  PrimaryButton,
  Metric,
  DataTable,
} from '../components/design-system';
import { ALGORITHM_LABELS, OptimizationResult } from '../engine/types';
import { TrafficPreset, AlgorithmType } from '../engine/types';
import { Play, Download, CheckCircle2, Loader2, Save } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExpPreset {
  id: string;
  name: string;
  desc: string;
  traffic: TrafficPreset;
  algo: AlgorithmType;
  nodes: number;
  customers: number;
  vehicles: number;
}

const EXPERIMENTS: ExpPreset[] = [
  { id: 'E01', name: 'QPSO in Heavy Gridlock', desc: 'Tests QPSO routing under severe congestion conditions.', traffic: 'heavy-congestion', algo: 'qpso', nodes: 150, customers: 20, vehicles: 6 },
  { id: 'E02', name: 'Standard PSO Baseline', desc: 'Baseline PSO for comparison in identical conditions.', traffic: 'heavy-congestion', algo: 'pso', nodes: 150, customers: 20, vehicles: 6 },
  { id: 'E03', name: 'Genetic Algorithm Large Fleet', desc: 'Tests GA on a larger fleet with moderate traffic.', traffic: 'afternoon', algo: 'ga', nodes: 200, customers: 40, vehicles: 12 },
  { id: 'E04', name: 'QPSO Morning Rush', desc: 'Tests QPSO adaptation to morning arterial congestion.', traffic: 'morning-peak', algo: 'qpso', nodes: 120, customers: 15, vehicles: 5 },
];

export function Experiments() {
  const { runOptimization, regenerateNetwork, setTrafficPreset, setAlgorithm, optimizationConfig, trafficState } = useStore();

  const [selectedId, setSelectedId] = useState(EXPERIMENTS[0].id);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, OptimizationResult>>({});
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const selected = EXPERIMENTS.find(e => e.id === selectedId)!;
  const result = results[selectedId];

  const handleRun = async () => {
    if (running) return;
    setRunning(selected.id);

    const originalState = useStore.getState();
    const { network, trafficState, optimizationConfig, currentResult, optimizedRoutes, showOptimizedRoutes } = originalState;

    try {
      regenerateNetwork(selected.nodes, selected.customers, selected.vehicles, 123);
      setTrafficPreset(selected.traffic);
      setAlgorithm(selected.algo);

      await new Promise(r => setTimeout(r, 200));
      const res = await runOptimization(selected.algo);

      setResults(prev => ({ ...prev, [selected.id]: res }));
    } finally {
      useStore.setState({
        network,
        trafficState,
        optimizationConfig,
        currentResult,
        optimizedRoutes,
        showOptimizedRoutes,
        isOptimizing: false,
        optimizationProgress: 0,
        optimizationStatus: '',
        liveOptimizationMetrics: null,
      });
      setRunning(null);
    }
  };

  const handleExport = () => {
    if (!result) return;
    const exportData = {
      experiment: selected,
      configuration: optimizationConfig,
      trafficState,
      result
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `experiment_${selectedId}_results.json`;
    a.click();
  };

  const handleSave = () => {
    if (!result) return;
    setSaved(prev => new Set([...prev, selectedId]));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-5 lg:px-8 border-b-2 border-border bg-bg-secondary flex-shrink-0">
        <h1 className="text-[24px] font-extrabold text-text-primary uppercase tracking-tight">Research Experiments</h1>
        <p className="text-[13px] text-text-secondary mt-1">Run predefined scenarios and export results for academic reporting.</p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* LEFT: Experiment Library */}
        <div className="lg:w-[240px] flex-shrink-0 border-b-2 lg:border-b-0 lg:border-r-2 border-border bg-bg-elevated overflow-y-auto">
          <div className="px-4 py-3 label-editorial border-b-2 border-border">
            Experiment Library
          </div>
          {EXPERIMENTS.map(exp => (
            <button
              key={exp.id}
              onClick={() => setSelectedId(exp.id)}
              className={`w-full text-left px-4 py-3.5 border-b border-border-subtle transition-colors ${
                selectedId === exp.id
                  ? 'bg-bg-inverse text-text-inverse border-l-4 border-l-accent'
                  : 'hover:bg-bg-hover border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[12px] font-mono font-bold ${selectedId === exp.id ? 'text-accent' : 'text-text-muted'}`}>{exp.id}</span>
                {results[exp.id] && <CheckCircle2 className={`w-3.5 h-3.5 ml-auto ${selectedId === exp.id ? 'text-accent-green' : 'text-accent-green'}`} />}
                {saved.has(exp.id) && <Save className="w-3 h-3 text-accent-blue" />}
              </div>
              <div className={`text-[13px] font-bold mt-1 ${selectedId === exp.id ? '' : 'text-text-primary'}`}>{exp.name}</div>
            </button>
          ))}
        </div>

        {/* CENTER: Configuration */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6 lg:p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-border">
          <h2 className="text-[20px] font-extrabold text-text-primary uppercase">{selected.name}</h2>
          <p className="text-[14px] text-text-secondary mt-2 mb-6 leading-relaxed">{selected.desc}</p>

          <div className="label-editorial mb-3">Experiment Configuration</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 border-2 border-border mb-6">
            <Spec label="Scenario" value={selected.name} />
            <Spec label="Algorithm" value={ALGORITHM_LABELS[selected.algo]} />
            <Spec label="Traffic" value={selected.traffic.replace(/-/g, ' ')} />
            <Spec label="Customers" value={selected.customers} />
            <Spec label="Vehicles" value={selected.vehicles} />
            <Spec label="Nodes" value={selected.nodes} />
          </div>

          <div className="flex gap-3">
            <PrimaryButton onClick={handleRun} disabled={!!running}>
              {running === selected.id ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
              ) : (
                <><Play className="w-4 h-4" /> Run Experiment</>
              )}
            </PrimaryButton>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="lg:w-[340px] flex-shrink-0 overflow-y-auto p-6 bg-bg-secondary">
          {!result ? (
            <div className="h-full flex items-center justify-center text-[14px] text-text-muted text-center">
              Run the experiment to see results here.
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="label-editorial mb-4">Results</div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <Metric label="Fitness" value={result.fitness.toFixed(2)} size="sm" />
                <Metric label="Travel Time" value={result.travelTime.toFixed(1)} unit="min" size="sm" />
                <Metric label="Distance" value={result.totalDistance.toFixed(1)} unit="km" size="sm" />
                <Metric label="Congestion" value={result.congestionCost.toFixed(1)} size="sm" />
                <Metric label="Exec Time" value={result.executionTime} unit="ms" size="sm" />
              </div>

              <div className="flex gap-2 mb-5">
                <PrimaryButton variant="secondary" onClick={handleExport} className="flex-1">
                  <Download className="w-3.5 h-3.5" /> Export JSON
                </PrimaryButton>
                <PrimaryButton variant="secondary" onClick={handleSave} className="flex-1">
                  <Save className="w-3.5 h-3.5" /> Save Result
                </PrimaryButton>
              </div>

              <div className="label-editorial mb-3">Route Table</div>
              <DataTable
                columns={[
                  { key: 'vehicle', label: 'Vehicle' },
                  { key: 'time', label: 'Time', align: 'right', mono: true },
                  { key: 'dist', label: 'Dist', align: 'right', mono: true },
                  { key: 'load', label: 'Load', align: 'right', mono: true },
                ]}
                rows={result.routes.filter(r => r.nodes.length > 2).map(r => ({
                  vehicle: r.vehicleId,
                  time: r.travelTime.toFixed(1),
                  dist: r.distance.toFixed(1),
                  load: r.load,
                }))}
              />
              <p className="text-[12px] text-text-muted mt-3">Client-side demo timing</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 border-r border-b border-border-subtle last:border-r-0">
      <div className="label-editorial mb-1">{label}</div>
      <div className="text-[14px] font-bold text-text-primary capitalize">{value}</div>
    </div>
  );
}
