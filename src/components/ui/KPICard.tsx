import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number; // percentage, positive means up
  trendLabel?: string;
  color?: 'purple' | 'blue' | 'green' | 'yellow' | 'red';
  className?: string;
}

const colorMap = {
  purple: 'text-accent-purple bg-accent-purple/10',
  blue: 'text-accent-blue bg-accent-blue/10',
  green: 'text-accent-green bg-accent-green/10',
  yellow: 'text-accent-yellow bg-accent-yellow/10',
  red: 'text-accent-red bg-accent-red/10',
};

export function KPICard({ title, value, icon: Icon, trend, trendLabel, color = 'blue', className = '' }: KPICardProps) {
  return (
    <div className={`glass-card p-5 flex flex-col gap-3 ${className}`}>
      <div className="flex justify-between items-start">
        <span className="text-[13px] font-medium text-text-muted">{title}</span>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      
      <div className="mt-1 flex items-end gap-3">
        <motion.span
          key={value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-text-primary tracking-tight"
        >
          {value}
        </motion.span>
        
        {trend !== undefined && (
          <div className="flex flex-col mb-1">
            <div className={`flex items-center gap-1 text-[12px] font-semibold ${
              trend > 0 ? 'text-accent-red' : // For routing, higher time/dist is bad
              trend < 0 ? 'text-accent-green' : 'text-text-muted'
            }`}>
              {trend > 0 ? <ArrowUp className="w-3 h-3" /> : 
               trend < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {Math.abs(trend)}%
            </div>
            {trendLabel && <span className="text-[12px] text-text-muted">{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
