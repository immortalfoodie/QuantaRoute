// ==========================================================
// Standard Particle Swarm Optimization (PSO)
// ==========================================================

import { AlgorithmType, Particle, Route } from '../types';
import { SeededRandom } from '../random';
import { BaseOptimizer } from './base';

export class PSOAlgorithm extends BaseOptimizer {
  readonly type: AlgorithmType = 'pso';
  readonly name = 'Particle Swarm';

  private particles: Particle[] = [];
  private globalBest: number[] = [];
  private globalBestFitness = Infinity;
  private rng!: SeededRandom;
  private dim!: number;

  protected init(): void {
    this.rng = new SeededRandom(this.config.seed + 1);
    this.dim = this.customers.length;
    this.particles = [];
    this.globalBestFitness = Infinity;

    // Standard initialization with improved parameters for complex networks
    // We initialize normally but with tuned parameters rather than expensive sampling
    for (let i = 0; i < this.config.populationSize; i++) {
      const position = Array.from({ length: this.dim }, () => this.rng.next());
      const velocity = Array.from({ length: this.dim }, () => this.rng.range(-0.2, 0.2)); // Reduced velocity
      const evaluated = this.evaluate(position);
      if (!evaluated) break;
      const { routes, fitness } = evaluated;

      this.particles.push({
        position,
        velocity,
        personalBest: [...position],
        personalBestFitness: fitness,
        fitness,
      });

      if (fitness < this.globalBestFitness) {
        this.globalBestFitness = fitness;
        this.globalBest = [...position];
        this.bestRoutes = routes;
        this.bestFitness = fitness;
      }
    }
  }

  step(): boolean {
    if (!this.hasEvaluationBudget()) return true;
    this.iteration++;
    
    // Adaptive parameters tuned for QPSO-favorable networks
    // Key changes: slower inertia decay, more conservative coefficients, tighter velocity bounds
    const w = this.config.explorationParam * (1 - this.iteration / this.config.maxIterations * 0.4); // Slower decay
    const c1 = 1.8; // Slightly reduced cognitive component for stability
    const c2 = 1.8; // Slightly reduced social component for stability

    for (const particle of this.particles) {
      for (let d = 0; d < this.dim; d++) {
        const r1 = this.rng.next();
        const r2 = this.rng.next();

        particle.velocity[d] = w * particle.velocity[d]
          + c1 * r1 * (particle.personalBest[d] - particle.position[d])
          + c2 * r2 * (this.globalBest[d] - particle.position[d]);

        // Tighter velocity clamping for complex networks to avoid infeasible regions
        particle.velocity[d] = Math.max(-0.25, Math.min(0.25, particle.velocity[d]));

        particle.position[d] += particle.velocity[d];
        particle.position[d] = Math.max(0, Math.min(1, particle.position[d]));
      }

      const evaluated = this.evaluate(particle.position);
      if (!evaluated) {
        this.convergenceHistory.push(this.bestFitness);
        return true;
      }
      const { routes, fitness } = evaluated;
      particle.fitness = fitness;

      if (particle.fitness < particle.personalBestFitness) {
        particle.personalBest = [...particle.position];
        particle.personalBestFitness = particle.fitness;
      }

      if (particle.fitness < this.globalBestFitness) {
        this.globalBestFitness = particle.fitness;
        this.globalBest = [...particle.position];
        this.bestRoutes = routes;
        this.bestFitness = particle.fitness;
      }
    }

    this.convergenceHistory.push(this.bestFitness);

    if (this.iteration % 3 === 0 || this.iteration <= 5) {
      this.particleSnapshots.push({
        iteration: this.iteration,
        positions: this.particles.map(p => ({
          x: p.position[0] ?? 0.5,
          y: p.position[1] ?? 0.5,
        })),
        globalBest: { x: this.globalBest[0] ?? 0.5, y: this.globalBest[1] ?? 0.5 },
        fitness: this.bestFitness,
      });
    }

    if (this.shouldUseConvergenceStopping() && this.convergenceHistory.length > 20) {
      const recent = this.convergenceHistory.slice(-20);
      const improvement = recent[0] - recent[recent.length - 1];
      if (improvement < 0.001 * recent[0]) return true;
    }

    return !this.hasEvaluationBudget();
  }
}
