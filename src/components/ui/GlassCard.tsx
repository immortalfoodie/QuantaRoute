import React from 'react';

export function GlassCard({ children, className = '', title }: { children: React.ReactNode, className?: string, title?: string }) {
  return (
    <div className={`glass-card p-5 ${className}`}>
      {title && <h3 className="text-[15px] font-semibold text-text-primary mb-4">{title}</h3>}
      {children}
    </div>
  );
}
