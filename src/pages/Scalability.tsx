import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  PageContainer,
  PageHeader,
  PrimaryButton,
  ProgressIndicator,
} from '../components/design-system';
import { chartAxisProps, chartGridProps, chartTooltipStyle } from '../components/design-system';
import { Play, TrendingUp, Loader2 } from 'lucide-react';
import {
  ComposedChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';

interface ScaleResult {
  size: number;
  label: string;
  time: number;
  fitness: number;
  distance: number;
}

const PROBLEM_SIZES = [10, 25, 50, 100, 250];

export function Scalability() {
  const { optimizationConfig, runOptimization, regenerateNetwork, setAlgorithmConfig } = useStore();

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ScaleResult[]>([]);
  const [progress, setProgress] = useState(0);

  const [customers, setCustomers] = useState(15);
  const [vehicles, setVehicles] = useState(5);
  const [nodes, setNodes] = useState(120);
  const [iterations, setIterations] = useState(50);

  const problemSizes = [
    { customers: 10, nodes: 40, vehicles: 3 },
    { customers: 25, nodes: 80, vehicles: 5 },
    { customers: 50, nodes: 150, vehicles: 10 },
    { customers: 100, nodes: 300, vehicles: 20 },
    { customers: 250, nodes: 600, vehicles: 40 },
  ];

  const handleRunExperiment = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setResults([]);
    setProgress(0);

    const originalState = useStore.getState();
    const { network, trafficState, optimizationConfig, currentResult, optimizedRoutes, showOptimizedRoutes } = originalState;
    const experimentResults: ScaleResult[] = [];
    
    setAlgorithmConfig({ maxIterations: iterations });

    try {
      for (let i = 0; i < problemSizes.length; i++) {
        const size = problemSizes[i];
        regenerateNetwork(size.nodes, size.customers, size.vehicles, 42);
        await new Promise(r => setTimeout(r, 100));

        const res = await runOptimization('qpso');
        experimentResults.push({
          size: size.customers,
          label: `${size.customers}`,
          time: res.executionTime,
          fitness: res.fitness,
          distance: res.totalDistance,
        });

        setResults([...experimentResults]);
        setProgress(Math.round(((i + 1) / problemSizes.length) * 100));
      }
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
      setIsRunning(false);
    }
  };

  return (
    <PageContainer className="h-full overflow-y-auto">
      <PageHeader
        title="Scalability Analysis"
        subtitle="Measure observed computational growth and solution quality as problem complexity increases."
      />

      <div className="flex flex-wrap items-end gap-4 mb-8 pb-6 border-b-2 border-border">
        <ControlInput label="Customers" value={customers} onChange={setCustomers} />
        <ControlInput label="Vehicles" value={vehicles} onChange={setVehicles} />
        <ControlInput label="Nodes" value={nodes} onChange={setNodes} />
        <ControlInput label="Iterations" value={iterations} onChange={setIterations} />
        <PrimaryButton onClick={handleRunExperiment} disabled={isRunning} className="ml-auto">
          {isRunning ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
          ) : (
            <><Play className="w-4 h-4" /> Run Scalability Experiment</>
          )}
        </PrimaryButton>
      </div>

      {isRunning && (
        <div className="mb-8">
          <ProgressIndicator value={progress} label="Evaluating scaling profiles..." />
        </div>
      )}

      {results.length === 0 && !isRunning ? (
        <div className="h-56 flex flex-col items-center justify-center text-text-muted border-2 border-border bg-bg-surface">
          <TrendingUp className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-[14px] font-medium">Run the experiment to analyze computational scaling.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-border">
            <ChartPanel title="01 Execution Time" subtitle="Measured runtime (client-side demo)">
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={results}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="label" {...chartAxisProps} />
                  <YAxis {...chartAxisProps} width={44} />
                  <RechartsTooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="time" fill="#2563eb" maxBarSize={36} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel title="02 Solution Quality" subtitle="Fitness vs problem size">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={results}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="label" {...chartAxisProps} />
                  <YAxis {...chartAxisProps} width={44} />
                  <RechartsTooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="fitness" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: '#16a34a', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel title="03 Convergence" subtitle="Distance vs problem size">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={results}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="label" {...chartAxisProps} />
                  <YAxis {...chartAxisProps} width={44} />
                  <RechartsTooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="distance" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <div className="border-2 border-border bg-bg-surface p-4 sm:p-6">
            <h3 className="text-[14px] font-extrabold text-text-primary mb-1 uppercase tracking-wide">Problem Complexity</h3>
            <p className="text-[12px] text-text-muted mb-5">Observed computational growth across increasing customer counts</p>

            <div className="flex flex-wrap gap-2 mb-5">
              {PROBLEM_SIZES.map(size => (
                <div key={size} className="flex-1 min-w-[40px] text-center py-2 border-2 border-border-subtle text-[12px] font-bold font-mono">
                  {size}
                </div>
              ))}
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={results} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="label" {...chartAxisProps} label={{ value: 'Customers', position: 'bottom', fill: '#737373', fontSize: 11, offset: 0 }} />
                  <YAxis yAxisId="left" {...chartAxisProps} width={52} />
                  <YAxis yAxisId="right" orientation="right" {...chartAxisProps} width={52} />
                  <RechartsTooltip contentStyle={chartTooltipStyle} />
                  <Bar yAxisId="left" dataKey="time" fill="#7c3aed" fillOpacity={0.8} name="Time (ms)" />
                  <Line yAxisId="right" type="monotone" dataKey="fitness" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 5, fill: '#16a34a', strokeWidth: 0 }} name="Fitness" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[12px] text-text-muted mt-5 leading-relaxed border-t-2 border-border-subtle pt-4">
              Measured runtime as problem size increases. Execution times are client-side demo measurements and should not be interpreted as rigorous benchmarks.
            </p>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function ControlInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label-editorial block mb-2">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className="w-24 bg-bg-surface border-2 border-border px-3 py-2 text-[14px] font-mono font-bold text-text-primary focus:border-accent outline-none"
      />
    </div>
  );
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="p-5 border-b-2 md:border-b-0 md:border-r-2 border-border last:border-r-0 last:border-b-0">
      <div className="mb-4">
        <div className="text-[13px] font-extrabold text-text-primary uppercase tracking-wide">{title}</div>
        <div className="text-[11px] text-text-muted mt-0.5">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}
