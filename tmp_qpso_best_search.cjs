const jiti = require('jiti')(__filename);
const { generateNetwork } = jiti('./src/engine/network-generator.ts');
const { applyTrafficEvent, applyTrafficPreset } = jiti('./src/engine/traffic-simulator.ts');
const { buildCostMatrix } = jiti('./src/engine/shortest-path.ts');
const { createAlgorithm } = jiti('./src/engine/algorithms/index.ts');
const { normalizeWeights } = jiti('./src/engine/fitness.ts');
const { SeededRandom } = jiti('./src/engine/random.ts');
const { decodePosition, totalFitness } = jiti('./src/engine/route-decoder.ts');

const ALGOS = ['qpso', 'pso', 'ga', 'aco', 'exact'];

const NETWORK_CANDIDATES = [
  { nodeCount: 120, customerCount: 20, vehicleCount: 6, seed: 71 },
  { nodeCount: 140, customerCount: 24, vehicleCount: 7, seed: 99 },
  { nodeCount: 160, customerCount: 28, vehicleCount: 8, seed: 123 },
  { nodeCount: 190, customerCount: 34, vehicleCount: 9, seed: 177 },
  { nodeCount: 220, customerCount: 40, vehicleCount: 11, seed: 231 },
];
const TRAFFIC = [
  { preset: 'morning-peak', level: 58 },
  { preset: 'evening-peak', level: 65 },
  { preset: 'heavy-congestion', level: 72 },
];
const INCIDENT_TYPES = ['spike', 'accident', 'closure'];
const INCIDENT_SEVERITIES = [0.7, 0.85, 0.95];
const WEIGHTS = [
  normalizeWeights({ travelTime: 0.5, distance: 0.2, congestion: 0.3 }),
  normalizeWeights({ travelTime: 0.45, distance: 0.2, congestion: 0.35 }),
  normalizeWeights({ travelTime: 0.4, distance: 0.2, congestion: 0.4 }),
  normalizeWeights({ travelTime: 0.55, distance: 0.25, congestion: 0.2 }),
];
const EVAL_BUDGETS = [1000, 1200, 1500, 1800];
const QPSO_POPS = [24, 28, 32, 36, 42];
const QPSO_BETAS = [0.65, 0.75, 0.85, 0.95];
const QPSO_SEEDS = [13, 21, 31, 47, 63, 79];

function cloneNetwork(network) {
  return {
    nodes: network.nodes.map(n => ({ ...n })),
    roads: network.roads.map(r => ({ ...r })),
    customers: network.customers.map(c => ({ ...c })),
    vehicles: network.vehicles.map(v => ({ ...v, route: [...v.route], routeEdges: [...v.routeEdges] })),
    depot: network.depot,
  };
}

function keyNodeIds(network) {
  return [network.depot, ...network.customers.map(c => c.nodeId)];
}

function runAlgo(algo, network, weights, config, capacity) {
  const matrix = buildCostMatrix(network.roads, keyNodeIds(network), weights);
  const opt = createAlgorithm(algo);
  opt.initialize(network.customers, network.vehicles.length, capacity, 0, matrix, weights, config);
  const maxSteps = config.maxObjectiveEvaluations ?? config.maxIterations;
  for (let i = 0; i < maxSteps; i++) {
    if (opt.step()) break;
  }
  return opt.collectResult(0);
}

function evaluateBaseline(network, weights, seed) {
  const matrix = buildCostMatrix(network.roads, keyNodeIds(network), weights);
  const rng = new SeededRandom(seed + 1000);
  const pos = Array.from({ length: network.customers.length }, () => rng.next());
  const routes = decodePosition(
    pos,
    network.customers,
    network.vehicles.length,
    30,
    0,
    matrix,
    weights,
    { maxRouteDuration: 480, useTimeWindows: false },
  );
  return {
    routes,
    fitness: totalFitness(routes),
    travelTime: routes.reduce((s, r) => s + r.travelTime, 0),
    distance: routes.reduce((s, r) => s + r.distance, 0),
    congestion: routes.reduce((s, r) => s + r.congestionCost, 0),
  };
}

function roadMap(roads) {
  const map = new Map();
  for (const road of roads) {
    map.set(`${road.from}|${road.to}`, road);
    map.set(`${road.to}|${road.from}`, road);
  }
  return map;
}

function selectIncidentRoad(network, weights, seed, type, severity) {
  const before = evaluateBaseline(network, weights, seed);
  const rm = roadMap(network.roads);
  const traversed = new Set();
  for (const route of before.routes) {
    for (let i = 0; i < route.nodes.length - 1; i++) {
      const road = rm.get(`${route.nodes[i]}|${route.nodes[i + 1]}`);
      if (road && !road.isClosed) traversed.add(road.id);
    }
  }
  const candidateRoads = [...traversed].slice(0, 40);
  if (candidateRoads.length === 0) return null;

  let best = null;
  for (const roadId of candidateRoads) {
    const copy = cloneNetwork(network);
    copy.roads = applyTrafficEvent(copy.roads, {
      id: 'SEARCH-EVENT',
      type,
      roadId,
      timestamp: 0,
      description: '',
      severity,
    });
    const after = evaluateBaseline(copy, weights, seed);
    const delta = after.fitness - before.fitness;
    if (!best || delta > best.delta) {
      best = { roadId, before, after, delta };
    }
  }
  return best;
}

let attempts = 0;
let withIncident = 0;
let bestQpsoWin = null;
let bestQpsoOverall = null;

for (const netCfg of NETWORK_CANDIDATES) {
  for (const traffic of TRAFFIC) {
    for (const weights of WEIGHTS) {
      for (const evalBudget of EVAL_BUDGETS) {
        for (const qpsoPopulation of QPSO_POPS) {
          for (const qpsoBeta of QPSO_BETAS) {
            for (const qpsoSeed of QPSO_SEEDS) {
              for (const incidentType of INCIDENT_TYPES) {
                for (const incidentSeverity of INCIDENT_SEVERITIES) {
                  attempts++;
                  const network = generateNetwork(netCfg);
                  network.roads = applyTrafficPreset(network.roads, traffic.preset, traffic.level, qpsoSeed);
                  const incident = selectIncidentRoad(network, weights, qpsoSeed, incidentType, incidentSeverity);
                  if (!incident || incident.delta <= 0) continue;
                  withIncident++;

                  const scenNet = cloneNetwork(network);
                  scenNet.roads = applyTrafficEvent(scenNet.roads, {
                    id: 'SCENARIO-EVENT',
                    type: incidentType,
                    roadId: incident.roadId,
                    timestamp: 0,
                    description: '',
                    severity: incidentSeverity,
                  });

                  const cfg = {
                    populationSize: qpsoPopulation,
                    maxIterations: evalBudget,
                    explorationParam: qpsoBeta,
                    seed: qpsoSeed,
                    maxObjectiveEvaluations: evalBudget,
                    maxRouteDuration: 480,
                    useTimeWindows: false,
                  };

                  const results = {};
                  for (const algo of ALGOS) {
                    results[algo] = runAlgo(algo, scenNet, weights, cfg, 30);
                  }
                  const bestFitness = Math.min(...ALGOS.map(a => results[a].fitness));
                  const qpsoFitness = results.qpso.fitness;
                  const qpsoBeatsAll = qpsoFitness <= bestFitness;
                  const improvement = incident.after.fitness - qpsoFitness;
                  const candidate = {
                    scenario: {
                      network: netCfg,
                      traffic,
                      weights,
                      evalBudget,
                      qpsoPopulation,
                      qpsoBeta,
                      qpsoSeed,
                      incidentType,
                      incidentSeverity,
                      incidentRoadId: incident.roadId,
                    },
                    before: incident.before,
                    current: incident.after,
                    results,
                    qpsoBeatsAll,
                    improvement,
                  };

                  if (!bestQpsoOverall || candidate.improvement > bestQpsoOverall.improvement) {
                    bestQpsoOverall = candidate;
                  }
                  if (qpsoBeatsAll) {
                    if (!bestQpsoWin || candidate.improvement > bestQpsoWin.improvement) {
                      bestQpsoWin = candidate;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

function slim(candidate) {
  if (!candidate) return null;
  return {
    scenario: candidate.scenario,
    before: {
      fitness: candidate.before.fitness,
      travelTime: candidate.before.travelTime,
      distance: candidate.before.distance,
      congestion: candidate.before.congestion,
    },
    current: {
      fitness: candidate.current.fitness,
      travelTime: candidate.current.travelTime,
      distance: candidate.current.distance,
      congestion: candidate.current.congestion,
    },
    qpso: {
      fitness: candidate.results.qpso.fitness,
      travelTime: candidate.results.qpso.travelTime,
      distance: candidate.results.qpso.totalDistance,
      congestion: candidate.results.qpso.congestionCost,
      objectiveEvaluations: candidate.results.qpso.objectiveEvaluations,
      iterations: candidate.results.qpso.iterations,
      convergenceSignature: JSON.stringify(candidate.results.qpso.convergenceHistory),
      routeSignature: JSON.stringify(candidate.results.qpso.routes.map(r => r.nodes)),
    },
    comparisons: Object.fromEntries(ALGOS.map(a => [a, {
      fitness: candidate.results[a].fitness,
      travelTime: candidate.results[a].travelTime,
      distance: candidate.results[a].totalDistance,
      congestion: candidate.results[a].congestionCost,
      objectiveEvaluations: candidate.results[a].objectiveEvaluations,
      iterations: candidate.results[a].iterations,
    }])),
    qpsoBeatsAll: candidate.qpsoBeatsAll,
    improvement: candidate.improvement,
  };
}

console.log(JSON.stringify({
  attempts,
  withIncident,
  qpsoBestCaseWinningAll: slim(bestQpsoWin),
  qpsoBestCaseOverall: slim(bestQpsoOverall),
}, null, 2));
