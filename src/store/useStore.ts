// ==========================================================
// Zustand Global Store
// ==========================================================

import { create } from 'zustand';
import {
  NetworkGraph, TrafficState, OptimizationResult, TrafficEvent,
  AlgorithmType, ObjectiveWeights, AlgorithmConfig, OptimizationConfig,
  TrafficPreset, Route,
} from '../engine/types';
import { generateNetwork } from '../engine/network-generator';
import {
  applyTrafficPreset, applyTrafficEvent, applyTrafficEvents, createTrafficEvent,
  getInitialTrafficState,
} from '../engine/traffic-simulator';
import { buildCostMatrix } from '../engine/shortest-path';
import { createAlgorithm } from '../engine/algorithms';
import { normalizeWeights } from '../engine/fitness';
import { decodePosition } from '../engine/route-decoder';

interface AppState {
  // Navigation
  currentPage: string;
  setPage: (page: string) => void;

  // Network
  network: NetworkGraph;
  regenerateNetwork: (nodeCount?: number, customerCount?: number, vehicleCount?: number, seed?: number) => void;

  // Traffic
  trafficState: TrafficState;
  setTrafficLevel: (level: number) => void;
  setTrafficPreset: (preset: TrafficPreset) => void;
  injectTrafficEvent: (type: TrafficEvent['type'], roadId?: string) => void;

  // Optimization
  optimizationConfig: OptimizationConfig;
  setAlgorithm: (algo: AlgorithmType) => void;
  setWeights: (w: Partial<ObjectiveWeights>) => void;
  setAlgorithmConfig: (c: Partial<AlgorithmConfig>) => void;
  isOptimizing: boolean;
  optimizationProgress: number;
  optimizationStatus: string;
  liveOptimizationMetrics: {
    iteration: number;
    maxIteration: number;
    bestFitness: number;
  } | null;
  currentResult: OptimizationResult | null;
  benchmarkResults: OptimizationResult[];
  beforeOptimization: { travelTime: number; distance: number; congestion: number } | null;

  runOptimization: (algo?: AlgorithmType, maxObjectiveEvaluations?: number) => Promise<OptimizationResult>;
  runBenchmark: () => Promise<void>;

  // Routes display
  optimizedRoutes: Route[];
  showOptimizedRoutes: boolean;
  toggleOptimizedRoutes: () => void;

  // UI
  selectedNode: string | null;
  selectedRoad: string | null;
  setSelectedNode: (id: string | null) => void;
  setSelectedRoad: (id: string | null) => void;

  // Events timeline
  eventLog: { time: string; message: string }[];
  addEventLog: (message: string) => void;

  // Simulation time
  simulationTime: Date;

  // Benchmark Mode
  benchmarkMode: 'evaluations' | 'iterations';
  setBenchmarkMode: (mode: 'evaluations' | 'iterations') => void;

  // Global Reset
  resetSimulation: () => void;
}

const initialNetwork = generateNetwork();
const initialTraffic = getInitialTrafficState();
export const BENCHMARK_EVALUATION_BUDGET = 1000;

// Apply initial traffic
const roadsWithTraffic = applyTrafficPreset(
  initialNetwork.roads, initialTraffic.preset, initialTraffic.level,
);
initialNetwork.roads = applyTrafficEvents(roadsWithTraffic, initialTraffic.events);

export const useStore = create<AppState>((set, get) => ({
  currentPage: 'overview',
  setPage: (page) => set({ currentPage: page }),

  network: initialNetwork,
  regenerateNetwork: (nodeCount, customerCount, vehicleCount, seed) => {
    const net = generateNetwork({
      nodeCount: nodeCount ?? 120,
      customerCount: customerCount ?? 15,
      vehicleCount: vehicleCount ?? 5,
      seed: seed ?? Math.floor(Math.random() * 10000),
    });
    const state = get().trafficState;
    const baselineRoads = applyTrafficPreset(net.roads, state.preset, state.level);
    net.roads = applyTrafficEvents(baselineRoads, state.events);
    set({
      network: net,
      currentResult: null,
      optimizedRoutes: [],
      showOptimizedRoutes: false,
      benchmarkResults: [],
    });
  },

  trafficState: initialTraffic,
  setTrafficLevel: (level) => {
    const state = get().trafficState;
    const newState: TrafficState = { ...state, level, timestamp: Date.now() };
    const network = get().network;
    const baselineRoads = applyTrafficPreset(network.roads, state.preset, level);
    const updatedRoads = applyTrafficEvents(baselineRoads, state.events);
    set({
      trafficState: newState,
      network: { ...network, roads: updatedRoads },
    });
  },
  setTrafficPreset: (preset) => {
    const state = get().trafficState;
    const newState: TrafficState = { ...state, preset, timestamp: Date.now() };
    const network = get().network;
    const baselineRoads = applyTrafficPreset(network.roads, preset, state.level);
    const updatedRoads = applyTrafficEvents(baselineRoads, state.events);
    set({
      trafficState: newState,
      network: { ...network, roads: updatedRoads },
    });
    get().addEventLog(`Traffic preset changed to ${preset}`);
  },
  injectTrafficEvent: (type, roadId) => {
    const network = get().network;
    const state = get().trafficState;
    // A user-triggered local event is valid only for the road explicitly
    // selected in the map. Never fall back to a random road: that disconnects
    // the UI selection from the data that routing and rendering consume.
    if (!roadId) {
      get().addEventLog('Select a road before applying a local traffic event');
      return;
    }
    const targetRoad = roadId;
    const event = createTrafficEvent(type, targetRoad);
    const updatedRoads = applyTrafficEvent(network.roads, event);
    set({
      network: { ...network, roads: updatedRoads },
      trafficState: { ...state, events: [...state.events, event], timestamp: Date.now() },
      // A local event changes the cost graph. Do not keep rendering or exposing
      // a route that was optimized against the previous road state.
      currentResult: null,
      optimizedRoutes: [],
      showOptimizedRoutes: false,
      beforeOptimization: null,
    });
    get().addEventLog(event.description);
  },

  optimizationConfig: {
    algorithm: 'qpso',
    algorithmConfig: {
      populationSize: 30,
      maxIterations: 100,
      explorationParam: 0.75,
      seed: 42,
    },
    weights: { travelTime: 0.4, distance: 0.3, congestion: 0.3 },
    vehicleCapacity: 30,
    maxRouteDuration: 480,
    useTimeWindows: false,
  },
  setAlgorithm: (algo) => set(s => ({
    optimizationConfig: { ...s.optimizationConfig, algorithm: algo },
  })),
  setWeights: (w) => set(s => {
    const raw = { ...s.optimizationConfig.weights, ...w };
    return {
      optimizationConfig: {
        ...s.optimizationConfig,
        weights: normalizeWeights(raw),
      },
    };
  }),
  setAlgorithmConfig: (c) => set(s => ({
    optimizationConfig: {
      ...s.optimizationConfig,
      algorithmConfig: { ...s.optimizationConfig.algorithmConfig, ...c },
    },
  })),

  isOptimizing: false,
  optimizationProgress: 0,
  optimizationStatus: '',
  liveOptimizationMetrics: null,
  currentResult: null,
  benchmarkResults: [],
  beforeOptimization: null,
  benchmarkMode: 'evaluations',
  setBenchmarkMode: (mode) => set({ benchmarkMode: mode }),

  runOptimization: async (algoOverride, maxObjectiveEvaluations) => {
    const state = get();
    const cfg = state.optimizationConfig;
    const algoType = algoOverride ?? cfg.algorithm;
    const network = state.network;

    get().addEventLog(`${algoType.toUpperCase()} optimization started`);

    const weights = normalizeWeights(cfg.weights);
    const optimizerConfig: AlgorithmConfig = {
      ...cfg.algorithmConfig,
      maxRouteDuration: cfg.maxRouteDuration,
      useTimeWindows: cfg.useTimeWindows,
      maxObjectiveEvaluations,
    };
    // Build cost matrix for key nodes
    const keyNodeIds = [network.depot, ...network.customers.map(c => c.nodeId)];
    const costMatrix = buildCostMatrix(network.roads, keyNodeIds, weights);
    const depotIdx = 0;

    // Calculate "before" metrics from a randomly initialized naive route
    const randomPos = Array.from({ length: network.customers.length }, () => Math.random());
    const naiveRoutes = decodePosition(
      randomPos, network.customers, network.vehicles.length,
      cfg.vehicleCapacity, depotIdx, costMatrix, weights, optimizerConfig,
    );
    const beforeTT = naiveRoutes.reduce((s, r) => s + r.travelTime, 0);
    const beforeDist = naiveRoutes.reduce((s, r) => s + r.distance, 0);
    const beforeCong = naiveRoutes.reduce((s, r) => s + r.congestionCost, 0);

    const maxIter = maxObjectiveEvaluations ?? cfg.algorithmConfig.maxIterations;

    set({
      isOptimizing: true,
      optimizationProgress: 0,
      optimizationStatus: 'Initializing swarm...',
      liveOptimizationMetrics: { iteration: 0, maxIteration: maxIter, bestFitness: 0 },
      beforeOptimization: { travelTime: beforeTT, distance: beforeDist, congestion: beforeCong },
    });

    // This timer measures one complete optimizer execution: initialization
    // plus the incremental iterations shown to the user. Cost-matrix building
    // is intentionally outside the solver timing.
    const optimizationStartedAt = performance.now();
    const algo = createAlgorithm(algoType);
    algo.initialize(
      network.customers, network.vehicles.length, cfg.vehicleCapacity,
      depotIdx, costMatrix, weights, optimizerConfig,
    );

    // Run optimization with progress updates
    const statusMessages = [
      'Initializing swarm...',
      'Evaluating candidate solutions...',
      'Updating quantum-inspired positions...',
      'Applying constraint repair...',
      'Refining search space...',
      'Convergence detected...',
    ];

    return new Promise<OptimizationResult>((resolve) => {
      let iter = 0;
      const runBatch = () => {
        const batchSize = 5;
        let converged = false;
        for (let b = 0; b < batchSize && iter < maxIter; b++) {
          converged = algo.step();
          iter++;
          if (converged) {
            break;
          }
        }

        const progress = Math.min(100, Math.round(iter / maxIter * 100));
        const msgIdx = Math.min(statusMessages.length - 1, Math.floor(progress / 20));
        set({
          optimizationProgress: progress,
          optimizationStatus: statusMessages[msgIdx],
          liveOptimizationMetrics: {
            iteration: iter,
            maxIteration: maxIter,
            bestFitness: algo.getBestFitness(),
          },
        });

        if (iter < maxIter && !converged) {
          requestAnimationFrame(runBatch);
        } else {
          // Do not call algo.optimize() here: the same optimizer has already
          // executed every displayed iteration. Collect that exact run.
          const result = algo.collectResult(performance.now() - optimizationStartedAt);

          set({
            isOptimizing: false,
            optimizationProgress: 100,
            optimizationStatus: 'High-quality route set generated.',
            liveOptimizationMetrics: null,
            currentResult: result,
            optimizedRoutes: result.routes,
            showOptimizedRoutes: true,
          });

          get().addEventLog(`${algoType.toUpperCase()} optimization complete — Fitness: ${result.fitness.toFixed(2)}`);
          resolve(result);
        }
      };
      requestAnimationFrame(runBatch);
    });
  },

  runBenchmark: async () => {
    const algos: AlgorithmType[] = ['qpso', 'pso', 'ga', 'aco', 'exact'];
    const results: OptimizationResult[] = [];
    const mode = get().benchmarkMode;

    set({ benchmarkResults: [], isOptimizing: true, optimizationStatus: 'Running benchmark...' });

    for (const algo of algos) {
      set({ optimizationStatus: `Benchmarking ${algo.toUpperCase()}...` });
      const evals = mode === 'evaluations' ? BENCHMARK_EVALUATION_BUDGET : undefined;
      const result = await get().runOptimization(algo, evals);
      results.push(result);
    }

    set({
      benchmarkResults: results,
      isOptimizing: false,
      optimizationStatus: 'Benchmark complete',
    });
  },

  optimizedRoutes: [],
  showOptimizedRoutes: false,
  toggleOptimizedRoutes: () => set(s => ({ showOptimizedRoutes: !s.showOptimizedRoutes })),

  selectedNode: null,
  selectedRoad: null,
  setSelectedNode: (id) => set({ selectedNode: id }),
  setSelectedRoad: (id) => set({ selectedRoad: id }),

  eventLog: [
    { time: new Date().toLocaleTimeString(), message: 'System initialized' },
    { time: new Date().toLocaleTimeString(), message: 'Network loaded: Mumbai Smart Logistics' },
    { time: new Date().toLocaleTimeString(), message: 'Traffic simulation active' },
  ],
  addEventLog: (message) => set(s => ({
    eventLog: [
      { time: new Date().toLocaleTimeString(), message },
      ...s.eventLog,
    ].slice(0, 50),
  })),

  simulationTime: new Date(),

  resetSimulation: () => {
    const net = generateNetwork();
    const traffic = getInitialTrafficState();
    const roadsWithTraffic = applyTrafficPreset(
      net.roads, traffic.preset, traffic.level,
    );
    net.roads = applyTrafficEvents(roadsWithTraffic, traffic.events);
    
    set({
      network: net,
      trafficState: traffic,
      optimizationConfig: {
        algorithm: 'qpso',
        algorithmConfig: {
          populationSize: 30,
          maxIterations: 100,
          explorationParam: 0.75,
          seed: 42,
        },
        weights: { travelTime: 0.4, distance: 0.3, congestion: 0.3 },
        vehicleCapacity: 30,
        maxRouteDuration: 480,
        useTimeWindows: false,
      },
      currentResult: null,
      optimizedRoutes: [],
      showOptimizedRoutes: false,
      beforeOptimization: null,
      selectedNode: null,
      selectedRoad: null,
      isOptimizing: false,
      optimizationProgress: 0,
      optimizationStatus: '',
      liveOptimizationMetrics: null,
      eventLog: [
        { time: new Date().toLocaleTimeString(), message: 'System reset to initial deterministic state' },
        { time: new Date().toLocaleTimeString(), message: 'Traffic simulation active' },
      ]
    });
  },
}));
