// ==========================================================
// Synthetic City Network Generator
// ==========================================================
// Generates a realistic grid-based city transportation graph
// with intersections, arterial/secondary roads, depot, and customers.

import {
  Node, Road, Customer, Vehicle, NetworkGraph, NetworkConfig,
  VEHICLE_COLORS,
} from './types';
import { SeededRandom } from './random';

const DEFAULT_CONFIG: NetworkConfig = {
  nodeCount: 120,
  roadCount: 250,
  customerCount: 15,
  vehicleCount: 5,
  seed: 42,
};

export function generateNetwork(config: Partial<NetworkConfig> = {}): NetworkGraph {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rng = new SeededRandom(cfg.seed);

  // --- 1. Generate grid-based nodes ---
  const cols = Math.ceil(Math.sqrt(cfg.nodeCount * 1.3));
  const rows = Math.ceil(cfg.nodeCount / cols);
  const spacingX = 900 / cols;
  const spacingY = 700 / rows;

  const nodes: Node[] = [];
  let nodeIdx = 0;
  for (let r = 0; r < rows && nodes.length < cfg.nodeCount; r++) {
    for (let c = 0; c < cols && nodes.length < cfg.nodeCount; c++) {
      // Add organic jitter
      const jitterX = rng.range(-spacingX * 0.25, spacingX * 0.25);
      const jitterY = rng.range(-spacingY * 0.25, spacingY * 0.25);
      nodes.push({
        id: `N${String(nodeIdx).padStart(3, '0')}`,
        x: 50 + c * spacingX + jitterX,
        y: 50 + r * spacingY + jitterY,
        type: 'intersection',
        district: `D${Math.floor(r / Math.ceil(rows / 3)) * 3 + Math.floor(c / Math.ceil(cols / 3))}`,
      });
      nodeIdx++;
    }
  }

  // --- 2. Generate roads (edges) ---
  // First create grid connectivity, then add extra connections
  const roads: Road[] = [];
  const roadSet = new Set<string>();
  const addRoad = (fromIdx: number, toIdx: number, isMain: boolean) => {
    const key = `${Math.min(fromIdx, toIdx)}-${Math.max(fromIdx, toIdx)}`;
    if (roadSet.has(key) || fromIdx === toIdx) return;
    if (fromIdx >= nodes.length || toIdx >= nodes.length) return;
    roadSet.add(key);
    const from = nodes[fromIdx];
    const to = nodes[toIdx];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = isMain ? rng.range(50, 80) : rng.range(25, 45);
    roads.push({
      id: `R${String(roads.length).padStart(3, '0')}`,
      from: from.id,
      to: to.id,
      distance: Math.round(dist * 10) / 100, // scale to km-like
      freeFlowSpeed: Math.round(speed),
      currentSpeed: Math.round(speed),
      lanes: isMain ? rng.int(2, 4) : rng.int(1, 3),
      congestion: 0,
      isClosed: false,
      isMainRoad: isMain,
    });
  };

  // Grid edges
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= nodes.length) continue;
      // Right
      if (c + 1 < cols && idx + 1 < nodes.length) {
        addRoad(idx, idx + 1, r % 3 === 0 || c % 3 === 0);
      }
      // Down
      if (r + 1 < rows && idx + cols < nodes.length) {
        addRoad(idx, idx + cols, c % 3 === 0 || r % 3 === 0);
      }
    }
  }

  // Diagonal / shortcut edges to reach target road count
  let attempts = 0;
  while (roads.length < cfg.roadCount && attempts < cfg.roadCount * 5) {
    attempts++;
    const a = rng.int(0, nodes.length);
    const b = rng.int(0, nodes.length);
    const dx = nodes[a].x - nodes[b].x;
    const dy = nodes[a].y - nodes[b].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < spacingX * 2.5 && dist > spacingX * 0.3) {
      addRoad(a, b, rng.next() < 0.2);
    }
  }

  // --- 3. Assign depot ---
  // Place depot near center
  const centerX = 500;
  const centerY = 400;
  let depotIdx = 0;
  let minDist = Infinity;
  nodes.forEach((n, i) => {
    const d = Math.sqrt((n.x - centerX) ** 2 + (n.y - centerY) ** 2);
    if (d < minDist) { minDist = d; depotIdx = i; }
  });
  nodes[depotIdx].type = 'depot';
  nodes[depotIdx].label = 'DEPOT';
  const depotId = nodes[depotIdx].id;

  // --- 4. Assign customers ---
  // Spread customers across the network, avoiding depot
  const candidateIndices = nodes
    .map((_, i) => i)
    .filter(i => i !== depotIdx);
  const shuffled = rng.shuffle(candidateIndices);
  const customerCount = Math.min(cfg.customerCount, shuffled.length);
  const customers: Customer[] = [];

  for (let i = 0; i < customerCount; i++) {
    const nIdx = shuffled[i];
    nodes[nIdx].type = 'customer';
    nodes[nIdx].label = `C${String(i + 1).padStart(2, '0')}`;
    customers.push({
      id: `C${String(i + 1).padStart(2, '0')}`,
      nodeId: nodes[nIdx].id,
      demand: rng.int(1, 10),
      timeWindowStart: rng.int(0, 120),
      timeWindowEnd: rng.int(180, 480),
      serviceDuration: rng.int(5, 16),
      label: `Customer ${i + 1}`,
    });
  }

  // --- 5. Create vehicles ---
  const vehicles: Vehicle[] = [];
  for (let i = 0; i < cfg.vehicleCount; i++) {
    vehicles.push({
      id: `V${String(i + 1).padStart(2, '0')}`,
      capacity: 30,
      currentLoad: 0,
      color: VEHICLE_COLORS[i % VEHICLE_COLORS.length],
      route: [depotId],
      routeEdges: [],
      progress: 0,
      isActive: true,
    });
  }

  return {
    nodes,
    roads,
    customers,
    vehicles,
    depot: depotId,
  };
}

// Build adjacency list from roads for pathfinding
export function buildAdjacency(roads: Road[]): Map<string, { to: string; road: Road }[]> {
  const adj = new Map<string, { to: string; road: Road }[]>();
  for (const road of roads) {
    if (road.isClosed) continue;
    if (!adj.has(road.from)) adj.set(road.from, []);
    if (!adj.has(road.to)) adj.set(road.to, []);
    adj.get(road.from)!.push({ to: road.to, road });
    adj.get(road.to)!.push({ to: road.from, road });
  }
  return adj;
}
