import React, { useMemo } from 'react';
import { BENCHMARK_EVALUATION_BUDGET, QPSO_SHOWCASE_SCENARIO, useStore } from '../store/useStore';
import {
  PageContainer,
  PageHeader,
  PrimaryButton,
  DataTable,
} from '../components/design-system';
import { chartAxisProps, chartGridProps, chartTooltipStyle } from '../components/design-system';
import { ALGORITHM_COLORS, ALGORITHM_LABELS, AlgorithmType } from '../engine/types';
import { Play, Loader2, BarChart2, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

const RANK_ORDER: AlgorithmType[] = ['qpso', 'pso', 'ga', 'aco', 'exact'];

export function Benchmark() {
  const {
    benchmarkResults,
    runBenchmark,
    isOptimizing,
    optimizationStatus,
    benchmarkMode,
    benchmarkScenario,
    setBenchmarkMode,
    setBenchmarkScenario,
    prepareQpsoShowcase,
    triggerQpsoShowcaseIncident,
    runQpsoShowcase,
    showcaseStage,
    showcaseIncidentRoadId,
    showcaseBaselineBeforeIncident,
    showcaseCurrentRouteAfterIncident,
    showcaseOptimizedByQpso,
    showcaseQpsoBeatsComparison,
    currentResult,
  } = useStore();

  const handleRun = async () => {
    if (isOptimizing) return;
    await runBenchmark();
  };

  const convergenceData = useMemo(() => {
    if (!benchmarkResults.length) return [];
    const maxIter = Math.max(...benchmarkResults.map(r => r.convergenceHistory.length));
    const data = [];
    for (let i = 0; i < maxIter; i++) {
      const point: Record<string, number> = { iteration: i };
      benchmarkResults.forEach(r => {
        point[r.algorithm] = r.convergenceHistory[i] ?? r.convergenceHistory[r.convergenceHistory.length - 1];
      });
      data.push(point);
    }
    return data;
  }, [benchmarkResults]);

  const ranked = useMemo(() => {
    return [...benchmarkResults].sort((a, b) => a.fitness - b.fitness);
  }, [benchmarkResults]);

  const exactResult = benchmarkResults.find(r => r.algorithm === 'exact');
  const isShowcaseScenario = benchmarkScenario === 'showcase';
  const scenarioSubtitle = isShowcaseScenario
    ? `${QPSO_SHOWCASE_SCENARIO.description}. This mode demonstrates QPSO behavior on one selected scenario and is not statistical proof of universal superiority.`
    : benchmarkMode === 'evaluations'
      ? `Common evaluation-budget comparison: up to ${BENCHMARK_EVALUATION_BUDGET.toLocaleString()} complete candidate evaluations per algorithm.`
      : 'Common iteration-based comparison: algorithms run for their configured maximum iterations.';

  const showcaseBaseline = showcaseCurrentRouteAfterIncident;
  const showcaseOptimized = showcaseOptimizedByQpso ?? (
    currentResult?.algorithm === 'qpso'
      ? {
          fitness: currentResult.fitness,
          travelTime: currentResult.travelTime,
          distance: currentResult.totalDistance,
          congestion: currentResult.congestionCost,
        }
      : null
  );
  const showcaseImprovement = showcaseBaseline && showcaseOptimized
    ? {
        travelTime: ((showcaseBaseline.travelTime - showcaseOptimized.travelTime) / showcaseBaseline.travelTime) * 100,
        distance: ((showcaseBaseline.distance - showcaseOptimized.distance) / showcaseBaseline.distance) * 100,
        congestion: ((showcaseBaseline.congestion - showcaseOptimized.congestion) / showcaseBaseline.congestion) * 100,
      }
    : null;

  return (
    <PageContainer className="h-full overflow-y-auto">
      <PageHeader
        title="Algorithm Benchmark"
        subtitle={scenarioSubtitle}
        action={
          <div className="flex items-center gap-4">
            <select
              value={benchmarkScenario}
              onChange={(e) => setBenchmarkScenario(e.target.value as 'research' | 'showcase')}
              disabled={isOptimizing}
              className="bg-bg-surface border-2 border-border text-[13px] font-semibold text-text-primary px-3 py-1.5 focus:outline-none focus:border-text-primary disabled:opacity-50"
            >
              <option value="research">RESEARCH BENCHMARK</option>
              <option value="showcase">QPSO SHOWCASE</option>
            </select>
            <select
              value={benchmarkMode}
              onChange={(e) => setBenchmarkMode(e.target.value as 'evaluations' | 'iterations')}
              disabled={isOptimizing || isShowcaseScenario}
              className="bg-bg-surface border-2 border-border text-[13px] font-semibold text-text-primary px-3 py-1.5 focus:outline-none focus:border-text-primary disabled:opacity-50"
            >
              <option value="evaluations">Mode: Evaluation Budget</option>
              <option value="iterations">Mode: Iteration-based</option>
            </select>
            <PrimaryButton onClick={handleRun} disabled={isOptimizing}>
              {isOptimizing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {optimizationStatus}</>
              ) : (
                <><Play className="w-4 h-4" /> Run Benchmark</>
              )}
            </PrimaryButton>
          </div>
        }
      />

      {isShowcaseScenario && (
        <div className="mb-6 border-2 border-border bg-bg-surface p-4">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-text-muted mb-2">QPSO Showcase</div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-text-primary">
            <span><strong>{QPSO_SHOWCASE_SCENARIO.name}</strong></span>
            <span>Seed: {QPSO_SHOWCASE_SCENARIO.seed}</span>
            <span>Budget: {QPSO_SHOWCASE_SCENARIO.evaluationBudget.toLocaleString()} evals</span>
            <span>Traffic: {QPSO_SHOWCASE_SCENARIO.trafficPreset} ({QPSO_SHOWCASE_SCENARIO.trafficLevel})</span>
            <span>Incident road: {showcaseIncidentRoadId ?? QPSO_SHOWCASE_SCENARIO.incidentRoadId}</span>
            <span>Objectives: {QPSO_SHOWCASE_SCENARIO.weights.travelTime.toFixed(2)} / {QPSO_SHOWCASE_SCENARIO.weights.distance.toFixed(2)} / {QPSO_SHOWCASE_SCENARIO.weights.congestion.toFixed(2)}</span>
            <span>QPSO population: {QPSO_SHOWCASE_SCENARIO.algorithmConfig.populationSize}</span>
            <span>QPSO β: {QPSO_SHOWCASE_SCENARIO.algorithmConfig.explorationParam}</span>
          </div>
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <PrimaryButton variant="secondary" onClick={prepareQpsoShowcase} disabled={isOptimizing}>
              <TrendingUp className="w-4 h-4" /> 1) Prepare Curated Scenario
            </PrimaryButton>
            <PrimaryButton variant="secondary" onClick={triggerQpsoShowcaseIncident} disabled={isOptimizing || showcaseStage === 'idle'}>
              <AlertTriangle className="w-4 h-4" /> 2) Trigger Local Traffic Spike
            </PrimaryButton>
            <PrimaryButton onClick={runQpsoShowcase} disabled={isOptimizing || showcaseStage === 'idle'}>
              <Zap className="w-4 h-4" /> 3) Run QPSO
            </PrimaryButton>
          </div>
          <p className="text-[12px] text-text-muted mt-3">
            Stage: <strong className="text-text-primary">{showcaseStage}</strong>
          </p>
          {showcaseBaselineBeforeIncident && (
            <p className="text-[12px] text-text-muted mt-1">
              Baseline before incident fitness: <strong className="text-text-primary">{showcaseBaselineBeforeIncident.fitness.toFixed(2)}</strong>
            </p>
          )}
          {showcaseBaseline && showcaseOptimized && showcaseImprovement && (
            <div className="mt-4 border-2 border-border-subtle p-3 bg-bg-elevated">
              <div className="label-editorial mb-2">Current Route vs QPSO Optimized Route (actual computed values)</div>
              <div className="grid md:grid-cols-2 gap-2 text-[13px] text-text-primary">
                <div>Current route fitness: <strong>{showcaseBaseline.fitness.toFixed(2)}</strong></div>
                <div>QPSO fitness: <strong>{showcaseOptimized.fitness.toFixed(2)}</strong></div>
                <div>Travel time improvement: <strong>{showcaseImprovement.travelTime.toFixed(1)}%</strong></div>
                <div>Distance improvement: <strong>{showcaseImprovement.distance.toFixed(1)}%</strong></div>
                <div>Congestion improvement: <strong>{showcaseImprovement.congestion.toFixed(1)}%</strong></div>
              </div>
              <p className="text-[12px] text-text-muted mt-2">High-quality route generated by QPSO.</p>
            </div>
          )}
        </div>
      )}

      {!benchmarkResults.length && !isOptimizing ? (
        <div className="h-72 flex flex-col items-center justify-center text-text-muted border-2 border-border bg-bg-surface">
          <BarChart2 className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-[14px] font-medium">Run the benchmark to generate comparative analytics.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col xl:flex-row gap-0 min-h-[440px] border-2 border-border">
            {/* Convergence chart — 70% */}
            <div className="flex-[7] min-h-[380px] p-6 flex flex-col border-b-2 xl:border-b-0 xl:border-r-2 border-border bg-bg-surface">
              <h3 className="text-[14px] font-extrabold text-text-primary mb-1 uppercase tracking-wide">Convergence Profile</h3>
              <p className="text-[12px] text-text-muted mb-5">Best-so-far fitness at recorded search-progress steps</p>
              <div className="flex-1 min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={convergenceData} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
                    <CartesianGrid {...chartGridProps} />
                    <XAxis
                      dataKey="iteration"
                      {...chartAxisProps}
                      label={{ value: 'Recorded progress steps', position: 'bottom', fill: '#737373', fontSize: 11, offset: 0 }}
                    />
                    <YAxis {...chartAxisProps} tickFormatter={v => v.toFixed(0)} width={52} />
                    <RechartsTooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#737373' }} />
                    {benchmarkResults.map(r => (
                      <Line
                        key={r.algorithm}
                        type="monotone"
                        dataKey={r.algorithm}
                        name={ALGORITHM_LABELS[r.algorithm]}
                        stroke={ALGORITHM_COLORS[r.algorithm]}
                        strokeWidth={r.algorithm === 'exact' ? 2 : 2.5}
                        strokeDasharray={r.algorithm === 'exact' ? '8 4' : undefined}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ranking — 30% */}
            <div className="flex-[3] p-6 bg-bg-elevated">
              <h3 className="text-[14px] font-extrabold text-text-primary mb-5 uppercase tracking-wide">Algorithm Ranking</h3>
              <div className="space-y-1">
                {RANK_ORDER.map((algo) => {
                  const result = ranked.find(r => r.algorithm === algo);
                  const rank = ranked.findIndex(r => r.algorithm === algo) + 1;
                  const isReference = algo === 'exact';
                  return (
                    <div
                      key={algo}
                      className={`flex items-center gap-3 px-3 py-3 border-2 transition-colors ${
                        rank === 1 && result ? 'border-border bg-bg-surface shadow-[2px_2px_0_#1a1a1a]' : 'border-transparent hover:bg-bg-hover'
                      }`}
                    >
                      <span className="text-[13px] font-mono font-bold text-text-muted w-6">
                        {result ? String(rank).padStart(2, '0') : '—'}
                      </span>
                      <span className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: ALGORITHM_COLORS[algo] }} />
                      <span className="text-[13px] font-semibold text-text-primary flex-1">{ALGORITHM_LABELS[algo]}</span>
                      {isReference && (
                        <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide px-2 py-0.5 border-2 border-border">
                          Baseline
                        </span>
                      )}
                      {result && (
                        <span className="text-[12px] font-mono font-bold text-text-primary tabular-nums">{result.fitness.toFixed(1)}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {exactResult && (
                <p className="text-[12px] text-text-muted mt-5 leading-relaxed border-t-2 border-border-subtle pt-4">
                  Reference heuristic provides a comparison baseline; it is not a proven optimum.
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-[14px] font-extrabold text-text-primary mb-4 uppercase tracking-wide">Detailed Results</h3>
            <DataTable
              columns={[
                { key: 'algo', label: 'Algorithm' },
                { key: 'fitness', label: 'Final Fitness', align: 'right', mono: true },
                { key: 'time', label: 'Travel Time', align: 'right', mono: true },
                { key: 'dist', label: 'Distance', align: 'right', mono: true },
                { key: 'cong', label: 'Congestion', align: 'right', mono: true },
                { key: 'exec', label: 'Exec Time', align: 'right', mono: true },
                { key: 'evals', label: 'Objective Evals', align: 'right', mono: true },
                { key: 'iter', label: 'Iterations', align: 'right', mono: true },
                { key: 'gap', label: 'Gap to Reference', align: 'right', mono: true },
              ]}
              rows={ranked.map((r) => {
                const refFitness = exactResult?.fitness ?? ranked[0]?.fitness ?? r.fitness;
                const gap = r.algorithm === 'exact' ? '—' : `${(((r.fitness - refFitness) / refFitness) * 100).toFixed(1)}%`;
                return {
                  algo: (
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="w-2.5 h-2.5" style={{ backgroundColor: ALGORITHM_COLORS[r.algorithm] }} />
                      {ALGORITHM_LABELS[r.algorithm]}
                      {r.algorithm === 'exact' && (
                        <span className="text-[11px] text-text-muted uppercase font-bold">Ref</span>
                      )}
                    </span>
                  ),
                  fitness: r.fitness.toFixed(2),
                  time: r.travelTime.toFixed(1),
                  dist: r.totalDistance.toFixed(1),
                  cong: r.congestionCost.toFixed(1),
                  exec: `${r.executionTime}ms`,
                  evals: r.objectiveEvaluations.toLocaleString(),
                  iter: r.iterations,
                  gap,
                };
              })}
              highlightRow={0}
            />
            {isShowcaseScenario && ranked[0] && (
              <p className="text-[12px] text-text-muted mt-3 font-medium">
                {showcaseQpsoBeatsComparison
                  ? 'BEST OBSERVED: QPSO (selected demonstration scenario).'
                  : 'QPSO Showcase Result: focus on adaptation quality over current-route baseline.'}
              </p>
            )}
            <p className="text-[12px] text-text-muted mt-3 font-medium">
              {benchmarkMode === 'evaluations' 
                ? 'Evaluation-budget mode: each row is capped at the same number of complete candidate-solution objective evaluations.'
                : 'Iteration-based mode: algorithms run for their configured maximum iterations, which may hide differences in per-iteration computational cost.'} 
              {' '}Client-side demo timing is not a hardware-independent performance benchmark.
            </p>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
