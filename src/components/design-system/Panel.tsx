import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Panel({ title, children, className = '', noPadding = false }: PanelProps) {
  return (
    <div className={`bg-bg-surface border-2 border-border ${noPadding ? '' : 'p-5'} ${className}`}>
      {title && (
        <h3 className="text-[12px] font-bold text-text-primary mb-4 uppercase tracking-wider">{title}</h3>
      )}
      {children}
    </div>
  );
}

export function FloatingPanel({ title, children, className = '', position = 'top-left' }: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}) {
  const posClass = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }[position];

  return (
    <div className={`absolute ${posClass} z-10 bg-bg-surface border-2 border-border p-4 min-w-[180px] shadow-[4px_4px_0_#1a1a1a] ${className}`}>
      {title && (
        <div className="label-editorial mb-3">{title}</div>
      )}
      {children}
    </div>
  );
}

export function TabBar({ tabs, active, onChange, className = '' }: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex border-b-2 border-border ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 px-4 py-3 text-[13px] font-bold uppercase tracking-wide transition-colors ${
            active === tab.id
              ? 'bg-bg-inverse text-text-inverse'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, children, defaultOpen = true, className = '' }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`border-b-2 border-border-subtle last:border-0 ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3.5 text-left group"
      >
        <span className="label-editorial group-hover:text-text-secondary transition-colors">
          {title}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
