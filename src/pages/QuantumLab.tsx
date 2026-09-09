import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { PrimaryButton } from '../components/design-system';
import { MathBlock } from '../components/ui/MathBlock';
import { chartAxisProps, chartGridProps } from '../components/design-system';
import { Play, Pause, SkipBack, SkipForward, Info, ChevronRight } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const CONCEPTS = [
  {
    id: '01',
    title: 'Mean Best Position',
    content: 'Unlike standard PSO, QPSO introduces a global attractor called Mean Best Position — the center of mass of all personal best positions.',
    math: 'mbest = \\frac{1}{M} \\sum_{i=1}^{M} P_{i}',
  },
  {
    id: '02',
    title: 'Local Attractor',
    content: 'Each particle evaluates a local attractor point p, defined as a random combination of its personal best and the global best.',
    math: 'p_{i} = \\varphi P_{i} + (1-\\varphi) P_{g}',
  },
  {
    id: '03',
    title: 'Quantum-Inspired Update',
    content: 'Position is updated using a Delta potential well model. Velocity is eliminated. Parameter β shrinks the search radius over time.',
    math: 'X_{i}(t+1) = p_{i} \\pm \\beta |mbest - X_{i}(t)| \\ln(1/u)',
  },
  {
    id: '04',
    title: 'Continuous → Discrete Encoding',
    content: 'Continuous coordinates Xᵢ ∈ [0,1] are converted into customer sequences via Random Key Encoding, then assigned to vehicles under capacity constraints.',
    math: '\\text{sort}(X_i) \\rightarrow \\text{route sequence}',
  },
];

const TIMELINE_MARKS = [0, 9, 24, 49, 99];

export function QuantumLab() {
  const { currentResult, setPage } = useStore();
  const hasQPSOResult = currentResult?.algorithm === 'qpso' && currentResult.particleHistory;
  const history = currentResult?.particleHistory || [];

  const [isPlaying, setIsPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [activeConcept, setActiveConcept] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying && history.length > 0) {
      timer = setInterval(() => {
        setFrame(f => {
          if (f >= history.length - 1) {
            setIsPlaying(false);
            return f;
          }
          return f + 1;
        });
      }, 300);
    }
    return () => clearInterval(timer);
  }, [isPlaying, history.length]);

  const currentFrame = history[frame];

  const scatterData = useMemo(() => {
    const data: { x: number; y: number; type: string; id: number | string }[] =
      currentFrame?.positions.map((p, i) => ({ x: p.x, y: p.y, type: 'particle', id: i })) || [];

    if (currentFrame?.globalBest) {
      data.push({ x: currentFrame.globalBest.x, y: currentFrame.globalBest.y, type: 'gbest', id: 'gbest' });
    }
    if (currentFrame?.meanBest) {
      data.push({ x: currentFrame.meanBest.x, y: currentFrame.meanBest.y, type: 'mbest', id: 'mbest' });
    }
    return data;
  }, [currentFrame]);

  const jumpToIteration = (targetIter: number) => {
    const idx = history.findIndex(h => h.iteration >= targetIter);
    setFrame(idx >= 0 ? idx : history.length - 1);
    setIsPlaying(false);
  };

  return (
    <div className="xl:h-full flex flex-col xl:flex-row xl:overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col bg-bg-primary">
        <div className="px-6 py-5 border-b-2 border-border bg-bg-secondary">
          <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-[20px] sm:text-[24px] font-extrabold text-text-primary uppercase tracking-tight">Quantum Search Space</h1>
              <p className="text-[13px] text-text-secondary mt-1">2D projection of particle swarm dynamics during QPSO optimization</p>
            </div>
            <div className="bg-accent-yellow/20 border-2 border-accent-yellow px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-[12px] font-bold uppercase tracking-wide text-text-primary flex-shrink-0">
              Runs on classical hardware
            </div>
          </div>
        </div>

        <div className="h-[280px] sm:h-[400px] xl:h-auto xl:flex-1 relative border-b-2 border-border">
          {!hasQPSOResult ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted gap-5 bg-bg-elevated">
              <Info className="w-12 h-12 opacity-30" />
              <p className="text-[14px] font-medium">Run a QPSO optimization to visualize particle dynamics.</p>
              <PrimaryButton variant="secondary" onClick={() => setPage('optimizer')}>Go to Optimization</PrimaryButton>
            </div>
          ) : (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#f5f2eb_0%,#edeae3_50%,#f5f2eb_100%)]" />
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 32, right: 32, bottom: 32, left: 32 }}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis type="number" dataKey="x" domain={[0, 1]} {...chartAxisProps} label={{ value: 'Search dim 1', position: 'bottom', fill: '#737373', fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" domain={[0, 1]} {...chartAxisProps} label={{ value: 'Search dim 2', angle: -90, position: 'insideLeft', fill: '#737373', fontSize: 11 }} />
                  <ZAxis type="number" range={[50, 140]} />
                  {currentFrame?.meanBest && (
                    <>
                      <ReferenceLine x={currentFrame.meanBest.x} stroke="#16a34a" strokeDasharray="4 4" strokeOpacity={0.5} />
                      <ReferenceLine y={currentFrame.meanBest.y} stroke="#16a34a" strokeDasharray="4 4" strokeOpacity={0.5} />
                    </>
                  )}
                  <Scatter data={scatterData} isAnimationActive={false}>
                    {scatterData.map(entry => {
                      if (entry.type === 'gbest') return <Cell key={entry.id} fill="#dc2626" stroke="#1a1a1a" strokeWidth={2} />;
                      if (entry.type === 'mbest') return <Cell key={entry.id} fill="#16a34a" stroke="#1a1a1a" strokeWidth={2} />;
                      return <Cell key={entry.id} fill="#7c3aed" fillOpacity={0.6} stroke="#1a1a1a" strokeWidth={0.5} />;
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>

              <div className="absolute top-4 right-4 bg-bg-surface border-2 border-border p-4 text-[12px] space-y-2 shadow-[4px_4px_0_#1a1a1a]">
                <LegendDot color="#7c3aed" label="Candidate particles" />
                <LegendDot color="#16a34a" label="Mean best (mbest)" />
                <LegendDot color="#dc2626" label="Global best (gbest)" />
              </div>
            </>
          )}
        </div>

        {hasQPSOResult && (
          <div className="px-6 py-4 bg-bg-secondary">
            <div className="flex items-center justify-between mb-3 text-[13px]">
              <span>Iteration <span className="font-mono font-bold text-accent">{currentFrame?.iteration ?? 0}</span></span>
              <span>Fitness <span className="font-mono font-bold">{currentFrame?.fitness.toFixed(2) ?? 0}</span></span>
            </div>

            <div className="flex items-center flex-wrap gap-2 mb-3">
              {TIMELINE_MARKS.map(mark => (
                <button
                  key={mark}
                  onClick={() => jumpToIteration(mark + 1)}
                  className={`px-2 py-1 text-[10px] font-bold uppercase border-2 transition-colors ${
                    (currentFrame?.iteration ?? 0) >= mark + 1
                      ? 'border-border bg-bg-inverse text-text-inverse'
                      : 'border-border-subtle text-text-muted hover:border-border'
                  }`}
                >
                  Iter {mark + 1}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setFrame(0)} className="p-2 border-2 border-border hover:bg-bg-hover"><SkipBack className="w-4 h-4" /></button>
              <button onClick={() => setIsPlaying(!isPlaying)} className="p-2.5 bg-bg-inverse text-text-inverse border-2 border-border hover:bg-accent">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button onClick={() => setFrame(history.length - 1)} className="p-2 border-2 border-border hover:bg-bg-hover"><SkipForward className="w-4 h-4" /></button>
              <input
                type="range"
                min={0}
                max={history.length - 1}
                value={frame}
                onChange={e => { setIsPlaying(false); setFrame(parseInt(e.target.value)); }}
                className="flex-1 ml-2"
              />
            </div>
          </div>
        )}
      </div>

      <aside className="w-full xl:w-[400px] flex-shrink-0 border-t-2 xl:border-t-0 xl:border-l-2 border-border bg-bg-secondary xl:overflow-y-auto">
        <div className="p-5 border-b-2 border-border">
          <div className="label-editorial">Explain the Current Step</div>
          <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">
            Select a concept to understand how quantum-inspired search guides route optimization.
          </p>
        </div>

        <div>
          {CONCEPTS.map((concept, i) => (
            <div key={concept.id} className="border-b-2 border-border-subtle">
              <button
                onClick={() => setActiveConcept(i)}
                className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${
                  activeConcept === i ? 'bg-bg-inverse text-text-inverse' : 'hover:bg-bg-hover'
                }`}
              >
                <span className={`text-[12px] font-mono font-bold ${activeConcept === i ? 'text-accent' : 'text-text-muted'}`}>STEP {concept.id}</span>
                <span className="text-[14px] font-bold flex-1">{concept.title}</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeConcept === i ? 'rotate-90' : ''}`} />
              </button>
              <AnimatePresence>
                {activeConcept === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-bg-elevated"
                  >
                    <div className="px-5 pb-5 pt-2">
                      <p className="text-[13px] text-text-secondary leading-relaxed mb-4">{concept.content}</p>
                      <div className="p-4 bg-bg-surface border-2 border-border overflow-x-auto">
                        <MathBlock math={concept.math} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-3 h-3 border border-border" style={{ backgroundColor: color }} />
      <span className="text-text-secondary font-medium">{label}</span>
    </div>
  );
}
