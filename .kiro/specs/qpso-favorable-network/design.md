# Design Document: QPSO-Favorable Network Generator

## Overview

This design modifies the existing `network-generator.ts` to create transportation network topologies that favor Quantum Particle Swarm Optimization (QPSO) by 5-15% over other optimization algorithms. The modifications focus on increasing network complexity through enhanced diagonal connections, shortcut roads, and multi-path routing opportunities that leverage QPSO's quantum-inspired exploration capabilities.

## Architecture

### Component Structure

The design maintains the existing single-file architecture of `network-generator.ts` with modifications to:

1. **Configuration Constants** - Update `DEFAULT_CONFIG` and add new tuning parameters
2. **Grid Generation Logic** - Enhance node placement with increased jitter and density
3. **Road Generation Algorithm** - Prioritize diagonal and shortcut connections
4. **Customer Placement Strategy** - Distribute customers to favor exploration algorithms
5. **Road Property Assignment** - Create meaningful speed/lane tradeoffs

### Data Flow

```
NetworkConfig → generateNetwork() → Enhanced Grid → Road Generation → Customer Placement → NetworkGraph
                                          ↓
                                   Validation Checks
```

The enhanced generator maintains backward compatibility by accepting all existing `NetworkConfig` parameters while applying new internal tuning parameters to favor QPSO performance.

## Component Design

### 1. Enhanced Configuration

**Modification**: Update `DEFAULT_CONFIG` and introduce new internal constants for QPSO-favorable generation.

**New Constants**:
```typescript
const DEFAULT_CONFIG: NetworkConfig = {
  nodeCount: 120,
  roadCount: 320,        // increased from 250
  customerCount: 15,
  vehicleCount: 5,
  seed: 42,
};

// Internal tuning constants for QPSO-favorable networks
const QPSO_TUNING = {
  nodeMultiplier: 1.5,           // increased from 1.3
  jitterFactor: 0.35,            // increased from 0.25
  diagonalThreshold: 4.0,        // increased from 2.5
  diagonalMinDistance: 0.8,      // increased from 0.3
  diagonalMainRoadProb: 0.4,     // increased from 0.2
  maxRoadAttempts: 8,            // increased from 5
  minDiagonalRatio: 0.4,         // new: 40% diagonal/shortcut roads
  minRoadDensity: 2.2,           // new: connections per node
  diagonalSpeedMin: 55,          // new: diagonal road speeds
  diagonalSpeedMax: 85,
  gridSpeedMin: 20,              // new: grid road speeds
  gridSpeedMax: 40,
  minSpeedVariance: 15,          // new: stddev of speeds
  minMainRoadRatio: 0.35,        // new: 35% main roads
  highLanesDiagonalRatio: 0.3,   // new: 30% of diagonals with 3-5 lanes
};
```

**Rationale**: Centralizing tuning parameters makes it easy to adjust QPSO favorability and maintain consistency across the generator logic.

### 2. Enhanced Grid Generation

**Modification**: Increase node density and jitter to create more complex topologies.

**Algorithm**:
```typescript
// Increase grid density with 1.5x multiplier
const cols = Math.ceil(Math.sqrt(cfg.nodeCount * QPSO_TUNING.nodeMultiplier));
const rows = Math.ceil(cfg.nodeCount / cols);
const spacingX = 900 / cols;
const spacingY = 700 / rows;

// Increase jitter for less uniform grid
const jitterX = rng.range(-spacingX * QPSO_TUNING.jitterFactor, spacingX * QPSO_TUNING.jitterFactor);
const jitterY = rng.range(-spacingY * QPSO_TUNING.jitterFactor, spacingY * QPSO_TUNING.jitterFactor);
```

**Rationale**: Higher node density and increased jitter create more complex topologies with irregular spacing, which benefits QPSO's quantum-inspired exploration over simpler grid-based heuristics.

### 3. Enhanced Road Generation

**Modification**: Prioritize diagonal and shortcut connections with improved selection criteria.

**Algorithm**:

```typescript
// Phase 1: Grid edges (unchanged for base connectivity)
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    // ... existing grid edge logic
  }
}

// Phase 2: Enhanced diagonal/shortcut edges
let attempts = 0;
let diagonalCount = 0;
while (roads.length < cfg.roadCount && attempts < cfg.roadCount * QPSO_TUNING.maxRoadAttempts) {
  attempts++;
  const a = rng.int(0, nodes.length);
  const b = rng.int(0, nodes.length);
  const dx = nodes[a].x - nodes[b].x;
  const dy = nodes[a].y - nodes[b].y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  // Enhanced diagonal selection criteria
  const avgSpacing = (spacingX + spacingY) / 2;
  if (dist < avgSpacing * QPSO_TUNING.diagonalThreshold && 
      dist > avgSpacing * QPSO_TUNING.diagonalMinDistance) {
    const isMain = rng.next() < QPSO_TUNING.diagonalMainRoadProb;
    const roadAdded = addRoad(a, b, isMain, true); // pass isDiagonal flag
    if (roadAdded) diagonalCount++;
  }
}

// Phase 3: Ensure minimum diagonal ratio
const totalRoads = roads.length;
const currentDiagonalRatio = diagonalCount / totalRoads;
if (currentDiagonalRatio < QPSO_TUNING.minDiagonalRatio) {
  // Add more diagonal roads until ratio is met
  // ... additional diagonal generation logic
}
```

**Rationale**: Increasing diagonal roads and shortcuts creates more path alternatives, which QPSO can explore more effectively than algorithms that rely on local search or pheromone trails.

### 4. Enhanced Road Properties

**Modification**: Update `addRoad()` to assign differentiated speed and lane properties.

**Algorithm**:

```typescript
const addRoad = (
  fromIdx: number, 
  toIdx: number, 
  isMain: boolean,
  isDiagonal: boolean = false
): boolean => {
  // ... existing validation logic
  
  // Enhanced speed assignment
  let speed: number;
  if (isDiagonal) {
    speed = rng.range(QPSO_TUNING.diagonalSpeedMin, QPSO_TUNING.diagonalSpeedMax);
  } else {
    speed = rng.range(QPSO_TUNING.gridSpeedMin, QPSO_TUNING.gridSpeedMax);
  }
  
  // Enhanced lane assignment for diagonal roads
  let lanes: number;
  if (isDiagonal && rng.next() < QPSO_TUNING.highLanesDiagonalRatio) {
    lanes = rng.int(3, 5);
  } else {
    lanes = isMain ? rng.int(2, 4) : rng.int(1, 3);
  }
  
  roads.push({
    // ... existing road properties
    freeFlowSpeed: Math.round(speed),
    currentSpeed: Math.round(speed),
    lanes: lanes,
    isMainRoad: isMain,
  });
  
  return true;
};
```

**Rationale**: Differentiated speed ranges create meaningful tradeoffs between fast diagonal routes and slower grid routes. This complexity benefits QPSO's ability to balance exploration and exploitation.

### 5. Enhanced Customer Placement

**Modification**: Replace random customer placement with connectivity-based selection.

**Algorithm**:

```typescript
// Step 1: Build adjacency list to compute node connectivity
const nodeConnectivity = new Map<number, number>();
roads.forEach(road => {
  const fromIdx = nodes.findIndex(n => n.id === road.from);
  const toIdx = nodes.findIndex(n => n.id === road.to);
  nodeConnectivity.set(fromIdx, (nodeConnectivity.get(fromIdx) || 0) + 1);
  nodeConnectivity.set(toIdx, (nodeConnectivity.get(toIdx) || 0) + 1);
});

// Step 2: Sort candidates by connectivity (prefer 4+ connections)
const candidateIndices = nodes
  .map((_, i) => i)
  .filter(i => i !== depotIdx)
  .sort((a, b) => {
    const connectA = nodeConnectivity.get(a) || 0;
    const connectB = nodeConnectivity.get(b) || 0;
    // Prefer nodes with 4+ connections
    const scoreA = connectA >= 4 ? connectA + 10 : connectA;
    const scoreB = connectB >= 4 ? connectB + 10 : connectB;
    return scoreB - scoreA;
  });

// Step 3: Select customers with spatial distribution constraints
const customers: Customer[] = [];
const selectedIndices: number[] = [];
const networkDiagonal = Math.sqrt(900 * 900 + 700 * 700);
const minCustomerSpacing = networkDiagonal * 0.15;
const depotNode = nodes[depotIdx];
const maxRadius = Math.sqrt(
  Math.max(
    ...nodes.map(n => (n.x - depotNode.x) ** 2 + (n.y - depotNode.y) ** 2)
  )
);

for (const candidateIdx of candidateIndices) {
  if (selectedIndices.length >= cfg.customerCount) break;
  
  const candidate = nodes[candidateIdx];
  
  // Check minimum spacing constraint
  const tooClose = selectedIndices.some(idx => {
    const existing = nodes[idx];
    const dist = Math.sqrt(
      (candidate.x - existing.x) ** 2 + (candidate.y - existing.y) ** 2
    );
    return dist < minCustomerSpacing;
  });
  
  if (!tooClose) {
    selectedIndices.push(candidateIdx);
  }
}

// Step 4: Verify outer radius distribution (40% in outer 50%)
// If not met, swap some inner customers with outer candidates
// ... validation and adjustment logic
```

**Rationale**: Placing customers at well-connected nodes with spatial distribution creates more complex routing decisions that QPSO can handle better than greedy algorithms.

### 6. Validation and Scaling

**Modification**: Add post-generation validation to ensure QPSO-favorable properties are met.

**Algorithm**:

```typescript
function validateQPSOFavorableNetwork(graph: NetworkGraph, config: NetworkConfig): void {
  const { nodes, roads } = graph;
  
  // Validate road density
  const roadDensity = (2 * roads.length) / nodes.length;
  if (roadDensity < QPSO_TUNING.minRoadDensity) {
    console.warn(`Road density ${roadDensity} below target ${QPSO_TUNING.minRoadDensity}`);
  }
  
  // Validate diagonal ratio
  const diagonalRoads = roads.filter(r => isDiagonalRoad(r, nodes));
  const diagonalRatio = diagonalRoads.length / roads.length;
  if (diagonalRatio < QPSO_TUNING.minDiagonalRatio) {
    console.warn(`Diagonal ratio ${diagonalRatio} below target ${QPSO_TUNING.minDiagonalRatio}`);
  }
  
  // Validate speed variance
  const speeds = roads.map(r => r.freeFlowSpeed);
  const meanSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const variance = speeds.reduce((sum, s) => sum + (s - meanSpeed) ** 2, 0) / speeds.length;
  const stddev = Math.sqrt(variance);
  if (stddev < QPSO_TUNING.minSpeedVariance) {
    console.warn(`Speed stddev ${stddev} below target ${QPSO_TUNING.minSpeedVariance}`);
  }
  
  // Scale enhancements for small networks (nodeCount < 50)
  if (config.nodeCount < 50) {
    const scaleFactor = config.nodeCount / 50;
    // Proportionally reduce diagonal ratio expectations
    // ... scaling logic
  }
}

function isDiagonalRoad(road: Road, nodes: Node[]): boolean {
  const from = nodes.find(n => n.id === road.from);
  const to = nodes.find(n => n.id === road.to);
  if (!from || !to) return false;
  
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  
  // Diagonal if both dx and dy are significant
  return dx > 10 && dy > 10;
}
```

**Rationale**: Post-generation validation ensures the QPSO-favorable properties are actually achieved, and scaling logic maintains backward compatibility for small networks.

## Interface Changes

### Public API

**No breaking changes**. The function signatures remain unchanged:

```typescript
export function generateNetwork(config: Partial<NetworkConfig> = {}): NetworkGraph
export function buildAdjacency(roads: Road[]): Map<string, { to: string; road: Road }[]>
```

### Internal Changes

1. **New parameter on `addRoad()`**: Add optional `isDiagonal: boolean` parameter
2. **New helper functions**: 
   - `validateQPSOFavorableNetwork()`
   - `isDiagonalRoad()`
   - `computeNodeConnectivity()`
   - `ensureDiagonalRatio()`

## Data Models

No changes to existing types in `types.ts`. All enhancements use existing `NetworkConfig` and `NetworkGraph` structures.

## Error Handling

### Validation Warnings

Non-fatal warnings logged to console when QPSO-favorable targets are not met:
- Road density below 2.2 connections per node
- Diagonal road ratio below 40%
- Speed variance below 15 km/h
- Main road ratio below 35%

### Fallback Behavior

If target properties cannot be achieved (e.g., very small networks), the generator will:
1. Log warnings
2. Scale expectations proportionally for `nodeCount < 50`
3. Still return a valid, fully-connected network
4. Maintain deterministic behavior for a given seed

## Performance Considerations

### Computational Complexity

- **Grid generation**: O(n) where n = nodeCount
- **Road generation**: O(r * a) where r = roadCount, a = attempts multiplier (8)
- **Customer placement**: O(c² * n) where c = customerCount, n = nodeCount (due to spacing checks)
- **Validation**: O(r + n) where r = roadCount, n = nodeCount

**Total complexity**: O(r * a + c² * n) ≈ O(2560 * nodeCount) for default config

### Memory Usage

No significant memory overhead. All operations use existing data structures with minimal additional bookkeeping.

### Optimization Opportunities

1. **Spatial indexing**: Use grid-based spatial hash for customer placement to reduce O(c²) spacing checks
2. **Early termination**: Stop diagonal road attempts once minimum ratio is achieved
3. **Lazy validation**: Only validate when explicitly requested (development mode)

## Testing Strategy

### Unit Tests

Unit tests focus on specific examples and edge cases:

1. **Configuration constants**: Verify DEFAULT_CONFIG values (roadCount=320, etc.)
2. **Grid multiplier**: Verify grid calculation uses 1.5 multiplier
3. **Jitter factor**: Verify jitter range is 0.35 * spacing
4. **Function signatures**: Verify generateNetwork and buildAdjacency signatures unchanged
5. **Small network behavior**: Verify networks with nodeCount < 50 scale proportionally

### Property-Based Tests

Property tests verify universal properties across all generated networks. All tests run with **minimum 100 iterations** due to randomization.

**Configuration**: Use fast-check or similar PBT library for TypeScript

```typescript
import fc from 'fast-check';

// Arbitrary generators
const networkConfigArbitrary = fc.record({
  nodeCount: fc.integer({ min: 30, max: 200 }),
  roadCount: fc.integer({ min: 100, max: 500 }),
  customerCount: fc.integer({ min: 5, max: 30 }),
  vehicleCount: fc.integer({ min: 3, max: 10 }),
  seed: fc.integer({ min: 1, max: 10000 }),
});
```

See **Correctness Properties** section below for detailed property specifications.

### Integration Tests

Integration tests verify end-to-end QPSO performance advantage:

1. **QPSO vs PSO**: Run both algorithms on 5 generated networks, verify QPSO is 5-15% better
2. **QPSO vs GA**: Run both algorithms on 5 generated networks, verify QPSO is 8-18% better
3. **QPSO vs ACO**: Run both algorithms on 5 generated networks, verify QPSO is 10-20% better
4. **Seed consistency**: Verify QPSO advantage holds across 3 different random seeds
5. **Convergence speed**: Verify QPSO reaches 90% optimal within 60% of max iterations

**Note**: Integration tests are expensive (run multiple optimization algorithms) and should be run separately from unit/property tests.

## Migration Strategy

### Backward Compatibility

The design maintains full backward compatibility:

1. **Existing code**: All code using `generateNetwork()` continues to work without changes
2. **Existing tests**: All existing tests should pass (though networks will have different structure)
3. **Deterministic seeds**: Networks generated with the same seed will differ, but remain deterministic

### Rollout Plan

1. **Phase 1**: Implement core enhancements (grid, roads, customers)
2. **Phase 2**: Add validation and scaling logic
3. **Phase 3**: Run integration tests to verify QPSO performance advantage
4. **Phase 4**: Fine-tune constants if QPSO advantage is not in 5-15% target range

### Rollback Strategy

If QPSO advantage is not achieved or performance degrades:

1. **Adjust tuning constants**: Increase diagonal threshold, increase road attempts, etc.
2. **Revert specific enhancements**: Roll back one enhancement at a time to identify issues
3. **Full revert**: Git revert to previous version if fundamental issues arise

## Security Considerations

No security implications. The network generator operates on in-memory data structures with no external I/O or user input validation concerns.

## Deployment Considerations

### Environment Requirements

- TypeScript 4.0+
- No additional dependencies required
- Compatible with existing Vite build pipeline

### Configuration

All tuning parameters are internal constants in `network-generator.ts`. No external configuration files or environment variables needed.

### Monitoring

Recommend adding telemetry to track:
- Average road density in generated networks
- Average diagonal road ratio
- Average speed variance
- QPSO performance advantage in production benchmarks

## Future Enhancements

1. **Adaptive tuning**: Automatically adjust constants based on optimization results
2. **Multi-objective favorability**: Support favoring different algorithms for different scenarios
3. **Network templates**: Pre-defined network archetypes (grid-heavy, shortcut-heavy, etc.)
4. **Incremental enhancement**: Add QPSO-favorable features to existing networks without regenerating

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Main Road Classification Probability for Diagonal Roads

*For any* generated network with diagonal roads, approximately 40% of diagonal roads should be classified as main roads (within statistical confidence bounds for the sample size).

**Validates: Requirements 1.3**

### Property 2: Minimum Diagonal Road Ratio

*For any* generated network with default or custom configuration, at least 40% of total roads must be diagonal or shortcut connections (non-grid edges).

**Validates: Requirements 1.5**

### Property 3: Minimum Road Density

*For any* generated network, the road density (calculated as 2 * roadCount / nodeCount, since each road connects two nodes) must exceed 2.2 connections per node on average.

**Validates: Requirements 2.4**

### Property 4: Distinct Path Alternatives

*For any* generated network, at least 3 distinct paths must exist between every customer node and the depot node.

**Validates: Requirements 2.5**

### Property 5: Customer Node Connectivity

*For any* generated network, at least 70% of customer nodes must have 4 or more road connections.

**Validates: Requirements 3.1**

### Property 6: Minimum Customer Spacing

*For any* generated network, the minimum Euclidean distance between any two customers must be at least 15% of the network diagonal (sqrt(900² + 700²)).

**Validates: Requirements 3.2**

### Property 7: Customer District Distribution

*For any* generated network, customers must be distributed across at least 75% of the available districts.

**Validates: Requirements 3.3**

### Property 8: District Concentration Limit

*For any* generated network with fewer than 20 customers, no single district should contain more than 30% of the total customers.

**Validates: Requirements 3.4**

### Property 9: Customer Radial Distribution

*For any* generated network, at least 40% of customers must be located in the outer 50% of the network radius from the depot (beyond 0.5 * max_radius).

**Validates: Requirements 3.5**

### Property 10: Diagonal Road Speed Range

*For any* generated network, all diagonal roads must have speed values within the range [55, 85] km/h.

**Validates: Requirements 4.1**

### Property 11: Grid Road Speed Range

*For any* generated network, all grid-aligned roads (horizontal or vertical) must have speed values within the range [20, 40] km/h.

**Validates: Requirements 4.2**

### Property 12: Speed Variance Threshold

*For any* generated network, the standard deviation of road speeds across all roads must exceed 15 km/h.

**Validates: Requirements 4.3**

### Property 13: High-Lane Diagonal Roads

*For any* generated network, at least 30% of diagonal connections must have 3 to 5 lanes assigned.

**Validates: Requirements 4.4**

### Property 14: Main Road Distribution

*For any* generated network, at least 35% of all roads must be classified as main roads (isMainRoad = true).

**Validates: Requirements 4.5**

### Property 15: Deterministic Generation

*For any* seed value, calling generateNetwork with the same seed and configuration twice must produce identical networks (same node positions, road connections, customer assignments).

**Validates: Requirements 5.2**

### Property 16: Full Graph Connectivity

*For any* generated network, the graph must be fully connected (every node must be reachable from every other node via some path).

**Validates: Requirements 5.4**

### Property 17: Proportional Scaling for Small Networks

*For any* generated network with nodeCount less than 50, the diagonal road ratio target should scale proportionally (e.g., if nodeCount = 25, target diagonal ratio = 0.4 * (25/50) = 0.2).

**Validates: Requirements 5.5**

## Appendix: Example Network Characteristics

### Before Enhancement (Current)
- **Diagonal roads**: ~15-20% of total roads
- **Road density**: ~1.8 connections per node
- **Customer placement**: Random selection
- **Speed variance**: ~10 km/h
- **Main roads**: ~25% of total roads

### After Enhancement (Target)
- **Diagonal roads**: ~40-50% of total roads
- **Road density**: ~2.4 connections per node
- **Customer placement**: Connectivity-based, spatially distributed
- **Speed variance**: ~18-22 km/h
- **Main roads**: ~38-42% of total roads

### Expected QPSO Performance Impact
- **vs PSO**: 5-15% better (quantum exploration finds better diagonal shortcuts)
- **vs GA**: 8-18% better (continuous optimization vs discrete crossover)
- **vs ACO**: 10-20% better (global mean-best vs local pheromone trails)
- **Convergence**: Reaches 90% optimal in ~60% of max iterations (faster exploration)

## References

1. Requirements: `.kiro/specs/qpso-favorable-network/requirements.md`
2. Existing Implementation: `src/engine/network-generator.ts`
3. Type Definitions: `src/engine/types.ts`
4. QPSO Algorithm: `src/engine/algorithms/qpso.ts`
