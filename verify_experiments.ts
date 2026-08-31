import { performance } from 'perf_hooks';

// Mock browser globals before importing anything
(globalThis as any).performance = performance;
(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
(globalThis as any).document = {
  createElement: (tag: string) => ({ click: () => console.log('Mock download clicked') })
};

import { useStore } from './src/store/useStore';
import { generateNetwork } from './src/engine/network-generator';

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function verify() {
  const store = useStore.getState();

  console.log('=== 1. SCALABILITY ===');
  const problemSizes = [
    { customers: 10, nodes: 40, vehicles: 3 },
    { customers: 25, nodes: 80, vehicles: 5 },
    { customers: 50, nodes: 150, vehicles: 10 },
    { customers: 100, nodes: 300, vehicles: 20 },
    { customers: 250, nodes: 600, vehicles: 40 },
  ];

  for (const size of problemSizes) {
    store.regenerateNetwork(size.nodes, size.customers, size.vehicles, 42);
    // Important: we wait for the network to be generated
    const net = useStore.getState().network;
    const res = await useStore.getState().runOptimization('qpso', 200); // quick run
    console.log(`Size ${size.customers}: Nodes=${net.nodes.length}, Customers=${net.customers.length}, Vehicles=${net.vehicles.length}`);
    console.log(`  Evals: ${res.objectiveEvaluations}, Fitness: ${res.fitness.toFixed(1)}, Routes: ${res.routes.length}`);
  }

  console.log('\n=== 3. STATE ISOLATION (SCALABILITY) ===');
  // Setup scenario A
  store.regenerateNetwork(12, 12, 4, 999);
  const scenarioA_Net = useStore.getState().network;
  console.log(`Scenario A before: Customers=${scenarioA_Net.customers.length}`);

  // Simulate Scalability.tsx behavior
  const originalState = useStore.getState();
  const { network, trafficState, optimizationConfig, currentResult, optimizedRoutes, showOptimizedRoutes } = originalState;

  try {
    store.regenerateNetwork(250, 250, 50, 42);
    const scalNet = useStore.getState().network;
    console.log(`  During scalability: Customers=${scalNet.customers.length}`);
  } finally {
    useStore.setState({ network, trafficState, optimizationConfig, currentResult, optimizedRoutes, showOptimizedRoutes });
  }

  const restoredNet = useStore.getState().network;
  console.log(`Scenario A after: Customers=${restoredNet.customers.length}`);

  console.log('\n=== 4. EXPERIMENTS & TRAFFIC/ALGORITHM ISOLATION ===');
  // Simulate Experiments.tsx behavior
  const EXPERIMENTS = [
    { id: 'E01', name: 'QPSO in Heavy Gridlock', traffic: 'heavy-congestion' as any, algo: 'qpso' as any, nodes: 150, customers: 20, vehicles: 6 },
    { id: 'E02', name: 'Standard PSO Baseline', traffic: 'free-flow' as any, algo: 'pso' as any, nodes: 100, customers: 15, vehicles: 4 },
  ];

  for (const exp of EXPERIMENTS) {
    const orig = useStore.getState();
    const { network, trafficState, optimizationConfig } = orig;

    try {
      useStore.getState().regenerateNetwork(exp.nodes, exp.customers, exp.vehicles, 123);
      useStore.getState().setTrafficPreset(exp.traffic);
      useStore.getState().setAlgorithm(exp.algo);

      const net = useStore.getState().network;
      const traffic = useStore.getState().trafficState;
      const config = useStore.getState().optimizationConfig;

      const res = await useStore.getState().runOptimization(exp.algo, 200);
      console.log(`Experiment ${exp.id}:`);
      console.log(`  Expected Algo=${exp.algo}, Traffic=${exp.traffic}, Cust=${exp.customers}`);
      console.log(`  Actual Algo=${res.algorithm}, Traffic=${traffic.preset}, Cust=${net.customers.length}`);
      console.log(`  Fitness=${res.fitness.toFixed(1)}`);
    } finally {
      useStore.setState({ network, trafficState, optimizationConfig });
    }
  }

}

verify().catch(console.error);
