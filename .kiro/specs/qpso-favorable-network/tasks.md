# Implementation Plan: QPSO-Favorable Network Generator

## Overview

This implementation enhances the existing `network-generator.ts` file to create transportation network topologies that favor QPSO by 5-15% over other optimization algorithms. The modifications focus on increasing network complexity through enhanced diagonal connections, improved road properties, and strategic customer placement while maintaining full backward compatibility.

## Tasks

- [x] 1. Update configuration constants and add QPSO tuning parameters
  - Modify `DEFAULT_CONFIG` to set `roadCount: 320` (increased from 250)
  - Add new `QPSO_TUNING` constant object with all tuning parameters
  - Include parameters: nodeMultiplier (1.5), jitterFactor (0.35), diagonalThreshold (4.0), diagonalMinDistance (0.8), diagonalMainRoadProb (0.4), maxRoadAttempts (8), minDiagonalRatio (0.4), minRoadDensity (2.2), speed ranges, and lane ratios
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 4.1, 4.2, 4.4, 4.5_

- [x] 2. Enhance grid generation logic
  - [x] 2.1 Update node multiplier and jitter calculations
    - Change grid calculation from `cfg.nodeCount * 1.3` to `cfg.nodeCount * QPSO_TUNING.nodeMultiplier` (1.5)
    - Update jitter range from `0.25` to `QPSO_TUNING.jitterFactor` (0.35)
    - _Requirements: 2.2, 2.3_
  
  - [ ]* 2.2 Write property test for grid generation
    - **Property: Enhanced Grid Multiplier** - Verify grid uses 1.5x multiplier
    - **Property: Increased Jitter Factor** - Verify jitter range is 0.35 * spacing
    - **Validates: Requirements 2.2, 2.3**

- [x] 3. Enhance road generation algorithm
  - [x] 3.1 Update `addRoad()` function signature and implementation
    - Add optional third parameter `isDiagonal: boolean = false`
    - Implement differentiated speed assignment: diagonal roads get 55-85 km/h, grid roads get 20-40 km/h
    - Implement enhanced lane assignment: 30% of diagonal roads get 3-5 lanes, others follow existing logic
    - Keep existing validation logic (duplicate check, bounds check, roadSet management)
    - _Requirements: 1.3, 4.1, 4.2, 4.4_
  
  - [x] 3.2 Update diagonal/shortcut road generation loop
    - Change diagonal threshold from `spacingX * 2.5` to `avgSpacing * QPSO_TUNING.diagonalThreshold` (4.0)
    - Change minimum distance from `spacingX * 0.3` to `avgSpacing * QPSO_TUNING.diagonalMinDistance` (0.8)
    - Change main road probability from `0.2` to `QPSO_TUNING.diagonalMainRoadProb` (0.4)
    - Change max attempts from `cfg.roadCount * 5` to `cfg.roadCount * QPSO_TUNING.maxRoadAttempts` (8)
    - Pass `isDiagonal: true` flag when calling `addRoad()` for diagonal roads
    - Track diagonal road count during generation
    - Calculate `avgSpacing = (spacingX + spacingY) / 2` before the loop
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 3.3 Implement minimum diagonal ratio enforcement
    - After initial road generation, calculate `diagonalRatio = diagonalCount / roads.length`
    - If ratio is below `QPSO_TUNING.minDiagonalRatio` (0.4), add more diagonal roads
    - Use additional loop with same diagonal selection criteria until ratio is met or max attempts reached
    - _Requirements: 1.5_
  
  - [ ]* 3.4 Write property tests for road generation
    - **Property 1: Main Road Classification Probability for Diagonal Roads** - Verify ~40% of diagonal roads are main roads (with statistical bounds)
    - **Property 2: Minimum Diagonal Road Ratio** - Verify at least 40% of roads are diagonal/shortcut
    - **Property 3: Minimum Road Density** - Verify density exceeds 2.2 connections per node
    - **Property 10: Diagonal Road Speed Range** - Verify diagonal roads have speeds in [55, 85]
    - **Property 11: Grid Road Speed Range** - Verify grid roads have speeds in [20, 40]
    - **Property 12: Speed Variance Threshold** - Verify speed stddev exceeds 15 km/h
    - **Property 13: High-Lane Diagonal Roads** - Verify at least 30% of diagonals have 3-5 lanes
    - **Property 14: Main Road Distribution** - Verify at least 35% of roads are main roads
    - **Validates: Requirements 1.3, 1.5, 2.4, 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 4. Implement connectivity-based customer placement
  - [x] 4.1 Build node connectivity map
    - Create `nodeConnectivity` Map to track road connections per node
    - Iterate through roads array to count connections for each node
    - _Requirements: 3.1_
  
  - [ ] 4.2 Sort candidates by connectivity score
    - Filter out depot node from candidates
    - Sort candidates by connectivity, preferring nodes with 4+ connections
    - Add bonus score (+10) for nodes with 4+ connections
    - _Requirements: 3.1_
  
  - [ ] 4.3 Implement spatial distribution constraints
    - Calculate `minCustomerSpacing = networkDiagonal * 0.15` (15% of diagonal)
    - For each candidate, check minimum spacing from already-selected customers
    - Skip candidates that are too close to existing customers
    - Continue until `cfg.customerCount` customers are selected
    - _Requirements: 3.2_
  
  - [ ] 4.4 Implement radial distribution validation
    - Calculate network radius from depot to farthest node
    - Track how many customers are in outer 50% of radius
    - If less than 40% are in outer region, swap inner customers with outer candidates
    - Maintain spatial distribution constraints during swapping
    - _Requirements: 3.5_
  
  - [ ] 4.5 Implement district distribution validation
    - Count unique districts represented by selected customers
    - Calculate percentage of available districts covered
    - Ensure at least 75% of districts are represented
    - If district concentration exceeds 30% for any single district (when customerCount < 20), swap customers
    - _Requirements: 3.3, 3.4_
  
  - [ ]* 4.6 Write property tests for customer placement
    - **Property 5: Customer Node Connectivity** - Verify at least 70% of customers have 4+ connections
    - **Property 6: Minimum Customer Spacing** - Verify minimum distance is at least 15% of network diagonal
    - **Property 7: Customer District Distribution** - Verify customers span at least 75% of districts
    - **Property 8: District Concentration Limit** - Verify no district has more than 30% of customers (when < 20 customers)
    - **Property 9: Customer Radial Distribution** - Verify at least 40% of customers are in outer 50% of radius
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [ ] 5. Checkpoint - Ensure core functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement validation and helper functions
  - [ ] 6.1 Implement `isDiagonalRoad()` helper function
    - Accept road and nodes array as parameters
    - Find from and to nodes using road.from and road.to
    - Calculate dx and dy between nodes
    - Return true if both dx > 10 and dy > 10
    - _Requirements: 1.5_
  
  - [ ] 6.2 Implement `validateQPSOFavorableNetwork()` function
    - Accept NetworkGraph and NetworkConfig as parameters
    - Validate road density >= 2.2, log warning if below
    - Validate diagonal ratio >= 0.4, log warning if below
    - Validate speed variance >= 15, log warning if below
    - Validate main road ratio >= 0.35, log warning if below
    - _Requirements: 1.5, 2.4, 4.3, 4.5_
  
  - [ ] 6.3 Implement scaling logic for small networks
    - Check if `config.nodeCount < 50`
    - Calculate `scaleFactor = config.nodeCount / 50`
    - Adjust validation thresholds proportionally
    - Apply scaled expectations in validation warnings
    - _Requirements: 5.5_
  
  - [ ] 6.4 Call validation function at end of generateNetwork
    - Call `validateQPSOFavorableNetwork(graph, cfg)` before returning
    - Ensure validation is only informational (warnings only, no exceptions)
    - _Requirements: 1.5, 2.4, 4.3, 4.5, 5.5_
  
  - [ ]* 6.5 Write property tests for validation and scaling
    - **Property 16: Full Graph Connectivity** - Verify all nodes reachable from all other nodes
    - **Property 17: Proportional Scaling for Small Networks** - Verify diagonal ratio scales for nodeCount < 50
    - **Property 15: Deterministic Generation** - Verify same seed produces identical networks
    - **Validates: Requirements 5.2, 5.4, 5.5**

- [ ] 7. Implement multi-path validation
  - [ ] 7.1 Implement path counting helper function
    - Use breadth-first search or similar to find distinct paths
    - Accept start node, end node, and maximum path count parameters
    - Return count of distinct paths found
    - _Requirements: 2.5_
  
  - [ ]* 7.2 Write property test for multi-path topology
    - **Property 4: Distinct Path Alternatives** - Verify at least 3 distinct paths exist between each customer and depot
    - **Validates: Requirements 2.5**

- [ ] 8. Final checkpoint - Verify all properties
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Update function documentation
  - Update JSDoc comments for `generateNetwork()` to mention QPSO-favorable characteristics
  - Document new `QPSO_TUNING` constants with clear explanations
  - Add comments explaining the purpose of each enhancement
  - Document the `isDiagonal` parameter in `addRoad()` function
  - _Requirements: 5.1, 5.3_

## Notes

- Tasks marked with `*` are optional property test tasks and can be skipped for faster MVP
- The implementation maintains full backward compatibility - all existing code using `generateNetwork()` will continue to work
- Property tests should use a PBT library like fast-check with minimum 100 iterations due to randomization
- Integration tests for QPSO performance advantage (Requirement 6) are separate and expensive - they should be run manually or in a separate test suite
- All enhancements use existing TypeScript infrastructure and require no new dependencies
- The validation function logs warnings but never throws exceptions, ensuring graceful degradation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2"] },
    { "id": 6, "tasks": ["4.3", "4.4", "4.5"] },
    { "id": 7, "tasks": ["4.6", "6.1"] },
    { "id": 8, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 9, "tasks": ["6.4", "6.5", "7.2"] },
    { "id": 10, "tasks": ["9"] }
  ]
}
```
