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
  TabBar,
} from '../components/design-system';
import { ALGORITHM_LABELS, VEHICLE_COLORS } from '../engine/types';
import { Play, Loader2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ConfigTab = 'setup' | 'advanced';

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
  const [configTab, setConfigTab] = useState<ConfigTab>('setup');
  const [configOpen, setConfigOpen] = useState(true);
  const [resultsOpen, setResultsOpen] = useState(true);
  const cfg = optimizationConfig;

  const handleRun = async () => {
    if (isOptimizing) return;
    setSelectedVehicle(null);
    setResultsOpen(true);
    await runOptimization();
  };

  const improvement = beforeOptimization && currentResult
    ? ((beforeOptimization.travelTime - currentResult.travelTime) / beforeOptimization.travelTime) * 100
    : undefined;

  const activeRoutes = currentResult?.routes.filter(r => r.nodes.length > 2) ?? [];
  const highlightId = selectedVehicle ?? activeRoutes[0]?.vehicleId ?? null;
  const optStatus = isOptimizing ? 'running' : currentResult ? 'converged' : 'ready';
  const showResultsPanel = resultsOpen && (currentResult || isOptimizing);

  const exploration = cfg.algorithm === 'qpso' && liveOptimizationMetrics
    ? cfg.algorithmConfig.explorationParam * (1 - (liveOptimizationMetrics.iteration / liveOptimizationMetrics.maxIteration) * 0.5)
    : cfg.algorithmConfig.explorationParam;

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* LEFT: Configuration drawer */}
      <AnimatePresence initial={false}>
        {configOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full lg:w-[320px] xl:w-[340px] flex-shrink-0 border-r-2 border-border bg-bg-secondary overflow-hidden flex flex-col"
          >
            <div className="p-5 border-b-2 border-border bg-bg-elevated">
              <div className="label-editorial mb-1">Configuration</div>
              <div className="text-[16px] font-extrabold text-text-primary uppercase">{ALGORITHM_LABELS[cfg.algorithm]}</div>
            </div>

            <TabBar
              tabs={[
                { id: 'setup', label: 'Setup' },
                { id: 'advanced', label: 'Advanced' },
              ]}
              active={configTab}
              onChange={id => setConfigTab(id as ConfigTab)}
            />

            <div className="flex-1 overflow-y-auto px-4">
              {configTab === 'setup' && (
                <>
                  <Section title="Algorithm" defaultOpen>
                    <AlgorithmSelector value={cfg.algorithm} onChange={setAlgorithm} />
                  </Section>
                  <Section title="Objective Weights" defaultOpen>
                    <WeightSlider label="Travel Time" value={cfg.weights.travelTime} onChange={v => setWeights({ travelTime: v })} />
                    <WeightSlider label="Distance" value={cfg.weights.distance} onChange={v => setWeights({ distance: v })} />
                    <WeightSlider label="Congestion" value={cfg.weights.congestion} onChange={v => setWeights({ congestion: v })} />
                  </Section>
                </>
              )}

              {configTab === 'advanced' && (
                <>
                  <Section title="Constraints" defaultOpen>
                    <div className="space-y-4 text-[14px]">
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
                  <Section title="Solver Parameters" defaultOpen>
                    <div className="space-y-4">
                      <ParameterGroup label="Population">
                        <NumberInput value={cfg.algorithmConfig.populationSize} onChange={v => setAlgorithmConfig({ populationSize: v || 30 })} />
                      </ParameterGroup>
                      <ParameterGroup label="Iterations">
                        <NumberInput value={cfg.algorithmConfig.maxIterations} onChange={v => setAlgorithmConfig({ maxIterations: v || 100 })} />
                      </ParameterGroup>
                      {cfg.algorithm === 'qpso' && (
                        <ParameterGroup label="β (Exploration)">
                          <NumberInput value={cfg.algorithmConfig.explorationParam} step={0.05} onChange={v => setAlgorithmConfig({ explorationParam: v || 0.75 })} />
                        </ParameterGroup>
                      )}
                      <ParameterGroup label="Random Seed">
                        <NumberInput value={cfg.algorithmConfig.seed} onChange={v => setAlgorithmConfig({ seed: v || 42 })} />
                      </ParameterGroup>
                    </div>
                  </Section>
                </>
              )}
            </div>

            <div className="p-4 border-t-2 border-border bg-bg-secondary">
              <PrimaryButton onClick={handleRun} disabled={isOptimizing} className="w-full">
                {isOptimizing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
                ) : (
                  <><Play className="w-4 h-4" /> Run Optimization</>
                )}
              </PrimaryButton>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* CENTER: Canvas — primary focus */}
      <div className="flex-1 min-w-0 relative flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-border bg-bg-secondary flex-shrink-0">
          <button
            type="button"
            onClick={() => setConfigOpen(v => !v)}
            className="p-2 border-2 border-border hover:bg-bg-hover transition-colors"
            aria-label={configOpen ? 'Hide configuration' : 'Show configuration'}
          >
            {configOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <span className="text-[14px] font-semibold text-text-primary">Network View</span>
          <div className="flex-1" />
          {(currentResult || isOptimizing) && (
            <button
              type="button"
              onClick={() => setResultsOpen(v => !v)}
              className="p-2 border-2 border-border hover:bg-bg-hover transition-colors"
              aria-label={resultsOpen ? 'Hide results' : 'Show results'}
            >
              {resultsOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 relative">
          <NetworkCanvas highlightVehicleId={showOptimizedRoutes ? highlightId : null} showVehicles={showOptimizedRoutes} />

          <AnimatePresence>
            {isOptimizing && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="absolute bottom-6 left-6 right-6 lg:right-auto lg:w-[420px] bg-bg-inverse text-text-inverse border-2 border-border p-6 z-10 shadow-[6px_6px_0_#7c3aed]"
              >
                <div className="label-editorial mb-4 text-text-muted">Optimization Running</div>
                <ProgressIndicator
                  value={optimizationProgress}
                  label={`Iteration ${liveOptimizationMetrics?.iteration ?? 0} / ${liveOptimizationMetrics?.maxIteration ?? cfg.algorithmConfig.maxIterations}`}
                />
                <div className="grid grid-cols-2 gap-5 mt-5">
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
      </div>

      {/* RIGHT: Results inspector — only when there is something to show */}
      <AnimatePresence initial={false}>
        {showResultsPanel && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full lg:w-[340px] xl:w-[380px] flex-shrink-0 bg-bg-secondary overflow-hidden flex flex-col border-l-2 border-border"
          >
            <div className="p-5 border-b-2 border-border overflow-y-auto flex-1">
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

              {currentResult && !isOptimizing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-6">
                  <div>
                    <div className="label-editorial mb-2">Run Summary</div>
                    <div className="text-[14px] text-text-secondary leading-relaxed">
                      {ALGORITHM_LABELS[currentResult.algorithm]}
                      <span className="text-text-muted"> · {currentResult.iterations} iterations</span>
                    </div>
                  </div>

                  <div>
                    <div className="label-editorial mb-4">Routes</div>
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
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveMetric({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <div className="label-editorial mb-1">{label}</div>
      <div className="font-mono font-bold text-[16px] tabular-nums truncate">{value}</div>
    </div>
  );
}
