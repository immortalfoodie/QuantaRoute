import { CHART_THEME } from './constants';

export const chartTooltipStyle = {
  backgroundColor: CHART_THEME.tooltip.bg,
  borderColor: CHART_THEME.tooltip.border,
  borderRadius: 6,
  color: CHART_THEME.tooltip.text,
  fontSize: 12,
  padding: '8px 12px',
};

export const chartAxisProps = {
  stroke: CHART_THEME.axis,
  fontSize: 11,
  tickLine: false as const,
  axisLine: false as const,
};

export const chartGridProps = {
  strokeDasharray: '3 3',
  stroke: CHART_THEME.grid,
  vertical: false,
};
