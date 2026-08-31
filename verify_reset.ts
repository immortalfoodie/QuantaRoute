import { performance } from 'perf_hooks';

// Mock browser globals before importing anything
(globalThis as any).performance = performance;
(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
(globalThis as any).document = {
  createElement: (tag: string) => ({ click: () => console.log('Mock download clicked') })
};

import { useStore } from './src/store/useStore';

async function verify() {
  const store = useStore.getState();

  console.log('=== TEST SEQUENCE ===');
  
  // 1. Start initial scenario. (Already happened on store load)
  // 2. Record initial network/traffic/configuration.
  const initNet = useStore.getState().network;
  const initTraffic = useStore.getState().trafficState;
  const initConfig = useStore.getState().optimizationConfig;
  console.log(`Initial: Nodes=${initNet.nodes.length}, Customers=${initNet.customers.length}`);
  console.log(`Initial Traffic: Preset=${initTraffic.preset}, Level=${initTraffic.level}, Events=${initTraffic.events.length}`);
  console.log(`Initial Config: Algo=${initConfig.algorithm}, MaxIters=${initConfig.algorithmConfig.maxIterations}`);

  // 3. Change traffic globally.
  store.setTrafficPreset('heavy-congestion');
  
  // 4. Close one road.
  const someRoadId = initNet.roads[0].id;
  store.injectTrafficEvent('closure', someRoadId);

  const changedTraffic = useStore.getState().trafficState;
  console.log(`\nChanged Traffic: Preset=${changedTraffic.preset}, Events=${changedTraffic.events.length}`);

  // 5. Run QPSO.
  await useStore.getState().runOptimization('qpso', 200);
  const res1 = useStore.getState().currentResult;
  console.log(`Run 1: Fitness=${res1?.fitness.toFixed(1)}`);

  // 6. Change optimization settings.
  store.setAlgorithmConfig({ maxIterations: 50 });
  store.setAlgorithm('ga');

  // 7. Run another optimization.
  await useStore.getState().runOptimization('ga', 200);
  const res2 = useStore.getState().currentResult;
  console.log(`Run 2: Algo=${res2?.algorithm}, Fitness=${res2?.fitness.toFixed(1)}`);
  
  // 8. Go to another page.
  store.setPage('network');

  // 9. Click RESET SIMULATION.
  store.resetSimulation();

  // 10. Verify the original deterministic scenario is restored.
  const resetNet = useStore.getState().network;
  const resetTraffic = useStore.getState().trafficState;
  const resetConfig = useStore.getState().optimizationConfig;
  const resetResult = useStore.getState().currentResult;
  
  console.log('\n=== AFTER RESET ===');
  console.log(`Reset Network matches Init: Nodes=${resetNet.nodes.length === initNet.nodes.length}, Customers=${resetNet.customers.length === initNet.customers.length}`);
  console.log(`Reset Traffic: Preset=${resetTraffic.preset} (Init: ${initTraffic.preset})`);
  console.log(`Reset Events Length=${resetTraffic.events.length} (Init: ${initTraffic.events.length})`);
  console.log(`Reset Config: Algo=${resetConfig.algorithm}, MaxIters=${resetConfig.algorithmConfig.maxIterations}`);
  console.log(`Current Result is null: ${resetResult === null}`);
  
  // Verify deterministic nature (first customer demand)
  console.log(`First customer demand before: ${initNet.customers[0]?.demand}`);
  console.log(`First customer demand after: ${resetNet.customers[0]?.demand}`);
}

verify().catch(console.error);
