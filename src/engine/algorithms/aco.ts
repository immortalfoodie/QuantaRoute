// ==========================================================
// Ant Colony Optimization (ACO) for VRP
// ==========================================================

import { AlgorithmType } from '../types';
import { SeededRandom } from '../random';
import { BaseOptimizer } from './base';

export class ACOAlgorithm extends BaseOptimizer {
  readonly type: AlgorithmType = 'aco';
  readonly name = 'Ant Colony';

  private pheromones: number[][] = [];
  private rng!: SeededRandom;
  private dim!: number;

  protected init(): void {
    this.rng = new SeededRandom(this.config.seed + 3);
    this.dim = this.customers.length;

    // Initialize pheromone matrix
    this.pheromones = Array.from({ length: this.dim }, () =>
      Array(10).fill(1.0), // 10 discretization levels
    );
  }

  step(): boolean {
    if (!this.hasEvaluationBudget()) return true;
    this.iteration++;
    const evaporation = 0.1;
    const alpha = 1.0; // pheromone importance
    const beta = 2.0;  // heuristic importance

    const ants: { position: number[]; fitness: number }[] = [];

    // Each ant constructs a solution
    for (let a = 0; a < this.config.populationSize; a++) {
      const position = Array(this.dim);

      for (let d = 0; d < this.dim; d++) {
        // Probabilistic construction using pheromones
        const probs: number[] = [];
        let sum = 0;
        for (let level = 0; level < 10; level++) {
          const p = Math.pow(this.pheromones[d][level], alpha) *
                    Math.pow(1 / (level + 1), beta);
          probs.push(p);
          sum += p;
        }

        // Roulette wheel selection
        let r = this.rng.next() * sum;
        let selected = 0;
        for (let level = 0; level < 10; level++) {
          r -= probs[level];
          if (r <= 0) { selected = level; break; }
        }

        position[d] = (selected + this.rng.next()) / 10;
      }

      const evaluated = this.evaluate(position);
      if (!evaluated) break;
      const { routes, fitness } = evaluated;
      ants.push({ position, fitness });

      if (fitness < this.bestFitness) {
        this.bestFitness = fitness;
        this.bestRoutes = routes;
      }
    }

    // Pheromone evaporation
    for (let d = 0; d < this.dim; d++) {
      for (let l = 0; l < 10; l++) {
        this.pheromones[d][l] *= (1 - evaporation);
      }
    }

    // Pheromone deposit (best ants)
    ants.sort((a, b) => a.fitness - b.fitness);
    const topAnts = ants.slice(0, Math.ceil(ants.length * 0.2));

    for (const ant of topAnts) {
      for (let d = 0; d < this.dim; d++) {
        const level = Math.min(9, Math.floor(ant.position[d] * 10));
        this.pheromones[d][level] += 1 / ant.fitness;
      }
    }

    this.convergenceHistory.push(this.bestFitness);

    if (this.iteration % 5 === 0 || this.iteration <= 5) {
      this.particleSnapshots.push({
        iteration: this.iteration,
        positions: ants.slice(0, 20).map(a => ({
          x: a.position[0] ?? 0.5,
          y: a.position[1] ?? 0.5,
        })),
        globalBest: {
          x: topAnts[0]?.position[0] ?? 0.5,
          y: topAnts[0]?.position[1] ?? 0.5,
        },
        fitness: this.bestFitness,
      });
    }

    if (this.shouldUseConvergenceStopping() && this.convergenceHistory.length > 25) {
      const recent = this.convergenceHistory.slice(-25);
      const improvement = recent[0] - recent[recent.length - 1];
      if (improvement < 0.0005 * recent[0]) return true;
    }

    return !this.hasEvaluationBudget();
  }
}
