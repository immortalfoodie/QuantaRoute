import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  large?: boolean;
}

export function PageHeader({ title, subtitle, action, className = '', large = false }: PageHeaderProps) {
  return (
    <header className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 ${className}`}>
      <div>
        <h1 className={`${large ? 'text-[40px]' : 'text-[28px]'} font-extrabold text-text-primary tracking-tight leading-[1.1] uppercase`}>{title}</h1>
        {subtitle && (
          <p className="text-[14px] text-text-secondary mt-3 max-w-2xl leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </header>
  );
}

export function PageContainer({ children, className = '', flush = false }: {
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <div className={`h-full ${flush ? '' : 'px-6 py-6 lg:px-8 lg:py-8'} ${className}`}>
      {children}
    </div>
  );
}
