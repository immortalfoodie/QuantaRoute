import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
  PageContainer,
  PageHeader,
  PrimaryButton,
  DataTable,
} from '../components/design-system';
import { chartAxisProps, chartGridProps, chartTooltipStyle } from '../components/design-system';
import { ALGORITHM_COLORS, ALGORITHM_LABELS, AlgorithmType } from '../engine/types';
import { Play, Loader2, BarChart2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

const RANK_ORDER: AlgorithmType[] = ['qpso', 'pso', 'ga', 'aco', 'exact'];

export function Benchmark() {
  const { benchmarkResults, runBenchmark, isOptimizing, optimizationStatus } = useStore();

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

  return (
    <PageContainer className="h-full overflow-y-auto">
      <PageHeader
        title="Algorithm Benchmark"
        subtitle="Compare solution quality, convergence and computational efficiency."
        action={
          <PrimaryButton onClick={handleRun} disabled={isOptimizing}>
            {isOptimizing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {optimizationStatus}</>
            ) : (
              <><Play className="w-4 h-4" /> Run Benchmark</>
            )}
          </PrimaryButton>
        }
      />

      {!benchmarkResults.length && !isOptimizing ? (
        <div className="h-72 flex flex-col items-center justify-center text-text-muted border-2 border-border bg-bg-surface">
          <BarChart2 className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-[14px] font-medium">Run the benchmark to generate comparative analytics.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col xl:flex-row gap-0 min-h-[440px] border-2 border-border">
            {/* Convergence chart — 70% */}
            <div className="flex-[7] min-h-[300px] sm:min-h-[380px] p-4 sm:p-6 flex flex-col border-b-2 xl:border-b-0 xl:border-r-2 border-border bg-bg-surface">
              <h3 className="text-[14px] font-extrabold text-text-primary mb-1 uppercase tracking-wide">Convergence Profile</h3>
              <p className="text-[12px] text-text-muted mb-5">Fitness improvement over iterations</p>
              <div className="flex-1 min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={convergenceData} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
                    <CartesianGrid {...chartGridProps} />
                    <XAxis
                      dataKey="iteration"
                      {...chartAxisProps}
                      label={{ value: 'Iterations', position: 'bottom', fill: '#737373', fontSize: 11, offset: 0 }}
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
            <div className="flex-[3] p-4 sm:p-6 bg-bg-elevated">
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
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider px-2 py-0.5 border-2 border-border">
                          Reference Baseline
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
                  Reference solver provides the baseline. Metaheuristics approximate this within computational budget.
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
                { key: 'iter', label: 'Iterations', align: 'right', mono: true },
                { key: 'gap', label: 'Optimality Gap', align: 'right', mono: true },
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
                        <span className="text-[9px] text-text-muted uppercase font-bold">Ref</span>
                      )}
                    </span>
                  ),
                  fitness: r.fitness.toFixed(2),
                  time: r.travelTime.toFixed(1),
                  dist: r.totalDistance.toFixed(1),
                  cong: r.congestionCost.toFixed(1),
                  exec: `${r.executionTime}ms`,
                  iter: r.iterations,
                  gap,
                };
              })}
              highlightRow={0}
            />
            <p className="text-[11px] text-text-muted mt-3 font-medium uppercase tracking-wide">
              Client-side demo timing — not scientifically meaningful execution-time comparisons
            </p>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
