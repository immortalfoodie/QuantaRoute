# QuantaRoute

Delivery routing on a simulated city, solved with Quantum-behaved Particle Swarm Optimization (QPSO) and compared against PSO, a genetic algorithm, ant colony optimization and a classical reference heuristic.

The app is branded **Q-ROUTE** in the UI. Everything runs client-side in the browser: there's no backend, no API key and nothing to configure. Clone it, `npm install`, `npm run dev`.

> **"Quantum" here means quantum-*inspired*.** No quantum hardware or simulator is involved. QPSO borrows the maths of a particle trapped in a delta potential well to decide where particles jump next. It's a classical algorithm that runs on your CPU like any other.

---

## What it does

You get a synthetic city road network with one depot, a set of customers with demand, and a small fleet of capacity-limited trucks. The job is to decide which truck visits which customers, and in what order, so that a weighted mix of **travel time**, **distance** and **congestion exposure** is as small as possible.

On top of that you can:

- push traffic around with presets (morning peak, evening peak, heavy congestion, ...) and a 0–100 intensity slider
- click any road and drop an accident, a traffic spike or a full closure on it, then re-optimize and see the routes bend around it
- run all five algorithms against the same frozen network and an equal evaluation budget, then compare convergence curves and final cost
- scrub through a recorded QPSO run and watch the swarm, the global best and the mean-best point move iteration by iteration
- scale the problem from 10 to 100 customers and see how runtime and solution quality hold up

## Screens

| Page | What's on it |
|---|---|
| **Overview** | KPIs for the current plan (travel time, distance, congestion, fitness) and an event log |
| **Network** | Zoomable D3 map of the city. Toggle layers, select nodes/roads, inspect road state |
| **Optimization** | Pick an algorithm, set objective weights, capacity, route-duration limit, time windows and swarm parameters, then run it |
| **Quantum Lab** | The four QPSO equations rendered with KaTeX, plus a playback of the particle swarm from your last QPSO run |
| **Benchmarks** | QPSO vs PSO vs GA vs ACO vs reference heuristic. Convergence chart, ranked table, gap to the reference |
| **Scalability** | Runtime, fitness and distance as the instance grows |
| **Experiments** | Four canned scenarios (gridlock, morning rush, large fleet, PSO baseline) with JSON export |
| **Traffic** | Live traffic controls and incident injection |

The layout is responsive. On narrow screens the sidebar becomes a drawer and the map canvases get fixed heights so they don't collapse.

---

## How it works

The pipeline is the same no matter which optimizer you pick:

```
generateNetwork()  ->  applyTrafficPreset() / applyTrafficEvents()
        |
        v
buildCostMatrix()      Dijkstra from every key node (depot + customers)
        |
        v
optimizer.step()  ...  each candidate is a vector of floats in [0, 1]
        |
        v
decodePosition()       random keys -> customer order -> vehicle routes
        |
        v
fitness = wt*time + wd*distance + wc*congestion + penalties
```

### 1. The city

[`network-generator.ts`](src/engine/network-generator.ts) lays nodes on a jittered grid (so it looks less like graph paper), connects neighbours with slow 20–40 km/h streets, and then adds diagonal "arterial" shortcuts at 55–85 km/h, some of them with 3–5 lanes. The depot goes on the node nearest the centre. Customers are picked with a farthest-point strategy that prefers well-connected intersections, keeps a minimum spacing between them, spreads them across districts and pushes a share of them out to the edge of the map.

All randomness goes through a seeded Mulberry32 PRNG ([`random.ts`](src/engine/random.ts)), so the same seed always gives the same city, the same traffic and the same optimizer run.

### 2. Traffic

[`traffic-simulator.ts`](src/engine/traffic-simulator.ts) keeps two numbers per road: a **base congestion** from the global preset and an **incident congestion** from anything you've injected locally. They're added and clamped to `[0, 1]`, and speed drops by up to 85% at full congestion. Closures take a road out of the graph entirely.

Keeping the two layers apart was deliberate. Changing the preset regenerates the baseline and then replays your incidents on top, so switching from "afternoon" to "evening peak" doesn't quietly erase the accident you placed on R008.

### 3. Cost matrix

[`shortest-path.ts`](src/engine/shortest-path.ts) runs Dijkstra from the depot and from every customer, using the same weighted edge cost the optimizer is scoring on. The optimizers never touch the road graph directly. They only see an `(n+1) x (n+1)` matrix of time, distance, congestion and the actual node path between each pair of stops.

### 4. Encoding a route as a vector

Particle swarms like continuous search spaces; vehicle routing is a permutation problem. The bridge is **random-key encoding** ([`route-decoder.ts`](src/engine/route-decoder.ts)):

1. A candidate solution is one float per customer, e.g. `[0.71, 0.12, 0.55, 0.03]`.
2. Argsort it to get a visiting order: `C4, C2, C3, C1`.
3. Walk that order and fill trucks greedily. Open a new truck when the next customer would bust capacity or the max route duration.
4. Score each route. Optional time windows add waiting time when a truck arrives early and mark the route infeasible when it arrives late.

Every algorithm uses this exact decoder and this exact fitness function, so they're all being judged by the same rules.

### 5. Fitness

```
F = w_t * TravelTime + w_d * Distance + w_c * Congestion + Penalty
```

Weights are normalised to sum to 1 (default `0.4 / 0.3 / 0.3`). Penalties are deliberately harsh: `500` per unit of overload and `10,000` for any infeasible route, missing customer or duplicate visit. That's large enough that the swarm learns very quickly to stay feasible.

---

## The algorithms

All five extend [`BaseOptimizer`](src/engine/algorithms/base.ts), which handles decoding, counting objective evaluations, the evaluation budget and result collection. Each optimizer gets its own PRNG offset so they don't accidentally share random streams.

### QPSO ([`qpso.ts`](src/engine/algorithms/qpso.ts))

Follows Sun, Feng & Xu (2004). There's no velocity. Each iteration:

```
mbest     = mean of all personal-best positions
p_i       = phi * pbest_i + (1 - phi) * gbest            phi ~ U(0,1)
x_i(t+1)  = p_i  ±  beta * |mbest - x_i(t)| * ln(1/u)     u   ~ U(0,1)
```

`beta` (the contraction–expansion coefficient) goes linearly from 1.0 to 0.5 over the run: wide jumps early, tight ones late. The `ln(1/u)` term gives the jump distribution a heavy tail, so now and then a particle lands far from where classical PSO would put it. That's where the extra exploration comes from.

This implementation is a **hybrid**. Every 5th iteration it decodes the global best into a customer order, tries up to 15 random 2-opt segment reversals, and if one helps, writes it back into the swarm. More on why that matters [below](#read-this-before-quoting-the-numbers).

### PSO ([`pso.ts`](src/engine/algorithms/pso.ts))

Textbook PSO with the Clerc–Kennedy constriction values (`χ = 0.7298`, `c1 = c2 = 1.49618`) and velocity clamped to `±0.5`.

### Genetic algorithm ([`ga.ts`](src/engine/algorithms/ga.ts))

Tournament selection (size 3), single-point crossover on the key vector, uniform ±0.3 mutation with a rate that decays from 0.40 to 0.15, and one elite carried over each generation.

### Ant colony ([`aco.ts`](src/engine/algorithms/aco.ts))

Since the search space is continuous keys rather than graph edges, each key dimension is split into 10 bins and pheromone is kept per bin. Ants sample bins by roulette wheel, evaporation is 10%, and the top 20% of ants deposit.

### Reference heuristic ([`exact.ts`](src/engine/algorithms/exact.ts))

The file is called `exact.ts` for historical reasons, but it is **not** an exact solver and doesn't prove optimality. For 8 or fewer customers it does dense random sampling of the key space. Above that, it builds a nearest-neighbour tour, runs 50 swap-improvement passes, then spends the rest of its budget on random restarts. The Benchmarks page uses it as the yardstick for the "gap" column.

---

## Benchmark results

These come from `run_benchmark.ts`: the default 50-node network, 10 customers, 4 trucks of capacity 30, afternoon traffic at 40%, population 30 and a hard cap of **1,000 objective evaluations per algorithm**. Lower fitness is better.

**Optimizer seed 42**

| Algorithm | Fitness | Travel time | Distance | Congestion |
|---|---:|---:|---:|---:|
| Reference heuristic | **418.8** | 680.4 | 405.8 | 83.0 |
| QPSO | 429.0 | 686.2 | 428.5 | 86.5 |
| GA | 449.2 | 699.3 | 468.2 | 96.8 |
| PSO | 466.3 | 733.0 | 484.9 | 92.0 |
| ACO | 470.7 | 719.3 | 506.1 | 103.8 |

**Optimizer seed 999** (same network)

| Algorithm | Fitness | Travel time | Distance | Congestion |
|---|---:|---:|---:|---:|
| Reference heuristic | **419.6** | 675.2 | 416.2 | 82.1 |
| QPSO | 421.8 | 697.9 | 396.7 | 78.7 |
| GA | 421.8 | 697.9 | 396.7 | 78.7 |
| PSO | 438.1 | 696.9 | 449.2 | 82.1 |
| ACO | 473.5 | 758.6 | 479.8 | 87.1 |

Runtimes were all in the 100–275 ms range on a laptop and swing a lot between runs, so I've left them out of the tables. Run it yourself and you'll get identical fitness values; that's what the seeding is for.

What I take from this: on an equal budget QPSO is consistently ahead of plain PSO and ACO, sometimes ties GA, and lands within about 0.5–2.5% of the nearest-neighbour + local-search baseline. It doesn't beat that baseline on this instance size.

### Read this before quoting the numbers

I'd rather be upfront about these than have someone find them in the code:

- **QPSO gets 2-opt and the others don't.** The local search in `refineGlobalBest()` is a real advantage. Hybrid QPSO + local search is a legitimate technique, but this is not a pure-metaheuristic comparison. If you want one, delete the `refineGlobalBest()` call or add the same step to PSO and GA.
- **The default network is tuned to favour exploration.** The `QPSO_TUNING` block in `network-generator.ts` (lots of fast diagonals, spread-out customers, high speed variance) came out of an explicit design spec whose goal was a topology where QPSO does well. It's a reasonable stress test for global search, but it's not a neutral benchmark instance.
- **The "Showcase" scenario is curated.** `QPSO_SHOWCASE_SCENARIO` in the store is a fixed seed, traffic level and incident picked because it demonstrates rerouting clearly. `tmp_qpso_best_search.cjs` is the script that was used to search for it. Use **Research** mode for anything you'd call a result.
- **Small instances only.** 10–20 customers is tiny by VRP standards. Nobody should draw conclusions about real fleets from this.

---

## Getting started

You need Node 18 or newer.

```bash
git clone https://github.com/immortalfoodie/QuantaRoute.git
cd QuantaRoute
npm install
npm run dev
```

Vite will print a local URL (usually `http://localhost:5173`).

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check with `tsc`, then produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |

### Running the engine without the UI

The engine has no React dependency, so you can drive it from Node. The repo-root scripts stub `performance` and `requestAnimationFrame` and import straight from `src/engine`:

```bash
npx tsx run_benchmark.ts          # the tables above
npx tsx verify_experiments.ts     # scalability sweep 10 -> 100 customers, plus experiment presets
npx tsx verify_reset.ts           # checks that "reset" really restores the initial deterministic state
npx tsx verify_addroad_update.ts  # sanity-checks road speed/lane distributions from the generator
```

A minimal run looks like this:

```ts
import { generateNetwork } from './src/engine/network-generator';
import { applyTrafficPreset } from './src/engine/traffic-simulator';
import { buildCostMatrix } from './src/engine/shortest-path';
import { createAlgorithm } from './src/engine/algorithms';
import { normalizeWeights } from './src/engine/fitness';

const net = generateNetwork({ nodeCount: 50, customerCount: 10, vehicleCount: 4, seed: 42 });
net.roads = applyTrafficPreset(net.roads, 'evening-peak', 70);

const weights = normalizeWeights({ travelTime: 0.4, distance: 0.3, congestion: 0.3 });
const keyNodes = [net.depot, ...net.customers.map(c => c.nodeId)];
const matrix = buildCostMatrix(net.roads, keyNodes, weights);

const qpso = createAlgorithm('qpso');
qpso.initialize(net.customers, net.vehicles.length, 30, 0, matrix, weights, {
  populationSize: 30,
  maxIterations: 200,
  explorationParam: 0.75,
  seed: 42,
  maxObjectiveEvaluations: 2000,
});

const result = qpso.optimize();
console.log(result.fitness, result.routes.map(r => r.assignedCustomerIds));
```

---

## Project layout

```
src/
├── engine/                     pure TypeScript, no UI imports
│   ├── algorithms/
│   │   ├── base.ts             shared optimizer lifecycle + evaluation budget
│   │   ├── qpso.ts             QPSO + periodic 2-opt
│   │   ├── pso.ts
│   │   ├── ga.ts
│   │   ├── aco.ts
│   │   ├── exact.ts            reference heuristic (not an exact solver)
│   │   └── index.ts            createAlgorithm() factory
│   ├── network-generator.ts    synthetic city + customer placement
│   ├── traffic-simulator.ts    presets, incidents, speed model
│   ├── shortest-path.ts        Dijkstra + cost matrix
│   ├── route-decoder.ts        random keys -> routes, feasibility checks
│   ├── fitness.ts              weighted objective, weight normalisation
│   ├── random.ts               seeded Mulberry32 PRNG
│   └── types.ts
├── store/useStore.ts           Zustand store: network, traffic, runs, benchmark, showcase
├── pages/                      one file per screen
├── components/
│   ├── network/NetworkCanvas.tsx   D3 map with zoom/pan and route overlays
│   ├── design-system/          panels, metrics, tables, chart theme
│   ├── layout/                 app shell, sidebar, top nav
│   └── ui/                     KPI cards, KaTeX block
└── index.css                   Tailwind v4 theme tokens
```

Long optimizer runs are chopped into batches and stepped inside `requestAnimationFrame`, so the progress bar and live metrics keep updating instead of the tab freezing.

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, Zustand for state, D3 for the network map, Recharts for charts, KaTeX for the equations, Framer Motion for the drawer and transitions, Lucide for icons.

---

## Known limitations

- Dijkstra uses a sorted array as its priority queue. Fine for a few hundred nodes, slow beyond that.
- Roads are undirected. No one-way streets or turn penalties.
- Traffic is static during a run. Incidents apply between optimizations, not while trucks are driving.
- Every truck has the same capacity, and there's a single depot.
- The greedy split in the decoder dumps any leftover demand on the last truck if the fleet runs out, which then shows up as a capacity penalty rather than a smarter reassignment.
- `pso.ts.backup` in the algorithms folder is an old version kept around for reference and isn't imported anywhere.

## Ideas for later

- A split procedure (Prins-style) instead of greedy splitting in the decoder
- Give every metaheuristic the same optional local search, so the comparison can be run both ways
- Load real road data from OpenStreetMap instead of the synthetic grid
- Standard CVRP instances (Augerat, Christofides) so results can be compared with published numbers
- Move optimizer runs into a Web Worker

## References

- J. Sun, B. Feng, W. Xu. *Particle swarm optimization with particles having quantum behavior.* IEEE Congress on Evolutionary Computation, 2004.
- J. Sun, W. Xu, B. Feng. *A global search strategy of quantum-behaved particle swarm optimization.* IEEE Conference on Cybernetics and Intelligent Systems, 2004.
- M. Clerc, J. Kennedy. *The particle swarm: explosion, stability, and convergence in a multidimensional complex space.* IEEE Transactions on Evolutionary Computation, 6(1), 2002.
- J. C. Bean. *Genetics and random keys for sequencing and optimization.* ORSA Journal on Computing, 6(2), 1994.
- M. Dorigo, T. Stützle. *Ant Colony Optimization.* MIT Press, 2004.

## License

No license file yet. Until one is added, all rights are reserved by the author. If you want to use this code, open an issue and ask.
