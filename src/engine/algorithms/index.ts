// ==========================================================
// Algorithm Factory — create optimizer by type
// ==========================================================

import { AlgorithmType } from '../types';
import { OptimizationAlgorithm } from './base';
import { QPSOAlgorithm } from './qpso';
import { PSOAlgorithm } from './pso';
import { GAAlgorithm } from './ga';
import { ACOAlgorithm } from './aco';
import { ReferenceHeuristic } from './exact';

export function createAlgorithm(type: AlgorithmType): OptimizationAlgorithm {
  switch (type) {
    case 'qpso': return new QPSOAlgorithm();
    case 'pso': return new PSOAlgorithm();
    case 'ga': return new GAAlgorithm();
    case 'aco': return new ACOAlgorithm();
    case 'exact': return new ReferenceHeuristic();
  }
}
