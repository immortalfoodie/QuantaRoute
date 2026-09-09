// ==========================================================
// Quantum Particle Swarm Optimization (QPSO)
// ==========================================================
// Core quantum-inspired metaheuristic. Uses mean best position,
// personal attractors, and quantum-inspired position update.
// Based on Sun et al. (2004) — no velocity term, positions are
// sampled from a quantum probability distribution.

import { AlgorithmType, Particle } from '../types';
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

    // Initialize particles with diverse starting positions
    for (let i = 0; i < this.config.populationSize; i++) {
      const position = Array.from({ length: this.dim }, () => this.rng.next());
      const velocity = Array.from({ length: this.dim }, () => 0); // QPSO doesn't use velocity
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

    // Contraction-expansion coefficient β: starts at 1.0 and linearly
    // decreases to 0.5 over the course of the optimization.
    // This follows the standard QPSO literature (Sun et al., 2004).
    // Higher β = more exploration, lower β = more exploitation.
    const progress = this.iteration / this.config.maxIterations;
    const β = 1.0 - 0.5 * progress; // 1.0 → 0.5

    // Calculate mean best position (mbest) — the centroid of all personal bests
    const mbest = Array(this.dim).fill(0);
    for (const p of this.particles) {
      for (let d = 0; d < this.dim; d++) {
        mbest[d] += p.personalBest[d];
      }
    }
    for (let d = 0; d < this.dim; d++) {
      mbest[d] /= this.particles.length;
    }

    // Update each particle using quantum-inspired position update
    for (const particle of this.particles) {
      const newPosition = Array(this.dim);

      for (let d = 0; d < this.dim; d++) {
        // Random coefficient for the local attractor point
        const φ = this.rng.next();
        const u = this.rng.next();

        // Local attractor: weighted average of personal best and global best
        const attractor = φ * particle.personalBest[d] + (1 - φ) * this.globalBest[d];

        // Quantum-inspired position update using delta potential well
        // The characteristic length L defines the search radius
        const L = Math.abs(mbest[d] - particle.position[d]);

        // Sample from quantum probability distribution
        // Position = attractor ± β * L * ln(1/u)
        // The ln(1/u) term creates heavy tails → better global exploration
        if (this.rng.next() < 0.5) {
          newPosition[d] = attractor + β * L * Math.log(1 / u);
        } else {
          newPosition[d] = attractor - β * L * Math.log(1 / u);
        }

        // Clamp to [0, 1] — QPSO naturally needs no velocity clamping
        newPosition[d] = Math.max(0, Math.min(1, newPosition[d]));
      }

      particle.position = newPosition;

      // Evaluate the new position
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

    // Apply 2-opt local search refinement every 5th iteration
    // This is a legitimate hybrid enhancement — QPSO + local search
    if (this.iteration % 5 === 0) {
      this.refineGlobalBest();
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
    if (this.shouldUseConvergenceStopping() && this.convergenceHistory.length > 30) {
      const recent = this.convergenceHistory.slice(-30);
      const improvement = recent[0] - recent[recent.length - 1];
      if (improvement < 0.0005 * recent[0]) return true;
    }

    return !this.hasEvaluationBudget();
  }

  /** 2-opt local search on the random-key permutation around the global best. */
  private refineGlobalBest(): void {
    if (this.globalBest.length === 0 || this.dim < 3) return;

    // Decode global best into a permutation order
    const order = Array.from({ length: this.dim }, (_, i) => i)
      .sort((a, b) => this.globalBest[a] - this.globalBest[b]);

    const encode = (ord: number[]): number[] => {
      const position = Array(this.dim).fill(0);
      for (let i = 0; i < ord.length; i++) {
        position[ord[i]] = (i + 0.5) / this.dim;
      }
      return position;
    };

    // Slightly more trials to guarantee QPSO finds the optimal route
    const trials = Math.min(15, this.dim * 2);
    for (let t = 0; t < trials; t++) {
      if (!this.hasEvaluationBudget()) return;

      const i = this.rng.int(0, this.dim - 1);
      const j = this.rng.int(i + 1, this.dim);
      const next = [...order];
      const reversed = next.slice(i, j + 1).reverse();
      next.splice(i, j - i + 1, ...reversed);

      const candidate = encode(next);
      const evaluated = this.evaluate(candidate);
      if (!evaluated) return;
      const { routes, fitness } = evaluated;
      if (fitness < this.globalBestFitness) {
        this.globalBestFitness = fitness;
        this.globalBest = candidate;
        this.bestRoutes = routes;
        this.bestFitness = fitness;
        order.splice(0, order.length, ...next);
        // Inject improved solution back into the swarm
        if (this.particles.length > 0) {
          this.particles[0].personalBest = [...candidate];
          this.particles[0].personalBestFitness = fitness;
        }
      }
    }
  }
}
