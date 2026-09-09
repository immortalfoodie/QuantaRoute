import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { NetworkCanvas } from '../components/network/NetworkCanvas';
import {
  Section,
  AlgorithmSelector,
  WeightSlider,
  NumberInput,
  ParameterGroup,
  OptimizationStatus,
  ProgressIndicator,
  RouteTimeline,
  PrimaryButton,
} from '../components/design-system';
import { ALGORITHM_LABELS, VEHICLE_COLORS } from '../engine/types';
import { Play, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function RouteOptimizer() {
  const {
    network,
    optimizationConfig,
    setAlgorithm,
    setWeights,
    setAlgorithmConfig,
    runOptimization,
    isOptimizing,
    optimizationProgress,
    optimizationStatus,
    liveOptimizationMetrics,
    currentResult,
    beforeOptimization,
    showOptimizedRoutes,
  } = useStore();

  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const cfg = optimizationConfig;

  const handleRun = async () => {
    if (isOptimizing) return;
    setSelectedVehicle(null);
    await runOptimization();
  };

  const improvement = beforeOptimization && currentResult
    ? ((beforeOptimization.travelTime - currentResult.travelTime) / beforeOptimization.travelTime) * 100
    : undefined;

  const activeRoutes = currentResult?.routes.filter(r => r.nodes.length > 2) ?? [];
  const highlightId = selectedVehicle ?? activeRoutes[0]?.vehicleId ?? null;
  const optStatus = isOptimizing ? 'running' : currentResult ? 'converged' : 'ready';

  const exploration = cfg.algorithm === 'qpso' && liveOptimizationMetrics
    ? cfg.algorithmConfig.explorationParam * (1 - (liveOptimizationMetrics.iteration / liveOptimizationMetrics.maxIteration) * 0.5)
    : cfg.algorithmConfig.explorationParam;

  return (
    <div className="lg:h-full flex flex-col lg:flex-row lg:overflow-hidden">
      {/* LEFT: Configuration */}
      <aside className="w-full lg:w-[260px] xl:w-[280px] flex-shrink-0 border-b-2 lg:border-b-0 lg:border-r-2 border-border bg-bg-secondary lg:overflow-y-auto">
        <div className="p-4 border-b-2 border-border bg-bg-elevated">
          <div className="label-editorial mb-1">Algorithm</div>
          <div className="text-[14px] font-extrabold text-text-primary uppercase">{cfg.algorithm}</div>
          <div className="text-[12px] text-text-muted mt-1">{ALGORITHM_LABELS[cfg.algorithm]}</div>
        </div>

        <div className="px-4">
          <Section title="Algorithm" defaultOpen>
            <AlgorithmSelector value={cfg.algorithm} onChange={setAlgorithm} />
          </Section>

          <Section title="Objective" defaultOpen>
            <WeightSlider label="Travel Time" value={cfg.weights.travelTime} onChange={v => setWeights({ travelTime: v })} />
            <WeightSlider label="Distance" value={cfg.weights.distance} onChange={v => setWeights({ distance: v })} />
            <WeightSlider label="Congestion" value={cfg.weights.congestion} onChange={v => setWeights({ congestion: v })} />
          </Section>

          <Section title="Constraints" defaultOpen={false}>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-text-muted font-medium">Vehicle Capacity</span>
                <span className="font-mono font-bold text-text-primary">{cfg.vehicleCapacity} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted font-medium">Time Windows</span>
                <span className="font-semibold text-text-primary">{cfg.useTimeWindows ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted font-medium">Max Duration</span>
                <span className="font-mono font-bold text-text-primary">{cfg.maxRouteDuration} min</span>
              </div>
            </div>
          </Section>

          <Section title="Parameters" defaultOpen={false}>
            <div className="space-y-3">
              <ParameterGroup label="Population">
                <NumberInput value={cfg.algorithmConfig.populationSize} onChange={v => setAlgorithmConfig({ populationSize: v || 30 })} />
              </ParameterGroup>
              <ParameterGroup label="Iterations">
                <NumberInput value={cfg.algorithmConfig.maxIterations} onChange={v => setAlgorithmConfig({ maxIterations: v || 100 })} />
              </ParameterGroup>
              {cfg.algorithm === 'qpso' && (
                <ParameterGroup label="β">
                  <NumberInput value={cfg.algorithmConfig.explorationParam} step={0.05} onChange={v => setAlgorithmConfig({ explorationParam: v || 0.75 })} />
                </ParameterGroup>
              )}
              <ParameterGroup label="Random Seed">
                <NumberInput value={cfg.algorithmConfig.seed} onChange={v => setAlgorithmConfig({ seed: v || 42 })} />
              </ParameterGroup>
            </div>
          </Section>
        </div>

        <div className="p-4 border-t-2 border-border sticky bottom-0 bg-bg-secondary">
          <PrimaryButton onClick={handleRun} disabled={isOptimizing} className="w-full">
            {isOptimizing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
            ) : (
              <><Play className="w-4 h-4" /> Run Optimization</>
            )}
          </PrimaryButton>
        </div>
      </aside>

      {/* CENTER: Optimization canvas */}
      <div className="h-[300px] sm:h-[400px] lg:h-auto lg:flex-1 min-w-0 relative border-b-2 lg:border-b-0 lg:border-r-2 border-border">
        <NetworkCanvas highlightVehicleId={showOptimizedRoutes ? highlightId : null} showVehicles={showOptimizedRoutes} />

        <AnimatePresence>
          {isOptimizing && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 lg:right-auto lg:max-w-md bg-bg-inverse text-text-inverse border-2 border-border p-3 sm:p-5 z-10 shadow-[6px_6px_0_#7c3aed]"
            >
              <div className="label-editorial mb-3 text-text-muted">Optimization Running</div>
              <ProgressIndicator
                value={optimizationProgress}
                label={`Iteration ${liveOptimizationMetrics?.iteration ?? 0} / ${liveOptimizationMetrics?.maxIteration ?? cfg.algorithmConfig.maxIterations}`}
              />
              <div className="grid grid-cols-2 gap-4 mt-4 text-[12px]">
                <LiveMetric label="Current Fitness" value={liveOptimizationMetrics?.bestFitness.toFixed(2) ?? '—'} />
                <LiveMetric label="Best Fitness" value={liveOptimizationMetrics?.bestFitness.toFixed(2) ?? '—'} />
                <LiveMetric label="Population" value={String(cfg.algorithmConfig.populationSize)} />
                {cfg.algorithm === 'qpso' && (
                  <LiveMetric label="Exploration (β)" value={exploration.toFixed(2)} />
                )}
                <LiveMetric label="Status" value={optimizationStatus} span />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT: Summary */}
      <aside className="w-full lg:w-[300px] xl:w-[320px] flex-shrink-0 bg-bg-secondary lg:overflow-y-auto">
        <div className="p-5 border-b-2 border-border">
          <OptimizationStatus
            status={optStatus}
            progress={optimizationProgress}
            iteration={liveOptimizationMetrics?.iteration ?? currentResult?.iterations}
            maxIteration={liveOptimizationMetrics?.maxIteration ?? cfg.algorithmConfig.maxIterations}
            fitness={liveOptimizationMetrics?.bestFitness ?? currentResult?.fitness}
            improvement={improvement}
            travelTime={currentResult?.travelTime}
            distance={currentResult?.totalDistance}
            congestion={currentResult?.congestionCost}
          />
        </div>

        {currentResult && !isOptimizing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 space-y-5">
            <div>
              <div className="label-editorial mb-2">Run Summary</div>
              <div className="text-[12px] text-text-muted font-medium">
                {ALGORITHM_LABELS[currentResult.algorithm]} · {currentResult.executionTime}ms (client-side demo) · {currentResult.iterations} iter
              </div>
            </div>

            <div>
              <div className="label-editorial mb-3">Route Summary</div>
              <div className="space-y-3">
                {activeRoutes.map((route, i) => (
                  <RouteTimeline
                    key={route.vehicleId}
                    route={route}
                    network={network}
                    vehicleCapacity={cfg.vehicleCapacity}
                    color={VEHICLE_COLORS[i % VEHICLE_COLORS.length]}
                    active={highlightId === route.vehicleId}
                    onClick={() => setSelectedVehicle(route.vehicleId)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {!currentResult && !isOptimizing && (
          <div className="p-6 text-[14px] text-text-muted text-center leading-relaxed">
            Configure parameters and run optimization to see route results.
          </div>
        )}
      </aside>
    </div>
  );
}

function LiveMetric({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">{label}</div>
      <div className="font-mono font-bold text-[14px] tabular-nums truncate">{value}</div>
    </div>
  );
}
