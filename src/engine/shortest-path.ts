// ==========================================================
// Shortest Path (Dijkstra) + Cost Matrix Builder
// ==========================================================

import { Road, CostMatrix, ObjectiveWeights } from './types';
import { buildAdjacency } from './network-generator';

export function dijkstra(
  roads: Road[],
  source: string,
  targetNodes: string[],
  weights: ObjectiveWeights = { travelTime: 0.4, distance: 0.3, congestion: 0.3 }
): { distances: Map<string, number>; travelTimes: Map<string, number>; congestions: Map<string, number>; paths: Map<string, string[]> } {
  const adj = buildAdjacency(roads);
  const costTracker = new Map<string, number>();
  const dist = new Map<string, number>();
  const time = new Map<string, number>();
  const cong = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  // Collect all nodes
  const allNodes = new Set<string>();
  roads.forEach(r => { allNodes.add(r.from); allNodes.add(r.to); });

  for (const n of allNodes) {
    costTracker.set(n, Infinity);
    dist.set(n, Infinity);
    time.set(n, Infinity);
    cong.set(n, Infinity);
    prev.set(n, null);
  }
  costTracker.set(source, 0);
  dist.set(source, 0);
  time.set(source, 0);
  cong.set(source, 0);

  // Simple priority queue via sorted array (fine for ~120 nodes)
  const queue: { node: string; cost: number }[] = [{ node: source, cost: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const { node: u } = queue.shift()!;
    if (visited.has(u)) continue;
    visited.add(u);

    const neighbors = adj.get(u) || [];
    for (const { to: v, road } of neighbors) {
      if (visited.has(v) || road.isClosed) continue;
      const edgeDist = road.distance;
      const edgeTime = road.distance / (road.currentSpeed || 1) * 60; // minutes
      const edgeCong = road.congestion * road.distance;
      
      const edgeCost = weights.distance * edgeDist + weights.travelTime * edgeTime + weights.congestion * edgeCong;
      const currentCost = costTracker.get(u)! + edgeCost;

      if (currentCost < costTracker.get(v)!) {
        costTracker.set(v, currentCost);
        dist.set(v, dist.get(u)! + edgeDist);
        time.set(v, time.get(u)! + edgeTime);
        cong.set(v, cong.get(u)! + edgeCong);
        prev.set(v, u);
        queue.push({ node: v, cost: currentCost });
      }
    }
  }

  // Reconstruct paths
  const paths = new Map<string, string[]>();
  for (const target of targetNodes) {
    const path: string[] = [];
    let curr: string | null = target;
    while (curr) {
      path.unshift(curr);
      curr = prev.get(curr) ?? null;
    }
    paths.set(target, path.length > 1 || target === source ? path : []);
  }

  return { distances: dist, travelTimes: time, congestions: cong, paths };
}

export function buildCostMatrix(
  roads: Road[],
  nodeIds: string[],
  weights: ObjectiveWeights = { travelTime: 0.4, distance: 0.3, congestion: 0.3 }
): CostMatrix {
  const n = nodeIds.length;
  const distances: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const travelTimes: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const congestions: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const paths: string[][][] = Array.from({ length: n }, () => Array(n).fill([]));

  for (let i = 0; i < n; i++) {
    distances[i][i] = 0;
    travelTimes[i][i] = 0;
    congestions[i][i] = 0;
    const result = dijkstra(roads, nodeIds[i], nodeIds, weights);
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      distances[i][j] = result.distances.get(nodeIds[j]) ?? Infinity;
      travelTimes[i][j] = result.travelTimes.get(nodeIds[j]) ?? Infinity;
      congestions[i][j] = result.congestions.get(nodeIds[j]) ?? Infinity;
      paths[i][j] = result.paths.get(nodeIds[j]) ?? [];
    }
  }

  return { distances, travelTimes, congestions, paths, nodeIds };
}

// Get the full path (node sequence) between two key nodes using Dijkstra
export function getShortestPath(roads: Road[], from: string, to: string): string[] {
  const result = dijkstra(roads, from, [to]);
  return result.paths.get(to) || [];
}
