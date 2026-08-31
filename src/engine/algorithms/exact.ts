// ==========================================================
// Reference Solver (not a proven exact MIP/CP solver)
// ==========================================================
// Nearest-neighbor + 2-opt for a classical baseline on this demo.
// For small instances (≤8 customers) the search samples more of the
// random-key space. It is a reference heuristic, not a proof of optimality.

import { AlgorithmType } from '../types';
import { SeededRandom } from '../random';
import { BaseOptimizer } from './base';

export class ReferenceHeuristic extends BaseOptimizer {
  readonly type: AlgorithmType = 'exact';
  readonly name = 'Reference Heuristic';

  private rng!: SeededRandom;
  private dim!: number;

  protected init(): void {
    this.rng = new SeededRandom(this.config.seed + 4);
    this.dim = this.customers.length;
  }

  step(): boolean {
    if (!this.hasEvaluationBudget()) return true;
    this.iteration++;

    if (this.dim <= 8 && this.iteration === 1) {
      this.denseRandomSearch();
      this.convergenceHistory.push(this.bestFitness);
      return true;
    }

    if (this.iteration === 1) {
      this.nearestNeighborWithImprovement();
    }

    if (!this.hasEvaluationBudget()) {
      this.convergenceHistory.push(this.bestFitness);
      return true;
    }

    const position = Array.from({ length: this.dim }, () => this.rng.next());
    const evaluated = this.evaluate(position);
    if (!evaluated) return true;
    const { routes, fitness } = evaluated;

    if (fitness < this.bestFitness) {
      this.bestFitness = fitness;
      this.bestRoutes = routes;
    }

    this.convergenceHistory.push(this.bestFitness);
    return (this.shouldUseConvergenceStopping() && this.iteration >= this.config.maxIterations)
      || !this.hasEvaluationBudget();
  }

  private denseRandomSearch(): void {
    const maxSamples = Math.min(20000, this.factorial(this.dim) * 8);

    for (let s = 0; s < maxSamples; s++) {
      if (!this.hasEvaluationBudget()) break;
      const position = Array.from({ length: this.dim }, () => this.rng.next());
      const evaluated = this.evaluate(position);
      if (!evaluated) break;
      const { routes, fitness } = evaluated;

      if (fitness < this.bestFitness) {
        this.bestFitness = fitness;
        this.bestRoutes = routes;
      }

      if (s % 100 === 0) {
        this.convergenceHistory.push(this.bestFitness);
      }
    }
  }

  private nearestNeighborWithImprovement(): void {
    const n = this.dim;
    const visited = new Set<number>();
    const order: number[] = [];

    let current = 0;
    for (let i = 0; i < n; i++) {
      let bestNext = -1;
      let bestDist = Infinity;

      for (let j = 0; j < n; j++) {
        if (visited.has(j) || j === current) continue;
        const d = this.costMatrix.distances[current + 1]?.[j + 1] ?? Infinity;
        if (d < bestDist) {
          bestDist = d;
          bestNext = j;
        }
      }

      if (bestNext === -1) bestNext = [...Array(n).keys()].find(j => !visited.has(j)) ?? 0;
      order.push(bestNext);
      visited.add(bestNext);
      current = bestNext;
    }

    const position = Array(n).fill(0);
    for (let i = 0; i < order.length; i++) {
      position[order[i]] = (i + 0.5) / n;
    }

    const evaluated = this.evaluate(position);
    if (!evaluated) return;
    const { routes: nnRoutes, fitness: nnFitness } = evaluated;
    this.bestFitness = nnFitness;
    this.bestRoutes = nnRoutes;
    this.convergenceHistory.push(this.bestFitness);

    for (let iter = 0; iter < 500; iter++) {
      if (!this.hasEvaluationBudget()) break;
      const i = this.rng.int(0, n);
      const j = this.rng.int(0, n);
      if (i === j) continue;

      const newPos = [...position];
      [newPos[i], newPos[j]] = [newPos[j], newPos[i]];

      const candidate = this.evaluate(newPos);
      if (!candidate) break;
      const { routes: newRoutes, fitness: newFitness } = candidate;

      if (newFitness < this.bestFitness) {
        position[i] = newPos[i];
        position[j] = newPos[j];
        this.bestFitness = newFitness;
        this.bestRoutes = newRoutes;
      }

      if (iter % 10 === 0) {
        this.convergenceHistory.push(this.bestFitness);
      }
    }
  }

  private factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }
}
