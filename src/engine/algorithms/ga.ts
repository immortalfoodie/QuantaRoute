// ==========================================================
// Genetic Algorithm (GA) for VRP
// ==========================================================
// Standard GA with tournament selection, single-point crossover,
// and Gaussian mutation. A fair competitor for benchmarking.

import { AlgorithmType } from '../types';
import { SeededRandom } from '../random';
import { BaseOptimizer } from './base';

interface Individual {
  genes: number[];
  fitness: number;
}

export class GAAlgorithm extends BaseOptimizer {
  readonly type: AlgorithmType = 'ga';
  readonly name = 'Genetic Algorithm';

  private population: Individual[] = [];
  private rng!: SeededRandom;
  private dim!: number;

  protected init(): void {
    this.rng = new SeededRandom(this.config.seed + 2);
    this.dim = this.customers.length;
    this.population = [];

    for (let i = 0; i < this.config.populationSize; i++) {
      const genes = Array.from({ length: this.dim }, () => this.rng.next());
      const evaluated = this.evaluate(genes);
      if (!evaluated) break;
      const { routes, fitness } = evaluated;

      this.population.push({ genes, fitness });

      if (fitness < this.bestFitness) {
        this.bestFitness = fitness;
        this.bestRoutes = routes;
      }
    }
  }

  step(): boolean {
    if (!this.hasEvaluationBudget()) return true;
    this.iteration++;
    // Adaptive mutation rate: starts high for exploration, decays for exploitation
    const mutationRate = 0.15 + 0.25 * (1 - this.iteration / this.config.maxIterations);
    const newPop: Individual[] = [];

    // Elitism: keep best individual
    this.population.sort((a, b) => a.fitness - b.fitness);
    newPop.push({ ...this.population[0], genes: [...this.population[0].genes] });

    while (newPop.length < this.config.populationSize) {
      // Tournament selection
      const parent1 = this.tournamentSelect();
      const parent2 = this.tournamentSelect();

      // Crossover
      let child = this.crossover(parent1.genes, parent2.genes);

      // Mutation
      child = this.mutate(child, mutationRate);

      const evaluated = this.evaluate(child);
      if (!evaluated) break;
      const { routes, fitness } = evaluated;

      newPop.push({ genes: child, fitness });

      if (fitness < this.bestFitness) {
        this.bestFitness = fitness;
        this.bestRoutes = routes;
      }
    }

    this.population = newPop;
    this.convergenceHistory.push(this.bestFitness);

    if (this.iteration % 5 === 0 || this.iteration <= 5) {
      this.particleSnapshots.push({
        iteration: this.iteration,
        positions: this.population.slice(0, 20).map(ind => ({
          x: ind.genes[0] ?? 0.5,
          y: ind.genes[1] ?? 0.5,
        })),
        globalBest: {
          x: this.population[0].genes[0] ?? 0.5,
          y: this.population[0].genes[1] ?? 0.5,
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

  private tournamentSelect(): Individual {
    const size = 3; // Tournament size of 3 for moderate selection pressure
    let best = this.population[this.rng.int(0, this.population.length)];
    for (let i = 1; i < size; i++) {
      const candidate = this.population[this.rng.int(0, this.population.length)];
      if (candidate.fitness < best.fitness) best = candidate;
    }
    return best;
  }

  private crossover(p1: number[], p2: number[]): number[] {
    const child = [...p1];
    const point = this.rng.int(0, this.dim);
    for (let i = point; i < this.dim; i++) {
      child[i] = p2[i];
    }
    return child;
  }

  private mutate(genes: number[], rate: number): number[] {
    return genes.map(g => {
      if (this.rng.next() < rate) {
        return Math.max(0, Math.min(1, g + this.rng.range(-0.3, 0.3)));
      }
      return g;
    });
  }
}
