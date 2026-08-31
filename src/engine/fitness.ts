// ==========================================================
// Fitness Function
// ==========================================================

import { Route, ObjectiveWeights } from './types';

/**
 * Compute the multi-objective fitness for a complete solution (set of routes).
 * F = wt × TravelTime + wd × Distance + wc × Congestion + Penalty
 */
export function computeFitness(
  routes: Route[],
  weights: ObjectiveWeights,
  vehicleCapacity: number,
): { fitness: number; travelTime: number; distance: number; congestion: number; penalty: number } {
  let travelTime = 0;
  let distance = 0;
  let congestion = 0;
  let penalty = 0;

  for (const route of routes) {
    travelTime += route.travelTime;
    distance += route.distance;
    congestion += route.congestionCost;

    // Capacity violation penalty
    if (route.load > vehicleCapacity) {
      penalty += (route.load - vehicleCapacity) * 500;
    }

    // Infeasibility penalty
    if (!route.feasible) {
      penalty += 10000;
    }
  }

  const fitness = weights.travelTime * travelTime +
                  weights.distance * distance +
                  weights.congestion * congestion +
                  penalty;

  return {
    fitness: Math.round(fitness * 100) / 100,
    travelTime: Math.round(travelTime * 100) / 100,
    distance: Math.round(distance * 100) / 100,
    congestion: Math.round(congestion * 100) / 100,
    penalty: Math.round(penalty * 100) / 100,
  };
}

/**
 * Normalize weights to sum to 1.
 */
export function normalizeWeights(w: ObjectiveWeights): ObjectiveWeights {
  const sum = w.travelTime + w.distance + w.congestion;
  if (sum === 0) return { travelTime: 1 / 3, distance: 1 / 3, congestion: 1 / 3 };
  return {
    travelTime: w.travelTime / sum,
    distance: w.distance / sum,
    congestion: w.congestion / sum,
  };
}
