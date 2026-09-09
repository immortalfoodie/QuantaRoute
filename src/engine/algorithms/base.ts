// ==========================================================
// Optimization Algorithm — Base Interface
// ==========================================================

import {
  AlgorithmConfig, AlgorithmType, CostMatrix, Customer,
  ObjectiveWeights, OptimizationResult, ParticleSnapshot, Route,
} from '../types';
import { decodePosition } from '../route-decoder';
import { totalFitness } from '../route-decoder';

export interface OptimizationAlgorithm {
  readonly type: AlgorithmType;
  readonly name: string;

  initialize(
    customers: Customer[],
    vehicleCount: number,
    vehicleCapacity: number,
    depotIdx: number,
    costMatrix: CostMatrix,
    weights: ObjectiveWeights,
    config: AlgorithmConfig,
  ): void;

  /** Run a single iteration. Returns true if converged. */
  step(): boolean;

  /** Run full optimization. */
  optimize(): OptimizationResult;

  /** Snapshot current best solution without running additional iterations. */
  collectResult(executionTimeMs: number): OptimizationResult;

  getBestFitness(): number;
  getBestRoutes(): Route[];
  getConvergenceHistory(): number[];
  getParticleSnapshots(): ParticleSnapshot[];
  getCurrentIteration(): number;
  getObjectiveEvaluations(): number;
}

export abstract class BaseOptimizer implements OptimizationAlgorithm {
  abstract readonly type: AlgorithmType;
  abstract readonly name: string;

  protected customers!: Customer[];
  protected vehicleCount!: number;
  protected vehicleCapacity!: number;
  protected depotIdx!: number;
  protected costMatrix!: CostMatrix;
  protected weights!: ObjectiveWeights;
  protected config!: AlgorithmConfig;

  protected bestFitness = Infinity;
  protected bestRoutes: Route[] = [];
  protected convergenceHistory: number[] = [];
  protected particleSnapshots: ParticleSnapshot[] = [];
  protected iteration = 0;
  protected objectiveEvaluations = 0;

  initialize(
    customers: Customer[],
    vehicleCount: number,
    vehicleCapacity: number,
    depotIdx: number,
    costMatrix: CostMatrix,
    weights: ObjectiveWeights,
    config: AlgorithmConfig,
  ): void {
    this.customers = customers;
    this.vehicleCount = vehicleCount;
    this.vehicleCapacity = vehicleCapacity;
    this.depotIdx = depotIdx;
    this.costMatrix = costMatrix;
    this.weights = weights;
    this.config = config;
    this.bestFitness = Infinity;
    this.bestRoutes = [];
    this.convergenceHistory = [];
    this.particleSnapshots = [];
    this.iteration = 0;
    this.objectiveEvaluations = 0;
    this.init();
  }

  protected decode(position: number[]): Route[] {
    return decodePosition(
      position,
      this.customers,
      this.vehicleCount,
      this.vehicleCapacity,
      this.depotIdx,
      this.costMatrix,
      this.weights,
      {
        maxRouteDuration: this.config.maxRouteDuration,
        useTimeWindows: this.config.useTimeWindows,
      },
    );
  }

  /** Counts one complete candidate solution evaluated against the objective. */
  protected evaluate(position: number[]): { routes: Route[]; fitness: number } | null {
    if (!this.hasEvaluationBudget()) return null;
    const routes = this.decode(position);
    this.objectiveEvaluations++;
    return { routes, fitness: totalFitness(routes) };
  }

  protected hasEvaluationBudget(): boolean {
    return this.config.maxObjectiveEvaluations === undefined
      || this.objectiveEvaluations < this.config.maxObjectiveEvaluations;
  }

  /** Evaluation-budget benchmarks do not use algorithm-specific early convergence. */
  protected shouldUseConvergenceStopping(): boolean {
    return this.config.maxObjectiveEvaluations === undefined;
  }

  protected abstract init(): void;
  abstract step(): boolean;

  collectResult(executionTimeMs: number): OptimizationResult {
    const travelTime = this.bestRoutes.reduce((s, r) => s + r.travelTime, 0);
    const totalDistance = this.bestRoutes.reduce((s, r) => s + r.distance, 0);
    const congestionCost = this.bestRoutes.reduce((s, r) => s + r.congestionCost, 0);

    return {
      algorithm: this.type,
      fitness: this.bestFitness,
      travelTime,
      totalDistance,
      congestionCost,
      executionTime: Math.max(0, Math.round(executionTimeMs)),
      objectiveEvaluations: this.objectiveEvaluations,
      iterations: this.iteration,
      routes: this.bestRoutes,
      convergenceHistory: [...this.convergenceHistory],
      particleHistory: [...this.particleSnapshots],
    };
  }

  optimize(): OptimizationResult {
    const startTime = performance.now();

    for (let i = 0; i < this.config.maxIterations; i++) {
      const converged = this.step();
      if (converged) break;
    }

    return this.collectResult(performance.now() - startTime);
  }

  getBestFitness(): number { return this.bestFitness; }
  getBestRoutes(): Route[] { return this.bestRoutes; }
  getConvergenceHistory(): number[] { return [...this.convergenceHistory]; }
  getParticleSnapshots(): ParticleSnapshot[] { return [...this.particleSnapshots]; }
  getCurrentIteration(): number { return this.iteration; }
  getObjectiveEvaluations(): number { return this.objectiveEvaluations; }
}
