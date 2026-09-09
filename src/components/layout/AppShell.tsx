import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useStore } from '../../store/useStore';

// Lazy imports for pages
import { Overview } from '../../pages/Overview';
import { LiveNetwork } from '../../pages/LiveNetwork';
import { RouteOptimizer } from '../../pages/RouteOptimizer';
import { QuantumLab } from '../../pages/QuantumLab';
import { Benchmark } from '../../pages/Benchmark';
import { TrafficSimulation } from '../../pages/TrafficSimulation';
import { Scalability } from '../../pages/Scalability';
import { Experiments } from '../../pages/Experiments';

const PAGES: Record<string, React.ComponentType> = {
  overview: Overview,
  network: LiveNetwork,
  optimizer: RouteOptimizer,
  quantum: QuantumLab,
  benchmark: Benchmark,
  traffic: TrafficSimulation,
  scalability: Scalability,
  experiments: Experiments,
};

const FLUSH_PAGES = new Set(['network', 'optimizer', 'traffic']);

export function AppShell() {
  const currentPage = useStore(s => s.currentPage);
  const PageComponent = PAGES[currentPage] || Overview;
  const isFlush = FLUSH_PAGES.has(currentPage);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden bg-bg-primary text-text-primary">
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={handleSidebarClose}
          />
        )}
      </AnimatePresence>

      <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNav onMenuClick={handleMenuClick} />
        <main className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden ${isFlush ? 'lg:overflow-hidden' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
