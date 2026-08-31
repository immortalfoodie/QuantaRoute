// ============================================================
// Core Data Models — Quantum-Inspired Traffic Route Optimization
// ============================================================

export type NodeType = 'intersection' | 'depot' | 'customer';

export interface Node {
  id: string;
  x: number;
  y: number;
  type: NodeType;
  label?: string;
  district?: string;
}

export interface Road {
  id: string;
  from: string;
  to: string;
  distance: number;        // km
  freeFlowSpeed: number;   // km/h
  currentSpeed: number;    // km/h
  lanes: number;
  congestion: number;      // 0..1  (0 = free flow, 1 = gridlock)
  isClosed: boolean;
  isMainRoad: boolean;
}

export interface Vehicle {
  id: string;
  capacity: number;
  currentLoad: number;
  color: string;
  route: string[];         // ordered node ids
  routeEdges: string[];    // ordered road ids on the route
  progress: number;        // 0..1 along the current route
  isActive: boolean;
}

export interface Customer {
  id: string;
  nodeId: string;
  demand: number;
  timeWindowStart: number; // minutes
  timeWindowEnd: number;   // minutes
  serviceDuration: number; // minutes spent serving this customer
  label: string;
}

export interface TrafficEvent {
  id: string;
  type: 'spike' | 'closure' | 'accident' | 'restore';
  roadId: string;
  timestamp: number;
  description: string;
  severity: number;        // 0..1
}

export interface TrafficState {
  level: number;           // 0..100
  preset: TrafficPreset;
  events: TrafficEvent[];
  timestamp: number;
}

export type TrafficPreset =
  | 'free-flow'
  | 'morning-peak'
  | 'afternoon'
  | 'evening-peak'
  | 'heavy-congestion'
  | 'random';

export interface Route {
  vehicleId: string;
  nodes: string[];         // ordered node ids including depot
  distance: number;
  travelTime: number;
  congestionCost: number;
  fitness: number;
  load: number;
  feasible: boolean;
  assignedCustomerIds: string[]; // planned stops; excludes incidental path nodes
}

export interface OptimizationResult {
  algorithm: AlgorithmType;
  fitness: number;
  travelTime: number;
  totalDistance: number;
  congestionCost: number;
  executionTime: number;   // ms
  objectiveEvaluations: number;
  iterations: number;
  routes: Route[];
  convergenceHistory: number[];
  particleHistory?: ParticleSnapshot[];
}

export interface ParticleSnapshot {
  iteration: number;
  positions: { x: number; y: number }[];
  globalBest: { x: number; y: number };
  meanBest?: { x: number; y: number };
  fitness: number;
}

export type AlgorithmType = 'qpso' | 'pso' | 'ga' | 'aco' | 'exact';

export interface AlgorithmConfig {
  populationSize: number;
  maxIterations: number;
  explorationParam: number; // β for QPSO, ω for PSO, etc.
  seed: number;
  /** Optional cap on complete candidate-solution objective evaluations. */
  maxObjectiveEvaluations?: number;
  maxRouteDuration?: number;
  useTimeWindows?: boolean;
}

export interface OptimizationConfig {
  algorithm: AlgorithmType;
  algorithmConfig: AlgorithmConfig;
  weights: ObjectiveWeights;
  vehicleCapacity: number;
  maxRouteDuration: number;
  useTimeWindows: boolean;
}

export interface ObjectiveWeights {
  travelTime: number;
  distance: number;
  congestion: number;
}

export interface NetworkConfig {
  nodeCount: number;
  roadCount: number;
  customerCount: number;
  vehicleCount: number;
  seed: number;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  scenario: string;
  parameters: OptimizationConfig;
  networkConfig: NetworkConfig;
  trafficPreset: TrafficPreset;
  results?: OptimizationResult[];
  status: 'idle' | 'running' | 'completed';
}

export interface Particle {
  position: number[];
  velocity: number[];
  personalBest: number[];
  personalBestFitness: number;
  fitness: number;
}

export interface CostMatrix {
  distances: number[][];
  travelTimes: number[][];
  congestions: number[][];
  paths: string[][][];
  nodeIds: string[];
}

// Network graph as adjacency
export interface NetworkGraph {
  nodes: Node[];
  roads: Road[];
  customers: Customer[];
  vehicles: Vehicle[];
  depot: string;           // node id of depot
}

// Algorithm algorithm labels for display
export const ALGORITHM_LABELS: Record<AlgorithmType, string> = {
  qpso: 'Quantum PSO',
  pso: 'Particle Swarm',
  ga: 'Genetic Algorithm',
  aco: 'Ant Colony',
  exact: 'Reference Heuristic',
};

export const ALGORITHM_COLORS: Record<AlgorithmType, string> = {
  qpso: '#8b5cf6',
  pso: '#3b82f6',
  ga: '#10b981',
  aco: '#f59e0b',
  exact: '#ef4444',
};

export const VEHICLE_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];
