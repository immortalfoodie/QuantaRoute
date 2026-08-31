export const PAGE_TITLES: Record<string, string> = {
  overview: 'Overview',
  network: 'Network',
  optimizer: 'Optimization',
  quantum: 'Quantum Lab',
  benchmark: 'Benchmarks',
  traffic: 'Traffic',
  scalability: 'Scalability',
  experiments: 'Experiments',
};

export const NAV_GROUPS = [
  { id: 'main', label: 'Platform' },
  { id: 'research', label: 'Research' },
  { id: 'operations', label: 'Operations' },
] as const;

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', group: 'main' },
  { id: 'network', label: 'Network', group: 'main' },
  { id: 'optimizer', label: 'Optimization', group: 'main' },
  { id: 'quantum', label: 'Quantum Lab', group: 'research' },
  { id: 'benchmark', label: 'Benchmarks', group: 'research' },
  { id: 'scalability', label: 'Scalability', group: 'research' },
  { id: 'experiments', label: 'Experiments', group: 'research' },
  { id: 'traffic', label: 'Traffic', group: 'operations' },
] as const;

export const CHART_THEME = {
  grid: '#d4d0c8',
  axis: '#737373',
  tooltip: {
    bg: '#ffffff',
    border: '#1a1a1a',
    text: '#1a1a1a',
  },
};
