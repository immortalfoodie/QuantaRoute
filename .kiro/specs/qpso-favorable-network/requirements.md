# Requirements Document

## Introduction

This feature modifies the network generation algorithm to create topologies that favor Quantum Particle Swarm Optimization (QPSO) by 5-15% over other optimization algorithms. The modification focuses on increasing network complexity through enhanced diagonal connections, shortcut roads, and multi-path routing opportunities that leverage QPSO's quantum-inspired exploration capabilities and mean-best position mechanics.

## Glossary

- **Network_Generator**: The system component responsible for creating synthetic city transportation graphs with nodes, roads, customers, and vehicles
- **QPSO**: Quantum Particle Swarm Optimization algorithm that uses mean best position and quantum-inspired position updates for exploration
- **Diagonal_Road**: A road connection that spans across grid cells diagonally rather than following horizontal/vertical grid lines
- **Shortcut_Road**: A direct road connection between non-adjacent nodes that reduces path distance
- **Grid_Spacing**: The horizontal (spacingX) and vertical (spacingY) distance between adjacent grid nodes
- **Exploration_Space**: The solution space that benefits from algorithms with strong global search capabilities
- **Road_Density**: The ratio of actual roads to maximum possible connections in the network graph
- **Multi_Path_Topology**: A network structure where multiple distinct paths exist between key node pairs

## Requirements

### Requirement 1: Increase Diagonal Road Connections

**User Story:** As a demo presenter, I want the network to have substantially more diagonal connections, so that QPSO's exploration capabilities yield better solutions than grid-constrained algorithms.

#### Acceptance Criteria

1. THE Network_Generator SHALL increase the diagonal road generation threshold from 2.5 to 4.0 times the Grid_Spacing
2. THE Network_Generator SHALL increase the minimum diagonal connection distance from 0.3 to 0.8 times the Grid_Spacing
3. WHEN generating diagonal roads, THE Network_Generator SHALL increase the probability of main road classification from 0.2 to 0.4
4. THE Network_Generator SHALL increase the maximum road generation attempts from 5 times roadCount to 8 times roadCount
5. THE Network_Generator SHALL ensure at least 40% of total roads are diagonal or shortcut connections

### Requirement 2: Enhance Network Complexity

**User Story:** As a demo presenter, I want a more complex network topology, so that QPSO's mean-best position mechanics find better convergence paths than simpler algorithms.

#### Acceptance Criteria

1. THE Network_Generator SHALL increase the default roadCount from 250 to 320
2. THE Network_Generator SHALL increase the node generation multiplier from 1.3 to 1.5 in the grid calculation
3. WHEN calculating grid layout, THE Network_Generator SHALL reduce the spacing uniformity by increasing jitter range from 0.25 to 0.35
4. THE Network_Generator SHALL ensure Road_Density exceeds 2.2 connections per node on average
5. THE Network_Generator SHALL create at least 3 distinct path alternatives between any customer and the depot

### Requirement 3: Optimize Customer Distribution

**User Story:** As a demo presenter, I want customer nodes distributed to favor exploration algorithms, so that QPSO's global search finds superior routing solutions.

#### Acceptance Criteria

1. WHEN selecting customer locations, THE Network_Generator SHALL prefer nodes with 4 or more road connections
2. THE Network_Generator SHALL ensure minimum euclidean distance between any two customers is at least 15% of the network diagonal
3. THE Network_Generator SHALL distribute customers across at least 75% of available districts
4. WHEN customers are fewer than 20, THE Network_Generator SHALL ensure no district contains more than 30% of total customers
5. THE Network_Generator SHALL place at least 40% of customers in the outer 50% of the network radius from depot

### Requirement 4: Configure Road Properties for Exploration

**User Story:** As a demo presenter, I want road properties that create meaningful tradeoffs, so that QPSO's quantum-inspired updates discover better solutions than greedy algorithms.

#### Acceptance Criteria

1. WHEN generating diagonal roads, THE Network_Generator SHALL assign speed values between 55 and 85 km/h
2. WHEN generating grid roads, THE Network_Generator SHALL assign speed values between 20 and 40 km/h
3. THE Network_Generator SHALL ensure speed variance (standard deviation) across all roads exceeds 15 km/h
4. THE Network_Generator SHALL assign 3 to 5 lanes to at least 30% of diagonal connections
5. THE Network_Generator SHALL ensure main road classification applies to at least 35% of all roads

### Requirement 5: Maintain Backward Compatibility

**User Story:** As a developer, I want existing network configurations to still work, so that the system remains stable while favoring QPSO.

#### Acceptance Criteria

1. THE Network_Generator SHALL accept all existing NetworkConfig parameters without modification
2. WHEN a custom seed is provided, THE Network_Generator SHALL produce deterministic results
3. THE Network_Generator SHALL maintain the existing function signatures for generateNetwork and buildAdjacency
4. THE Network_Generator SHALL ensure all generated networks remain fully connected graphs
5. WHEN nodeCount is less than 50, THE Network_Generator SHALL scale diagonal road enhancements proportionally

### Requirement 6: Verify QPSO Performance Advantage

**User Story:** As a demo presenter, I want to confirm QPSO performs better, so that the demo shows credible and consistent results.

#### Acceptance Criteria

1. WHEN running benchmark comparisons, THE Network_Generator SHALL produce topologies where QPSO achieves 5-15% better fitness than PSO
2. WHEN running benchmark comparisons, THE Network_Generator SHALL produce topologies where QPSO achieves 8-18% better fitness than GA
3. WHEN running benchmark comparisons, THE Network_Generator SHALL produce topologies where QPSO achieves 10-20% better fitness than ACO
4. THE Network_Generator SHALL maintain QPSO advantage across at least 3 different random seeds
5. WHEN comparing convergence speed, THE Network_Generator SHALL produce topologies where QPSO reaches 90% of optimal within 60% of maximum iterations
