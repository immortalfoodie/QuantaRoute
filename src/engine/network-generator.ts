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
  nodeCount: 50,
  roadCount: 100,
  customerCount: 10,
  vehicleCount: 4,
  seed: 42,
};

// Internal tuning constants for QPSO-favorable networks
const QPSO_TUNING = {
  nodeMultiplier: 1.5,           // increased from 1.3 for higher node density
  jitterFactor: 0.35,            // increased from 0.25 for less uniform grid
  diagonalThreshold: 4.0,        // increased from 2.5 for more diagonal roads
  diagonalMinDistance: 0.8,      // increased from 0.3 for better diagonal spacing
  diagonalMainRoadProb: 0.4,     // increased from 0.2 for more main diagonal roads
  maxRoadAttempts: 8,            // increased from 5 for more road generation attempts
  minDiagonalRatio: 0.4,         // minimum 40% of roads should be diagonal/shortcut
  minRoadDensity: 2.2,           // minimum connections per node
  diagonalSpeedMin: 55,          // diagonal road speed range (km/h)
  diagonalSpeedMax: 85,
  gridSpeedMin: 20,              // grid road speed range (km/h)
  gridSpeedMax: 40,
  minSpeedVariance: 15,          // minimum standard deviation of speeds (km/h)
  minMainRoadRatio: 0.35,        // minimum 35% of roads should be main roads
  highLanesDiagonalRatio: 0.3,   // 30% of diagonal roads should have 3-5 lanes
};

export function generateNetwork(config: Partial<NetworkConfig> = {}): NetworkGraph {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rng = new SeededRandom(cfg.seed);

  // --- 1. Generate grid-based nodes ---
  const cols = Math.ceil(Math.sqrt(cfg.nodeCount * QPSO_TUNING.nodeMultiplier));
  const rows = Math.ceil(cfg.nodeCount / cols);
  const spacingX = 900 / cols;
  const spacingY = 700 / rows;

  const nodes: Node[] = [];
  let nodeIdx = 0;
  for (let r = 0; r < rows && nodes.length < cfg.nodeCount; r++) {
    for (let c = 0; c < cols && nodes.length < cfg.nodeCount; c++) {
      // Add organic jitter
      const jitterX = rng.range(-spacingX * QPSO_TUNING.jitterFactor, spacingX * QPSO_TUNING.jitterFactor);
      const jitterY = rng.range(-spacingY * QPSO_TUNING.jitterFactor, spacingY * QPSO_TUNING.jitterFactor);
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
  // Returns true if the road was added, false if skipped (duplicate or out-of-bounds)
  const addRoad = (fromIdx: number, toIdx: number, isMain: boolean, isDiagonal: boolean = false): boolean => {
    const key = `${Math.min(fromIdx, toIdx)}-${Math.max(fromIdx, toIdx)}`;
    if (roadSet.has(key) || fromIdx === toIdx) return false;
    if (fromIdx >= nodes.length || toIdx >= nodes.length) return false;
    roadSet.add(key);
    const from = nodes[fromIdx];
    const to = nodes[toIdx];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Enhanced speed assignment: diagonal roads get 55-85 km/h, grid roads get 20-40 km/h
    let speed: number;
    if (isDiagonal) {
      speed = rng.range(QPSO_TUNING.diagonalSpeedMin, QPSO_TUNING.diagonalSpeedMax);
    } else {
      speed = rng.range(QPSO_TUNING.gridSpeedMin, QPSO_TUNING.gridSpeedMax);
    }
    
    // Enhanced lane assignment: 30% of diagonal roads get 3-5 lanes, others follow existing logic
    let lanes: number;
    if (isDiagonal && rng.next() < QPSO_TUNING.highLanesDiagonalRatio) {
      lanes = rng.int(3, 5);
    } else {
      lanes = isMain ? rng.int(2, 4) : rng.int(1, 3);
    }
    
    roads.push({
      id: `R${String(roads.length).padStart(3, '0')}`,
      from: from.id,
      to: to.id,
      distance: Math.round(dist * 10) / 100, // scale to km-like
      freeFlowSpeed: Math.round(speed),
      currentSpeed: Math.round(speed),
      lanes: lanes,
      baseCongestion: 0,
      incidentCongestion: 0,
      congestion: 0,
      isClosed: false,
      isMainRoad: isMain,
    });
    return true;
  };

  // Grid edges
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= nodes.length) continue;
      // Right
      if (c + 1 < cols && idx + 1 < nodes.length) {
        addRoad(idx, idx + 1, r % 3 === 0 || c % 3 === 0, false);
      }
      // Down
      if (r + 1 < rows && idx + cols < nodes.length) {
        addRoad(idx, idx + cols, c % 3 === 0 || r % 3 === 0, false);
      }
    }
  }

  // Diagonal / shortcut edges to reach target road count
  const avgSpacing = (spacingX + spacingY) / 2;
  let attempts = 0;
  let diagonalCount = 0;
  while (roads.length < cfg.roadCount && attempts < cfg.roadCount * QPSO_TUNING.maxRoadAttempts) {
    attempts++;
    const a = rng.int(0, nodes.length);
    const b = rng.int(0, nodes.length);
    const dx = nodes[a].x - nodes[b].x;
    const dy = nodes[a].y - nodes[b].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < avgSpacing * QPSO_TUNING.diagonalThreshold && dist > avgSpacing * QPSO_TUNING.diagonalMinDistance) {
      const roadAdded = addRoad(a, b, rng.next() < QPSO_TUNING.diagonalMainRoadProb, true);
      if (roadAdded) diagonalCount++;
    }
  }

  // --- Enforce minimum diagonal ratio ---
  // If fewer than 40% of roads are diagonal, keep adding diagonal roads until the ratio is met.
  const diagonalRatio = diagonalCount / roads.length;
  if (diagonalRatio < QPSO_TUNING.minDiagonalRatio) {
    let extraAttempts = 0;
    while (
      diagonalCount / roads.length < QPSO_TUNING.minDiagonalRatio &&
      extraAttempts < cfg.roadCount * QPSO_TUNING.maxRoadAttempts
    ) {
      extraAttempts++;
      const a = rng.int(0, nodes.length);
      const b = rng.int(0, nodes.length);
      const dx = nodes[a].x - nodes[b].x;
      const dy = nodes[a].y - nodes[b].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < avgSpacing * QPSO_TUNING.diagonalThreshold && dist > avgSpacing * QPSO_TUNING.diagonalMinDistance) {
        const roadAdded = addRoad(a, b, rng.next() < QPSO_TUNING.diagonalMainRoadProb, true);
        if (roadAdded) diagonalCount++;
      }
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

  // --- 4. Assign customers (connectivity-based, spatially distributed) ---
  // Task 4.1: Build node connectivity map
  const nodeConnectivity = new Map<number, number>();
  for (const road of roads) {
    const fromIdx = nodes.findIndex(n => n.id === road.from);
    const toIdx = nodes.findIndex(n => n.id === road.to);
    nodeConnectivity.set(fromIdx, (nodeConnectivity.get(fromIdx) ?? 0) + 1);
    nodeConnectivity.set(toIdx, (nodeConnectivity.get(toIdx) ?? 0) + 1);
  }

  // Task 4.2: Sort candidates by connectivity score, preferring nodes with 4+ connections
  const sortedCandidates = nodes
    .map((_, i) => i)
    .filter(i => i !== depotIdx)
    .sort((a, b) => {
      const connectA = nodeConnectivity.get(a) ?? 0;
      const connectB = nodeConnectivity.get(b) ?? 0;
      const scoreA = connectA >= 4 ? connectA + 10 : connectA;
      const scoreB = connectB >= 4 ? connectB + 10 : connectB;
      return scoreB - scoreA;
    });

  // Task 4.3: Select customers with minimum spacing constraint
  const networkDiagonal = Math.sqrt(900 * 900 + 700 * 700);
  const minCustomerSpacing = networkDiagonal * 0.15;
  const depotNode = nodes[depotIdx];
  const maxRadius = Math.sqrt(
    Math.max(...nodes.map(n => (n.x - depotNode.x) ** 2 + (n.y - depotNode.y) ** 2))
  );
  const outerRadiusThreshold = maxRadius * 0.5;

  const selectedIndices: number[] = [];
  // Use farthest-point selection seeded by the highest-connectivity candidate.
  // This balances connectivity preference with spatial spread to satisfy the
  // minimum spacing constraint (Requirement 3.2).
  const remainingCandidates = [...sortedCandidates]; // already sorted by connectivity score

  // Seed with the highest-connectivity candidate
  if (remainingCandidates.length > 0) {
    selectedIndices.push(remainingCandidates.shift()!);
  }

  // Iteratively pick the candidate that is farthest from all already-selected nodes,
  // among candidates that satisfy the connectivity minimum spacing constraint.
  while (selectedIndices.length < cfg.customerCount && remainingCandidates.length > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let ri = 0; ri < remainingCandidates.length; ri++) {
      const candidateIdx = remainingCandidates[ri];
      const candidate = nodes[candidateIdx];
      // Minimum distance to all already-selected nodes
      let minDistToSelected = Infinity;
      for (const selIdx of selectedIndices) {
        const sel = nodes[selIdx];
        const d = Math.sqrt((candidate.x - sel.x) ** 2 + (candidate.y - sel.y) ** 2);
        if (d < minDistToSelected) minDistToSelected = d;
      }
      if (minDistToSelected < minCustomerSpacing) continue; // spacing constraint

      // Score: favor nodes that are far from existing selections AND well-connected
      const connectivity = nodeConnectivity.get(candidateIdx) ?? 0;
      const connBonus = connectivity >= 4 ? connectivity + 10 : connectivity;
      // Normalize distance contribution (canvas diagonal is ~1138)
      const score = minDistToSelected + connBonus * 5;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = ri;
      }
    }

    if (bestIdx !== -1) {
      selectedIndices.push(remainingCandidates[bestIdx]);
      remainingCandidates.splice(bestIdx, 1);
    } else {
      // Can't satisfy spacing — relax by 25% and retry the full selection from scratch
      break;
    }
  }

  // Fallback: if spacing was too strict to fill all slots, redo with relaxed spacing
  if (selectedIndices.length < cfg.customerCount) {
    const relaxedSpacing = minCustomerSpacing * 0.75;
    selectedIndices.length = 0;
    const fallbackCandidates = [...sortedCandidates];
    if (fallbackCandidates.length > 0) {
      selectedIndices.push(fallbackCandidates.shift()!);
    }
    while (selectedIndices.length < cfg.customerCount && fallbackCandidates.length > 0) {
      let bestIdx = -1;
      let bestScore = -Infinity;
      for (let ri = 0; ri < fallbackCandidates.length; ri++) {
        const candidateIdx = fallbackCandidates[ri];
        const candidate = nodes[candidateIdx];
        let minDistToSelected = Infinity;
        for (const selIdx of selectedIndices) {
          const sel = nodes[selIdx];
          const d = Math.sqrt((candidate.x - sel.x) ** 2 + (candidate.y - sel.y) ** 2);
          if (d < minDistToSelected) minDistToSelected = d;
        }
        if (minDistToSelected < relaxedSpacing) continue;
        const connectivity = nodeConnectivity.get(candidateIdx) ?? 0;
        const connBonus = connectivity >= 4 ? connectivity + 10 : connectivity;
        const score = minDistToSelected + connBonus * 5;
        if (score > bestScore) { bestScore = score; bestIdx = ri; }
      }
      if (bestIdx !== -1) {
        selectedIndices.push(fallbackCandidates[bestIdx]);
        fallbackCandidates.splice(bestIdx, 1);
      } else {
        // Add remaining by connectivity with no spacing constraint
        for (const c of sortedCandidates) {
          if (selectedIndices.length >= cfg.customerCount) break;
          if (!selectedIndices.includes(c)) selectedIndices.push(c);
        }
        break;
      }
    }
  }

  const customerCount = Math.min(cfg.customerCount, selectedIndices.length);

  // Task 4.4: Enforce radial distribution — at least 40% of customers in outer 50% of radius
  const outerCandidates = sortedCandidates.filter(idx => {
    const n = nodes[idx];
    const r = Math.sqrt((n.x - depotNode.x) ** 2 + (n.y - depotNode.y) ** 2);
    return r > outerRadiusThreshold && !selectedIndices.slice(0, customerCount).includes(idx);
  });

  let outerCount = selectedIndices.slice(0, customerCount).filter(idx => {
    const n = nodes[idx];
    const r = Math.sqrt((n.x - depotNode.x) ** 2 + (n.y - depotNode.y) ** 2);
    return r > outerRadiusThreshold;
  }).length;

  const minOuterCount = Math.ceil(customerCount * 0.4);
  if (outerCount < minOuterCount) {
    // Swap inner customers with outer candidates
    for (const outerIdx of outerCandidates) {
      if (outerCount >= minOuterCount) break;
      // Find an inner customer to replace
      const innerPos = selectedIndices.findIndex((idx, pos) => {
        if (pos >= customerCount) return false;
        const n = nodes[idx];
        const r = Math.sqrt((n.x - depotNode.x) ** 2 + (n.y - depotNode.y) ** 2);
        return r <= outerRadiusThreshold;
      });
      if (innerPos !== -1) {
        selectedIndices[innerPos] = outerIdx;
        outerCount++;
      }
    }
  }

  // Task 4.5: Enforce district distribution — at least 75% of districts represented
  const allDistricts = [...new Set(nodes.map(n => n.district))];
  const targetDistrictCoverage = Math.ceil(allDistricts.length * 0.75);
  const coveredDistricts = new Set(selectedIndices.slice(0, customerCount).map(idx => nodes[idx].district));

  if (coveredDistricts.size < targetDistrictCoverage) {
    const uncoveredDistricts = allDistricts.filter(d => !coveredDistricts.has(d));
    for (const district of uncoveredDistricts) {
      if (coveredDistricts.size >= targetDistrictCoverage) break;
      // Find a candidate in this district not already selected
      const districtCandidate = sortedCandidates.find(idx =>
        nodes[idx].district === district && !selectedIndices.slice(0, customerCount).includes(idx)
      );
      if (districtCandidate !== undefined) {
        // Replace the most over-represented district's customer
        const districtCounts = new Map<string, number>();
        selectedIndices.slice(0, customerCount).forEach(idx => {
          const d = nodes[idx].district;
          districtCounts.set(d, (districtCounts.get(d) ?? 0) + 1);
        });
        const maxCount = Math.max(...districtCounts.values());
        const maxCountDistrict = [...districtCounts.entries()].find(([, c]) => c === maxCount)?.[0];
        const replacePos = selectedIndices.findIndex((idx, pos) =>
          pos < customerCount && nodes[idx].district === maxCountDistrict
        );
        if (replacePos !== -1) {
          selectedIndices[replacePos] = districtCandidate;
          coveredDistricts.add(district);
        }
      }
    }
  }

  // Also enforce max 30% per district when customerCount < 20
  if (customerCount < 20) {
    const maxPerDistrict = Math.floor(customerCount * 0.3);
    const districtCounts = new Map<string, number>();
    for (let i = 0; i < customerCount; i++) {
      const d = nodes[selectedIndices[i]].district;
      districtCounts.set(d, (districtCounts.get(d) ?? 0) + 1);
    }
    for (const [district, count] of districtCounts) {
      if (count > maxPerDistrict) {
        const excess = count - maxPerDistrict;
        let replaced = 0;
        for (let i = 0; i < customerCount && replaced < excess; i++) {
          if (nodes[selectedIndices[i]].district === district) {
            // Find a replacement from a different district
            const replacement = sortedCandidates.find(idx =>
              nodes[idx].district !== district && !selectedIndices.slice(0, customerCount).includes(idx)
            );
            if (replacement !== undefined) {
              selectedIndices[i] = replacement;
              replaced++;
            }
          }
        }
      }
    }
  }

  // Build customers array from selected indices
  const customers: Customer[] = [];
  for (let i = 0; i < customerCount; i++) {
    const nIdx = selectedIndices[i];
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
