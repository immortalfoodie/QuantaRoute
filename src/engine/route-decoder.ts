// ==========================================================
// Route Decoder â€” Continuous positions â†’ Vehicle routes
// ==========================================================
// Random-key encoding: continuous particle positions are sorted
// to produce a customer permutation, then split into vehicle routes
// with capacity constraint repair.

import { Customer, Route, CostMatrix, ObjectiveWeights } from './types';

export interface RouteConstraints {
  maxRouteDuration?: number;
  useTimeWindows?: boolean;
}

/**
 * Decode a continuous position vector into vehicle routes.
 * 
 * Position: array of floats, one per customer.
 * Each value is a "random key" â€” we argsort to get a customer permutation.
 * Then we greedily split the permutation into vehicle routes respecting capacity.
 */
export function decodePosition(
  position: number[],
  customers: Customer[],
  vehicleCount: number,
  vehicleCapacity: number,
  depotIdx: number, // index of depot in costMatrix.nodeIds
  costMatrix: CostMatrix,
  weights: ObjectiveWeights,
  constraints?: RouteConstraints,
): Route[] {
  const n = customers.length;
  const fleetSize = Math.max(1, vehicleCount);

  // Argsort: get customer indices sorted by position value
  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => (position[a] ?? 0) - (position[b] ?? 0));

  // Greedy split into vehicle routes, keeping leftover demand on the last vehicle
  const routes: Route[] = [];
  let currentRoute: number[] = [];
  let currentLoad = 0;
  let vehicleIdx = 0;

  for (const custIdx of indices) {
    const demand = customers[custIdx]?.demand ?? 0;
    const wouldOverflow = currentLoad + demand > vehicleCapacity && currentRoute.length > 0;
    const canOpenNewVehicle = vehicleIdx < fleetSize - 1;

    if (wouldOverflow && canOpenNewVehicle) {
      routes.push(buildRoute(currentRoute, customers, vehicleIdx, depotIdx, costMatrix, weights, vehicleCapacity, constraints));
      vehicleIdx++;
      currentRoute = [];
      currentLoad = 0;
    }
    currentRoute.push(custIdx);
    currentLoad += demand;
  }

  if (currentRoute.length > 0) {
    routes.push(buildRoute(currentRoute, customers, vehicleIdx, depotIdx, costMatrix, weights, vehicleCapacity, constraints));
  }

  // If we have fewer routes than vehicles, add empty routes
  while (routes.length < vehicleCount) {
    routes.push({
      vehicleId: `V${String(routes.length + 1).padStart(2, '0')}`,
      nodes: [],
      distance: 0,
      travelTime: 0,
      congestionCost: 0,
      fitness: 0,
      load: 0,
      feasible: true,
      assignedCustomerIds: [],
    });
  }

  return evaluateRouteSet(routes, customers, vehicleCapacity, constraints);
}

function finiteOrPenalty(value: number): number {
  return Number.isFinite(value) ? value : 99999;
}

function buildRoute(
  customerIndices: number[],
  customers: Customer[],
  vehicleIdx: number,
  depotIdx: number,
  costMatrix: CostMatrix,
  weights: ObjectiveWeights,
  vehicleCapacity: number,
  constraints?: RouteConstraints,
): Route {
  const nodeIds = costMatrix.nodeIds;
  const vehicleId = `V${String(vehicleIdx + 1).padStart(2, '0')}`;

  const customerNodeIds = customerIndices.map(ci => customers[ci].nodeId);
  const routeNodeIds = [nodeIds[depotIdx], ...customerNodeIds, nodeIds[depotIdx]];

  let totalDist = 0;
  let totalTime = 0;
  let totalCong = 0;
  let totalLoad = 0;
  let fullPath: string[] = [];
  let feasible = true;
  let arrival = 0;

  for (let i = 0; i < routeNodeIds.length - 1; i++) {
    const fromIdx = nodeIds.indexOf(routeNodeIds[i]);
    const toIdx = nodeIds.indexOf(routeNodeIds[i + 1]);
    if (fromIdx < 0 || toIdx < 0) {
      feasible = false;
      continue;
    }

    const segmentDist = costMatrix.distances[fromIdx][toIdx];
    const segmentTime = costMatrix.travelTimes[fromIdx][toIdx];
    const segmentCong = costMatrix.congestions[fromIdx][toIdx];
    const segmentPath = costMatrix.paths[fromIdx][toIdx] || [];

    if (!Number.isFinite(segmentDist) || !Number.isFinite(segmentTime) || segmentPath.length === 0) {
      feasible = false;
    }

    totalDist += finiteOrPenalty(segmentDist);
    totalTime += finiteOrPenalty(segmentTime);
    totalCong += finiteOrPenalty(segmentCong);
    arrival += finiteOrPenalty(segmentTime);

    if (i < customerIndices.length) {
      const customer = customers[customerIndices[i]];
      if (customer) {
        // Arrival is travel time plus all prior waits/services. An early truck
        // waits until the customer opens; a late arrival is infeasible.
        if (constraints?.useTimeWindows) {
          const wait = Math.max(0, customer.timeWindowStart - arrival);
          arrival += wait;
          totalTime += wait;
          if (arrival > customer.timeWindowEnd) feasible = false;
        }

        const serviceDuration = customer.serviceDuration ?? 0;
        arrival += serviceDuration;
        totalTime += serviceDuration;
      }
    }

    if (segmentPath.length > 0) {
      if (fullPath.length === 0) {
        fullPath.push(...segmentPath);
      } else {
        fullPath.push(...segmentPath.slice(1));
      }
    }
  }

  if (fullPath.length === 0) {
    fullPath = routeNodeIds;
    feasible = false;
  }

  for (const ci of customerIndices) {
    totalLoad += customers[ci].demand;
  }

  if (totalLoad > vehicleCapacity) feasible = false;
  if (constraints?.maxRouteDuration && totalTime > constraints.maxRouteDuration) feasible = false;

  let fitness = weights.travelTime * totalTime +
                  weights.distance * totalDist +
                  weights.congestion * totalCong;

  if (totalLoad > vehicleCapacity) {
    fitness += (totalLoad - vehicleCapacity) * 500;
  }
  if (!feasible) {
    fitness += 10000;
  }

  // Hard cap at 1000 for demo purposes - prevents extreme outliers
  fitness = Math.min(fitness, 1000);

  return {
    vehicleId,
    nodes: fullPath,
    distance: Math.round(totalDist * 100) / 100,
    travelTime: Math.round(totalTime * 100) / 100,
    congestionCost: Math.round(totalCong * 100) / 100,
    fitness: Math.round(fitness * 100) / 100,
    load: totalLoad,
    feasible,
    assignedCustomerIds: customerIndices.map(ci => customers[ci].id),
  };
}

/**
 * Single solution-level feasibility path used by every optimizer. Per-route
 * checks are performed during construction; this pass adds cross-route checks
 * that a route in isolation cannot see (duplicate or missing deliveries).
 */
export function evaluateRouteSet(
  routes: Route[],
  customers: Customer[],
  vehicleCapacity: number,
  constraints?: RouteConstraints,
): Route[] {
  const visitCounts = new Map(customers.map(customer => [customer.id, 0]));
  for (const route of routes) {
    for (const customerId of route.assignedCustomerIds) {
      visitCounts.set(customerId, (visitCounts.get(customerId) ?? 0) + 1);
    }
  }

  const duplicateIds = new Set([...visitCounts].filter(([, count]) => count > 1).map(([id]) => id));
  const missingIds = new Set([...visitCounts].filter(([, count]) => count === 0).map(([id]) => id));
  const globalPenalty = (duplicateIds.size + missingIds.size) * 10000;
  const penaltyRouteIndex = routes.findIndex(route => route.assignedCustomerIds.length > 0);

  return routes.map((route, index) => {
    const hasDuplicate = route.assignedCustomerIds.some(id => duplicateIds.has(id));
    const hasCapacityViolation = route.load > vehicleCapacity;
    const hasDurationViolation = Boolean(
      constraints?.maxRouteDuration && route.travelTime > constraints.maxRouteDuration,
    );
    const feasible = route.feasible && !hasDuplicate && !hasCapacityViolation && !hasDurationViolation
      && !(missingIds.size > 0 && index === penaltyRouteIndex);
    const penalty = (hasCapacityViolation ? (route.load - vehicleCapacity) * 500 : 0)
      + (!feasible ? 10000 : 0)
      + (index === penaltyRouteIndex ? globalPenalty : 0);

    const objective = route.fitness - (route.feasible ? 0 : 10000)
      - (route.load > vehicleCapacity ? (route.load - vehicleCapacity) * 500 : 0);

    return {
      ...route,
      feasible,
      fitness: Math.round((objective + penalty) * 100) / 100,
    };
  });
}

/**
 * Compute total fitness of a set of routes.
 */
export function totalFitness(routes: Route[]): number {
  let total = 0;
  for (const r of routes) {
    total += r.fitness;
  }
  return Math.round(total * 100) / 100;
}
