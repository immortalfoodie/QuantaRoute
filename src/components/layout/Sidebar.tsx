import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { NAV_ITEMS, NAV_GROUPS } from '../design-system';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { currentPage, setPage, isOptimizing } = useStore();

  const handleNavClick = (pageId: string) => {
    setPage(pageId);
    onClose(); // Auto-close sidebar on mobile
  };

  return (
    <>
      {/* Desktop sidebar — always visible at lg+ */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 h-full border-r-2 border-border bg-bg-secondary"
        style={{ width: 'var(--spacing-sidebar, 236px)' }}
      >
        <SidebarContent
          currentPage={currentPage}
          isOptimizing={isOptimizing}
          onNavClick={handleNavClick}
        />
      </aside>

      {/* Mobile sidebar — off-canvas drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 flex flex-col w-[280px] max-w-[85vw] bg-bg-secondary border-r-2 border-border shadow-[6px_0_20px_rgba(0,0,0,0.15)] lg:hidden"
          >
            <SidebarContent
              currentPage={currentPage}
              isOptimizing={isOptimizing}
              onNavClick={handleNavClick}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarContent({
  currentPage,
  isOptimizing,
  onNavClick,
}: {
  currentPage: string;
  isOptimizing: boolean;
  onNavClick: (id: string) => void;
}) {
  return (
    <>
      <div className="px-5 py-5 border-b-2 border-border">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-bg-inverse flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-extrabold text-text-inverse tracking-tight">QR</span>
          </div>
          <div>
            <div className="text-[14px] font-extrabold text-text-primary tracking-tight leading-none">Q-ROUTE</div>
            <div className="text-[11px] text-text-muted mt-1 font-medium">Quantum Intelligence</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {NAV_GROUPS.map(group => {
          const items = NAV_ITEMS.filter(i => i.group === group.id);
          return (
            <div key={group.id} className="mb-5">
              <div className="px-3 py-1 mb-1 label-editorial">
                {group.label}
              </div>
              {items.map(item => {
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavClick(item.id)}
                    className={`relative w-full flex items-center gap-2 px-3 py-2.5 mb-0.5 text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-bg-inverse text-text-inverse font-bold'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary font-medium'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                    )}
                    <span className="text-[13px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t-2 border-border bg-bg-elevated">
        <div className="label-editorial mb-3">System Status</div>
        <div className="space-y-2.5">
          <HealthRow label="Network" value="ONLINE" ok />
          <HealthRow label="Traffic" value="ACTIVE" ok />
          <HealthRow label="Optimizer" value={isOptimizing ? 'RUNNING' : 'READY'} ok={!isOptimizing} warn={isOptimizing} />
        </div>
      </div>
    </>
  );
}

function HealthRow({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 ${warn ? 'bg-accent-yellow animate-pulse-dot' : ok ? 'bg-accent-green' : 'bg-text-muted'}`} />
        <span className={`text-[10px] font-bold tracking-widest uppercase ${warn ? 'text-accent-yellow' : 'text-text-primary'}`}>{value}</span>
      </div>
    </div>
  );
}
