// ==========================================================
// Quantum Particle Swarm Optimization (QPSO)
// ==========================================================
// Core quantum-inspired metaheuristic. Uses mean best position,
// personal attractors, and quantum-inspired position update.

import { AlgorithmType, Particle, ParticleSnapshot } from '../types';
import { SeededRandom } from '../random';
import { BaseOptimizer } from './base';

export class QPSOAlgorithm extends BaseOptimizer {
  readonly type: AlgorithmType = 'qpso';
  readonly name = 'Quantum PSO';

  private particles: Particle[] = [];
  private globalBest: number[] = [];
  private globalBestFitness = Infinity;
  private rng!: SeededRandom;
  private dim!: number;

  protected init(): void {
    this.rng = new SeededRandom(this.config.seed);
    this.dim = this.customers.length;
    this.particles = [];
    this.globalBestFitness = Infinity;

    // Initialize particles
    for (let i = 0; i < this.config.populationSize; i++) {
      const position = Array.from({ length: this.dim }, () => this.rng.next());
      const velocity = Array.from({ length: this.dim }, () => this.rng.range(-0.5, 0.5));
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
    const β = this.config.explorationParam * (1 - this.iteration / this.config.maxIterations * 0.5);
    // β decreases over time: exploration → exploitation

    // Calculate mean best position (mbest)
    const mbest = Array(this.dim).fill(0);
    for (const p of this.particles) {
      for (let d = 0; d < this.dim; d++) {
        mbest[d] += p.personalBest[d];
      }
    }
    for (let d = 0; d < this.dim; d++) {
      mbest[d] /= this.particles.length;
    }

    // Update each particle
    for (const particle of this.particles) {
      const newPosition = Array(this.dim);

      for (let d = 0; d < this.dim; d++) {
        // Random coefficients
        const φ = this.rng.next();
        const u = this.rng.next();

        // Local attractor
        const attractor = φ * particle.personalBest[d] + (1 - φ) * this.globalBest[d];

        // Quantum-inspired position update
        const L = Math.abs(mbest[d] - particle.position[d]);
        if (this.rng.next() < 0.5) {
          newPosition[d] = attractor + β * L * Math.log(1 / u);
        } else {
          newPosition[d] = attractor - β * L * Math.log(1 / u);
        }

        // Clamp to [0, 1]
        newPosition[d] = Math.max(0, Math.min(1, newPosition[d]));
      }

      particle.position = newPosition;

      // Evaluate
      const evaluated = this.evaluate(particle.position);
      if (!evaluated) {
        this.convergenceHistory.push(this.bestFitness);
        return true;
      }
      const { routes, fitness } = evaluated;
      particle.fitness = fitness;

      // Update personal best
      if (particle.fitness < particle.personalBestFitness) {
        particle.personalBest = [...particle.position];
        particle.personalBestFitness = particle.fitness;
      }

      // Update global best
      if (particle.fitness < this.globalBestFitness) {
        this.globalBestFitness = particle.fitness;
        this.globalBest = [...particle.position];
        this.bestRoutes = routes;
        this.bestFitness = particle.fitness;
      }
    }

    this.convergenceHistory.push(this.bestFitness);

    // Save particle snapshot for visualization (reduced frequency)
    if (this.iteration % 3 === 0 || this.iteration <= 5) {
      this.particleSnapshots.push({
        iteration: this.iteration,
        positions: this.particles.map(p => ({
          x: p.position[0] ?? 0.5,
          y: p.position[1] ?? 0.5,
        })),
        globalBest: { x: this.globalBest[0] ?? 0.5, y: this.globalBest[1] ?? 0.5 },
        meanBest: { x: mbest[0] ?? 0.5, y: mbest[1] ?? 0.5 },
        fitness: this.bestFitness,
      });
    }

    // Convergence check
    if (this.shouldUseConvergenceStopping() && this.convergenceHistory.length > 20) {
      const recent = this.convergenceHistory.slice(-20);
      const improvement = recent[0] - recent[recent.length - 1];
      if (improvement < 0.001 * recent[0]) return true;
    }

    return !this.hasEvaluationBudget();
  }
}
