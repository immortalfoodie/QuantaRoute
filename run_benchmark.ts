import { performance } from 'perf_hooks';

// Mock browser globals before importing anything
(globalThis as any).performance = performance;
(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);

import { generateNetwork } from './src/engine/network-generator';
import { getInitialTrafficState, applyTrafficPreset, applyTrafficEvents } from './src/engine/traffic-simulator';
import { buildCostMatrix } from './src/engine/shortest-path';
import { createAlgorithm } from './src/engine/algorithms';
import { normalizeWeights } from './src/engine/fitness';
import { AlgorithmType, AlgorithmConfig } from './src/engine/types';

async function runTest(seedOverride?: number) {
  const initialNetwork = generateNetwork();
  const initialTraffic = getInitialTrafficState();

  const roadsWithTraffic = applyTrafficPreset(
    initialNetwork.roads, initialTraffic.preset, initialTraffic.level,
  );
  initialNetwork.roads = applyTrafficEvents(roadsWithTraffic, initialTraffic.events);

  const cfg = {
    algorithmConfig: {
      populationSize: 30,
      maxIterations: 100,
      explorationParam: 0.75,
      seed: seedOverride ?? 42,
    },
    weights: { travelTime: 0.4, distance: 0.3, congestion: 0.3 },
    vehicleCapacity: 30,
    maxRouteDuration: 480,
    useTimeWindows: false,
  };

  const weights = normalizeWeights(cfg.weights);
  const maxObjectiveEvaluations = 1000;
  const optimizerConfig: AlgorithmConfig = {
    ...cfg.algorithmConfig,
    maxRouteDuration: cfg.maxRouteDuration,
    useTimeWindows: cfg.useTimeWindows,
    maxObjectiveEvaluations,
  };

  const keyNodeIds = [initialNetwork.depot, ...initialNetwork.customers.map(c => c.nodeId)];
  const costMatrix = buildCostMatrix(initialNetwork.roads, keyNodeIds, weights);
  const depotIdx = 0;

  const algos: AlgorithmType[] = ['qpso', 'pso', 'ga', 'aco', 'exact'];

  console.log(`\n=== Running Benchmark (Seed: ${optimizerConfig.seed}) ===\n`);
  console.log("Algorithm | Evals | Iters | Fitness | Time | Dist | Cong | Runtime");

  for (const algoType of algos) {
    const algo = createAlgorithm(algoType);
    
    algo.initialize(
      initialNetwork.customers, initialNetwork.vehicles.length, cfg.vehicleCapacity,
      depotIdx, costMatrix, weights, optimizerConfig,
    );

    const startTime = performance.now();
    let iter = 0;
    let converged = false;

    // Use maxIter just like in the app
    const maxIter = 1000;

    for (let b = 0; b < maxIter; b++) {
      converged = algo.step();
      iter++;
      if (converged) {
        break;
      }
    }

    const result = algo.collectResult(performance.now() - startTime);
    console.log(`${algoType.padEnd(10)} | ${result.objectiveEvaluations.toString().padEnd(5)} | ${result.iterations.toString().padEnd(5)} | ${result.fitness.toFixed(1).padEnd(7)} | ${result.travelTime.toFixed(1).padEnd(4)} | ${result.totalDistance.toFixed(1).padEnd(4)} | ${result.congestionCost.toFixed(1).padEnd(4)} | ${result.executionTime}ms`);
  }
}

async function main() {
  await runTest(42);
  await runTest(42);
  await runTest(999);
}

main().catch(console.error);
